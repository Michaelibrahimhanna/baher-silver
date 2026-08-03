import { Product, HealthScoreResult, HealthScoreBreakdown } from '@/types/catalog';

/**
 * AI Product Health Score Evaluator
 * Evaluates 7 core dimensions: SEO, Pricing, Description, Specifications, Variants, Completeness, Media.
 */
export function calculateProductHealthScore(product: Product): HealthScoreResult {
  const recommendations: string[] = [];

  // 1. SEO Evaluation (Max 15)
  let seo = 0;
  if (product.meta_title && product.meta_title.length >= 10) {
    seo += 5;
  } else {
    recommendations.push('أضف عنوان SEO مناسب (Meta Title) لا يقل عن 10 أحرف.');
  }

  if (product.meta_description && product.meta_description.length >= 20) {
    seo += 5;
  } else {
    recommendations.push('أضف وصف SEO محسن (Meta Description) لا يقل عن 20 حرفاً.');
  }

  if (product.keywords && product.keywords.length > 0) {
    seo += 5;
  } else {
    recommendations.push('أضف كلمات مفتاحية (SEO Keywords) استهدافية لمنتج الفضة.');
  }

  // 2. Pricing Evaluation (Max 20)
  let pricing = 0;
  if (product.selling_price && product.selling_price > 0) {
    pricing += 5;
  } else {
    recommendations.push('تأكد من تحديد سعر البيع النهائي للمنتج.');
  }

  const hasCostBreakdown =
    (product.silver_cost || 0) > 0 ||
    (product.labor_cost || 0) > 0 ||
    (product.manufacturing_cost || 0) > 0 ||
    (product.purchase_cost || 0) > 0;
  if (hasCostBreakdown) {
    pricing += 10;
  } else {
    recommendations.push('قم بتعريف تكاليف المصنعية والفضة (Formula Costing) لحساب صافي الربح بشكل دقيق.');
  }

  if ((product.profit_margin_percent || 0) > 0) {
    pricing += 5;
  } else {
    recommendations.push('تحديد هامش الربح المستهدف (Profit Margin %).');
  }

  // 3. Description & Text Quality (Max 20)
  let description = 0;
  if (product.name_ar && product.name_en) {
    description += 5;
  } else {
    recommendations.push('تأكد من كتابة اسم المنتج باللغتين العربية والإنجليزية.');
  }

  if (product.short_description_ar && product.short_description_en) {
    description += 5;
  } else {
    recommendations.push('أضف وصفاً قصيراً موجزاً باللغتين العربية والإنجليزية.');
  }

  if (product.description_ar && product.description_en) {
    description += 10;
  } else if (product.description_ar || product.description_en) {
    description += 5;
    recommendations.push('استكمل الوصف التفصيلي باللغة المتبقية.');
  } else {
    recommendations.push('أكتب الوصف التفصيلي الشامل للمنتج.');
  }

  // 4. Specifications Evaluation (Max 15)
  let specifications = 0;
  const specCount = product.specifications?.length || 0;
  if (specCount >= 2) {
    specifications = 15;
  } else if (specCount === 1) {
    specifications = 8;
    recommendations.push('أضف مواصفات إضافية (مثل المقاس، التثبيت، الوزن) لتحسين ثقة العميل.');
  } else {
    recommendations.push('قم بإضافة مواصفات المنتج الفنية (Product Specifications).');
  }

  // 5. Variants Matrix Evaluation (Max 15)
  let variants = 0;
  const variantsCount = product.variants?.length || 0;
  if (variantsCount > 0) {
    variants += 5;
    const allHaveSkuAndPrice = product.variants?.every(
      (v) => v.sku && v.regular_price > 0
    );
    if (allHaveSkuAndPrice) {
      variants += 10;
    } else {
      recommendations.push('قم باستكمال بيانات SKU والأسعار لكافة المتغيرات (Variants).');
    }
  } else {
    // If simple product with valid SKU and stock, award partial points
    if (product.sku && product.current_stock !== undefined) {
      variants = 10;
    } else {
      recommendations.push('قم بإنشاء المتغيرات أو ضبط SKU والمخزون المباشر للمنتج.');
    }
  }

  // 6. Completeness & Master Data (Max 10)
  let completeness = 0;
  if (product.category_name || product.category_id) completeness += 2.5;
  else recommendations.push('ربط المنتج بالتصنيف المناسب (Category).');

  if (product.collection_name || product.collection_id) completeness += 2.5;
  if (product.material_name || product.material_id) completeness += 2.5;
  if (product.sku && product.barcode) completeness += 2.5;
  else recommendations.push('توليد رمز SKU ورمز الباركود البصري للمنتج.');

  // 7. Media & Placeholders (Max 5)
  let media = 0;
  if (product.primary_image && product.primary_image.length > 5) {
    media += 3;
  } else {
    recommendations.push('رفع الصورة الرئيسية للمنتج (Primary Image).');
  }

  if (product.media_urls && product.media_urls.length > 0) {
    media += 2;
  } else {
    recommendations.push('إضافة معرض صور ميديا إضافي للمنتج.');
  }

  const breakdown: HealthScoreBreakdown = {
    seo,
    pricing,
    description,
    specifications,
    variants,
    completeness,
    media,
  };

  const overallScore = Math.min(
    100,
    Math.round(seo + pricing + description + specifications + variants + completeness + media)
  );

  let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
  if (overallScore >= 90) grade = 'A+';
  else if (overallScore >= 80) grade = 'A';
  else if (overallScore >= 70) grade = 'B';
  else if (overallScore >= 60) grade = 'C';
  else if (overallScore >= 50) grade = 'D';

  return {
    overallScore,
    grade,
    breakdown,
    recommendations,
  };
}
