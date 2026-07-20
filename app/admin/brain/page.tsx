export const metadata = {
  title: 'Baher OS | Brain Workspace',
};

import { Sparkles, Send } from 'lucide-react';

export default function BrainWorkspace() {
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-700">
      <div className="mb-6">
        <h1 className="text-4xl font-serif text-white tracking-tight flex items-center gap-3">
          <Sparkles className="w-8 h-8" />
          Baher Brain Workspace
        </h1>
        <p className="text-[#888888] font-light mt-1">Full-screen AI intelligence and ERP automation interface.</p>
      </div>

      <div className="flex-1 bg-[#121212] border border-white/5 rounded-lg flex flex-col overflow-hidden relative">
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-2xl mx-auto text-center mt-20 opacity-50">
            <Sparkles className="w-16 h-16 mx-auto mb-6" />
            <h2 className="text-2xl font-serif text-white mb-2">How can I assist you today?</h2>
            <p className="text-[#888888]">I have full access to products, orders, inventory, and analytics.</p>
          </div>
        </div>
        
        <div className="p-6 bg-[#0A0A0A] border-t border-white/5">
          <div className="max-w-4xl mx-auto relative">
            <input 
              type="text" 
              placeholder="Ask for reports, generate descriptions, or manage inventory..." 
              className="w-full bg-[#121212] border border-white/10 rounded-xl px-6 py-4 pr-14 text-white placeholder-[#555555] outline-none focus:border-white/30 transition-colors shadow-2xl"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-white text-black rounded-lg hover:scale-105 transition-transform">
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
