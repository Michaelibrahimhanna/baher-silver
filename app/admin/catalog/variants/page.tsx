'use client';

import * as React from 'react';
import { CrudLayout } from '@/components/admin/crud/CrudLayout';
import { DataTable } from '@/components/admin/tables/DataTable';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export default function VariantsPage() {
  const supabase = createClient();
  const [search, setSearch] = React.useState('');

  const { data: variants, isLoading } = useQuery({
    queryKey: ['all_variants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_variants')
        .select(`*, product:products(name_en)`)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const filteredVariants = React.useMemo(() => {
    if (!search) return variants || [];
    return (variants || []).filter(v => 
      v.sku?.toLowerCase().includes(search.toLowerCase()) || 
      v.product?.name_en?.toLowerCase().includes(search.toLowerCase())
    );
  }, [variants, search]);

  return (
    <CrudLayout 
      title="Variants (SKUs)" 
      description="View all product variations across the catalog."
    >
      <div className="animate-in fade-in duration-700">
        <DataTable
          data={filteredVariants}
          keyExtractor={(v) => v.id}
          isLoading={isLoading}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search SKUs or Products..."
          columns={[
            {
              key: 'sku',
              title: 'SKU',
              render: (v) => <span className="text-white font-mono">{v.sku || 'No SKU'}</span>
            },
            {
              key: 'product',
              title: 'Product',
              render: (v) => <span className="text-white font-medium">{v.product?.name_en || 'Unknown'}</span>
            },
            {
              key: 'size',
              title: 'Size / Color',
              render: (v) => <span className="text-[#888888]">{v.size || '-'} / {v.color || '-'}</span>
            },
            {
              key: 'price',
              title: 'Price',
              render: (v) => <span className="text-green-400 font-mono">${v.sale_price || v.regular_price || '0'}</span>
            }
          ]}
        />
      </div>
    </CrudLayout>
  );
}
