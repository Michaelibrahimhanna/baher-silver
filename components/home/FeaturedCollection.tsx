import * as React from 'react';
import { ProductCard } from '@/components/product/ProductCard';
import { getFeaturedProducts } from '@/lib/products';
import type { Dictionary } from '@/lib/dictionary';

export function FeaturedCollection({ dict, locale }: { dict: Dictionary; locale: string }) {
  const products = getFeaturedProducts();

  return (
    <section className="py-24 md:py-32 bg-background relative border-t border-border overflow-hidden">
      <div className="w-full max-w-screen-2xl mx-auto px-6 lg:px-12">
        
        <div className="flex flex-col items-center text-center mb-16 md:mb-20">
          <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-4">
            Curated Selection
          </span>
          <h2 className="text-4xl md:text-5xl font-serif text-primary">
            {dict.featured?.title || 'Featured Collection'}
          </h2>
        </div>

        {/* Mobile: Horizontal Snap Scroll | Desktop: Luxury Grid */}
        <div className="flex overflow-x-auto pb-8 -mx-6 px-6 md:mx-0 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-16 snap-x snap-mandatory hide-scrollbar">
          {products.map((product) => (
            <div key={product.id} className="min-w-[80vw] sm:min-w-[45vw] md:min-w-0 snap-center">
              <ProductCard
                product={product}
                locale={locale}
                dict={dict}
              />
            </div>
          ))}
        </div>
        
        <div className="mt-12 md:mt-24 flex justify-center">
          <button className="border-b border-primary/30 text-primary hover:border-primary pb-1 text-[11px] tracking-[0.2em] uppercase transition-colors duration-300">
            View All Pieces
          </button>
        </div>
        
      </div>
    </section>
  );
}
