'use client';

import * as React from 'react';

export function SystemStatusBar() {
  const statuses = [
    { label: 'Database', status: 'operational' },
    { label: 'API', status: 'operational' },
    { label: 'AI', status: 'operational' },
    { label: 'Storage', status: 'operational' },
    { label: 'Email', status: 'operational' },
    { label: 'Queue', status: 'idle' },
    { label: 'QR', status: 'operational' },
    { label: 'Payments', status: 'operational' },
  ];

  return (
    <div className="h-8 border-t border-white/5 bg-[#0A0A0A] flex items-center px-6 overflow-x-auto hide-scrollbar z-30 flex-shrink-0">
      <div className="flex gap-6 items-center w-full max-w-7xl mx-auto">
        <span className="text-[10px] uppercase tracking-widest text-[#555555] font-semibold mr-2">System Status</span>
        {statuses.map(sys => (
          <div key={sys.label} className="flex items-center gap-2 flex-shrink-0">
            <span className={`w-1.5 h-1.5 rounded-full ${sys.status === 'operational' ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 'bg-[#555555]'}`}></span>
            <span className="text-[10px] uppercase tracking-wider text-[#888888]">{sys.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
