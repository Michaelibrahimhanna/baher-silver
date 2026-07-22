import * as React from 'react';
import Link from 'next/link';
import type { Dictionary } from '@/lib/dictionary';

export function Footer({ dict, locale }: { dict: Dictionary; locale: string }) {
  const isAr = locale === 'ar';

  return (
    <footer className="bg-background pt-24 pb-12 border-t border-white/10">
      <div className="w-full max-w-screen-2xl mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16 text-start">
          
          <div className="col-span-1 md:col-span-1">
            <Link href={`/${locale}`} className="text-2xl font-serif tracking-[0.2em] uppercase text-primary inline-block mb-6">
              {isAr ? 'باهر سيلفر' : 'BAHER SILVER'}
            </Link>
            <p className="text-sm font-sans tracking-wide text-muted-foreground mb-6 max-w-xs leading-relaxed">
              {dict.about?.story?.slice(0, 120) || (isAr ? 'مجوهرات فضية فاخرة عيار 925 عريقة ومصممة بأعلى مستويات الأناقة والجمال.' : 'Mastery in 925 Silver. A legacy of elegance, designed for the modern connoisseur.')}
            </p>
          </div>

          <div>
            <h4 className="text-[10px] tracking-[0.2em] uppercase text-primary font-bold mb-6">
              {dict.footer?.quick_links || (isAr ? 'تصفح المتجر' : 'Explore')}
            </h4>
            <ul className="space-y-4">
              <li><Link href={`/${locale}/collections`} className="text-sm text-muted-foreground hover:text-primary transition-colors">{dict.header?.collections || (isAr ? 'التشكيلات' : 'Collections')}</Link></li>
              <li><Link href={`/${locale}/category/rings`} className="text-sm text-muted-foreground hover:text-primary transition-colors">{dict.header?.rings || (isAr ? 'خواتم' : 'Rings')}</Link></li>
              <li><Link href={`/${locale}/category/necklaces`} className="text-sm text-muted-foreground hover:text-primary transition-colors">{dict.header?.necklaces || (isAr ? 'قلائد' : 'Necklaces')}</Link></li>
              <li><Link href={`/${locale}/category/bracelets`} className="text-sm text-muted-foreground hover:text-primary transition-colors">{dict.header?.bracelets || (isAr ? 'أساور' : 'Bracelets')}</Link></li>
              <li><Link href={`/${locale}/category/earrings`} className="text-sm text-muted-foreground hover:text-primary transition-colors">{dict.header?.earrings || (isAr ? 'أقراط' : 'Earrings')}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] tracking-[0.2em] uppercase text-primary font-bold mb-6">
              {dict.footer?.customer_service || (isAr ? 'خدمة العملاء' : 'Client Services')}
            </h4>
            <ul className="space-y-4">
              <li><Link href={`/${locale}/account`} className="text-sm text-muted-foreground hover:text-primary transition-colors">{dict.header?.account || (isAr ? 'حسابي' : 'Account')}</Link></li>
              <li><Link href={`/${locale}/checkout`} className="text-sm text-muted-foreground hover:text-primary transition-colors">{dict.header?.cart || (isAr ? 'السلة والدفع' : 'Cart & Checkout')}</Link></li>
              <li><Link href={`/${locale}/journal`} className="text-sm text-muted-foreground hover:text-primary transition-colors">{dict.header?.journal || (isAr ? 'المجلة' : 'Journal')}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] tracking-[0.2em] uppercase text-primary font-bold mb-6">
              {dict.footer?.social_media || (isAr ? 'وسائل التواصل' : 'Social')}
            </h4>
            <ul className="space-y-4">
              <li><a href="https://instagram.com/bahersilver" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary transition-colors">Instagram</a></li>
              <li><a href="https://tiktok.com/@bahersilver" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary transition-colors">TikTok</a></li>
              <li><a href="https://facebook.com/bahersilver" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary transition-colors">Facebook</a></li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground tracking-wide">
            {dict.footer?.rights || (isAr ? `© ${new Date().getFullYear()} باهر للفضة. جميع الحقوق محفوظة.` : `© ${new Date().getFullYear()} Baher Silver. All rights reserved.`)}
          </p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>{isAr ? 'فضة عيار 925 مضمونة الأصالة' : '925 Sterling Silver Guaranteed'}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
