import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getDictionary } from '@/lib/dictionary';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'التشكيلات الحصرية | باهر سيلفر' : 'Signature Collections | Baher Silver',
    description: isAr ? 'تصفح التشكيلات الحصرية من المجوهرات الفضية عيار 925' : 'Explore signature 925 sterling silver jewelry collections.',
  };
}

export default async function CollectionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const resolvedLocale = locale === 'ar' ? 'ar' : 'en';
  const dict = await getDictionary(resolvedLocale);

  const collectionsData = [
    {
      id: 'heritage',
      name: resolvedLocale === 'ar' ? 'تشكيلة التراث' : 'Heritage Collection',
      desc: resolvedLocale === 'ar' ? 'تصاميم كلاسيكية مستوحاة من الحرفية التاريخية بلمسات فضية ناصعة.' : 'Timeless designs inspired by historical craftsmanship in pure 925 silver.',
      image: 'https://images.unsplash.com/photo-1605100804763-247f6612d543?q=80&w=800&auto=format&fit=crop',
      count: 14,
      link: `/${resolvedLocale}/category/rings`,
    },
    {
      id: 'minimalist',
      name: resolvedLocale === 'ar' ? 'تشكيلة البساطة العصرية' : 'Minimalist Modern',
      desc: resolvedLocale === 'ar' ? 'خطوط نقية وهندسية تناسب الإطلالات اليومية الأنيقة.' : 'Clean geometric lines crafted for elegant everyday wear.',
      image: 'https://images.unsplash.com/photo-1599643478514-4a4204b41b18?q=80&w=800&auto=format&fit=crop',
      count: 18,
      link: `/${resolvedLocale}/category/necklaces`,
    },
    {
      id: 'royal',
      name: resolvedLocale === 'ar' ? 'تشكيلة الملكي' : 'Royal Zircon Collection',
      desc: resolvedLocale === 'ar' ? 'قطع مرصعة بأحجار الزركون المتلألئة لإطلالة ملفتة في المناسبات.' : 'Embedded with shimmering zircons designed for special evenings.',
      image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=800&auto=format&fit=crop',
      count: 10,
      link: `/${resolvedLocale}/category/bracelets`,
    },
    {
      id: 'earrings-luxe',
      name: resolvedLocale === 'ar' ? 'تشكيلة أقراط الأناقة' : 'Luxe Earrings',
      desc: resolvedLocale === 'ar' ? 'أقراط متدلية وبسيطة تضفي لمسة ساحرة على كل إطلالة.' : 'Drop and stud earrings crafted to catch the light beautifully.',
      image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=800&auto=format&fit=crop',
      count: 12,
      link: `/${resolvedLocale}/category/earrings`,
    },
  ];

  return (
    <div className="pt-32 pb-24 bg-background min-h-screen">
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-12">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-semibold">
            Baher Silver
          </span>
          <h1 className="text-4xl md:text-5xl font-serif text-primary">
            {dict.collections?.title || 'Signature Collections'}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            {dict.collections?.subtitle || 'Curated selections of fine 925 sterling silver jewelry for every occasion.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {collectionsData.map((col) => (
            <Link key={col.id} href={col.link} className="group relative block overflow-hidden rounded-sm border border-white/10 bg-secondary/20 hover:border-primary/40 transition-colors duration-500">
              <div className="relative aspect-[16/9] w-full overflow-hidden">
                <Image
                  src={col.image}
                  alt={col.name}
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              </div>
              <div className="p-6 md:p-8 space-y-3">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-serif text-primary group-hover:text-white transition-colors duration-300">
                    {col.name}
                  </h2>
                  <span className="text-xs text-muted-foreground tracking-widest uppercase">
                    {col.count} {dict.collections?.pieces || 'Pieces'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {col.desc}
                </p>
                <div className="pt-2 text-xs uppercase tracking-[0.2em] font-medium text-primary flex items-center gap-2 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform duration-300">
                  {dict.collections?.explore || 'Explore Collection'} &rarr;
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
