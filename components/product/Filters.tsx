"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

interface FiltersProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface FilterSection {
  id: string;
  label: string;
  options: string[];
}

function FilterList({
  sections,
  selectedFilters,
  onToggleFilter,
}: {
  sections: FilterSection[];
  selectedFilters: Record<string, string[]>;
  onToggleFilter: (category: string, option: string) => void;
}) {
  return (
    <div className="space-y-8">
      {sections.map(section => (
        <div key={section.id} className="space-y-3">
          <h4 className="text-xs font-semibold tracking-[0.2em] uppercase text-primary border-b border-white/10 pb-2">
            {section.label}
          </h4>
          <ul className="space-y-2.5 pt-1">
            {section.options.map(option => {
              const isSelected = (selectedFilters[section.id] || []).includes(option);
              return (
                <li key={option}>
                  <button
                    onClick={() => onToggleFilter(section.id, option)}
                    className="flex items-center group text-xs text-muted-foreground hover:text-white transition-colors"
                  >
                    <div className={`w-4 h-4 border flex items-center justify-center me-3 rounded-xs transition-colors ${isSelected ? 'bg-primary border-primary text-black' : 'border-white/20 group-hover:border-primary'}`}>
                      {isSelected && <Check className="w-3 h-3 text-black stroke-[3]" />}
                    </div>
                    <span>{option}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function Filters({ isMobileOpen, onMobileClose }: FiltersProps) {
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const pathname = usePathname();
  const isAr = pathname.startsWith('/ar');

  const filterOptions: FilterSection[] = isAr ? [
    { id: "category", label: "الفئة", options: ["خواتم", "أقراط", "قلائد", "أساور"] },
    { id: "material", label: "المادة المصنعة", options: ["فضة 925", "مطلي بالذهب", "مطلي بالذهب الوردي"] },
    { id: "price", label: "النطاق السعري", options: ["أقل من 50$", "50$ - 100$", "100$ - 200$", "أكثر من 200$"] }
  ] : [
    { id: "category", label: "Category", options: ["Rings", "Earrings", "Necklaces", "Bracelets"] },
    { id: "material", label: "Material", options: ["925 Silver", "Gold Plated", "Rose Gold Plated"] },
    { id: "price", label: "Price Range", options: ["Under $50", "$50 - $100", "$100 - $200", "Over $200"] }
  ];

  const toggleFilter = (category: string, option: string) => {
    setSelectedFilters(prev => {
      const current = prev[category] || [];
      const updated = current.includes(option)
        ? current.filter(o => o !== option)
        : [...current, option];
      return { ...prev, [category]: updated };
    });
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-64 shrink-0 sticky top-28 self-start max-h-[calc(100vh-8rem)] overflow-y-auto pe-6 border-e border-white/5">
        <h3 className="text-xl font-serif text-primary mb-8 tracking-wide">
          {isAr ? 'تصفية المنتجات' : 'Filter Products'}
        </h3>
        <FilterList sections={filterOptions} selectedFilters={selectedFilters} onToggleFilter={toggleFilter} />
      </div>

      {/* Mobile Bottom Sheet */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 lg:hidden"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 max-h-[85vh] bg-[#0a0a0a] border-t border-white/10 z-50 rounded-t-2xl p-6 overflow-y-auto lg:hidden text-foreground"
            >
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
                <h3 className="text-xl font-serif text-primary">
                  {isAr ? 'تصفية المنتجات' : 'Filter Products'}
                </h3>
                <button onClick={onMobileClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-muted-foreground hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <FilterList sections={filterOptions} selectedFilters={selectedFilters} onToggleFilter={toggleFilter} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
