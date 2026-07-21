'use client';

import * as React from 'react';
import { Button } from '@/components/admin/ui';
import { Plus, Download } from 'lucide-react';
import { CrudLayout } from '@/components/admin/crud/CrudLayout';
import { DataTable } from '@/components/admin/tables/DataTable';

export default function InventoryTransactionsPage() {
  const [search, setSearch] = React.useState('');

  return (
    <CrudLayout 
      title="Inventory Transactions" 
      description="Unified view of all goods receipts, issues, adjustments, and counts."
      headerActions={
        <>
          <Button variant="secondary" className="gap-2"><Download className="w-4 h-4" /> Export Ledger</Button>
          <Button variant="primary" className="gap-2"><Plus className="w-4 h-4" /> New Transaction</Button>
        </>
      }
    >
      <div className="bg-[#121212] p-1 border border-white/5 shadow-xl rounded-xl">
        <DataTable
          data={[]}
          keyExtractor={(item: { id: string }) => item.id}
          isLoading={false}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by reference number or type..."
          columns={[
            {
              key: 'reference_number',
              title: 'Reference No.',
              render: () => <span className="text-[#888888] font-mono">-</span>
            },
            {
              key: 'type',
              title: 'Transaction Type',
              render: () => <span className="text-[#888888]">-</span>
            },
            {
              key: 'status',
              title: 'Status',
              render: () => <span className="text-[#888888]">-</span>
            },
            {
              key: 'created_at',
              title: 'Date',
              render: () => <span className="text-[#888888]">-</span>
            }
          ]}
        />
      </div>
    </CrudLayout>
  );
}
