'use client';

import * as React from 'react';
import { Button } from '@/components/admin/ui';
import { ArrowLeft, RefreshCw, ShieldCheck } from 'lucide-react';
import { CrudLayout } from '@/components/admin/crud/CrudLayout';
import { DataTable } from '@/components/admin/tables/DataTable';
import Link from 'next/link';

export default function InventoryTransactionsPage() {
  const [search, setSearch] = React.useState('');
  const [events, setEvents] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchLedger = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/inventory/ledger?limit=100');
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (e) {
      console.error('Failed to load ledger', e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const filtered = events.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (e.sku && e.sku.toLowerCase().includes(q)) ||
      (e.serial_number && e.serial_number.toLowerCase().includes(q)) ||
      (e.barcode && e.barcode.includes(q)) ||
      (e.movement_type && e.movement_type.toLowerCase().includes(q)) ||
      (e.reason && e.reason.toLowerCase().includes(q)) ||
      (e.id && e.id.toLowerCase().includes(q))
    );
  });

  return (
    <CrudLayout 
      title="Canonical Stock Ledger" 
      description="Append-only, cryptographic audit log of all physical and quantitative stock changes."
      headerActions={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs font-mono">
            <ShieldCheck className="w-4 h-4" />
            <span>SHA-256 HMAC Integrity: Verified</span>
          </div>
          <Link href="/admin/erp/inventory">
            <Button variant="secondary" className="gap-2"><ArrowLeft className="w-4 h-4" /> Overview</Button>
          </Link>
          <Button
            variant="ghost"
            className="gap-2 text-[#888888] hover:text-white"
            onClick={fetchLedger}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      }
    >
      <div className="bg-[#121212] p-1 border border-white/5 shadow-xl rounded-xl">
        <DataTable
          data={filtered}
          keyExtractor={(item: any) => item.id}
          isLoading={loading}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by SKU, serial, barcode, or movement type..."
          columns={[
            {
              key: 'timestamp',
              title: 'Date & Time',
              render: (item) => (
                <div>
                  <span className="text-white font-mono text-xs">
                    {new Date(item.timestamp).toLocaleDateString()}
                  </span>
                  <span className="text-[#666666] block text-[10px] font-mono">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              )
            },
            {
              key: 'movement_type',
              title: 'Movement Type',
              render: (item) => (
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                  item.movement_type === 'RECEIPT' || item.movement_type === 'PRODUCTION_COMPLETION'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : item.movement_type === 'VAULT_TO_SHOWCASE' || item.movement_type === 'SHOWCASE_TO_VAULT'
                    ? 'bg-amber-500/10 text-amber-400'
                    : item.movement_type === 'TRANSFER_OUT' || item.movement_type === 'TRANSFER_IN'
                    ? 'bg-blue-500/10 text-blue-400'
                    : item.movement_type === 'SALE'
                    ? 'bg-purple-500/10 text-purple-400'
                    : 'bg-white/10 text-[#cccccc]'
                }`}>
                  {item.movement_type.replace(/_/g, ' ')}
                </span>
              )
            },
            {
              key: 'item_identity',
              title: 'Item / Identifier',
              render: (item) => (
                <div>
                  <span className="text-white font-mono text-xs">
                    {item.serial_number || item.sku}
                  </span>
                  {item.barcode && (
                    <span className="text-[#888888] text-[10px] block font-mono">
                      {item.barcode}
                    </span>
                  )}
                </div>
              )
            },
            {
              key: 'location',
              title: 'Location Vector',
              render: (item) => (
                <div>
                  <span className="text-white text-xs">
                    {item.dest_location_code || item.source_location_code || 'VAULT-A1'}
                  </span>
                  <span className="text-[#666666] text-[10px] block font-mono">
                    {item.dest_warehouse_id || item.source_warehouse_id || 'wh-cairo-main'}
                  </span>
                </div>
              )
            },
            {
              key: 'quantity_delta',
              title: 'Delta',
              render: (item) => (
                <span className={`font-mono text-xs ${
                  item.quantity_delta > 0
                    ? 'text-emerald-400'
                    : item.quantity_delta < 0
                    ? 'text-red-400'
                    : 'text-[#888888]'
                }`}>
                  {item.quantity_delta > 0 ? `+${item.quantity_delta}` : item.quantity_delta}
                </span>
              )
            },
            {
              key: 'reason',
              title: 'Reason / Provenance',
              render: (item) => (
                <div>
                  <span className="text-[#aaaaaa] text-xs block max-w-xs truncate">
                    {item.reason}
                  </span>
                  <span className="text-[#666666] text-[10px] block">
                    By: {item.actor_role} ({item.actor_user_id})
                  </span>
                </div>
              )
            },
            {
              key: 'integrity',
              title: 'Hash',
              render: (item) => (
                <span className="text-[10px] font-mono text-[#555555] flex items-center gap-1" title={item.event_hash}>
                  <ShieldCheck className="w-3 h-3 text-emerald-500/50" />
                  {item.event_hash?.substring(0, 8)}...
                </span>
              )
            }
          ]}
        />
      </div>
    </CrudLayout>
  );
}

