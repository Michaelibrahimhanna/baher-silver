'use client';

import * as React from 'react';
import { Button } from '@/components/admin/ui';
import { Plus, Building2, TrendingUp, AlertTriangle, ArrowRightLeft, Layers } from 'lucide-react';
import { DataTable } from '@/components/admin/tables/DataTable';
import { CrudLayout } from '@/components/admin/crud/CrudLayout';
import { useWarehouses } from '@/lib/hooks/useERP';
import Link from 'next/link';

export default function WarehousesPage() {
  const [search, setSearch] = React.useState('');
  const { data: warehouses, isLoading } = useWarehouses();

  // Mock KPIs for now, later fetched from an analytics service
  const kpis = [
    { label: 'Total Warehouses', value: warehouses?.length || 0, icon: Building2, color: 'text-blue-400' },
    { label: 'Stock Value', value: 'E£ 4.2M', icon: TrendingUp, color: 'text-green-400' },
    { label: 'Pending Transfers', value: 12, icon: ArrowRightLeft, color: 'text-orange-400' },
    { label: 'Low Stock Alerts', value: 8, icon: AlertTriangle, color: 'text-red-400' },
    { label: 'Overall Occupancy', value: '78%', icon: Layers, color: 'text-purple-400' },
    { label: 'Inventory Accuracy', value: '99.8%', icon: TrendingUp, color: 'text-emerald-400' },
  ];

  return (
    <CrudLayout 
      title="Warehouses & Stock" 
      description="Manage locations, monitor inventory accuracy, and orchestrate transfers."
      headerActions={
        <>
          <Link href="/admin/erp/warehouses/transfers">
            <Button variant="secondary" className="gap-2"><ArrowRightLeft className="w-4 h-4" /> Transfers</Button>
          </Link>
          <Button variant="primary" className="gap-2"><Plus className="w-4 h-4" /> New Warehouse</Button>
        </>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-[#121212] border border-white/5 p-4 rounded-xl shadow-xl flex flex-col items-center justify-center text-center">
            <kpi.icon className={`w-6 h-6 mb-2 ${kpi.color} opacity-80`} />
            <span className="text-2xl font-mono text-white mb-1">{kpi.value}</span>
            <span className="text-xs text-[#888888]">{kpi.label}</span>
          </div>
        ))}
      </div>

      <div className="animate-in fade-in duration-700">
        <DataTable
          data={warehouses || []}
          keyExtractor={(item) => item.id}
          isLoading={isLoading}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search warehouses..."
          columns={[
            {
              key: 'code',
              title: 'Code',
              render: (item) => <span className="text-[#888888] font-mono">{item.code}</span>
            },
            {
              key: 'name',
              title: 'Warehouse Name',
              render: (item) => (
                <Link href={`/admin/erp/warehouses/${item.id}`} className="text-white font-medium hover:text-primary transition-colors">
                  {item.name}
                </Link>
              )
            },
            {
              key: 'type',
              title: 'Type',
              render: (item) => <span className="text-[#888888]">{item.type?.name || '-'}</span>
            },
            {
              key: 'status',
              title: 'Status',
              render: (item) => (
                <span className={`px-2 py-1 text-xs rounded-full ${item.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  {item.is_active ? 'Active' : 'Inactive'}
                </span>
              )
            }
          ]}
        />
      </div>
    </CrudLayout>
  );
}
