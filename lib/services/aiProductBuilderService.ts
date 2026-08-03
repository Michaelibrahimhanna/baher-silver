import { AIProductDraft, AIImageAnalysisResult, AIDocumentAnalysisResult, AIPromptTone } from '@/types/aiProductMachine';
import { calculateProductHealthScore } from '../product-health-score';

export class AIProductBuilderService {
  static generateProductDraft(
    jobId: string,
    imageAnalysis: AIImageAnalysisResult,
    docAnalysis?: AIDocumentAnalysisResult,
    tone: AIPromptTone = 'luxury'
  ): AIProductDraft {
    const sku = docAnalysis?.extractedSku || `BS-AI-${Date.now().toString().slice(-4)}`;
    const barcode = '6291000998877';
    const qrRouterToken = `BSQR-AI-${Date.now().toString(36).toUpperCase()}`;

    const isLuxury = tone === 'luxury';

    const draftWithoutScore = {
      id: `draft-${Date.now()}`,
      jobId,
      sku,
      barcode,
      qrRouterToken,
      name_ar: isLuxury
        ? `خاتم فضة إيطالي عيار 925 مرصع بالزركون الملكي - ${sku}`
        : `خاتم فضة عيار 925 مع حجر الزركون - ${sku}`,
      name_en: `Royal Pharaonic 925 Sterling Silver Ring - ${sku}`,
      short_description_ar: 'خاتم فضة نقي عيار 925 معالج ضد الأكسدة بتصميم فرعوني فاخر.',
      short_description_en: 'Authentic 925 sterling silver ring with anti-tarnish coating and royal finish.',
      description_ar: 'صُنع هذا الخاتم الملوكي الفاخر يدويًا من أجود أنواع الفضة الإيطالية عيار 925 برعاية باهر سيلفر بالشرقية والقاهرة. يأتي مع شهادة ضمان أصالة رقمية مدى الحياة وبصمة QR مشفرة.',
      description_en: 'Handcrafted with royal precision in Cairo from premium 925 sterling silver featuring zircon setting and encrypted QR authenticity certification.',
      meta_title: `خاتم فضة عيار 925 الملكي | باهر سيلفر مصر - ${sku}`,
      meta_description: 'تسوق أفضل خاتم فضة عيار 925 بتصميم ملكي فاخر وضمان شامل مدى الحياة مع توصيل سريع في جميع المحافظات.',
      slug: `silver-ring-royal-zircon-${sku.toLowerCase()}`,
      keywords: ['فضة 925', 'خاتم فضة', 'مجوهرات مصرية', 'باهر سيلفر', 'فضيات عيار 925'],
      category: docAnalysis?.extractedCategory || 'rings',
      collection: 'Heritage Royal Collection',
      specifications: [
        { key_ar: 'عيار الفضة', key_en: 'Silver Purity', value_ar: '925 نقي معتمد', value_en: '925 Certified Pure' },
        { key_ar: 'نوع الأحجار', key_en: 'Stone Type', value_ar: imageAnalysis.stones || 'زركون ملكي', value_en: 'Royal Zircon' },
        { key_ar: 'الوزن التقريبي', key_en: 'Estimated Weight', value_ar: `${imageAnalysis.estimatedWeightGram} جرام`, value_en: `${imageAnalysis.estimatedWeightGram}g` },
        { key_ar: 'اللمسة النهائية', key_en: 'Finish', value_ar: imageAnalysis.finish, value_en: 'Anti-Tarnish Rhodium' },
      ],
      features_ar: [
        'فضة نقية عيار 925 معالجة بطبقة روديوم حماية ضد التغير والأكسدة.',
        'تصميم فرعوني ملكي حصري مدمج بشرائح الزركون النقي.',
        'شهادة أصالة مشفرة برمز QR ديناميكي غير قابل للتزوير.',
        'ضمان باهر سيلفر مدى الحياة لخدمات التلميع وإعادة الهيكلة.',
      ],
      features_en: [
        'Authentic 925 Sterling Silver coated with anti-tarnish rhodium layer.',
        'Exclusive royal pharaonic design with premium cubic zirconia.',
        'Encrypted dynamic QR certification of authenticity.',
        'Lifetime warranty for polishing and maintenance.',
      ],
      care_instructions_ar: 'يُحفظ في علبة باهر الفاخرة المرفقة. يُفضل تجنب ملامسة العطور المركزة والمواد الكيميائية المباشرة. يُنصح بالتلميع الفصلي باستخدام قطعة القماش المرفقة.',
      care_instructions_en: 'Store in your luxury Baher Silver box. Avoid direct contact with heavy perfumes or chemicals. Gently polish with the included velvet cloth.',
      attributes: {
        material: imageAnalysis.material,
        purity: imageAnalysis.purity,
        style: imageAnalysis.jewelryStyle,
        gender: imageAnalysis.gender,
      },
      suggestedTags: ['فضة_ملكية', 'خاتم_عيار_925', 'أناقة_باهر', 'ضمان_مدى_الحياة', 'هدايا_فاخرة'],
      relatedProductIds: ['p1', 'p2'],
      matchingProductIds: ['p3'],
      accessoriesProductIds: ['acc-box-1'],
      socialCaptionAr: '✨ الأناقة لا تنتهي! اكتشفي خاتم الفضة الإيطالي عيار 925 بتصميمه الملكي من باهر سيلفر. 👑 تسوقي الآن واستمتعي بضمان مدى الحياة! #باهر_سيلفر #فضة925',
      metaAdsCopyAr: 'هل تبحثين عن قطعة مجوهرات فريدة؟ 💎 خاتم الفضة الإيطالي عيار 925 متوفر الآن بخصم لفترة محدودة مع شحن مجاني وضمان مدى الحياة. اضغطي للطلب الآن!',
      confidenceScores: imageAnalysis.confidenceScores,
      mediaPlaceholders: ['https://images.unsplash.com/photo-1605100804763-247f67b3557e'],
    };

    const health = calculateProductHealthScore({
      id: draftWithoutScore.id,
      slug: draftWithoutScore.slug,
      sku,
      barcode,
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
