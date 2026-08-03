'use client';

import * as React from 'react';
import { Award, BarChart3, Camera } from 'lucide-react';
import { AISmartProductInsights, AIEnterpriseReadinessScore } from '@/types/aiProductMachine';

interface AiSmartProductInsightsDashboardProps {
  insights: AISmartProductInsights;
  readinessScore: AIEnterpriseReadinessScore;
}

export function AiSmartProductInsightsDashboard({
  insights,
  readinessScore,
}: AiSmartProductInsightsDashboardProps) {
  const metrics = [
    { label: 'اكتمال البيانات (Completeness)', value: insights.productCompleteness, color: 'emerald' },
    { label: 'مؤشر الصحة (Health Score)', value: insights.healthScore, color: 'amber' },
    { label: 'مؤشر الـ SEO', value: insights.seoScore, color: 'cyan' },
    { label: 'فرصة المبيعات (Sales Potential)', value: insights.salesPotential, color: 'emerald' },
    { label: 'مؤشر الفخامة (Luxury Score)', value: insights.luxuryScore, color: 'amber' },
    { label: 'جودة التصوير (Photo Quality)', value: insights.photographyQualityScore, color: 'purple' },
    { label: 'جاهزية السوق (Market Readiness)', value: insights.marketReadiness, color: 'blue' },
    { label: 'جاهزية النشر (Publish Readiness)', value: insights.publishingReadiness, color: 'emerald' },
  ];

  const gradeColor =
    readinessScore.grade === 'EXCELLENT'
      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
      : readinessScore.grade === 'GOOD'
      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
      : 'bg-amber-500/20 text-amber-300 border-amber-500/40';

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950 p-6 space-y-6 shadow-2xl backdrop-blur-md">
      {/* Header with Enterprise Readiness Score Pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              لوحة رؤى ومؤشرات الذكاء الاصطناعي (Smart Product Insights Dashboard)
            </h3>
            <p className="text-xs text-slate-400">تقييم شامل لـ 8 أبعاد جودة قبل الاعتماد والنشر بالمتجر</p>
          </div>
        </div>

        {/* Big Overall Enterprise Readiness Score Badge */}
        <div className={`flex items-center gap-3 rounded-2xl border p-3.5 backdrop-blur-md ${gradeColor}`}>
          <Award className="h-7 w-7" />
          <div>
            <span className="block text-[10px] uppercase font-bold tracking-wider opacity-80">
              Enterprise Readiness Score
            </span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black font-mono">{readinessScore.overallScore} / 100</span>
              <span className="rounded-md bg-black/40 px-2 py-0.5 text-[10px] font-extrabold uppercase">
                {readinessScore.grade}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 8 Radar Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {metrics.map((m, idx) => (
          <div key={idx} className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-bold">{m.label}</span>
              {m.label.includes('Photo') && <Camera className="h-3.5 w-3.5 text-purple-400" />}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-lg font-bold font-mono text-white">{m.value}%</span>
              <span className="text-[10px] text-emerald-400 font-bold">ممتاز</span>
            </div>

            <div className="h-1.5 w-full rounded-full bg-slate-900 overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all duration-500"
                style={{ width: `${m.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
