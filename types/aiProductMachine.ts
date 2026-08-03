import { HealthScoreResult } from './catalog';

export type IntakeFileType = 'image' | 'zip' | 'pdf' | 'excel' | 'csv';

export interface IntakeFileItem {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: IntakeFileType;
  previewUrl?: string;
  status: 'queued' | 'analyzing' | 'completed' | 'failed';
  uploadedAt: string;
}

export interface ProductIntakeJob {
  id: string;
  batchName: string;
  batchSize: number;
  files: IntakeFileItem[];
  status: 'draft_queue' | 'processing' | 'ready_for_review' | 'approved' | 'rejected';
  created_at: string;
}

export interface AIImageAnalysisResult {
  productType: string;
  material: string;
  stoneType?: string;
  stoneColor?: string;
  jewelryStyle: string;
  gender: 'men' | 'women' | 'unisex';
  estimatedWeightGram: number;
  productOrientation: 'front' | 'angle' | 'top' | 'macro_detail';
  confidenceScore: number;
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

export interface AIProductDraft {
  id: string;
  jobId: string;
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
  attributes: Record<string, string>;
  suggestedTags: string[];
  healthScore: HealthScoreResult;
  mediaPlaceholders: string[];
}

export interface AIPricingEstimate {
  silverGramWeight: number;
  silverSpotRatePerGram: number;
  silverCostTotal: number;
  laborCost: number;
  manufacturingCost: number;
  packagingCost: number;
  profitMarginPercent: number;
  calculatedSellingPrice: number;
  isWeightEstimated: boolean;
}

export interface HumanFeedbackLog {
  id: string;
  productId: string;
  originalAiDraft: Partial<AIProductDraft>;
  finalApprovedData: Partial<AIProductDraft>;
  editedFields: string[];
  timestamp: string;
  reviewerId: string;
}
