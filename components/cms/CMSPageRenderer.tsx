'use client';

import React from 'react';
import { CMSPage } from '@/lib/services/cms';
import { CMSBlockRenderer } from './CMSBlockRenderer';

interface CMSPageRendererProps {
  page: CMSPage;
  locale?: string;
}

export function CMSPageRenderer({ page, locale = 'en' }: CMSPageRendererProps) {
  const sortedBlocks = [...page.blocks].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      {sortedBlocks.map((block) => (
        <CMSBlockRenderer key={block.id} block={block} locale={locale} />
      ))}
    </div>
  );
}
