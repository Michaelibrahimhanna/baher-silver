'use client';

import * as React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, ShieldCheck, QrCode, Barcode } from 'lucide-react';
import { AIValidationDiagnostics } from '@/types/aiProductMachine';

interface AiValidationDiagnosticsPanelProps {
  diagnostics: AIValidationDiagnostics;
}

export function AiValidationDiagnosticsPanel({ diagnostics }: AiValidationDiagnosticsPanelProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-5 space-y-3 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-amber-400" />
          <h4 className="text-sm font-bold text-white">فحص صلاحية اعتماد النشر (Pre-Publish Quality Gate)</h4>
        </div>

        <span className={`rounded-full px-3 py-1 text-xs font-bold border ${
          diagnostics.canPublish
            ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-300'
            : 'border-rose-500/30 bg-rose-500/20 text-rose-300'
        }`}>
          {diagnostics.canPublish ? 'جاهز للاعتماد والنشر (Ready)' : 'يتطلب معالجة التنبيهات (Blocked)'}
        </span>
      </div>

      {/* Validation Checklist Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/50 p-2.5">
          <CheckCircle2 className={`h-4 w-4 ${diagnostics.skuUnique ? 'text-emerald-400' : 'text-rose-400'}`} />
          <span className="text-slate-300">فرادة الـ SKU</span>
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/50 p-2.5">
          <QrCode className={`h-4 w-4 ${diagnostics.qrValid ? 'text-emerald-400' : 'text-rose-400'}`} />
          <span className="text-slate-300">رمز QR الديناميكي</span>
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/50 p-2.5">
          <Barcode className={`h-4 w-4 ${diagnostics.barcodeValid ? 'text-emerald-400' : 'text-amber-400'}`} />
          <span className="text-slate-300">بار كود EAN-13</span>
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/50 p-2.5">
          <CheckCircle2 className={`h-4 w-4 ${!diagnostics.pricingAnomalyDetected ? 'text-emerald-400' : 'text-amber-400'}`} />
          <span className="text-slate-300">فحص هامش الربح</span>
        </div>
      </div>

      {/* Issues Stream */}
      {diagnostics.issues.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-white/10">
          {diagnostics.issues.map((issue) => (
            <div
              key={issue.id}
              className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs ${
                issue.type === 'error'
                  ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                  : issue.type === 'warning'
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                  : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
              }`}
            >
              {issue.type === 'error' ? (
                <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
              )}
              <span>{issue.message_ar}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
