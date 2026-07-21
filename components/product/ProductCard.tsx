'use client';

import * as React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Product } from '@/lib/types';
import type { Dictionary } from '@/lib/dictionary';
import { revealVariants } from '@/lib/motion';
import { Skeleton } from '@/components/ui/Skeleton';

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
      className="group relative flex flex-col cursor-pointer overflow-hidden p-3 transition-all duration-700 hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)] hover:bg-secondary/5 rounded-sm border border-transparent hover:border-primary/20"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      variants={revealVariants}
    >
      {/* Image Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-secondary/10 mb-6 rounded-sm">
        
        {/* Skeleton Loader */}
        <AnimatePresence>
          {!isLoaded && (
            <motion.div 
              className="absolute inset-0 z-20"
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Skeleton className="w-full h-full" />
            </motion.div>
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
          className="object-cover transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        />
        
        {/* Subtle Light Reflection (Shimmer on hover) */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 transition-opacity duration-700 ease-out group-hover:opacity-100 mix-blend-overlay z-0 pointer-events-none" />
        
        {/* Quick Add CTA */}
        <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] z-10">
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
