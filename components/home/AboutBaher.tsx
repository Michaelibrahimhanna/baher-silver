'use client';

import * as React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Container } from '@/components/ui/Container';
import type { Dictionary } from '@/lib/dictionary';

export function AboutBaher({ dict }: { dict: Dictionary }) {
  return (
    <section className="py-32 bg-brand-white">
      <Container>
        <div className="flex flex-col md:flex-row items-center gap-16">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="w-full md:w-1/2"
          >
            <div className="relative aspect-[3/4] w-full max-w-md mx-auto overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1573408301145-b98c46544ea0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                alt="About Baher Silver"
                fill
                className="object-cover"
              />
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="w-full md:w-1/2 space-y-8"
          >
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              {dict.about.title}
            </h2>
            <div className="w-12 h-0.5 bg-brand-black"></div>
            <p className="text-lg text-brand-black/60 leading-relaxed">
              {dict.about.story}
            </p>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
