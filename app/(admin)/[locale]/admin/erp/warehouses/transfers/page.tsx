'use client';

import * as React from 'react';
import { Button } from '@/components/admin/ui';
import { Plus, ArrowRightLeft, Store, Vault, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { CrudLayout } from '@/components/admin/crud/CrudLayout';
import Link from 'next/link';

export default function TransfersPage() {
  const [transfers, setTransfers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [openModal, setOpenModal] = React.useState(false);

  // Form State
  const [movementType, setMovementType] = React.useState<'VAULT_TO_SHOWCASE' | 'SHOWCASE_TO_VAULT' | 'WAREHOUSE_TRANSFER'>('VAULT_TO_SHOWCASE');
  const [pieceIdentifier, setPieceIdentifier] = React.useState('');
  const [fromWarehouse, setFromWarehouse] = React.useState('wh-cairo-main');
  const [toWarehouse, setToWarehouse] = React.useState('wh-alex-branch');
  const [targetLocation, setTargetLocation] = React.useState('SHOWCASE-01');
  const [reason, setReason] = React.useState('Display replenishment');
  const [submitting, setSubmitting] = React.useState(false);
  const [resultMsg, setResultMsg] = React.useState<{ success: boolean; message: string } | null>(null);

  const fetchTransfers = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/inventory/ledger?limit=50');
      if (res.ok) {
        const data = await res.json();
        const transferEvents = (data.events || []).filter(
          (e: any) =>
            e.movement_type === 'TRANSFER_OUT' ||
            e.movement_type === 'TRANSFER_IN' ||
            e.movement_type === 'VAULT_TO_SHOWCASE' ||
            e.movement_type === 'SHOWCASE_TO_VAULT'
        );
        setTransfers(transferEvents);
      }
    } catch (e) {
      console.error('Failed to load transfers', e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResultMsg(null);

    try {
      if (movementType === 'WAREHOUSE_TRANSFER') {
        const res = await fetch('/api/inventory/transfers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serial_number: pieceIdentifier,
            from_warehouse_id: fromWarehouse,
            to_warehouse_id: toWarehouse,
            to_location_code: targetLocation || 'VAULT-A1',
            reason
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setResultMsg({ success: true, message: `Transfer #${data.transfer_id} executed successfully!` });
          fetchTransfers();
        } else {
          setResultMsg({ success: false, message: data.message || 'Transfer failed.' });
        }
      } else {
        const res = await fetch('/api/inventory/movements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serial_number: pieceIdentifier,
            movement_type: movementType,
            dest_location_code: targetLocation,
            reason
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setResultMsg({ success: true, message: `Movement recorded successfully! Piece is now in ${data.piece.location_code}.` });
          fetchTransfers();
        } else {
          setResultMsg({ success: false, message: data.message || 'Movement failed.' });
        }
      }
    } catch (err: any) {
      setResultMsg({ success: false, message: err.message || 'Network error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CrudLayout 
      title="Warehouse & Showcase Transfers" 
      description="Orchestrate secure custody transfers between Central Vault, Showcases, and Branch Vaults."
      headerActions={
        <div className="flex gap-2">
          <Button
            variant="ghost"
            className="gap-2 text-[#888888] hover:text-white"
            onClick={fetchTransfers}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="primary" className="gap-2" onClick={() => setOpenModal(!openModal)}>
            <Plus className="w-4 h-4" /> {openModal ? 'Close Form' : 'New Transfer'}
          </Button>
        </div>
      }
    >
      {/* Transfer Execution Form Modal/Panel */}
      {openModal && (
        <div className="bg-[#151515] p-6 border border-amber-500/20 shadow-2xl rounded-xl mb-8">
          <h3 className="text-base font-serif text-white mb-4 flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-amber-400" /> Execute Authoritative Stock Movement
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-[#888888] mb-1">Movement Operation</label>
                <select
                  value={movementType}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setMovementType(val);
                    if (val === 'VAULT_TO_SHOWCASE') setTargetLocation('SHOWCASE-01');
                    else if (val === 'SHOWCASE_TO_VAULT') setTargetLocation('VAULT-A1');
                    else setTargetLocation('VAULT-A1');
                  }}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="VAULT_TO_SHOWCASE">Vault Safe &rarr; Showcase Floor (Display)</option>
                  <option value="SHOWCASE_TO_VAULT">Showcase Floor &rarr; Vault Safe (Return)</option>
                  <option value="WAREHOUSE_TRANSFER">Inter-Warehouse Branch Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#888888] mb-1">Piece Serial Number or Barcode</label>
                <input
                  type="text"
                  placeholder="e.g. SN-BHR-2026-0100"
                  value={pieceIdentifier}
                  onChange={(e) => setPieceIdentifier(e.target.value)}
                  required
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs text-[#888888] mb-1">Destination Location Code</label>
                <input
                  type="text"
                  value={targetLocation}
                  onChange={(e) => setTargetLocation(e.target.value)}
                  required
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {movementType === 'WAREHOUSE_TRANSFER' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs text-[#888888] mb-1">Source Warehouse</label>
                  <select
                    value={fromWarehouse}
                    onChange={(e) => setFromWarehouse(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="wh-cairo-main">wh-cairo-main (Cairo Central Vault)</option>
                    <option value="wh-alex-branch">wh-alex-branch (Alexandria Branch Vault)</option>
                    <option value="wh-online-fulfillment">wh-online-fulfillment (E-Commerce Fulfillment)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#888888] mb-1">Destination Warehouse</label>
                  <select
                    value={toWarehouse}
                    onChange={(e) => setToWarehouse(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="wh-alex-branch">wh-alex-branch (Alexandria Branch Vault)</option>
                    <option value="wh-cairo-main">wh-cairo-main (Cairo Central Vault)</option>
                    <option value="wh-online-fulfillment">wh-online-fulfillment (E-Commerce Fulfillment)</option>
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs text-[#888888] mb-1">Reason / Justification</label>
              <input
                type="text"
                placeholder="Reason for movement..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            {resultMsg && (
              <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                resultMsg.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {resultMsg.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{resultMsg.message}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setOpenModal(false)}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Executing...' : 'Confirm Movement'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Transfer History Table */}
      <div className="bg-[#121212] p-6 border border-white/5 shadow-xl rounded-xl">
        <h3 className="text-base font-serif text-white mb-4">Transfer Audit History</h3>

        {loading ? (
          <p className="text-[#888888] text-sm text-center py-8">Loading transfers...</p>
        ) : transfers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[#888888] text-sm mb-2">No active transfers recorded.</p>
            <Button variant="secondary" size="sm" onClick={() => setOpenModal(true)}>
              Execute First Movement
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#aaaaaa]">
              <thead className="border-b border-white/5 text-[#888888] uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3">Piece / Item</th>
                  <th className="py-2 px-3">Source &rarr; Destination</th>
                  <th className="py-2 px-3">Reason</th>
                  <th className="py-2 px-3 text-right">Reference ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transfers.map((tr: any) => (
                  <tr key={tr.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[#777777]">
                      {new Date(tr.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                        tr.movement_type === 'VAULT_TO_SHOWCASE' || tr.movement_type === 'SHOWCASE_TO_VAULT'
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        {tr.movement_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-white">
                      {tr.serial_number || tr.sku}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[#888888]">{tr.source_location_code || tr.source_warehouse_id || 'VAULT'}</span>
                      <span className="text-amber-400 mx-1">&rarr;</span>
                      <span className="text-white">{tr.dest_location_code || tr.dest_warehouse_id}</span>
                    </td>
                    <td className="py-2.5 px-3 text-[#aaaaaa]">
                      {tr.reason}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[#666666]">
                      {tr.reference_id || tr.id.substring(0, 12)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </CrudLayout>
  );
}

