'use client';

import React from 'react';
import { OrderAggregate } from '@/lib/types/orderAggregate';
import { formatMoney } from '@/lib/types/money';
import { Printer, FileText } from 'lucide-react';

interface InvoicePlaceholderProps {
  order: OrderAggregate;
  locale?: string;
}

export function InvoicePlaceholder({ order, locale = 'en' }: InvoicePlaceholderProps) {
  const invoice = order.invoice;
  const pricing = order.pricingSnapshot;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg space-y-6 text-slate-800 dark:text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500" />
            <h3 className="font-extrabold text-lg">
              {locale === 'ar' ? 'الفاتورة الضريبية الرقمية' : 'Enterprise Tax Invoice'}
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            {invoice?.invoiceNumber || `INV-${order.orderNumber}`}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            {locale === 'ar' ? 'طباعة الفاتورة' : 'Print Invoice'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-slate-50 dark:bg-slate-950 p-4 rounded-xl">
        <div>
          <h4 className="font-bold uppercase tracking-wider text-slate-400 mb-1">
            {locale === 'ar' ? 'بيانات البائع' : 'Seller Info'}
          </h4>
          <p className="font-bold text-slate-900 dark:text-slate-100">Baher Silver LLC</p>
          <p className="text-slate-500">VAT Reg: {invoice?.sellerVatId || 'EG-VAT-982401924'}</p>
          <p className="text-slate-500">Cairo, Egypt</p>
        </div>

        <div>
          <h4 className="font-bold uppercase tracking-wider text-slate-400 mb-1">
            {locale === 'ar' ? 'بيانات المشتري' : 'Buyer Info'}
          </h4>
          <p className="font-bold text-slate-900 dark:text-slate-100">
            {order.shippingSnapshot.addressLine1}
          </p>
          <p className="text-slate-500">{order.guestEmail || 'customer@bahersilver.com'}</p>
          <p className="text-slate-500">{order.guestPhone || '+20 101 234 5678'}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
              <th className="py-2">{locale === 'ar' ? 'المنتج' : 'Item Description'}</th>
              <th className="py-2 text-center">{locale === 'ar' ? 'الكمية' : 'Qty'}</th>
              <th className="py-2 text-right">{locale === 'ar' ? 'السعر' : 'Unit Price'}</th>
              <th className="py-2 text-right">{locale === 'ar' ? 'الإجمالي' : 'Total'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="py-2.5 font-sans font-medium text-slate-900 dark:text-slate-100">
                  {item.productName}
                </td>
                <td className="py-2.5 text-center">{item.quantity}</td>
                <td className="py-2.5 text-right">{formatMoney(item.unitPrice, locale)}</td>
                <td className="py-2.5 text-right font-bold">{formatMoney(item.lineTotal, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 max-w-xs ml-auto space-y-1.5 text-xs font-mono">
        <div className="flex justify-between text-slate-500">
          <span>Subtotal:</span>
          <span>{formatMoney(pricing.subtotal, locale)}</span>
        </div>
        <div className="flex justify-between text-slate-500">
          <span>Discount:</span>
          <span>-{formatMoney(pricing.discount, locale)}</span>
        </div>
        <div className="flex justify-between text-slate-500">
          <span>Shipping:</span>
          <span>{formatMoney(pricing.shipping, locale)}</span>
        </div>
        <div className="flex justify-between text-slate-500">
          <span>Taxes (14% VAT):</span>
          <span>{formatMoney(pricing.taxes, locale)}</span>
        </div>
        <div className="flex justify-between text-sm font-bold text-amber-500 pt-2 border-t border-slate-200 dark:border-slate-800">
          <span>Invoice Total:</span>
          <span>{formatMoney(pricing.total, locale)}</span>
        </div>
      </div>
    </div>
  );
}
