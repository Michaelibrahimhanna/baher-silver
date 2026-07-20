'use client';

import * as React from 'react';
import { Sidebar } from '@/components/admin/Sidebar';
import { TopNav } from '@/components/admin/TopNav';
import { BaherBrainPanel } from '@/components/admin/BaherBrainPanel';
import { SystemStatusBar } from '@/components/admin/SystemStatusBar';
import { QuickActions } from '@/components/admin/QuickActions';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isBrainOpen, setIsBrainOpen] = React.useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0A0A0A] text-[#F5F5F5] font-sans selection:bg-white/20">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
        <TopNav 
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          toggleBrain={() => setIsBrainOpen(!isBrainOpen)} 
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 lg:p-10 relative">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
        <SystemStatusBar />
        <BaherBrainPanel isOpen={isBrainOpen} onClose={() => setIsBrainOpen(false)} />
        <QuickActions />
      </div>
    </div>
  );
}
