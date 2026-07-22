"use client";

import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function Sorting() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const isAr = pathname.startsWith('/ar');

  const sortOptions = isAr ? [
    { id: "featured", label: "المميز" },
    { id: "newest", label: "أحدث المنتجات" },
    { id: "price-asc", label: "السعر: من الأقل للأعلى" },
    { id: "price-desc", label: "السعر: من الأعلى للأقل" }
  ] : [
    { id: "featured", label: "Featured" },
    { id: "newest", label: "Newest Arrivals" },
    { id: "price-asc", label: "Price: Low to High" },
    { id: "price-desc", label: "Price: High to Low" }
  ];

  const currentSortId = searchParams.get('sort') || 'featured';
  const selected = sortOptions.find(o => o.id === currentSortId) || sortOptions[0];

  const handleSelectOption = (optionId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (optionId === 'featured') {
      params.delete('sort');
    } else {
      params.set('sort', optionId);
    }
    router.push(`${pathname}?${params.toString()}`);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 border border-white/10 bg-secondary/10 rounded-full text-xs uppercase tracking-wider font-medium text-foreground hover:border-primary/50 transition-colors"
      >
        <span>{isAr ? 'ترتيب حسب:' : 'Sort by:'} <strong className="text-primary">{selected.label}</strong></span>
        <ChevronDown className="w-4 h-4 text-primary" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute right-0 rtl:right-auto rtl:left-0 top-full mt-2 w-60 bg-[#0a0a0a] border border-white/10 shadow-2xl rounded-sm z-30 py-2"
          >
            {sortOptions.map(option => (
              <button
                key={option.id}
                onClick={() => handleSelectOption(option.id)}
                className="w-full text-left rtl:text-right px-4 py-2.5 text-xs hover:bg-white/5 flex items-center justify-between transition-colors"
              >
                <span className={selected.id === option.id ? "font-bold text-primary" : "text-muted-foreground"}>
                  {option.label}
                </span>
                {selected.id === option.id && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
