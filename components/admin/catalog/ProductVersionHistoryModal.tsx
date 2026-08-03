'use client';

import * as React from 'react';
import { X, History, RotateCcw, CheckCircle2, Clock, User } from 'lucide-react';
import type { Product, ProductVersion } from '@/types/catalog';
import { restoreProductVersion } from '@/lib/product-versioning';

interface ProductVersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  onRestore: (restoredProduct: Product) => void;
}

export function ProductVersionHistoryModal({
  isOpen,
  onClose,
  product,
  onRestore,
}: ProductVersionHistoryModalProps) {
  const versions = product.version_history || [];
  const [restoredSuccess, setRestoredSuccess] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleRestore = (versionId: string) => {
    try {
      const restored = restoreProductVersion(product, versionId);
      onRestore(restored);
      setRestoredSuccess(`تم استعادة النسخة الإصدارية [${versionId}] بنجاح!`);
      setTimeout(() => setRestoredSuccess(null), 3500);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950 text-white shadow-2xl">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-black/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <History className="h-5 w-5 text-amber-400" />
            <div>
              <h2 className="text-base font-bold tracking-tight text-white">
                سجل الإصدارات واستعادة النسخ (Product Version History)
              </h2>
              <p className="text-xs text-slate-400">
                يتم إنشاء نسخة احتياطية جديدة مع كل عملية حفظ تلقائية أو يدوية للمنتج.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-slate-400 hover:bg-white/10 hover:text-white transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {restoredSuccess && (
          <div className="m-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{restoredSuccess}</span>
          </div>
        )}

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {versions.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 p-8 text-center text-slate-400">
              <Clock className="h-10 w-10 text-slate-600 mb-2" />
              <p className="text-sm font-semibold">لا توجد إصدارات سابقة محفوظة لهذا المنتج بعد.</p>
              <p className="text-xs text-slate-500 mt-1">احفظ المنتج لتوليد النسخة الإصدارية الأولى تلقائياً.</p>
            </div>
          ) : (
            versions.map((ver: ProductVersion) => (
              <div
                key={ver.version_id}
                className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between hover:border-amber-500/30 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-300 border border-amber-500/30">
                      Version #{ver.version_number}
                    </span>
                    <span className="font-mono text-xs text-slate-400">{ver.version_id}</span>
                  </div>

                  <p className="text-sm font-bold text-white mt-1">{ver.snapshot.name_ar}</p>
                  <p className="text-xs text-slate-400 font-mono">
                    السعر: <span className="text-emerald-400">{ver.snapshot.selling_price} EGP</span> | المخزون: <span className="text-cyan-400">{ver.snapshot.current_stock}</span>
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-500" />
                      {new Date(ver.created_at).toLocaleString('ar-EG')}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3 text-slate-500" />
                      {ver.created_by}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRestore(ver.version_id)}
                    className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-black hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    استعادة هذا الإصدار (Restore)
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
