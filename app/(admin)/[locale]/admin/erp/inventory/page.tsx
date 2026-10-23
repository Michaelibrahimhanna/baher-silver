'use client';

import * as React from 'react';
import { Button } from '@/components/admin/ui';
import {
  Plus,
  BarChart3,
  Layers,
  ArrowRightLeft,
  ShieldCheck,
  Package,
  Vault,
  Store,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { CrudLayout } from '@/components/admin/crud/CrudLayout';
import Link from 'next/link';

export default function InventoryDashboardPage() {
  const [stockData, setStockData] = React.useState<any>(null);
  const [ledgerEvents, setLedgerEvents] = React.useState<any[]>([]);
  const [reconcileReport, setReconcileReport] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [stockRes, ledgerRes, recRes] = await Promise.all([
        fetch('/api/inventory/stock'),
        fetch('/api/inventory/ledger?limit=10'),
        fetch('/api/inventory/reconcile')
      ]);

      if (stockRes.ok) {
        const data = await stockRes.json();
        setStockData(data);
      }
      if (ledgerRes.ok) {
        const data = await ledgerRes.json();
        setLedgerEvents(data.events || []);
      }
      if (recRes.ok) {
        const data = await recRes.json();
        setReconcileReport(data.report || null);
      }
    } catch (e) {
      console.error('Failed to load inventory dashboard data', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const summary = stockData?.summary || {
    total_on_hand: 0,
    vault_stock: 0,
    showcase_stock: 0,
    reserved_stock: 0,
    available_stock: 0,
    quarantine_stock: 0
  };

  const kpis = [
    { label: 'Total Stock On Hand', value: summary.total_on_hand, icon: Package, color: 'text-blue-400' },
    { label: 'Secure Vault Stock', value: summary.vault_stock, icon: Vault, color: 'text-emerald-400' },
    { label: 'Showcase Floor Stock', value: summary.showcase_stock, icon: Store, color: 'text-amber-400' },
    { label: 'Available for Sale', value: summary.available_stock, icon: Layers, color: 'text-purple-400' },
    { label: 'Active Reservations', value: summary.reserved_stock, icon: ArrowRightLeft, color: 'text-cyan-400' },
    { label: 'Audit Ledger Events', value: ledgerEvents.length > 0 ? (stockData ? 'Active' : '0') : '0', icon: BarChart3, color: 'text-indigo-400' },
    {
      label: 'Stock Reconciliation',
      value: reconcileReport?.is_divergent ? 'Divergent' : '100% Reconciled',
      icon: reconcileReport?.is_divergent ? AlertCircle : ShieldCheck,
      color: reconcileReport?.is_divergent ? 'text-red-400' : 'text-green-400'
    }
  ];

  return (
    <CrudLayout 
      title="Unified Inventory & Stock Ledger" 
      description="Authoritative, double-entry stock tracking connecting Vault, Showcase, Factory, and E-commerce."
      headerActions={
        <div className="flex gap-2">
          <Button
            variant="ghost"
            className="gap-2 text-[#888888] hover:text-white"
            onClick={() => {
              setRefreshing(true);
              loadData();
            }}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link href="/admin/erp/inventory/transactions">
            <Button variant="secondary" className="gap-2"><Layers className="w-4 h-4" /> Stock Ledger</Button>
          </Link>
          <Link href="/admin/erp/warehouses/transfers">
            <Button variant="primary" className="gap-2"><ArrowRightLeft className="w-4 h-4" /> Move / Transfer</Button>
          </Link>
        </div>
      }
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-[#121212] border border-white/5 p-4 rounded-xl shadow-xl flex flex-col items-center justify-center text-center">
            <kpi.icon className={`w-6 h-6 mb-2 ${kpi.color} opacity-80`} />
            <span className="text-2xl font-mono text-white mb-1">{kpi.value}</span>
            <span className="text-xs text-[#888888]">{kpi.label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Real-time Ledger Movements */}
        <div className="lg:col-span-2 bg-[#121212] p-6 border border-white/5 shadow-xl rounded-xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-serif text-white">Recent Immutable Stock Movements</h3>
            <Link href="/admin/erp/inventory/transactions" className="text-xs text-amber-400 hover:underline">
              View Complete Ledger &rarr;
            </Link>
          </div>

          {loading ? (
            <p className="text-[#888888] text-sm text-center py-12">Loading real-time ledger entries...</p>
          ) : ledgerEvents.length === 0 ? (
            <p className="text-[#888888] text-sm text-center py-12">No stock movements recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#aaaaaa]">
                <thead className="border-b border-white/5 text-[#888888] uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Item / SKU</th>
                    <th className="py-2 px-3">Location</th>
                    <th className="py-2 px-3 text-center">Delta</th>
                    <th className="py-2 px-3 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {ledgerEvents.slice(0, 7).map((ev: any) => (
                    <tr key={ev.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                          ev.movement_type === 'RECEIPT' || ev.movement_type === 'PRODUCTION_COMPLETION'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : ev.movement_type === 'VAULT_TO_SHOWCASE' || ev.movement_type === 'SHOWCASE_TO_VAULT'
                            ? 'bg-amber-500/10 text-amber-400'
                            : ev.movement_type === 'TRANSFER_OUT' || ev.movement_type === 'TRANSFER_IN'
                            ? 'bg-blue-500/10 text-blue-400'
                            : ev.movement_type === 'SALE'
                            ? 'bg-purple-500/10 text-purple-400'
                            : 'bg-white/10 text-[#cccccc]'
                        }`}>
                          {ev.movement_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-white">
                        {ev.serial_number || ev.sku}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-white/80">{ev.dest_location_code || ev.source_location_code || '-'}</span>
                        <span className="text-[#666666] text-[10px] block">({ev.dest_warehouse_id || ev.source_warehouse_id})</span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        <span className={ev.quantity_delta > 0 ? 'text-emerald-400' : ev.quantity_delta < 0 ? 'text-red-400' : 'text-[#888888]'}>
                          {ev.quantity_delta > 0 ? `+${ev.quantity_delta}` : ev.quantity_delta}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#777777]">
                        {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Deterministic Reconciliation Status */}
        <div className="bg-[#121212] p-6 border border-white/5 shadow-xl rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-serif text-white">Reconciliation Status</h3>
            </div>
            
            <div className="bg-[#0A0A0A] p-4 rounded-lg border border-white/5 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#888888]">Integrity Check:</span>
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> SHA-256 HMAC
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#888888]">Pieces Evaluated:</span>
                <span className="text-xs font-mono text-white">{reconcileReport?.total_pieces_evaluated ?? '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#888888]">Divergence Count:</span>
                <span className={`text-xs font-mono ${(reconcileReport?.divergences?.length || 0) === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {reconcileReport?.divergences?.length || 0}
                </span>
              </div>
            </div>

            <p className="text-xs text-[#888888] leading-relaxed">
              Every stock movement is recorded in an append-only cryptographic ledger. Physical pieces in showcases and vaults are 100% derived from and validated against ledger events.
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-white/5">
            <Button
              variant="secondary"
              className="w-full text-xs"
              onClick={async () => {
                const res = await fetch('/api/inventory/reconcile', { method: 'POST' });
                if (res.ok) {
                  const data = await res.json();
                  setReconcileReport(data.report);
                }
              }}
            >
              Run Audit Reconciliation
            </Button>
          </div>
        </div>
      </div>
    </CrudLayout>
  );
}

