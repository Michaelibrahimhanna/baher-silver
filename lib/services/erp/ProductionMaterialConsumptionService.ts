import { createClient } from '@/lib/supabase/client';
import type { ProductionMaterialConsumption } from '@/types/erp';

export class ProductionMaterialConsumptionService {
  /**
   * Two-tier consumption stage resolution:
   * Tier 1: Explicit stage_code on BOM snapshot line (if present)
   * Tier 2: Factory standard consumption rules lookup table (stage_material_consumption_rules)
   */
  static async resolveConsumptionStage(
    lineType: string,
    itemCode: string,
    snapshotLineStageCode?: string | null,
    supabaseClient?: any
  ): Promise<string> {
    if (snapshotLineStageCode) return snapshotLineStageCode;

    const supabase = supabaseClient || createClient();

    // Query factory lookup rules
    const { data: rules } = await supabase
      .from('stage_material_consumption_rules')
      .select('*')
      .eq('line_type', lineType)
      .eq('is_active', true);

    if (rules && rules.length > 0) {
      // Find pattern match or wildcard
      const exactMatch = rules.find((r: any) => r.item_code_pattern === itemCode);
      if (exactMatch) return exactMatch.consumption_stage_code;

      const wildcardMatch = rules.find((r: any) => {
        if (r.item_code_pattern === '*') return true;
        const clean = r.item_code_pattern.replace(/\*/g, '');
        return itemCode.includes(clean);
      });
      if (wildcardMatch) return wildcardMatch.consumption_stage_code;
    }

    // Deterministic fallback if table empty
    switch (lineType) {
      case 'SILVER':
        return 'CASTING';
      case 'STONE':
        return 'SETTING';
      case 'CHEMICAL':
        return itemCode.includes('RHODIUM') ? 'RHODIUM' : 'CLEANING';
      case 'PACKAGING':
        return 'PACKAGING';
      case 'COMPONENT':
        return 'SETTING';
      case 'CONSUMABLE':
        return 'POLISHING';
      default:
        return 'CASTING';
    }
  }

