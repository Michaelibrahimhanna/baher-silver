'use client';

import * as React from 'react';
import { Button } from '@/components/admin/ui';
import { Plus, Download, Edit2 } from 'lucide-react';
import { DataTable } from '@/components/admin/tables/DataTable';
import { CrudLayout } from '@/components/admin/crud/CrudLayout';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormField } from '@/components/admin/forms/FormField';
import { useSuppliers, useCreateSupplier, useUpdateSupplier } from '@/lib/hooks/useERP';
import type { Supplier } from '@/types/erp';
import Link from 'next/link';

const supplierSchema = z.object({
  code: z.string().min(2, 'Code is required'),
  name: z.string().min(2, 'Name is required'),
  contact_name: z.string().optional().nullable(),
  email: z.string().email('Invalid email').optional().or(z.literal('')).nullable(),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  currency: z.string().default('EGP'),
  tax_number: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  payment_terms: z.string().optional().nullable(),
  lead_time_days: z.number().default(0),
  rating: z.number().default(0),
  notes: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

export default function SuppliersPage() {
  const [search, setSearch] = React.useState('');
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const { data: result, isLoading } = useSuppliers({ search, page: 1, pageSize: 50 });
  const suppliers = result?.data || [];

  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier();

  const methods = useForm({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      code: '', name: '', contact_name: '', email: '', phone: '', whatsapp: '',
      currency: 'EGP', tax_number: '', address: '', city: '', country: '',
      payment_terms: '', lead_time_days: 0, rating: 0, notes: '', is_active: true
    }
  });

  const handleCreate = () => {
    setEditingId(null);
    methods.reset({
      code: '', name: '', contact_name: '', email: '', phone: '', whatsapp: '',
      currency: 'EGP', tax_number: '', address: '', city: '', country: '',
      payment_terms: '', lead_time_days: 0, rating: 0, notes: '', is_active: true
    });
    setDrawerOpen(true);
  };

  const handleEdit = (item: Supplier) => {
    setEditingId(item.id);
    methods.reset({
      code: item.code,
      name: item.name,
      contact_name: item.contact_name || '',
      email: item.email || '',
      phone: item.phone || '',
      whatsapp: item.whatsapp || '',
      currency: item.currency || 'EGP',
      tax_number: item.tax_number || '',
      address: item.address || '',
      city: item.city || '',
      country: item.country || '',
      payment_terms: item.payment_terms || '',
      lead_time_days: item.lead_time_days || 0,
      rating: item.rating || 0,
      notes: item.notes || '',
      is_active: item.is_active
    });
    setDrawerOpen(true);
  };

  const onSubmit = async (data: SupplierFormData) => {
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, updates: data });
      } else {
        await createMutation.mutateAsync(data);
      }
      setDrawerOpen(false);
    } catch (e: unknown) {
      if (e instanceof Error) alert(e.message);
    }
  };

  return (
    <CrudLayout 
      title="Suppliers" 
      description="Manage your manufacturing and material suppliers."
      headerActions={
        <>
          <Button variant="secondary" className="gap-2"><Download className="w-4 h-4" /> Export</Button>
          <Button variant="primary" className="gap-2" onClick={handleCreate}><Plus className="w-4 h-4" /> New Supplier</Button>
        </>
      }
    >
      <div className="animate-in fade-in duration-700">
        <DataTable
          data={suppliers}
          keyExtractor={(item) => item.id}
          isLoading={isLoading}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search suppliers by name or code..."
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          columns={[
            {
              key: 'code',
              title: 'Code',
              render: (item) => <span className="text-[#888888] font-mono">{item.code}</span>
            },
            {
              key: 'name',
              title: 'Supplier Name',
              render: (item) => (
                <Link href={`/admin/erp/suppliers/${item.id}`} className="text-white font-medium hover:text-primary transition-colors">
                  {item.name}
                </Link>
              )
            },
            {
              key: 'contact',
              title: 'Contact',
              render: (item) => <span className="text-[#888888]">{item.contact_name || '-'}</span>
            },
            {
              key: 'country',
              title: 'Country',
              render: (item) => <span className="text-[#888888]">{item.country || '-'}</span>
            },
            {
              key: 'status',
              title: 'Status',
              render: (item) => (
                <span className={`text-xs px-2 py-1 rounded-full ${item.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  {item.is_active ? 'Active' : 'Inactive'}
                </span>
              )
            },
            {
              key: 'actions',
              title: '',
              render: (item) => (
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}><Edit2 className="w-4 h-4" /></Button>
                </div>
              )
            }
          ]}
        />
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-full max-w-md bg-[#121212] border-l border-white/5 shadow-2xl h-full flex flex-col animate-in slide-in-from-right">
            <div className="p-6 border-b border-white/5 bg-[#0A0A0A]/50">
              <h3 className="text-lg font-serif text-white">{editingId ? 'Edit Supplier' : 'New Supplier'}</h3>
            </div>
            
            <FormProvider {...methods}>
              <form onSubmit={methods.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField name="code" label="Supplier Code" />
                    <FormField name="currency" label="Currency" />
                  </div>
                  <FormField name="name" label="Company Name" />
                  <FormField name="contact_name" label="Contact Person" />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField name="email" label="Email" />
                    <FormField name="phone" label="Phone" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField name="whatsapp" label="WhatsApp" />
                    <FormField name="tax_number" label="Tax Number" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField name="city" label="City" />
                    <FormField name="country" label="Country" />
                  </div>
                  <FormField name="address" label="Full Address" />
                </div>
                
                <div className="p-4 border-t border-white/5 bg-[#0A0A0A] flex gap-3">
                  <Button variant="ghost" className="flex-1" type="button" onClick={() => setDrawerOpen(false)}>Cancel</Button>
                  <Button variant="primary" className="flex-1" type="submit" disabled={methods.formState.isSubmitting}>
                    {methods.formState.isSubmitting ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </form>
            </FormProvider>
          </div>
        </div>
      )}
    </CrudLayout>
  );
}
