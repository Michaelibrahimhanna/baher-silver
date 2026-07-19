'use client';

import * as React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Container } from '@/components/ui/Container';

const images = [
  'https://images.unsplash.com/photo-1599643478514-4a4204b41b18?ixlib=rb-4.0.3&w=400&q=80',
  'https://images.unsplash.com/photo-1605100804763-247f6612d543?ixlib=rb-4.0.3&w=400&q=80',
  'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?ixlib=rb-4.0.3&w=400&q=80',
  'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?ixlib=rb-4.0.3&w=400&q=80',
  'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?ixlib=rb-4.0.3&w=400&q=80',
  'https://images.unsplash.com/photo-1596944924616-7b38e7cfac36?ixlib=rb-4.0.3&w=400&q=80',
];

export function InstagramGallery({ dict }: { dict: any }) {
  return (
    <section className="py-24 bg-brand-white">
      <Container className="text-center mb-12">
        <a 
          href="https://instagram.com/bahersilver" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-block text-2xl md:text-3xl font-medium tracking-wide hover:text-brand-black/60 transition-colors"
        >
          {dict.instagram.title}
        </a>
      </Container>
      
      {/* Gapless Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 w-full">
        {images.map((src, i) => (
          <motion.a
            key={i}
            href="https://instagram.com/bahersilver"
            target="_blank"
            rel="noopener noreferrer"
            className="relative aspect-square overflow-hidden group block"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            <Image
              src={src}
              alt="Instagram Post"
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-110"
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 16vw"
            />
            <div className="absolute inset-0 bg-brand-black/0 group-hover:bg-brand-black/20 transition-colors duration-300"></div>
          </motion.a>
        ))}
      </div>
    </section>
  );
}
