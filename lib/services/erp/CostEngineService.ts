import { createClient } from '@/lib/supabase/client';
import type { VariantCost, CostCalculationHistory, BOMItem } from '@/types/erp';
import type { Material } from '@/types/catalog';

const supabase = createClient();

export class CostEngineService {
  static async calculateVariantCost(variantId: string): Promise<CostCalculationHistory> {
    // 1. Fetch active BOM and its items
    const { data: bom } = await supabase
      .from('boms')
      .select('*, items:bom_items(*, material:materials(*))')
      .eq('variant_id', variantId)
      .eq('is_active', true)
      .single();

    // 2. Fetch variant costs config
    const { data: vCost } = await supabase
      .from('variant_costs')
      .select('*')
      .eq('variant_id', variantId)
      .single();

    // Defaults if missing
    const config: VariantCost = vCost || {
      variant_id: variantId,
      labor_cost: 0,
      manufacturing_cost: 0,
      packaging_cost: 0,
      overhead_cost: 0,
      tax_rate: 0,
      discount_rate: 0,
      profit_margin_target: 0
    };

    return {
      ...this.simulateCost(bom?.items || [], config),
      variant_id: variantId,
      bom_id: bom?.id || null,
    } as CostCalculationHistory;
  }

  static simulateCost(items: BOMItem[], config: Partial<VariantCost>): Partial<CostCalculationHistory> {
    let material_cost = 0;
    let waste_cost = 0;

    if (items) {
      items.forEach((item: BOMItem) => {
        const material = item.material as Material | undefined;
        const materialAvgCost = material?.average_cost || 0;
        const itemMatCost = Number(item.quantity) * Number(materialAvgCost);
        const itemWasteCost = itemMatCost * (Number(item.expected_waste) / 100);
        
        material_cost += itemMatCost;
        waste_cost += itemWasteCost;
      });
    }

    const mfgCost = Number(config.labor_cost || 0) + Number(config.manufacturing_cost || 0) + Number(config.packaging_cost || 0) + Number(config.overhead_cost || 0);
    const totalMfgCost = material_cost + waste_cost + mfgCost;
    
    const profit_margin = totalMfgCost * (Number(config.profit_margin_target || 0) / 100);
    const priceBeforeTax = totalMfgCost + profit_margin;
    const tax_amount = priceBeforeTax * (Number(config.tax_rate || 0) / 100);
    const discount_amount = priceBeforeTax * (Number(config.discount_rate || 0) / 100);
    
    const final_selling_price = priceBeforeTax + tax_amount - discount_amount;

    const calculation: Partial<CostCalculationHistory> = {
      material_cost,
      labor_cost: Number(config.labor_cost || 0),
      manufacturing_cost: Number(config.manufacturing_cost || 0),
      packaging_cost: Number(config.packaging_cost || 0),
      waste_cost,
      overhead_cost: Number(config.overhead_cost || 0),
      tax_amount,
      discount_amount,
      profit_margin,
      final_selling_price,
    };

    return calculation;
  }

  static async saveCalculationSnapshot(calculation: Partial<CostCalculationHistory>): Promise<CostCalculationHistory> {
    const { data, error } = await supabase.from('cost_calculation_history').insert(calculation).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  static async updateVariantCostConfig(variantId: string, updates: Partial<VariantCost>): Promise<VariantCost> {
    // Upsert variant_costs
    const { data, error } = await supabase.from('variant_costs').upsert({ variant_id: variantId, ...updates }).select().single();
    if (error) throw new Error(error.message);
    return data;
  }
}



