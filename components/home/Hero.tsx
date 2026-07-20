'use client';

import * as React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';

export function Hero({ dict }: { dict: any }) {
  return (
    <section className="relative h-screen min-h-[700px] w-full flex items-center justify-center overflow-hidden bg-background">
      {/* Cinematic Background */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1599643478524-fb965191569a?q=80&w=2574&auto=format&fit=crop"
          alt="Baher Silver Luxury Collection"
          fill
          className="object-cover object-center opacity-60 scale-105"
          priority
          sizes="100vw"
        />
        {/* Deep luxury gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent"></div>
        <div className="absolute inset-0 bg-black/30"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-screen-2xl mx-auto px-6 lg:px-12 flex flex-col items-center text-center mt-20">
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="text-xs tracking-[0.3em] uppercase text-primary mb-6 font-medium"
        >
          {dict.hero?.small_text || 'The New Standard'}
        </motion.span>
        
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-6xl md:text-8xl font-serif text-primary mb-8"
        >
          {dict.hero?.heading || 'Elegance Redefined'}
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="text-sm md:text-base text-muted-foreground max-w-xl font-sans tracking-wide leading-relaxed mb-12"
        >
          {dict.hero?.paragraph || 'Discover the masterfully crafted 925 Silver collection. Designed for those who accept nothing but perfection.'}
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <Button variant="primary" size="lg">
            {dict.hero?.button || 'Explore the Collection'}
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
