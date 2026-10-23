import { createClient } from '@/lib/supabase/client';
import type {
  ProductionOrder,
  ProductionOrderStatus,
  WorkCenterQueueJob,
  ProductionOperationLog
} from '@/types/erp';
import { MaterialAllocationService } from './MaterialAllocationService';
import { StockAvailabilityService } from './StockAvailabilityService';

export interface CreateProductionOrderInput {
  product_id: string;
  variant_id?: string;
  planned_quantity: number;
  target_silver_purity?: string;
  estimated_silver_weight?: number;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  target_date?: string;
  assigned_supervisor_id?: string;
  assigned_operator_id?: string;
  notes?: string;
  created_by?: string;
}

export class ProductionOrderService {
  /**
   * Generate Next Production Order Code: MO-YYYY-XXXXXX
   */
  static async generateOrderCode(): Promise<string> {
    const supabase = createClient();
    const currentYear = new Date().getFullYear();

    const { count } = await supabase
      .from('production_orders')
      .select('*', { count: 'exact', head: true });

    const nextSeq = String((count || 0) + 101).padStart(6, '0');
    return `MO-${currentYear}-${nextSeq}`;
  }

  /**
   * Create a new Production Order with automated availability check and allocation
   */
  static async createProductionOrder(input: CreateProductionOrderInput): Promise<{
    order: ProductionOrder;
    isFullyAvailable: boolean;
  }> {
    const supabase = createClient();

    if (input.planned_quantity <= 0) {
      throw new Error('Planned quantity must be greater than zero.');
    }

    const orderCode = await this.generateOrderCode();

    const { data: order, error: orderError } = await supabase
      .from('production_orders')
      .insert([
        {
          order_code: orderCode,
          product_id: input.product_id,
          variant_id: input.variant_id || null,
          planned_quantity: input.planned_quantity,
          completed_quantity: 0,
          scrapped_quantity: 0,
          target_silver_purity: input.target_silver_purity || '925',
          estimated_silver_weight: input.estimated_silver_weight || 0.0,
          actual_silver_weight: 0.0,
          silver_loss_weight: 0.0,
          status: 'PLANNED',
          priority: input.priority || 'MEDIUM',
          assigned_supervisor_id: input.assigned_supervisor_id || null,
          assigned_operator_id: input.assigned_operator_id || null,
          target_date: input.target_date || null,
          notes: input.notes || null,
          created_by: input.created_by || null
        }
      ])
      .select()
      .single();

    if (orderError) throw new Error(`Failed to create production order: ${orderError.message}`);

    // Record Creation Timeline Event
    await supabase.from('production_order_timeline').insert([
      {
        order_id: order.id,
        from_status: null,
        to_status: 'PLANNED',
        action: 'CREATE',
        actor_id: input.created_by || null,
        details: `Created Work Order #${orderCode} for ${input.planned_quantity} pieces`
      }
    ]);

    // Check Availability and Attempt Material Allocation if variant is specified
    let isFullyAvailable = true;
    if (input.variant_id) {
      const avail = await StockAvailabilityService.checkAvailability(
        input.variant_id,
        input.planned_quantity
      );
      isFullyAvailable = avail.is_fully_available;

      // Automatically allocate materials
      await MaterialAllocationService.allocateMaterialsForOrder(
        order.id,
        input.variant_id,
        input.planned_quantity
      );
    }

    return { order, isFullyAvailable };
  }

