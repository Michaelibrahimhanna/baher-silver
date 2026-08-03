'use client';

import * as React from 'react';
import { History, User, Clock } from 'lucide-react';
import type { ProductActivityLog } from '@/types/catalog';

interface Props {
  logs: ProductActivityLog[];
}

export function ProductActivityTimeline({ logs }: Props) {
  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-black/40 p-5 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <History className="h-4 w-4 text-cyan-400" />
            سجل التغييرات والنشاطات (Product Activity Timeline)
          </h3>
          <p className="text-xs text-slate-400">تتبع دقيق ومؤرخ بالوقت لجميع التعديلات وتغيرات الأسعار والمخزون.</p>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-xs text-slate-400">
          لا يوجد سجل نشاطات مسجل لهذا المنتج بعد.
        </div>
      ) : (
        <div className="relative border-r border-white/10 pr-6 space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="relative group">
              {/* Icon Marker */}
              <div className="absolute -right-8 top-0.5 h-4 w-4 rounded-full bg-slate-900 border-2 border-cyan-400 flex items-center justify-center">
                <div className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              </div>

              <div className="rounded-lg border border-white/5 bg-slate-900/60 p-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-semibold text-white">{log.actor_name}</span>
                    <span className="text-[10px] text-slate-500">({log.actor_role})</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(log.created_at).toLocaleString('ar-EG')}</span>
                  </div>
                </div>

                <p className="text-slate-300 text-xs">{log.description_ar}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
