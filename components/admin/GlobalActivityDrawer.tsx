'use client';

import * as React from 'react';
import { X, History, AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { globalActivityBus, GlobalActivityEvent, SystemDomain } from '@/lib/services/globalActivity';

interface GlobalActivityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalActivityDrawer({ isOpen, onClose }: GlobalActivityDrawerProps) {
  const [domainFilter, setDomainFilter] = React.useState<SystemDomain | 'all'>('all');
  const [events, setEvents] = React.useState<GlobalActivityEvent[]>([]);

  React.useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setEvents(globalActivityBus.getEvents(domainFilter === 'all' ? undefined : domainFilter));
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, domainFilter]);

  if (!isOpen) return null;

  const getSeverityIcon = (severity: GlobalActivityEvent['severity']) => {
    switch (severity) {
      case 'success': return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-rose-400" />;
      default: return <Info className="h-4 w-4 text-cyan-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-slate-950 text-white shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-6 py-5">
          <div className="flex items-center gap-3">
            <History className="h-5 w-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-white">سجل النشاطات الحي (Global Activity Center)</h3>
              <p className="text-xs text-slate-400">تخطيط زمني حي لكافة الأحداث والعمليات في المنظومة</p>
            </div>
          </div>

          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Domain Filter Pills */}
        <div className="flex overflow-x-auto gap-1.5 p-3 border-b border-white/10 bg-slate-900/50 scrollbar-none text-xs">
          {[
            { id: 'all', label: 'كافة الأحداث' },
            { id: 'orders', label: 'الطلبات' },
            { id: 'payments', label: 'المدفوعات' },
            { id: 'inventory', label: 'المخزون' },
            { id: 'catalog', label: 'الكتالوج' },
            { id: 'ai_brain', label: 'الذكاء الاصطناعي' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setDomainFilter(tab.id as typeof domainFilter)}
              className={`rounded-xl px-3 py-1 text-[11px] font-semibold whitespace-nowrap transition-all ${
                domainFilter === tab.id
                  ? 'bg-amber-500 text-black font-extrabold'
                  : 'bg-black/30 text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Event Timeline */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {events.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center text-slate-500">
              <History className="h-10 w-10 text-slate-700 mb-2" />
              <p className="text-xs">لا توجد أحداث مسجلة لهذا القسم حالياً.</p>
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className="relative pl-6 border-l border-white/10 space-y-1 text-xs"
              >
                <span className="absolute -left-2 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 border border-white/20">
                  {getSeverityIcon(event.severity)}
                </span>

                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white">{event.title_ar}</h4>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(event.timestamp).toLocaleTimeString('ar-EG')}
                  </span>
                </div>

                <p className="text-slate-300 leading-relaxed">{event.description_ar}</p>

                <div className="flex items-center gap-2 text-[10px] text-slate-500 pt-0.5">
                  <span className="rounded bg-white/5 px-1.5 py-0.2 border border-white/10 uppercase font-mono">
                    {event.domain}
                  </span>
                  <span>بواسطة: {event.actor_name}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
