'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { CrudLayout } from '@/components/admin/crud/CrudLayout';
import { useSupplier } from '@/lib/hooks/useERP';
import { Button } from '@/components/admin/ui';
import { Edit2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SupplierDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { data: supplier, isLoading } = useSupplier(id);

  if (isLoading) return <div className="p-12 text-[#888888]">Loading...</div>;
  if (!supplier) return <div className="p-12 text-red-400">Supplier not found.</div>;

  return (
    <CrudLayout 
      title={supplier.name} 
      description={`Supplier Code: ${supplier.code}`}
      headerActions={
        <>
          <Link href="/admin/erp/suppliers">
            <Button variant="ghost" className="gap-2"><ArrowLeft className="w-4 h-4" /> Back</Button>
          </Link>
          <Button variant="primary" className="gap-2"><Edit2 className="w-4 h-4" /> Edit Supplier</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in duration-700">
        
        {/* KPIs */}
        <div className="bg-[#121212] p-6 border border-white/5 shadow-xl">
          <p className="text-sm text-[#888888] tracking-widest uppercase mb-2">Rating</p>
          <p className="text-3xl font-serif text-white">{supplier.rating} / 5.0</p>
        </div>
        <div className="bg-[#121212] p-6 border border-white/5 shadow-xl">
          <p className="text-sm text-[#888888] tracking-widest uppercase mb-2">Lead Time</p>
          <p className="text-3xl font-serif text-white">{supplier.lead_time_days} Days</p>
        </div>
        <div className="bg-[#121212] p-6 border border-white/5 shadow-xl">
          <p className="text-sm text-[#888888] tracking-widest uppercase mb-2">Payment Terms</p>
          <p className="text-xl font-medium text-white mt-3">{supplier.payment_terms || 'N/A'}</p>
        </div>
        <div className="bg-[#121212] p-6 border border-white/5 shadow-xl">
          <p className="text-sm text-[#888888] tracking-widest uppercase mb-2">Status</p>
          <span className={`inline-block mt-2 px-3 py-1 text-sm rounded-full ${supplier.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
            {supplier.is_active ? 'Active Partner' : 'Inactive'}
          </span>
        </div>

        {/* Details */}
        <div className="md:col-span-2 bg-[#121212] p-6 border border-white/5 shadow-xl">
          <h3 className="text-lg font-serif text-white mb-6">Contact Information</h3>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-3 border-b border-white/5 pb-2">
              <span className="text-[#888888]">Contact Person</span>
              <span className="col-span-2 text-white">{supplier.contact_name || '-'}</span>
            </div>
            <div className="grid grid-cols-3 border-b border-white/5 pb-2">
              <span className="text-[#888888]">Email</span>
              <span className="col-span-2 text-white">{supplier.email || '-'}</span>
            </div>
            <div className="grid grid-cols-3 border-b border-white/5 pb-2">
              <span className="text-[#888888]">Phone</span>
              <span className="col-span-2 text-white">{supplier.phone || '-'}</span>
            </div>
            <div className="grid grid-cols-3 border-b border-white/5 pb-2">
              <span className="text-[#888888]">WhatsApp</span>
              <span className="col-span-2 text-white">{supplier.whatsapp || '-'}</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 bg-[#121212] p-6 border border-white/5 shadow-xl">
          <h3 className="text-lg font-serif text-white mb-6">Business Details</h3>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-3 border-b border-white/5 pb-2">
              <span className="text-[#888888]">Currency ID</span>
              <span className="col-span-2 text-white font-mono">{supplier.currency_id}</span>
            </div>
            <div className="grid grid-cols-3 border-b border-white/5 pb-2">
              <span className="text-[#888888]">Tax Number</span>
              <span className="col-span-2 text-white font-mono">{supplier.tax_number || '-'}</span>
            </div>
            <div className="grid grid-cols-3 border-b border-white/5 pb-2">
              <span className="text-[#888888]">Location</span>
              <span className="col-span-2 text-white">{[supplier.city, supplier.country].filter(Boolean).join(', ') || '-'}</span>
            </div>
            <div className="grid grid-cols-3 border-b border-white/5 pb-2">
              <span className="text-[#888888]">Address</span>
              <span className="col-span-2 text-white">{supplier.address || '-'}</span>
            </div>
          </div>
        </div>

      </div>
    </CrudLayout>
  );
}
