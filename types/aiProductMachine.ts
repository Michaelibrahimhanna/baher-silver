import { HealthScoreResult } from './catalog';

export type IntakeFileType = 'image' | 'zip' | 'pdf' | 'excel' | 'csv';
export type AIPromptTone = 'luxury' | 'standard' | 'seo_focused' | 'storytelling';

export interface IntakeFileItem {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: IntakeFileType;
  previewUrl?: string;
  status: 'queued' | 'analyzing' | 'completed' | 'failed';
  uploadedAt: string;
}

export type QueueJobStatus = 'queued' | 'processing' | 'paused' | 'ready_for_review' | 'approved' | 'rejected' | 'failed';

export interface ProductIntakeJob {
  id: string;
  batchName: string;
  batchSize: number;
  files: IntakeFileItem[];
  status: QueueJobStatus;
  progressPercent: number;
  created_at: string;
  paused_at?: string;
}

export interface AIConfidenceScores {
  productType: number; // e.g. 97
  category: number; // e.g. 97
  material: number; // e.g. 99
  purity: number; // e.g. 98
  stones: number; // e.g. 92
  weight: number; // e.g. 81
  description: number; // e.g. 93
  pricing: number; // e.g. 90
  seo: number; // e.g. 95
}

export interface AIImageAnalysisResult {
  productType: string;
  category: string;
  material: string;
  purity: string;
  stones?: string;
  stoneColors?: string;
  finish: string;
  jewelryStyle: string;
  gender: 'men' | 'women' | 'unisex';
  estimatedWeightGram: number;
  dimensions?: { lengthMm: number; widthMm: number; heightMm: number };
  productOrientation: 'front' | 'angle' | 'top' | 'macro_detail';
  confidenceScores: AIConfidenceScores;
}

export interface AIDocumentAnalysisResult {
  extractedSku?: string;
  extractedWeightGram?: number;
  extractedPrice?: number;
  extractedNotes?: string;
  extractedSupplier?: string;
  extractedCategory?: string;
  confidenceScore: number;
}

// Enterprise Operator Post-Analysis Recommendations
export interface AIPostAnalysisRecommendations {
  bestCategory: string;
  bestCollection: string;
  bestSellingSeason: string; // e.g. "عيد الحب (Valentine's)" | "موسم الأعياد" | "طوال العام"
  targetAudience: string; // e.g. "السيدات البحث عن الفخامة والعيار الأصيل"
  similarExistingProductIds: string[];
  duplicateDetected: boolean;
  duplicateSkuMatch?: string;
  bundleOpportunities: string[]; // e.g. "طقم فضة فرعوني متكامل (خاتم + قلادة)"
  frequentlyBoughtTogetherIds: string[];
  crossSellIds: string[];
  upsellIds: string[];
  suggestedAccessoryIds: string[];
  inventoryWarnings: string[];
  profitabilityScore: number; // 0 - 100
  expectedDemandScore: number; // 0 - 100
  seoOpportunityScore: number; // 0 - 100
}

// Smart Product Insights Dashboard Metrics
export interface AISmartProductInsights {
  productCompleteness: number; // 0 - 100
  healthScore: number; // 0 - 100
  seoScore: number; // 0 - 100
  salesPotential: number; // 0 - 100
  luxuryScore: number; // 0 - 100
  photographyQualityScore: number; // Placeholder 0 - 100
  marketReadiness: number; // 0 - 100
  publishingReadiness: number; // 0 - 100
}

// Granular Approval Center State
export interface AIGranularApprovalState {
  productApproved: boolean;
  pricingApproved: boolean;
  seoApproved: boolean;
  categoryApproved: boolean;
  collectionApproved: boolean;
  qrApproved: boolean;
  marketingAssetsApproved: boolean;
  publishingApproved: boolean;
}

// Smart Auto-Generated Task Suggestion
export interface AISmartTaskSuggestion {
  id: string;
  code: string;
  title_ar: string;
  title_en: string;
  severity: 'high' | 'medium' | 'low';
  field: string;
  actionType: 'edit_field' | 'add_spec' | 'adjust_price' | 'add_relation';
}

// Enterprise Readiness Score (0 - 100)
export interface AIEnterpriseReadinessScore {
  overallScore: number;
  grade: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'BLOCKED';
  canPublishImmediately: boolean;
  readinessBreakdown: {
    dataCompleteness: number;
    financialMargin: number;
    seoOptimization: number;
    securityQrBarcode: number;
  };
}

export interface AIProductDraft {
  id: string;
  jobId: string;
  sku: string;
  barcode: string;
  qrRouterToken: string;
  name_ar: string;
  name_en: string;
  short_description_ar: string;
  short_description_en: string;
  description_ar: string;
  description_en: string;
  meta_title: string;
  meta_description: string;
  slug: string;
  keywords: string[];
  category: string;
  collection: string;
  specifications: { key_ar: string; key_en: string; value_ar: string; value_en: string }[];
  features_ar: string[];
  features_en: string[];
  care_instructions_ar: string;
  care_instructions_en: string;
  attributes: Record<string, string>;
  suggestedTags: string[];
  relatedProductIds: string[];
  matchingProductIds: string[];
  accessoriesProductIds: string[];
  socialCaptionAr: string;
  metaAdsCopyAr: string;
  confidenceScores: AIConfidenceScores;
  healthScore: HealthScoreResult;
  mediaPlaceholders: string[];
  // Operator Enhancements
  operatorRecommendations: AIPostAnalysisRecommendations;
  smartInsights: AISmartProductInsights;
  granularApproval: AIGranularApprovalState;
  smartTasks: AISmartTaskSuggestion[];
  enterpriseReadiness: AIEnterpriseReadinessScore;
}

export interface AIPricingEstimate {
  silverGramWeight: number;
  silverSpotRatePerGram: number;
  silverCostTotal: number;
  laborCost: number;
  manufacturingCost: number;
  packagingCost: number;
  overheadCost: number;
  profitMarginPercent: number;
  calculatedSellingPrice: number;
  suggestedWholesalePrice: number;
  suggestedDiscountPrice: number;
  isWeightEstimated: boolean;
  confidenceScore: number;
}

export interface ValidationDiagnosticIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  field: string;
  message_ar: string;
  message_en: string;
}

export interface AIValidationDiagnostics {
  isValid: boolean;
  canPublish: boolean;
  issues: ValidationDiagnosticIssue[];
  skuUnique: boolean;
  qrValid: boolean;
  barcodeValid: boolean;
  pricingAnomalyDetected: boolean;
  stockAnomalyDetected: boolean;
}

export interface HumanFeedbackLog {
  id: string;
  productId: string;
  originalAiDraft: Partial<AIProductDraft>;
  finalApprovedData: Partial<AIProductDraft>;
  editedFields: string[];
  changeReason?: string;
  timestamp: string;
  reviewerId: string;
}

// Vendor-Agnostic AI Provider Interfaces
export interface IVisionProvider {
  id: string;
  name: string;
  analyzeImage(imageUrl: string): Promise<AIImageAnalysisResult>;
}

export interface IOcrProvider {
  id: string;
  name: string;
  extractDocumentText(documentUrl: string): Promise<AIDocumentAnalysisResult>;
}

export interface ILlmContentProvider {
  id: string;
  name: string;
  generateContent(prompt: string, tone?: AIPromptTone): Promise<Partial<AIProductDraft>>;
}

export interface IAiOperatorProvider {
  id: string;
  name: string;
  generateOperatorRecommendations(draft: Partial<AIProductDraft>): Promise<AIPostAnalysisRecommendations>;
}
