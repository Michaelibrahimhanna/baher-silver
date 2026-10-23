import { createClient } from '@/lib/supabase/client';
import type {
  BOMSnapshotLine,
  MaterialRequirementLine,
  ReadinessStatus,
  WarehouseReadinessReport
} from '@/types/erp';
import { MaterialRequirementsEngine } from './MaterialRequirementsEngine';

export class WarehouseReadinessService {
  /**
   * Evaluate warehouse readiness for an order and its BOM snapshot lines.
   * Pure read-only inspection of canonical inventory sources.
   *
   * Zero physical reservation side-effects.
   */
  static async evaluateReadiness(params: {
    orderId: string;
    orderCode: string;
    productId: string;
    variantId: string;
    sku: string;
    plannedQuantity: number;
    warehouseId: string;
    lines: BOMSnapshotLine[];
    supabaseClient?: ReturnType<typeof createClient>;
  }): Promise<WarehouseReadinessReport> {
    const supabase = params.supabaseClient || createClient();

    // 1. Calculate pure gross/net material requirements
    const calculatedLines = MaterialRequirementsEngine.calculateRequirements(
      params.plannedQuantity,
      params.lines
    );

    const evaluatedLines: MaterialRequirementLine[] = [];
    let silverShortage = false;

    for (const req of calculatedLines) {
      let onHand = 0.0;
      let committed = 0.0;
      let netAvailable = 0.0;

      if (req.line_type === 'STONE') {
        // --- CANONICAL GEMSTONE LOT DOMAIN ---
        // gemstone_lots.available_quantity is ALREADY the net available balance!
        // gemstone_lots.reserved_quantity is the active lot-level commitment.
        // On-Hand = available + reserved.
        const { data: lots } = await supabase
          .from('gemstone_lots')
          .select('available_quantity, reserved_quantity')
          .eq('gemstone_id', req.item_id)
          .eq('warehouse_id', params.warehouseId);

        const availableSum = (lots || []).reduce(
          (sum, lot) => sum + Number(lot.available_quantity || 0),
          0
        );
        const reservedSum = (lots || []).reduce(
          (sum, lot) => sum + Number(lot.reserved_quantity || 0),
          0
        );

        netAvailable = parseFloat(availableSum.toFixed(4));
        committed = parseFloat(reservedSum.toFixed(4));
        onHand = parseFloat((availableSum + reservedSum).toFixed(4));
      } else {
        // --- CANONICAL INVENTORY BATCHES DOMAIN (Silver, Chemicals, Components, Packaging) ---
        // inventory_batches.remaining_quantity is the on-hand physical batch stock.
        const { data: batches } = await supabase
          .from('inventory_batches')
          .select('remaining_quantity')
          .eq('material_id', req.item_id)
          .eq('warehouse_id', params.warehouseId);

        onHand = (batches || []).reduce(
          (sum, b) => sum + Number(b.remaining_quantity || 0),
          0
        );
        onHand = parseFloat(onHand.toFixed(4));

        // Active commitments from production_material_allocations across other active orders
        const { data: allocations } = await supabase
          .from('production_material_allocations')
          .select('allocated_quantity, consumed_quantity')
          .eq('item_code', req.item_code)
          .in('status', ['ALLOCATED', 'PARTIAL']);

        committed = (allocations || []).reduce(
          (sum, a) =>
            sum +
            Math.max(0, Number(a.allocated_quantity || 0) - Number(a.consumed_quantity || 0)),
          0
        );
        committed = parseFloat(committed.toFixed(4));

        netAvailable = Math.max(0, parseFloat((onHand - committed).toFixed(4)));
      }

      const shortage = Math.max(0, parseFloat((req.gross_required_quantity - netAvailable).toFixed(4)));
      const isSatisfied = shortage === 0;

      if (!isSatisfied && req.line_type === 'SILVER') {
        silverShortage = true;
      }

      evaluatedLines.push({
        line_number: req.line_number,
        line_type: req.line_type,
        item_id: req.item_id,
        item_code: req.item_code,
        item_name: req.item_name,
        unit_of_measure: req.unit_of_measure,
        base_quantity: req.base_quantity,
        waste_factor_pct: req.waste_factor_pct,
        net_required_quantity: req.net_required_quantity,
        gross_required_quantity: req.gross_required_quantity,
        on_hand_quantity: onHand,
        committed_quantity: committed,
        net_available_quantity: netAvailable,
        shortage_quantity: shortage,
        status: isSatisfied ? 'READY' : 'SHORTAGE'
      });
    }

    // 2. Deterministic overall readiness semantics
    const totalShortagesCount = evaluatedLines.filter((l) => l.status === 'SHORTAGE').length;
    let overallStatus: ReadinessStatus = 'READY';

    if (totalShortagesCount === 0) {
      overallStatus = 'READY';
    } else if (silverShortage) {
      // Primary casting metal is short -> Hard block
      overallStatus = 'NOT_READY';
    } else {
      // Silver is available, but secondary materials (packaging, stones) are short
      overallStatus = 'PARTIALLY_READY';
    }

    return {
      order_id: params.orderId,
      order_code: params.orderCode,
      product_id: params.productId,
      variant_id: params.variantId,
      sku: params.sku,
      planned_quantity: params.plannedQuantity,
      warehouse_id: params.warehouseId,
      evaluated_at: new Date().toISOString(),
      overall_status: overallStatus,
      total_shortages_count: totalShortagesCount,
      critical_silver_available: !silverShortage,
      lines: evaluatedLines
    };
  }
}
