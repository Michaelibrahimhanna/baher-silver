'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { revealVariants } from '@/lib/motion';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: 0.1 },
        },
      }}
      className="flex flex-col items-center justify-center p-12 lg:p-24 text-center border border-border/50 bg-card/30 backdrop-blur-md rounded-none"
    >
      <motion.h3 
        variants={revealVariants}
        className="text-2xl font-serif text-primary mb-4"
      >
        {title}
      </motion.h3>
      <motion.p 
        variants={revealVariants}
        className="text-muted-foreground max-w-sm font-sans text-sm leading-relaxed mb-8"
      >
        {description}
      </motion.p>
      
      {actionLabel && onAction && (
        <motion.div variants={revealVariants}>
          <Button variant="outline" onClick={onAction} className="relative group overflow-hidden">
            <span className="relative z-10">{actionLabel}</span>
            <div className="absolute inset-0 bg-primary/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out" />
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
