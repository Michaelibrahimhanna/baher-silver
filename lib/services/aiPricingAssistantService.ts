import { AIPricingEstimate } from '@/types/aiProductMachine';

export class AIPricingAssistantService {
  static calculateFormulaPrice(
    silverGramWeight: number | undefined,
    silverSpotRatePerGram: number = 32.5, // 32.5 EGP per gram spot rate
    laborCost: number = 120,
    manufacturingCost: number = 80,
    packagingCost: number = 50,
    overheadCost: number = 40,
    profitMarginPercent: number = 35
  ): AIPricingEstimate {
    const isWeightEstimated = silverGramWeight === undefined || silverGramWeight <= 0;
    const weight = isWeightEstimated ? 12.0 : silverGramWeight; // Fallback estimation

    const silverCostTotal = Math.round(weight * silverSpotRatePerGram * 100) / 100;
    const totalCostBase = silverCostTotal + laborCost + manufacturingCost + packagingCost + overheadCost;
    const profitAmount = totalCostBase * (profitMarginPercent / 100);

    const calculatedSellingPrice = Math.round(totalCostBase + profitAmount);
    const suggestedWholesalePrice = Math.round(totalCostBase * 1.15); // 15% wholesale margin
    const suggestedDiscountPrice = Math.round(calculatedSellingPrice * 0.90); // 10% promotional discount

    return {
      silverGramWeight: weight,
      silverSpotRatePerGram,
      silverCostTotal,
      laborCost,
      manufacturingCost,
      packagingCost,
      overheadCost,
      profitMarginPercent,
      calculatedSellingPrice,
      suggestedWholesalePrice,
      suggestedDiscountPrice,
      isWeightEstimated,
      confidenceScore: isWeightEstimated ? 81 : 96,
    };
  }
}
