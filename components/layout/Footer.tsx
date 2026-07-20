import * as React from 'react';
import Link from 'next/link';
import type { Dictionary } from '@/lib/dictionary';

export function Footer({ locale }: { locale: string }) {
  return (
    <footer className="bg-background pt-24 pb-12 border-t border-border">
      <div className="w-full max-w-screen-2xl mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          
          <div className="col-span-1 md:col-span-1">
            <Link href={`/${locale}`} className="text-2xl font-serif tracking-[0.2em] uppercase text-primary inline-block mb-6">
              BAHER
            </Link>
            <p className="text-sm font-sans tracking-wide text-muted-foreground mb-6 max-w-xs">
              Mastery in 925 Silver. A legacy of elegance, designed for the modern connoisseur.
            </p>
          </div>

          <div>
            <h4 className="text-[10px] tracking-[0.2em] uppercase text-primary font-medium mb-6">Explore</h4>
            <ul className="space-y-4">
              <li><Link href={`/${locale}/collections`} className="text-sm text-muted-foreground hover:text-primary transition-colors">Collections</Link></li>
              <li><Link href={`/${locale}/category/rings`} className="text-sm text-muted-foreground hover:text-primary transition-colors">Rings</Link></li>
              <li><Link href={`/${locale}/category/necklaces`} className="text-sm text-muted-foreground hover:text-primary transition-colors">Necklaces</Link></li>
              <li><Link href={`/${locale}/category/bracelets`} className="text-sm text-muted-foreground hover:text-primary transition-colors">Bracelets</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] tracking-[0.2em] uppercase text-primary font-medium mb-6">Client Services</h4>
            <ul className="space-y-4">
              <li><Link href={`/${locale}/contact`} className="text-sm text-muted-foreground hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link href={`/${locale}/shipping`} className="text-sm text-muted-foreground hover:text-primary transition-colors">Shipping & Returns</Link></li>
              <li><Link href={`/${locale}/care`} className="text-sm text-muted-foreground hover:text-primary transition-colors">Jewelry Care</Link></li>
              <li><Link href={`/${locale}/faq`} className="text-sm text-muted-foreground hover:text-primary transition-colors">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] tracking-[0.2em] uppercase text-primary font-medium mb-6">Legal</h4>
            <ul className="space-y-4">
              <li><Link href={`/${locale}/terms`} className="text-sm text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link href={`/${locale}/privacy`} className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-primary/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground tracking-wide">
            &copy; {new Date().getFullYear()} Baher Silver. All rights reserved.
          </p>
          <div className="flex gap-4">
            <span className="text-xs text-muted-foreground uppercase tracking-widest cursor-pointer hover:text-primary transition-colors">Instagram</span>
            <span className="text-xs text-muted-foreground uppercase tracking-widest cursor-pointer hover:text-primary transition-colors">Tiktok</span>
            <span className="text-xs text-muted-foreground uppercase tracking-widest cursor-pointer hover:text-primary transition-colors">Facebook</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
