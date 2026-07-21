"use client";

import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const sortOptions = [
  { id: "featured", label: "Featured" },
  { id: "newest", label: "Newest Arrivals" },
  { id: "price-asc", label: "Price: Low to High" },
  { id: "price-desc", label: "Price: High to Low" }
];

export default function Sorting() {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(sortOptions[0]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-full text-sm font-medium hover:border-gray-400 transition-colors"
      >
        <span>Sort by: {selected.label}</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-100 shadow-xl rounded-xl z-30 py-2"
          >
            {sortOptions.map(option => (
              <button
                key={option.id}
                onClick={() => {
                  setSelected(option);
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between"
              >
                <span className={selected.id === option.id ? "font-medium text-black" : "text-gray-600"}>
                  {option.label}
                </span>
                {selected.id === option.id && <Check className="w-4 h-4 text-black" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
