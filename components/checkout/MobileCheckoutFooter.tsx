'use client';

import React from 'react';
import { useStore } from '@/lib/store';
import { formatMoney } from '@/lib/types/money';
import { ShoppingBag, ArrowRight } from 'lucide-react';

interface MobileCheckoutFooterProps {
  onActionClick: () => void;
  actionText?: string;
  locale?: string;
}

export function MobileCheckoutFooter({
  onActionClick,
  actionText,
  locale = 'en',
}: MobileCheckoutFooterProps) {
  const { cart, getPricingBreakdown } = useStore();
  const breakdown = getPricingBreakdown();

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const formattedTotal = formatMoney(breakdown.total, locale);

  if (cart.length === 0) return null;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-3.5 shadow-2xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
            <span>{totalItems} {locale === 'ar' ? 'منتجات' : 'items'}</span>
          </div>
          <div className="text-lg font-extrabold text-amber-400 font-mono tracking-tight">
            {formattedTotal}
          </div>
        </div>

        <button
          type="button"
          onClick={onActionClick}
          className="flex-1 max-w-[200px] py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold rounded-xl text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
        >
          <span>{actionText || (locale === 'ar' ? 'إتمام الطلب الآن' : 'Place Order')}</span>
          <ArrowRight className={`w-4 h-4 ${locale === 'ar' ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </div>
  );
}
