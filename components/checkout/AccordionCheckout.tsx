'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useStore } from '@/lib/store';
import { formatMoney, createMoney } from '@/lib/types/money';
import { featureFlagService } from '@/lib/services/featureFlags';
import { paymentService, PaymentProviderType } from '@/lib/services/payment';
import { AddressForm } from './AddressForm';
import { CheckoutFailureAlert } from './CheckoutFailureAlert';
import { MobileCheckoutFooter } from './MobileCheckoutFooter';
import {
  ChevronDown,
  Lock,
  Tag,
  ShieldCheck,
  Clock,
  Smartphone,
  CreditCard,
  QrCode,
  CalendarDays,
  Banknote,
  Send,
} from 'lucide-react';

interface AccordionCheckoutProps {
  locale?: string;
}

export function AccordionCheckout({ locale = 'en' }: AccordionCheckoutProps) {
  const router = useRouter();
  const {
    cart,
    couponCode,
    applyCoupon,
    currency,
    checkout,
    updateContactInfo,
    setPaymentMethod,
    setFailureState,
    setActiveOrder,
    getPricingBreakdown,
  } = useStore();

  const [couponInput, setCouponInput] = useState(couponCode);
  const [openSection, setOpenSection] = useState<'contact' | 'address' | 'payment' | 'review'>('contact');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const breakdown = getPricingBreakdown();
  const flags = featureFlagService.getFlags();

  // Dynamic automatic filtering based on country (EG or international) and currency
  const availableProviderNames = paymentService.getAvailableProviders('EG', currency);

  const handlePlaceOrder = async () => {
    setIsSubmitting(true);
    setFailureState(undefined);

    const idempotencyKey = `idempotent-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      const response = await fetch('/api/checkout/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartItems: cart,
          shippingAddress: checkout.shippingAddress,
          paymentMethod: checkout.paymentMethod,
          isGuest: checkout.isGuest,
          customerEmail: checkout.guestEmail,
          customerPhone: checkout.guestPhone,
          couponCode,
          currency,
          idempotencyKey,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFailureState(data.error || 'declined');
        setIsSubmitting(false);
        return;
      }

      if (data.success && data.order) {
        setActiveOrder(data.order);
        router.push(`/${locale}/checkout/success/${data.order.orderNumber}`);
      }
    } catch {
      setFailureState('network');
      setIsSubmitting(false);
    }
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (couponInput) applyCoupon(couponInput);
  };

  const PAYMENT_OPTIONS: {
    type: PaymentProviderType;
    flagKey: keyof typeof flags;
    nameEn: string;
    nameAr: string;
    badgeEn: string;
    badgeAr: string;
    badgeColor: string;
    descEn: string;
    descAr: string;
    icon: React.ReactNode;
  }[] = [
    {
      type: 'Paymob',
      flagKey: 'paymob',
      nameEn: 'Paymob',
      nameAr: 'باي موب',
      badgeEn: 'Primary Gateway',
      badgeAr: 'البوابة الرئيسية',
      badgeColor: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
      descEn: 'Credit / Debit Cards, Mobile Wallets',
      descAr: 'بطاقات ائتمانية ومحفظة المحمول',
      icon: <CreditCard className="w-5 h-5 text-amber-500" />,
    },
    {
      type: 'VodafoneCash',
      flagKey: 'vodafoneCash',
      nameEn: 'Vodafone Cash',
      nameAr: 'فودافون كاش',
      badgeEn: 'Mobile Wallet',
      badgeAr: 'محفظة إلكترونية',
      badgeColor: 'bg-red-500/20 text-red-600 dark:text-red-400',
      descEn: 'Instant payment via 010 mobile wallet',
      descAr: 'دفع فوري عبر محفظة 010 كاش',
      icon: <Smartphone className="w-5 h-5 text-red-500" />,
    },
    {
      type: 'InstaPay',
      flagKey: 'instaPay',
      nameEn: 'InstaPay IPN',
      nameAr: 'إنستا باي IPN',
      badgeEn: 'Instant Bank Transfer',
      badgeAr: 'تحويل بنكي فوري',
      badgeColor: 'bg-teal-500/20 text-teal-600 dark:text-teal-400',
      descEn: 'Instant 24/7 bank transfer to @instapay IPA',
      descAr: 'تحويل فوري على مدار 24 ساعة عبر إنستاباي',
      icon: <Send className="w-5 h-5 text-teal-500" />,
    },
    {
      type: 'Meeza',
      flagKey: 'meeza',
      nameEn: 'Meeza National Card',
      nameAr: 'بطاقات ميزة الوطنية',
      badgeEn: 'National Scheme',
      badgeAr: 'بطاقة إلكترونية وطنية',
      badgeColor: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
      descEn: 'Egyptian Meeza cards & digital wallets',
      descAr: 'بطاقات ميزة المصرية والمحفظة الوطنية',
      icon: <CreditCard className="w-5 h-5 text-emerald-500" />,
    },
    {
      type: 'Stripe',
      flagKey: 'stripe',
      nameEn: 'Stripe Global',
      nameAr: 'سترايب العالمي',
      badgeEn: 'Global Cards',
      badgeAr: 'بطاقات عالمية',
      badgeColor: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
      descEn: 'International Visa & Mastercard',
      descAr: 'بطاقات الفيزا والماستركارد الدولية',
      icon: <CreditCard className="w-5 h-5 text-indigo-500" />,
    },
    {
      type: 'ApplePay',
      flagKey: 'applePay',
      nameEn: 'Apple Pay',
      nameAr: 'أبل باي',
      badgeEn: '1-Touch Wallet',
      badgeAr: 'دفع بنقرة واحدة',
      badgeColor: 'bg-slate-500/20 text-slate-700 dark:text-slate-300',
      descEn: 'Express checkout via Apple Wallet',
      descAr: 'دفع سريع عبر محفظة أبل',
      icon: <Lock className="w-5 h-5 text-slate-300" />,
    },
    {
      type: 'GooglePay',
      flagKey: 'googlePay',
      nameEn: 'Google Pay',
      nameAr: 'جوجل باي',
      badgeEn: '1-Touch Wallet',
      badgeAr: 'دفع بنقرة واحدة',
      badgeColor: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
      descEn: 'Fast Google account checkout',
      descAr: 'دفع سريع عبر حساب جوجل',
      icon: <Lock className="w-5 h-5 text-blue-400" />,
    },
    {
      type: 'Fawry',
      flagKey: 'fawry',
      nameEn: 'Fawry Pay',
      nameAr: 'فوراي باي',
      badgeEn: 'Kiosk Reference Code',
      badgeAr: 'كود الدفع بـ فوراي',
      badgeColor: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
      descEn: 'Pay at any Fawry retail outlet',
      descAr: 'الدفع بكود مرجعي في أي منفذ فوراي',
      icon: <QrCode className="w-5 h-5 text-yellow-500" />,
    },
    {
      type: 'ValU',
      flagKey: 'valu',
      nameEn: 'ValU BNPL',
      nameAr: 'فاليو التقسيط',
      badgeEn: 'Installments',
      badgeAr: 'تقسيط بدون فوائد',
      badgeColor: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
      descEn: 'Buy Now, Pay in Flexible Installments',
      descAr: 'اشترِ الآن وادفع على أقساط مريحة',
      icon: <CalendarDays className="w-5 h-5 text-emerald-500" />,
    },
    {
      type: 'COD',
      flagKey: 'cod',
      nameEn: 'Cash on Delivery',
      nameAr: 'الدفع عند الاستلام',
      badgeEn: 'Local Cash',
      badgeAr: 'دفع نقدي',
      badgeColor: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
      descEn: 'Pay cash upon package arrival',
      descAr: 'الدفع نقداً عند باب البيت',
      icon: <Banknote className="w-5 h-5 text-emerald-400" />,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 text-slate-800 dark:text-slate-100">
      {/* Autosave Progress Notice */}
      {checkout.lastAutosavedAt && (
        <div className="mb-4 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-500" />
            <span>
              {locale === 'ar'
                ? 'تم الحفظ التلقائي لتقدمك في عملية الشراء.'
                : 'Your checkout progress is automatically saved.'}
            </span>
          </div>
          <span className="font-mono text-[11px] opacity-75">
            {new Date(checkout.lastAutosavedAt).toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* Failure State Alert with Recovery Flow */}
      {checkout.failureReason && (
        <CheckoutFailureAlert
          reason={checkout.failureReason}
          onRetry={handlePlaceOrder}
          onChangePaymentMethod={(provider) => {
            setPaymentMethod(provider);
            setFailureState(undefined);
          }}
          locale={locale}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ACCORDION CHECKOUT FORM (Left 7 Columns) */}
        <div className="lg:col-span-7 space-y-4">
          <h1 className="text-2xl font-extrabold tracking-tight mb-4 flex items-center gap-2">
            <Lock className="w-6 h-6 text-amber-500" />
            {locale === 'ar' ? 'الدفع السريع والتأمين Enterprise' : 'Accordion Enterprise Checkout'}
          </h1>

          {/* SECTION 1: CONTACT INFO */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/70 shadow-sm">
            <button
              type="button"
              onClick={() => setOpenSection(openSection === 'contact' ? 'address' : 'contact')}
              className="w-full px-5 py-4 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 font-bold flex items-center justify-center text-sm">
                  1
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {locale === 'ar' ? 'بيانات التواصل (زائر / حساب)' : 'Contact & Identification'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {checkout.guestEmail || (locale === 'ar' ? 'أدخل بريدك الإلكتروني' : 'Enter email for receipt')}
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`w-5 h-5 transition-transform ${openSection === 'contact' ? 'rotate-180' : ''}`}
              />
            </button>

            {openSection === 'contact' && (
              <div className="p-5 space-y-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => updateContactInfo(checkout.guestEmail, checkout.guestPhone, true)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      checkout.isGuest
                        ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    {locale === 'ar' ? 'متابعة كزائر (Guest)' : 'Guest Checkout'}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateContactInfo(checkout.guestEmail, checkout.guestPhone, false)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      !checkout.isGuest
                        ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    {locale === 'ar' ? 'تسجيل الدخول (Sign In)' : 'Sign In to Account'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">
                      {locale === 'ar' ? 'البريد الإلكتروني' : 'Email Address'} *
                    </label>
                    <input
                      type="email"
                      required
                      inputMode="email"
                      autoComplete="email"
                      placeholder="alex.vance@example.com"
                      value={checkout.guestEmail}
                      onChange={(e) => updateContactInfo(e.target.value, checkout.guestPhone, checkout.isGuest)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">
                      {locale === 'ar' ? 'رقم المحمول للتنبيهات' : 'Mobile Phone'} *
                    </label>
                    <input
                      type="tel"
                      required
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="+20 101 234 5678"
                      value={checkout.guestPhone}
                      onChange={(e) => updateContactInfo(checkout.guestEmail, e.target.value, checkout.isGuest)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setOpenSection('address')}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  {locale === 'ar' ? 'الانتقال إلى عنوان الشحن' : 'Continue to Shipping Address'}
                </button>
              </div>
            )}
          </div>

          {/* SECTION 2: SHIPPING ADDRESS & ZONES */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/70 shadow-sm">
            <button
              type="button"
              onClick={() => setOpenSection(openSection === 'address' ? 'payment' : 'address')}
              className="w-full px-5 py-4 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 font-bold flex items-center justify-center text-sm">
                  2
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {locale === 'ar' ? 'عنوان الشحن وإقليم التوصيل' : 'Shipping Address & Zone'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {checkout.shippingAddress.addressLine1
                      ? `${checkout.shippingAddress.city}, ${checkout.shippingAddress.governorate}`
                      : locale === 'ar'
                      ? 'حدد موقعك لحساب رسوم الشحن'
                      : 'Set address to calculate zone rates'}
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`w-5 h-5 transition-transform ${openSection === 'address' ? 'rotate-180' : ''}`}
              />
            </button>

            {openSection === 'address' && (
              <div className="p-5 border-t border-slate-100 dark:border-slate-800">
                <AddressForm onSave={() => setOpenSection('payment')} locale={locale} />
              </div>
            )}
          </div>

          {/* SECTION 3: MODULAR PROVIDER-AGNOSTIC PAYMENT METHODS WITH DYNAMIC AUTOMATIC FILTERING */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/70 shadow-sm">
            <button
              type="button"
              onClick={() => setOpenSection(openSection === 'payment' ? 'review' : 'payment')}
              className="w-full px-5 py-4 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 font-bold flex items-center justify-center text-sm">
                  3
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {locale === 'ar' ? 'وسائل الدفع المؤمّنة' : 'Provider-Agnostic Payment Method'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Active Gateway: <strong className="text-amber-500">{checkout.paymentMethod}</strong> ({currency})
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`w-5 h-5 transition-transform ${openSection === 'payment' ? 'rotate-180' : ''}`}
              />
            </button>

            {openSection === 'payment' && (
              <div className="p-5 space-y-4 border-t border-slate-100 dark:border-slate-800">
                {/* Auto-filtering notice */}
                <div className="p-2.5 bg-slate-100 dark:bg-slate-800/60 rounded-lg text-xs text-slate-400 flex items-center justify-between">
                  <span>
                    {locale === 'ar'
                      ? `تم تخصيص وسائل الدفع تلقائياً حسب عملتك المختارة (${currency}).`
                      : `Payment options automatically filtered for ${currency} currency & regional context.`}
                  </span>
                  <span className="font-mono font-bold text-[10px] text-amber-400">{availableProviderNames.length} Available</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PAYMENT_OPTIONS
                    .filter(opt => flags[opt.flagKey] && availableProviderNames.includes(opt.type))
                    .map((option) => (
                      <div
                        key={option.type}
                        onClick={() => setPaymentMethod(option.type)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          checkout.paymentMethod === option.type
                            ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {option.icon}
                            <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                              {locale === 'ar' ? option.nameAr : option.nameEn}
                            </span>
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${option.badgeColor}`}>
                            {locale === 'ar' ? option.badgeAr : option.badgeEn}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-2.5">
                          {locale === 'ar' ? option.descAr : option.descEn}
                        </p>
                      </div>
                    ))}
                </div>

                <button
                  type="button"
                  onClick={() => setOpenSection('review')}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  {locale === 'ar' ? 'الانتقال إلى مراجعة الطلب' : 'Continue to Order Review'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ORDER SUMMARY & PRICING (Right 5 Columns) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl sticky top-6">
            <h3 className="font-extrabold text-lg mb-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span>{locale === 'ar' ? 'ملخص المنتجات والأصل' : 'Order Summary'}</span>
              <span className="text-xs font-normal text-slate-500">
                {cart.length} {locale === 'ar' ? 'عنصر' : 'items'}
              </span>
            </h3>

            {/* Cart Items List */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                    <Image
                      src={item.product.image || '/placeholder.jpg'}
                      alt={item.product.name.en}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate text-slate-900 dark:text-slate-100">
                      {locale === 'ar' ? item.product.name.ar : item.product.name.en}
                    </p>
                    <p className="text-[11px] text-slate-500">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-xs font-extrabold font-mono">
                    {formatMoney(createMoney(item.product.price * item.quantity, currency), locale)}
                  </div>
                </div>
              ))}
            </div>

            {/* Conditional Coupon Code Form */}
            <form onSubmit={handleApplyCoupon} className="mt-6 flex gap-2">
              <div className="relative flex-1">
                <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Coupon code (e.g. SILVER10)"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                {locale === 'ar' ? 'تطبيق' : 'Apply'}
              </button>
            </form>

            {breakdown.couponErrorMessage && (
              <p className="text-[11px] text-red-500 mt-1">{breakdown.couponErrorMessage}</p>
            )}

            {/* Pricing Breakdown Summary */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>{locale === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}</span>
                <span className="font-mono">{formatMoney(breakdown.subtotal, locale)}</span>
              </div>

              {breakdown.discount.amountInCents > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>{locale === 'ar' ? 'خصم الكوبون' : 'Coupon Discount'}</span>
                  <span className="font-mono">-{formatMoney(breakdown.discount, locale)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>{locale === 'ar' ? 'رسوم الشحن (منطقة ' + checkout.shippingAddress.governorate + ')' : 'Shipping Fee'}</span>
                <span className="font-mono">
                  {breakdown.isFreeShipping ? (
                    <span className="text-emerald-500 font-bold">FREE</span>
                  ) : (
                    formatMoney(breakdown.shippingFee, locale)
                  )}
                </span>
              </div>

              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>{locale === 'ar' ? 'ضريبة القيمة المضافة (١٤٪ VAT)' : 'Taxes (14% Standard VAT)'}</span>
                <span className="font-mono">{formatMoney(breakdown.taxAmount, locale)}</span>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between text-base font-extrabold text-slate-900 dark:text-slate-100">
                <span>{locale === 'ar' ? 'المجموع الإجمالي' : 'Total Amount'}</span>
                <span className="font-mono text-amber-500 text-lg">
                  {formatMoney(breakdown.total, locale)}
                </span>
              </div>
            </div>

            {/* Main Action CTA */}
            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={isSubmitting || cart.length === 0}
              className="mt-6 w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>
                {isSubmitting
                  ? (locale === 'ar' ? 'جاري معالجة الطلب...' : 'Processing Order...')
                  : (locale === 'ar' ? 'تأكيد وإتمام الطلب' : 'Place Order & Pay')}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Footer Integration */}
      <MobileCheckoutFooter onActionClick={handlePlaceOrder} locale={locale} />
    </div>
  );
}
