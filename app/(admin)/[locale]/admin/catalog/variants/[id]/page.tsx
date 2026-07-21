'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { CrudLayout } from '@/components/admin/crud/CrudLayout';
import { Button } from '@/components/admin/ui';
import { ArrowLeft, Calculator, Save, Plus } from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useActiveBOM, useUpdateVariantCostConfig } from '@/lib/hooks/useERP';
import type { VariantCost } from '@/types/erp';
import { FormField } from '@/components/admin/forms/FormField';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { CostEngineService } from '@/lib/services/erp/CostEngineService';

export default function VariantEditorPage() {
  const params = useParams();
  const id = params?.id as string;

  const { data: variant, isLoading } = useQuery({
    queryKey: ['variants', id],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase.from('product_variants').select('*, product:products(*)').eq('id', id).single();
      return data;
    },
    enabled: !!id
  });

  const { data: bom, isLoading: isBomLoading } = useActiveBOM(id);
  const updateCostMutation = useUpdateVariantCostConfig();

  const [activePreset, setActivePreset] = React.useState('Current DB');
  const [presets, setPresets] = React.useState<Record<string, Partial<VariantCost>>>({});

  const methods = useForm({
    defaultValues: {
      labor_cost: 0,
      packaging_cost: 0,
      manufacturing_cost: 0,
      overhead_cost: 0,
      profit_margin_target: 0,
      tax_rate: 0,
      discount_rate: 0,
    }
  });

  const formValues = useWatch({ control: methods.control });

  React.useEffect(() => {
    // If we have a stored variant_cost config in DB (we don't have a direct hook for it right now except via calculateCost history)
    // Actually, we can fetch it or just rely on what bom has. For now we just use form default or user input.
  }, []);

  const handleSavePreset = (name: string) => {
    setPresets(prev => ({ ...prev, [name]: methods.getValues() }));
    setActivePreset(name);
  };

  const handleLoadPreset = (name: string) => {
    if (presets[name]) {
      methods.reset(presets[name]);
      setActivePreset(name);
    }
  };

  const simulatedCost = React.useMemo(() => {
    return CostEngineService.simulateCost(bom?.items || [], formValues as Partial<VariantCost>);
  }, [bom?.items, formValues]);

  const onSaveConfig = async (data: Partial<VariantCost>) => {
    await updateCostMutation.mutateAsync({ variantId: id, updates: data });
    alert("Cost configuration updated");
  };

  if (isLoading) return <div className="p-12 text-[#888888]">Loading variant...</div>;
  if (!variant) return <div className="p-12 text-red-400">Variant not found.</div>;

  return (
    <CrudLayout 
      title={`Variant: ${variant.sku || 'N/A'}`} 
      description={`Product: ${variant.product?.name_en || 'Unknown'}`}
      headerActions={
        <>
          <Link href="/admin/catalog/variants">
            <Button variant="ghost" className="gap-2"><ArrowLeft className="w-4 h-4" /> Back</Button>
          </Link>
        </>
      }
    >
      {/* Variant Cost Tab Simulation */}
      <div className="flex gap-4 border-b border-white/10 mb-8">
        <button className="px-4 py-2 border-b-2 border-primary text-primary font-medium">Costing & BOM</button>
        <button className="px-4 py-2 border-b-2 border-transparent text-[#888888] hover:text-white transition-colors">General Info</button>
        <button className="px-4 py-2 border-b-2 border-transparent text-[#888888] hover:text-white transition-colors">Media</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-700">
        
        {/* BOM Editor */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#121212] p-6 border border-white/5 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-serif text-white">Bill of Materials (Active Version)</h3>
              <Button variant="secondary" size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add Material</Button>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 border border-white/10 bg-[#0A0A0A] rounded-md text-sm text-[#888888] text-center">
                BOM items will be managed here. Currently no items.
              </div>
            </div>
          </div>

          <div className="bg-[#121212] p-6 border border-white/5 shadow-xl">
            <h3 className="text-lg font-serif text-white mb-6">Cost Configuration</h3>
            <FormProvider {...methods}>
              <form onSubmit={methods.handleSubmit(onSaveConfig)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField name="labor_cost" label="Labor Cost (Flat)" />
                  <FormField name="manufacturing_cost" label="Manufacturing Cost" />
                  <FormField name="packaging_cost" label="Packaging Cost" />
                  <FormField name="overhead_cost" label="Overhead Cost" />
                  <FormField name="profit_margin_target" label="Target Profit Margin (%)" />
                  <FormField name="tax_rate" label="Tax Rate (%)" />
                </div>
                <div className="border-t border-white/10 pt-6 mt-6">
                  <h4 className="text-sm font-medium text-white mb-4">Simulation Presets</h4>
                  <div className="flex gap-2 mb-4 overflow-x-auto">
                    <Button type="button" variant={activePreset === 'Current DB' ? 'primary' : 'ghost'} size="sm" onClick={() => setActivePreset('Current DB')}>Current DB</Button>
                    {Object.keys(presets).map(p => (
                      <Button key={p} type="button" variant={activePreset === p ? 'primary' : 'ghost'} size="sm" onClick={() => handleLoadPreset(p)}>{p}</Button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => handleSavePreset('Scenario A')}>Save as Scenario A</Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => handleSavePreset('Scenario B')}>Save as Scenario B</Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => handleSavePreset('Scenario C')}>Save as Scenario C</Button>
                  </div>
                </div>
                <div className="pt-4">
                  <Button variant="primary" type="submit" className="gap-2 w-full" disabled={methods.formState.isSubmitting}>
                    <Save className="w-4 h-4" /> Save Configuration to DB
                  </Button>
                </div>
              </form>
            </FormProvider>
          </div>
        </div>

        {/* Real-time Calculator Widget */}
        <div className="space-y-6">
          <div className="bg-primary/5 p-6 border border-primary/20 shadow-xl rounded-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Calculator className="w-24 h-24" />
            </div>
            <h3 className="text-lg font-serif text-primary mb-6 relative z-10">Real-Time Cost Engine</h3>
            
            <div className="mb-4 text-xs font-mono text-[#888888] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              LIVE SIMULATION ACTIVE
            </div>
            
            {isBomLoading ? (
              <p className="text-[#888888] text-sm">Loading BOM...</p>
            ) : (
              <div className="space-y-4 relative z-10 text-sm">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-[#888888]">Material Cost</span>
                  <span className="text-white font-mono">{simulatedCost?.material_cost?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-[#888888]">Waste Cost</span>
                  <span className="text-red-400 font-mono">+{simulatedCost?.waste_cost?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-[#888888]">Labor & Mfg</span>
                  <span className="text-white font-mono">{((simulatedCost?.labor_cost || 0) + (simulatedCost?.manufacturing_cost || 0)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-[#888888]">Packaging & Overhead</span>
                  <span className="text-white font-mono">{((simulatedCost?.packaging_cost || 0) + (simulatedCost?.overhead_cost || 0)).toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between border-b border-primary/20 pb-2 mt-4 pt-4">
                  <span className="text-primary font-medium">Total Mfg Cost</span>
                  <span className="text-primary font-mono font-medium">
                    {((simulatedCost?.material_cost || 0) + (simulatedCost?.waste_cost || 0) + (simulatedCost?.labor_cost || 0) + (simulatedCost?.manufacturing_cost || 0) + (simulatedCost?.packaging_cost || 0) + (simulatedCost?.overhead_cost || 0)).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between border-b border-white/5 pb-2 pt-2">
                  <span className="text-[#888888]">Target Margin</span>
                  <span className="text-green-400 font-mono">+{simulatedCost?.profit_margin?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-[#888888]">Tax Amount</span>
                  <span className="text-red-400 font-mono">+{simulatedCost?.tax_amount?.toFixed(2) || '0.00'}</span>
                </div>

                <div className="flex justify-between pt-4 bg-primary/10 -mx-6 px-6 pb-6 rounded-b-xl border-t border-primary/20">
                  <span className="text-white font-medium text-lg">Suggested Retail Price</span>
                  <span className="text-white font-mono font-bold text-2xl">{simulatedCost?.final_selling_price?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            )}
            
            <div className="mt-8 relative z-10">
              <Button variant="secondary" className="w-full text-xs">Take Snapshot & Save to History</Button>
            </div>
          </div>
        </div>

      </div>
    </CrudLayout>
  );
}
