'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package, 
  Tags, 
  Layers, 
  Boxes, 
  ShoppingCart, 
  Users, 
  Megaphone, 
  Sparkles,
  Palette,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';

export function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (v: boolean) => void }) {
  const pathname = usePathname();
  
  const links = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Products', href: '/admin/catalog/products', icon: Package },
    { name: 'Categories', href: '/admin/catalog/categories', icon: Tags },
    { name: 'Collections', href: '/admin/catalog/collections', icon: Layers },
    { name: 'Inventory', href: '/admin/erp/inventory', icon: Boxes, count: 3 },
    { name: 'Orders', href: '/admin/orders', icon: ShoppingCart, count: 12 },
    { name: 'Customers', href: '/admin/customers', icon: Users },
    { name: 'Marketing', href: '/admin/marketing', icon: Megaphone },
    { name: 'AI Assistant', href: '/admin/brain', icon: Sparkles, badge: 'AI' },
    { name: 'CMS', href: '/admin/cms', icon: Palette },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  return (
    <motion.aside 
      animate={{ width: isOpen ? 240 : 80 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`h-full bg-[#050505] border-r border-white/10 flex flex-col z-40 ${isOpen ? 'absolute lg:relative lg:translate-x-0' : 'hidden lg:flex'} shadow-[4px_0_24px_rgba(0,0,0,0.8)]`}
    >
      <div className="h-20 flex items-center px-6 border-b border-white/10 flex-shrink-0 justify-between">
        {isOpen ? (
          <div className="flex flex-col">
            <span className="text-lg font-serif tracking-[0.2em] text-primary uppercase">BAHER</span>
            <span className="text-[9px] tracking-[0.3em] text-muted-foreground uppercase">MISSION CONTROL</span>
          </div>
        ) : (
          <span className="text-xl font-serif tracking-widest text-primary uppercase mx-auto">B</span>
        )}
        <button onClick={() => setIsOpen(!isOpen)} className="text-muted-foreground hover:text-white hidden lg:block">
          {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4 mx-auto" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 flex flex-col gap-1.5 px-3">
        {links.map((link) => {
          const active = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));
          const Icon = link.icon;
          return (
            <Link 
              key={link.name} 
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all duration-300 group relative ${active ? 'bg-primary/20 text-primary border border-primary/40 shadow-[0_0_15px_rgba(229,228,226,0.15)] font-semibold' : 'text-muted-foreground hover:bg-white/5 hover:text-white border border-transparent'}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {isOpen && (
                <span className="text-xs tracking-wider flex-1">{link.name}</span>
              )}
              {isOpen && link.count !== undefined && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary border border-primary/30">
                  {link.count}
                </span>
              )}
              {isOpen && link.badge && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase bg-gradient-to-r from-primary/30 to-white/20 border border-primary/40 text-primary">
                  {link.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      
      {isOpen && (
        <div className="p-4 border-t border-white/10 text-[10px] text-muted-foreground tracking-widest uppercase flex justify-between items-center">
          <span>BAHER OS v2.0</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
      )}
    </motion.aside>
  );
}
