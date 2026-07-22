"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, TrendingUp, Clock } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { searchProducts, products } from "@/lib/products";
import { usePathname } from "next/navigation";

interface PredictiveSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PredictiveSearch({ isOpen, onClose }: PredictiveSearchProps) {
  const [query, setQuery] = useState("");
  const pathname = usePathname();
  const locale = pathname.startsWith('/ar') ? 'ar' : 'en';
  const isAr = locale === 'ar';

  const mockRecentSearches = isAr 
    ? ["خاتم فضة", "قلادة سلسلة", "أقراط قطرة"] 
    : ["Silver Ring", "Chain Necklace", "Drop Earrings"];

  const mockTrendingSearches = isAr 
    ? ["سوار زركون", "خواتم خطوبة", "فضة 925"] 
    : ["Zircon Bracelet", "Engagement Rings", "925 Silver"];

  const searchResults = query.trim().length > 0 
    ? searchProducts(query) 
    : products.slice(0, 4);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-50 flex flex-col bg-[#050505]/95 backdrop-blur-2xl text-foreground"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-6 border-b border-white/10">
            <div className="flex items-center flex-1 max-w-4xl mx-auto gap-4">
              <Search className="w-6 h-6 text-primary/70 shrink-0" />
              <input
                type="text"
                placeholder={isAr ? "ابحث عن مجوهرات، خواتم، قلائد..." : "Search for jewelry, collections..."}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 text-xl md:text-2xl font-light bg-transparent text-foreground outline-none placeholder:text-muted-foreground focus:ring-0 border-none"
                autoFocus
              />
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-white/5 rounded-full transition-colors shrink-0"
                aria-label="Close search"
              >
                <X className="w-6 h-6 text-muted-foreground hover:text-white transition-colors" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-12">
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12">
              
              {/* Left Column: Recent & Trending */}
              <div className="md:col-span-4 space-y-8">
                {query.length === 0 && (
                  <>
                    <div className="space-y-4">
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {isAr ? "الأكثر بحثاً مؤخراً" : "Recent Searches"}
                      </h3>
                      <ul className="space-y-3">
                        {mockRecentSearches.map((term, idx) => (
                          <li key={idx}>
                            <button
                              onClick={() => setQuery(term)}
                              className="text-base text-foreground/80 hover:text-primary transition-colors font-serif"
                            >
                              {term}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        {isAr ? "شائع الآن" : "Trending Now"}
                      </h3>
                      <ul className="space-y-3">
                        {mockTrendingSearches.map((term, idx) => (
                          <li key={idx}>
                            <button
                              onClick={() => setQuery(term)}
                              className="text-base text-foreground/80 hover:text-primary transition-colors font-serif"
                            >
                              {term}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </div>

              {/* Right Column: Suggested Products */}
              <div className="md:col-span-8 space-y-6">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {query.length > 0 
                    ? (isAr ? `نتائج البحث (${searchResults.length})` : `Search Results (${searchResults.length})`)
                    : (isAr ? "منتجات مقترحة" : "Suggested Products")}
                </h3>
                {searchResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8">
                    {isAr ? "لم يتم العثور على منتجات تطابق بحثك." : "No products found matching your search."}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {searchResults.map((product) => {
                      const name = product.name[locale as 'en'|'ar'] || product.name.en;
                      return (
                        <Link
                          key={product.id}
                          href={`/${locale}/product/${product.slug}`}
                          onClick={onClose}
                          className="group flex gap-4 items-center hover:bg-white/5 p-3 rounded-sm transition-colors border border-transparent hover:border-white/10"
                        >
                          <div className="relative w-16 h-16 bg-secondary/10 rounded-sm overflow-hidden shrink-0">
                            <Image
                              src={product.image}
                              alt={name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                              sizes="64px"
                            />
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                              {name}
                            </h4>
                            <p className="text-xs text-primary font-semibold mt-1 tracking-widest">${product.price}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
