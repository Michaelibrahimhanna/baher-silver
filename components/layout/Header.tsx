'use client';

import * as React from 'react';
import Link from 'next/link';
import { Search, Heart, ShoppingBag, Menu } from 'lucide-react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';

export function Header({ dict, locale }: { dict: any; locale: 'en' | 'ar' }) {
  const [hidden, setHidden] = React.useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    if (latest > previous && latest > 150) {
      setHidden(true);
    } else {
      setHidden(false);
    }
  });

  const navLinks = [
    { name: dict.header.home, href: `/${locale}` },
    { name: dict.header.collections, href: `/${locale}/collections` },
    { name: dict.header.rings, href: `/${locale}/category/rings` },
    { name: dict.header.necklaces, href: `/${locale}/category/necklaces` },
    { name: dict.header.bracelets, href: `/${locale}/category/bracelets` },
    { name: dict.header.earrings, href: `/${locale}/category/earrings` },
  ];

  return (
    <motion.header
      variants={{
        visible: { y: 0 },
        hidden: { y: '-100%' },
      }}
      animate={hidden ? "hidden" : "visible"}
      transition={{ duration: 0.35, ease: "easeInOut" }}
      className="fixed top-0 w-full z-50 bg-brand-white/80 backdrop-blur-md border-b border-brand-gray-soft"
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* Mobile Menu Button */}
          <div className="flex-1 flex lg:hidden">
            <button className="p-2 -ml-2 text-brand-black hover:text-brand-black/60 transition-colors">
              <Menu className="w-6 h-6" />
            </button>
          </div>

          {/* Logo */}
          <div className="flex-1 lg:flex-none flex justify-center lg:justify-start">
            <Link href={`/${locale}`} className="text-2xl font-bold tracking-widest uppercase">
              {dict.hero.small_text}
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex flex-1 justify-center space-x-8 rtl:space-x-reverse">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-brand-black hover:text-brand-black/60 transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Icons */}
          <div className="flex-1 flex justify-end items-center space-x-4 rtl:space-x-reverse">
            <button className="p-2 text-brand-black hover:text-brand-black/60 transition-colors" aria-label={dict.header.search}>
              <Search className="w-5 h-5" />
            </button>
            <button className="p-2 text-brand-black hover:text-brand-black/60 transition-colors" aria-label={dict.header.wishlist}>
              <Heart className="w-5 h-5" />
            </button>
            <button className="p-2 text-brand-black hover:text-brand-black/60 transition-colors relative" aria-label={dict.header.cart}>
              <ShoppingBag className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-brand-black"></span>
            </button>
          </div>

        </div>
      </div>
    </motion.header>
  );
}
