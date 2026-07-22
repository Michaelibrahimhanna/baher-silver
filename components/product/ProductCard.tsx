'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Product } from '@/lib/types';
import type { Dictionary } from '@/lib/dictionary';
import { revealVariants } from '@/lib/motion';
import { Skeleton } from '@/components/ui/Skeleton';
import { Heart, Eye, ShoppingBag } from 'lucide-react';
import { useStore } from '@/lib/store';

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
  const { toggleWishlist, wishlist, addToCart } = useStore();
  
  const isWishlisted = wishlist.includes(product.id);
  const name = product.name[locale as 'en' | 'ar'] || product.name['en'];
  
  // Luxury Badges Logic
  const badges = [];
  if (product.isNew) badges.push(dict.badges?.new || (locale === 'ar' ? 'جديد' : 'NEW'));
  if (product.isLimited) badges.push(dict.badges?.limited || (locale === 'ar' ? 'حصري' : 'LIMITED'));
  if (product.isBestSeller) badges.push(dict.badges?.best_seller || (locale === 'ar' ? 'الأكثر مبيعاً' : 'BEST SELLER'));
  if (product.isHandmade) badges.push(dict.badges?.handmade || (locale === 'ar' ? 'صناعة يدوية' : 'HANDMADE'));

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  const handleAddToCartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, undefined, 1);
  };

  return (
    <motion.div 
      className="group relative flex flex-col cursor-pointer overflow-hidden p-3 transition-all duration-700 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:bg-secondary/10 rounded-sm border border-transparent hover:border-primary/30"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      variants={revealVariants}
    >
      {/* Image Container */}
      <Link href={`/${locale}/product/${product.slug}`} className="relative aspect-[3/4] w-full overflow-hidden bg-secondary/20 mb-5 rounded-sm block">
        
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
          <div className="absolute top-3 left-3 rtl:left-auto rtl:right-3 z-10 flex flex-col gap-1.5 pointer-events-none">
            {badges.slice(0, 2).map((badge, idx) => (
              <span key={idx} className="text-[9px] tracking-[0.2em] uppercase font-bold text-primary/90 bg-[#050505]/80 backdrop-blur-md px-2.5 py-1 border border-primary/20 rounded-xs shadow-sm">
                {badge}
              </span>
            ))}
          </div>
        )}

        {/* Wishlist Button */}
        <button
          onClick={handleWishlistClick}
          aria-label={dict.header?.wishlist || 'Wishlist'}
          className={`absolute top-3 right-3 rtl:right-auto rtl:left-3 z-20 p-2 rounded-full backdrop-blur-md transition-all duration-300 ${
            isWishlisted 
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.4)]' 
              : 'bg-black/40 text-white/70 hover:text-white border border-white/10 hover:border-primary/50'
          }`}
        >
          <Heart size={16} className={isWishlisted ? "fill-current" : ""} />
        </button>
        
        <Image
          src={product.image}
          alt={name}
          fill
          onLoad={() => setIsLoaded(true)}
          className="object-cover transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        />
        
        {/* Subtle Light Reflection (Shimmer on hover) */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 transition-opacity duration-700 ease-out group-hover:opacity-100 mix-blend-overlay z-0 pointer-events-none" />
        
        {/* Quick Actions Bar */}
        <div className="absolute inset-x-0 bottom-0 p-3 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] z-10 flex gap-2">
          <button 
            onClick={handleAddToCartClick}
            className="flex-1 bg-primary text-black py-2.5 px-3 text-[10px] tracking-[0.15em] uppercase font-bold hover:bg-white transition-colors duration-300 flex items-center justify-center gap-1.5 shadow-lg"
          >
            <ShoppingBag size={14} />
            <span>{dict.header?.cart || (locale === 'ar' ? 'أضف للسلة' : 'Add to Cart')}</span>
          </button>
          <span className="p-2.5 bg-black/80 text-white border border-white/20 rounded-xs flex items-center justify-center">
            <Eye size={14} />
          </span>
        </div>
      </Link>
      
      {/* Product Info */}
      <div className="flex flex-col items-center text-center space-y-1.5 px-2">
        <Link href={`/${locale}/product/${product.slug}`} className="group-hover:text-primary transition-colors duration-300">
          <h3 className="text-sm font-serif tracking-wide text-foreground font-medium line-clamp-1">
            {name}
          </h3>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs font-sans tracking-[0.15em] text-primary font-semibold">
            ${product.price.toFixed(2)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
