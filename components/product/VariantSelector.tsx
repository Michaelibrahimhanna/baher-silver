"use client";

import React from 'react';

interface Variant {
  id: string;
  name: string;
  value: string;
  color?: string; // Optional hex code for color swatches
  isAvailable?: boolean;
}

interface VariantGroup {
  id: string;
  name: string;
  type: 'color' | 'pill';
  variants: Variant[];
}

interface VariantSelectorProps {
  groups: VariantGroup[];
  selectedVariants: Record<string, string>; // group.name -> variant.id
  onSelect: (groupName: string, variantId: string) => void;
}

export default function VariantSelector({ groups, selectedVariants, onSelect }: VariantSelectorProps) {
  if (!groups || groups.length === 0) return null;

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.id} className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium uppercase tracking-wider">{group.name}</h3>
            {/* Optional size guide link could go here */}
          </div>
          
          <div className="flex flex-wrap gap-3">
            {group.type === 'color' ? (
              // Color Swatches
              group.variants.map((variant) => {
                const isSelected = selectedVariants[group.name] === variant.id;
                const isAvailable = variant.isAvailable ?? true;
                
                return (
                  <button
                    key={variant.id}
                    onClick={() => isAvailable && onSelect(group.name, variant.id)}
                    disabled={!isAvailable}
                    aria-label={`Select ${variant.name}`}
                    className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isSelected ? 'ring-1 ring-offset-2 ring-black' : 'hover:ring-1 hover:ring-offset-1 hover:ring-neutral-400'
                    } ${!isAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span
                      className="w-full h-full rounded-full border border-neutral-200"
                      style={{ backgroundColor: variant.color || '#cccccc' }}
                    />
                    {!isAvailable && (
                      <span className="absolute w-full h-[1px] bg-red-500 rotate-45 transform origin-center" />
                    )}
                  </button>
                );
              })
            ) : (
              // Pills
              group.variants.map((variant) => {
                const isSelected = selectedVariants[group.name] === variant.id;
                const isAvailable = variant.isAvailable ?? true;
                
                return (
                  <button
                    key={variant.id}
                    onClick={() => isAvailable && onSelect(group.name, variant.id)}
                    disabled={!isAvailable}
                    className={`px-5 py-2.5 text-sm font-medium border transition-all ${
                      isSelected 
                        ? 'border-black bg-black text-white' 
                        : 'border-neutral-200 bg-white text-neutral-900 hover:border-black'
                    } ${!isAvailable ? 'opacity-50 cursor-not-allowed bg-neutral-50 text-neutral-400 border-neutral-100 hover:border-neutral-100' : ''}`}
                  >
                    {variant.name}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
