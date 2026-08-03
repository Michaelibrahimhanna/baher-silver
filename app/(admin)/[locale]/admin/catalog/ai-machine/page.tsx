'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Bot, ArrowLeft } from 'lucide-react';
import { AiProductImportWizard } from '@/components/admin/catalog/ai-machine/AiProductImportWizard';
import { AiProductReviewScreen } from '@/components/admin/catalog/ai-machine/AiProductReviewScreen';
import { AiBatchQueueControlsBar } from '@/components/admin/catalog/ai-machine/AiBatchQueueControlsBar';
import { aiProductIntakeQueue } from '@/lib/services/aiProductIntakeQueue';
import { AIProductAnalysisPipelineService } from '@/lib/services/aiProductAnalysisPipeline';
import { AIProductBuilderService } from '@/lib/services/aiProductBuilderService';
import { ProductIntakeJob, AIProductDraft, IntakeFileType } from '@/types/aiProductMachine';

export default function AiProductMachinePage() {
  const router = useRouter();
  const [activeJob, setActiveJob] = React.useState<ProductIntakeJob | null>(null);
  const [activeDraft, setActiveDraft] = React.useState<AIProductDraft | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleBatchCreated = (
    batchName: string,
    rawFiles: { name: string; size: number; type: IntakeFileType; url?: string }[]
  ) => {
    setIsProcessing(true);

    const job = aiProductIntakeQueue.createIntakeJob(batchName, rawFiles);
    setActiveJob(job);

    setTimeout(() => {
      const imgAnalysis = AIProductAnalysisPipelineService.analyzeImagePlaceholder(rawFiles[0]?.name || 'ring.jpg');
      const docAnalysis = AIProductAnalysisPipelineService.analyzeDocumentOcrPlaceholder('specs.csv');
      const generatedDraft = AIProductBuilderService.generateProductDraft(job.id, imgAnalysis, docAnalysis);

      setActiveDraft(generatedDraft);
      setIsProcessing(false);
    }, 1200);
  };

  return (
    <div className="space-y-6 pb-20 text-right animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="text-[10px] tracking-[0.3em] uppercase text-amber-400 font-bold">
              PRIMARY ENTERPRISE OPERATOR OS • BAHER BRAIN ENGINE
            </span>
          </div>
          <h1 className="text-3xl font-serif text-white tracking-tight mt-1 flex items-center gap-2">
            المشغل الذكي لإنشاء المنتجات (Baher Brain Enterprise AI Operator)
            <Sparkles className="h-6 w-6 text-amber-400" />
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            سحب وإسقاط ملفات الصور والكشوفات لاستخراج وتوليد بيانات المنتجات، مؤشرات الرؤى، والتوصيات التجارية آلياً
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push('/admin/catalog/products')}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-xs font-bold text-slate-300 hover:text-white transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          العودة لقائمة المنتجات (Products List)
        </button>
      </div>

      {/* Batch Controls Bar if Active Job Exists */}
      {activeJob && (
        <AiBatchQueueControlsBar job={activeJob} onJobUpdate={(updated) => setActiveJob(updated)} />
      )}

      {isProcessing ? (
        <div className="flex h-96 flex-col items-center justify-center text-center space-y-3 rounded-3xl border border-white/10 bg-slate-950 p-8 shadow-2xl">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Bot className="h-8 w-8 animate-spin" />
          </div>
          <h3 className="text-lg font-bold text-white">جاري تحليل البيانات وتوليد توصيات المشغل الذكي...</h3>
          <p className="text-xs text-slate-400 max-w-sm">
            يقوم Baher Brain بجمع المؤشرات والتسعير وإعداد مهام المعالجة لعرضها على المسؤول البشري للاعتماد.
          </p>
        </div>
      ) : activeDraft ? (
        <AiProductReviewScreen
          draft={activeDraft}
          onApprove={() => {
            setActiveDraft(null);
            setActiveJob(null);
            router.push('/admin/catalog/products');
          }}
          onReject={() => {
            setActiveDraft(null);
            setActiveJob(null);
          }}
        />
      ) : (
        <AiProductImportWizard onStartAnalysis={handleBatchCreated} />
      )}
    </div>
  );
}
