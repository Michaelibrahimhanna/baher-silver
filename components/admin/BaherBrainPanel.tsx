'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Send } from 'lucide-react';

export function BaherBrainPanel({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [aiContext, setAiContext] = React.useState<{ actionName: string; context: Record<string, unknown> } | null>(null);

  React.useEffect(() => {
    const handleOpenBrain = (e: CustomEvent) => {
      setAiContext(e.detail);
      // We can't change isOpen from here, we need the layout to know.
      // So we'll dispatch another event to toggle it, or layout listens to it too.
    };
    window.addEventListener('open-baher-brain', handleOpenBrain as EventListener);
    return () => window.removeEventListener('open-baher-brain', handleOpenBrain as EventListener);
  }, []);
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />
          <motion.div 
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.5 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="fixed lg:absolute top-0 right-0 h-full w-full max-w-sm bg-[#121212] border-l border-white/5 shadow-2xl z-50 flex flex-col"
          >
            <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 flex-shrink-0 bg-[#0A0A0A]/50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-white" />
                <span className="font-serif tracking-wide text-white">Baher Brain</span>
              </div>
              <button onClick={onClose} className="text-[#888888] hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="text-center py-10 opacity-50">
                <Sparkles className="w-12 h-12 mx-auto mb-4" />
                <p className="text-sm font-light">I am Baher Brain, your ERP intelligence.</p>
                <p className="text-xs mt-2">Ask me to generate reports, analyze sales, or draft product descriptions.</p>
              </div>

              {aiContext && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-sm">
                  <div className="text-blue-400 font-medium mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Feature coming soon
                  </div>
                  <p className="text-green-400 mb-2">✓ Context received successfully</p>
                  <p className="text-white/70">
                    <span className="font-semibold text-white">Action:</span> {aiContext.actionName}
                  </p>
                  <div className="mt-4 max-h-48 overflow-y-auto bg-black/40 p-2 rounded text-xs text-[#888888]">
                    <pre>{JSON.stringify(aiContext.context, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/5 bg-[#0A0A0A]">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Ask Baher Brain..." 
                  className="w-full bg-white/5 border border-white/10 rounded-full px-4 py-3 pr-12 text-sm text-white placeholder-[#555555] outline-none focus:border-white/30 transition-colors"
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white text-black rounded-full hover:scale-105 transition-transform">
                  <Send className="w-3 h-3 ml-0.5" />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
