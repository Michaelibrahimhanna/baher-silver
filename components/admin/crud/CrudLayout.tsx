'use client';

import * as React from 'react';


interface CrudLayoutProps {
  title: string;
  description?: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

export function CrudLayout({ title, description, headerActions, children }: CrudLayoutProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif text-white mb-1">{title}</h1>
          {description && <p className="text-sm text-[#888888]">{description}</p>}
        </div>
        {headerActions && (
          <div className="flex items-center gap-3">
            {headerActions}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
