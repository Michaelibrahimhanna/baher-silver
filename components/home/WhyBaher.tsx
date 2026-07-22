'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { Dictionary } from '@/lib/dictionary';

export function WhyBaher({ dict, locale }: { dict: Dictionary; locale: string }) {
  return (
    <section className="py-24 md:py-32 bg-secondary/10 relative overflow-hidden">
      <div className="w-full max-w-screen-xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center gap-16">
        
        <motion.div 
          className="flex-1 space-y-8"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-semibold">
            {dict.why_baher?.heritage || 'Our Heritage'}
          </span>
          <h2 className="text-4xl md:text-6xl font-serif text-primary leading-tight">
            {dict.why_baher?.title_line1 || 'Mastery in'} <br/>
            <span className="text-muted-foreground">{dict.why_baher?.title_line2 || '925 Silver'}</span>
          </h2>
          <p className="text-sm md:text-base font-sans text-muted-foreground tracking-wide leading-relaxed max-w-md">
            {dict.why_baher?.description || 'For generations, Baher Silver has pursued the pinnacle of craftsmanship. Every piece is forged with passion, combining timeless elegance with modern minimalist sensibilities.'}
          </p>
          <div className="pt-4">
            <Link 
              href={`/${locale}/collections`}
              className="border-b border-primary/30 text-primary hover:border-primary pb-1 text-[11px] tracking-[0.2em] uppercase transition-colors duration-300 inline-block"
            >
              {dict.why_baher?.discover_story || 'Discover Our Story'}
            </Link>
          </div>
        </motion.div>

        <motion.div 
          className="flex-1 relative aspect-square w-full max-w-md bg-secondary overflow-hidden rounded-sm"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <Image 
            src="https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=800&auto=format&fit=crop" 
            alt={dict.why_baher?.title_line1 || 'Craftsmanship'} 
            fill
            className="object-cover grayscale opacity-80 mix-blend-lighten"
            sizes="(max-width: 768px) 100vw, 500px"
          />
        </motion.div>
        
      </div>
    </section>
  );
}
