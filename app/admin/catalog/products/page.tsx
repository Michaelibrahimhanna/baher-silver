'use client';

import * as React from 'react';
import { Button, Badge } from '@/components/admin/ui';
import { Plus, Download, Settings2, Eye } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useProducts, useDeleteProduct } from '@/lib/hooks/useCatalog';
import type { Product } from '@/types/catalog';
import { DataTable } from '@/components/admin/tables/DataTable';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { CrudLayout } from '@/components/admin/crud/CrudLayout';

function ProductsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL state
  const page = Number(searchParams?.get('page')) || 1;
  const search = searchParams?.get('search') || '';
  const status = searchParams?.get('status') || '';
  const pageSize = 10;

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  
  const { data: result, isLoading } = useProducts({ page, pageSize, search, status });
  const products = result?.data || [];
  const totalCount = result?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const deleteMutation = useDeleteProduct();

  const handleSearchChange = (query: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    if (query) {
      params.set('search', query);
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set('page', newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleRowClick = (product: Product) => {
    setSelectedProduct(product);
    setDrawerOpen(true);
  };

  const handleDeleteSelected = async () => {
    if (confirm(`Are you sure you want to archive ${selectedIds.length} products?`)) {
      await Promise.all(selectedIds.map(id => deleteMutation.mutateAsync(id)));
      setSelectedIds([]);
    }
  };

  return (
    <CrudLayout 
      title="Products" 
      description="Manage the entire jewelry catalog."
      headerActions={
        <>
          <Button variant="secondary" className="gap-2"><Download className="w-4 h-4" /> Export</Button>
          <Link href="/admin/catalog/products/new">
            <Button variant="primary" className="gap-2"><Plus className="w-4 h-4" /> New Product</Button>
          </Link>
        </>
      }
    >
      <div className="animate-in fade-in duration-700">
        <DataTable
          data={products}
          keyExtractor={(p) => p.id}
          isLoading={isLoading}
          searchQuery={search}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Search products..."
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalCount}
          onPageChange={handlePageChange}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          bulkActions={
            <Button variant="danger" size="sm" onClick={handleDeleteSelected}>Archive Selected</Button>
          }
          columns={[
            {
              key: 'name_en',
              title: 'Product',
              render: (p) => (
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleRowClick(p)}>
                  <div className="w-10 h-10 bg-white/5 rounded flex-shrink-0 overflow-hidden">
                    {/* Placeholder for primary image */}
                  </div>
                  <div>
                    <p className="text-white font-medium hover:underline">{p.name_en || 'Untitled Product'}</p>
                    <p className="text-xs text-[#888888] font-mono">{p.slug}</p>
                  </div>
                </div>
              )
            },
            {
              key: 'taxonomy',
              title: 'Brand / Material',
              render: (p) => (
                <div className="text-[#888888] text-xs">
                  {p.brand?.name_en || 'No Brand'} • {p.material?.name_en || 'No Material'}
                </div>
              )
            },
            {
              key: 'status',
              title: 'Status',
              render: (p) => <Badge variant={p.status === 'published' ? 'success' : 'warning'}>{p.status || 'draft'}</Badge>
            },
            {
              key: 'actions',
              title: '',
              render: (p) => (
                <div className="flex justify-end">
                  <Button variant="ghost" size="icon" onClick={() => handleRowClick(p)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              )
            }
          ]}
        />
      </div>

      {/* Product Preview Drawer */}
      <AnimatePresence>
        {drawerOpen && selectedProduct && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-[#121212] border-l border-white/5 shadow-2xl z-50 flex flex-col"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0A0A0A]/50">
                <h3 className="text-lg font-serif text-white">Product Preview</h3>
                <button onClick={() => setDrawerOpen(false)} className="text-[#888888] hover:text-white"><Settings2 className="w-5 h-5 rotate-45" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                <div className="aspect-square bg-white/5 rounded-lg border border-white/5 flex items-center justify-center text-[#555555]">Image Preview</div>
                <div>
                  <h2 className="text-2xl font-serif text-white">{selectedProduct.name_en || 'Untitled Product'}</h2>
                  <p className="text-sm text-[#888888] font-mono mt-1">{selectedProduct.slug || 'no-slug'}</p>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-[#888888]">Status</span>
                    <Badge variant={selectedProduct.status === 'published' ? 'success' : 'warning'}>{selectedProduct.status || 'draft'}</Badge>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-[#888888]">Brand</span>
                    <span className="text-white">{selectedProduct.brand?.name_en || 'None'}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-[#888888]">Material</span>
                    <span className="text-white">{selectedProduct.material?.name_en || 'None'}</span>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-white/5 bg-[#0A0A0A] flex gap-3">
                <Link href={`/admin/catalog/products/${selectedProduct.id}`} className="flex-1">
                  <Button variant="primary" className="w-full">Full Edit</Button>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </CrudLayout>
  );
}

export default function ProductsPage() {
  return (
    <React.Suspense fallback={<div className="p-12 text-center text-[#888888]">Loading products...</div>}>
      <ProductsContent />
    </React.Suspense>
  );
}
