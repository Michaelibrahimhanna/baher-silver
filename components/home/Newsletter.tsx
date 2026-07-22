'use client';

import * as React from 'react';
import type { Dictionary } from '@/lib/dictionary';

export function Newsletter({ dict, locale }: { dict?: Dictionary; locale?: string }) {
  const isAr = locale === 'ar';
  return (
    <section className="py-24 md:py-32 bg-secondary/20 relative overflow-hidden border-t border-white/5 border-b">
      <div className="w-full max-w-xl mx-auto px-6 text-center">
        
        <h2 className="text-3xl md:text-4xl font-serif text-primary mb-4 tracking-wide">
          {dict?.footer?.newsletter_title || (isAr ? 'انضم إلى مجتمع باهر الخاص' : 'Join the Inner Circle')}
        </h2>
        <p className="text-sm font-sans tracking-wide text-muted-foreground mb-12 leading-relaxed">
          {dict?.footer?.newsletter_desc || (isAr ? 'اشترك للحصول على إمكانية الوصول الحصري للمجموعات الجديدة والخصومات الخاصة ومجلة باهر سيلفر.' : 'Subscribe to receive exclusive access to new collections, private sales, and the Baher Silver journal.')}
        </p>

        <form onSubmit={(e) => e.preventDefault()} className="flex flex-col sm:flex-row items-center gap-4 w-full">
          <input 
            type="email" 
            placeholder={dict?.footer?.email_placeholder || (isAr ? 'بريدك الإلكتروني' : 'Your email address')} 
            className="w-full bg-transparent border-b border-primary/40 py-3 px-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/50"
            required
          />
          <button 
            type="submit"
            className="w-full sm:w-auto bg-primary text-black px-8 py-3 text-[11px] tracking-[0.2em] uppercase font-bold hover:bg-white transition-colors duration-300 whitespace-nowrap shadow-lg"
          >
            {dict?.footer?.subscribe || (isAr ? 'اشتراك' : 'Subscribe')}
          </button>
        </form>
        
      </div>
    </section>
  );
}
