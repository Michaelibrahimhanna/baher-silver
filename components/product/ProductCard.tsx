'use client';

import * as React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Product } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export function ProductCard({
  product,
  locale,
  dict,
}: {
  product: Product;
  locale: 'en' | 'ar';
  dict: any;
}) {
  const name = product.name[locale];
  
  return (
    <motion.div 
      className="group relative flex flex-col cursor-pointer"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-brand-gray-soft mb-4">
        {product.isNew && (
          <div className="absolute top-3 left-3 z-10">
            <Badge>{dict.new_arrivals.title}</Badge>
          </div>
        )}
        <Image
          src={product.image}
          alt={name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        />
        
        {/* Quick View Overlay */}
        <div className="absolute inset-0 bg-brand-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
          <Button 
            variant="primary" 
            className="w-full translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-100"
          >
            {dict.common.quick_view}
          </Button>
        </div>
      </div>
      
      <div className="flex flex-col space-y-1">
        <h3 className="text-sm font-medium text-brand-black truncate">
          {name}
        </h3>
        <p className="text-sm text-brand-black/60">
          ${product.price.toFixed(2)}
        </p>
      </div>
    </motion.div>
  );
}
