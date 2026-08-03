'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Package, ShoppingCart, User, Archive, QrCode, FileText, Settings, ExternalLink } from 'lucide-react';
import { GlobalSearchService, GlobalSearchResultItem } from '@/lib/services/globalSearch';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const results = GlobalSearchService.search(query);

  if (!isOpen) return null;

  const getCategoryIcon = (category: GlobalSearchResultItem['category']) => {
    switch (category) {
      case 'product': return <Package className="h-4 w-4 text-amber-400" />;
      case 'order': return <ShoppingCart className="h-4 w-4 text-cyan-400" />;
      case 'customer': return <User className="h-4 w-4 text-emerald-400" />;
      case 'inventory': return <Archive className="h-4 w-4 text-purple-400" />;
      case 'qr_code': return <QrCode className="h-4 w-4 text-pink-400" />;
      case 'invoice': return <FileText className="h-4 w-4 text-blue-400" />;
      case 'setting': return <Settings className="h-4 w-4 text-slate-400" />;
      default: return <Search className="h-4 w-4 text-amber-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 p-4 pt-16 backdrop-blur-md">
      <div className="flex h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950 text-white shadow-2xl animate-in fade-in duration-200">
        {/* Top Search Input */}
        <div className="flex items-center gap-3 border-b border-white/10 px-6 py-4 bg-black/40">
          <Search className="h-5 w-5 text-amber-400" />
          <input
            type="text"
            autoFocus
            placeholder="البحث الشامل عبر المنتجات، الطلبات، العملاء، المخزون، الموردين، والـ QR..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Results Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {query.trim().length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center text-slate-500">
              <Search className="h-10 w-10 text-slate-700 mb-2" />
              <p className="text-xs">اكتب أي كلمة للبحث الفوري عبر كافة قطاعات المنظومة.</p>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              لا توجد نتائج مطابقة لـ &quot;{query}&quot;
            </div>
          ) : (
            results.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  router.push(item.url);
                  onClose();
                }}
                className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/5 bg-black/40 p-4 transition-all hover:border-amber-500/40 hover:bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 border border-white/10">
                    {getCategoryIcon(item.category)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white">{item.title}</h4>
                      {item.badge && (
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold text-amber-300 border border-amber-500/30">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">{item.subtitle}</p>
                  </div>
                </div>

                <ExternalLink className="h-4 w-4 text-slate-500 hover:text-white" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
