import type { BOMSnapshotLine } from '@/types/erp';

export interface CalculatedMaterialRequirement {
  line_number: number;
  line_type: BOMSnapshotLine['line_type'];
  item_id: string;
  item_code: string;
  item_name: string;
  purity?: string | null;
  unit_of_measure: string;
  base_quantity: number;
  waste_factor_pct: number;
  net_required_quantity: number;
  gross_required_quantity: number;
}

export class MaterialRequirementsEngine {
  /**
   * Pure deterministic calculation of gross and net material requirements.
   * Zero AI. Zero heuristics. Zero inventory side-effects.
   *
   * Formulas:
   *   net_required = planned_quantity * base_quantity
   *   gross_required = ROUND(net_required * (1 + waste_factor_pct / 100), 4)
   */
  static calculateRequirements(
    plannedQuantity: number,
    snapshotLines: BOMSnapshotLine[]
  ): CalculatedMaterialRequirement[] {
    if (plannedQuantity <= 0) {
      throw new Error('Planned quantity must be strictly greater than zero.');
    }

    if (!snapshotLines || snapshotLines.length === 0) {
      throw new Error('Snapshot lines must not be empty.');
    }

    return snapshotLines.map((line) => {
      const baseQty = Number(line.base_quantity);
      const wasteFactor = Number(line.waste_factor_pct || 0.0);

      // Decimal-safe multiplication
      const netRequired = parseFloat((plannedQuantity * baseQty).toFixed(4));
      const grossMultiplier = 1.0 + wasteFactor / 100.0;
      const grossRequired = parseFloat((netRequired * grossMultiplier).toFixed(4));

      return {
        line_number: line.line_number,
        line_type: line.line_type,
        item_id: line.item_id,
        item_code: line.item_code,
        item_name: line.item_name,
        purity: line.purity || null,
        unit_of_measure: line.unit_of_measure,
        base_quantity: baseQty,
        waste_factor_pct: wasteFactor,
        net_required_quantity: netRequired,
        gross_required_quantity: grossRequired
      };
    });
  }
}
