'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Sparkles } from 'lucide-react';

export function CommandSearch({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = React.useState('');
  
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isBrainQuery = query.startsWith('/');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
          onClick={onClose} 
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-2xl bg-[#121212] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
        >
          <div className="flex items-center border-b border-white/10 px-4 transition-colors duration-300" style={{ backgroundColor: isBrainQuery ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
            {isBrainQuery ? <Sparkles className="w-5 h-5 text-white" /> : <Search className="w-5 h-5 text-[#888888]" />}
            <input 
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ERP or type / for Baher Brain..."
              className="flex-1 bg-transparent border-none outline-none px-4 py-5 text-white placeholder-[#555555] text-lg"
            />
            <button onClick={onClose} className="text-[#888888] hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 py-8 text-[#555555]">
            {isBrainQuery ? (
              <div className="flex flex-col items-center justify-center gap-2">
                <Sparkles className="w-8 h-8 text-white/50" />
                <p>Baher Brain is listening...</p>
                <p className="text-xs">Press Enter to execute AI command.</p>
              </div>
            ) : (
              <div className="text-center">
                Type to search across products, orders, and settings.
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
