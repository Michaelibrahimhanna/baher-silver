'use client';

import { KPICard, DataCard, Button, Table, Th, Td, EmptyState } from '@/components/admin/ui';
import { Sparkles, Plus, Image as ImageIcon, Tags } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { AIAction } from '@/components/admin/AIAction';

export default function CatalogHome() {
  const supabase = createClient();

  // Fetch real counts
  const { data: stats } = useQuery({
    queryKey: ['catalog_stats'],
    queryFn: async () => {
      const [productsReq, activeReq, draftsReq] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'published').is('deleted_at', null),
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'draft').is('deleted_at', null)
      ]);
      return {
        total: productsReq.count || 0,
        active: activeReq.count || 0,
        drafts: draftsReq.count || 0,
      };
    }
  });

  // Fetch real audit logs
  const { data: auditLogs, isLoading: isLoadingLogs } = useQuery({
    queryKey: ['audit_logs_recent'],
    queryFn: async () => {
      // Assuming audit_logs table exists based on DATABASE.md
      // We will gracefully handle if the table doesn't exist yet or is empty
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) {
        console.error('Audit logs error:', error);
        return [];
      }
      return data || [];
    }
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-4xl font-serif text-white tracking-tight">Catalog Mission Control</h1>
          <p className="text-[#888888] font-light mt-1">Central command for products, taxonomy, and media.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="gap-2"><Tags className="w-4 h-4" /> Manage Taxonomy</Button>
          <Button variant="primary" className="gap-2"><Plus className="w-4 h-4" /> New Product</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Products" value={stats?.total?.toString() || '0'} />
        <KPICard title="Active" value={stats?.active?.toString() || '0'} />
        <KPICard title="Drafts" value={stats?.drafts?.toString() || '0'} />
        <KPICard title="Out of Stock" value="0" /> {/* To be implemented with Inventory */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <DataCard title="Recent Activity">
            {isLoadingLogs ? (
              <div className="p-8 text-center text-[#555555]">Loading activity...</div>
            ) : auditLogs && auditLogs.length > 0 ? (
              <Table>
                <thead>
                  <tr>
                    <Th>Action</Th>
                    <Th>Entity</Th>
                    <Th>Time</Th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log: { id: string; action: string; entity_type: string; created_at: string }) => (
                    <tr key={log.id}>
                      <Td className="text-white">{log.action}</Td>
                      <Td>{log.entity_type}</Td>
                      <Td>{new Date(log.created_at).toLocaleString()}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <EmptyState 
                title="No recent activity"
                description="Your catalog activity will appear here automatically once you start managing products."
              />
            )}
          </DataCard>

          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center gap-4 p-6 bg-[#121212] border border-white/5 rounded-lg hover:bg-white/5 transition-colors group">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white group-hover:scale-110 transition-transform"><ImageIcon className="w-5 h-5" /></div>
              <div className="text-left">
                <h4 className="text-white font-medium">Media Library</h4>
                <p className="text-xs text-[#888888] mt-1">Manage all high-res assets.</p>
              </div>
            </button>
            <button className="flex items-center gap-4 p-6 bg-[#121212] border border-white/5 rounded-lg hover:bg-white/5 transition-colors group">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white group-hover:scale-110 transition-transform"><Tags className="w-5 h-5" /></div>
              <div className="text-left">
                <h4 className="text-white font-medium">Collections</h4>
                <p className="text-xs text-[#888888] mt-1">Curate seasonal campaigns.</p>
              </div>
            </button>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-gradient-to-b from-[#121212] to-[#0A0A0A] border border-white/10 rounded-lg p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full"></div>
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <Sparkles className="w-5 h-5 text-white" />
              <h3 className="text-white font-serif text-lg">AI Recommendations</h3>
            </div>
            <div className="space-y-4 relative z-10">
              <div className="p-4 bg-black/40 rounded border border-white/5">
                <p className="text-sm text-white mb-2">3 products are missing SEO descriptions.</p>
                <AIAction actionName="Generate SEO" context={{ missing: 3 }} className="w-full justify-center">Generate with Baher Brain</AIAction>
              </div>
              <div className="p-4 bg-black/40 rounded border border-white/5">
                <p className="text-sm text-white mb-2">High demand predicted for &quot;Gold Plated Bracelets&quot;.</p>
                <AIAction actionName="Review Inventory" context={{ category: "Gold Plated Bracelets" }} className="w-full justify-center">Review with Baher Brain</AIAction>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
