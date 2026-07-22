'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, CreditCard, WifiOff, Clock } from 'lucide-react';
import { PaymentProviderType } from '@/lib/services/payment';

interface CheckoutFailureAlertProps {
  reason: 'declined' | 'timeout' | 'expired' | 'network' | string;
  onRetry: () => void;
  onChangePaymentMethod: (provider: PaymentProviderType) => void;
  locale?: string;
}

export function CheckoutFailureAlert({
  reason,
  onRetry,
  onChangePaymentMethod,
  locale = 'en',
}: CheckoutFailureAlertProps) {
  const getDetails = () => {
    switch (reason) {
      case 'declined':
        return {
          title: locale === 'ar' ? 'تم رفض العملية المالية' : 'Card / Payment Declined',
          icon: <CreditCard className="w-5 h-5 text-red-500" aria-hidden="true" />,
          message:
            locale === 'ar' ? 'يرجى التأكد من بيانات البطاقة أو تجربة وسيلة دفع أخرى.' : 'Your card issuer declined the transaction. Try another card or Paymob Wallet / Cash on Delivery.',
        };
      case 'timeout':
        return {
          title: locale === 'ar' ? 'انتهت مهلة بوابة الدفع' : 'Gateway Response Timeout',
          icon: <Clock className="w-5 h-5 text-amber-500" aria-hidden="true" />,
          message:
            locale === 'ar'
              ? 'استغرقت استجابة بوابة الدفع وقتاً أطول من المعتاد. عناصر السلة محفوظة.'
              : 'The payment gateway took too long to respond. Your cart items are safely reserved.',
        };
      case 'expired':
        return {
          title: locale === 'ar' ? 'انتهت جلسة الدفع' : 'Checkout Session Expired',
          icon: <AlertTriangle className="w-5 h-5 text-amber-500" aria-hidden="true" />,
          message:
            locale === 'ar' ? 'انتهت صلاحية جلسة الدفع الحالية. انقر لإعادة التنشيط.' : 'Your payment session expired for security reasons. Click below to refresh.',
        };
      case 'network':
      default:
        return {
          title: locale === 'ar' ? 'خطأ في الاتصال بالشبكة' : 'Network Connection Error',
          icon: <WifiOff className="w-5 h-5 text-red-500" aria-hidden="true" />,
          message:
            locale === 'ar' ? 'تعذر الاتصال بخوادم بوابة الدفع. تفقد اتصال الإنترنت واعد المحاولة.' : 'Could not reach the payment gateway. Please check your internet connection and try again.',
        };
    }
  };

  const details = getDetails();

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="p-4 mb-6 bg-red-500/10 border border-red-500/30 rounded-xl space-y-3"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-red-500/20 rounded-lg shrink-0">{details.icon}</div>
        <div>
          <h4 className="text-sm font-bold text-red-700 dark:text-red-300">{details.title}</h4>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">{details.message}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-1 border-t border-red-500/20">
        <button
          type="button"
          onClick={onRetry}
          className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer focus:ring-2 focus:ring-red-400"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          {locale === 'ar' ? 'إعادة محاولة الدفع' : 'Re-attempt Payment'}
        </button>
        <button
          type="button"
          onClick={() => onChangePaymentMethod('COD')}
          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer focus:ring-2 focus:ring-slate-400"
        >
          {locale === 'ar' ? 'التحويل إلى الدفع عند الاستلام' : 'Switch to Cash on Delivery'}
        </button>
      </div>
    </div>
  );
}
