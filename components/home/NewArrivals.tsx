'use client';

import * as React from 'react';
import { Container } from '@/components/ui/Container';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { ProductCard } from '@/components/product/ProductCard';
import { getNewArrivals } from '@/lib/products';
import type { Dictionary } from '@/lib/dictionary';

export function NewArrivals({ dict, locale }: { dict: Dictionary; locale: 'en' | 'ar' }) {
  const products = getNewArrivals();

  return (
    <section className="py-24 bg-brand-white">
      <Container>
        <SectionTitle title={dict.new_arrivals.title} />
        {/* We use a simple flex-nowrap row with horizontal scrolling for a modern feel */}
        <div className="flex overflow-x-auto pb-8 gap-6 hide-scrollbar snap-x">
          {products.map((product) => (
            <div key={product.id} className="min-w-[280px] w-[280px] md:min-w-[320px] md:w-[320px] flex-shrink-0 snap-start">
              <ProductCard
                product={product}
                locale={locale}
                dict={dict}
              />
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
