"use client";

import React, { useState } from 'react';
import { Product } from '@/lib/types';
import VariantSelector from '@/components/product/VariantSelector';
import ProductDetailsTabs from '@/components/product/ProductDetailsTabs';
import { useStore } from '@/lib/store';
import { Heart, Share2, ShoppingBag, Check } from 'lucide-react';

interface ProductPageClientProps {
  product: Product;
  locale: 'en' | 'ar';
}

export default function ProductPageClient({ product, locale }: ProductPageClientProps) {
  const { addToCart, toggleWishlist, wishlist } = useStore();
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [added, setAdded] = useState(false);
  const [copied, setCopied] = useState(false);

  const isWishlisted = wishlist.includes(product.id);
  const name = product.name[locale] || product.name.en;
  
  const handleVariantSelect = (groupName: string, variantId: string) => {
    setSelectedVariants(prev => ({
      ...prev,
      [groupName]: variantId
    }));
  };

  const handleAddToCart = () => {
    const variantId = Object.values(selectedVariants)[0] || (product.variants ? product.variants[0]?.id : undefined);
    addToCart(product, variantId, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 3000);
  };

  const shareProduct = () => {
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: name,
        url: currentUrl,
      }).catch(() => {});
    } else if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const tabs = [];
  if (product.details?.description) {
    tabs.push({ id: 'details', title: locale === 'ar' ? 'التفاصيل' : 'Details', content: <p className="leading-relaxed">{product.details.description[locale]}</p> });
  }
  if (product.details?.materials) {
    tabs.push({ 
      id: 'materials', 
      title: locale === 'ar' ? 'المواد' : 'Materials', 
      content: <ul className="list-disc ps-5 space-y-1">{product.details.materials.map((m, i) => <li key={i}>{m[locale]}</li>)}</ul> 
    });
  }
  if (product.details?.careGuide) {
    tabs.push({ id: 'care', title: locale === 'ar' ? 'دليل العناية' : 'Care Guide', content: <p className="leading-relaxed">{product.details.careGuide[locale]}</p> });
  }
  if (product.details?.shippingReturns) {
    tabs.push({ id: 'shipping', title: locale === 'ar' ? 'الشحن والإرجاع' : 'Shipping & Returns', content: <p className="leading-relaxed">{product.details.shippingReturns[locale]}</p> });
  }
  if (product.details?.certificate) {
    tabs.push({ id: 'certificate', title: locale === 'ar' ? 'الشهادة' : 'Certificate', content: <p className="leading-relaxed">{product.details.certificate[locale]}</p> });
  }

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
      <div className="mb-8 space-y-3">
        <h1 className="text-3xl md:text-5xl font-serif text-primary leading-tight">{name}</h1>
        <p className="text-2xl font-light text-muted-foreground tracking-wider">${product.price}</p>
        
        {/* Stock Status */}
        <div className="pt-2">
          <span className={`inline-block px-3 py-1 text-[10px] font-semibold uppercase tracking-widest rounded-full ${
            product.stockStatus === 'IN_STOCK' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
            product.stockStatus === 'LOW_STOCK' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
            product.stockStatus === 'OUT_OF_STOCK' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
            'bg-sky-500/10 text-sky-400 border border-sky-500/20'
          }`}>
            {product.stockStatus ? product.stockStatus.replace(/_/g, ' ') : 'IN STOCK'}
          </span>
        </div>
      </div>

      {variantGroups.length > 0 && (
        <div className="mb-8">
          <VariantSelector 
            groups={variantGroups}
            selectedVariants={selectedVariants}
            onSelect={handleVariantSelect}
          />
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <button 
          onClick={handleAddToCart}
          disabled={product.stockStatus === 'OUT_OF_STOCK'}
          className="flex-grow bg-primary text-black px-8 py-4 flex items-center justify-center gap-3 hover:bg-white transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-[0.2em] text-xs font-semibold shadow-[0_0_20px_rgba(229,228,226,0.2)]"
        >
          {added ? <Check size={18} /> : <ShoppingBag size={18} />}
          {added 
            ? (locale === 'ar' ? 'تمت الإضافة إلى السلة' : 'Added to Cart') 
            : (locale === 'ar' ? 'أضف إلى السلة' : 'Add to Cart')}
        </button>
        
        <button 
          onClick={() => toggleWishlist(product.id)}
          className={`px-6 py-4 border flex items-center justify-center transition-colors ${
            isWishlisted ? 'border-rose-500/40 bg-rose-500/10 text-rose-400' : 'border-white/10 hover:border-primary text-muted-foreground hover:text-white'
          }`}
          aria-label="Wishlist"
        >
          <Heart size={20} className={isWishlisted ? "fill-current" : ""} />
        </button>

        <button 
          onClick={shareProduct}
          className="px-6 py-4 border border-white/10 flex items-center justify-center hover:border-primary transition-colors text-muted-foreground hover:text-white relative"
          aria-label="Share"
        >
          {copied ? <Check size={20} className="text-emerald-400" /> : <Share2 size={20} />}
        </button>
      </div>

      <ProductDetailsTabs tabs={tabs} />
    </div>
  );
}
