'use client';

import React from 'react';
import { OrderStatus, OrderStateTransition } from '@/lib/types/orderAggregate';
import { CheckCircle2, Clock, Package, Truck, Home } from 'lucide-react';

interface OrderTimelineProps {
  currentStatus: OrderStatus;
  stateHistory: OrderStateTransition[];
  locale?: string;
}

const STEPS: { status: OrderStatus; labelEn: string; labelAr: string; icon: React.ReactNode }[] = [
  { status: 'Pending', labelEn: 'Order Placed', labelAr: 'تم تقديم الطلب', icon: <Clock className="w-4 h-4" /> },
  { status: 'Paid', labelEn: 'Payment Verified', labelAr: 'تم تأكيد الدفع', icon: <CheckCircle2 className="w-4 h-4" /> },
  { status: 'Processing', labelEn: 'Processing', labelAr: 'جاري التجهيز', icon: <Package className="w-4 h-4" /> },
  { status: 'Shipped', labelEn: 'Shipped', labelAr: 'تم الشحن', icon: <Truck className="w-4 h-4" /> },
  { status: 'Delivered', labelEn: 'Delivered', labelAr: 'تم التوصيل', icon: <Home className="w-4 h-4" /> },
];

export function OrderTimeline({ currentStatus, stateHistory, locale = 'en' }: OrderTimelineProps) {
  const getStepIndex = (status: OrderStatus) => {
    const idx = STEPS.findIndex(s => s.status === status);
    return idx >= 0 ? idx : 1;
  };

  const currentIndex = getStepIndex(currentStatus);

  return (
    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-slate-100 space-y-6">
      <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">
        {locale === 'ar' ? 'تتبع حالة الطلب السحابية' : 'Live Order State Machine Timeline'}
      </h3>

      <div className="relative flex items-center justify-between">
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-slate-800 z-0" />
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-amber-500 z-0 transition-all duration-500"
          style={{ width: `${(currentIndex / (STEPS.length - 1)) * 100}%` }}
        />

        {STEPS.map((step, idx) => {
          const isCompleted = idx <= currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div key={step.status} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                  isCurrent
                    ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-500/30'
                    : isCompleted
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-800 text-slate-500 border border-slate-700'
                }`}
              >
                {step.icon}
              </div>
              <span
                className={`mt-2 text-[11px] font-semibold ${
                  isCurrent ? 'text-amber-400' : isCompleted ? 'text-slate-200' : 'text-slate-500'
                }`}
              >
                {locale === 'ar' ? step.labelAr : step.labelEn}
              </span>
            </div>
          );
        })}
      </div>

      <div className="pt-4 border-t border-slate-800">
        <h4 className="text-xs font-bold text-slate-400 mb-2">
          {locale === 'ar' ? 'سجل انتقالات الحالة (Audit History Log)' : 'State Transition Audit Log'}
        </h4>
        <div className="space-y-2">
          {stateHistory.map((tr) => (
            <div key={tr.id} className="p-2.5 bg-slate-950/60 rounded-lg text-xs flex items-center justify-between border border-slate-800/60">
              <div>
                <span className="font-bold text-amber-400">{tr.fromState}</span>
                <span className="mx-2 text-slate-600">→</span>
                <span className="font-bold text-emerald-400">{tr.toState}</span>
                <span className="ml-2 text-slate-400 text-[11px]">({tr.actor})</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                {new Date(tr.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
