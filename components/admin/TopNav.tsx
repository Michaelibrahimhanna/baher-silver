'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Menu, Search, Bell, Sparkles, LogOut, Shield, User } from 'lucide-react';
import { CommandSearch } from './CommandSearch';
import { NotificationCenter } from './NotificationCenter';

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationId: string;
}

export function TopNav({ toggleSidebar, toggleBrain }: { toggleSidebar: () => void, toggleBrain: () => void }) {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';

  const [searchOpen, setSearchOpen] = React.useState(false);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<CurrentUser | null>(null);

  React.useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && data?.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.href = `/${locale}/login`;
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'Owner':
      case 'Admin':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'StoreManager':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Cashier':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Viewer':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-white/10 text-white/80 border-white/10';
    }
  };

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

        {/* Dynamic Authenticated User Identity */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2.5 pl-2 py-1 hover:opacity-90 transition-all"
          >
            <div className="flex flex-col text-right rtl:text-left hidden md:flex">
              <span className="text-xs font-medium text-white tracking-wide">
                {currentUser ? currentUser.name : 'Loading...'}
              </span>
              <span className="text-[10px] text-white/40 font-mono">
                {currentUser ? currentUser.email : 'authenticated'}
              </span>
            </div>

            {currentUser && (
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${getRoleBadgeStyle(currentUser.role)}`}>
                {currentUser.role}
              </span>
            )}

            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white text-xs font-medium">
              {currentUser ? currentUser.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
            </div>
          </button>

          {/* User Profile / Logout Dropdown */}
          {userMenuOpen && (
            <div className="absolute right-0 rtl:left-0 rtl:right-auto mt-2 w-56 bg-[#121212] border border-white/10 rounded-xl shadow-2xl p-2 z-50">
              <div className="px-3 py-2 border-b border-white/5 mb-1">
                <p className="text-xs font-medium text-white truncate">{currentUser?.name}</p>
                <p className="text-[10px] text-white/40 truncate font-mono">{currentUser?.email}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-white/50" />
                  <span className="text-[10px] text-white/60 font-mono">{currentUser?.organizationId}</span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-left rtl:text-right"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>تسجيل الخروج (Sign Out)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {searchOpen && <CommandSearch onClose={() => setSearchOpen(false)} />}
      {notificationsOpen && <NotificationCenter onClose={() => setNotificationsOpen(false)} />}
    </header>
  );
}
