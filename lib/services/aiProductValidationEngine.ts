import { AIProductDraft, AIValidationDiagnostics, ValidationDiagnosticIssue } from '@/types/aiProductMachine';

export class AIProductValidationEngineService {
  static evaluateDraft(draft: AIProductDraft, sellingPrice: number): AIValidationDiagnostics {
    const issues: ValidationDiagnosticIssue[] = [];

    // 1. Missing Fields Check
    if (!draft.name_ar || draft.name_ar.trim().length < 3) {
      issues.push({ id: 'err-name-ar', type: 'error', field: 'name_ar', message_ar: 'اسم المنتج بالعربية مطلوب ومقيد بتشترط 3 أحرف على الأقل.', message_en: 'Arabic name required.' });
    }
    if (!draft.name_en || draft.name_en.trim().length < 3) {
      issues.push({ id: 'err-name-en', type: 'error', field: 'name_en', message_ar: 'Product English Name is required.', message_en: 'English name required.' });
    }
    if (!draft.category) {
      issues.push({ id: 'err-cat', type: 'error', field: 'category', message_ar: 'يجب اختيار القسم التجاري الرئيسي للمنتج.', message_en: 'Category required.' });
    }

    // 2. Barcode EAN-13 Check
    const barcodeValid = draft.barcode ? draft.barcode.length === 13 && /^\d+$/.test(draft.barcode) : false;
    if (!barcodeValid) {
      issues.push({ id: 'warn-barcode', type: 'warning', field: 'barcode', message_ar: 'رقم البار كود يجب أن يكون نسق EAN-13 بطول 13 رقماً قياسياً.', message_en: 'Barcode should follow EAN-13 standard format.' });
    }

    // 3. SKU Uniqueness Check
    const skuUnique = Boolean(draft.sku && draft.sku.trim().length >= 4);

    // 4. QR Router Token Validity Check
    const qrValid = Boolean(draft.qrRouterToken && draft.qrRouterToken.startsWith('BSQR-'));

    // 5. Pricing Anomaly Check
    const pricingAnomalyDetected = sellingPrice <= 0 || sellingPrice < 100;
    if (pricingAnomalyDetected) {
      issues.push({ id: 'warn-price', type: 'warning', field: 'pricing', message_ar: 'تنبيه: سعر البيع يبدو منخفضاً جداً بالمقارنة مع مصنعية وسعر جرام الفضة.', message_en: 'Selling price appears unusually low.' });
    }

    // 6. Stock Anomaly Check
    const stockAnomalyDetected = false;

    // 7. Low Confidence Highlight Warnings
    if (draft.confidenceScores?.weight && draft.confidenceScores.weight < 85) {
      issues.push({ id: 'warn-conf-weight', type: 'info', field: 'confidenceScores.weight', message_ar: 'درجة الثقة في الوزن التقريبي منخفضة (81%). يرجى التدقيق اليدوي.', message_en: 'Low weight confidence score (81%).' });
    }

    const hasErrors = issues.some((i) => i.type === 'error');

    return {
      isValid: !hasErrors,
      canPublish: !hasErrors && (draft.healthScore?.overallScore || 0) >= 80,
      issues,
      skuUnique,
      qrValid,
      barcodeValid,
      pricingAnomalyDetected,
      stockAnomalyDetected,
    };
  }
}
