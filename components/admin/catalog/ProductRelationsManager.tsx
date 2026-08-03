'use client';

import * as React from 'react';
import { Network, Plus, Trash2, ShoppingBag } from 'lucide-react';
import type { ProductRelationItem, RelationType } from '@/types/catalog';

interface Props {
  relations: ProductRelationItem[];
  onChange: (updatedRelations: ProductRelationItem[]) => void;
}

export function ProductRelationsManager({ relations, onChange }: Props) {
  const [targetSku, setTargetSku] = React.useState('');
  const [relationType, setRelationType] = React.useState<RelationType>('related');

  const handleAddRelation = () => {
    if (!targetSku.trim()) return;

    const newRelation: ProductRelationItem = {
      id: `rel-${Date.now()}`,
      target_product_id: `prod-${Date.now()}`,
      target_product_sku: targetSku.trim().toUpperCase(),
      target_product_name_ar: `منتج مرتبط برقم SKU ${targetSku}`,
      target_product_name_en: `Related Product (${targetSku})`,
      target_product_price: 180,
      relation_type: relationType,
    };

    onChange([...relations, newRelation]);
    setTargetSku('');
  };

  const handleRemoveRelation = (id: string) => {
    onChange(relations.filter(r => r.id !== id));
  };

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-black/40 p-5 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Network className="h-4 w-4 text-purple-400" />
            شبكة العلاقات والمنتجات المرتبطة (Product Relations Engine)
          </h3>
          <p className="text-xs text-slate-400">ربط الإكسسوارات، المنتجات المكملة، والتشكيلات المماثلة لزيادة المبيعات (Cross-Sell / Up-Sell).</p>
        </div>
      </div>

      {/* Add Relation Form */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={targetSku}
          placeholder="أدخل رمز الـ SKU للمنتج المرتبط (e.g. BS-NEC-SIL-102)"
          onChange={(e) => setTargetSku(e.target.value)}
          className="flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs font-mono text-white focus:border-purple-500 focus:outline-none"
        />

        <select
          value={relationType}
          onChange={(e) => setRelationType(e.target.value as RelationType)}
          className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
        >
          <option value="related">منتجات مشابهة (Related)</option>
          <option value="bought_together">يُشترى عادةً معاً (Bought Together)</option>
          <option value="matching_collection">طقم متناسق (Matching Set)</option>
          <option value="accessory">إكسسوار مكمل (Accessory)</option>
          <option value="replacement">بديل مطابق (Replacement)</option>
        </select>

        <button
          type="button"
          onClick={handleAddRelation}
          className="flex items-center gap-1 rounded-lg bg-purple-500/20 px-4 py-2 text-xs font-bold text-purple-300 border border-purple-500/30 hover:bg-purple-500/30"
        >
          <Plus className="h-4 w-4" />
          ربط المنتج
        </button>
      </div>

      {/* Relations List */}
      {relations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-xs text-slate-400">
          لا يوجد روابط منتجات مضافة حالياً.
        </div>
      ) : (
        <div className="space-y-2">
          {relations.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-slate-900/60 p-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-white">{r.target_product_name_ar}</div>
                  <div className="text-[11px] text-slate-400 font-mono">SKU: {r.target_product_sku}</div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="rounded-full bg-purple-500/10 px-3 py-0.5 text-[10px] font-medium text-purple-300 border border-purple-500/20">
                  {r.relation_type}
                </span>
                <span className="font-mono text-emerald-400 font-semibold">{r.target_product_price} EGP</span>
                <button
                  type="button"
                  onClick={() => handleRemoveRelation(r.id)}
                  className="rounded p-1 text-slate-400 hover:bg-red-500/20 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
