import { createClient } from '@/lib/supabase/client';
import type {
  ProductionOrder,
  ProductionOrderWIPLot,
  ProductionQCInspection,
  ExecutionSummaryDTO,
  CompleteStageInput,
  RecordQCInput
} from '@/types/erp';
import { ProductionWIPService } from './ProductionWIPService';
import { ProductionMaterialConsumptionService } from './ProductionMaterialConsumptionService';
import { ProductionScrapMassBalanceService } from './ProductionScrapMassBalanceService';

export class ProductionExecutionEngine {
  /**
   * 1. Start Production Execution: Transitions order from READY_FOR_EXECUTION -> IN_PROGRESS
   */
  static async startExecution(
    orderId: string,
    actorId?: string,
    supabaseClient?: any
  ): Promise<{ order: ProductionOrder; initialWipLot: ProductionOrderWIPLot }> {
    const supabase = supabaseClient || createClient();

    const { data: order, error } = await supabase
      .from('production_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      throw new Error(`404 Not Found: Production Order #${orderId} does not exist.`);
    }

    if (order.status !== 'READY_FOR_EXECUTION') {
      throw new Error(
        `422 Unprocessable Entity: Cannot start execution on order in status '${order.status}'. Expected 'READY_FOR_EXECUTION'.`
      );
    }

    const nowIso = new Date().toISOString();

    // 1. Update Order Status
    const { data: updatedOrder, error: uErr } = await supabase
      .from('production_orders')
      .update({
        status: 'IN_PROGRESS',
        start_date: order.start_date || nowIso,
        updated_at: nowIso
      })
      .eq('id', orderId)
      .select()
      .single();

    if (uErr) throw new Error(`Failed to update order status: ${uErr.message}`);

    // 2. Initialize initial WIP Lot at Stage 10 (CASTING)
    const initialWipLot = await ProductionWIPService.initializeFirstWIPLot(
      order.id,
      order.planned_quantity,
      Number(order.estimated_silver_weight || 0.0),
      order.warehouse_id || '00000000-0000-0000-0000-000000000001',
      supabase
    );

    // 3. Log Timeline & Event
    await supabase.from('production_order_timeline').insert([
      {
        order_id: orderId,
        from_status: 'READY_FOR_EXECUTION',
        to_status: 'IN_PROGRESS',
        action: 'START_EXECUTION',
        actor_id: actorId || null,
        details: `Production execution started. Initial WIP lot #${initialWipLot.wip_lot_number} created.`
      }
    ]);

    await supabase.from('event_store').insert([
      {
        event_id: `evt-start-${Date.now()}`,
        event_name: 'ProductionStarted',
        entity_id: orderId,
        payload: { order_id: orderId, initial_wip_lot_id: initialWipLot.id }
      }
    ]);

    return { order: updatedOrder, initialWipLot };
  }

