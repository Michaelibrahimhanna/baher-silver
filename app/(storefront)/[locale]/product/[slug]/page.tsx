import { notFound } from 'next/navigation';
import { getProductBySlug } from '@/lib/products';
import ProductGallery from '@/components/product/ProductGallery';
import { Metadata } from 'next';
import ProductPageClient from './ProductPageClient';

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const product = getProductBySlug(resolvedParams.slug);

  if (!product) {
    return {
      title: 'Product Not Found',
    };
  }

  const title = product.name[resolvedParams.locale as keyof typeof product.name] || product.name.en;
  
  return {
    title: `${title} | Baher Silver`,
    description: product.details?.description?.[resolvedParams.locale as keyof typeof product.details.description] || title,
  };
}

export default async function ProductPage({ params }: Props) {
  const resolvedParams = await params;
  const product = getProductBySlug(resolvedParams.slug);

  if (!product) {
    notFound();
  }

  const locale = resolvedParams.locale as 'en' | 'ar';
  const name = product.name[locale] || product.name.en;
  const description = product.details?.description?.[locale] || product.details?.description?.en || '';
  
  // JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: name,
    image: product.image,
    description: description,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'USD',
      availability: product.stockStatus === 'IN_STOCK' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 md:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
        {/* Gallery */}
        <div>
           <ProductGallery 
             images={
               product.gallery 
                 ? product.gallery.map((url, i) => ({ url, alt: `${name} ${i + 1}` }))
                 : [{ url: product.image, alt: name }]
             } 
           />
        </div>

        {/* Details & Actions */}
        <div>
          <ProductPageClient product={product} locale={locale} />
        </div>
      </div>
    </div>
  );
}
