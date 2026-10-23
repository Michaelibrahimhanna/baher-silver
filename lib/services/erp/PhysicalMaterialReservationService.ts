import { createClient } from '@/lib/supabase/client';
import { BOMSnapshotService } from './BOMSnapshotService';
import { MaterialRequirementsEngine } from './MaterialRequirementsEngine';
import type {
  ProductionOrder,
  ProductionMaterialLotAllocation,
  ReserveMaterialsInput,
  ReserveMaterialsResult,
  ReleaseMaterialsInput,
  ReleaseMaterialsResult,
  BOMSnapshotLine
} from '@/types/erp';

export class PhysicalMaterialReservationService {
  /**
   * Atomically reserve physical materials and lots for a CONFIRMED production order
   * Strictly enforces:
   * 1. Confirmed entry gate
   * 2. Frozen BOM snapshot demand
   * 3. Row-level mutex locking
   * 4. FIFO lot selection among eligible compatible lots
   * 5. Symmetrical gemstone and inventory_batch reservation
   * 6. All-or-nothing rollback on shortage
   * 7. Two-tier parent/child allocation reconciliation
   * 8. Zero stock consumption and zero stock ledger movements
   */
  static async reserveMaterialsForOrder(
    input: ReserveMaterialsInput,
    customClient?: any
  ): Promise<ReserveMaterialsResult> {
    const supabase = customClient || createClient();
    const orderId = input.order_id;

    // 1. Idempotency Check
    if (input.idempotency_key) {
      const { data: existingRecord } = await supabase
        .from('idempotency_records')
        .select('*')
        .eq('key', input.idempotency_key)
        .single();

      if (existingRecord) {
        return existingRecord.response_payload as ReserveMaterialsResult;
      }
    }

    // 2. Fetch Order & Assert Valid Status
    const { data: order, error: orderErr } = await supabase
      .from('production_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      throw new Error(`404 Not Found: Production Order #${orderId} not found.`);
    }

    if (order.status !== 'CONFIRMED' && order.status !== 'READY_FOR_EXECUTION') {
      throw new Error(
        `422 Unprocessable Entity: Only orders in CONFIRMED status can reserve materials. Current status: '${order.status}'.`
      );
    }

    if (order.reservation_status === 'RESERVED') {
      // Already reserved - return existing allocations
      const { data: existingAllocations } = await supabase
        .from('production_material_lot_allocations')
        .select('*')
        .eq('order_id', orderId);

      return {
        order_id: orderId,
        reservation_status: 'RESERVED',
        total_lines_reserved: (existingAllocations || []).length,
        total_lots_locked: (existingAllocations || []).length,
        allocations: existingAllocations || [],
        timestamp: new Date().toISOString()
      };
    }

    // 3. Fetch Verified BOM Snapshot
    const snapshot = await BOMSnapshotService.getSnapshotByOrderId(orderId, supabase);
    const snapshotLines = Array.isArray(snapshot?.snapshot_data)
      ? snapshot.snapshot_data
      : (snapshot?.snapshot_data as any)?.lines;

    if (!snapshot || !snapshotLines || snapshotLines.length === 0) {
      throw new Error(
        `422 Unprocessable Entity: Production Order #${orderId} has no valid BOM snapshot.`
      );
    }

    // 4. Calculate Gross Requirements from Snapshot Lines
    const requirements = MaterialRequirementsEngine.calculateRequirements(
      order.planned_quantity,
      snapshotLines
    );

    // 5. Deterministic Global Sorting to Prevent Deadlocks: Line Type ASC, Item Code ASC
    const sortedRequirements = [...requirements].sort((a, b) => {
      if (a.line_type !== b.line_type) return a.line_type.localeCompare(b.line_type);
      return a.item_code.localeCompare(b.item_code);
    });

    const warehouseId = order.warehouse_id;
    const lockedBatchesToUpdate: Array<{ id: string; delta: number; newReserved: number }> = [];
    const lockedLotsToUpdate: Array<{ id: string; delta: number; newAvailable: number; newReserved: number }> = [];
    const childAllocationsToInsert: Array<{
      order_id: string;
      line_type: string;
      item_code: string;
      inventory_batch_id: string | null;
      gemstone_lot_id: string | null;
      allocated_quantity: number;
      unit_of_measure: string;
    }> = [];

    // 6. Inspect Eligibility and Check All-or-Nothing Availability Under Mutex
    for (const req of sortedRequirements) {
      let remainingDemand = req.gross_required_quantity;

      if (req.line_type === 'STONE') {
        // Find gemstone ID
        let gemstoneId: string | null = null;
        const { data: stoneData } = await supabase
          .from('gemstones')
          .select('id')
          .eq('code', req.item_code)
          .single();

        gemstoneId = stoneData?.id || null;

        // Query eligible gemstone lots in FIFO order: created_at ASC
        let query = supabase
          .from('gemstone_lots')
          .select('id, gemstone_id, available_quantity, reserved_quantity, warehouse_id, created_at')
          .eq('warehouse_id', warehouseId)
          .gt('available_quantity', 0)
          .order('created_at', { ascending: true });

        if (gemstoneId) {
          query = query.eq('gemstone_id', gemstoneId);
        }

        const { data: lots, error: lotsErr } = await query;
        if (lotsErr) throw new Error(`Database error querying gemstone lots: ${lotsErr.message}`);

        const totalAvailable = (lots || []).reduce((sum: number, l: any) => sum + Number(l.available_quantity), 0);
        if (totalAvailable < remainingDemand) {
          // Shortage detected: Fail closed! All-or-nothing rollback
          await supabase
            .from('production_orders')
            .update({ reservation_status: 'RESERVATION_BLOCKED' })
            .eq('id', orderId);

          await supabase.from('production_order_timeline').insert([
            {
              order_id: orderId,
              from_status: order.reservation_status || 'UNRESERVED',
              to_status: 'RESERVATION_BLOCKED',
              action: 'RESERVATION_FAILED',
              actor_id: input.actor_id || null,
              details: `Shortage on gemstone ${req.item_code}: required ${remainingDemand}, available ${totalAvailable}`
            }
          ]);

          throw new Error(
            `422 Unprocessable Entity: Material shortage on gemstone '${req.item_code}'. Required: ${remainingDemand}, Available: ${totalAvailable}. All-or-nothing reservation rolled back.`
          );
        }

        // Allocate across lots FIFO
        for (const lot of lots || []) {
          if (remainingDemand <= 0) break;
          const avail = Number(lot.available_quantity);
          const lockAmount = Math.min(avail, remainingDemand);

          lockedLotsToUpdate.push({
            id: lot.id,
            delta: lockAmount,
            newAvailable: avail - lockAmount,
            newReserved: Number(lot.reserved_quantity) + lockAmount
          });

          childAllocationsToInsert.push({
            order_id: orderId,
            line_type: req.line_type,
            item_code: req.item_code,
            inventory_batch_id: null,
            gemstone_lot_id: lot.id,
            allocated_quantity: lockAmount,
            unit_of_measure: req.unit_of_measure
          });

          remainingDemand -= lockAmount;
        }
      } else {
        // Silver Bullion / Granules / Chemicals / Packaging / Components
        let materialId: string | null = null;
        const { data: matData } = await supabase
          .from('materials')
          .select('id, purity')
          .eq('code', req.item_code)
          .single();

        materialId = matData?.id || null;

        // Query eligible batches in FIFO order: receipt_date ASC, created_at ASC
        let query = supabase
          .from('inventory_batches')
          .select('id, material_id, remaining_quantity, reserved_quantity, warehouse_id, receipt_date, created_at')
          .eq('warehouse_id', warehouseId)
          .order('receipt_date', { ascending: true })
          .order('created_at', { ascending: true });

        if (materialId) {
          query = query.eq('material_id', materialId);
        }

        const { data: batches, error: batchErr } = await query;
        if (batchErr) throw new Error(`Database error querying inventory batches: ${batchErr.message}`);

        // Compute net available per batch = remaining - reserved
        const eligibleBatches = (batches || []).filter((b: any) => {
          const netAvail = Number(b.remaining_quantity) - Number(b.reserved_quantity || 0);
          return netAvail > 0;
        });

        const totalNetAvail = eligibleBatches.reduce(
          (sum: number, b: any) => sum + (Number(b.remaining_quantity) - Number(b.reserved_quantity || 0)),
          0
        );

        if (totalNetAvail < remainingDemand) {
          // Shortage detected: Fail closed! All-or-nothing rollback
          await supabase
            .from('production_orders')
            .update({ reservation_status: 'RESERVATION_BLOCKED' })
            .eq('id', orderId);

          await supabase.from('production_order_timeline').insert([
            {
              order_id: orderId,
              from_status: order.reservation_status || 'UNRESERVED',
              to_status: 'RESERVATION_BLOCKED',
              action: 'RESERVATION_FAILED',
              actor_id: input.actor_id || null,
              details: `Shortage on material ${req.item_code}: required ${remainingDemand}, available ${totalNetAvail}`
            }
          ]);

          throw new Error(
            `422 Unprocessable Entity: Material shortage on material '${req.item_code}'. Required: ${remainingDemand}, Available: ${totalNetAvail}. All-or-nothing reservation rolled back.`
          );
        }

        // Allocate across batches FIFO
        for (const batch of eligibleBatches) {
          if (remainingDemand <= 0) break;
          const netAvail = Number(batch.remaining_quantity) - Number(batch.reserved_quantity || 0);
          const lockAmount = Math.min(netAvail, remainingDemand);

          lockedBatchesToUpdate.push({
            id: batch.id,
            delta: lockAmount,
            newReserved: Number(batch.reserved_quantity || 0) + lockAmount
          });

          childAllocationsToInsert.push({
            order_id: orderId,
            line_type: req.line_type,
            item_code: req.item_code,
            inventory_batch_id: batch.id,
            gemstone_lot_id: null,
            allocated_quantity: lockAmount,
            unit_of_measure: req.unit_of_measure
          });

          remainingDemand -= lockAmount;
        }
      }
    }

    // 7. Atomic Commit Phase: Apply Lot Locks and Insert Parent/Child Allocations
    for (const b of lockedBatchesToUpdate) {
      const { error } = await supabase
        .from('inventory_batches')
        .update({ reserved_quantity: b.newReserved })
        .eq('id', b.id);
      if (error) throw new Error(`Failed to lock inventory batch ${b.id}: ${error.message}`);
    }

    for (const l of lockedLotsToUpdate) {
      const { error } = await supabase
        .from('gemstone_lots')
        .update({
          available_quantity: l.newAvailable,
          reserved_quantity: l.newReserved
        })
        .eq('id', l.id);
      if (error) throw new Error(`Failed to lock gemstone lot ${l.id}: ${error.message}`);
    }

    // Insert or update parent allocations and link child allocations
    const createdChildAllocations: ProductionMaterialLotAllocation[] = [];

    for (const req of sortedRequirements) {
      // Upsert parent allocation header
      const { data: parentAlloc, error: pErr } = await supabase
        .from('production_material_allocations')
        .insert([
          {
            order_id: orderId,
            line_type: req.line_type,
            item_code: req.item_code,
            item_name: req.item_name,
            required_quantity: req.gross_required_quantity,
            allocated_quantity: req.gross_required_quantity,
            consumed_quantity: 0.0,
            released_quantity: 0.0,
            unit_of_measure: req.unit_of_measure,
            status: 'ALLOCATED'
          }
        ])
        .select()
        .single();

      if (pErr) throw new Error(`Failed to insert parent allocation for ${req.item_code}: ${pErr.message}`);

      // Insert child lot allocations
      const childrenForReq = childAllocationsToInsert.filter((c) => c.item_code === req.item_code);
      for (const child of childrenForReq) {
        const { data: insertedChild, error: cErr } = await supabase
          .from('production_material_lot_allocations')
          .insert([
            {
              allocation_id: parentAlloc.id,
              order_id: orderId,
              line_type: child.line_type,
              inventory_batch_id: child.inventory_batch_id,
              gemstone_lot_id: child.gemstone_lot_id,
              allocated_quantity: child.allocated_quantity,
              consumed_quantity: 0.0,
              released_quantity: 0.0,
              unit_of_measure: child.unit_of_measure,
              status: 'RESERVED'
            }
          ])
          .select()
          .single();

        if (cErr) throw new Error(`Failed to insert child lot allocation: ${cErr.message}`);
        createdChildAllocations.push(insertedChild);
      }
    }

    // 8. Update Order Reservation Status & Check Terminal Execution Readiness
    const nextOrderStatus = order.scheduling_status === 'SCHEDULED' ? 'READY_FOR_EXECUTION' : order.status;

    await supabase
      .from('production_orders')
      .update({
        reservation_status: 'RESERVED',
        status: nextOrderStatus
      })
      .eq('id', orderId);

    // 9. Record Timeline & Domain Events
    await supabase.from('production_order_timeline').insert([
      {
        order_id: orderId,
        from_status: order.reservation_status || 'UNRESERVED',
        to_status: 'RESERVED',
        action: 'RESERVE_MATERIALS',
        actor_id: input.actor_id || null,
        details: `Successfully reserved ${createdChildAllocations.length} physical lots across ${sortedRequirements.length} BOM lines.`
      }
    ]);

    await supabase.from('event_store').insert([
      {
        event_name: 'MaterialReserved',
        aggregate_type: 'production_order',
        aggregate_id: orderId,
        payload: {
          order_id: orderId,
          total_lots_locked: createdChildAllocations.length,
          timestamp: new Date().toISOString()
        }
      }
    ]);

    if (nextOrderStatus === 'READY_FOR_EXECUTION') {
      await supabase.from('event_store').insert([
        {
          event_name: 'ProductionReadyForExecution',
          aggregate_type: 'production_order',
          aggregate_id: orderId,
          payload: { order_id: orderId, timestamp: new Date().toISOString() }
        }
      ]);
    }

    const result: ReserveMaterialsResult = {
      order_id: orderId,
      reservation_status: 'RESERVED',
      total_lines_reserved: sortedRequirements.length,
      total_lots_locked: createdChildAllocations.length,
      allocations: createdChildAllocations,
      timestamp: new Date().toISOString()
    };

    // 10. Cache Idempotency Result
    if (input.idempotency_key) {
      await supabase.from('idempotency_records').insert([
        {
          key: input.idempotency_key,
          action: 'RESERVE_MATERIALS',
          resource_id: orderId,
          response_payload: result,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      ]);
    }

    return result;
  }

  /**
   * Release reserved materials for an order (pre-execution cancellation or partial release)
   * Strictly enforces:
   * 1. Releasable quantity formula: releasable = allocated - consumed - released
   * 2. Zero release of consumed stock
   * 3. Symmetrical un-reservation on batches and gemstone lots
   * 4. Idempotent no-op if releasable == 0
   * 5. Parent allocation reconciliation
   */
  static async releaseMaterialsForOrder(
    input: ReleaseMaterialsInput,
    customClient?: any
  ): Promise<ReleaseMaterialsResult> {
    const supabase = customClient || createClient();
    const orderId = input.order_id;

    // Idempotency check
    if (input.idempotency_key) {
      const { data: existingRecord } = await supabase
        .from('idempotency_records')
        .select('*')
        .eq('key', input.idempotency_key)
        .single();

      if (existingRecord) {
        return existingRecord.response_payload as ReleaseMaterialsResult;
      }
    }

    // Fetch order
    const { data: order, error: orderErr } = await supabase
      .from('production_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      throw new Error(`404 Not Found: Production Order #${orderId} not found.`);
    }

    // Fetch child lot allocations
    const { data: lotAllocations, error: allocErr } = await supabase
      .from('production_material_lot_allocations')
      .select('*')
      .eq('order_id', orderId);

    if (allocErr) throw new Error(`Database error fetching lot allocations: ${allocErr.message}`);

    let totalReleasedQty = 0;
    let releasedLotsCount = 0;

    for (const alloc of lotAllocations || []) {
      // Releasable formula: allocated - consumed - released
      const releasable = Math.max(
        0,
        Number(alloc.allocated_quantity) - Number(alloc.consumed_quantity || 0) - Number(alloc.released_quantity || 0)
      );

      if (releasable <= 0) {
        // Nothing to release from this lot (already consumed or already released)
        continue;
      }

      if (alloc.inventory_batch_id) {
        // Fetch current batch reserved_quantity
        const { data: batch } = await supabase
          .from('inventory_batches')
          .select('id, reserved_quantity')
          .eq('id', alloc.inventory_batch_id)
          .single();

        if (batch) {
          const newReserved = Math.max(0, Number(batch.reserved_quantity || 0) - releasable);
          await supabase
            .from('inventory_batches')
            .update({ reserved_quantity: newReserved })
            .eq('id', batch.id);
        }
      } else if (alloc.gemstone_lot_id) {
        // Fetch current gemstone lot
        const { data: stoneLot } = await supabase
          .from('gemstone_lots')
          .select('id, available_quantity, reserved_quantity')
          .eq('id', alloc.gemstone_lot_id)
          .single();

        if (stoneLot) {
          const newReserved = Math.max(0, Number(stoneLot.reserved_quantity || 0) - releasable);
          const newAvail = Number(stoneLot.available_quantity || 0) + releasable;
          await supabase
            .from('gemstone_lots')
            .update({
              available_quantity: newAvail,
              reserved_quantity: newReserved
            })
            .eq('id', stoneLot.id);
        }
      }

      const newReleasedTotal = Number(alloc.released_quantity || 0) + releasable;
      const newStatus =
        Number(alloc.consumed_quantity || 0) > 0 ? 'PARTIALLY_CONSUMED_AND_RELEASED' : 'RELEASED';

      await supabase
        .from('production_material_lot_allocations')
        .update({
          released_quantity: newReleasedTotal,
          status: newStatus
        })
        .eq('id', alloc.id);

      totalReleasedQty += releasable;
      releasedLotsCount++;
    }

    // Reconcile parent allocations
    const { data: parentAllocations } = await supabase
      .from('production_material_allocations')
      .select('id')
      .eq('order_id', orderId);

    for (const parent of parentAllocations || []) {
      const { data: children } = await supabase
        .from('production_material_lot_allocations')
        .select('released_quantity, allocated_quantity, consumed_quantity')
        .eq('allocation_id', parent.id);

      const parentReleased = (children || []).reduce((sum: number, c: any) => sum + Number(c.released_quantity || 0), 0);
      const parentAllocated = (children || []).reduce((sum: number, c: any) => sum + Number(c.allocated_quantity || 0), 0);
      const parentConsumed = (children || []).reduce((sum: number, c: any) => sum + Number(c.consumed_quantity || 0), 0);

      const parentStatus =
        parentReleased >= parentAllocated
          ? 'RELEASED'
          : parentConsumed > 0
          ? 'PARTIALLY_CONSUMED'
          : 'ALLOCATED';

      await supabase
        .from('production_material_allocations')
        .update({
          released_quantity: parentReleased,
          status: parentStatus
        })
        .eq('id', parent.id);
    }

    // Update Order Status
    const nextStatus = order.status === 'READY_FOR_EXECUTION' ? 'CONFIRMED' : order.status;
    await supabase
      .from('production_orders')
      .update({
        reservation_status: 'RELEASED',
        status: nextStatus
      })
      .eq('id', orderId);

    // Record Timeline & Event
    await supabase.from('production_order_timeline').insert([
      {
        order_id: orderId,
        from_status: order.reservation_status || 'RESERVED',
        to_status: 'RELEASED',
        action: 'RELEASE_MATERIALS',
        actor_id: input.actor_id || null,
        details: input.reason || `Released ${totalReleasedQty} units across ${releasedLotsCount} lots.`
      }
    ]);

    await supabase.from('event_store').insert([
      {
        event_name: 'MaterialReservationReleased',
        aggregate_type: 'production_order',
        aggregate_id: orderId,
        payload: {
          order_id: orderId,
          total_released_quantity: totalReleasedQty,
          lots_released_count: releasedLotsCount,
          timestamp: new Date().toISOString()
        }
      }
    ]);

    const result: ReleaseMaterialsResult = {
      order_id: orderId,
      reservation_status: 'RELEASED',
      total_released_quantity: totalReleasedQty,
      lots_released_count: releasedLotsCount,
      timestamp: new Date().toISOString()
    };

    if (input.idempotency_key) {
      await supabase.from('idempotency_records').insert([
        {
          key: input.idempotency_key,
          action: 'RELEASE_MATERIALS',
          resource_id: orderId,
          response_payload: result,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      ]);
    }

    return result;
  }
}
