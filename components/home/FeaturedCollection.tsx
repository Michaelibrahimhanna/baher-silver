import * as React from 'react';
import { ProductCard } from '@/components/product/ProductCard';
import { getFeaturedProducts } from '@/lib/products';

export function FeaturedCollection({ dict, locale }: { dict: any; locale: string }) {
  const products = getFeaturedProducts();

  return (
    <section className="py-32 bg-background relative border-t border-border">
      <div className="w-full max-w-screen-2xl mx-auto px-6 lg:px-12">
        
        <div className="flex flex-col items-center text-center mb-20">
          <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-4">
            Curated Selection
          </span>
          <h2 className="text-4xl md:text-5xl font-serif text-primary">
            {dict.featured?.title || 'Featured Collection'}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-16">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              locale={locale}
              dict={dict}
            />
          ))}
        </div>
        
        <div className="mt-24 flex justify-center">
          <button className="border-b border-primary/30 text-primary hover:border-primary pb-1 text-[11px] tracking-[0.2em] uppercase transition-colors duration-300">
            View All Pieces
          </button>
        </div>
        
      </div>
    </section>
  );
}
