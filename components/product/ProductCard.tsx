'use client';

import * as React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Product } from '@/lib/types';
import type { Dictionary } from '@/lib/dictionary';

export function ProductCard({
  product,
  locale,
  dict,
}: {
  product: Product;
  locale: string;
  dict: Dictionary;
}) {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const name = product.name[locale as 'en' | 'ar'] || product.name['en'];
  
  // Luxury Badges Logic
  const badges = [];
  if (product.isNew) badges.push(dict.badges?.new || 'NEW');
  if (product.isLimited) badges.push(dict.badges?.limited || 'LIMITED');
  if (product.isBestSeller) badges.push(dict.badges?.best_seller || 'BEST SELLER');
  if (product.isHandmade) badges.push(dict.badges?.handmade || 'HANDMADE');

  return (
    <motion.div 
      className="group relative flex flex-col cursor-pointer overflow-hidden"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Image Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-secondary/20 mb-6">
        
        {/* Skeleton Loader */}
        <AnimatePresence>
          {!isLoaded && (
            <motion.div 
              className="absolute inset-0 z-20 bg-secondary animate-pulse"
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            />
          )}
        </AnimatePresence>

        {/* Badges Container */}
        {badges.length > 0 && (
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
            {badges.map((badge, idx) => (
              <span key={idx} className="text-[9px] tracking-[0.25em] uppercase font-medium text-primary/90 bg-background/60 backdrop-blur-md px-3 py-1 w-max">
                {badge}
              </span>
            ))}
          </div>
        )}
        
        <Image
          src={product.image}
          alt={name}
          fill
          onLoad={() => setIsLoaded(true)}
          className="object-cover transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        />
        
        {/* Cinematic Dark Overlay on Hover */}
        <div className="absolute inset-0 bg-black/0 transition-colors duration-700 ease-out group-hover:bg-black/20 z-0" />
        
        {/* Quick Add CTA */}
        <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] z-10">
          <button className="w-full bg-primary text-primary-foreground py-3 text-[11px] tracking-[0.2em] uppercase font-medium hover:bg-white transition-colors duration-300">
            {dict.common?.quick_view || 'Quick View'}
          </button>
        </div>
      </div>
      
      {/* Product Info */}
      <div className="flex flex-col items-center text-center space-y-2 px-2">
        <h3 className="text-sm font-serif tracking-wide text-foreground transition-colors duration-300 group-hover:text-primary">
          {name}
        </h3>
        <p className="text-xs font-sans tracking-[0.1em] text-muted-foreground">
          ${product.price.toFixed(2)}
        </p>
      </div>
    </motion.div>
  );
}
