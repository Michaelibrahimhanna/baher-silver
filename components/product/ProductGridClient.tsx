"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingBag, Eye } from "lucide-react";
import { Product } from "@/lib/types";
import { useStore } from "@/lib/store";

interface ProductGridClientProps {
  products: Product[];
  locale: string;
}

export default function ProductGridClient({ products, locale }: ProductGridClientProps) {
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const addToCart = useStore((state) => state.addToCart);
  const isAr = locale === 'ar';

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => {
          const name = product.name[locale as 'en'|'ar'] || product.name.en;
          return (
            <div key={product.id} className="group flex flex-col bg-secondary/10 border border-white/5 hover:border-primary/30 p-3 rounded-sm transition-all duration-500 hover:shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
              <div className="relative aspect-[3/4] bg-secondary/20 overflow-hidden rounded-sm mb-4">
                <Link href={`/${locale}/product/${product.slug}`}>
                  <Image
                    src={product.image}
                    alt={name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  />
                </Link>
                
                {/* Quick View Button Overlay */}
                <div className="absolute bottom-3 inset-x-3 flex justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setQuickViewProduct(product);
                    }}
                    className="w-full bg-primary/90 backdrop-blur text-black px-4 py-2.5 rounded-xs font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 hover:bg-white transition-colors shadow-xl"
                  >
                    <Eye className="w-4 h-4" />
                    {isAr ? 'نظرة سريعة' : 'Quick View'}
                  </button>
                </div>
              </div>
              <div className="flex flex-col flex-1 text-center space-y-1">
                <Link href={`/${locale}/product/${product.slug}`}>
                  <h3 className="font-serif text-sm text-foreground hover:text-primary transition-colors line-clamp-1">
                    {name}
                  </h3>
                </Link>
                <p className="text-xs text-primary font-semibold tracking-wider mt-1">${product.price}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick View Modal */}
      <AnimatePresence>
        {quickViewProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setQuickViewProduct(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-[#0a0a0a] border border-white/10 rounded-sm shadow-2xl overflow-hidden w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 z-10 text-foreground"
            >
              <button
                onClick={() => setQuickViewProduct(null)}
                className="absolute top-4 right-4 rtl:right-auto rtl:left-4 z-20 p-2 bg-black/60 hover:bg-white/10 text-white rounded-full transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Image Side */}
              <div className="relative aspect-square md:aspect-auto md:h-full bg-secondary/20">
                <Image
                  src={quickViewProduct.image}
                  alt={quickViewProduct.name[locale as 'en'|'ar'] || quickViewProduct.name.en}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>

              {/* Details Side */}
              <div className="p-8 md:p-12 flex flex-col justify-center space-y-6">
                <div>
                  <h2 className="text-3xl font-serif text-primary mb-2">
                    {quickViewProduct.name[locale as 'en'|'ar'] || quickViewProduct.name.en}
                  </h2>
                  <p className="text-xl text-muted-foreground tracking-wider">${quickViewProduct.price}</p>
                </div>
                
                {quickViewProduct.details?.description && (
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {quickViewProduct.details.description[locale as 'en'|'ar'] || quickViewProduct.details.description.en}
                  </p>
                )}

                <div className="space-y-3 pt-4">
                  <button
                    onClick={() => {
                      addToCart(quickViewProduct);
                      setQuickViewProduct(null);
                    }}
                    className="w-full bg-primary text-black py-3.5 rounded-xs font-bold text-xs uppercase tracking-[0.2em] hover:bg-white transition-colors flex items-center justify-center gap-2 shadow-lg"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    {isAr ? 'أضف إلى السلة' : 'Add to Cart'}
                  </button>
                  <Link
                    href={`/${locale}/product/${quickViewProduct.slug}`}
                    onClick={() => setQuickViewProduct(null)}
                    className="w-full block text-center py-3.5 rounded-xs font-semibold text-xs uppercase tracking-[0.2em] border border-white/20 hover:border-primary transition-colors text-muted-foreground hover:text-white"
                  >
                    {isAr ? 'عرض كافة التفاصيل' : 'View Full Details'}
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
