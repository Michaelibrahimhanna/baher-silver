"use client";

import React, { useState } from 'react';
import Image from 'next/image';

interface ProductGalleryProps {
  images: { url: string; alt: string }[];
}

export default function ProductGallery({ images }: ProductGalleryProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="aspect-[3/4] bg-neutral-100 flex items-center justify-center">
        <span className="text-neutral-400">No image available</span>
      </div>
    );
  }

  const activeImage = images[activeImageIndex];

  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Thumbnails */}
      <div className="hidden md:flex flex-col gap-4 w-20 flex-shrink-0">
        {images.map((image, idx) => (
          <button
            key={idx}
            onClick={() => setActiveImageIndex(idx)}
            className={`relative aspect-[3/4] overflow-hidden bg-neutral-100 ${
              idx === activeImageIndex ? 'ring-2 ring-black' : 'ring-1 ring-transparent hover:ring-neutral-300'
            }`}
          >
            <Image
              src={image.url}
              alt={image.alt || `Thumbnail ${idx + 1}`}
              fill
              className="object-cover"
            />
          </button>
        ))}
      </div>

      {/* Main Image */}
      <div className="relative flex-grow aspect-[3/4] bg-neutral-100 overflow-hidden cursor-zoom-in group">
        <Image
          src={activeImage.url}
          alt={activeImage.alt || 'Product Image'}
          fill
          priority
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      {/* Mobile Thumbnails */}
      <div className="flex md:hidden gap-4 overflow-x-auto snap-x snap-mandatory hide-scrollbar">
         {images.map((image, idx) => (
          <button
            key={idx}
            onClick={() => setActiveImageIndex(idx)}
            className={`relative flex-shrink-0 w-20 aspect-[3/4] snap-start overflow-hidden bg-neutral-100 ${
              idx === activeImageIndex ? 'ring-2 ring-black' : 'ring-1 ring-neutral-200'
            }`}
          >
            <Image
              src={image.url}
              alt={image.alt || `Thumbnail ${idx + 1}`}
              fill
              className="object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
