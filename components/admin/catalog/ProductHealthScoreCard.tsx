'use client';

import * as React from 'react';
import { Activity, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import type { Product } from '@/types/catalog';
import { calculateProductHealthScore } from '@/lib/product-health-score';

interface ProductHealthScoreCardProps {
  product: Product;
}

export function ProductHealthScoreCard({ product }: ProductHealthScoreCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const health = calculateProductHealthScore(product);

  const gradeColorClass =
    health.grade === 'A+' || health.grade === 'A'
      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      : health.grade === 'B' || health.grade === 'C'
      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      : 'bg-rose-500/20 text-rose-400 border-rose-500/30';

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-md space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">مؤشر الجودة والصحة بالذكاء الاصطناعي (AI Health Score)</h3>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-black border ${gradeColorClass}`}>
                {health.grade} ({health.overallScore}/100)
              </span>
            </div>
            <p className="text-xs text-slate-400">تقييم شامل لـ SEO، التسعير، الوصف، المواصفات والمتغيرات.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-xs font-semibold text-amber-400 hover:underline"
        >
          {isExpanded ? 'إخفاء التفاصيل' : 'عرض التوصيات'}
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Progress Score Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-slate-400 font-mono">
          <span>0%</span>
          <span>50%</span>
          <span className="text-amber-400 font-bold">{health.overallScore}% Completed</span>
          <span>100%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-900 border border-white/10">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-emerald-400 to-cyan-400 transition-all duration-500"
            style={{ width: `${health.overallScore}%` }}
          />
        </div>
      </div>

      {/* Breakdown Metrics Grid */}
      {isExpanded && (
        <div className="space-y-4 pt-2 border-t border-white/10">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
            <div className="rounded-xl border border-white/10 bg-slate-900 p-2.5">
              <span className="block text-[10px] text-slate-400">SEO Engine</span>
              <span className="font-bold text-amber-300">{health.breakdown.seo} / 15</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900 p-2.5">
              <span className="block text-[10px] text-slate-400">Pricing & Margins</span>
              <span className="font-bold text-emerald-300">{health.breakdown.pricing} / 20</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900 p-2.5">
              <span className="block text-[10px] text-slate-400">Descriptions</span>
              <span className="font-bold text-cyan-300">{health.breakdown.description} / 20</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900 p-2.5">
              <span className="block text-[10px] text-slate-400">Specifications</span>
              <span className="font-bold text-purple-300">{health.breakdown.specifications} / 15</span>
            </div>
          </div>

          {/* AI Recommendations List */}
          {health.recommendations.length > 0 ? (
            <div className="space-y-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-400" />
                توصيات تحسين الجودة الموصى بها (Optimization Actions):
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {health.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>المنتج مكتمل تماماً وأعلى درجات الجودة جاهز للنشر والمبيعات!</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
