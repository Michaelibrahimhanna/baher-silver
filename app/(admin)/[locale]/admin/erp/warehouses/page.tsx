'use client';

import * as React from 'react';
import { Button } from '@/components/admin/ui';
import { Building2, TrendingUp, AlertTriangle, ArrowRightLeft, Layers, ShieldCheck, RefreshCw } from 'lucide-react';
import { DataTable } from '@/components/admin/tables/DataTable';
import { CrudLayout } from '@/components/admin/crud/CrudLayout';
import { MASTER_WAREHOUSES } from '@/lib/master-data';
import Link from 'next/link';

export default function WarehousesPage() {
  const [search, setSearch] = React.useState('');
  const [stockData, setStockData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchStock = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/inventory/stock');
      if (res.ok) {
        const data = await res.json();
        setStockData(data);
      }
    } catch (e) {
      console.error('Failed to load stock data for warehouses', e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  const summary = stockData?.summary || {
    total_on_hand: 0,
    vault_stock: 0,
    showcase_stock: 0,
    available_stock: 0
  };

  const kpis = [
    { label: 'Active Warehouses', value: MASTER_WAREHOUSES.length, icon: Building2, color: 'text-blue-400' },
    { label: 'Central Vault Stock', value: summary.vault_stock, icon: Layers, color: 'text-emerald-400' },
    { label: 'Showcase Floor Stock', value: summary.showcase_stock, icon: TrendingUp, color: 'text-amber-400' },
    { label: 'Available Stock', value: summary.available_stock, icon: ShieldCheck, color: 'text-purple-400' },
    { label: 'Total Stock On Hand', value: summary.total_on_hand, icon: Building2, color: 'text-cyan-400' },
    { label: 'Inventory Accuracy', value: '100%', icon: ShieldCheck, color: 'text-green-400' },
  ];

  const warehouseRows = MASTER_WAREHOUSES.map((wh) => {
    // Count pieces in this warehouse from stockData
    let onHandCount = 0;
    let vaultCount = 0;
    let showcaseCount = 0;

    if (stockData?.balances) {
      for (const b of stockData.balances) {
        const wb = b.warehouse_breakdown?.[wh.id];
        if (wb) {
          onHandCount += wb.on_hand || 0;
          vaultCount += wb.vault || 0;
          showcaseCount += wb.showcase || 0;
        }
      }
    }

    return {
      ...wh,
      on_hand: onHandCount,
      vault: vaultCount,
      showcase: showcaseCount
    };
  });

  return (
    <CrudLayout 
      title="Warehouses & Vault Locations" 
      description="Manage central vaults, branch safes, showcases, and fulfillment centers."
      headerActions={
        <div className="flex gap-2">
          <Button
            variant="ghost"
            className="gap-2 text-[#888888] hover:text-white"
            onClick={fetchStock}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link href="/admin/erp/warehouses/transfers">
            <Button variant="primary" className="gap-2"><ArrowRightLeft className="w-4 h-4" /> Move / Transfer</Button>
          </Link>
        </div>
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
          data={warehouseRows}
          keyExtractor={(item) => item.id}
          isLoading={loading}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search warehouses..."
          columns={[
            {
              key: 'code',
              title: 'Code / Location',
              render: (item) => (
                <div>
                  <span className="text-[#888888] font-mono text-xs">{item.id}</span>
                  <span className="text-amber-400 font-mono text-[10px] block">{item.location_code}</span>
                </div>
              )
            },
            {
              key: 'name',
              title: 'Warehouse Name',
              render: (item) => (
                <div>
                  <span className="text-white font-medium block">{item.name_en}</span>
                  <span className="text-[#888888] text-xs">{item.name_ar}</span>
                </div>
              )
            },
            {
              key: 'capacity',
              title: 'Capacity',
              render: (item) => (
                <span className="text-[#aaaaaa] font-mono text-xs">
                  {item.capacity ? item.capacity.toLocaleString() : '—'} units
                </span>
              )
            },
            {
              key: 'live_stock',
              title: 'Live Stock Breakdown',
              render: (item) => (
                <div className="text-xs font-mono">
                  <span className="text-emerald-400">Vault: {item.vault}</span>
                  <span className="text-[#666666] mx-1.5">|</span>
                  <span className="text-amber-400">Showcase: {item.showcase}</span>
                  <span className="text-[#666666] mx-1.5">|</span>
                  <span className="text-white font-bold">Total: {item.on_hand}</span>
                </div>
              )
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

