'use client';

import * as React from 'react';
import { X, Monitor, Tablet, Smartphone, Globe, ShoppingBag, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import type { Product } from '@/types/catalog';

interface LiveProductPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
}

export function LiveProductPreviewModal({ isOpen, onClose, product }: LiveProductPreviewModalProps) {
  const [device, setDevice] = React.useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [lang, setLang] = React.useState<'ar' | 'en'>('ar');

  if (!isOpen) return null;

  const isAr = lang === 'ar';
  const name = isAr ? product.name_ar : product.name_en;
  const description = isAr ? (product.description_ar || product.short_description_ar) : (product.description_en || product.short_description_en);

  const containerWidthClass =
    device === 'desktop'
      ? 'w-full max-w-5xl'
      : device === 'tablet'
      ? 'w-[768px]'
      : 'w-[375px]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950 text-white shadow-2xl">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-white/10 bg-black/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <h2 className="text-base font-bold tracking-tight">
              معاينة المتجر الحية المباشرة (Live Product Preview)
            </h2>
          </div>

          {/* Viewport & Locale Selectors */}
          <div className="flex items-center gap-3">
            {/* Device Switcher */}
            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/40 p-1">
              <button
                type="button"
                onClick={() => setDevice('desktop')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  device === 'desktop' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
                Desktop
              </button>
              <button
                type="button"
                onClick={() => setDevice('tablet')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  device === 'tablet' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Tablet className="h-3.5 w-3.5" />
                Tablet
              </button>
              <button
                type="button"
                onClick={() => setDevice('mobile')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  device === 'mobile' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                Mobile
              </button>
            </div>

            {/* Language Switcher */}
            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/40 p-1">
              <button
                type="button"
                onClick={() => setLang('ar')}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  lang === 'ar' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Globe className="h-3.5 w-3.5" />
                العربية (AR)
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  lang === 'en' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Globe className="h-3.5 w-3.5" />
                English (EN)
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-slate-400 hover:bg-white/10 hover:text-white transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Dynamic Viewport Container */}
        <div className="flex-1 overflow-y-auto bg-slate-900/50 p-6">
          <div className={`mx-auto transition-all duration-300 ${containerWidthClass}`}>
            <div
              dir={isAr ? 'rtl' : 'ltr'}
              className="overflow-hidden rounded-3xl border border-white/10 bg-black/80 p-8 shadow-2xl backdrop-blur-xl"
            >
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                {/* Media Image Showcase */}
                <div className="space-y-4">
                  <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={product.primary_image || 'https://images.unsplash.com/photo-1605100804763-247f6612d543?q=80&w=800'}
                      alt={name}
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                    <span className="absolute top-4 right-4 rounded-full border border-amber-500/40 bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300 backdrop-blur-md">
                      925 Sterling Silver
                    </span>
                  </div>

                  {/* Thumbnail Strip Placeholder */}
                  {product.media_urls && product.media_urls.length > 0 && (
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {product.media_urls.map((url, idx) => (
                        <div key={idx} className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-white/10 bg-slate-950">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" className="h-full w-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Product Detail Information */}
                <div className="space-y-6">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                      {product.category_name || 'Rings Collection'}
                    </span>
                    <h1 className="mt-1 text-2xl font-black text-white">{name}</h1>
                    <p className="mt-1 text-xs font-mono text-slate-400">
                      SKU: <span className="text-emerald-400">{product.sku}</span>
                    </p>
                  </div>

                  {/* Price Section */}
                  <div className="flex items-baseline gap-3 border-y border-white/10 py-4">
                    <span className="text-3xl font-black text-emerald-400">
                      {product.selling_price} EGP
                    </span>
                    {product.sale_price && (
                      <span className="text-sm font-semibold text-slate-500 line-through">
                        {product.sale_price} EGP
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs leading-relaxed text-slate-300">
                    {description || 'لا يوجد وصف متاح لهذا المنتج حالياً.'}
                  </p>

                  {/* Specifications Grid */}
                  {product.specifications && product.specifications.length > 0 && (
                    <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                      <h4 className="text-xs font-bold text-slate-200">
                        {isAr ? 'المواصفات والخصائص' : 'Product Specifications'}
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {product.specifications.map((spec) => (
                          <div key={spec.id} className="rounded-lg bg-black/40 p-2">
                            <span className="block text-[10px] text-slate-400">
                              {isAr ? spec.key_ar : spec.key_en}
                            </span>
                            <span className="font-semibold text-white">
                              {isAr ? spec.value_ar : spec.value_en}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add to Cart CTA */}
                  <div className="space-y-3 pt-2">
                    <button
                      type="button"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-3.5 text-xs font-extrabold text-black shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.01]"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      {isAr ? 'أضف إلى حقيبة التسوق' : 'Add to Shopping Bag'}
                    </button>

                    <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                        {isAr ? 'ضمان الفضة الأصلي' : 'Lifetime Silver Guarantee'}
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
                        {isAr ? 'شحن فوري سريع' : 'Fast Nationwide Shipping'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
