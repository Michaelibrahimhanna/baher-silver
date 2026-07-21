'use client';

import * as React from 'react';
import Link from 'next/link';
import { Search, Heart, ShoppingBag, Menu } from 'lucide-react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import type { Dictionary } from '@/lib/dictionary';

export function Header({ dict, locale }: { dict: Dictionary; locale: string }) {
  const [hidden, setHidden] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const { scrollY, scrollYProgress } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    setScrolled(latest > 50);
    if (latest > previous && latest > 150) {
      setHidden(true);
    } else {
      setHidden(false);
    }
  });

  const navLinks = [
    { name: dict.header?.home || 'Home', href: `/${locale}` },
    { name: dict.header?.collections || 'Collections', href: `/${locale}/collections` },
    { name: dict.header?.rings || 'Rings', href: `/${locale}/category/rings` },
    { name: dict.header?.necklaces || 'Necklaces', href: `/${locale}/category/necklaces` },
  ];

  return (
    <motion.header
      variants={{
        visible: { y: 0 },
        hidden: { y: '-100%' },
      }}
      animate={hidden ? "hidden" : "visible"}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 w-full z-50 transition-all duration-700 ease-in-out ${
        scrolled 
          ? 'bg-[#050505]/70 backdrop-blur-2xl border-b border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.5)]' 
          : 'bg-transparent border-transparent'
      }`}
    >
      <div className="w-full max-w-screen-2xl mx-auto px-6 lg:px-12">
        <div className="flex justify-between items-center h-24">
          
          {/* Mobile Menu Button */}
          <div className="flex-1 flex lg:hidden">
            <button className="text-foreground/80 hover:text-primary transition-colors group">
              <Menu className="w-6 h-6 stroke-[1.5] group-hover:scale-110 transition-transform duration-300" />
            </button>
          </div>

          {/* Logo */}
          <div className="flex-1 lg:flex-none flex justify-center lg:justify-start">
            <Link href={`/${locale}`} className="relative group">
              <span className="text-2xl font-serif tracking-[0.25em] uppercase text-primary transition-all duration-500 group-hover:text-white drop-shadow-[0_0_15px_rgba(229,228,226,0.3)] group-hover:drop-shadow-[0_0_25px_rgba(229,228,226,0.6)]">
                BAHER
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex flex-1 justify-center space-x-12 rtl:space-x-reverse">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="group relative text-xs tracking-[0.15em] uppercase font-medium text-foreground/80 hover:text-white transition-colors duration-300 py-2"
              >
                {link.name}
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[1px] bg-primary transition-all duration-500 group-hover:w-full opacity-0 group-hover:opacity-100 shadow-[0_0_8px_rgba(229,228,226,0.8)]" />
              </Link>
            ))}
          </nav>

          {/* Icons */}
          <div className="flex-1 flex justify-end items-center space-x-6 rtl:space-x-reverse">
            <button className="text-foreground/80 hover:text-white transition-all duration-300 group hover:scale-110">
              <Search className="w-5 h-5 stroke-[1.5]" />
            </button>
            <button className="hidden sm:block text-foreground/80 hover:text-white transition-all duration-300 group hover:scale-110">
              <Heart className="w-5 h-5 stroke-[1.5]" />
            </button>
            <button className="text-foreground/80 hover:text-white transition-all duration-300 group hover:scale-110 relative">
              <ShoppingBag className="w-5 h-5 stroke-[1.5]" />
              <span className="absolute -top-1 -right-2 bg-primary text-black text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">0</span>
            </button>
          </div>

        </div>
      </div>
      
      {/* Minimal Scroll Progress Indicator */}
      <motion.div 
        className="absolute bottom-0 left-0 h-[1px] bg-primary shadow-[0_0_8px_rgba(229,228,226,0.8)] origin-left"
        style={{ scaleX: scrollYProgress }}
      />
    </motion.header>
  );
}
