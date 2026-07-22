'use client';

import React from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { OrderTimeline } from '@/components/checkout/OrderTimeline';
import { InvoicePlaceholder } from '@/components/checkout/InvoicePlaceholder';
import { QRReceiptPlaceholder } from '@/components/checkout/QRReceiptPlaceholder';
import { CheckCircle2, Mail, ArrowLeft } from 'lucide-react';
import { OrderAggregate } from '@/lib/types/orderAggregate';
import { createMoney } from '@/lib/types/money';

interface OrderSuccessClientProps {
  orderIdParam: string;
  locale?: string;
}

const STATIC_TIMESTAMP = '2026-07-22T02:00:00.000Z';

export function OrderSuccessClient({ orderIdParam, locale = 'en' }: OrderSuccessClientProps) {
  const { checkout } = useStore();

  const order: OrderAggregate = checkout.activeOrder || {
    id: 'ord-demo-891',
    orderNumber: orderIdParam.startsWith('BS-') ? orderIdParam : `BS-2026-000001`,
    status: 'Paid',
    isGuest: true,
    guestEmail: checkout.guestEmail || 'alex.vance@example.com',
    guestPhone: checkout.guestPhone || '+201012345678',
    items: [
      {
        id: 'prod-silver-necklace-1',
        productId: 'prod-silver-necklace-1',
        productName: 'Pharaonic Ankh Silver Pendant',
        productImage: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
        sku: 'BS-NCK-925-01',
        unitPrice: createMoney(1250, 'EGP'),
        quantity: 1,
        lineTotal: createMoney(1250, 'EGP'),
      },
    ],
    pricingSnapshot: {
      subtotal: createMoney(1250, 'EGP'),
      discount: createMoney(125, 'EGP'),
      shipping: createMoney(0, 'EGP'),
      taxes: createMoney(157.5, 'EGP'),
      total: createMoney(1282.5, 'EGP'),
      exchangeRate: 1,
      currency: 'EGP',
      calculatedAt: STATIC_TIMESTAMP,
    },
    shippingSnapshot: {
      zoneId: 'zone-1',
      zoneName: 'Greater Cairo Zone',
      governorate: 'Cairo',
      addressLine1: 'Building 42, 90th Street North',
      city: 'New Cairo',
      carrierId: 'bosta',
      carrierName: 'Bosta Express',
      trackingNumber: 'BST-89241029',
      baseRate: createMoney(50, 'EGP'),
      freeShippingApplied: true,
    },
    payments: [
      {
        paymentAttemptId: 'att-9812',
        idempotencyKey: 'idemp-89124',
        provider: 'Paymob',
        providerReference: 'PAYMOB-TXN-892104',
        amount: createMoney(1282.5, 'EGP'),
        status: 'Success',
        retryCount: 0,
        createdAt: STATIC_TIMESTAMP,
        updatedAt: STATIC_TIMESTAMP,
      },
    ],
    shipments: [],
    stateHistory: [
      {
        id: 'tr-1',
        timestamp: '2026-07-22T01:55:00.000Z',
        fromState: 'Draft',
        toState: 'Pending',
        actor: 'Customer Checkout',
      },
      {
        id: 'tr-2',
        timestamp: STATIC_TIMESTAMP,
        fromState: 'Pending',
        toState: 'Paid',
        actor: 'Paymob Webhook Gateway',
      },
    ],
    createdAt: STATIC_TIMESTAMP,
    updatedAt: STATIC_TIMESTAMP,
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 text-slate-800 dark:text-slate-100 space-y-8">
      {/* SUCCESS HEADER */}
      <div className="p-8 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-950 border border-emerald-500/30 rounded-3xl text-center space-y-4 shadow-2xl">
        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-500/10">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          {locale === 'ar' ? 'تم تأكيد طلبك بنجاح!' : 'Order Placed Successfully!'}
        </h1>
        <p className="text-sm text-slate-300">
          {locale === 'ar' ? 'رقم الطلب التجاري:' : 'Business Order Number:'}{' '}
          <strong className="text-amber-400 font-mono text-base">{order.orderNumber}</strong>
        </p>

        {/* Email Confirmation Notice */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-full text-xs text-slate-300">
          <Mail className="w-4 h-4 text-amber-400" />
          <span>
            {locale === 'ar'
              ? `تم إرسال تأكيد الفاتورة إلى ${order.guestEmail}`
              : `Confirmation email dispatched to ${order.guestEmail}`}
          </span>
        </div>
      </div>

      {/* LIVE ORDER STATE TIMELINE */}
      <OrderTimeline
        currentStatus={order.status}
        stateHistory={order.stateHistory}
        locale={locale}
      />

      {/* PRINTABLE INVOICE PLACEHOLDER */}
      <InvoicePlaceholder order={order} locale={locale} />

      {/* SIGNED ZATCA QR RECEIPT PLACEHOLDER */}
      <QRReceiptPlaceholder order={order} locale={locale} />

      {/* RETURN HOME CTA */}
      <div className="text-center pt-4">
        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-sm transition-all cursor-pointer shadow-lg"
        >
          <ArrowLeft className={`w-4 h-4 ${locale === 'ar' ? 'rotate-180' : ''}`} />
          <span>{locale === 'ar' ? 'العودة للمتجر والكتالوج' : 'Return to Catalog'}</span>
        </Link>
      </div>
    </div>
  );
}
