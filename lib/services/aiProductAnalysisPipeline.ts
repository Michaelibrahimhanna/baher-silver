import { AIImageAnalysisResult, AIDocumentAnalysisResult } from '@/types/aiProductMachine';

export class AIProductAnalysisPipelineService {
  static analyzeImagePlaceholder(imageFileName: string): AIImageAnalysisResult {
    const fn = imageFileName.toLowerCase();

    let productType = 'خاتم فضة (Silver Ring)';
    if (fn.includes('ear') || fn.includes('قطرة')) productType = 'أقراط فضة (Silver Earrings)';
    if (fn.includes('nec') || fn.includes('قلادة')) productType = 'قلادة فضية (Silver Necklace)';

    return {
      productType,
      category: 'rings',
      material: 'فضة نقية عيار 925 (925 Sterling Silver)',
      purity: 'عيار 925 معتمد (925 Pure Certified)',
      stones: 'زركون نقي ممتاز (Cubic Zirconia)',
      stoneColors: 'أبيض ملكي (Crystal White)',
      finish: 'تلميع مصنع ضد الأكسدة (Anti-Tarnish Polish)',
      jewelryStyle: 'تراثي فرعوني ملكي (Pharaonic Royal Heritage)',
      gender: 'women',
      estimatedWeightGram: 14.5,
      productOrientation: 'front',
      confidenceScores: {
        productType: 97,
        category: 97,
        material: 99,
        purity: 98,
        stones: 92,
        weight: 81,
        description: 93,
        pricing: 90,
        seo: 95,
      },
    };
  }

  static analyzeDocumentOcrPlaceholder(_documentFileName: string): AIDocumentAnalysisResult {
    const fn = _documentFileName.toLowerCase();
    return {
      extractedSku: `BS-AI-${fn ? 'DOC' : '999'}-${Math.floor(100 + Math.random() * 900)}`,
      extractedWeightGram: 14.5,
      extractedPrice: 1250,
      extractedNotes: 'تم الاستخراج بنجاح من كشف المورد خان الخليلي (OCR Contract Placeholder).',
      extractedSupplier: 'مورد خان الخليلي للصياغة',
      extractedCategory: 'rings',
      confidenceScore: 0.89,
    };
  }
}
