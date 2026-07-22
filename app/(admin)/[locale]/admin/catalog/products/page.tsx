'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit3, 
  Copy, 
  Trash2, 
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { products as initialProducts } from '@/lib/products';
import { categories } from '@/lib/categories';
import type { Product } from '@/types/catalog';

function ProductsContent() {
  const searchParams = useSearchParams();

  // Search & Filter State
  const [query, setQuery] = React.useState(searchParams?.get('search') || '');
  const [selectedCategory, setSelectedCategory] = React.useState(searchParams?.get('category') || 'all');
  const [selectedStatus, setSelectedStatus] = React.useState(searchParams?.get('status') || 'all');
  const [sortBy, setSortBy] = React.useState(searchParams?.get('sort') || 'newest');
  const [currentPage, setCurrentPage] = React.useState(Number(searchParams?.get('page')) || 1);

  const pageSize = 8;

  // Filter Products
  const filteredProducts = React.useMemo(() => {
    let list = initialProducts.map((p) => ({
      id: p.id,
      slug: p.slug,
      sku: `BS-SIL-${p.id.toUpperCase()}`,
      name_en: p.name.en,
      name_ar: p.name.ar,
      category_name: p.category.toUpperCase(),
      collection_name: p.isLimited ? 'Luxe Limited' : 'Heritage Collection',
      selling_price: p.price,
      sale_price: p.price > 100 ? p.price * 0.9 : undefined,
      silver_weight_g: p.category === 'rings' ? 6.5 : p.category === 'necklaces' ? 14.2 : 9.8,
      current_stock: p.stockStatus === 'OUT_OF_STOCK' ? 0 : 25,
      status: (p.stockStatus === 'OUT_OF_STOCK' ? 'draft' : 'published') as Product['status'],
      visibility: 'public' as Product['visibility'],
      publishing_status: 'immediate' as Product['publishing_status'],
      featured: p.isBestSeller || false,
      new_arrival: p.isNew || false,
      best_seller: p.isBestSeller || false,
      primary_image: p.image,
      created_at: '2026-07-22',
    }));

    if (query) {
      const q = query.toLowerCase();
      list = list.filter(p => p.name_en.toLowerCase().includes(q) || p.name_ar.includes(q) || p.sku.toLowerCase().includes(q));
    }

    if (selectedCategory !== 'all') {
      list = list.filter(p => p.category_name.toLowerCase() === selectedCategory.toLowerCase());
    }

    if (selectedStatus !== 'all') {
      list = list.filter(p => p.status === selectedStatus);
    }

    if (sortBy === 'price-asc') {
      list.sort((a, b) => a.selling_price - b.selling_price);
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => b.selling_price - a.selling_price);
    }

    return list;
  }, [query, selectedCategory, selectedStatus, sortBy]);

  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleDuplicate = (id: string) => {
    alert(`Duplicated product BS-${id} successfully.`);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      alert(`Product ${id} archived.`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="text-[10px] tracking-[0.3em] uppercase text-primary font-bold">CATALOG MANAGEMENT</span>
          <h1 className="text-3xl font-serif text-white tracking-tight mt-1">Enterprise Products Module</h1>
          <p className="text-xs text-muted-foreground mt-1">Manage silver pricing, inventory weights, SEO metadata, and product listings.</p>
        </div>

        <div className="flex items-center gap-3">
          <button className="bg-white/5 text-white border border-white/10 px-4 py-2.5 rounded-xs text-xs font-medium uppercase tracking-wider flex items-center gap-2 hover:bg-white/10 transition-colors">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <Link href="/admin/catalog/products/new">
            <button className="bg-primary text-black px-4 py-2.5 rounded-xs text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-white transition-colors shadow-lg">
              <Plus className="w-4 h-4" /> Create Product
            </button>
          </Link>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-[#050505] border border-white/10 p-4 rounded-xs flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder="Search products by Name, SKU, Category..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-secondary/10 border border-white/10 rounded-xs pl-10 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter className="w-4 h-4 text-primary shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-secondary/10 border border-white/10 text-xs text-foreground rounded-xs px-3 py-2 focus:outline-none focus:border-primary"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c.slug} value={c.slug}>{c.name.en}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-secondary/10 border border-white/10 text-xs text-foreground rounded-xs px-3 py-2 focus:outline-none focus:border-primary"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>

          {/* Sorting */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-secondary/10 border border-white/10 text-xs text-foreground rounded-xs px-3 py-2 focus:outline-none focus:border-primary"
          >
            <option value="newest">Newest First</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>

      </div>

      {/* Professional Products Table */}
      <div className="bg-[#050505] border border-white/10 rounded-xs overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-primary uppercase text-[10px] tracking-wider font-semibold border-b border-white/10">
              <tr>
                <th className="p-4">Media</th>
                <th className="p-4">Product Name</th>
                <th className="p-4">SKU</th>
                <th className="p-4">Category</th>
                <th className="p-4">Collection</th>
                <th className="p-4">Price / Sale</th>
                <th className="p-4">Weight (g)</th>
                <th className="p-4">Stock</th>
                <th className="p-4">Status</th>
                <th className="p-4">Badges</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-muted-foreground text-sm">
                    No products found matching filters.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                    
                    {/* Image */}
                    <td className="p-4">
                      <div className="relative w-12 h-12 bg-secondary/20 rounded-xs overflow-hidden border border-white/10">
                        <Image src={p.primary_image} alt={p.name_en} fill className="object-cover" sizes="48px" />
                      </div>
                    </td>

                    {/* Product Name (EN & AR) */}
                    <td className="p-4">
                      <Link href={`/admin/catalog/products/${p.id}`} className="hover:text-primary font-medium text-white transition-colors block">
                        {p.name_en}
                      </Link>
                      <span className="text-[11px] text-muted-foreground">{p.name_ar}</span>
                    </td>

                    {/* SKU */}
                    <td className="p-4 font-mono text-[11px] text-primary">{p.sku}</td>

                    {/* Category */}
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-xs bg-white/5 text-[10px] font-mono text-muted-foreground border border-white/10 uppercase">
                        {p.category_name}
                      </span>
                    </td>

                    {/* Collection */}
                    <td className="p-4 text-muted-foreground text-xs">{p.collection_name}</td>

                    {/* Price & Sale Price */}
                    <td className="p-4">
                      <span className="font-semibold text-white">${p.selling_price.toFixed(2)}</span>
                      {p.sale_price && (
                        <span className="block text-[10px] text-emerald-400 font-mono">${p.sale_price.toFixed(2)} Sale</span>
                      )}
                    </td>

                    {/* Silver Weight */}
                    <td className="p-4 font-mono text-muted-foreground">{p.silver_weight_g} g</td>

                    {/* Stock */}
                    <td className="p-4">
                      <span className={`font-mono font-semibold ${p.current_stock > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {p.current_stock > 0 ? `${p.current_stock} pcs` : 'Out of stock'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-xs text-[9px] font-bold tracking-wider uppercase border ${
                        p.status === 'published' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}>
                        {p.status}
                      </span>
                    </td>

                    {/* Badges */}
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {p.best_seller && <span className="px-1.5 py-0.5 text-[8px] bg-primary/20 text-primary border border-primary/30 uppercase font-bold">BEST SELLER</span>}
                        {p.new_arrival && <span className="px-1.5 py-0.5 text-[8px] bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase font-bold">NEW</span>}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <Link href={`/en/product/${p.slug}`} target="_blank" className="p-1.5 text-muted-foreground hover:text-white hover:bg-white/10 rounded-xs">
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link href={`/admin/catalog/products/${p.id}`} className="p-1.5 text-primary hover:bg-primary/20 rounded-xs">
                          <Edit3 className="w-4 h-4" />
                        </Link>
                        <button onClick={() => handleDuplicate(p.id)} className="p-1.5 text-muted-foreground hover:text-white hover:bg-white/10 rounded-xs">
                          <Copy className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-xs">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/[0.02]">
          <span className="text-xs text-muted-foreground">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredProducts.length)} of {filteredProducts.length} Products
          </span>

          <div className="flex items-center gap-2">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="p-2 bg-white/5 border border-white/10 rounded-xs text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-primary font-mono px-3">Page {currentPage} of {totalPages}</span>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="p-2 bg-white/5 border border-white/10 rounded-xs text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}

export default function ProductsPage() {
  return (
    <React.Suspense fallback={<div className="p-12 text-center text-muted-foreground">Loading products module...</div>}>
      <ProductsContent />
    </React.Suspense>
  );
}
