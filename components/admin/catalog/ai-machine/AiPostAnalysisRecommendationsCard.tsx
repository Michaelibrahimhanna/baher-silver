'use client';

import * as React from 'react';
import { Lightbulb, Tag, Calendar, Users, Layers, AlertTriangle } from 'lucide-react';
import { AIPostAnalysisRecommendations } from '@/types/aiProductMachine';

interface AiPostAnalysisRecommendationsCardProps {
  recommendations: AIPostAnalysisRecommendations;
}

export function AiPostAnalysisRecommendationsCard({
  recommendations,
}: AiPostAnalysisRecommendationsCardProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950 p-6 space-y-5 shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
          <Lightbulb className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">توصيات المشغّل الذكي بعد التحليل (Post-Analysis Business Recommendations)</h3>
          <p className="text-xs text-slate-400">توصيات تجارية واقتراحات حزم وموسمية النشر المستخرجة من أبعاد المنتج</p>
        </div>
      </div>

      {/* Grid of Business Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
        {/* Category & Collection */}
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-amber-300 font-bold">
            <Tag className="h-4 w-4" />
            <span>القسم والتصنيف الأنسب:</span>
          </div>
          <p className="text-white font-bold">{recommendations.bestCategory} • {recommendations.bestCollection}</p>
        </div>

        {/* Selling Season */}
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
            <Calendar className="h-4 w-4" />
            <span>موسم البيع الأعلى:</span>
          </div>
          <p className="text-white font-bold">{recommendations.bestSellingSeason}</p>
        </div>

        {/* Target Audience */}
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
            <Users className="h-4 w-4" />
            <span>الجمهور المستهدف:</span>
          </div>
          <p className="text-slate-300">{recommendations.targetAudience}</p>
        </div>

        {/* Bundle Opportunities */}
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-2 md:col-span-2">
          <div className="flex items-center gap-1.5 text-purple-300 font-bold">
            <Layers className="h-4 w-4" />
            <span>فرص الحزم والتجميع المقترحة (Bundle Opportunities):</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-300">
            {recommendations.bundleOpportunities.map((b, idx) => (
              <li key={idx}>{b}</li>
            ))}
          </ul>
        </div>

        {/* Inventory Warning */}
        {recommendations.inventoryWarnings.length > 0 && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold">
              <AlertTriangle className="h-4 w-4" />
              <span>تحذيرات رصيد الخام:</span>
            </div>
            <p className="text-amber-200">{recommendations.inventoryWarnings[0]}</p>
          </div>
        )}
      </div>
    </div>
  );
}
