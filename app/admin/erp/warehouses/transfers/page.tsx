'use client';

import * as React from 'react';
import { Button } from '@/components/admin/ui';
import { Plus } from 'lucide-react';
import { CrudLayout } from '@/components/admin/crud/CrudLayout';
import Link from 'next/link';

export default function TransfersPage() {
  return (
    <CrudLayout 
      title="Warehouse Transfers" 
      description="Manage and track stock movement between locations."
      headerActions={
        <>
          <Button variant="primary" className="gap-2"><Plus className="w-4 h-4" /> New Transfer</Button>
        </>
      }
    >
      <div className="bg-[#121212] p-6 border border-white/5 shadow-xl text-center">
        <p className="text-[#888888] mb-4">No active transfers.</p>
        <Link href="/admin/erp/warehouses/transfers/demo-123">
          <Button variant="secondary">View Demo Timeline</Button>
        </Link>
      </div>
    </CrudLayout>
  );
}
