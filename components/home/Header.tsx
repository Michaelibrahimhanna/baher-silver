'use client';

import { useState } from 'react';
import { Heart, Menu, Search, ShoppingBag, X } from 'lucide-react';

const navigationItems = [
  { label: 'Home', href: '#' },
  { label: 'New Arrivals', href: '#new-arrivals' },
  { label: 'Collections', href: '#collections' },
  { label: 'Rings', href: '#rings' },
  { label: 'Necklaces', href: '#necklaces' },
  { label: 'Bracelets', href: '#bracelets' },
  { label: 'Contact', href: '#contact' },
];

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <a
          href="#"
          className="text-lg font-semibold uppercase tracking-[0.4em] text-stone-900 transition hover:text-stone-700"
        >
          BAHER
        </a>

        <nav className="hidden items-center gap-7 lg:flex">
          {navigationItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm font-medium uppercase tracking-[0.24em] text-stone-700 transition duration-200 hover:text-stone-900"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            aria-label="Search"
            className="rounded-full p-2 text-stone-700 transition duration-200 hover:bg-stone-100 hover:text-stone-900"
          >
            <Search size={18} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            aria-label="Wishlist"
            className="rounded-full p-2 text-stone-700 transition duration-200 hover:bg-stone-100 hover:text-stone-900"
          >
            <Heart size={18} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            aria-label="Shopping bag"
            className="rounded-full p-2 text-stone-700 transition duration-200 hover:bg-stone-100 hover:text-stone-900"
          >
            <ShoppingBag size={18} strokeWidth={1.8} />
          </button>

          <button
            type="button"
            aria-label="Toggle menu"
            className="rounded-full p-2 text-stone-700 transition duration-200 hover:bg-stone-100 hover:text-stone-900 lg:hidden"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? <X size={18} strokeWidth={1.8} /> : <Menu size={18} strokeWidth={1.8} />}
          </button>
        </div>
      </div>

      <div className={`border-t border-stone-200 bg-white lg:hidden ${isMenuOpen ? 'block' : 'hidden'}`}>
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 sm:px-6">
          {navigationItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm font-medium uppercase tracking-[0.24em] text-stone-700 transition duration-200 hover:text-stone-900"
              onClick={() => setIsMenuOpen(false)}
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </header>
  );
}
