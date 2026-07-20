'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package, 
  Tags, 
  Boxes, 
  ShoppingCart, 
  Users, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Paintbrush
} from 'lucide-react';
import { motion } from 'framer-motion';

export function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (v: boolean) => void }) {
  const pathname = usePathname();
  
  const links = [
    { name: 'Mission Control', href: '/admin', icon: LayoutDashboard },
    { name: 'Baher Brain', href: '/admin/brain', icon: Sparkles, badge: 'AI' },
    { name: 'Products', href: '/admin/products', icon: Package },
    { name: 'Taxonomy', href: '/admin/taxonomy', icon: Tags },
    { name: 'Inventory', href: '/admin/inventory', icon: Boxes, count: 3 },
    { name: 'Orders', href: '/admin/orders', icon: ShoppingCart, count: 12 },
    { name: 'Customers', href: '/admin/customers', icon: Users },
    { name: 'Design System', href: '/admin/design-system', icon: Paintbrush },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  return (
    <motion.aside 
      animate={{ width: isOpen ? 240 : 80 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`h-full bg-[#0A0A0A] border-r border-white/5 flex flex-col z-40 ${isOpen ? 'absolute lg:relative lg:translate-x-0' : 'hidden lg:flex'} shadow-[4px_0_24px_rgba(0,0,0,0.5)]`}
    >
      <div className="h-16 flex items-center px-6 border-b border-white/5 flex-shrink-0 justify-between">
        {isOpen ? (
          <span className="text-xl font-serif tracking-widest text-white uppercase">Baher</span>
        ) : (
          <span className="text-xl font-serif tracking-widest text-white uppercase mx-auto">B</span>
        )}
        <button onClick={() => setIsOpen(!isOpen)} className="text-[#888888] hover:text-white hidden lg:block">
          {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4 mx-auto" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 flex flex-col gap-2 px-3">
        {links.map((link) => {
          const active = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link 
              key={link.name} 
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-300 group relative ${active ? 'bg-white/10 text-white' : 'text-[#888888] hover:bg-white/5 hover:text-white'}`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {isOpen && (
                <span className="text-sm font-medium tracking-wide flex-1">{link.name}</span>
              )}
              {isOpen && link.count !== undefined && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white group-hover:bg-white/20 transition-colors">
                  {link.count}
                </span>
              )}
              {isOpen && link.badge && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase bg-gradient-to-r from-[#222] to-[#444] border border-white/10 text-white">
                  {link.badge}
                </span>
              )}
              {!isOpen && (link.count !== undefined || link.badge) && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white"></span>
              )}
            </Link>
          );
        })}
      </nav>
      
      {isOpen && (
        <div className="p-6 border-t border-white/5 text-xs text-[#555555]">
          Baher OS v1.1
        </div>
      )}
    </motion.aside>
  );
}
