import * as React from 'react';
import { ProductCard } from '@/components/product/ProductCard';
import { getBestSellers } from '@/lib/products';

export function BestSellers({ dict, locale }: { dict: any; locale: string }) {
  const products = getBestSellers();

  return (
    <section className="py-24 md:py-32 bg-background relative border-t border-border overflow-hidden">
      <div className="w-full max-w-screen-2xl mx-auto px-6 lg:px-12">
        
        <div className="flex flex-col items-start text-left mb-16">
          <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-4">
            Iconic Pieces
          </span>
          <h2 className="text-4xl md:text-5xl font-serif text-primary">
            Best Sellers
          </h2>
        </div>

        <div className="flex overflow-x-auto pb-8 -mx-6 px-6 md:mx-0 md:px-0 md:grid md:grid-cols-4 gap-x-6 gap-y-16 snap-x snap-mandatory hide-scrollbar">
          {products.map((product) => (
            <div key={product.id} className="min-w-[70vw] sm:min-w-[40vw] md:min-w-0 snap-center">
              <ProductCard
                product={product}
                locale={locale}
                dict={dict}
              />
            </div>
          ))}
        </div>
        
      </div>
    </section>
  );
}
