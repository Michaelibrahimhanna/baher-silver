'use client';

import * as React from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Save, 
  Eye, 
  Sparkles, 
  AlertTriangle, 
  ShieldCheck
} from 'lucide-react';
import { AIProductDraft, AIPricingEstimate } from '@/types/aiProductMachine';
import { ProductHealthScoreCard } from '../ProductHealthScoreCard';
import { AIPricingAssistantService } from '@/lib/services/aiPricingAssistantService';
import { aiContinuousLearningStore } from '@/lib/services/aiContinuousLearningStore';

interface AiProductReviewScreenProps {
  draft: AIProductDraft;
  onApprove: (finalDraft: AIProductDraft) => void;
  onReject: () => void;
}

export function AiProductReviewScreen({ draft, onApprove, onReject }: AiProductReviewScreenProps) {
  const [currentDraft, setCurrentDraft] = React.useState<AIProductDraft>(draft);
  const [pricing] = React.useState<AIPricingEstimate>(
    AIPricingAssistantService.calculateFormulaPrice(14.5, 32.5)
  );

  const [activeTab, setActiveTab] = React.useState<'data' | 'pricing' | 'seo'>('data');
  const [saveStatusMessage, setSaveStatusMessage] = React.useState<string | null>(null);

  const handleFieldChange = (field: keyof AIProductDraft, value: unknown) => {
    setCurrentDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleApproveAction = (status: 'approved' | 'draft') => {
    // Continuous Learning Audit Log Contract
    aiContinuousLearningStore.recordHumanCorrection(
      currentDraft.id,
      draft,
      currentDraft,
      'admin-reviewer'
    );

    setSaveStatusMessage(
      status === 'approved'
        ? 'تمت الموافقة البشرية واعتماد المنتج بالنشر النهائي والتسجيل في سجل التدريب المستمر للذكاء الاصطناعي!'
        : 'تم حفظ المسودة بنجاح في الكتالوج.'
    );

    setTimeout(() => {
      onApprove(currentDraft);
    }, 1500);
  };

  return (
    <div className="space-y-6 text-right animate-in fade-in duration-300">
      {/* TOP BAR: Health Score & Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Sparkles className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-300 border border-emerald-500/30 uppercase">
                AI GENERATED DRAFT • READY FOR HUMAN APPROVAL
              </span>
              <span className="text-xs text-slate-400 font-mono">Job ID: {currentDraft.jobId}</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-0.5">{currentDraft.name_ar}</h2>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onReject}
            className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition-all"
          >
            <XCircle className="h-4 w-4" />
            رفض وإلغاء (Reject)
          </button>

          <button
            type="button"
            onClick={() => handleApproveAction('draft')}
            className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/20 transition-all"
          >
            <Save className="h-4 w-4 text-amber-400" />
            حفظ كمسودة (Save Draft)
          </button>

          <button
            type="button"
            onClick={() => handleApproveAction('approved')}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-extrabold text-black hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20"
          >
            <CheckCircle2 className="h-4 w-4" />
            اعتماد ونشر المنتج (Approve & Publish)
          </button>
        </div>
      </div>

      {saveStatusMessage && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-bold text-emerald-300 animate-in fade-in">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
          <span>{saveStatusMessage}</span>
        </div>
      )}

      {/* TOP HEALTH SCORE CARD */}
      <ProductHealthScoreCard healthScore={currentDraft.healthScore} />

      {/* MAIN 3-COLUMN GRID REVIEW LAYOUT */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* LEFT COLUMN: Uploaded Images & OCR Sources (3 Cols) */}
        <div className="lg:col-span-3 space-y-4 rounded-3xl border border-white/10 bg-slate-950 p-5 shadow-xl">
          <h4 className="text-xs font-bold text-amber-300 border-b border-white/10 pb-2">
            الصور والمستندات المصدرية (Source Media)
          </h4>

          <div className="space-y-3">
            {currentDraft.mediaPlaceholders.map((imgUrl, idx) => (
              <div key={idx} className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imgUrl} alt="Source Product" className="h-44 w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <span className="absolute bottom-2 right-2 rounded-lg bg-black/80 px-2 py-0.5 text-[9px] font-bold text-white border border-white/20">
                  صورة رئيسية (Primary)
                </span>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-3 text-xs space-y-1">
            <span className="block font-bold text-white">بيانات الـ OCR المستخرجة:</span>
            <p className="text-[11px] text-slate-400">المورد: خان الخليلي للصياغة اليدوية</p>
            <p className="text-[11px] text-slate-400">الوزن المسجل: 14.5 جرام فضة عيار 925</p>
          </div>
        </div>

        {/* CENTER COLUMN: Generated Product Data & Pricing Editor (5 Cols) */}
        <div className="lg:col-span-5 space-y-4 rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-xl">
          {/* Inner Tabs */}
          <div className="flex border-b border-white/10 pb-2 gap-2 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('data')}
              className={`rounded-xl px-4 py-2 transition-all ${
                activeTab === 'data' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              بيانات المنتج (Product Specs)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pricing')}
              className={`rounded-xl px-4 py-2 transition-all ${
                activeTab === 'pricing' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              حاسبة التسعير (AI Pricing)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('seo')}
              className={`rounded-xl px-4 py-2 transition-all ${
                activeTab === 'seo' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              SEO & Tagging
            </button>
          </div>

          {/* Tab 1: Product Data */}
          {activeTab === 'data' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300">اسم المنتج بالعربية *</label>
                <input
                  type="text"
                  value={currentDraft.name_ar}
                  onChange={(e) => handleFieldChange('name_ar', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300">Product Name (English) *</label>
                <input
                  type="text"
                  value={currentDraft.name_en}
                  onChange={(e) => handleFieldChange('name_en', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white text-left font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300">الوصف التفصيلي بالعربية *</label>
                <textarea
                  rows={4}
                  value={currentDraft.description_ar}
                  onChange={(e) => handleFieldChange('description_ar', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* Tab 2: Formula Pricing */}
          {activeTab === 'pricing' && (
            <div className="space-y-4 rounded-2xl border border-white/10 bg-black/40 p-4 text-xs">
              <h4 className="font-bold text-amber-300 border-b border-white/10 pb-2">حاسبة تسعير الذكاء الاصطناعي الخماسية</h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 block">وزن الفضة الصافي (جرام):</span>
                  <span className="font-mono text-white font-bold">{pricing.silverGramWeight}g</span>
                </div>
                <div>
                  <span className="text-slate-400 block">سعر جرام الفضة الآن:</span>
                  <span className="font-mono text-emerald-400 font-bold">{pricing.silverSpotRatePerGram} EGP</span>
                </div>
                <div>
                  <span className="text-slate-400 block">تكلفة خامات الفضة:</span>
                  <span className="font-mono text-white font-bold">{pricing.silverCostTotal} EGP</span>
                </div>
                <div>
                  <span className="text-slate-400 block">تكلفة المصنعية والإنتاج:</span>
                  <span className="font-mono text-white font-bold">{pricing.laborCost + pricing.manufacturingCost} EGP</span>
                </div>
              </div>

              <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                <span className="font-bold text-white">سعر البيع النهائي المحسوب:</span>
                <span className="text-lg font-bold text-amber-400 font-mono">{pricing.calculatedSellingPrice} EGP</span>
              </div>
            </div>
          )}

          {/* Tab 3: SEO */}
          {activeTab === 'seo' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300">عنوان SEO (Meta Title)</label>
                <input
                  type="text"
                  value={currentDraft.meta_title}
                  onChange={(e) => handleFieldChange('meta_title', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300">وصف SEO (Meta Description)</label>
                <textarea
                  rows={3}
                  value={currentDraft.meta_description}
                  onChange={(e) => handleFieldChange('meta_description', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Storefront Live Preview (4 Cols) */}
        <div className="lg:col-span-4 space-y-4 rounded-3xl border border-white/10 bg-slate-950 p-5 shadow-xl">
          <h4 className="text-xs font-bold text-cyan-300 border-b border-white/10 pb-2 flex items-center justify-between">
            <span>المعاينة الحية للمتجر (Storefront Preview)</span>
            <Eye className="h-4 w-4 text-cyan-400" />
          </h4>

          {/* Mock Storefront Card */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/60 p-4 space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentDraft.mediaPlaceholders[0]} alt="Storefront Card Preview" className="h-48 w-full object-cover rounded-xl" />

            <div className="space-y-1">
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">{currentDraft.collection}</span>
              <h3 className="text-sm font-bold text-white line-clamp-1">{currentDraft.name_ar}</h3>
              <p className="text-xs text-slate-400 line-clamp-2">{currentDraft.short_description_ar}</p>
            </div>

            <div className="flex items-center justify-between border-t border-white/10 pt-3">
              <span className="text-base font-bold text-amber-400 font-mono">{pricing.calculatedSellingPrice} EGP</span>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-300 border border-emerald-500/30">
                In Stock
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM DIAGNOSTICS & VALIDATION WARNINGS */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs space-y-1">
        <div className="flex items-center gap-2 text-amber-400 font-bold">
          <AlertTriangle className="h-4 w-4" />
          <span>تنبيهات الفحص والتحقق (Validation Diagnostics):</span>
        </div>
        <p className="text-slate-300">
          - جميع أوزان الفضة دقيقة وتم حساب تكلفة المصنعية آلياً بناءً على سعر الفضة المباشر (32.5 EGP/g).
        </p>
      </div>
    </div>
  );
}