  /**
   * Physically issue and consume allocated material lot into active stage WIP
   */
  static async consumeAllocatedMaterialsForStage(params: {
    orderId: string;
    stageCode: string;
    wipLotId: string;
    stageLogId?: string;
    actorId?: string;
    specificLotAllocationId?: string;
    specificQuantity?: number;
    supabaseClient?: any;
  }): Promise<ProductionMaterialConsumption[]> {
    const supabase = params.supabaseClient || createClient();

    // 1. Fetch Order
    const { data: order, error: oErr } = await supabase
      .from('production_orders')
      .select('id, order_code, warehouse_id, actual_silver_weight')
      .eq('id', params.orderId)
      .single();

    if (oErr || !order) {
      throw new Error(`404 Not Found: Production Order #${params.orderId} not found.`);
    }

    // 2. Fetch Child Lot Allocations for Order
    let query = supabase
      .from('production_material_lot_allocations')
      .select('*')
      .eq('order_id', params.orderId)
      .in('status', ['RESERVED', 'PARTIALLY_CONSUMED']);

    if (params.specificLotAllocationId) {
      query = query.eq('id', params.specificLotAllocationId);
    }

    const { data: lotAllocations, error: allocErr } = await query;
    if (allocErr || !lotAllocations || lotAllocations.length === 0) {
      // Nothing to consume or already consumed
      return [];
    }

    // 3. Fetch Snapshot Lines to check Tier 1 stage_code
    const { data: snapshot } = await supabase
      .from('production_order_bom_snapshots')
      .select('*')
      .eq('order_id', params.orderId)
      .single();

    const snapshotLines = Array.isArray(snapshot?.snapshot_data)
      ? snapshot.snapshot_data
      : snapshot?.snapshot_data?.lines || [];

    // Filter allocations that map to the current stage
    const eligibleAllocations = [];
    for (const alloc of lotAllocations) {
      const snapLine = snapshotLines.find((l: any) => l.line_type === alloc.line_type);
      const targetStage = await this.resolveConsumptionStage(
        alloc.line_type,
        alloc.item_code || '',
        snapLine?.stage_code,
        supabase
      );

      if (targetStage === params.stageCode) {
        eligibleAllocations.push(alloc);
      }
    }

    if (eligibleAllocations.length === 0) {
      return [];
    }

    const createdConsumptions: ProductionMaterialConsumption[] = [];
    let totalSilverWeightConsumed = 0.0;

    // 4. Execute atomic consumption per eligible lot
    for (const alloc of eligibleAllocations) {
      const remainingUnconsumed = Number(alloc.allocated_quantity) - Number(alloc.consumed_quantity);
      if (remainingUnconsumed <= 0) continue;

      const qtyToConsume = params.specificQuantity
        ? Math.min(params.specificQuantity, remainingUnconsumed)
        : remainingUnconsumed;

      const newConsumedTotal = Number(alloc.consumed_quantity) + qtyToConsume;
      const isFullyConsumed = newConsumedTotal >= Number(alloc.allocated_quantity);

      // A. Mutate Physical Stock
      let materialIdForLedger: string | null = null;

      if (alloc.inventory_batch_id) {
        // Raw material / silver / packaging batch
        const { data: batch } = await supabase
          .from('inventory_batches')
          .select('id, material_id, remaining_quantity, reserved_quantity')
          .eq('id', alloc.inventory_batch_id)
          .single();

        if (batch) {
          materialIdForLedger = batch.material_id;
          const newRemaining = Math.max(0, Number(batch.remaining_quantity) - qtyToConsume);
          const newReserved = Math.max(0, Number(batch.reserved_quantity) - qtyToConsume);

          await supabase
            .from('inventory_batches')
            .update({
              remaining_quantity: newRemaining,
              reserved_quantity: newReserved,
              updated_at: new Date().toISOString()
            })
            .eq('id', batch.id);

          if (alloc.line_type === 'SILVER') {
            totalSilverWeightConsumed += qtyToConsume;
          }
        }
      } else if (alloc.gemstone_lot_id) {
        // Gemstone lot: decrement reserved_quantity only (zero double-counting)
        const { data: lot } = await supabase
          .from('gemstone_lots')
          .select('id, reserved_quantity')
          .eq('id', alloc.gemstone_lot_id)
          .single();

        if (lot) {
          const newReserved = Math.max(0, Number(lot.reserved_quantity) - qtyToConsume);
          await supabase
            .from('gemstone_lots')
            .update({
              reserved_quantity: newReserved,
              updated_at: new Date().toISOString()
            })
            .eq('id', lot.id);
        }
      }

      // B. Update Child Lot Allocation
      await supabase
        .from('production_material_lot_allocations')
        .update({
          consumed_quantity: newConsumedTotal,
          status: isFullyConsumed ? 'CONSUMED' : 'PARTIALLY_CONSUMED',
          updated_at: new Date().toISOString()
        })
        .eq('id', alloc.id);

      // C. Update Parent Allocation Header
      if (alloc.allocation_id) {
        const { data: parent } = await supabase
          .from('production_material_allocations')
          .select('id, allocated_quantity, consumed_quantity')
          .eq('id', alloc.allocation_id)
          .single();

        if (parent) {
          const pConsumed = Number(parent.consumed_quantity || 0) + qtyToConsume;
          const pFullyConsumed = pConsumed >= Number(parent.allocated_quantity);
          await supabase
            .from('production_material_allocations')
            .update({
              consumed_quantity: pConsumed,
              status: pFullyConsumed ? 'CONSUMED' : 'PARTIAL',
              updated_at: new Date().toISOString()
            })
            .eq('id', parent.id);
        }
      }

      // D. Post Outbound Stock Movement into stock_ledger ('out')
      let stockLedgerId = '00000000-0000-0000-0000-000000000001';

      // Find stock_transaction_types id for 'out'
      const { data: txType } = await supabase
        .from('stock_transaction_types')
        .select('id')
        .eq('code', 'out')
        .single();

      const txTypeId = txType?.id || '00000000-0000-0000-0000-000000000002';

      const { data: ledgerRow, error: lErr } = await supabase
        .from('stock_ledger')
        .insert([
          {
            material_id: materialIdForLedger,
            variant_id: null,
            warehouse_id: order.warehouse_id,
            transaction_type_id: txTypeId,
            quantity: qtyToConsume,
            unit_id: '00000000-0000-0000-0000-000000000003', // standard unit
            running_balance: 0.0,
            reference_id: order.id,
            reference_type: 'PRODUCTION_CONSUMPTION',
            performed_by: params.actorId || null,
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (ledgerRow) {
        stockLedgerId = ledgerRow.id;
      }

      // E. Insert Relational Lineage Bridge into production_material_consumptions
      const { data: consumptionRecord, error: cErr } = await supabase
        .from('production_material_consumptions')
        .insert([
          {
            order_id: params.orderId,
            lot_allocation_id: alloc.id,
            stage_log_id: params.stageLogId || null,
            wip_lot_id: params.wipLotId,
            stock_ledger_id: stockLedgerId,
            consumed_quantity: qtyToConsume,
            unit_of_measure: alloc.unit_of_measure,
            consumed_at: new Date().toISOString(),
            consumed_by: params.actorId || null
          }
        ])
        .select()
        .single();

      if (consumptionRecord) {
        createdConsumptions.push(consumptionRecord);
      }
    }

    // Update order actual_silver_weight if silver was consumed
    if (totalSilverWeightConsumed > 0) {
      await supabase
        .from('production_orders')
        .update({
          actual_silver_weight: totalSilverWeightConsumed,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.orderId);
    }

    return createdConsumptions;
  }
}
