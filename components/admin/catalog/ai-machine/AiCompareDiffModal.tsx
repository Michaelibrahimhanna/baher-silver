'use client';

import * as React from 'react';
import { X, GitCompare } from 'lucide-react';
import { AIProductDraft } from '@/types/aiProductMachine';

interface AiCompareDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalDraft: AIProductDraft;
  currentDraft: AIProductDraft;
}

export function AiCompareDiffModal({
  isOpen,
  onClose,
  originalDraft,
  currentDraft,
}: AiCompareDiffModalProps) {
  if (!isOpen) return null;

  const diffFields = [
    { label: 'اسم المنتج بالعربية', original: originalDraft.name_ar, current: currentDraft.name_ar },
    { label: 'English Name', original: originalDraft.name_en, current: currentDraft.name_en },
    { label: 'القسم الرئيسي', original: originalDraft.category, current: currentDraft.category },
    { label: 'الوصف العربي', original: originalDraft.short_description_ar, current: currentDraft.short_description_ar },
    { label: 'عنوان SEO', original: originalDraft.meta_title, current: currentDraft.meta_title },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="flex h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950 text-white shadow-2xl animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-6 py-4">
          <div className="flex items-center gap-3">
            <GitCompare className="h-5 w-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-white">مقارنة التعديلات (AI Predictions vs. Manual Edits)</h3>
              <p className="text-xs text-slate-400">مقارنة مخرجات الذكاء الاصطناعي الأصلية مع التعديلات البشرية المعتمدة</p>
            </div>
          </div>

          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Diff Table */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {diffFields.map((field, idx) => {
            const isModified = field.original !== field.current;
            return (
              <div
                key={idx}
                className={`rounded-2xl border p-4 space-y-2 ${
                  isModified
                    ? 'border-amber-500/40 bg-amber-500/10'
                    : 'border-white/10 bg-black/30'
                }`}
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="font-bold text-white">{field.label}</span>
                  {isModified ? (
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold text-amber-300 border border-amber-500/30">
                      تم التعديل بشرياً (Modified)
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-mono">مطابق للذكاء الاصطناعي</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1">
                    <span className="block text-[10px] text-slate-400">توقع الذكاء الاصطناعي الأصلي (Original AI):</span>
                    <p className="text-slate-300 font-mono bg-black/40 p-2 rounded-xl">{field.original}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="block text-[10px] text-emerald-400">القيمة النهائية المعتمدة (Final Value):</span>
                    <p className="text-emerald-200 font-mono bg-emerald-950/40 p-2 rounded-xl border border-emerald-500/20">{field.current}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
