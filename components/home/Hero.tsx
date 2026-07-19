'use client';

import * as React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';

export function Hero({ dict }: { dict: any }) {
  return (
    <section className="relative h-screen min-h-[600px] w-full flex items-center bg-brand-gray-soft overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
          alt="Luxury Jewelry Background"
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
        />
        {/* Elegant overlay to ensure text is readable but keeps it light */}
        <div className="absolute inset-0 bg-brand-white/40 backdrop-blur-[2px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center">
        <div className="md:w-1/2 flex flex-col items-start space-y-6 pt-20 md:pt-0">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-sm font-bold tracking-[0.3em] uppercase text-brand-black"
          >
            {dict.hero.small_text}
          </motion.span>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-5xl md:text-7xl font-bold tracking-tight text-brand-black"
          >
            {dict.hero.heading}
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-lg md:text-xl text-brand-black max-w-md font-medium"
          >
            {dict.hero.paragraph}
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="pt-4"
          >
            <Button size="lg" className="px-12 text-sm tracking-wider uppercase">
              {dict.hero.button}
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
