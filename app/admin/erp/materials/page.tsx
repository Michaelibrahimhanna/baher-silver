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
import { useMaterials, useUpdateMaterial } from '@/lib/hooks/useERP';
import type { Material } from '@/types/catalog';
import Link from 'next/link';

const materialSchema = z.object({
  name_en: z.string().min(2, 'Name is required'),
  name_ar: z.string().optional(),
  slug: z.string().min(2, 'Slug is required'),
  type: z.enum(['raw_material', 'packaging', 'consumable']).default('raw_material'),
  purity: z.string().optional(),
  unit: z.enum(['g', 'kg', 'piece']).default('g'),
  standard_cost: z.number().default(0),
  market_cost: z.number().default(0),
  min_stock: z.number().default(0),
});

type MaterialFormData = z.infer<typeof materialSchema>;

export default function MaterialsPage() {
  const [search, setSearch] = React.useState('');
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const { data: result, isLoading } = useMaterials({ search, page: 1, pageSize: 50 });
  const materials = result?.data || [];

  const updateMutation = useUpdateMaterial();

  const methods = useForm({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      name_en: '', name_ar: '', slug: '', type: 'raw_material', purity: '', unit: 'g',
      standard_cost: 0, market_cost: 0, min_stock: 0
    }
  });

  const handleEdit = (item: Material) => {
    setEditingId(item.id);
    methods.reset({
      name_en: item.name_en,
      name_ar: item.name_ar || '',
      slug: item.slug,
      type: item.type || 'raw_material',
      purity: item.purity || '',
      unit: item.unit || 'g',
      standard_cost: item.standard_cost || 0,
      market_cost: item.market_cost || 0,
      min_stock: item.min_stock || 0,
    });
    setDrawerOpen(true);
  };

  const onSubmit = async (data: MaterialFormData) => {
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, updates: data });
        setDrawerOpen(false);
      }
    } catch (e: unknown) {
      if (e instanceof Error) alert(e.message);
    }
  };

  return (
    <CrudLayout 
      title="Materials & Components" 
      description="Manage raw materials, packaging, and their costs."
      headerActions={
        <>
          <Button variant="secondary" className="gap-2"><Download className="w-4 h-4" /> Export</Button>
          <Button variant="primary" className="gap-2"><Plus className="w-4 h-4" /> New Material</Button>
        </>
      }
    >
      <div className="animate-in fade-in duration-700">
        <DataTable
          data={materials}
          keyExtractor={(item) => item.id}
          isLoading={isLoading}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search materials..."
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          columns={[
            {
              key: 'name',
              title: 'Material Name',
              render: (item) => (
                <Link href={`/admin/erp/materials/${item.id}`} className="text-white font-medium hover:text-primary transition-colors">
                  {item.name_en}
                </Link>
              )
            },
            {
              key: 'type',
              title: 'Type',
              render: (item) => <span className="text-[#888888] capitalize">{item.type?.replace('_', ' ')}</span>
            },
            {
              key: 'purity',
              title: 'Purity',
              render: (item) => <span className="text-[#888888]">{item.purity || '-'}</span>
            },
            {
              key: 'avg_cost',
              title: 'Avg Cost',
              render: (item) => <span className="text-white">{item.average_cost?.toFixed(2) || '0.00'} / {item.unit}</span>
            },
            {
              key: 'market_cost',
              title: 'Market Cost',
              render: (item) => <span className="text-[#888888]">{item.market_cost?.toFixed(2) || '0.00'} / {item.unit}</span>
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
              <h3 className="text-lg font-serif text-white">Edit Material</h3>
            </div>
            
            <FormProvider {...methods}>
              <form onSubmit={methods.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <FormField name="name_en" label="Name (English)" />
                  <FormField name="slug" label="Slug" />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField name="type" label="Material Type" />
                    <FormField name="unit" label="Unit of Measure" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField name="purity" label="Purity (e.g. 925)" />
                    <FormField name="min_stock" label="Min Stock Alert" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                    <FormField name="standard_cost" label="Standard Cost" />
                    <FormField name="market_cost" label="Market Cost" />
                  </div>
                </div>
                
                <div className="p-4 border-t border-white/5 bg-[#0A0A0A] flex gap-3">
                  <Button variant="ghost" className="flex-1" type="button" onClick={() => setDrawerOpen(false)}>Cancel</Button>
                  <Button variant="primary" className="flex-1" type="submit" disabled={methods.formState.isSubmitting}>
                    {methods.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
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