  /**
   * 2. Start Stage Operation: Operator clocks into work center queue job
   */
  static async startStage(
    orderId: string,
    stageCode: string,
    actorId?: string,
    operatorId?: string,
    supabaseClient?: any
  ): Promise<{ queueJob: any; activeWipLot: ProductionOrderWIPLot }> {
    const supabase = supabaseClient || createClient();

    // 1. Fetch Order Queue Jobs
    const { data: queueJobs, error: qErr } = await supabase
      .from('work_center_queue_jobs')
      .select('*')
      .eq('order_id', orderId)
      .order('sequence_no', { ascending: true });

    if (qErr || !queueJobs || queueJobs.length === 0) {
      throw new Error(`404 Not Found: Queue jobs for order #${orderId} not found.`);
    }

    const currentJob = queueJobs.find((j: any) => j.stage_code === stageCode);
    if (!currentJob) {
      throw new Error(`404 Not Found: Stage '${stageCode}' is not part of this order routing.`);
    }

    // Predecessor Check: All stages with lower sequence_no must be COMPLETED
    const predecessorIncomplete = queueJobs.find(
      (j: any) => j.sequence_no < currentJob.sequence_no && j.status !== 'COMPLETED'
    );

    if (predecessorIncomplete) {
      throw new Error(
        `409 Conflict: Cannot start stage '${stageCode}'. Predecessor stage '${predecessorIncomplete.stage_code}' (seq ${predecessorIncomplete.sequence_no}) is incomplete with status '${predecessorIncomplete.status}'.`
      );
    }

    // 2. Fetch Active WIP lot for this stage
    const { data: wipLots } = await supabase
      .from('production_order_wip_lots')
      .select('*')
      .eq('order_id', orderId)
      .eq('current_stage_code', stageCode)
      .in('status', ['READY_FOR_STAGE', 'REWORK']);

    if (!wipLots || wipLots.length === 0) {
      throw new Error(`404 Not Found: No active WIP lot available for stage '${stageCode}'.`);
    }

    const targetWipLot = wipLots[0];

    // 3. Mutex Update on Queue Job
    const nowIso = new Date().toISOString();
    const { data: updatedJob, error: uErr } = await supabase
      .from('work_center_queue_jobs')
      .update({
        status: 'IN_OPERATION',
        actual_start_time: nowIso,
        operator_id: operatorId || actorId || null
      })
      .eq('id', currentJob.id)
      .select()
      .single();

    if (uErr) throw new Error(`Failed to start stage job: ${uErr.message}`);

    // 4. Update WIP Lot status to IN_PROCESS
    const updatedWip = await ProductionWIPService.clockInWIPLot(targetWipLot.id, supabase);

    // 5. Automatically Consume Allocated Materials designated for this stage
    await ProductionMaterialConsumptionService.consumeAllocatedMaterialsForStage({
      orderId,
      stageCode,
      wipLotId: updatedWip.id,
      actorId,
      supabaseClient: supabase
    });

    return { queueJob: updatedJob, activeWipLot: updatedWip };
  }

