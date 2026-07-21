'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { revealVariants, staggerContainer } from '@/lib/motion';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 relative overflow-hidden">
      
      {/* Subtle luxury glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <motion.div 
        className="max-w-md text-center relative z-10"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <motion.div 
          className="text-9xl font-serif text-transparent bg-clip-text bg-gradient-to-b from-primary via-primary/50 to-transparent mb-8 drop-shadow-2xl tracking-tighter"
          variants={revealVariants}
        >
          404
        </motion.div>
        <motion.h2 
          className="text-2xl font-serif text-foreground mb-4 tracking-widest uppercase"
          variants={revealVariants}
        >
          Not Found
        </motion.h2>
        <motion.p 
          className="text-muted-foreground font-sans text-sm leading-relaxed mb-12 text-balance"
          variants={revealVariants}
        >
          The page you are looking for has been removed, relocated, or never existed in our collection.
        </motion.p>
        <motion.div variants={revealVariants}>
          <Button asChild variant="primary" className="px-8 tracking-widest text-xs">
            <Link href="/">RETURN TO COLLECTION</Link>
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
