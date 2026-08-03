import { IVisionProvider, IOcrProvider, ILlmContentProvider, AIImageAnalysisResult, AIDocumentAnalysisResult, AIProductDraft } from '@/types/aiProductMachine';

// Default Pluggable Placeholder Vision Provider
export class DefaultVisionProvider implements IVisionProvider {
  id = 'default-vision-provider';
  name = 'Baher Silver Core Vision Contract Engine';

  async analyzeImage(_imageUrl: string): Promise<AIImageAnalysisResult> {
    const url = _imageUrl?.toLowerCase() || '';
    return {
      productType: url.includes('ring') ? 'خاتم فضة (Silver Ring)' : 'خاتم فضة إيطالي (Silver Ring)',
      category: 'rings',
      material: 'فضة نقية عيار 925 (925 Sterling Silver)',
      purity: 'عيار 925 معتمد (925 Pure Certified)',
      stones: 'زركون نقي ممتاز (Cubic Zirconia)',
      stoneColors: 'أبيض ملكي (Crystal White)',
      finish: 'تلميع مصنع ضد الأكسدة (Anti-Tarnish Polish)',
      jewelryStyle: 'تراثي فرعوني ملكي (Pharaonic Royal Heritage)',
      gender: 'women',
      estimatedWeightGram: 14.5,
      dimensions: { lengthMm: 22, widthMm: 18, heightMm: 12 },
      productOrientation: 'front',
      confidenceScores: {
        productType: 97,
        category: 97,
        material: 99,
        purity: 98,
        stones: 92,
        weight: 81, // Highlight low confidence (< 85%)
        description: 93,
        pricing: 90,
        seo: 95,
      },
    };
  }
}

// Default Pluggable Placeholder OCR Provider
export class DefaultOcrProvider implements IOcrProvider {
  id = 'default-ocr-provider';
  name = 'Baher Silver Spreadsheet & Document OCR Engine';

  async extractDocumentText(documentUrl: string): Promise<AIDocumentAnalysisResult> {
    const fn = documentUrl.toLowerCase();
    return {
      extractedSku: `BS-AI-${fn.includes('csv') ? 'CSV' : 'PDF'}-9988`,
      extractedWeightGram: 14.5,
      extractedPrice: 1250,
      extractedNotes: 'تم الاستخراج بنجاح عبر عقد OCR بدون الانحياز لمورد محدد.',
      extractedSupplier: 'مورد خان الخليلي للصياغة',
      extractedCategory: 'rings',
      confidenceScore: 0.91,
    };
  }
}

// Default Pluggable Placeholder LLM Provider
export class DefaultLlmContentProvider implements ILlmContentProvider {
  id = 'default-llm-provider';
  name = 'Baher Brain Multilingual LLM Generator';

  async generateContent(_prompt: string): Promise<Partial<AIProductDraft>> {
    const p = _prompt?.trim() || '';
    return {
      name_ar: p.includes('luxury') ? 'خاتم فضة إيطالي عيار 925 فاخر جداً' : 'خاتم فضة إيطالي عيار 925 مرصع بالزركون الملكي',
      name_en: 'Royal Pharaonic 925 Sterling Silver Ring',
      short_description_ar: 'خاتم فضة نقي عيار 925 معالج ضد الأكسدة بتصميم فرعوني فاخر.',
      short_description_en: 'Authentic 925 sterling silver ring with anti-tarnish coating.',
    };
  }
}

class AIProviderRegistry {
  private visionProvider: IVisionProvider = new DefaultVisionProvider();
  private ocrProvider: IOcrProvider = new DefaultOcrProvider();
  private llmProvider: ILlmContentProvider = new DefaultLlmContentProvider();

  registerVisionProvider(provider: IVisionProvider): void {
    this.visionProvider = provider;
  }

  registerOcrProvider(provider: IOcrProvider): void {
    this.ocrProvider = provider;
  }

  registerLlmProvider(provider: ILlmContentProvider): void {
    this.llmProvider = provider;
  }

  getVisionProvider(): IVisionProvider {
    return this.visionProvider;
  }

  getOcrProvider(): IOcrProvider {
    return this.ocrProvider;
  }

  getLlmProvider(): ILlmContentProvider {
    return this.llmProvider;
  }
}

export const aiProviderRegistry = new AIProviderRegistry();
