"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FiltersProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const filterOptions = [
  { id: "category", label: "Category", options: ["Rings", "Earrings", "Necklaces", "Bracelets"] },
  { id: "material", label: "Material", options: ["Silver", "Gold Plated", "Rose Gold Plated"] },
  { id: "price", label: "Price", options: ["Under $50", "$50 - $100", "$100 - $200", "Over $200"] }
];

interface FilterContentProps {
  selectedFilters: Record<string, string[]>;
  toggleFilter: (category: string, option: string) => void;
}

const FilterContent = ({ selectedFilters, toggleFilter }: FilterContentProps) => (
  <div className="space-y-8">
    {filterOptions.map(section => (
      <div key={section.id}>
        <h4 className="text-sm font-semibold tracking-wider uppercase mb-4 text-gray-900">
          {section.label}
        </h4>
        <ul className="space-y-3">
          {section.options.map(option => {
            const isSelected = (selectedFilters[section.id] || []).includes(option);
            return (
              <li key={option}>
                <button
                  onClick={() => toggleFilter(section.id, option)}
                  className="flex items-center group"
                >
                  <div className={`w-5 h-5 border flex items-center justify-center mr-3 transition-colors ${isSelected ? 'bg-black border-black' : 'border-gray-300 group-hover:border-black'}`}>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-gray-600 group-hover:text-black transition-colors">
                    {option}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    ))}
  </div>
);

export default function Filters({ isMobileOpen, onMobileClose }: FiltersProps) {
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});

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
      <div className="hidden lg:block w-64 shrink-0 sticky top-24 self-start h-[calc(100vh-6rem)] overflow-y-auto pr-6">
        <h3 className="text-xl font-serif mb-8">Filters</h3>
        <FilterContent selectedFilters={selectedFilters} toggleFilter={toggleFilter} />
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
              className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 h-[80vh] bg-white z-50 rounded-t-3xl p-6 overflow-y-auto lg:hidden"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-serif">Filters</h3>
                <button onClick={onMobileClose} className="text-sm underline underline-offset-4">
                  Done
                </button>
              </div>
              <FilterContent selectedFilters={selectedFilters} toggleFilter={toggleFilter} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
