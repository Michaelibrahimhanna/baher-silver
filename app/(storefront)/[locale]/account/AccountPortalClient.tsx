'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { loyaltyService, TIER_THRESHOLDS } from '@/lib/services/loyalty';
import { formatMoney, createMoney } from '@/lib/types/money';
import { AddressForm } from '@/components/checkout/AddressForm';
import {
  Award,
  Gift,
  Package,
  MapPin,
  Share2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface AccountPortalClientProps {
  locale?: string;
}

export function AccountPortalClient({ locale = 'en' }: AccountPortalClientProps) {
  const profile = loyaltyService.getDemoProfile();
  const currentTierInfo = TIER_THRESHOLDS[profile.tier];
  
  const [pointsInput, setPointsInput] = useState(500);
  const [redemptionNotice, setRedemptionNotice] = useState<string | null>(null);

  const handleRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    const res = loyaltyService.redeemPoints(profile, pointsInput, 'EGP');
    if (res.success) {
      setRedemptionNotice(
        locale === 'ar'
          ? `تم استبدال ${res.pointsRedeemed} نقطة بنجاح بخصم قدره ${formatMoney(res.discountMoney, locale)}!`
          : `Successfully redeemed ${res.pointsRedeemed} points for a ${formatMoney(res.discountMoney, locale)} coupon discount!`
      );
    } else {
      setRedemptionNotice(res.errorMessage || 'Redemption error');
    }
  };

  const DEMO_ORDERS = [
    {
      orderNumber: 'BS-2026-000089',
      date: '2026-07-20',
      total: createMoney(1282.5, 'EGP'),
      status: 'Delivered',
      itemsCount: 1,
    },
    {
      orderNumber: 'BS-2026-000042',
      date: '2026-06-14',
      total: createMoney(2450.0, 'EGP'),
      status: 'Delivered',
      itemsCount: 2,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 text-slate-800 dark:text-slate-100 space-y-8">
      {/* HEADER HERO */}
      <div className="p-8 bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-950 border border-amber-500/30 rounded-3xl space-y-3 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 font-extrabold flex items-center justify-center text-xl ring-4 ring-amber-500/10">
              AV
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                {profile.customerName}
              </h1>
              <p className="text-xs text-slate-400">{profile.email}</p>
            </div>
          </div>
          <div className="px-3.5 py-1.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 font-extrabold text-xs rounded-full uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-4 h-4" />
            <span>{profile.tier} VIP Tier</span>
          </div>
        </div>

        {/* TIER PROGRESS BAR */}
        <div className="pt-4 space-y-2">
          <div className="flex justify-between text-xs text-slate-300">
            <span>
              {locale === 'ar' ? 'مستوى الولاء:' : 'Current Perk:'}{' '}
              <strong className="text-amber-400">
                {locale === 'ar' ? currentTierInfo.perkAr : currentTierInfo.perkEn}
              </strong>
            </span>
            <span className="font-mono text-amber-400">{profile.pointsBalance} / 2500 Pts</span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (profile.pointsBalance / 2500) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* REWARDS & REDEMPTION (Left 7 Columns) */}
        <div className="lg:col-span-7 space-y-6">
          {/* LOYALTY REWARDS WIDGET */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-500" />
                <h2 className="font-bold text-base">
                  {locale === 'ar' ? 'استبدال نقاط الولاء والمكافآت' : 'Loyalty Rewards Engine'}
                </h2>
              </div>
              <span className="text-xs font-mono font-bold text-amber-500">
                100 Pts = 50 EGP
              </span>
            </div>

            <p className="text-xs text-slate-500">
              {locale === 'ar'
                ? 'يكسب كل طلب نقاطاً تلقائية. يمكنك تحويل النقاط المتاحة إلى كوبون خصم فوري على سلتك.'
                : 'Earn points automatically on every purchase. Convert points into instant store discount coupons.'}
            </p>

            {redemptionNotice && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 font-medium">
                {redemptionNotice}
              </div>
            )}

            <form onSubmit={handleRedeem} className="flex gap-3">
              <div className="relative flex-1">
                <Sparkles className="w-4 h-4 text-amber-500 absolute left-3 top-3" />
                <input
                  type="number"
                  step="100"
                  min="100"
                  max={profile.pointsBalance}
                  value={pointsInput}
                  onChange={(e) => setPointsInput(Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                {locale === 'ar' ? 'استبدال الآن' : 'Redeem Coupon'}
              </button>
            </form>
          </div>

          {/* SAVED ADDRESSES */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <MapPin className="w-5 h-5 text-amber-500" />
              <h2 className="font-bold text-base">
                {locale === 'ar' ? 'عناوين الشحن والتوصيل المحفوظة' : 'Saved Shipping Addresses'}
              </h2>
            </div>

            <AddressForm locale={locale} />
          </div>
        </div>

        {/* ORDER HISTORY & REFERRAL (Right 5 Columns) */}
        <div className="lg:col-span-5 space-y-6">
          {/* ORDER HISTORY */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-500" />
                <h2 className="font-bold text-base">
                  {locale === 'ar' ? 'سجل الطلبات والتتبع' : 'Order History & Tracking'}
                </h2>
              </div>
            </div>

            <div className="space-y-3">
              {DEMO_ORDERS.map((ord) => (
                <div
                  key={ord.orderNumber}
                  className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-amber-500">{ord.orderNumber}</span>
                    <p className="text-slate-500 text-[11px] mt-0.5">{ord.date}</p>
                    <p className="font-mono font-bold text-slate-900 dark:text-slate-100 mt-1">
                      {formatMoney(ord.total, locale)}
                    </p>
                  </div>
                  <Link
                    href={`/${locale}/checkout/success/${ord.orderNumber}`}
                    className="p-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                  >
                    <span>{locale === 'ar' ? 'تتبع الطلب' : 'Track'}</span>
                    <ChevronRight className={`w-3.5 h-3.5 ${locale === 'ar' ? 'rotate-180' : ''}`} />
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* REFERRAL PROGRAM */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Share2 className="w-5 h-5 text-amber-500" />
              <h2 className="font-bold text-base">
                {locale === 'ar' ? 'برنامج الإحالة والمشاركة' : 'Referral Program'}
              </h2>
            </div>

            <p className="text-xs text-slate-500">
              {locale === 'ar'
                ? 'شارك كود الإحالة الخاص بك مع أصدقائك. ستحصل على 500 نقطة ولاء عند إتمام أول طلب لهم!'
                : 'Share your referral code. Earn 500 bonus points whenever a friend completes their first order!'}
            </p>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between font-mono text-xs">
              <span className="font-extrabold text-amber-500">{profile.referralCode}</span>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(profile.referralCode)}
                className="px-2.5 py-1 bg-amber-500 text-slate-950 font-bold rounded text-[11px] hover:bg-amber-600 transition-colors cursor-pointer"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
