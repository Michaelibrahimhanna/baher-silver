"use client";

import React, { useState } from 'react';
import { Product } from '@/lib/types';
import VariantSelector from '@/components/product/VariantSelector';
import ProductDetailsTabs from '@/components/product/ProductDetailsTabs';
import { useStore } from '@/lib/store';
import { Heart, Share2, ShoppingBag } from 'lucide-react';

interface ProductPageClientProps {
  product: Product;
  locale: 'en' | 'ar';
}

export default function ProductPageClient({ product, locale }: ProductPageClientProps) {
  const { addToCart, toggleWishlist, wishlist } = useStore();
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  
  const isWishlisted = wishlist.includes(product.id);
  const name = product.name[locale] || product.name.en;
  
  const handleVariantSelect = (groupName: string, variantId: string) => {
    setSelectedVariants(prev => ({
      ...prev,
      [groupName]: variantId
    }));
  };

  const handleAddToCart = () => {
    // Basic implementation: if there's a variants array, pick the first selected variant id.
    // Assuming variants group is just "Variant" for now if not strictly structured
    const variantId = Object.values(selectedVariants)[0] || (product.variants ? product.variants[0]?.id : undefined);
    addToCart(product, variantId, 1);
    alert('Added to cart!'); // Simple feedback
  };

  const shareProduct = () => {
    if (navigator.share) {
      navigator.share({
        title: name,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const tabs = [];
  if (product.details?.description) {
    tabs.push({ id: 'details', title: locale === 'ar' ? 'التفاصيل' : 'Details', content: <p>{product.details.description[locale]}</p> });
  }
  if (product.details?.materials) {
    tabs.push({ 
      id: 'materials', 
      title: locale === 'ar' ? 'المواد' : 'Materials', 
      content: <ul className="list-disc pl-5">{product.details.materials.map((m, i) => <li key={i}>{m[locale]}</li>)}</ul> 
    });
  }
  if (product.details?.careGuide) {
    tabs.push({ id: 'care', title: locale === 'ar' ? 'دليل العناية' : 'Care Guide', content: <p>{product.details.careGuide[locale]}</p> });
  }
  if (product.details?.shippingReturns) {
    tabs.push({ id: 'shipping', title: locale === 'ar' ? 'الشحن والإرجاع' : 'Shipping & Returns', content: <p>{product.details.shippingReturns[locale]}</p> });
  }
  if (product.details?.certificate) {
    tabs.push({ id: 'certificate', title: locale === 'ar' ? 'الشهادة' : 'Certificate', content: <p>{product.details.certificate[locale]}</p> });
  }

  // Format variants for the selector if they exist
  const variantGroups = product.variants ? [
    {
      id: 'v1',
      name: locale === 'ar' ? 'الخيار' : 'Variant',
      type: product.variants.some(v => v.color) ? 'color' as const : 'pill' as const,
      variants: product.variants.map(v => ({
        id: v.id,
        name: v.name[locale] || v.name.en,
        value: v.id,
        color: v.color
      }))
    }
  ] : [];

  return (
    <div className="flex flex-col h-full">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-serif text-neutral-900 mb-4">{name}</h1>
        <p className="text-2xl text-neutral-600">${product.price}</p>
        
        {/* Stock Status */}
        <div className="mt-4">
          <span className={`inline-block px-3 py-1 text-xs font-medium uppercase tracking-wider ${
            product.stockStatus === 'IN_STOCK' ? 'bg-green-100 text-green-800' :
            product.stockStatus === 'LOW_STOCK' ? 'bg-yellow-100 text-yellow-800' :
            product.stockStatus === 'OUT_OF_STOCK' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {product.stockStatus ? product.stockStatus.replace(/_/g, ' ') : 'IN STOCK'}
          </span>
        </div>
      </div>

      <div className="mb-8">
        <VariantSelector 
          groups={variantGroups}
          selectedVariants={selectedVariants}
          onSelect={handleVariantSelect}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-12">
        <button 
          onClick={handleAddToCart}
          disabled={product.stockStatus === 'OUT_OF_STOCK'}
          className="flex-grow bg-black text-white px-8 py-4 flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider font-medium"
        >
          <ShoppingBag size={20} />
          {locale === 'ar' ? 'أضف إلى السلة' : 'Add to Cart'}
        </button>
        
        <button 
          onClick={() => toggleWishlist(product.id)}
          className={`px-6 py-4 border flex items-center justify-center transition-colors ${
            isWishlisted ? 'border-red-200 bg-red-50 text-red-500' : 'border-neutral-200 hover:border-black text-neutral-600'
          }`}
          aria-label="Wishlist"
        >
          <Heart size={24} className={isWishlisted ? "fill-current" : ""} />
        </button>

        <button 
          onClick={shareProduct}
          className="px-6 py-4 border border-neutral-200 flex items-center justify-center hover:border-black transition-colors text-neutral-600"
          aria-label="Share"
        >
          <Share2 size={24} />
        </button>
      </div>

      {/* Share Links */}
      <div className="flex gap-4 mb-8 text-sm text-neutral-500">
        <a 
          href={`https://wa.me/?text=${encodeURIComponent(window.location.href)}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-black transition-colors"
        >
          WhatsApp
        </a>
        <a 
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-black transition-colors"
        >
          Facebook
        </a>
      </div>

      <ProductDetailsTabs tabs={tabs} />
    </div>
  );
}
