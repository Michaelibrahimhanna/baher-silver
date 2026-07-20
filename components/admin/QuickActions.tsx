'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Plus, Package, Users, Settings } from 'lucide-react';

export function QuickActions() {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle on Ctrl+Space or Cmd+Space
      if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
          onClick={() => setIsOpen(false)} 
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg bg-[#121212] border border-white/10 rounded-xl shadow-2xl overflow-hidden p-2"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white group">
              <Plus className="w-6 h-6 text-[#888888] group-hover:text-white transition-colors" />
              <span className="text-xs font-medium">New Product</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white group">
              <Package className="w-6 h-6 text-[#888888] group-hover:text-white transition-colors" />
              <span className="text-xs font-medium">Create Order</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white group">
              <Users className="w-6 h-6 text-[#888888] group-hover:text-white transition-colors" />
              <span className="text-xs font-medium">Add Customer</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white group">
              <Search className="w-6 h-6 text-[#888888] group-hover:text-white transition-colors" />
              <span className="text-xs font-medium">Search DB</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white group">
              <Settings className="w-6 h-6 text-[#888888] group-hover:text-white transition-colors" />
              <span className="text-xs font-medium">System Settings</span>
            </button>
          </div>
          <div className="mt-2 text-center text-[10px] text-[#555555] uppercase tracking-widest pt-2 border-t border-white/5">
            Press Esc to close
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
