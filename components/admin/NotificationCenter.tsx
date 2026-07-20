'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PackageOpen, AlertCircle } from 'lucide-react';

export function NotificationCenter({ onClose }: { onClose: () => void }) {
  return (
    <AnimatePresence>
      <div className="absolute top-16 right-6 w-80 bg-[#121212] border border-white/10 rounded-lg shadow-2xl overflow-hidden z-50">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h3 className="text-white font-medium">Notifications</h3>
            <button onClick={onClose} className="text-[#888888] hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <div className="p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer flex gap-3">
              <div className="mt-1 flex-shrink-0 text-green-400"><PackageOpen className="w-4 h-4" /></div>
              <div>
                <p className="text-sm text-white">New Order #8921</p>
                <p className="text-xs text-[#888888] mt-1">Samer requested a 925 Silver Ring.</p>
              </div>
            </div>
            <div className="p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer flex gap-3">
              <div className="mt-1 flex-shrink-0 text-red-400"><AlertCircle className="w-4 h-4" /></div>
              <div>
                <p className="text-sm text-white">Low Inventory</p>
                <p className="text-xs text-[#888888] mt-1">Elegance Necklace is running out of stock (2 left).</p>
              </div>
            </div>
          </div>
          <div className="p-3 text-center border-t border-white/10">
            <button className="text-xs text-[#888888] hover:text-white transition-colors">Mark all as read</button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
