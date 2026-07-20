'use client';

import * as React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import type { Dictionary } from '@/lib/dictionary';

export function LuxuryBanner({ dict }: { dict: Dictionary }) {
  return (
    <section className="relative py-32 overflow-hidden flex items-center justify-center bg-brand-black">
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1596944924616-7b38e7cfac36?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
          alt="Luxury Banner"
          fill
          className="object-cover opacity-40"
        />
      </div>
      <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-6xl font-bold text-brand-white mb-8 tracking-tight"
        >
          {dict.banner.title}
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Button variant="outline" className="text-brand-white border-brand-white hover:bg-brand-white hover:text-brand-black px-12 uppercase tracking-widest text-sm">
            {dict.banner.button}
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
