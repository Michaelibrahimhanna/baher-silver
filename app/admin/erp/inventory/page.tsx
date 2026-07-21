'use client';

import * as React from 'react';
import { Button } from '@/components/admin/ui';
import { Plus, BarChart3, AlertTriangle, Layers, RotateCcw, PackageX, TrendingDown, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { CrudLayout } from '@/components/admin/crud/CrudLayout';
import Link from 'next/link';

export default function InventoryDashboardPage() {
  // Mock KPIs for dashboard demonstration
  const kpis = [
    { label: 'Total Inventory Value', value: 'E£ 8.5M', icon: BarChart3, color: 'text-blue-400' },
    { label: 'Inventory Accuracy', value: '99.5%', icon: Layers, color: 'text-emerald-400' },
    { label: 'Inventory Turnover', value: '4.2x', icon: RotateCcw, color: 'text-purple-400' },
    { label: 'Slow Moving Items', value: 45, icon: TrendingDown, color: 'text-orange-400' },
    { label: 'Dead Stock Value', value: 'E£ 120K', icon: PackageX, color: 'text-red-400' },
    { label: 'Negative Stock Alerts', value: 0, icon: AlertTriangle, color: 'text-green-400' },
    { label: 'Pending Receipts', value: 8, icon: ArrowDownToLine, color: 'text-yellow-400' },
    { label: 'Pending Issues', value: 12, icon: ArrowUpFromLine, color: 'text-indigo-400' },
  ];

  return (
    <CrudLayout 
      title="Inventory Engine" 
      description="Real-time stock valuation, movements, and physical count management."
      headerActions={
        <>
          <Link href="/admin/erp/inventory/transactions">
            <Button variant="secondary" className="gap-2"><Layers className="w-4 h-4" /> Transactions</Button>
          </Link>
          <Button variant="primary" className="gap-2"><Plus className="w-4 h-4" /> Quick Transaction</Button>
        </>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-[#121212] border border-white/5 p-4 rounded-xl shadow-xl flex flex-col items-center justify-center text-center">
            <kpi.icon className={`w-6 h-6 mb-2 ${kpi.color} opacity-80`} />
            <span className="text-2xl font-mono text-white mb-1">{kpi.value}</span>
            <span className="text-xs text-[#888888]">{kpi.label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#121212] p-6 border border-white/5 shadow-xl rounded-xl">
          <h3 className="text-lg font-serif text-white mb-6">Recent Stock Movements</h3>
          <div className="space-y-4">
            <p className="text-[#888888] text-sm text-center py-8">Loading real-time ledger entries...</p>
          </div>
        </div>

        <div className="bg-[#121212] p-6 border border-white/5 shadow-xl rounded-xl">
          <h3 className="text-lg font-serif text-white mb-6">Pending Physical Counts</h3>
          <div className="space-y-4">
            <div className="p-4 border border-white/5 bg-[#0A0A0A] rounded-md flex justify-between items-center">
              <div>
                <p className="text-white text-sm">Monthly Cycle Count - Raw Materials</p>
                <p className="text-xs text-[#888888] mt-1">Scheduled: Tomorrow, 08:00 AM</p>
              </div>
              <Button variant="ghost" size="sm">Start</Button>
            </div>
          </div>
        </div>
      </div>
    </CrudLayout>
  );
}
