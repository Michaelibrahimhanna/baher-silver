'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { revealVariants, staggerContainer } from '@/lib/motion';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <motion.div 
        className="max-w-md text-center"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <motion.h1 
          className="text-8xl font-serif text-primary mb-6 drop-shadow-2xl opacity-50"
          variants={revealVariants}
        >
          500
        </motion.h1>
        <motion.h2 
          className="text-2xl font-serif text-foreground mb-4 tracking-wide"
          variants={revealVariants}
        >
          System Interruption
        </motion.h2>
        <motion.p 
          className="text-muted-foreground font-sans text-sm leading-relaxed mb-10 text-balance"
          variants={revealVariants}
        >
          An unexpected interruption occurred within the Baher Silver platform. Our artisans have been notified.
        </motion.p>
        <motion.div variants={revealVariants}>
          <Button onClick={() => reset()} variant="primary" className="px-8 tracking-widest text-xs">
            RESTORE
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
