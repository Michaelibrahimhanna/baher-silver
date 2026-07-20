'use client';

import * as React from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/admin/ui';

interface AIActionProps {
  actionName: string;
  context?: Record<string, unknown>;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  children?: React.ReactNode;
}

export function AIAction({ actionName, context, className, variant = 'secondary', size = 'sm', children }: AIActionProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(
      new CustomEvent('open-baher-brain', {
        detail: { actionName, context },
      })
    );
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={`gap-1.5 ${className || ''}`}
      onClick={handleClick}
      title="Generate with Baher Brain"
    >
      <Sparkles className="w-3.5 h-3.5" />
      {children}
    </Button>
  );
}