  /**
   * 3. Complete Stage Operation: Validates passed/scrap quantities, records scrap, and handshakes WIP
   */
  static async completeStage(
    input: CompleteStageInput,
    supabaseClient?: any
  ): Promise<{
    queueJob: any;
    operationLog: any;
    consumedWipLot: ProductionOrderWIPLot;
    nextWipLot?: ProductionOrderWIPLot;
    reworkLot?: ProductionOrderWIPLot;
  }> {
    const supabase = supabaseClient || createClient();

    // 1. Fetch Order and Queue Jobs
    const { data: queueJobs } = await supabase
      .from('work_center_queue_jobs')
      .select('*')
      .eq('order_id', input.order_id)
      .order('sequence_no', { ascending: true });

    const currentJob = queueJobs?.find((j: any) => j.stage_code === input.stage_code);
    if (!currentJob) {
      throw new Error(`404 Not Found: Stage '${input.stage_code}' not found for order.`);
    }

    // Determine next sequential stage
    const nextJob = queueJobs?.find((j: any) => j.sequence_no > currentJob.sequence_no);
    const nextStageCode = nextJob?.stage_code || 'COMPLETED';
    const nextWorkCenterId = nextJob?.work_center_id || currentJob.work_center_id;

    // 2. Fetch Active WIP lot
    const { data: activeWip } = await supabase
      .from('production_order_wip_lots')
      .select('*')
      .eq('order_id', input.order_id)
      .eq('current_stage_code', input.stage_code)
      .eq('status', 'IN_PROCESS')
      .single();

    if (!activeWip) {
      throw new Error(`404 Not Found: No active WIP lot in status 'IN_PROCESS' for stage '${input.stage_code}'.`);
    }

    const scrappedQty = Number(input.scrapped_quantity || 0);
    const reworkQty = Number(input.rework_quantity || 0);

    // Fail-fast Quantity Conservation Check: passed + scrapped + rework must equal activeWip.quantity
    const accountedTotal = input.passed_quantity + scrappedQty + reworkQty;
    if (accountedTotal !== activeWip.quantity) {
      throw new Error(
        `422 Unprocessable Entity: WIP quantity conservation violation. Input: ${activeWip.quantity}, Accounted: ${accountedTotal} (Passed: ${input.passed_quantity}, Scrapped: ${scrappedQty}, Rework: ${reworkQty}).`
      );
    }

    // 3. Record Operation Log
    const { data: log, error: logErr } = await supabase
      .from('production_operation_logs')
      .insert([
        {
          order_id: input.order_id,
          work_center_id: currentJob.work_center_id,
          sequence_no: currentJob.sequence_no,
          stage_code: input.stage_code,
          queue_job_id: currentJob.id,
          wip_lot_id: activeWip.id,
          quantity_in: activeWip.quantity,
          quantity_passed: input.passed_quantity,
          quantity_scrapped: scrappedQty,
          quantity_reworked: reworkQty,
          scrap_reason: input.scrap_reason || (scrappedQty > 0 ? 'WORKSHOP_DEFECT' : null),
          scrap_weight_grams: Number(input.scrap_weight_grams || 0.0),
          actual_minutes: input.actual_minutes || 25,
          operator_id: input.actor_id || null,
          notes: input.notes || null
        }
      ])
      .select()
      .single();

    if (logErr) throw new Error(`Failed to record operation log: ${logErr.message}`);

    // 4. Record Scrap in production_scrap_ledger if scrap occurred
    if (scrappedQty > 0 || Number(input.scrap_weight_grams || 0) > 0) {
      const scrapWeight = Number(input.scrap_weight_grams || 0.0);
      const category = input.scrap_category || 'BENCH_FILINGS';
      const recoveredPureSilver =
        category === 'RECOVERED_SILVER'
          ? scrapWeight
          : parseFloat((scrapWeight * 0.925 * 0.95).toFixed(4));

      await supabase.from('production_scrap_ledger').insert([
        {
          order_id: input.order_id,
          stage_log_id: log.id,
          work_center_id: currentJob.work_center_id,
          scrap_category: category,
          weight_grams: scrapWeight,
          silver_purity: '925',
          recovered_pure_silver: recoveredPureSilver,
          recorded_by: input.actor_id || null,
          notes: input.notes || null
        }
      ]);

      // Increment order cumulative scrapped quantity
      const { data: currOrder } = await supabase
        .from('production_orders')
        .select('scrapped_quantity')
        .eq('id', input.order_id)
        .single();

      if (currOrder) {
        await supabase
          .from('production_orders')
          .update({
            scrapped_quantity: Number(currOrder.scrapped_quantity || 0) + scrappedQty,
            updated_at: new Date().toISOString()
          })
          .eq('id', input.order_id);
      }
    }

    // 5. Handshake WIP: Consume input lot and create downstream / rework lot
    const { consumedInputLot, downstreamLot, reworkLot } = await ProductionWIPService.completeStageWIPHandshake({
      inputWipLotId: activeWip.id,
      nextStageCode,
      nextWorkCenterId,
      passedQuantity: input.passed_quantity,
      scrappedQuantity: scrappedQty,
      reworkQuantity: reworkQty,
      measuredOutputWeightGrams: input.measured_output_weight_grams,
      supabaseClient: supabase
    });

    // 6. Update Queue Job status to COMPLETED
    const nowIso = new Date().toISOString();
    const { data: updatedJob } = await supabase
      .from('work_center_queue_jobs')
      .update({
        status: 'COMPLETED',
        actual_end_time: nowIso,
        actual_minutes: input.actual_minutes || 25
      })
      .eq('id', currentJob.id)
      .select()
      .single();

    return {
      queueJob: updatedJob,
      operationLog: log,
      consumedWipLot: consumedInputLot,
      nextWipLot: downstreamLot,
      reworkLot
    };
  }

