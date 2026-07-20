'use client';

import * as React from 'react';
import { Button, Input, Table, Th, Td, Badge, Pagination, Filter } from '@/components/admin/ui';
import { Search, Plus, SlidersHorizontal, Settings2, Download, MoreHorizontal, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProductsPage() {
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  return (
    <div className="space-y-6 animate-in fade-in duration-700 h-full flex flex-col">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-serif text-white tracking-tight">Products</h1>
          <p className="text-[#888888] font-light mt-1">Manage the entire jewelry catalog.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="gap-2"><Download className="w-4 h-4" /> Export</Button>
          <Link href="/admin/catalog/products/new">
            <Button variant="primary" className="gap-2"><Plus className="w-4 h-4" /> New Product</Button>
          </Link>
        </div>
      </div>

      {/* Advanced Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#121212] border border-white/5 rounded-lg">
        <div className="flex items-center gap-3 flex-1 min-w-[300px]">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#555555]" />
            <Input placeholder="Search products by name, SKU, or tag..." className="pl-9 bg-[#0A0A0A] border-white/5" />
          </div>
          <Filter />
          <Button variant="ghost" className="gap-2 px-3 text-[#888888] hover:text-white"><SlidersHorizontal className="w-4 h-4" /> Saved Views</Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="px-2 text-[#888888]"><LayoutGrid className="w-4 h-4" /></Button>
          <Button variant="ghost" className="px-2 text-[#888888]"><Settings2 className="w-4 h-4" /> Columns</Button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-[#121212] border border-white/5 rounded-lg flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-auto">
          <Table>
            <thead>
              <tr>
                <Th className="w-12"><input type="checkbox" className="accent-white" /></Th>
                <Th>Product Name</Th>
                <Th>SKU</Th>
                <Th>Status</Th>
                <Th>Inventory</Th>
                <Th>Price</Th>
                <Th className="w-12"></Th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setDrawerOpen(true)}>
                  <Td onClick={e => e.stopPropagation()}><input type="checkbox" className="accent-white" /></Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/5 rounded flex-shrink-0"></div>
                      <div>
                        <p className="text-white font-medium">Elegance Silver Ring {i+1}</p>
                        <p className="text-xs text-[#888888]">Rings • Silver 925</p>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-[#888888] font-mono text-xs">BH-R-925-{100+i}</Td>
                  <Td><Badge variant={i % 3 === 0 ? "warning" : "success"}>{i % 3 === 0 ? 'Draft' : 'Published'}</Badge></Td>
                  <Td className="text-white">45 <span className="text-xs text-[#888888]">in 2 variants</span></Td>
                  <Td className="text-white font-mono">$1,250.00</Td>
                  <Td onClick={e => e.stopPropagation()}>
                    <button className="text-[#555555] hover:text-white transition-colors"><MoreHorizontal className="w-5 h-5" /></button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
        <Pagination />
      </div>

      {/* Product Preview Drawer */}
      <AnimatePresence>
        {drawerOpen && (
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
                  <h2 className="text-2xl font-serif text-white">Elegance Silver Ring</h2>
                  <p className="text-sm text-[#888888] font-mono mt-1">BH-R-925-100</p>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-[#888888]">Price</span>
                    <span className="text-white font-mono">$1,250.00</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-[#888888]">Inventory</span>
                    <span className="text-white">45 units</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-[#888888]">Status</span>
                    <Badge variant="success">Published</Badge>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-white/5 bg-[#0A0A0A] flex gap-3">
                <Link href="/admin/catalog/products/1" className="flex-1"><Button variant="primary" className="w-full">Full Edit</Button></Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
