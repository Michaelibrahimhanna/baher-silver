export const metadata = {
  title: 'Baher OS | UX Kit',
};

import { DataCard, Table, Td, Badge, Button, Toast } from '@/components/admin/ui';
import { Info } from 'lucide-react';

export default function UXKit() {
  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20">
      <div>
        <h1 className="text-4xl font-serif text-white tracking-tight">Baher UX Kit</h1>
        <p className="text-[#888888] font-light mt-1">Behavioral standards and interaction guidelines for the Baher ERP.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Core Formatting */}
        <section className="space-y-4">
          <h2 className="text-xl font-serif text-white border-b border-white/5 pb-2">Formatting Standards</h2>
          <DataCard title="Data Formats">
            <Table>
              <tbody>
                <tr><Td>Currency</Td><Td className="text-white font-mono">$1,250.00</Td><Td className="text-xs">Always USD, comma sep, 2 decimals.</Td></tr>
                <tr><Td>Weight</Td><Td className="text-white font-mono">14.5g</Td><Td className="text-xs">Grams, 1 decimal max.</Td></tr>
                <tr><Td>Date</Td><Td className="text-white font-mono">Oct 12, 2026</Td><Td className="text-xs">MMM DD, YYYY</Td></tr>
                <tr><Td>Time</Td><Td className="text-white font-mono">14:30 AST</Td><Td className="text-xs">24h format, include timezone</Td></tr>
              </tbody>
            </Table>
          </DataCard>
        </section>

        {/* Interaction Rules */}
        <section className="space-y-4">
          <h2 className="text-xl font-serif text-white border-b border-white/5 pb-2">Interaction Rules</h2>
          <DataCard title="Keyboard & AI">
            <ul className="text-sm text-[#888888] p-4 space-y-3">
              <li><strong className="text-white">Ctrl/Cmd + Space</strong>: Opens Global Quick Actions anywhere.</li>
              <li><strong className="text-white">Cmd + K</strong>: Opens Global Command Search.</li>
              <li><strong className="text-white">Forward Slash (/)</strong>: In search, instantly activates Baher Brain AI context.</li>
              <li><strong className="text-white">Mobile</strong>: Dashboards become read-only views optimized for quick approvals.</li>
            </ul>
          </DataCard>
        </section>

        {/* Form Guidelines */}
        <section className="space-y-4">
          <h2 className="text-xl font-serif text-white border-b border-white/5 pb-2">Forms & Data Entry</h2>
          <div className="bg-[#121212] border border-white/5 p-6 rounded-lg space-y-6 text-sm text-[#888888]">
            <p><strong>Validation:</strong> No aggressive red text. Use subtle warning icons and focus states. Validate on blur, not on keystroke.</p>
            <p><strong>Submitting:</strong> Buttons must show loading states and disable double-clicks.</p>
            <p><strong>Success States:</strong> Use minimal Toast notifications. Slide in from bottom right.</p>
            <div className="flex gap-4">
              <Button disabled className="opacity-50 cursor-not-allowed">Saving...</Button>
              <Toast title="Item Saved" description="Variant details updated." />
            </div>
          </div>
        </section>

        {/* Status System */}
        <section className="space-y-4">
          <h2 className="text-xl font-serif text-white border-b border-white/5 pb-2">Status System</h2>
          <div className="bg-[#121212] border border-white/5 p-6 rounded-lg space-y-4">
            <div className="flex items-center gap-4 border-b border-white/5 pb-4">
              <Badge variant="success">Published</Badge>
              <span className="text-sm text-[#888888]">Safe, live, active, or completed actions.</span>
            </div>
            <div className="flex items-center gap-4 border-b border-white/5 pb-4">
              <Badge variant="warning">Draft</Badge>
              <span className="text-sm text-[#888888]">Pending, hidden, or requires attention.</span>
            </div>
            <div className="flex items-center gap-4">
              <Badge>Archived</Badge>
              <span className="text-sm text-[#888888]">Historical, deleted, or inactive items.</span>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
