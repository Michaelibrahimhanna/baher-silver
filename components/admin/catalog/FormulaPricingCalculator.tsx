'use client';

import * as React from 'react';
import { Calculator, Zap } from 'lucide-react';
import { evaluatePricingFormula, type FormulaVariables } from '@/lib/formula-engine';

interface Props {
  initialVars: Partial<FormulaVariables>;
  onChange: (calcResult: ReturnType<typeof evaluatePricingFormula>, updatedVars: FormulaVariables) => void;
}

export function FormulaPricingCalculator({ initialVars, onChange }: Props) {
  const [vars, setVars] = React.useState<FormulaVariables>({
    silverWeightGrams: initialVars.silverWeightGrams || 7.5,
    liveSilverSpotPerGram: initialVars.liveSilverSpotPerGram || 45.0,
    purityValue: initialVars.purityValue || 0.925,
    stoneCost: initialVars.stoneCost || 15.0,
    manufacturingCost: initialVars.manufacturingCost || 25.0,
    packagingCost: initialVars.packagingCost || 10.0,
    laborCost: initialVars.laborCost || 20.0,
    overheadCost: initialVars.overheadCost || 5.0,
    profitMarginPercent: initialVars.profitMarginPercent || 45.0,
  });

  const calc = React.useMemo(() => {
    return evaluatePricingFormula(vars);
  }, [vars]);

  const handleChange = (field: keyof FormulaVariables, val: number) => {
    const next = { ...vars, [field]: val };
    setVars(next);
    const updatedCalc = evaluatePricingFormula(next);
    onChange(updatedCalc, next);
  };

  return (
    <div className="space-y-5 rounded-xl border border-amber-500/20 bg-black/40 p-5 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Calculator className="h-4 w-4 text-amber-400" />
            محرك التسعير القائم على المعاملات اللحظية (Formula Pricing Engine)
          </h3>
          <p className="text-xs text-slate-400">حساب السعر تلقائيًا حسب وزن الفضة الخام، مصنعية اليد، تكلفة الأحجار، وهامش الربح.</p>
        </div>
        <span className="flex items-center gap-1 text-xs font-mono font-medium text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
          <Zap className="h-3 w-3 text-amber-400" />
          Live Formula Active
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Cost Variables Inputs */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="block text-[11px] text-slate-300">وزن الفضة (جرام)</label>
            <input
              type="number"
              step="0.1"
              value={vars.silverWeightGrams}
              onChange={(e) => handleChange('silverWeightGrams', Number(e.target.value))}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] text-slate-300">سعر جرام الفضة اللحظي</label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                value={vars.liveSilverSpotPerGram}
                onChange={(e) => handleChange('liveSilverSpotPerGram', Number(e.target.value))}
                className="w-full rounded-lg border border-amber-500/40 bg-slate-900 px-3 py-1.5 text-xs text-amber-300 font-mono"
              />
              <span className="absolute left-2 top-1.5 text-[10px] text-slate-500">EGP</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] text-slate-300">نقاء الفضة (Purity)</label>
            <select
              value={vars.purityValue}
              onChange={(e) => handleChange('purityValue', Number(e.target.value))}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white"
            >
              <option value={0.925}>عيار 925 (0.925)</option>
              <option value={0.950}>عيار 950 (0.950)</option>
              <option value={0.999}>عيار 999 (0.999)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] text-slate-300">تكلفة الأحجار (Stone Cost)</label>
            <input
              type="number"
              value={vars.stoneCost}
              onChange={(e) => handleChange('stoneCost', Number(e.target.value))}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] text-slate-300">مصنعية الصياغة (Manufacturing)</label>
            <input
              type="number"
              value={vars.manufacturingCost}
              onChange={(e) => handleChange('manufacturingCost', Number(e.target.value))}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] text-slate-300">تكلفة العمالة والتشكيل (Labor)</label>
            <input
              type="number"
              value={vars.laborCost}
              onChange={(e) => handleChange('laborCost', Number(e.target.value))}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] text-slate-300">التغليف الفاخر (Packaging)</label>
            <input
              type="number"
              value={vars.packagingCost}
              onChange={(e) => handleChange('packagingCost', Number(e.target.value))}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] text-slate-300">مصاريف عامة (Overhead)</label>
            <input
              type="number"
              value={vars.overheadCost}
              onChange={(e) => handleChange('overheadCost', Number(e.target.value))}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] text-slate-300">هامش الربح المستهدف (%)</label>
            <input
              type="number"
              value={vars.profitMarginPercent}
              onChange={(e) => handleChange('profitMarginPercent', Number(e.target.value))}
              className="w-full rounded-lg border border-emerald-500/40 bg-slate-900 px-3 py-1.5 text-xs text-emerald-400 font-bold font-mono"
            />
          </div>
        </div>

        {/* Live Calculation Results Card */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-slate-900 to-black p-4 space-y-3">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">نتائج الحساب التلقائي</h4>
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>تكلفة معدن الفضة الخام:</span>
              <span className="font-mono text-white font-medium">{calc.silverMaterialCost} EGP</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>إجمالي التكلفة الإجمالية (Cost Price):</span>
              <span className="font-mono text-amber-400 font-semibold">{calc.totalProductionCost} EGP</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>قيمة صافي الربح المحسوب:</span>
              <span className="font-mono text-emerald-400 font-semibold">+{calc.profitAmount} EGP</span>
            </div>
          </div>

          <div className="border-t border-white/10 pt-3">
            <div className="text-[11px] text-slate-400">سعر البيع النهائي للعميل (Selling Price):</div>
            <div className="text-2xl font-black text-emerald-400 font-mono tracking-tight">{calc.calculatedSellingPrice} EGP</div>
            <div className="text-[10px] text-slate-500 mt-1">السعر المقترح للتخفيض: {calc.suggestedSalePrice} EGP</div>
          </div>
        </div>
      </div>
    </div>
  );
}
