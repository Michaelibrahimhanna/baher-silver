'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, ShoppingBag, Menu, X, Globe, User } from 'lucide-react';
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import type { Dictionary } from '@/lib/dictionary';
import PredictiveSearch from './PredictiveSearch';
import { useStore } from '@/lib/store';

export function Header({ dict, locale }: { dict: Dictionary; locale: string }) {
  const [hidden, setHidden] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { scrollY, scrollYProgress } = useScroll();
  const pathname = usePathname();
  const router = useRouter();

  const cart = useStore((state) => state.cart);
  const cartItemCount = cart?.reduce((sum, i) => sum + i.quantity, 0) || 0;

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    setScrolled(latest > 50);
    if (latest > previous && latest > 150) {
      setHidden(true);
    } else {
      setHidden(false);
    }
  });

  const toggleLanguage = () => {
    const nextLocale = locale === 'ar' ? 'en' : 'ar';
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000`;
    let newPath = pathname;
    if (pathname.startsWith(`/${locale}`)) {
      newPath = pathname.replace(`/${locale}`, `/${nextLocale}`);
    } else {
      newPath = `/${nextLocale}${pathname}`;
    }
    router.push(newPath);
  };

  const isAr = locale === 'ar';

  const navLinks = [
    { name: dict.header?.home || (isAr ? 'الرئيسية' : 'Home'), href: `/${locale}` },
    { name: dict.header?.collections || (isAr ? 'المجموعات' : 'Collections'), href: `/${locale}/collections` },
    { name: dict.header?.rings || (isAr ? 'خواتم' : 'Rings'), href: `/${locale}/category/rings` },
    { name: dict.header?.necklaces || (isAr ? 'قلائد' : 'Necklaces'), href: `/${locale}/category/necklaces` },
    { name: dict.header?.bracelets || (isAr ? 'أساور' : 'Bracelets'), href: `/${locale}/category/bracelets` },
    { name: dict.header?.earrings || (isAr ? 'أقراط' : 'Earrings'), href: `/${locale}/category/earrings` },
    { name: dict.header?.journal || (isAr ? 'المجلة' : 'Journal'), href: `/${locale}/journal` },
  ];

  return (
    <motion.header
      variants={{
        visible: { y: 0 },
        hidden: { y: '-100%' },
      }}
      animate={hidden ? 'hidden' : 'visible'}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 w-full z-50 transition-all duration-700 ease-in-out ${
        scrolled 
          ? 'bg-[#050505]/95 backdrop-blur-xl border-b border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.5)]' 
          : 'bg-transparent border-transparent'
      }`}
    >
      <div className="w-full max-w-screen-2xl mx-auto px-6 lg:px-12">
        <div className="flex justify-between items-center h-24">
          
          {/* Mobile Menu Button & Language Switcher */}
          <div className="flex-1 flex items-center gap-4 lg:hidden">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-foreground/80 hover:text-primary transition-colors group p-1"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 stroke-[1.5]" />
              ) : (
                <Menu className="w-6 h-6 stroke-[1.5] group-hover:scale-110 transition-transform duration-300" />
              )}
            </button>
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 text-xs tracking-widest text-primary/90 hover:text-white transition-colors duration-300 border border-primary/20 hover:border-primary/60 px-2.5 py-1 rounded-full bg-primary/5"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{locale === 'ar' ? 'EN' : 'العربية'}</span>
            </button>
          </div>

          {/* Logo */}
          <div className="flex-1 lg:flex-none flex justify-center lg:justify-start">
            <Link href={`/${locale}`} className="relative group flex items-center gap-2">
              <span className="text-2xl font-serif tracking-[0.25em] uppercase text-primary transition-all duration-500 group-hover:text-white drop-shadow-[0_0_15px_rgba(229,228,226,0.3)] group-hover:drop-shadow-[0_0_25px_rgba(229,228,226,0.6)]">
                {isAr ? 'باهر' : 'BAHER'}
              </span>
              <span className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase hidden sm:inline">
                {isAr ? 'للفضة' : 'SILVER'}
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex flex-1 justify-center space-x-8 rtl:space-x-reverse">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="group relative text-[11px] tracking-[0.15em] uppercase font-medium text-foreground/80 hover:text-white transition-colors duration-300 py-2"
              >
                {link.name}
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[1px] bg-primary transition-all duration-500 group-hover:w-full opacity-0 group-hover:opacity-100 shadow-[0_0_8px_rgba(229,228,226,0.8)]" />
              </Link>
            ))}
          </nav>

          {/* Right Action Icons & Language Switcher */}
          <div className="flex-1 flex justify-end items-center space-x-5 rtl:space-x-reverse">
            <button
              onClick={toggleLanguage}
              className="hidden lg:flex items-center gap-1.5 text-xs tracking-widest text-primary/90 hover:text-white transition-colors duration-300 border border-primary/30 hover:border-primary px-3 py-1 rounded-full bg-primary/10 hover:bg-primary/20"
              aria-label="Switch Language"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="font-sans text-[11px] font-semibold">{locale === 'ar' ? 'EN' : 'العربية'}</span>
            </button>

            <button 
              onClick={() => setSearchOpen(true)}
              className="text-foreground/80 hover:text-white transition-all duration-300 group hover:scale-110 p-1"
              aria-label="Search"
            >
              <Search className="w-5 h-5 stroke-[1.5]" />
            </button>

            <Link 
              href={`/${locale}/account`}
              className="text-foreground/80 hover:text-white transition-all duration-300 group hover:scale-110 p-1"
              aria-label="Account"
            >
              <User className="w-5 h-5 stroke-[1.5]" />
            </Link>

            <Link 
              href={`/${locale}/checkout`}
              className="text-foreground/80 hover:text-white transition-all duration-300 group hover:scale-110 relative p-1"
              aria-label="Cart"
            >
              <ShoppingBag className="w-5 h-5 stroke-[1.5]" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-black text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(229,228,226,0.8)]">
                  {cartItemCount}
                </span>
              )}
            </Link>
          </div>

        </div>
      </div>
      
      {/* Scroll Progress Indicator */}
      <motion.div 
        className="absolute bottom-0 left-0 h-[1px] bg-primary shadow-[0_0_8px_rgba(229,228,226,0.8)] origin-left"
        style={{ scaleX: scrollYProgress }}
      />
      
      <PredictiveSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden bg-[#050505]/98 border-b border-white/10 px-6 py-6 space-y-4 backdrop-blur-2xl"
          >
            <nav className="flex flex-col space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs uppercase tracking-[0.2em] text-foreground/80 hover:text-primary transition-colors duration-200"
                >
                  {link.name}
                </Link>
              ))}
              <Link
                href={`/${locale}/account`}
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs uppercase tracking-[0.2em] text-foreground/80 hover:text-primary transition-colors duration-200 pt-2 border-t border-white/10"
              >
                {dict.header?.account || (isAr ? 'حسابي' : 'Account')}
              </Link>
              <Link
                href={`/${locale}/admin`}
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs uppercase tracking-[0.2em] text-primary/70 hover:text-primary transition-colors duration-200"
              >
                {dict.header?.admin || (isAr ? 'لوحة التحكم' : 'Admin Dashboard')}
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
