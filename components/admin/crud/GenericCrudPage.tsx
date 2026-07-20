'use client';

import * as React from 'react';
import { Button } from '@/components/admin/ui';
import { Plus, Download, Edit2, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/admin/tables/DataTable';
import { CrudLayout } from '@/components/admin/crud/CrudLayout';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormField } from '@/components/admin/forms/FormField';

interface GenericCrudPageProps<T> {
  title: string;
  description: string;
  data: T[];
  isLoading: boolean;
  createMutation: { mutateAsync: (data: FormData) => Promise<unknown> };
  updateMutation: { mutateAsync: (params: { id: string, updates: Partial<FormData> }) => Promise<unknown> };
  deleteMutation: { mutateAsync: (id: string) => Promise<unknown> };
  entityName: string;
}

const schema = z.object({
  name_en: z.string().min(2, 'Name is required'),
  name_ar: z.string().optional(),
  slug: z.string().min(2, 'Slug is required'),
});
type FormData = z.infer<typeof schema>;

export function GenericCrudPage<T extends { id: string, name_en?: string, name_ar?: string, slug?: string }>({
  title,
  description,
  data,
  isLoading,
  createMutation,
  updateMutation,
  deleteMutation,
  entityName
}: GenericCrudPageProps<T>) {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState('');
  
  // Drawer state
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const methods = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name_en: '', name_ar: '', slug: '' }
  });

  const filteredData = React.useMemo(() => {
    if (!search) return data;
    return data.filter(item => 
      (item.name_en?.toLowerCase().includes(search.toLowerCase()) || 
       item.slug?.toLowerCase().includes(search.toLowerCase()))
    );
  }, [data, search]);

  const handleCreate = () => {
    setEditingId(null);
    methods.reset({ name_en: '', name_ar: '', slug: '' });
    setDrawerOpen(true);
  };

  const handleEdit = (item: T) => {
    setEditingId(item.id);
    methods.reset({ name_en: item.name_en || '', name_ar: item.name_ar || '', slug: item.slug || '' });
    setDrawerOpen(true);
  };

  const handleDeleteSelected = async () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.length} ${entityName}s?`)) {
      await Promise.all(selectedIds.map(id => deleteMutation.mutateAsync(id)));
      setSelectedIds([]);
    }
  };

  const handleDeleteOne = async (id: string) => {
    if (confirm(`Are you sure you want to delete this ${entityName}?`)) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const onSubmit = async (formData: FormData) => {
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, updates: formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
      setDrawerOpen(false);
    } catch {
      alert("Error saving record");
    }
  };

  return (
    <CrudLayout 
      title={title} 
      description={description}
      headerActions={
        <>
          <Button variant="secondary" className="gap-2"><Download className="w-4 h-4" /> Export</Button>
          <Button variant="primary" className="gap-2" onClick={handleCreate}><Plus className="w-4 h-4" /> New {entityName}</Button>
        </>
      }
    >
      <div className="animate-in fade-in duration-700">
        <DataTable
          data={filteredData}
          keyExtractor={(item) => item.id}
          isLoading={isLoading}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder={`Search ${entityName.toLowerCase()}s...`}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          bulkActions={
            <Button variant="danger" size="sm" onClick={handleDeleteSelected}>Delete Selected</Button>
          }
          columns={[
            {
              key: 'name_en',
              title: 'Name',
              render: (item) => <span className="text-white font-medium">{item.name_en}</span>
            },
            {
              key: 'slug',
              title: 'Slug',
              render: (item) => <span className="text-[#888888] font-mono">{item.slug}</span>
            },
            {
              key: 'actions',
              title: '',
              render: (item) => (
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}><Edit2 className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteOne(item.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></Button>
                </div>
              )
            }
          ]}
        />
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-full max-w-sm bg-[#121212] border-l border-white/5 shadow-2xl h-full flex flex-col animate-in slide-in-from-right">
            <div className="p-6 border-b border-white/5 bg-[#0A0A0A]/50">
              <h3 className="text-lg font-serif text-white">{editingId ? `Edit ${entityName}` : `New ${entityName}`}</h3>
            </div>
            
            <FormProvider {...methods}>
              <form onSubmit={methods.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <FormField name="name_en" label="Name (English)" />
                  <FormField name="name_ar" label="Name (Arabic)" />
                  <FormField name="slug" label="URL Slug" />
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
