'use client';

import * as React from 'react';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import type { Dictionary } from '@/lib/dictionary';

export function Hero({ dict }: { dict: Dictionary }) {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 1000], [0, 250]);
  const opacity = useTransform(scrollY, [0, 500], [1, 0]);

  return (
    <section className="relative h-screen min-h-[700px] w-full flex items-center justify-center overflow-hidden bg-background">
      {/* Cinematic Background with Parallax */}
      <motion.div style={{ y: y1 }} className="absolute inset-0 z-0 w-full h-[120%] -top-[10%]">
        <Image
          src="https://images.unsplash.com/photo-1599643478524-fb965191569a?q=80&w=2574&auto=format&fit=crop"
          alt="Baher Silver Luxury Collection"
          fill
          className="object-cover object-center opacity-60 scale-105"
          priority
          sizes="100vw"
        />
        {/* Deep luxury gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-transparent to-transparent z-10" />
        <div className="absolute inset-0 bg-black/20 z-10" />
      </motion.div>

      {/* Content */}
      <motion.div 
        style={{ opacity }}
        className="relative z-20 w-full max-w-screen-2xl mx-auto px-6 lg:px-12 flex flex-col items-center text-center mt-20"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center"
        >
          <span className="text-[10px] sm:text-xs tracking-[0.4em] uppercase text-primary/80 mb-8 font-medium relative flex items-center gap-4">
            <span className="w-8 h-[1px] bg-primary/40 hidden sm:block"></span>
            {dict.hero?.small_text || 'The New Standard'}
            <span className="w-8 h-[1px] bg-primary/40 hidden sm:block"></span>
          </span>
          
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-serif text-transparent bg-clip-text bg-gradient-to-b from-white via-primary to-primary/60 mb-8 pb-2 drop-shadow-2xl">
            {dict.hero?.heading || 'Elegance'} <br className="md:hidden" />
            <span className="italic font-light">Redefined</span>
          </h1>
          
          <p className="text-sm md:text-base text-muted-foreground max-w-xl font-sans tracking-[0.05em] leading-loose mb-12 text-balance">
            {dict.hero?.paragraph || 'Discover the masterfully crafted 925 Silver collection. Designed for those who accept nothing but perfection.'}
          </p>
          
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/0 via-primary/30 to-primary/0 rounded-full blur opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
            <Button variant="primary" size="lg" className="relative">
              {dict.hero?.button || 'Explore the Collection'}
            </Button>
          </div>
        </motion.div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div 
        style={{ opacity }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 1 }}
      >
        <span className="text-[9px] uppercase tracking-[0.3em] text-primary/60">Scroll</span>
        <div className="w-[1px] h-12 bg-primary/20 relative overflow-hidden">
          <motion.div 
            className="w-full h-1/2 bg-primary absolute top-0 left-0"
            animate={{ 
              y: ['-100%', '200%'],
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 1.5, 
              ease: "circInOut"
            }}
          />
        </div>
      </motion.div>
    </section>
  );
}
