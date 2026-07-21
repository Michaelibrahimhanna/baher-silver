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

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
        {products.map((product) => (
          <div key={product.id} className="group flex flex-col">
            <div className="relative aspect-[4/5] bg-gray-100 overflow-hidden rounded-xl mb-4">
              <Link href={`/${locale}/product/${product.slug}`}>
                <Image
                  src={product.image}
                  alt={product.name[locale as 'en'|'ar'] || product.name.en}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </Link>
              
              {/* Quick View Button Overlay */}
              <div className="absolute bottom-4 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setQuickViewProduct(product);
                  }}
                  className="bg-white/90 backdrop-blur text-black px-6 py-2 rounded-full font-medium text-sm flex items-center gap-2 hover:bg-white transition-colors shadow-lg"
                >
                  <Eye className="w-4 h-4" />
                  Quick View
                </button>
              </div>
            </div>
            <Link href={`/${locale}/product/${product.slug}`} className="flex-1">
              <h3 className="font-medium text-gray-900 group-hover:underline underline-offset-4 decoration-1">
                {product.name[locale as 'en'|'ar'] || product.name.en}
              </h3>
            </Link>
            <p className="text-gray-500 mt-1">${product.price}</p>
          </div>
        ))}
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
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 z-10"
            >
              <button
                onClick={() => setQuickViewProduct(null)}
                className="absolute top-4 right-4 z-20 p-2 bg-white/50 hover:bg-white rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Image Side */}
              <div className="relative aspect-square md:aspect-auto md:h-full bg-gray-50">
                <Image
                  src={quickViewProduct.image}
                  alt={quickViewProduct.name[locale as 'en'|'ar'] || quickViewProduct.name.en}
                  fill
                  className="object-cover"
                />
              </div>

              {/* Details Side */}
              <div className="p-8 md:p-12 flex flex-col justify-center">
                <h2 className="text-3xl font-serif mb-2">
                  {quickViewProduct.name[locale as 'en'|'ar'] || quickViewProduct.name.en}
                </h2>
                <p className="text-xl text-gray-500 mb-6">${quickViewProduct.price}</p>
                
                {quickViewProduct.details?.description && (
                  <p className="text-gray-600 leading-relaxed mb-8">
                    {quickViewProduct.details.description[locale as 'en'|'ar'] || quickViewProduct.details.description.en}
                  </p>
                )}

                <div className="space-y-4">
                  <button
                    onClick={() => {
                      addToCart(quickViewProduct);
                      setQuickViewProduct(null);
                    }}
                    className="w-full bg-black text-white py-4 rounded-full font-medium hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-5 h-5" />
                    Add to Cart
                  </button>
                  <Link
                    href={`/${locale}/product/${quickViewProduct.slug}`}
                    className="w-full block text-center py-4 rounded-full font-medium border border-gray-200 hover:border-black transition-colors"
                  >
                    View Full Details
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
