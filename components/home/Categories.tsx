import * as React from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { ImageCard } from '@/components/ui/ImageCard';
import { getAllCategories } from '@/lib/categories';
import type { Dictionary } from '@/lib/dictionary';

export function Categories({ dict, locale }: { dict: Dictionary; locale: 'en' | 'ar' }) {
  const categories = getAllCategories();

  return (
    <section className="py-24 bg-brand-white">
      <Container>
        <SectionTitle title={dict.categories.title} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category) => (
            <Link key={category.id} href={`/${locale}/category/${category.slug}`} className="block group relative overflow-hidden">
              <ImageCard
                src={category.image}
                alt={category.name[locale]}
                aspectRatio="portrait"
              />
              <div className="absolute inset-0 bg-brand-black/20 group-hover:bg-brand-black/40 transition-colors duration-500"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <h3 className="text-2xl font-medium text-brand-white tracking-widest uppercase opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500">
                  {category.name[locale]}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
