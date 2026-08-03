'use client';

import * as React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface AiFieldConfidenceBadgeProps {
  score: number;
  fieldName?: string;
}

export function AiFieldConfidenceBadge({ score, fieldName }: AiFieldConfidenceBadgeProps) {
  const isLowConfidence = score < 85;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold border transition-all ${
        isLowConfidence
          ? 'border-amber-500/50 bg-amber-500/20 text-amber-300 animate-pulse shadow-sm shadow-amber-500/20'
          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      }`}
      title={isLowConfidence ? `تحذير: درجة ثقة الذكاء الاصطناعي منخفضة (${score}%) في الحقل [${fieldName || ''}]` : `درجة ثقة الذكاء الاصطناعي ${score}%`}
    >
      {isLowConfidence ? (
        <AlertTriangle className="h-3 w-3 text-amber-400" />
      ) : (
        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
      )}
      <span>{score}%</span>
    </span>
  );
}
