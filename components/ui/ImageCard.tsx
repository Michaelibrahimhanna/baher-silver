'use client';

import * as React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

export function ImageCard({
  src,
  alt,
  className = '',
  aspectRatio = 'square',
}: {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: 'square' | 'portrait' | 'landscape';
}) {
  const aspectClasses = {
    square: 'aspect-square',
    portrait: 'aspect-[3/4]',
    landscape: 'aspect-video',
  };

  return (
    <div className={`relative overflow-hidden group ${aspectClasses[aspectRatio]} ${className}`}>
      <motion.div
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full h-full relative"
      >
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </motion.div>
    </div>
  );
}
