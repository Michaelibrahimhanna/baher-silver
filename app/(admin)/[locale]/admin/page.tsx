'use client';

import * as React from 'react';
import Link from 'next/link';
import { 
  ShoppingCart, 
  Users, 
  DollarSign, 
  Scale, 
  Plus, 
  Sparkles, 
  ArrowUpRight,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Percent,
  Star,
  Bell,
  Calendar as CalendarIcon,
  Tag,
  Megaphone,
  Palette,
  MapPin,
  BarChart3,
  Activity,
  Bot
} from 'lucide-react';

export default function MissionControlDashboard() {
  const [activeAiTab, setActiveAiTab] = React.useState<'insights' | 'inventory' | 'ads' | 'seo'>('insights');

  // KPI Statistics
  const stats = {
    todaysRevenue: "$14,250",
    todaysOrders: 42,
    pendingOrders: 8,
    completedOrders: 32,
    cancelledOrders: 2,
    visitorsToday: 3840,
    conversionRate: "3.42%",
    silverPriceGrams: "$1.15 / g (58 EGP)",
    silverTrend: "+0.4%",
  };

  // Recent Orders Data
  const mockRecentOrders = [
    { id: 'BS-2026-0001', customer: 'Alexander Wright', items: '2 Items', total: '$270.00', status: 'PAID', date: '10 mins ago' },
    { id: 'BS-2026-0002', customer: 'Nour El Din', items: '1 Item', total: '$120.00', status: 'SHIPPED', date: '25 mins ago' },
    { id: 'BS-2026-0003', customer: 'Yasmine Mansour', items: '3 Items', total: '$410.00', status: 'PENDING', date: '1 hour ago' },
    { id: 'BS-2026-0004', customer: 'Mariam Hassan', items: '1 Item', total: '$95.00', status: 'CANCELLED', date: '2 hours ago' },
  ];

  // Latest Customers
  const mockCustomers = [
    { name: 'Dr. Tarek Fouad', email: 'tarek@example.com', spent: '$1,850', orders: 6, tier: 'PLATINUM' },
    { name: 'Sarah El Shamy', email: 'sarah@example.com', spent: '$920', orders: 4, tier: 'GOLD' },
    { name: 'Karim Abdel Aziz', email: 'karim@example.com', spent: '$410', orders: 2, tier: 'SILVER' },
  ];

  // Latest Reviews
  const mockReviews = [
    { customer: 'Laila K.', product: 'Classic 925 Silver Ring', rating: 5, comment: 'Exceptional craftsmanship and anti-tarnish shine. Truly luxury!' },
    { customer: 'Omar H.', product: 'Elegance Drop Earrings', rating: 5, comment: 'Fast delivery to Alexandria. Packaging box is regal.' },
  ];

  // Notification Items
  const notifications = [
    { id: '1', type: 'orders', title: 'New VIP Order #BS-2026-0001', desc: 'Alexander Wright placed a $270 order via Paymob', time: '5m ago' },
    { id: '2', type: 'payments', title: 'Payment Confirmed', desc: 'InstaPay transfer #TX-9021 confirmed for $410', time: '12m ago' },
    { id: '3', type: 'inventory', title: 'Low Inventory Alert', desc: 'Elegance Drop Earrings stock is down to 3 pcs', time: '1h ago' },
    { id: '4', type: 'ai', title: 'AI Campaign Suggestion', desc: 'Baher Brain suggests launching a 15% discount for Ring Collectors', time: '2h ago' },
  ];

  // Audit Activity Log
  const activities = [
    { user: 'Sarah (Catalog Lead)', action: 'Updated product price for Classic 925 Silver Ring', time: '15m ago' },
    { user: 'System (Paymob API)', action: 'Received Webhook payment confirmation for #BS-2026-0001', time: '22m ago' },
    { user: 'Ahmed (Warehouse Lead)', action: 'Dispatched Aramex shipment #ARM-9021', time: '45m ago' },
  ];

  // Governorate Sales Distribution
  const governorateSales = [
    { name: 'Cairo', percent: 45, color: 'bg-primary' },
    { name: 'Giza', percent: 25, color: 'bg-blue-400' },
    { name: 'Alexandria', percent: 15, color: 'bg-emerald-400' },
    { name: 'Mansoura', percent: 10, color: 'bg-amber-400' },
    { name: 'Red Sea (Hurghada)', percent: 5, color: 'bg-[#888888]' },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24 text-foreground">
      
      {/* Header & Quick Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] tracking-[0.3em] uppercase text-primary font-bold">ENTERPRISE MISSION CONTROL • LIVE OS</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-serif text-white tracking-tight mt-1">Baher Silver Admin Control Center</h1>
          <p className="text-xs text-muted-foreground mt-1">Real-time revenue, inventory telemetry, AI business brain, and sales analytics.</p>
        </div>

        {/* Top Quick Actions Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/catalog/products/new">
            <button className="bg-primary text-black px-3.5 py-2.5 rounded-xs text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-white transition-colors shadow-lg">
              <Plus className="w-4 h-4" /> Add Product
            </button>
          </Link>
          <Link href="/admin/marketing">
            <button className="bg-white/10 text-white border border-white/20 px-3 py-2.5 rounded-xs text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-white/20 transition-colors">
              <Tag className="w-3.5 h-3.5 text-primary" /> Coupon
            </button>
          </Link>
          <Link href="/admin/marketing">
            <button className="bg-white/10 text-white border border-white/20 px-3 py-2.5 rounded-xs text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-white/20 transition-colors">
              <Megaphone className="w-3.5 h-3.5 text-primary" /> Campaign
            </button>
          </Link>
          <Link href="/admin/cms">
            <button className="bg-white/10 text-white border border-white/20 px-3 py-2.5 rounded-xs text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-white/20 transition-colors">
              <Palette className="w-3.5 h-3.5 text-primary" /> CMS
            </button>
          </Link>
        </div>
      </div>

      {/* 13 Enterprise Widgets Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
        
        {/* Today's Revenue */}
        <div className="bg-[#050505] border border-white/10 p-4 rounded-xs space-y-1.5 hover:border-emerald-500/50 transition-colors col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] uppercase tracking-wider font-semibold">Today&apos;s Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-serif text-emerald-400 font-bold">{stats.todaysRevenue}</p>
          <span className="text-[10px] text-emerald-400 flex items-center gap-0.5"><TrendingUp className="w-3 h-3" /> +18.4% vs yesterday</span>
        </div>

        {/* Today's Orders */}
        <div className="bg-[#050505] border border-white/10 p-4 rounded-xs space-y-1.5 hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] uppercase tracking-wider font-semibold">Today&apos;s Orders</span>
            <ShoppingCart className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-serif text-white font-bold">{stats.todaysOrders}</p>
          <span className="text-[10px] text-emerald-400">42 Orders Received</span>
        </div>

        {/* Pending Orders */}
        <div className="bg-[#050505] border border-amber-500/30 p-4 rounded-xs space-y-1.5 hover:border-amber-500 transition-colors">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-400">Pending</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-serif text-amber-400 font-bold">{stats.pendingOrders}</p>
          <span className="text-[10px] text-amber-400">Requires Fulfilling</span>
        </div>

        {/* Completed Orders */}
        <div className="bg-[#050505] border border-emerald-500/30 p-4 rounded-xs space-y-1.5 hover:border-emerald-500 transition-colors">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-400">Completed</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-serif text-emerald-400 font-bold">{stats.completedOrders}</p>
          <span className="text-[10px] text-emerald-400">Delivered & Paid</span>
        </div>

        {/* Cancelled Orders */}
        <div className="bg-[#050505] border border-rose-500/30 p-4 rounded-xs space-y-1.5 hover:border-rose-500 transition-colors">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-rose-400">Cancelled</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-serif text-rose-400 font-bold">{stats.cancelledOrders}</p>
          <span className="text-[10px] text-muted-foreground">Low Return Rate</span>
        </div>

        {/* Visitors Today */}
        <div className="bg-[#050505] border border-white/10 p-4 rounded-xs space-y-1.5 hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] uppercase tracking-wider font-semibold">Visitors Today</span>
            <Eye className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-serif text-white font-bold">{stats.visitorsToday}</p>
          <span className="text-[10px] text-blue-400">+22% Traffic</span>
        </div>

        {/* Conversion Rate */}
        <div className="bg-[#050505] border border-white/10 p-4 rounded-xs space-y-1.5 hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] uppercase tracking-wider font-semibold">Conversion Rate</span>
            <Percent className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-serif text-primary font-bold">{stats.conversionRate}</p>
          <span className="text-[10px] text-emerald-400">Above Benchmark</span>
        </div>

      </div>

      {/* Silver Price Today Banner */}
      <div className="bg-gradient-to-r from-[#050505] via-[#101010] to-[#050505] border border-primary/30 p-5 rounded-xs flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 border border-primary/30 rounded-xs text-primary">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-[0.25em] text-primary font-bold">LIVE METALS TELEMETRY</span>
            <h3 className="text-xl font-serif text-white">925 Sterling Silver Market Rate Today</h3>
            <p className="text-xs text-muted-foreground">Real-time valuation index used for automatic product margin calculations.</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-xs text-muted-foreground uppercase">Current Index</span>
            <p className="text-2xl font-mono text-primary font-bold">{stats.silverPriceGrams}</p>
          </div>
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold rounded-xs">
            {stats.silverTrend}
          </span>
        </div>
      </div>

      {/* Main Control Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left 8-Column Area: Analytics Charts & Orders */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Revenue & Sales Governorate Analytics Charts */}
          <div className="bg-[#050505] border border-white/10 p-6 rounded-xs space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <div>
                <h3 className="text-lg font-serif text-white">Revenue & Governorate Sales Distribution</h3>
                <p className="text-xs text-muted-foreground">Monthly revenue velocity and top regional order volumes across Egypt.</p>
              </div>
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>

            {/* Simulated Revenue Chart Bars */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Monthly Revenue Trend ($)</span>
              <div className="h-32 flex items-end gap-3 pt-6 pb-2 border-b border-white/10">
                {[
                  { month: 'Jan', val: 40, amt: '$18K' },
                  { month: 'Feb', val: 60, amt: '$24K' },
                  { month: 'Mar', val: 50, amt: '$20K' },
                  { month: 'Apr', val: 75, amt: '$30K' },
                  { month: 'May', val: 90, amt: '$36K' },
                  { month: 'Jun', val: 80, amt: '$32K' },
                  { month: 'Jul', val: 100, amt: '$38.4K' },
                ].map((bar, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                    <span className="text-[9px] font-mono text-primary opacity-0 group-hover:opacity-100 transition-opacity absolute -top-5">{bar.amt}</span>
                    <div 
                      className="w-full bg-primary/80 group-hover:bg-primary rounded-t-xs transition-all duration-500" 
                      style={{ height: `${bar.val}%` }}
                    />
                    <span className="text-[10px] text-muted-foreground font-mono">{bar.month}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sales by Governorate Progress Bars */}
            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-primary" /> Sales Volume by Governorate
              </h4>
              <div className="space-y-3">
                {governorateSales.map((gov) => (
                  <div key={gov.name} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-white font-medium">{gov.name}</span>
                      <span className="text-muted-foreground font-mono">{gov.percent}%</span>
                    </div>
                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                      <div className={`h-full ${gov.color} transition-all duration-1000`} style={{ width: `${gov.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Recent Orders Table */}
          <div className="bg-[#050505] border border-white/10 p-6 rounded-xs space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <div>
                <h3 className="text-lg font-serif text-white">Live Customer Orders</h3>
                <p className="text-xs text-muted-foreground">Real-time incoming orders awaiting warehouse dispatch.</p>
              </div>
              <Link href="/admin/orders" className="text-xs text-primary hover:underline flex items-center gap-1 uppercase tracking-wider">
                Manage Orders <ArrowUpRight className="w-3.5 h-3.5" />
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
                    <th className="p-3">Time</th>
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
                          ord.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          'bg-rose-500/20 text-rose-400 border border-rose-500/30'
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

          {/* Latest Customers & Reviews */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Latest Customers */}
            <div className="bg-[#050505] border border-white/10 p-6 rounded-xs space-y-4">
              <h3 className="text-base font-serif text-white pb-3 border-b border-white/10 flex items-center justify-between">
                <span>Latest VIP Customers</span>
                <Users className="w-4 h-4 text-primary" />
              </h3>
              <div className="space-y-3">
                {mockCustomers.map((c, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2.5 bg-white/5 rounded-xs border border-white/5">
                    <div>
                      <p className="text-xs font-semibold text-white">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">{c.email}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-primary">{c.spent}</span>
                      <span className="block text-[9px] text-emerald-400 font-bold uppercase">{c.tier}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Latest Reviews */}
            <div className="bg-[#050505] border border-white/10 p-6 rounded-xs space-y-4">
              <h3 className="text-base font-serif text-white pb-3 border-b border-white/10 flex items-center justify-between">
                <span>Latest Verified Reviews</span>
                <Star className="w-4 h-4 text-amber-400" />
              </h3>
              <div className="space-y-3">
                {mockReviews.map((r, idx) => (
                  <div key={idx} className="p-3 bg-white/5 rounded-xs border border-white/5 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white">{r.customer}</span>
                      <div className="flex gap-0.5 text-amber-400">
                        {Array.from({ length: r.rating }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-current" />
                        ))}
                      </div>
                    </div>
                    <p className="text-[11px] text-primary font-serif">{r.product}</p>
                    <p className="text-xs text-muted-foreground italic">&quot;{r.comment}&quot;</p>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* Right 4-Column Area: Notification Center, Baher Brain AI & Calendar */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Baher Brain AI Assistant Panel */}
          <div className="bg-gradient-to-b from-[#050505] via-[#0d0d0d] to-[#050505] border border-primary/30 p-6 rounded-xs space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-primary">
                <Bot className="w-5 h-5" />
                <h3 className="text-lg font-serif text-white">Baher Brain AI Panel</h3>
              </div>
              <span className="px-2 py-0.5 bg-primary/20 text-primary border border-primary/40 text-[9px] font-bold uppercase rounded-xs">
                ONLINE
              </span>
            </div>

            {/* AI Selector Tabs */}
            <div className="flex gap-1 bg-white/5 p-1 rounded-xs text-[10px]">
              {(['insights', 'inventory', 'ads', 'seo'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveAiTab(tab)}
                  className={`flex-1 py-1 uppercase tracking-wider font-bold rounded-xs ${
                    activeAiTab === tab ? 'bg-primary text-black' : 'text-muted-foreground hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* AI Dynamic Output */}
            <div className="p-3 bg-black/60 border border-white/10 rounded-xs text-xs text-muted-foreground leading-relaxed space-y-2">
              {activeAiTab === 'insights' && (
                <p>💡 <strong className="text-white">Business Insight:</strong> Rings category revenue grew by 28% this week. Consider stocking 15 additional solitaire rings.</p>
              )}
              {activeAiTab === 'inventory' && (
                <p>📦 <strong className="text-amber-400">Inventory Alert:</strong> Elegance Drop Earrings are running low (3 pcs left). Trigger automatic reorder to Alexandria Vault.</p>
              )}
              {activeAiTab === 'ads' && (
                <p>🚀 <strong className="text-blue-400">Meta Ads Suggestion:</strong> Target high-intent jewelry buyers in Giza with the 925 Sterling Heritage Video Ad.</p>
              )}
              {activeAiTab === 'seo' && (
                <p>🔍 <strong className="text-emerald-400">SEO Optimization:</strong> 2 products need meta title updates to improve ranking for &quot;فضة 925 في مصر&quot;.</p>
              )}
            </div>

            <Link href="/admin/brain" className="w-full">
              <button className="w-full bg-white/10 text-white border border-white/20 py-2 text-xs uppercase tracking-wider font-bold hover:bg-white/20 transition-colors flex items-center justify-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" /> Launch Full AI Studio
              </button>
            </Link>
          </div>

          {/* Notification Center */}
          <div className="bg-[#050505] border border-white/10 p-6 rounded-xs space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <h3 className="text-base font-serif text-white">Notification Center</h3>
              </div>
              <span className="text-[10px] font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-xs border border-primary/30">
                4 NEW
              </span>
            </div>

            <div className="space-y-3">
              {notifications.map(n => (
                <div key={n.id} className="p-3 bg-white/5 border border-white/5 rounded-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white">{n.title}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{n.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{n.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Operational Calendar Widget */}
          <div className="bg-[#050505] border border-white/10 p-6 rounded-xs space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary" />
                <h3 className="text-base font-serif text-white">Operations Calendar</h3>
              </div>
              <span className="text-xs text-muted-foreground font-mono">July 2026</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-white/5 border-l-2 border-emerald-400 rounded-xs flex justify-between">
                <div>
                  <p className="font-bold text-white">Aramex Shipment Delivery</p>
                  <p className="text-[10px] text-muted-foreground">14 Orders to Alexandria</p>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">Today</span>
              </div>
              <div className="p-2.5 bg-white/5 border-l-2 border-primary rounded-xs flex justify-between">
                <div>
                  <p className="font-bold text-white">New Collection Campaign</p>
                  <p className="text-[10px] text-muted-foreground">Launch Royal Zircon 2.0</p>
                </div>
                <span className="text-[10px] font-mono text-primary font-bold">Jul 25</span>
              </div>
            </div>
          </div>

          {/* Audit Activity Timeline */}
          <div className="bg-[#050505] border border-white/10 p-6 rounded-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <Activity className="w-5 h-5 text-primary" />
              <h3 className="text-base font-serif text-white">Recent Activity Audit</h3>
            </div>
            <div className="space-y-3">
              {activities.map((act, idx) => (
                <div key={idx} className="flex gap-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <p className="text-white font-medium">{act.action}</p>
                    <span className="text-[10px] text-muted-foreground font-mono">{act.user} • {act.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
