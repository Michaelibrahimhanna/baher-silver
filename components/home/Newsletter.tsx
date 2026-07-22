'use client';

import * as React from 'react';
import type { Dictionary } from '@/lib/dictionary';

export function Newsletter({ dict }: { dict?: Dictionary }) {
  return (
    <section className="py-24 md:py-32 bg-secondary/20 relative overflow-hidden border-t border-border border-b">
      <div className="w-full max-w-xl mx-auto px-6 text-center">
        
        <h2 className="text-3xl md:text-4xl font-serif text-primary mb-4">
          {dict?.footer?.newsletter_title || 'Join the Inner Circle'}
        </h2>
        <p className="text-sm font-sans tracking-wide text-muted-foreground mb-12">
          {dict?.footer?.newsletter_desc || 'Subscribe to receive exclusive access to new collections, private sales, and the Baher Silver journal.'}
        </p>

        <form onSubmit={(e) => e.preventDefault()} className="flex flex-col sm:flex-row items-center gap-4 w-full">
          <input 
            type="email" 
            placeholder={dict?.footer?.email_placeholder || 'Your email address'} 
            className="w-full bg-transparent border-b border-primary/30 py-3 px-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/50"
            required
          />
          <button 
            type="submit"
            className="w-full sm:w-auto bg-primary text-primary-foreground px-8 py-3 text-[11px] tracking-[0.2em] uppercase font-medium hover:bg-white transition-colors duration-300 whitespace-nowrap"
          >
            {dict?.footer?.subscribe || 'Subscribe'}
          </button>
        </form>
        
      </div>
    </section>
  );
}
