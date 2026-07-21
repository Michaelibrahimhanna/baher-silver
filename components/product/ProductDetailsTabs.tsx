"use client";

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface TabContent {
  id: string;
  title: string;
  content: React.ReactNode;
}

interface ProductDetailsTabsProps {
  tabs: TabContent[];
}

export default function ProductDetailsTabs({ tabs }: ProductDetailsTabsProps) {
  const [openTabs, setOpenTabs] = useState<Record<string, boolean>>({
    [tabs[0]?.id]: true, // Open the first tab by default
  });

  const toggleTab = (id: string) => {
    setOpenTabs((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (!tabs || tabs.length === 0) return null;

  return (
    <div className="border-t border-neutral-200 mt-12">
      {tabs.map((tab) => {
        const isOpen = openTabs[tab.id];
        return (
          <div key={tab.id} className="border-b border-neutral-200">
            <button
              onClick={() => toggleTab(tab.id)}
              className="w-full py-6 flex justify-between items-center text-left focus:outline-none group"
            >
              <h3 className="text-base font-medium text-neutral-900 group-hover:text-black transition-colors uppercase tracking-wider">
                {tab.title}
              </h3>
              <span className="text-neutral-400 group-hover:text-black transition-colors">
                {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </span>
            </button>
            
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isOpen ? 'max-h-[1000px] opacity-100 pb-6' : 'max-h-0 opacity-0 pb-0'
              }`}
            >
              <div className="text-neutral-600 prose prose-sm max-w-none">
                {tab.content}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
