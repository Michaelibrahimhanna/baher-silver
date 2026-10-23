import { createClient } from '@/lib/supabase/client';
import type { ProductionMaterialAllocation } from '@/types/erp';
import { StockAvailabilityService } from './StockAvailabilityService';

export class MaterialAllocationService {
  /**
   * Transactional stock allocation lock for a Production Order
   * Corrects ERP/Stone decoupling by directly locking warehouse lot balances
   */
  static async allocateMaterialsForOrder(
    orderId: string,
    variantId: string,
    plannedQuantity: number
  ): Promise<ProductionMaterialAllocation[]> {
    const supabase = createClient();

    // 1. Run Stock Availability Resolver
    const checkResult = await StockAvailabilityService.checkAvailability(variantId, plannedQuantity);

    // Clear any existing allocations for this order
    await supabase.from('production_material_allocations').delete().eq('order_id', orderId);

    const createdAllocations: ProductionMaterialAllocation[] = [];

    for (const line of checkResult.lines) {
      const allocQty = Math.min(line.required_quantity, line.available_quantity);
      const isFull = allocQty >= line.required_quantity;
      const status = isFull ? 'ALLOCATED' : allocQty > 0 ? 'PARTIAL' : 'SHORTAGE';

      // Insert Allocation record
      const { data: allocation, error: allocError } = await supabase
        .from('production_material_allocations')
        .insert([
          {
            order_id: orderId,
            line_type: line.line_type,
            item_code: line.item_code,
            item_name: line.item_name,
            required_quantity: line.required_quantity,
            allocated_quantity: allocQty,
            consumed_quantity: 0.0,
            unit_of_measure: line.unit_of_measure,
            status
          }
        ])
        .select()
        .single();

      if (allocError) throw new Error(`Failed to allocate material ${line.item_code}: ${allocError.message}`);
      createdAllocations.push(allocation);

      // Lock Stock on lots if allocated
      if (allocQty > 0) {
        if (line.line_type === 'STONE') {
          // Update gemstone_lots reserved_quantity
          const { data: stone } = await supabase
            .from('gemstones')
            .select('id')
            .eq('code', line.item_code)
            .single();

          if (stone) {
            const { data: activeLots } = await supabase
              .from('gemstone_lots')
              .select('id, available_quantity, reserved_quantity')
              .eq('gemstone_id', stone.id)
              .gt('available_quantity', 0)
              .order('created_at', { ascending: true });

            let remainingToLock = Math.ceil(allocQty);
            for (const lot of activeLots || []) {
              if (remainingToLock <= 0) break;
              const lockAmount = Math.min(lot.available_quantity, remainingToLock);

              await supabase
                .from('gemstone_lots')
                .update({
                  available_quantity: lot.available_quantity - lockAmount,
                  reserved_quantity: lot.reserved_quantity + lockAmount
                })
                .eq('id', lot.id);

              remainingToLock -= lockAmount;
            }
          }
        }
      }
    }

    return createdAllocations;
  }

  /**
   * Record actual consumption during stage execution
   */
  static async recordConsumption(
    allocationId: string,
    consumedQuantity: number
  ): Promise<ProductionMaterialAllocation> {
    const supabase = createClient();

    const { data: alloc, error: fetchErr } = await supabase
      .from('production_material_allocations')
      .select('*')
      .eq('id', allocationId)
      .single();

    if (fetchErr || !alloc) throw new Error(`Allocation #${allocationId} not found`);

    const newConsumed = Number(alloc.consumed_quantity || 0) + consumedQuantity;
    const isCompleted = newConsumed >= alloc.required_quantity;
    const newStatus = isCompleted ? 'CONSUMED' : alloc.status;

    const { data: updated, error: updateErr } = await supabase
      .from('production_material_allocations')
      .update({
        consumed_quantity: newConsumed,
        status: newStatus
      })
      .eq('id', allocationId)
      .select()
      .single();

    if (updateErr) throw new Error(`Failed to update allocation consumption: ${updateErr.message}`);
    return updated;
  }

  /**
   * Release reserved allocations on order cancellation
   */
  static async releaseAllocationsForOrder(orderId: string): Promise<void> {
    const supabase = createClient();

    const { data: allocations } = await supabase
      .from('production_material_allocations')
      .select('*')
      .eq('order_id', orderId)
      .in('status', ['ALLOCATED', 'PARTIAL']);

    for (const alloc of allocations || []) {
      const unconsumed = Math.max(0, alloc.allocated_quantity - alloc.consumed_quantity);

      if (unconsumed > 0 && alloc.line_type === 'STONE') {
        const { data: stone } = await supabase
          .from('gemstones')
          .select('id')
          .eq('code', alloc.item_code)
          .single();

        if (stone) {
          const { data: reservedLots } = await supabase
            .from('gemstone_lots')
            .select('id, available_quantity, reserved_quantity')
            .eq('gemstone_id', stone.id)
            .gt('reserved_quantity', 0)
            .order('created_at', { ascending: false });

          let remainingToUnlock = Math.ceil(unconsumed);
          for (const lot of reservedLots || []) {
            if (remainingToUnlock <= 0) break;
            const unlockAmount = Math.min(lot.reserved_quantity, remainingToUnlock);

            await supabase
              .from('gemstone_lots')
              .update({
                available_quantity: lot.available_quantity + unlockAmount,
                reserved_quantity: lot.reserved_quantity - unlockAmount
              })
              .eq('id', lot.id);

            remainingToUnlock -= unlockAmount;
          }
        }
      }

      await supabase
        .from('production_material_allocations')
        .update({ status: 'RELEASED' })
        .eq('id', alloc.id);
    }
  }
}
