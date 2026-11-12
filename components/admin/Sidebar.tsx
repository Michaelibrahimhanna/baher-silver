'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Receipt,
  Building2,
  Scale,
  Boxes,
  ArrowRightLeft,
  Sparkles,
  Truck,
  FileText,
  RotateCcw,
  Users,
  Landmark,
  BookOpen,
  Coins,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface NavItem {
  id: string;
  nameAr: string;
  nameEn: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeType?: 'live' | 'pending' | 'gold';
  isPending?: boolean;
}

export interface NavSection {
  titleAr: string;
  titleEn: string;
  items: NavItem[];
}

export function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (v: boolean) => void }) {
  const pathname = usePathname();
  const isArabic = !pathname?.startsWith('/en');
  const [pendingModalItem, setPendingModalItem] = React.useState<NavItem | null>(null);

  // Grouped 16 Original Sections of Baher Silver
  const sections: NavSection[] = [
    {
      titleAr: 'الرئيسية',
      titleEn: 'Main',
      items: [
        {
          id: 'dashboard',
          nameAr: 'لوحة التحكم',
          nameEn: 'Dashboard',
          href: isArabic ? '/ar/admin' : '/en/admin',
          icon: LayoutDashboard
        },
        {
          id: 'pos',
          nameAr: 'نقطة البيع (قطاعي)',
          nameEn: 'Retail POS',
          href: isArabic ? '/ar/admin/pos' : '/en/admin/pos',
          icon: Receipt,
          badge: 'POS',
          badgeType: 'live'
        },
        {
          id: 'wholesale',
          nameAr: 'مبيعات الجملة',
          nameEn: 'Wholesale B2B',
          href: '#',
          icon: Building2,
          badge: isArabic ? 'قيد الدمج' : 'Phase 3',
          badgeType: 'pending',
          isPending: true
        },
        {
          id: 'coding',
          nameAr: 'الباركود والميزان',
          nameEn: 'Coding & Scale',
          href: isArabic ? '/ar/admin/coding' : '/en/admin/coding',
          icon: Scale,
          badge: isArabic ? 'جديد' : 'LIVE',
          badgeType: 'gold'
        }
      ]
    },
    {
      titleAr: 'المخزون والمشتريات',
      titleEn: 'Inventory & Purchases',
      items: [
        {
          id: 'inventory',
          nameAr: 'الأصناف والمخزون',
          nameEn: 'Inventory Items',
          href: isArabic ? '/ar/admin/erp/inventory' : '/en/admin/erp/inventory',
          icon: Boxes
        },
        {
          id: 'stocktake',
          nameAr: 'الجرد وتحويلات الفروع',
          nameEn: 'Stocktake & Transfers',
          href: isArabic ? '/ar/admin/erp/warehouses/transfers' : '/en/admin/erp/warehouses/transfers',
          icon: ArrowRightLeft
        },
        {
          id: 'categories',
          nameAr: 'العيارات والمصنعية والأحجار',
          nameEn: 'Karats & Workmanship',
          href: isArabic ? '/ar/admin/catalog/attributes' : '/en/admin/catalog/attributes',
          icon: Sparkles
        },
        {
          id: 'suppliers',
          nameAr: 'المشتريات والموردون',
          nameEn: 'Purchases & Suppliers',
          href: isArabic ? '/ar/admin/erp/suppliers' : '/en/admin/erp/suppliers',
          icon: Truck
        }
      ]
    },
    {
      titleAr: 'المبيعات والعملاء',
      titleEn: 'Sales & Customers',
      items: [
        {
          id: 'sales',
          nameAr: 'سجل الفواتير التاريخي',
          nameEn: 'Sales Invoices',
          href: '#',
          icon: FileText,
          badge: isArabic ? 'قيد الدمج' : 'Phase 3',
          badgeType: 'pending',
          isPending: true
        },
        {
          id: 'returns',
          nameAr: 'المرتجعات والاستبدال',
          nameEn: 'Returns & Inspection',
          href: isArabic ? '/ar/admin/pos?mode=returns' : '/en/admin/pos?mode=returns',
          icon: RotateCcw,
          badge: 'P0',
          badgeType: 'gold'
        },
        {
          id: 'customers',
          nameAr: 'العملاء',
          nameEn: 'Customers',
          href: '#',
          icon: Users,
          badge: isArabic ? 'قيد الدمج' : 'Phase 3',
          badgeType: 'pending',
          isPending: true
        }
      ]
    },
    {
      titleAr: 'الخزينة والحسابات',
      titleEn: 'Treasury & Accounts',
      items: [
        {
          id: 'shifts',
          nameAr: 'الخزينة والورديات (Z)',
          nameEn: 'Shifts & Z-Reports',
          href: isArabic ? '/ar/admin/pos?mode=shifts' : '/en/admin/pos?mode=shifts',
          icon: Landmark,
          badge: 'Z',
          badgeType: 'live'
        },
        {
          id: 'openaccounts',
          nameAr: 'الحسابات المفتوحة (999)',
          nameEn: 'Dual Ledger (999)',
          href: isArabic ? '/ar/admin/erp/accounts' : '/en/admin/erp/accounts',
          icon: BookOpen,
          badge: '999',
          badgeType: 'gold'
        },
        {
          id: 'expenses',
          nameAr: 'المصروفات اليومية',
          nameEn: 'Store Expenses',
          href: '#',
          icon: Coins,
          badge: isArabic ? 'قيد الدمج' : 'Phase 3',
          badgeType: 'pending',
          isPending: true
        }
      ]
    },
    {
      titleAr: 'الإدارة والتقارير',
      titleEn: 'Administration',
      items: [
        {
          id: 'employees',
          nameAr: 'الموظفون والصلاحيات',
          nameEn: 'Employees & RBAC',
          href: '#',
          icon: ShieldCheck,
          badge: isArabic ? 'قيد الدمج' : 'Phase 4',
          badgeType: 'pending',
          isPending: true
        },
        {
          id: 'settings',
          nameAr: 'التقارير والإعدادات',
          nameEn: 'Reports & Settings',
          href: isArabic ? '/ar/admin/settings' : '/en/admin/settings',
          icon: Settings
        }
      ]
    }
  ];

  return (
    <>
      <motion.aside 
        animate={{ width: isOpen ? 260 : 76 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className={`h-full bg-[#07070A] border-r border-white/10 flex flex-col z-40 select-none shadow-[4px_0_24px_rgba(0,0,0,0.85)] ${
          isOpen ? 'absolute lg:relative lg:translate-x-0' : 'hidden lg:flex'
        }`}
      >
        {/* Brand Header */}
        <div className="h-20 flex items-center px-4 border-b border-white/10 flex-shrink-0 justify-between bg-gradient-to-b from-[#111118] to-[#07070A]">
          {isOpen ? (
            <div className="flex flex-col">
              <span className="text-base font-serif font-bold tracking-[0.18em] text-[#D4AF37] uppercase flex items-center gap-2">
                <span>💎</span>
                <span>BAHER SILVER</span>
              </span>
              <span className="text-[9px] tracking-[0.25em] text-neutral-400 font-medium">
                {isArabic ? 'نظام إدارة محل الفضة v4.1' : 'SILVER ERP PLATFORM OS'}
              </span>
            </div>
          ) : (
            <span className="text-xl font-serif font-bold tracking-widest text-[#D4AF37] uppercase mx-auto">
              💎
            </span>
          )}
          <button 
            onClick={() => setIsOpen(!isOpen)} 
            className="text-neutral-400 hover:text-white p-1 rounded-sm hover:bg-white/5 transition-colors hidden lg:block"
            title={isOpen ? (isArabic ? 'طي القائمة' : 'Collapse') : (isArabic ? 'توسيع القائمة' : 'Expand')}
          >
            {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4 mx-auto" />}
          </button>
        </div>

        {/* 16 Sections Grouped Nav */}
        <nav className="flex-1 overflow-y-auto py-4 flex flex-col gap-4 px-2.5 scrollbar-thin scrollbar-thumb-white/10">
          {sections.map((section, sIdx) => (
            <div key={sIdx} className="flex flex-col gap-1">
              {isOpen && (
                <div className="text-[10px] font-semibold tracking-wider text-neutral-400 px-2 py-1 uppercase">
                  {isArabic ? section.titleAr : section.titleEn}
                </div>
              )}
              {section.items.map((item) => {
                const active = !item.isPending && (pathname === item.href || (item.href !== '/ar/admin' && item.href !== '/en/admin' && item.href !== '#' && pathname.startsWith(item.href)));
                const Icon = item.icon;

                if (item.isPending) {
                  return (
                    <button
                      key={item.id}
                      onClick={() => setPendingModalItem(item)}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-sm transition-all text-neutral-400 hover:bg-white/5 hover:text-neutral-300 border border-transparent text-left group ${
                        !isOpen && 'justify-center'
                      }`}
                      title={isArabic ? `${item.nameAr} (قيد الدمج في المرحلة القادمة)` : `${item.nameEn} (Phase Pending)`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0 text-neutral-400 group-hover:text-amber-400/80 transition-colors" />
                      {isOpen && (
                        <>
                          <span className="text-xs font-medium flex-1 truncate">{isArabic ? item.nameAr : item.nameEn}</span>
                          {item.badge && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase bg-amber-500/10 border border-amber-500/30 text-amber-400">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  );
                }

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-sm transition-all group relative ${
                      active
                        ? 'bg-[#D4AF37]/15 text-[#F0D060] border border-[#D4AF37]/40 shadow-[0_0_12px_rgba(212,175,55,0.12)] font-semibold'
                        : 'text-neutral-300 hover:bg-white/5 hover:text-white border border-transparent'
                    } ${!isOpen && 'justify-center'}`}
                    title={isArabic ? item.nameAr : item.nameEn}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-[#D4AF37]' : 'text-neutral-400 group-hover:text-[#D4AF37]'}`} />
                    {isOpen && (
                      <>
                        <span className="text-xs tracking-wide flex-1 truncate">{isArabic ? item.nameAr : item.nameEn}</span>
                        {item.badge && (
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase border ${
                            item.badgeType === 'gold' 
                              ? 'bg-[#D4AF37]/20 border-[#D4AF37]/40 text-[#F0D060]'
                              : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer info */}
        {isOpen && (
          <div className="p-3 border-t border-white/10 text-[10px] text-neutral-400 tracking-wider flex justify-between items-center bg-[#07070A]">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>PostgreSQL 18 Staging</span>
            </span>
            <span className="text-[9px] text-amber-400/80 font-mono">STAGING</span>
          </div>
        )}
      </motion.aside>

      {/* Non-breaking Informational Drawer for Modules in Phase 3/4 Roadmap */}
      <AnimatePresence>
        {pendingModalItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111118] border border-[#D4AF37]/40 rounded-lg p-6 max-w-md w-full shadow-2xl relative text-neutral-200"
              dir={isArabic ? 'rtl' : 'ltr'}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {isArabic ? pendingModalItem.nameAr : pendingModalItem.nameEn}
                  </h3>
                  <p className="text-xs text-amber-400/80 font-mono">
                    {isArabic ? 'خطة الدمج المعتمدة — Baher Silver Hybrid' : 'Approved Convergence Roadmap'}
                  </p>
                </div>
              </div>

              <p className="text-xs text-neutral-300 leading-relaxed mb-4">
                {isArabic ? (
                  <>
                    هذا القسم مكتمل بالكامل في المحركات الخلفية وقواعد البيانات (وكذلك في النسخة المرجعية على المنفذ 3080). تم تحديد نقله إلى واجهة Next.js في <strong>المرحلة القادمة المعتمدة</strong> بعد اكتمال مرحلة لوحة التحكم الحالية.
                  </>
                ) : (
                  <>
                    This module is fully complete in backend database engines and in the reference server on port 3080. It is scheduled for frontend React convergence in the <strong>next approved phase</strong>.
                  </>
                )}
              </p>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setPendingModalItem(null)}
                  className="px-4 py-2 text-xs font-semibold rounded bg-[#D4AF37] hover:bg-[#F0D060] text-black transition-colors"
                >
                  {isArabic ? 'فهمت، استمرار' : 'Got it, continue'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
