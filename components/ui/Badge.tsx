import * as React from 'react';

export function Badge({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-none text-xs font-medium uppercase tracking-wider bg-brand-black text-brand-white ${className}`}>
      {children}
    </span>
  );
}
