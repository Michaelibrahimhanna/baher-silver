'use client';

import * as React from 'react';
import { ExternalLink, ShieldCheck, Heart, Wrench, PackageCheck, Route, FileCheck, Layers } from 'lucide-react';
import type { QRDestinationType } from '@/types/catalog';
import { generateQRRouterConfig, resolveQRDestinationUrl, ROUTER_DESTINATION_MAP } from '@/lib/qr-router';

interface Props {
  sku: string;
  slug: string;
  destinationType?: QRDestinationType;
  onDestinationChange: (newDestination: QRDestinationType) => void;
}

export function DualQRCodePreview({ sku, slug, destinationType = 'product', onDestinationChange }: Props) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://bahersilver.com';

  const routerConfig = React.useMemo(() => {
    return generateQRRouterConfig(slug, destinationType as QRDestinationType);
  }, [slug, destinationType]);

  const resolution = React.useMemo(() => {
    return resolveQRDestinationUrl(routerConfig, slug, baseUrl);
  }, [routerConfig, slug, baseUrl]);

  const routerUrl = `${baseUrl}/r/${routerConfig.router_token}`;

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Route className="h-5 w-5 text-cyan-400" />
            موجّه الـ QR الديناميكي الذكي (Dynamic QR Router System)
          </h3>
          <p className="text-xs text-slate-400">
            لا يشير رمز العميل مباشرة للمنتج أبداً، بل يمر عبر (QR → Router → Destination) لإعادة التوجيه بدون إعادة طباعة الملصقات.
          </p>
        </div>
      </div>

      {/* Extensible Router Destination Picker */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-300">
          اختر الوجهة الموجه إليها العميل (Dynamic QR Router Target):
        </label>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {[
            { id: 'product', label: 'صفحة المنتج', icon: PackageCheck, color: 'cyan' },
            { id: 'warranty', label: 'الضمان الذكي', icon: ShieldCheck, color: 'amber' },
            { id: 'authentication', label: 'توثيق الأصالة', icon: ShieldCheck, color: 'emerald' },
            { id: 'repair', label: 'مركز الصيانة', icon: Wrench, color: 'blue' },
            { id: 'certificate', label: 'شهادة الفضة', icon: FileCheck, color: 'purple' },
            { id: 'memories', label: 'Baher Memories', icon: Heart, color: 'pink', badge: 'قريباً' },
            { id: 'future_services', label: 'خدمات مخصصة', icon: Layers, color: 'indigo' },
          ].map((dest) => {
            const Icon = dest.icon;
            const isSelected = destinationType === dest.id;
            return (
              <button
                key={dest.id}
                type="button"
                onClick={() => onDestinationChange(dest.id as QRDestinationType)}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 text-center text-xs font-semibold transition-all ${
                  isSelected
                    ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300 shadow-md shadow-cyan-500/20'
                    : 'border-white/10 bg-slate-900/60 text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[11px]">{dest.label}</span>
                {dest.badge && (
                  <span className="rounded bg-pink-500/20 px-1 text-[9px] text-pink-300 border border-pink-500/30">
                    {dest.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Routing Target Status Alert */}
      {resolution.isDisabled && (
        <div className="rounded-xl border border-pink-500/30 bg-pink-500/10 p-3 text-xs font-semibold text-pink-300">
          {resolution.message}
        </div>
      )}

      {/* Dual QR Physical Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 pt-2">
        {/* Internal Staff QR */}
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-center gap-4">
          <div className="h-20 w-20 flex-shrink-0 bg-white p-1.5 rounded-xl flex items-center justify-center border border-amber-500/30">
            <svg viewBox="0 0 100 100" className="h-full w-full text-black fill-current">
              <rect x="0" y="0" width="30" height="30" />
              <rect x="70" y="0" width="30" height="30" />
              <rect x="0" y="70" width="30" height="30" />
              <rect x="40" y="40" width="20" height="20" />
              <rect x="10" y="10" width="10" height="10" fill="#fff" />
              <rect x="80" y="10" width="10" height="10" fill="#fff" />
              <rect x="10" y="80" width="10" height="10" fill="#fff" />
            </svg>
          </div>
          <div className="space-y-1">
            <span className="inline-block rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/30">
              INTERNAL STAFF QR
            </span>
            <div className="text-xs font-mono font-semibold text-white">QR-INT-{sku}</div>
            <p className="text-[11px] text-slate-400">مخصص لجرود الخزائن والتتبع الداخلي وتطبيقات الموظفين.</p>
          </div>
        </div>

        {/* Dynamic Router Customer QR */}
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 flex items-center gap-4">
          <div className="h-20 w-20 flex-shrink-0 bg-white p-1.5 rounded-xl flex items-center justify-center border border-cyan-500/30">
            <svg viewBox="0 0 100 100" className="h-full w-full text-black fill-current">
              <rect x="0" y="0" width="30" height="30" />
              <rect x="70" y="0" width="30" height="30" />
              <rect x="0" y="70" width="30" height="30" />
              <rect x="50" y="20" width="15" height="15" />
              <rect x="20" y="50" width="15" height="15" />
              <rect x="10" y="10" width="10" height="10" fill="#fff" />
              <rect x="80" y="10" width="10" height="10" fill="#fff" />
              <rect x="10" y="80" width="10" height="10" fill="#fff" />
            </svg>
          </div>
          <div className="space-y-1">
            <span className="inline-block rounded bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-400 border border-cyan-500/30">
              DYNAMIC CUSTOMER QR ROUTER
            </span>
            <div className="text-xs font-mono font-semibold text-white flex items-center gap-1">
              <span>{routerUrl}</span>
              <ExternalLink className="h-3 w-3 text-cyan-400" />
            </div>
            <p className="text-[11px] text-slate-400">
              يوجه حالياً إلى: <strong className="text-amber-300">{ROUTER_DESTINATION_MAP[destinationType as QRDestinationType]?.name_ar}</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
