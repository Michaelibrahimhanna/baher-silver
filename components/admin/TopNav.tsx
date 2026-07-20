'use client';

import * as React from 'react';
import { Menu, Search, Bell, Sparkles } from 'lucide-react';
import { CommandSearch } from './CommandSearch';
import { NotificationCenter } from './NotificationCenter';

export function TopNav({ toggleSidebar, toggleBrain }: { toggleSidebar: () => void, toggleBrain: () => void }) {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-[#0A0A0A]/80 backdrop-blur-md z-30 flex-shrink-0 relative">
      <div className="flex items-center gap-4">
        <button onClick={toggleSidebar} className="text-[#888888] hover:text-white transition-colors lg:hidden">
          <Menu className="w-5 h-5" />
        </button>
        <button 
          onClick={() => setSearchOpen(true)}
          className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#121212] border border-white/5 rounded-md text-sm text-[#888888] hover:text-white hover:border-white/20 transition-all w-64"
        >
          <Search className="w-4 h-4" />
          <span>Search...</span>
          <span className="ml-auto text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-white/50">⌘K</span>
        </button>
      </div>
      
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setNotificationsOpen(!notificationsOpen)}
          className="relative text-[#888888] hover:text-white transition-colors"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full"></span>
        </button>
        <button 
          onClick={toggleBrain}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all group"
        >
          <Sparkles className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
          <span className="text-xs font-medium tracking-wide">Baher Brain</span>
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-700 to-gray-400 border border-white/10 ml-2"></div>
      </div>

      {searchOpen && <CommandSearch onClose={() => setSearchOpen(false)} />}
      {notificationsOpen && <NotificationCenter onClose={() => setNotificationsOpen(false)} />}
    </header>
  );
}
