'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Package, 
  Tags, 
  ShoppingCart, 
  Users, 
  DollarSign, 
  Scale, 
  AlertTriangle, 
  Plus, 
  Boxes, 
  Sparkles, 
  ArrowUpRight,
  TrendingUp
} from 'lucide-react';
import { products } from '@/lib/products';
import { categories } from '@/lib/categories';

export default function MissionControlDashboard() {
  const totalProducts = products.length;
  const totalCategories = categories.length;
  const totalOrders = 128;
  const totalCustomers = 450;
  const totalRevenue = "$38,450";
  const silverStockGrams = "14,850 g";
  const lowInventoryCount = 2;

  const mockRecentOrders = [
    { id: 'BS-2026-0001', customer: 'Alexander Wright', items: '2 Items', total: '$270.00', status: 'PAID', date: '2026-07-22' },
    { id: 'BS-2026-0002', customer: 'Nour El Din', items: '1 Item', total: '$120.00', status: 'SHIPPED', date: '2026-07-22' },
    { id: 'BS-2026-0003', customer: 'Yasmine Mansour', items: '3 Items', total: '$410.00', status: 'PROCESSING', date: '2026-07-21' },
    { id: 'BS-2026-0004', customer: 'Mariam Hassan', items: '1 Item', total: '$95.00', status: 'PAID', date: '2026-07-21' },
  ];

  const mockTopSellers = products.slice(0, 3);

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-16">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-6">
        <div>
          <span className="text-[10px] tracking-[0.3em] uppercase text-primary font-bold">BAHER OS • MISSION CONTROL</span>
          <h1 className="text-3xl md:text-4xl font-serif text-white tracking-tight mt-1">Store Intelligence & Operations</h1>
          <p className="text-xs text-muted-foreground mt-1">Real-time stats, inventory levels, order tracking, and AI management.</p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/admin/catalog/products/new">
            <button className="bg-primary text-black px-4 py-2.5 rounded-xs text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-white transition-colors shadow-lg">
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          </Link>
          <Link href="/admin/brain">
            <button className="bg-white/10 text-white border border-white/20 px-4 py-2.5 rounded-xs text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-white/20 transition-colors">
              <Sparkles className="w-4 h-4 text-primary" />
              AI Assistant
            </button>
          </Link>
        </div>
      </div>

      {/* Real Statistic KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        
        {/* Total Products */}
        <div className="bg-[#050505] border border-white/10 p-5 rounded-xs space-y-2 hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] uppercase tracking-wider font-semibold">Products</span>
            <Package className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-serif text-white font-bold">{totalProducts}</p>
          <span className="text-[10px] text-emerald-400 font-sans flex items-center gap-1">+100% Active</span>
        </div>

        {/* Categories */}
        <div className="bg-[#050505] border border-white/10 p-5 rounded-xs space-y-2 hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] uppercase tracking-wider font-semibold">Categories</span>
            <Tags className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-serif text-white font-bold">{totalCategories}</p>
          <span className="text-[10px] text-muted-foreground">Rings, Necklaces...</span>
        </div>

        {/* Orders */}
        <div className="bg-[#050505] border border-white/10 p-5 rounded-xs space-y-2 hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] uppercase tracking-wider font-semibold">Orders</span>
            <ShoppingCart className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-serif text-white font-bold">{totalOrders}</p>
          <span className="text-[10px] text-emerald-400">+12 Today</span>
        </div>

        {/* Customers */}
        <div className="bg-[#050505] border border-white/10 p-5 rounded-xs space-y-2 hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] uppercase tracking-wider font-semibold">Customers</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-serif text-white font-bold">{totalCustomers}</p>
          <span className="text-[10px] text-emerald-400">+24 This Week</span>
        </div>

        {/* Revenue */}
        <div className="bg-[#050505] border border-white/10 p-5 rounded-xs space-y-2 hover:border-primary/40 transition-colors col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] uppercase tracking-wider font-semibold">Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-serif text-emerald-400 font-bold">{totalRevenue}</p>
          <span className="text-[10px] text-emerald-400 flex items-center gap-0.5"><TrendingUp className="w-3 h-3" /> +18.4%</span>
        </div>

        {/* Silver Stock */}
        <div className="bg-[#050505] border border-white/10 p-5 rounded-xs space-y-2 hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] uppercase tracking-wider font-semibold">Silver Stock</span>
            <Scale className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-serif text-primary font-bold">{silverStockGrams}</p>
          <span className="text-[10px] text-muted-foreground">925 Sterling</span>
        </div>

        {/* Low Inventory */}
        <div className="bg-[#050505] border border-amber-500/30 p-5 rounded-xs space-y-2 hover:border-amber-500 transition-colors">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-400">Low Stock</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-serif text-amber-400 font-bold">{lowInventoryCount}</p>
          <span className="text-[10px] text-amber-400">Items Alert</span>
        </div>

      </div>

      {/* Main Overview Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Recent Orders Table & Latest Products */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Recent Orders */}
          <div className="bg-[#050505] border border-white/10 p-6 rounded-xs space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <div>
                <h3 className="text-lg font-serif text-white">Recent Customer Orders</h3>
                <p className="text-xs text-muted-foreground">Latest transactions processed across Paymob, InstaPay & COD.</p>
              </div>
              <Link href="/admin/orders" className="text-xs text-primary hover:underline flex items-center gap-1 uppercase tracking-wider">
                View All <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-muted-foreground uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3">Order ID</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Items</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {mockRecentOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-mono font-bold text-primary">{ord.id}</td>
                      <td className="p-3 text-white font-medium">{ord.customer}</td>
                      <td className="p-3 text-muted-foreground">{ord.items}</td>
                      <td className="p-3 text-white font-semibold">{ord.total}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-xs text-[9px] font-bold tracking-wider uppercase ${
                          ord.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          ord.status === 'SHIPPED' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                          'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {ord.status}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground font-mono text-[11px]">{ord.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Latest Catalog Products */}
          <div className="bg-[#050505] border border-white/10 p-6 rounded-xs space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <div>
                <h3 className="text-lg font-serif text-white">Latest Added Products</h3>
                <p className="text-xs text-muted-foreground">Active catalog inventory items available on store.</p>
              </div>
              <Link href="/admin/catalog/products" className="text-xs text-primary hover:underline flex items-center gap-1 uppercase tracking-wider">
                Manage Catalog <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {products.slice(0, 4).map((prod) => (
                <div key={prod.id} className="flex gap-4 p-3 bg-secondary/10 border border-white/5 rounded-xs items-center">
                  <div className="relative w-14 h-14 bg-secondary/20 rounded-xs overflow-hidden shrink-0">
                    <Image src={prod.image} alt={prod.name.en} fill className="object-cover" sizes="56px" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-serif text-white truncate font-medium">{prod.name.en}</h4>
                    <p className="text-[10px] text-muted-foreground font-mono uppercase">{prod.category} • SKU: BS-{prod.id}</p>
                    <p className="text-xs text-primary font-semibold mt-1">${prod.price}</p>
                  </div>
                  <Link href={`/admin/catalog/products/${prod.id}`}>
                    <button className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-xs text-xs">
                      Edit
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Top Selling & Quick Actions */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Top Selling Products */}
          <div className="bg-[#050505] border border-white/10 p-6 rounded-xs space-y-4">
            <h3 className="text-lg font-serif text-white pb-3 border-b border-white/10">Top Selling Products</h3>
            <div className="space-y-4">
              {mockTopSellers.map((prod, idx) => (
                <div key={prod.id} className="flex items-center gap-4">
                  <span className="text-base font-serif font-bold text-primary/70 w-5">#0{idx + 1}</span>
                  <div className="relative w-12 h-12 bg-secondary/20 rounded-xs overflow-hidden shrink-0">
                    <Image src={prod.image} alt={prod.name.en} fill className="object-cover" sizes="48px" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-serif text-white truncate">{prod.name.en}</h4>
                    <p className="text-[10px] text-muted-foreground">${prod.price} • 48 units sold</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">$5,760</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="bg-gradient-to-b from-[#050505] to-[#101010] border border-primary/20 p-6 rounded-xs space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="w-5 h-5" />
              <h3 className="text-lg font-serif text-white">Quick Actions</h3>
            </div>
            <div className="space-y-2">
              <Link href="/admin/catalog/products/new" className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xs text-xs text-white transition-colors border border-white/5">
                <span>Create New Product</span>
                <Plus className="w-4 h-4 text-primary" />
              </Link>
              <Link href="/admin/erp/inventory" className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xs text-xs text-white transition-colors border border-white/5">
                <span>Update Inventory & Stocks</span>
                <Boxes className="w-4 h-4 text-primary" />
              </Link>
              <Link href="/admin/brain" className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xs text-xs text-white transition-colors border border-white/5">
                <span>Launch AI Brain Studio</span>
                <Sparkles className="w-4 h-4 text-primary" />
              </Link>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
