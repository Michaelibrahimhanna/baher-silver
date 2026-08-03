import { AIProductDraft, AIImageAnalysisResult, AIDocumentAnalysisResult } from '@/types/aiProductMachine';
import { calculateProductHealthScore } from '../product-health-score';

export class AIProductBuilderService {
  static generateProductDraft(
    jobId: string,
    imageAnalysis: AIImageAnalysisResult,
    docAnalysis?: AIDocumentAnalysisResult
  ): AIProductDraft {
    const sku = docAnalysis?.extractedSku || `BS-AI-${Date.now().toString().slice(-4)}`;

    const draftWithoutScore = {
      id: `draft-${Date.now()}`,
      jobId,
      name_ar: `خاتم فضة إيطالي عيار 925 مرصع بالزركون الملكي - ${sku}`,
      name_en: `Royal Pharaonic 925 Sterling Silver Ring - ${sku}`,
      short_description_ar: 'خاتم فضة نقي عيار 925 معالج ضد الأكسدة بتصميم فرعوني فاخر.',
      short_description_en: 'Authentic 925 sterling silver ring with anti-tarnish coating and royal finish.',
      description_ar: 'صنع هذا الخاتم من أجود أنوااع الفضة النقية عيار 925 بلمسات يدوية دقيقة ومصنعية عالية الجودة من ورش باهر سيلفر بالشرقية والقاهرة. يأتي مع شهادة ضمان الأصالة مدى الحياة وبصمة QR مشفرة.',
      description_en: 'Handcrafted with precision in Cairo from premium 925 sterling silver featuring royal zircon setting and encrypted QR authenticity certification.',
      meta_title: `خاتم فضة عيار 925 الملكي | باهر سيلفر مصر - ${sku}`,
      meta_description: 'تسوق خاتم الفضة الإيطالي عيار 925 بتصميم ملكي فاخر وضمان شامل مدى الحياة مع توصيل سريع في مصر.',
      slug: `silver-ring-royal-zircon-${sku.toLowerCase()}`,
      keywords: ['فضة 925', 'خاتم فضة', 'مجوهرات مصري', 'باهر سيلفر', 'فضيات عيار 925'],
      category: docAnalysis?.extractedCategory || 'rings',
      collection: 'Heritage Royal Collection',
      specifications: [
        { key_ar: 'عيار الفضة', key_en: 'Silver Purity', value_ar: '925 نقي معتمد', value_en: '925 Certified Pure' },
        { key_ar: 'نوع الأحجار', key_en: 'Stone Type', value_ar: imageAnalysis.stoneType || 'زركون ملكي', value_en: 'Royal Zircon' },
        { key_ar: 'الوزن التقريبي', key_en: 'Estimated Weight', value_ar: `${imageAnalysis.estimatedWeightGram} جرام`, value_en: `${imageAnalysis.estimatedWeightGram}g` },
      ],
      attributes: {
        material: imageAnalysis.material,
        style: imageAnalysis.jewelryStyle,
        gender: imageAnalysis.gender,
      },
      suggestedTags: ['فضة_ملكيه', 'خاتم_عيار_925', 'أناقة_باهر', 'ضمان_مدى_الحياة'],
      mediaPlaceholders: ['https://images.unsplash.com/photo-1605100804763-247f67b3557e'],
    };

    const health = calculateProductHealthScore({
      id: draftWithoutScore.id,
      slug: draftWithoutScore.slug,
      sku,
      barcode: '6291000998877',
      name_ar: draftWithoutScore.name_ar,
      name_en: draftWithoutScore.name_en,
      short_description_ar: draftWithoutScore.short_description_ar,
      short_description_en: draftWithoutScore.short_description_en,
      description_ar: draftWithoutScore.description_ar,
      description_en: draftWithoutScore.description_en,
      meta_title: draftWithoutScore.meta_title,
      meta_description: draftWithoutScore.meta_description,
      keywords: draftWithoutScore.keywords,
      selling_price: docAnalysis?.extractedPrice || 1250,
      current_stock: 10,
      silver_cost: 450,
      labor_cost: 150,
      profit_margin_percent: 30,
      specifications: draftWithoutScore.specifications.map((s, idx) => ({ id: `${idx}`, ...s })),
      variants: [],
      category_name: draftWithoutScore.category,
      collection_name: draftWithoutScore.collection,
      material_name: 'Silver 925',
      primary_image: draftWithoutScore.mediaPlaceholders[0],
      media_urls: draftWithoutScore.mediaPlaceholders,
      status: 'draft',
      visibility: 'public',
      publishing_status: 'immediate',
      featured: false,
      best_seller: false,
      new_arrival: true,
    });

    return {
      ...draftWithoutScore,
      healthScore: health,
    };
  }
}
