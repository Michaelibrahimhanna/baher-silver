import { AIPricingEstimate } from '@/types/aiProductMachine';

export class AIPricingAssistantService {
  static calculateFormulaPrice(
    silverGramWeight: number | undefined,
    silverSpotRatePerGram: number = 32.5, // 32.5 EGP per gram spot rate
    laborCost: number = 120,
    manufacturingCost: number = 80,
    packagingCost: number = 50,
    profitMarginPercent: number = 35
  ): AIPricingEstimate {
    const isWeightEstimated = silverGramWeight === undefined || silverGramWeight <= 0;
    const weight = isWeightEstimated ? 12.0 : silverGramWeight; // Fallback estimation

    const silverCostTotal = Math.round(weight * silverSpotRatePerGram * 100) / 100;
    const subtotalCost = silverCostTotal + laborCost + manufacturingCost + packagingCost;
    const profitAmount = subtotalCost * (profitMarginPercent / 100);
    const calculatedSellingPrice = Math.round(subtotalCost + profitAmount);

    return {
      silverGramWeight: weight,
      silverSpotRatePerGram,
      silverCostTotal,
      laborCost,
      manufacturingCost,
      packagingCost,
      profitMarginPercent,
      calculatedSellingPrice,
      isWeightEstimated,
    };
  }
}