  /**
   * 4. Record 100% Piece QC Inspection
   */
  static async recordQCInspection(
    input: RecordQCInput,
    supabaseClient?: any
  ): Promise<ProductionQCInspection> {
    const supabase = supabaseClient || createClient();

    // 1. Fetch Order and check that Stage 60 (HALLMARK) is completed
    const { data: hallmarkJob } = await supabase
      .from('work_center_queue_jobs')
      .select('status')
      .eq('order_id', input.order_id)
      .eq('stage_code', 'HALLMARK')
      .single();

    if (hallmarkJob && hallmarkJob.status !== 'COMPLETED') {
      throw new Error('409 Conflict: Cannot perform QC inspection before HALLMARK stage is COMPLETED.');
    }

    const failedCount = Number(input.failed_count || 0);
    const reworkCount = Number(input.rework_count || 0);

    // 2. Enforce Check Balance: sample_size = passed + failed + rework
    if (input.sample_size !== input.passed_count + failedCount + reworkCount) {
      throw new Error(
        `422 Unprocessable Entity: QC count balance violation. Sample Size (${input.sample_size}) must equal Passed (${input.passed_count}) + Failed (${failedCount}) + Rework (${reworkCount}).`
      );
    }

    // 3. Insert QC Inspection Record
    const { data: qcInspection, error } = await supabase
      .from('production_qc_inspections')
      .insert([
        {
          order_id: input.order_id,
          inspector_id: input.inspector_id,
          stage_code: 'QC',
          sample_size: input.sample_size,
          passed_count: input.passed_count,
          failed_count: failedCount,
          rework_count: reworkCount,
          outcome: input.outcome,
          defect_category: input.defect_category || null,
          rework_target_stage: input.rework_target_stage || null,
          notes: input.notes || null,
          inspected_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw new Error(`Failed to record QC inspection: ${error.message}`);

    // 4. Update Order qc_status
    await supabase
      .from('production_orders')
      .update({
        qc_status: input.outcome,
        updated_at: new Date().toISOString()
      })
      .eq('id', input.order_id);

    return qcInspection;
  }

  /**
   * 5. Manager Mass Balance Override
   */
  static async overrideMassBalance(
    orderId: string,
    actorId: string,
    justification: string,
    supabaseClient?: any
  ): Promise<{ status: string; authorizedBy: string }> {
    const supabase = supabaseClient || createClient();

    if (!justification || justification.trim().length < 10) {
      throw new Error('422 Unprocessable Entity: Mandatory detailed justification required to override mass balance.');
    }

    const { data: order } = await supabase
      .from('production_orders')
      .select('id, mass_balance_status')
      .eq('id', orderId)
      .single();

    if (!order) throw new Error(`404 Not Found: Order #${orderId} not found.`);

    await supabase
      .from('production_orders')
      .update({
        mass_balance_status: 'OVERRIDDEN',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    await supabase.from('production_order_timeline').insert([
      {
        order_id: orderId,
        from_status: order.mass_balance_status,
        to_status: 'OVERRIDDEN',
        action: 'MASS_BALANCE_OVERRIDE',
        actor_id: actorId,
        details: `Manager override authorized. Justification: ${justification}`
      }
    ]);

    return { status: 'OVERRIDDEN', authorizedBy: actorId };
  }

  /**
   * 6. Complete Order: Verifies QC & Mass Balance, creates finished goods batch, and closes order
   */
  static async completeOrder(
    orderId: string,
    actorId?: string,
    notes?: string,
    supabaseClient?: any
  ): Promise<{ order: ProductionOrder; finishedBatch: any }> {
    const supabase = supabaseClient || createClient();

    // 1. Fetch Order
    const { data: order, error: oErr } = await supabase
      .from('production_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (oErr || !order) throw new Error(`404 Not Found: Order #${orderId} not found.`);

    if (order.status !== 'IN_PROGRESS') {
      throw new Error(`422 Unprocessable Entity: Cannot complete order in status '${order.status}'.`);
    }

    // 2. Verify QC Status is PASSED
    if (order.qc_status !== 'PASSED') {
      throw new Error(`422 Unprocessable Entity: Order cannot be completed without an approved QC status of 'PASSED'. Current: '${order.qc_status}'.`);
    }

    // 3. Verify Packaging Stage is COMPLETED
    const { data: pkgJob } = await supabase
      .from('work_center_queue_jobs')
      .select('status')
      .eq('order_id', orderId)
      .eq('stage_code', 'PACKAGING')
      .single();

    if (pkgJob && pkgJob.status !== 'COMPLETED') {
      throw new Error('422 Unprocessable Entity: Packaging stage must be COMPLETED before order completion.');
    }

    // 4. Verify Final Packaging WIP lot exists and is in COMPLETED_STAGE
    const { data: finalWip } = await supabase
      .from('production_order_wip_lots')
      .select('*')
      .eq('order_id', orderId)
      .eq('current_stage_code', 'PACKAGING')
      .single();

    if (!finalWip) {
      throw new Error('422 Unprocessable Entity: Missing final Packaging WIP lot.');
    }

    // 5. Evaluate Mass Balance Tolerance Gate
    const mbResult = await ProductionScrapMassBalanceService.calculateMassBalance(orderId, supabase);
    if (!mbResult.is_balanced && order.mass_balance_status !== 'OVERRIDDEN') {
      throw new Error(
        `422 Unprocessable Entity: Mass balance variance of ${mbResult.variance_grams}g exceeds allowable industrial tolerance of 0.5000g. Order is blocked.`
      );
    }

    const nowIso = new Date().toISOString();
    const completedQty = order.planned_quantity - Number(order.scrapped_quantity || 0);

    // 6. Create Finished Goods Inventory Batch (with Authoritative WIP Lineage)
    const { data: finishedBatch, error: bErr } = await supabase
      .from('inventory_batches')
      .insert([
        {
          variant_id: order.variant_id,
          warehouse_id: order.warehouse_id || '00000000-0000-0000-0000-000000000001',
          source_wip_lot_id: finalWip.id,
          production_order_id: order.id,
          batch_number: order.order_code,
          original_quantity: completedQty,
          remaining_quantity: completedQty,
          reserved_quantity: 0.0,
          unit_cost: 0.0,
          receipt_date: nowIso
        }
      ])
      .select()
      .single();

    if (bErr) throw new Error(`Failed to create finished goods batch: ${bErr.message}`);

    // 7. Post Inbound Stock Movement to stock_ledger ('in')
    const { data: inTxType } = await supabase
      .from('stock_transaction_types')
      .select('id')
      .eq('code', 'in')
      .single();

    await supabase.from('stock_ledger').insert([
      {
        variant_id: order.variant_id,
        warehouse_id: order.warehouse_id,
        transaction_type_id: inTxType?.id || '00000000-0000-0000-0000-000000000001',
        quantity: completedQty,
        unit_id: '00000000-0000-0000-0000-000000000003',
        running_balance: completedQty,
        reference_id: order.id,
        reference_type: 'PRODUCTION_FINISHED_GOODS',
        performed_by: actorId || null,
        created_at: nowIso
      }
    ]);

    // 8. Update Order status to COMPLETED
    const { data: completedOrder } = await supabase
      .from('production_orders')
      .update({
        status: 'COMPLETED',
        completed_quantity: completedQty,
        completion_date: nowIso,
        mass_balance_status: mbResult.status,
        updated_at: nowIso
      })
      .eq('id', orderId)
      .select()
      .single();

    return { order: completedOrder, finishedBatch };
  }

  /**
   * 7. Cancel Execution: Enforces 7-phase cancellation and physical recovery
   */
  static async cancelExecution(
    orderId: string,
    actorId?: string,
    reason?: string,
    supabaseClient?: any
  ): Promise<{ order: ProductionOrder; recoveryAction: string }> {
    const supabase = supabaseClient || createClient();

    const { data: order } = await supabase
      .from('production_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (!order) throw new Error(`404 Not Found: Order #${orderId} not found.`);

    if (order.status === 'COMPLETED') {
      throw new Error('422 Unprocessable Entity: Phase G violation. Cannot cancel an already COMPLETED production order.');
    }

    if (order.qc_status === 'PASSED') {
      throw new Error('422 Unprocessable Entity: Phase F violation. Cannot cancel an order that has already PASSED QC inspection.');
    }

    // Check if any material was physically consumed
    const { count: consumeCount } = await supabase
      .from('production_material_consumptions')
      .select('*', { count: 'exact', head: true })
      .eq('order_id', orderId);

    let recoveryAction = 'RESERVATION_UNLOCKED';

    if (consumeCount && consumeCount > 0) {
      // Phase C/D/E: Consumed stock exists -> abort active WIP to scrap
      recoveryAction = 'WIP_ABORTED_TO_RECOVERY_SCRAP';

      await supabase
        .from('production_order_wip_lots')
        .update({ status: 'SCRAPPED' })
        .eq('order_id', orderId)
        .in('status', ['READY_FOR_STAGE', 'IN_PROCESS', 'QC_HOLD', 'REWORK']);
    } else {
      // Phase A/B: Pre-consumption -> unlock reserved lots
      await supabase
        .from('production_order_wip_lots')
        .update({ status: 'CANCELLED' })
        .eq('order_id', orderId);
    }

    const { data: cancelledOrder } = await supabase
      .from('production_orders')
      .update({
        status: 'CANCELLED',
        notes: order.notes ? `${order.notes}\nCancellation Reason: ${reason}` : reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    return { order: cancelledOrder, recoveryAction };
  }
}
