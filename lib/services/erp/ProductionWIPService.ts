import { createClient } from '@/lib/supabase/client';
import type { ProductionOrderWIPLot, WIPLotStatus } from '@/types/erp';

export class ProductionWIPService {
  /**
   * Initialize initial WIP lot at Stage 10 (CASTING)
   */
  static async initializeFirstWIPLot(
    orderId: string,
    plannedQuantity: number,
    estimatedWeightGrams: number,
    warehouseId: string,
    supabaseClient?: any
  ): Promise<ProductionOrderWIPLot> {
    const supabase = supabaseClient || createClient();

    // Check if initial WIP lot already exists
    const { data: existing } = await supabase
      .from('production_order_wip_lots')
      .select('*')
      .eq('order_id', orderId)
      .eq('current_stage_code', 'CASTING')
      .single();

    if (existing) return existing;

    // Get Casting work center
    const { data: wc } = await supabase
      .from('work_centers')
      .select('id')
      .eq('code', 'WC-CASTING')
      .single();

    const workCenterId = wc?.id || '00000000-0000-0000-0000-000000000001';
    const lotNumber = `WIP-${orderId.slice(0, 8).toUpperCase()}-CASTING-01`;

    const { data: created, error } = await supabase
      .from('production_order_wip_lots')
      .insert([
        {
          order_id: orderId,
          wip_lot_number: lotNumber,
          current_stage_code: 'CASTING',
          work_center_id: workCenterId,
          warehouse_id: warehouseId,
          quantity: plannedQuantity,
          weight_grams: estimatedWeightGrams,
          status: 'READY_FOR_STAGE',
          version: 1
        }
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to initialize first WIP lot: ${error.message}`);
    }

    return created;
  }

  /**
   * Clock in: Transition WIP lot from READY_FOR_STAGE to IN_PROCESS
   */
  static async clockInWIPLot(
    wipLotId: string,
    supabaseClient?: any
  ): Promise<ProductionOrderWIPLot> {
    const supabase = supabaseClient || createClient();

    const { data: lot, error: fetchErr } = await supabase
      .from('production_order_wip_lots')
      .select('*')
      .eq('id', wipLotId)
      .single();

    if (fetchErr || !lot) {
      throw new Error(`404 Not Found: WIP lot #${wipLotId} not found.`);
    }

    if (lot.status !== 'READY_FOR_STAGE') {
      throw new Error(
        `409 Conflict: Cannot clock in WIP lot in status '${lot.status}'. Expected 'READY_FOR_STAGE'.`
      );
    }

    const { data: updated, error } = await supabase
      .from('production_order_wip_lots')
      .update({
        status: 'IN_PROCESS',
        updated_at: new Date().toISOString()
      })
      .eq('id', wipLotId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update WIP lot status: ${error.message}`);
    return updated;
  }

  /**
   * Handshake stage completion: Consume input WIP lot and create downstream output WIP lot
   */
  static async completeStageWIPHandshake(params: {
    inputWipLotId: string;
    nextStageCode: string;
    nextWorkCenterId: string;
    passedQuantity: number;
    scrappedQuantity: number;
    reworkQuantity: number;
    measuredOutputWeightGrams: number;
    supabaseClient?: any;
  }): Promise<{
    consumedInputLot: ProductionOrderWIPLot;
    downstreamLot?: ProductionOrderWIPLot;
    reworkLot?: ProductionOrderWIPLot;
  }> {
    const supabase = params.supabaseClient || createClient();

    // 1. Fetch input WIP lot
    const { data: inputLot, error: fetchErr } = await supabase
      .from('production_order_wip_lots')
      .select('*')
      .eq('id', params.inputWipLotId)
      .single();

    if (fetchErr || !inputLot) {
      throw new Error(`404 Not Found: Input WIP lot #${params.inputWipLotId} not found.`);
    }

    // 2. Strict Quantity Conservation Invariant
    const accountedTotal = params.passedQuantity + params.scrappedQuantity + params.reworkQuantity;
    if (accountedTotal !== inputLot.quantity) {
      throw new Error(
        `422 Unprocessable Entity: WIP quantity conservation violation. Input: ${inputLot.quantity}, Accounted: ${accountedTotal} (Passed: ${params.passedQuantity}, Scrapped: ${params.scrappedQuantity}, Rework: ${params.reworkQuantity}).`
      );
    }

    // 3. Mark input lot as CONSUMED_INTO_NEXT (terminal success for intermediate stage)
    const { data: consumedLot, error: consErr } = await supabase
      .from('production_order_wip_lots')
      .update({
        status: 'CONSUMED_INTO_NEXT',
        destination_stage_code: params.nextStageCode,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.inputWipLotId)
      .select()
      .single();

    if (consErr) throw new Error(`Failed to consume WIP lot: ${consErr.message}`);

    let downstreamLot: ProductionOrderWIPLot | undefined;
    let reworkLot: ProductionOrderWIPLot | undefined;

    // 4. Create Downstream WIP Lot if passedQuantity > 0
    if (params.passedQuantity > 0) {
      const lotNumber = `WIP-${inputLot.order_id.slice(0, 8).toUpperCase()}-${params.nextStageCode}-${Date.now().toString().slice(-4)}`;
      const { data: newLot, error: newErr } = await supabase
        .from('production_order_wip_lots')
        .insert([
          {
            order_id: inputLot.order_id,
            wip_lot_number: lotNumber,
            current_stage_code: params.nextStageCode,
            work_center_id: params.nextWorkCenterId,
            warehouse_id: inputLot.warehouse_id,
            location_id: inputLot.location_id,
            quantity: params.passedQuantity,
            weight_grams: params.measuredOutputWeightGrams,
            status: 'READY_FOR_STAGE',
            source_wip_lot_id: inputLot.id,
            version: 1
          }
        ])
        .select()
        .single();

      if (newErr) throw new Error(`Failed to create downstream WIP lot: ${newErr.message}`);
      downstreamLot = newLot;
    }

    // 5. Create Rework WIP Lot if reworkQuantity > 0
    if (params.reworkQuantity > 0) {
      const rwkLotNumber = `WIP-${inputLot.order_id.slice(0, 8).toUpperCase()}-RWK-${Date.now().toString().slice(-4)}`;
      const { data: rLot, error: rErr } = await supabase
        .from('production_order_wip_lots')
        .insert([
          {
            order_id: inputLot.order_id,
            wip_lot_number: rwkLotNumber,
            current_stage_code: params.nextStageCode, // Target rework stage
            work_center_id: params.nextWorkCenterId,
            warehouse_id: inputLot.warehouse_id,
            quantity: params.reworkQuantity,
            weight_grams: 0.0, // Scale weight recorded on rework completion
            status: 'REWORK',
            source_wip_lot_id: inputLot.id,
            version: 1
          }
        ])
        .select()
        .single();

      if (rErr) throw new Error(`Failed to create rework WIP lot: ${rErr.message}`);
      reworkLot = rLot;
    }

    return {
      consumedInputLot: consumedLot,
      downstreamLot,
      reworkLot
    };
  }

  /**
   * Recombine QC Hold lot and re-inspected rework lot before Packaging
   */
  static async recombineReworkWithHoldLot(params: {
    qcHoldLotId: string;
    reworkClearedLotId: string;
    packagingWorkCenterId: string;
    supabaseClient?: any;
  }): Promise<ProductionOrderWIPLot> {
    const supabase = params.supabaseClient || createClient();

    const { data: holdLot } = await supabase
      .from('production_order_wip_lots')
      .select('*')
      .eq('id', params.qcHoldLotId)
      .single();

    const { data: rwkLot } = await supabase
      .from('production_order_wip_lots')
      .select('*')
      .eq('id', params.reworkClearedLotId)
      .single();

    if (!holdLot || !rwkLot) {
      throw new Error('404 Not Found: Could not find hold or rework lot for recombination.');
    }

    const totalQuantity = holdLot.quantity + rwkLot.quantity;
    const totalWeight = Number(holdLot.weight_grams) + Number(rwkLot.weight_grams);

    // Consume both lots
    await supabase
      .from('production_order_wip_lots')
      .update({ status: 'CONSUMED_INTO_NEXT' })
      .in('id', [holdLot.id, rwkLot.id]);

    // Create Recombined Packaging WIP Lot
    const lotNumber = `WIP-${holdLot.order_id.slice(0, 8).toUpperCase()}-PACKAGING-RECOMBINED`;
    const { data: recombined, error } = await supabase
      .from('production_order_wip_lots')
      .insert([
        {
          order_id: holdLot.order_id,
          wip_lot_number: lotNumber,
          current_stage_code: 'PACKAGING',
          work_center_id: params.packagingWorkCenterId,
          warehouse_id: holdLot.warehouse_id,
          quantity: totalQuantity,
          weight_grams: totalWeight,
          status: 'READY_FOR_STAGE',
          source_wip_lot_id: holdLot.id,
          version: 1
        }
      ])
      .select()
      .single();

    if (error) throw new Error(`Failed to create recombined WIP lot: ${error.message}`);
    return recombined;
  }
}
