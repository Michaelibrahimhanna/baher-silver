import * as React from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';

export function Footer({ dict, locale }: { dict: any; locale: 'en' | 'ar' }) {
  return (
    <footer className="bg-brand-black text-brand-white pt-16 pb-8">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-bold tracking-widest uppercase font-[family-name:var(--font-cormorant)]">
              {dict.hero.small_text}
            </h2>
            <p className="text-sm text-brand-white/60 max-w-sm leading-relaxed">
              {dict.about.story.substring(0, 150)}...
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium">{dict.footer.quick_links}</h3>
            <ul className="space-y-3">
              <li><Link href={`/${locale}`} className="text-sm text-brand-white/60 hover:text-brand-white transition-colors">{dict.header.home}</Link></li>
              <li><Link href={`/${locale}/collections`} className="text-sm text-brand-white/60 hover:text-brand-white transition-colors">{dict.header.collections}</Link></li>
              <li><Link href={`/${locale}/about`} className="text-sm text-brand-white/60 hover:text-brand-white transition-colors">{dict.about.title}</Link></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium">{dict.footer.customer_service}</h3>
            <ul className="space-y-3">
              <li><Link href="#" className="text-sm text-brand-white/60 hover:text-brand-white transition-colors">Contact Us</Link></li>
              <li><Link href="#" className="text-sm text-brand-white/60 hover:text-brand-white transition-colors">Shipping & Returns</Link></li>
              <li><Link href="#" className="text-sm text-brand-white/60 hover:text-brand-white transition-colors">FAQ</Link></li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-brand-white/10 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p className="text-xs text-brand-white/60">
            {dict.footer.rights}
          </p>
          <div className="flex space-x-6 rtl:space-x-reverse">
            <Link href="#" className="text-brand-white/60 hover:text-brand-white transition-colors text-sm">Instagram</Link>
            <Link href="#" className="text-brand-white/60 hover:text-brand-white transition-colors text-sm">Facebook</Link>
            <Link href="#" className="text-brand-white/60 hover:text-brand-white transition-colors text-sm">Pinterest</Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}
