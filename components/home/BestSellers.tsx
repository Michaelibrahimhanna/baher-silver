import * as React from 'react';
import { Container } from '@/components/ui/Container';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { ProductCard } from '@/components/product/ProductCard';
import { getBestSellers } from '@/lib/products';

export function BestSellers({ dict, locale }: { dict: any; locale: 'en' | 'ar' }) {
  const products = getBestSellers();

  return (
    <section className="py-24 bg-brand-gray-soft">
      <Container>
        <SectionTitle title={dict.best_sellers.title} />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              locale={locale}
              dict={dict}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}
