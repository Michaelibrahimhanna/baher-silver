'use client';

import * as React from 'react';
import { Sparkles, X, Check, RefreshCw, Wand2, DollarSign, Search, FileText } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  productNameAr: string;
  productNameEn: string;
  silverWeightGrams: number;
  onApplyAIResult: (field: string, val: unknown) => void;
}

export function BaherBrainDrawer({
  isOpen,
  onClose,
  productNameAr,
  productNameEn,
  silverWeightGrams,
  onApplyAIResult
}: Props) {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [activeAction, setActiveAction] = React.useState<string | null>(null);
  const [aiOutput, setAiOutput] = React.useState<Record<string, unknown> | null>(null);

  if (!isOpen) return null;

  const handleRunAI = async (action: string) => {
    setIsGenerating(true);
    setActiveAction(action);
    setAiOutput(null);

    try {
      const res = await fetch('/api/products/ai-brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          name_ar: productNameAr,
          name_en: productNameEn,
          silver_weight_g: silverWeightGrams,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setAiOutput(data.result);
      }
    } catch {
      // Handled silently
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-full max-w-md bg-slate-950 border-r border-white/10 p-6 shadow-2xl overflow-y-auto space-y-6">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Baher Brain AI Assistant</h3>
            <p className="text-[11px] text-slate-400">مساعد الذكاء الاصطناعي الخاص بـ باهر سيلفر</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* AI Actions Buttons */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-300">اختر إجراء الذكاء الاصطناعي المطلوب:</label>
        
        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={() => handleRunAI('generate_description')}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/80 p-3 text-right text-xs text-white hover:border-amber-500/40 hover:bg-amber-500/10 transition-all"
          >
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-amber-400" />
              <span>توليد وصف شامل (Generate Description)</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleRunAI('improve_description')}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/80 p-3 text-right text-xs text-white hover:border-amber-500/40 hover:bg-amber-500/10 transition-all"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-400" />
              <span>تحسين وتنقيح النص الحالي (Improve Description)</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleRunAI('improve_seo')}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/80 p-3 text-right text-xs text-white hover:border-amber-500/40 hover:bg-amber-500/10 transition-all"
          >
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-cyan-400" />
              <span>تحسين عناوين وبيانات الـ SEO</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleRunAI('suggest_price')}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/80 p-3 text-right text-xs text-white hover:border-amber-500/40 hover:bg-amber-500/10 transition-all"
          >
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-400" />
              <span>اقتراح سعر البيع الذكي (Suggest Price)</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleRunAI('suggest_keywords')}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/80 p-3 text-right text-xs text-white hover:border-amber-500/40 hover:bg-amber-500/10 transition-all"
          >
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-purple-400" />
              <span>اقتراح الكلمات المفتاحية (Suggest Keywords)</span>
            </div>
          </button>
        </div>
      </div>

      {/* Output Display */}
      {isGenerating && (
        <div className="flex items-center justify-center p-8 text-xs text-amber-400 gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>جاري معالجة طلبك بواسطة Baher Brain AI...</span>
        </div>
      )}

      {aiOutput && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
            <span className="text-xs font-bold text-amber-300">النتيجة المولدة:</span>
            <span className="text-[10px] text-amber-400 font-mono">Completed</span>
          </div>

          <pre className="text-xs text-slate-200 whitespace-pre-wrap font-sans bg-black/40 p-3 rounded-lg border border-white/5 max-h-60 overflow-y-auto">
            {JSON.stringify(aiOutput, null, 2)}
          </pre>

          <button
            type="button"
            onClick={() => {
              if (activeAction === 'generate_description' && aiOutput.description_ar) {
                onApplyAIResult('description_ar', aiOutput.description_ar);
                onApplyAIResult('description_en', aiOutput.description_en);
              } else if (activeAction === 'suggest_price' && aiOutput.suggested_price) {
                onApplyAIResult('selling_price', aiOutput.suggested_price);
              }
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-500 py-2 text-xs font-bold text-black hover:bg-amber-400"
          >
            <Check className="h-4 w-4" />
            تطبيق النتائج على المنتج فوراً
          </button>
        </div>
      )}
    </div>
  );
}
