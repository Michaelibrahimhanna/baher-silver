import {
  AIPostAnalysisRecommendations,
  AISmartProductInsights,
  AIGranularApprovalState,
  AISmartTaskSuggestion,
  AIEnterpriseReadinessScore,
  AIProductDraft,
} from '@/types/aiProductMachine';

export class AIOperatorEngineService {
  static generateRecommendations(
    category: string = 'rings',
    estimatedWeight: number = 14.5
  ): AIPostAnalysisRecommendations {
    return {
      bestCategory: category,
      bestCollection: 'Heritage Royal Collection',
      bestSellingSeason: 'طوال العام وموسم الأعياد والهدايا (All Season & Festive)',
      targetAudience: 'مقتني الفضة النقية عيار 925 والباحثين عن الفخامة والقطع التراثية المعتمدة',
      similarExistingProductIds: ['p-ring-01', 'p-ring-02'],
      duplicateDetected: false,
      duplicateSkuMatch: undefined,
      bundleOpportunities: [
        'طقم فضة ملوكي فرعوني (خاتم + قلادة فضية مطابقة)',
        'علبة مخملية فاخرة لحفظ الفضة مع محول تلميع مجاني',
      ],
      frequentlyBoughtTogetherIds: ['p-acc-box-01', 'p-acc-cloth-01'],
      crossSellIds: ['p-earring-925'],
      upsellIds: ['p-ring-diamond-zircon'],
      suggestedAccessoryIds: ['acc-cleaner-cloth'],
      inventoryWarnings: estimatedWeight > 25 ? ['تنبيه: وزن القطعة مرتفع نسبياً (أكبر من 25g) — يوصى بفحص رصيد الخام'] : [],
      profitabilityScore: 94,
      expectedDemandScore: 92,
      seoOpportunityScore: 96,
    };
  }

  static generateSmartInsights(
    nameAr: string,
    descriptionAr: string,
    sellingPrice: number,
    _weight: number
  ): AISmartProductInsights {
    const dataPresent = nameAr.length > 5 && descriptionAr.length > 20 && _weight > 0;
    const priceValid = sellingPrice > 200;

    return {
      productCompleteness: dataPresent ? 98 : 70,
      healthScore: 95,
      seoScore: 94,
      salesPotential: priceValid ? 96 : 80,
      luxuryScore: 99,
      photographyQualityScore: 92, // Placeholder
      marketReadiness: 96,
      publishingReadiness: 98,
    };
  }

  static generateSmartTasks(draft: Partial<AIProductDraft>): AISmartTaskSuggestion[] {
    const tasks: AISmartTaskSuggestion[] = [];

    if (!draft.confidenceScores || draft.confidenceScores.weight < 85) {
      tasks.push({
        id: 'task-weight-conf',
        code: 'TASK_LOW_WEIGHT_CONFIDENCE',
        title_ar: 'درجة الثقة في وزن القطعة أقل من 85% — يرجى إعادة الوزن يدوياً',
        title_en: 'Low weight confidence — Please re-weigh manually',
        severity: 'medium',
        field: 'estimatedWeightGram',
        actionType: 'edit_field',
      });
    }

    if (!draft.accessoriesProductIds || draft.accessoriesProductIds.length === 0) {
      tasks.push({
        id: 'task-acc-missing',
        code: 'TASK_NO_ACCESSORIES',
        title_ar: 'لا توجد إكسسوارات مقترحة مرفقة بالمنتج (علبة/قماش تلميع)',
        title_en: 'No accessories attached to product',
        severity: 'low',
        field: 'accessoriesProductIds',
        actionType: 'add_relation',
      });
    }

    return tasks;
  }

  static calculateEnterpriseReadiness(
    insights: AISmartProductInsights,
    tasks: AISmartTaskSuggestion[],
    sellingPrice: number
  ): AIEnterpriseReadinessScore {
    const hasHighTasks = tasks.some((t) => t.severity === 'high');
    const overallScore = Math.round(
      (insights.productCompleteness + insights.healthScore + insights.seoScore + insights.marketReadiness) / 4
    );

    let grade: AIEnterpriseReadinessScore['grade'] = 'EXCELLENT';
    if (overallScore < 90) grade = 'GOOD';
    if (overallScore < 75) grade = 'NEEDS_IMPROVEMENT';
    if (hasHighTasks || sellingPrice <= 0) grade = 'BLOCKED';

    return {
      overallScore,
      grade,
      canPublishImmediately: grade === 'EXCELLENT' || grade === 'GOOD',
      readinessBreakdown: {
        dataCompleteness: insights.productCompleteness,
        financialMargin: sellingPrice > 500 ? 95 : 75,
        seoOptimization: insights.seoScore,
        securityQrBarcode: 100,
      },
    };
  }

  static getInitialGranularApprovalState(): AIGranularApprovalState {
    return {
      productApproved: false,
      pricingApproved: false,
      seoApproved: false,
      categoryApproved: false,
      collectionApproved: false,
      qrApproved: false,
      marketingAssetsApproved: false,
      publishingApproved: false,
    };
  }
}
