'use client';

import * as React from 'react';
import { CrudLayout } from '@/components/admin/crud/CrudLayout';
import { Button } from '@/components/admin/ui';
import { ArrowLeft, CheckCircle2, Clock, User } from 'lucide-react';
import Link from 'next/link';

export default function TransferDetailPage() {
  // params?.id is omitted since it is unused in the mock UI.

  // Mock data for UI demonstration of the timeline
  const transfer = {
    reference_number: 'TRF-2026-0089',
    status: 'in_transit', // draft, pending_approval, approved, in_transit, completed, rejected, cancelled
    from: 'Central Warehouse (WH-01)',
    to: 'Retail Showroom (SH-03)',
    requested_by: 'Michael Hanna',
    approved_by: 'Sarah Ahmed',
    requested_at: '2026-07-21T08:00:00Z',
    approved_at: '2026-07-21T09:30:00Z',
  };

  const steps = [
    { label: 'Requested', date: transfer.requested_at, user: transfer.requested_by, done: true },
    { label: 'Approved', date: transfer.approved_at, user: transfer.approved_by, done: true },
    { label: 'In Transit', date: '2026-07-21T10:15:00Z', user: 'Logistics Team', done: transfer.status === 'in_transit' || transfer.status === 'completed' },
    { label: 'Received & Completed', date: null, user: null, done: transfer.status === 'completed' }
  ];

  return (
    <CrudLayout 
      title={`Transfer: ${transfer.reference_number}`} 
      description={`From ${transfer.from} to ${transfer.to}`}
      headerActions={
        <>
          <Link href="/admin/erp/warehouses/transfers">
            <Button variant="ghost" className="gap-2"><ArrowLeft className="w-4 h-4" /> Back</Button>
          </Link>
          {transfer.status === 'in_transit' && (
            <Button variant="primary" className="gap-2"><CheckCircle2 className="w-4 h-4" /> Mark as Received</Button>
          )}
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#121212] p-6 border border-white/5 shadow-xl">
            <h3 className="text-lg font-serif text-white mb-6">Transfer Items</h3>
            <div className="p-8 border border-white/5 bg-[#0A0A0A] rounded-md text-center">
              <p className="text-[#888888] mb-4">Silver Chains - 500g</p>
              <p className="text-[#888888]">Gold Rings - 150g</p>
            </div>
          </div>
        </div>

        {/* Timeline Visualization */}
        <div className="space-y-6">
          <div className="bg-[#121212] p-6 border border-white/5 shadow-xl rounded-xl">
            <h3 className="text-lg font-serif text-white mb-6">Workflow Timeline</h3>
            
            <div className="relative border-l border-white/10 ml-3 space-y-8">
              {steps.map((step, i) => (
                <div key={i} className="relative pl-6">
                  {step.done ? (
                    <CheckCircle2 className="absolute -left-[11px] top-0 w-5 h-5 text-green-500 bg-[#121212]" />
                  ) : (
                    <Clock className="absolute -left-[11px] top-0 w-5 h-5 text-[#888888] bg-[#121212]" />
                  )}
                  
                  <div className="-mt-1">
                    <p className={`font-medium ${step.done ? 'text-white' : 'text-[#888888]'}`}>{step.label}</p>
                    {step.date && <p className="text-xs text-[#888888] mt-1 font-mono">{new Date(step.date).toLocaleString()}</p>}
                    {step.user && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-[#888888]">
                        <User className="w-3 h-3" /> {step.user}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </CrudLayout>
  );
}
