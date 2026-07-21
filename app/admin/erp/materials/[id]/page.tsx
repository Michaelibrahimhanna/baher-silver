'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { CrudLayout } from '@/components/admin/crud/CrudLayout';
import { Button } from '@/components/admin/ui';
import { Edit2, ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Link from 'next/link';
// Assuming useMaterial is created similarly to useSupplier. Mocking the hook call for structure.
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export default function MaterialDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  
  const { data: material, isLoading } = useQuery({
    queryKey: ['materials', id],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase.from('materials').select('*, supplier:suppliers(*)').eq('id', id).single();
      return data;
    },
    enabled: !!id
  });

  if (isLoading) return <div className="p-12 text-[#888888]">Loading...</div>;
  if (!material) return <div className="p-12 text-red-400">Material not found.</div>;

  const trendIcon = material.market_cost > material.average_cost ? <TrendingUp className="text-red-400 w-6 h-6" /> : material.market_cost < material.average_cost ? <TrendingDown className="text-green-400 w-6 h-6" /> : <Minus className="text-[#888888] w-6 h-6" />;

  return (
    <CrudLayout 
      title={material.name_en} 
      description={`Type: ${material.type?.replace('_', ' ').toUpperCase()} | Purity: ${material.purity || 'N/A'}`}
      headerActions={
        <>
          <Link href="/admin/erp/materials">
            <Button variant="ghost" className="gap-2"><ArrowLeft className="w-4 h-4" /> Back</Button>
          </Link>
          <Button variant="primary" className="gap-2"><Edit2 className="w-4 h-4" /> Edit Material</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in duration-700">
        
        {/* Cost KPIs */}
        <div className="bg-[#121212] p-6 border border-white/5 shadow-xl">
          <p className="text-sm text-[#888888] tracking-widest uppercase mb-2">Standard Cost</p>
          <p className="text-3xl font-serif text-white">{material.standard_cost?.toFixed(2)} <span className="text-sm font-sans text-[#888888]">/ {material.unit}</span></p>
        </div>
        <div className="bg-[#121212] p-6 border border-white/5 shadow-xl">
          <p className="text-sm text-[#888888] tracking-widest uppercase mb-2">Average Cost</p>
          <p className="text-3xl font-serif text-white">{material.average_cost?.toFixed(2)} <span className="text-sm font-sans text-[#888888]">/ {material.unit}</span></p>
        </div>
        <div className="bg-[#121212] p-6 border border-white/5 shadow-xl">
          <div className="flex justify-between items-start">
            <p className="text-sm text-[#888888] tracking-widest uppercase mb-2">Market Cost</p>
            {trendIcon}
          </div>
          <p className="text-3xl font-serif text-white">{material.market_cost?.toFixed(2)} <span className="text-sm font-sans text-[#888888]">/ {material.unit}</span></p>
        </div>
        <div className="bg-[#121212] p-6 border border-white/5 shadow-xl">
          <p className="text-sm text-[#888888] tracking-widest uppercase mb-2">Min Stock</p>
          <p className="text-3xl font-serif text-white">{material.min_stock || 0} <span className="text-sm font-sans text-[#888888]">{material.unit}</span></p>
        </div>

        {/* Cost Timeline Chart (Placeholder) */}
        <div className="md:col-span-4 bg-[#121212] p-6 border border-white/5 shadow-xl min-h-[300px] flex flex-col">
          <h3 className="text-lg font-serif text-white mb-6">Cost Timeline Visualization</h3>
          <div className="flex-1 border border-white/5 bg-[#0A0A0A] flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="w-8 h-8 text-[#888888] mx-auto mb-3 opacity-50" />
              <p className="text-[#888888] text-sm">Interactive Recharts Timeline mapping `material_cost_history` will be rendered here.</p>
            </div>
          </div>
        </div>

      </div>
    </CrudLayout>
  );
}
