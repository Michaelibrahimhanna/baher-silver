'use client';

import * as React from 'react';
import { CheckCircle2, ShieldCheck, CheckSquare, XCircle } from 'lucide-react';
import { AIGranularApprovalState } from '@/types/aiProductMachine';

interface AiGranularApprovalCenterBarProps {
  approvalState: AIGranularApprovalState;
  onToggleApproval: (section: keyof AIGranularApprovalState) => void;
  onApproveAll: () => void;
  onRejectAll: () => void;
}

export function AiGranularApprovalCenterBar({
  approvalState,
  onToggleApproval,
  onApproveAll,
  onRejectAll,
}: AiGranularApprovalCenterBarProps) {
  const sections: { key: keyof AIGranularApprovalState; label_ar: string }[] = [
    { key: 'productApproved', label_ar: 'اعتماد اسم وبيانات المنتج' },
    { key: 'pricingApproved', label_ar: 'اعتماد التسعير وهامش الربح' },
    { key: 'seoApproved', label_ar: 'اعتماد عناوين الـ SEO والكلمات' },
    { key: 'categoryApproved', label_ar: 'اعتماد القسم التجاري' },
    { key: 'collectionApproved', label_ar: 'اعتماد التشكيلة والمجموعة' },
    { key: 'qrApproved', label_ar: 'اعتماد توكن الـ QR والتوجيه' },
    { key: 'marketingAssetsApproved', label_ar: 'اعتماد النصوص التسويقية والإعلانات' },
    { key: 'publishingApproved', label_ar: 'اعتماد النشر المباشر بالمتجر' },
  ];

  const approvedCount = Object.values(approvalState).filter(Boolean).length;
  const isAllApproved = approvedCount === sections.length;

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950 p-6 space-y-4 shadow-2xl backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              مركز الاعتماد والتصريح التفصيلي (Granular Approval Center)
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-mono text-emerald-300 border border-emerald-500/30">
                {approvedCount} / {sections.length} Approved
              </span>
            </h3>
            <p className="text-xs text-slate-400">لا يتم تنفيذ أو نشر أي عنصر إلا بعد تصريح وموافقة المسؤول البشرية الصريحة.</p>
          </div>
        </div>

        {/* Bulk Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onApproveAll}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/20 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 transition-all shadow-lg shadow-emerald-500/10"
          >
            <CheckSquare className="h-4 w-4" />
            اعتماد كل العناصر (Approve Everything)
          </button>

          <button
            type="button"
            onClick={onRejectAll}
            className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition-all"
          >
            <XCircle className="h-4 w-4" />
            رفض الكل (Reject Everything)
          </button>
        </div>
      </div>

      {/* Section Checkboxes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
        {sections.map((sec) => {
          const isChecked = approvalState[sec.key];
          return (
            <button
              key={sec.key}
              type="button"
              onClick={() => onToggleApproval(sec.key)}
              className={`flex items-center justify-between rounded-2xl border p-3.5 text-xs text-right transition-all cursor-pointer ${
                isChecked
                  ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-200 shadow-md shadow-emerald-500/10'
                  : 'border-white/10 bg-black/40 text-slate-400 hover:text-white hover:border-white/20'
              }`}
            >
              <span className="font-bold">{sec.label_ar}</span>
              <CheckCircle2 className={`h-4 w-4 flex-shrink-0 mr-2 ${isChecked ? 'text-emerald-400' : 'text-slate-600'}`} />
            </button>
          );
        })}
      </div>

      {isAllApproved && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center text-xs font-bold text-emerald-300 animate-in fade-in">
          ✓ اكتمل تصريح واعتماد كافة عناصر المنتج بنجاح! جاهز للنشر الفوري.
        </div>
      )}
    </div>
  );
}
