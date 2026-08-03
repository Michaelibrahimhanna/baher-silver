import type { PricingFormula } from '@/types/catalog';

export interface FormulaVariables {
  silverWeightGrams: number;
  liveSilverSpotPerGram: number;
  purityValue: number; // e.g. 0.925
  stoneCost: number;
  manufacturingCost: number;
  packagingCost: number;
  laborCost: number;
  overheadCost: number;
  profitMarginPercent: number;
}

export interface PricingCalculationResult {
  silverMaterialCost: number;
  totalProductionCost: number;
  profitAmount: number;
  calculatedSellingPrice: number;
  suggestedSalePrice: number;
  breakdown: {
    silver: number;
    stone: number;
    manufacturing: number;
    packaging: number;
    labor: number;
    overhead: number;
    marginAmount: number;
  };
}

export const DEFAULT_SILVER_FORMULA: PricingFormula = {
  id: 'form-standard-silver',
  name_ar: 'معادلة تسعير الفضة القياسية',
  name_en: 'Standard Silver Pricing Formula',
  expression: '(silverWeight * liveSilverSpot * purityValue) + stoneCost + manufacturingCost + laborCost + packagingCost + overheadCost + margin',
  is_default: true,
  variables: {
    silver_weight: 0,
    live_silver_spot: 45.0, // EGP per gram spot price
    purity: 0.925,
    stone_cost: 0,
    manufacturing: 0,
    labor: 0,
    packaging: 0,
    overhead: 0,
    profit_margin_percent: 45.0,
  }
};

/**
 * Configurable Formula Engine
 * Computes live product cost & selling price based on dynamic variables.
 */
export function evaluatePricingFormula(
  vars: Partial<FormulaVariables>
): PricingCalculationResult {
  const silverWeight = Number(vars.silverWeightGrams) || 0;
  const spotPrice = Number(vars.liveSilverSpotPerGram) || 45.0; // EGP spot per gram
  const purity = Number(vars.purityValue) || 0.925;
  
  const stoneCost = Number(vars.stoneCost) || 0;
  const manufacturingCost = Number(vars.manufacturingCost) || 0;
  const packagingCost = Number(vars.packagingCost) || 0;
  const laborCost = Number(vars.laborCost) || 0;
  const overheadCost = Number(vars.overheadCost) || 0;
  const profitMarginPercent = Number(vars.profitMarginPercent) || 40.0;

  // 1. Calculate pure silver material cost
  const silverMaterialCost = Math.round((silverWeight * spotPrice * purity) * 100) / 100;

  // 2. Sum total production & operational cost
  const totalProductionCost = Math.round((silverMaterialCost + stoneCost + manufacturingCost + packagingCost + laborCost + overheadCost) * 100) / 100;

  // 3. Profit margin addition
  const profitAmount = Math.round((totalProductionCost * (profitMarginPercent / 100)) * 100) / 100;

  // 4. Final selling price
  const calculatedSellingPrice = Math.ceil(totalProductionCost + profitAmount);
  const suggestedSalePrice = Math.ceil(calculatedSellingPrice * 0.9); // 10% promotional suggestion

  return {
    silverMaterialCost,
    totalProductionCost,
    profitAmount,
    calculatedSellingPrice,
    suggestedSalePrice,
    breakdown: {
      silver: silverMaterialCost,
      stone: stoneCost,
      manufacturing: manufacturingCost,
      packaging: packagingCost,
      labor: laborCost,
      overhead: overheadCost,
      marginAmount: profitAmount,
    }
  };
}
