'use client';

import * as React from 'react';
import Link from 'next/link';
import { Search, Heart, ShoppingBag, Menu } from 'lucide-react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';

export function Header({ dict, locale }: { dict: any; locale: string }) {
  const [hidden, setHidden] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const { scrollY } = useScroll();

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
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 w-full z-50 transition-colors duration-500 ${scrolled ? 'bg-background/90 backdrop-blur-xl border-b border-white/5' : 'bg-transparent border-transparent'}`}
    >
      <div className="w-full max-w-screen-2xl mx-auto px-6 lg:px-12">
        <div className="flex justify-between items-center h-24">
          
          {/* Mobile Menu Button */}
          <div className="flex-1 flex lg:hidden">
            <button className="text-foreground hover:text-primary transition-colors">
              <Menu className="w-6 h-6 stroke-[1.5]" />
            </button>
          </div>

          {/* Logo */}
          <div className="flex-1 lg:flex-none flex justify-center lg:justify-start">
            <Link href={`/${locale}`} className="text-2xl font-serif tracking-[0.2em] uppercase text-primary">
              BAHER
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex flex-1 justify-center space-x-10 rtl:space-x-reverse">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-xs tracking-[0.1em] uppercase font-medium text-foreground hover:text-primary transition-colors duration-300"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Icons */}
          <div className="flex-1 flex justify-end items-center space-x-6 rtl:space-x-reverse">
            <button className="text-foreground hover:text-primary transition-colors duration-300">
              <Search className="w-5 h-5 stroke-[1.5]" />
            </button>
            <button className="hidden sm:block text-foreground hover:text-primary transition-colors duration-300">
              <Heart className="w-5 h-5 stroke-[1.5]" />
            </button>
            <button className="text-foreground hover:text-primary transition-colors duration-300 relative">
              <ShoppingBag className="w-5 h-5 stroke-[1.5]" />
            </button>
          </div>

        </div>
      </div>
    </motion.header>
  );
}
