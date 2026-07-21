'use client';

import * as React from 'react';
import { CrudLayout } from '@/components/admin/crud/CrudLayout';

export default function CostingDashboard() {
  return (
    <CrudLayout 
      title="Global Cost Engine" 
      description="Macro-view of all variant margins, calculated costs, and historical snapshots."
    >
      <div className="animate-in fade-in duration-700 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#121212] p-6 border border-white/5 shadow-xl flex flex-col justify-center items-center h-32">
            <p className="text-sm text-[#888888] tracking-widest uppercase mb-2">Average Margin</p>
            <p className="text-3xl font-serif text-white">42.5%</p>
          </div>
          <div className="bg-[#121212] p-6 border border-white/5 shadow-xl flex flex-col justify-center items-center h-32">
            <p className="text-sm text-[#888888] tracking-widest uppercase mb-2">Total Variants</p>
            <p className="text-3xl font-serif text-white">128</p>
          </div>
          <div className="bg-[#121212] p-6 border border-white/5 shadow-xl flex flex-col justify-center items-center h-32">
            <p className="text-sm text-[#888888] tracking-widest uppercase mb-2">Needs Review</p>
            <p className="text-3xl font-serif text-red-400">3</p>
          </div>
        </div>

        <div className="bg-[#121212] border border-white/5 p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
          <h3 className="text-lg font-serif text-white mb-2">Cost Analysis View</h3>
          <p className="text-[#888888] max-w-md mx-auto">
            The full cross-variant data table will be populated here, combining active BOMs with current material market rates to highlight margin discrepancies.
          </p>
        </div>
      </div>
    </CrudLayout>
  );
}
