'use client';

import * as React from 'react';
import { Plus, Trash2, QrCode, Barcode as BarcodeIcon, Tag } from 'lucide-react';
import type { ProductVariant, ProductStatus } from '@/types/catalog';
import { generateEAN13Barcode, generateDualQRCodes } from '@/lib/catalog-identifiers';

interface Props {
  variants: ProductVariant[];
  productSku: string;
  productSlug: string;
  onChange: (updatedVariants: ProductVariant[]) => void;
}

export function ProductVariantsMatrix({ variants, productSku, productSlug, onChange }: Props) {
  const handleAddVariant = () => {
    const idx = variants.length + 1;
    const varSku = `${productSku}-V${idx}`;
    const varBarcode = generateEAN13Barcode(Date.now() + idx);
    const dualQr = generateDualQRCodes(varSku, productSlug);

    const newVar: ProductVariant = {
      id: `var-${Date.now()}-${idx}`,
      product_id: '',
      sku: varSku,
      barcode: varBarcode,
      internal_qr: dualQr.internal_qr.code,
      customer_qr: dualQr.customer_qr.code,
      size: 'US 7',
      color: 'Silver',
      stone: 'Clear Zircon',
      pricing_strategy: 'formula',
      regular_price: 150,
      current_stock: 10,
      status: 'published',
    };

    onChange([...variants, newVar]);
  };

  const handleRemoveVariant = (id: string) => {
    onChange(variants.filter(v => v.id !== id));
  };

  const handleUpdateVariant = (id: string, field: keyof ProductVariant, value: unknown) => {
    onChange(variants.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-black/40 p-5 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Tag className="h-4 w-4 text-emerald-400" />
            مصفوفة المتغيرات الفرعية (Product Variants Matrix)
          </h3>
          <p className="text-xs text-slate-400">إدارة كل مقاس/لون/حجر بـ SKU وباركود وسعر ومخزون منفصل تماماً.</p>
        </div>
        <button
          type="button"
          onClick={handleAddVariant}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
        >
          <Plus className="h-3.5 w-3.5" />
          إضافة متغير جديد (Add Variant)
        </button>
      </div>

      {variants.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-xs text-slate-400">
          لا يوجد متغيرات مضافة حالياً لهذا المنتج. اضغط على &quot;إضافة متغير جديد&quot; لإنشاء خيارات المقاسات والألوان.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-300">
            <thead className="border-b border-white/10 bg-white/5 text-slate-400">
              <tr>
                <th className="p-2.5">المتغير (Variant / Option)</th>
                <th className="p-2.5">رمز الـ SKU</th>
                <th className="p-2.5">الباركود & QR</th>
                <th className="p-2.5">السعر (EGP)</th>
                <th className="p-2.5">المخزون الحالي</th>
                <th className="p-2.5">الحالة</th>
                <th className="p-2.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {variants.map((v) => (
                <tr key={v.id} className="hover:bg-white/[0.02]">
                  <td className="p-2.5 space-y-1">
                    <input
                      type="text"
                      value={v.size || ''}
                      placeholder="المقاس (e.g. US 7 / 45cm)"
                      onChange={(e) => handleUpdateVariant(v.id, 'size', e.target.value)}
                      className="w-full rounded border border-white/10 bg-slate-900 px-2 py-1 text-xs text-white"
                    />
                    <input
                      type="text"
                      value={v.stone || ''}
                      placeholder="نوع الحجر (e.g. زركون أحمر)"
                      onChange={(e) => handleUpdateVariant(v.id, 'stone', e.target.value)}
                      className="w-full rounded border border-white/10 bg-slate-900 px-2 py-1 text-xs text-slate-300"
                    />
                  </td>
                  <td className="p-2.5">
                    <input
                      type="text"
                      value={v.sku}
                      onChange={(e) => handleUpdateVariant(v.id, 'sku', e.target.value)}
                      className="w-32 rounded border border-white/10 bg-slate-900 px-2 py-1 font-mono text-xs text-emerald-400"
                    />
                  </td>
                  <td className="p-2.5 font-mono text-[11px] text-slate-400">
                    <div className="flex items-center gap-1">
                      <BarcodeIcon className="h-3 w-3 text-cyan-400" />
                      <span>{v.barcode}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-amber-400">
                      <QrCode className="h-2.5 w-2.5" />
                      <span>{v.internal_qr}</span>
                    </div>
                  </td>
                  <td className="p-2.5">
                    <input
                      type="number"
                      value={v.regular_price}
                      onChange={(e) => handleUpdateVariant(v.id, 'regular_price', Number(e.target.value))}
                      className="w-24 rounded border border-white/10 bg-slate-900 px-2 py-1 text-xs font-semibold text-white"
                    />
                  </td>
                  <td className="p-2.5">
                    <input
                      type="number"
                      value={v.current_stock}
                      onChange={(e) => handleUpdateVariant(v.id, 'current_stock', Number(e.target.value))}
                      className="w-20 rounded border border-white/10 bg-slate-900 px-2 py-1 text-xs text-white"
                    />
                  </td>
                  <td className="p-2.5">
                    <select
                      value={v.status}
                      onChange={(e) => handleUpdateVariant(v.id, 'status', e.target.value as ProductStatus)}
                      className="rounded border border-white/10 bg-slate-900 px-2 py-1 text-xs text-slate-300"
                    >
                      <option value="published">متاح (Published)</option>
                      <option value="draft">مسودة (Draft)</option>
                      <option value="out_of_stock">نفذ (Out of stock)</option>
                    </select>
                  </td>
                  <td className="p-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveVariant(v.id)}
                      className="rounded p-1 text-slate-400 hover:bg-red-500/20 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
