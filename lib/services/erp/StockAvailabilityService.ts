import { createClient } from '@/lib/supabase/client';
import type { StockAvailabilityResult, StockAvailabilityLine, BOM, BOMItem } from '@/types/erp';
import { BOMService } from './BOMService';

export class StockAvailabilityService {
  /**
   * Determine exact material requirements and compare against current warehouse availability
   * Answers: "عايزين ننتج X قطعة، محتاجين إيه وهل متوفر؟"
   */
  static async checkAvailability(
    variantId: string,
    plannedQuantity: number
  ): Promise<StockAvailabilityResult> {
    const supabase = createClient();

    if (plannedQuantity <= 0) {
      throw new Error('Planned quantity must be greater than zero.');
    }

    // 1. Fetch active BOM for the variant
    const bom = await BOMService.getActiveBOMForVariant(variantId);
    if (!bom || !bom.items || bom.items.length === 0) {
      throw new Error(`No active Bill of Materials (BOM) found for variant #${variantId}`);
    }

    const lines: StockAvailabilityLine[] = [];

    for (const item of bom.items) {
      const wasteFactor = item.waste_factor_pct || item.expected_waste || 0.0;
      const requiredQty = item.quantity * plannedQuantity * (1 + wasteFactor / 100.0);

      let itemCode = 'UNKNOWN';
      let itemName = 'Unknown Material';
      let lineType = item.line_type || 'raw_material';
      let onHandQty = 0;
      let uom = item.unit_of_measure || 'g';

      if (item.gemstone_id) {
        // --- Gemstone Line ---
        lineType = 'STONE';
        uom = item.unit_of_measure || 'piece';

        const { data: stone } = await supabase
          .from('gemstones')
          .select('code, name_ar, quantity')
          .eq('id', item.gemstone_id)
          .single();

        if (stone) {
          itemCode = stone.code;
          itemName = stone.name_ar;
          onHandQty = Number(stone.quantity || 0);
        }
      } else if (item.material_id) {
        // --- Raw Material / Silver / Chemical / Packaging Line ---
        const { data: material } = await supabase
          .from('materials')
          .select('name, purity, type, unit')
          .eq('id', item.material_id)
          .single();

        if (material) {
          itemCode = material.name;
          itemName = `${material.name} ${material.purity || ''}`.trim();
          lineType = material.type === 'raw_material' ? 'SILVER' : material.type.toUpperCase();
          uom = material.unit || 'g';

          // Query stock from inventory_batches
          const { data: batches } = await supabase
            .from('inventory_batches')
            .select('remaining_quantity')
            .eq('material_id', item.material_id);

          onHandQty = (batches || []).reduce((sum, b) => sum + Number(b.remaining_quantity || 0), 0);
        }
      }

      // 2. Query currently active commitments / allocations across active production orders
      const { data: activeAllocations } = await supabase
        .from('production_material_allocations')
        .select('allocated_quantity, consumed_quantity')
        .eq('item_code', itemCode)
        .in('status', ['ALLOCATED', 'PARTIAL']);

      const committedQty = (activeAllocations || []).reduce(
        (sum, a) => sum + Math.max(0, Number(a.allocated_quantity || 0) - Number(a.consumed_quantity || 0)),
        0
      );

      const netAvailableQty = Math.max(0, onHandQty - committedQty);
      const isSatisfied = netAvailableQty >= requiredQty;
      const shortageQty = isSatisfied ? 0 : parseFloat((requiredQty - netAvailableQty).toFixed(4));

      lines.push({
        line_type: lineType,
        item_code: itemCode,
        item_name: itemName,
        required_quantity: parseFloat(requiredQty.toFixed(4)),
        on_hand_quantity: parseFloat(onHandQty.toFixed(4)),
        committed_quantity: parseFloat(committedQty.toFixed(4)),
        available_quantity: parseFloat(netAvailableQty.toFixed(4)),
        shortage_quantity: shortageQty,
        unit_of_measure: uom,
        is_satisfied: isSatisfied
      });
    }

    const isFullyAvailable = lines.every((l) => l.is_satisfied);
    const shortagesCount = lines.filter((l) => !l.is_satisfied).length;

    return {
      product_id: bom.variant_id,
      variant_id: variantId,
      planned_quantity: plannedQuantity,
      is_fully_available: isFullyAvailable,
      total_shortages_count: shortagesCount,
      lines
    };
  }
}
