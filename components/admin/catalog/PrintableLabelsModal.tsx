'use client';

import * as React from 'react';
import { Printer, X } from 'lucide-react';
import type { LabelPresetType } from '@/types/catalog';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  sku: string;
  barcode: string;
  price: number;
}

export function PrintableLabelsModal({ isOpen, onClose, productName, sku, barcode, price }: Props) {
  const [preset, setPreset] = React.useState<LabelPresetType>('thermal_50x30');
  const [quantity, setQuantity] = React.useState(24);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-slate-900 p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Printer className="h-5 w-5 text-amber-400" />
              طباعة ملصقات الباركود والـ QR Code (Printable Labels Generator)
            </h3>
            <p className="text-xs text-slate-400">توليد شيتات طباعة ملائمة لطابعات Zebra وطابعات الفواتير الحرارية والأوراق A4.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Preset Selector */}
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setPreset('thermal_50x30')}
            className={`rounded-xl border p-3 text-right transition-all ${
              preset === 'thermal_50x30'
                ? 'border-amber-500 bg-amber-500/10 text-white'
                : 'border-white/10 bg-black/40 text-slate-400 hover:bg-black/60'
            }`}
          >
            <div className="text-xs font-bold">Thermal Label (50×30 mm)</div>
            <div className="text-[11px] text-slate-400 mt-1">طابعة الفواتير والملصقات الحرارية</div>
          </button>

          <button
            type="button"
            onClick={() => setPreset('zebra_30x20')}
            className={`rounded-xl border p-3 text-right transition-all ${
              preset === 'zebra_30x20'
                ? 'border-amber-500 bg-amber-500/10 text-white'
                : 'border-white/10 bg-black/40 text-slate-400 hover:bg-black/60'
            }`}
          >
            <div className="text-xs font-bold">Zebra Label (30×20 mm)</div>
            <div className="text-[11px] text-slate-400 mt-1">ملصق صغبر مخصص لمجوهرات الفضة</div>
          </button>

          <button
            type="button"
            onClick={() => setPreset('a4_sheet')}
            className={`rounded-xl border p-3 text-right transition-all ${
              preset === 'a4_sheet'
                ? 'border-amber-500 bg-amber-500/10 text-white'
                : 'border-white/10 bg-black/40 text-slate-400 hover:bg-black/60'
            }`}
          >
            <div className="text-xs font-bold">A4 Sheet (3×8 Labels)</div>
            <div className="text-[11px] text-slate-400 mt-1">ورق A4 لاصق (24 ملصق بالصفحة)</div>
          </button>
        </div>

        {/* Quantity Controls */}
        <div className="flex items-center justify-between border-t border-b border-white/10 py-3 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span>عدد الملصقات المطلوب طباعتها:</span>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              className="w-20 rounded border border-white/10 bg-black px-2 py-1 font-mono text-white"
            />
          </div>
          <div className="text-slate-400">العرض المعاين: {preset}</div>
        </div>

        {/* Printable Label Preview Box */}
        <div className="rounded-xl border border-white/10 bg-white p-6 text-black min-h-[160px] flex items-center justify-center">
          <div className="border-2 border-dashed border-slate-300 p-4 rounded-lg bg-white text-center space-y-2 shadow-sm max-w-xs w-full">
            <div className="font-bold text-xs truncate">{productName || 'اسم منتج الفضة الإفتراضي'}</div>
            <div className="text-[10px] text-slate-600 font-mono">SKU: {sku}</div>
            
            {/* Simulated Barcode */}
            <div className="flex justify-center items-center gap-2 py-1">
              <div className="font-mono text-xs tracking-widest bg-slate-100 px-3 py-1 rounded border border-slate-200">
                |||||| | ||||| |||| {barcode || '6291000101'}
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] font-bold border-t border-slate-200 pt-1 text-slate-800">
              <span className="text-amber-700">بااهر سيلفر BAHER</span>
              <span className="font-mono text-sm">{price} EGP</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-black hover:bg-amber-400 shadow-lg shadow-amber-500/20"
          >
            <Printer className="h-4 w-4" />
            طباعة الملصقات الآن (Print Now)
          </button>
        </div>
      </div>
    </div>
  );
}