  /**
   * Transition order state machine: PLANNED -> CONFIRMED -> IN_PROGRESS -> PAUSED -> COMPLETED
   */
  static async transitionStatus(
    orderId: string,
    action: 'CONFIRM' | 'START' | 'PAUSE' | 'RESUME' | 'COMPLETE' | 'CANCEL',
    actorId?: string,
    notes?: string
  ): Promise<ProductionOrder> {
    const supabase = createClient();

    const { data: order, error: fetchErr } = await supabase
      .from('production_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchErr || !order) throw new Error(`Production Order #${orderId} not found`);

    let newStatus: ProductionOrderStatus = order.status;
    const updatePayload: Record<string, unknown> = {};
    const nowIso = new Date().toISOString();

    switch (action) {
      case 'CONFIRM':
        if (order.status !== 'PLANNED') {
          throw new Error(`Cannot confirm order in status '${order.status}'`);
        }
        newStatus = 'CONFIRMED';
        break;

      case 'START':
        if (order.status !== 'CONFIRMED' && order.status !== 'PLANNED') {
          throw new Error(`Cannot start order in status '${order.status}'`);
        }
        newStatus = 'IN_PROGRESS';
        updatePayload.start_date = order.start_date || nowIso;

        // Initialize Work Center Queue Jobs if empty
        await this.initializeQueueJobs(order.id, order.product_id);
        break;

      case 'PAUSE':
        if (order.status !== 'IN_PROGRESS') {
          throw new Error(`Cannot pause order in status '${order.status}'`);
        }
        newStatus = 'PAUSED';
        break;

      case 'RESUME':
        if (order.status !== 'PAUSED') {
          throw new Error(`Cannot resume order in status '${order.status}'`);
        }
        newStatus = 'IN_PROGRESS';
        break;

      case 'COMPLETE':
        newStatus = 'COMPLETED';
        updatePayload.completion_date = nowIso;
        updatePayload.completed_quantity = order.planned_quantity - order.scrapped_quantity;
        if (order.start_date) {
          const startMs = new Date(order.start_date).getTime();
          updatePayload.total_duration_minutes = Math.round((Date.now() - startMs) / 60000);
        }
        break;

      case 'CANCEL':
        newStatus = 'CANCELLED';
        // Release material allocations
        await MaterialAllocationService.releaseAllocationsForOrder(order.id);
        break;
    }

    updatePayload.status = newStatus;
    if (notes) {
      updatePayload.notes = order.notes ? `${order.notes}\n${notes}` : notes;
    }

    const { data: updated, error: updateErr } = await supabase
      .from('production_orders')
      .update(updatePayload)
      .eq('id', orderId)
      .select()
      .single();

    if (updateErr) throw new Error(`Failed to update order status: ${updateErr.message}`);

    // Record Timeline Event
    await supabase.from('production_order_timeline').insert([
      {
        order_id: order.id,
        from_status: order.status,
        to_status: newStatus,
        action,
        actor_id: actorId || null,
        details: notes || `Order transitioned from ${order.status} to ${newStatus}`
      }
    ]);

    return updated;
  }

  /**
   * Initialize 8-Stage Routing Queue Jobs for an Order
   */
  private static async initializeQueueJobs(orderId: string, productId: string): Promise<void> {
    const supabase = createClient();

    // Check if jobs already initialized
    const { count } = await supabase
      .from('work_center_queue_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('order_id', orderId);

    if (count && count > 0) return;

    // Fetch work centers
    const { data: workCenters } = await supabase.from('work_centers').select('id, code');
    const wcMap = new Map((workCenters || []).map((w) => [w.code, w.id]));

    // 8 Standard Factory Stages
    const standardStages = [
      { seq: 10, stage: 'CASTING', wcCode: 'WC-CASTING', mins: 45 },
      { seq: 20, stage: 'CLEANING', wcCode: 'WC-CLEANING', mins: 25 },
      { seq: 30, stage: 'SETTING', wcCode: 'WC-SETTING', mins: 60 },
      { seq: 40, stage: 'POLISHING', wcCode: 'WC-POLISHING', mins: 40 },
      { seq: 50, stage: 'RHODIUM', wcCode: 'WC-RHODIUM', mins: 20 },
      { seq: 60, stage: 'HALLMARK', wcCode: 'WC-HALLMARK', mins: 15 },
      { seq: 70, stage: 'QC', wcCode: 'WC-QC', mins: 20 },
      { seq: 80, stage: 'PACKAGING', wcCode: 'WC-PACKAGING', mins: 15 }
    ];

    const jobsToInsert = standardStages.map((s) => ({
      order_id: orderId,
      work_center_id: wcMap.get(s.wcCode) || (workCenters && workCenters[0]?.id),
      sequence_no: s.seq,
      stage_code: s.stage,
      status: 'QUEUED',
      estimated_minutes: s.mins
    }));

    await supabase.from('work_center_queue_jobs').insert(jobsToInsert);
  }

  /**
   * Record shop floor operation log & scrap
   */
  static async recordOperation(params: {
    order_id: string;
    work_center_id?: string;
    sequence_no?: number;
    stage_code: string;
    quantity_passed: number;
    quantity_scrapped?: number;
    scrap_reason?: string;
    scrap_weight_grams?: number;
    estimated_minutes?: number;
    actual_minutes?: number;
    operator_id?: string;
    notes?: string;
  }): Promise<ProductionOperationLog> {
    const supabase = createClient();

    const scrappedQty = Number(params.quantity_scrapped || 0);
    const scrapWeight = Number(params.scrap_weight_grams || 0);

    const { data: log, error: logErr } = await supabase
      .from('production_operation_logs')
      .insert([
        {
          order_id: params.order_id,
          work_center_id: params.work_center_id || null,
          sequence_no: params.sequence_no || 10,
          stage_code: params.stage_code,
          quantity_passed: params.quantity_passed,
          quantity_scrapped: scrappedQty,
          scrap_reason: params.scrap_reason || (scrappedQty > 0 ? 'CASTING_DEFECT' : null),
          scrap_weight_grams: scrapWeight,
          estimated_minutes: params.estimated_minutes || 30,
          actual_minutes: params.actual_minutes || 25,
          operator_id: params.operator_id || null,
          notes: params.notes || null
        }
      ])
      .select()
      .single();

    if (logErr) throw new Error(`Failed to record operation log: ${logErr.message}`);

    // Update order scrapped quantity if scrap occurred
    if (scrappedQty > 0) {
      const { data: currentOrder } = await supabase
        .from('production_orders')
        .select('scrapped_quantity')
        .eq('id', params.order_id)
        .single();

      if (currentOrder) {
        await supabase
          .from('production_orders')
          .update({
            scrapped_quantity: Number(currentOrder.scrapped_quantity || 0) + scrappedQty
          })
          .eq('id', params.order_id);
      }
    }

    // Mark Queue Job completed
    await supabase
      .from('work_center_queue_jobs')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        actual_minutes: params.actual_minutes || 25
      })
      .eq('order_id', params.order_id)
      .eq('stage_code', params.stage_code);

    return log;
  }
}
