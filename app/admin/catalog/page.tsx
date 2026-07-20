import { KPICard, DataCard, Button, Table, Th, Td, Badge } from '@/components/admin/ui';
import { Sparkles, Plus, Image as ImageIcon, Tags } from 'lucide-react';

export const metadata = {
  title: 'Catalog Home | Baher OS',
};

export default function CatalogHome() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-serif text-white tracking-tight">Catalog Mission Control</h1>
          <p className="text-[#888888] font-light mt-1">Central command for products, taxonomy, and media.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="gap-2"><Tags className="w-4 h-4" /> Manage Taxonomy</Button>
          <Button variant="primary" className="gap-2"><Plus className="w-4 h-4" /> New Product</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard title="Total Products" value="2,451" />
        <KPICard title="Active" value="1,842" trend="+12 this week" />
        <KPICard title="Drafts" value="512" />
        <KPICard title="Out of Stock" value="97" trend="Requires attention" />
        <KPICard title="Recently Updated" value="34" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <DataCard title="Recent Activity">
            <Table>
              <thead>
                <tr>
                  <Th>Product</Th>
                  <Th>Action</Th>
                  <Th>User</Th>
                  <Th>Time</Th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <Td className="text-white">Elegance Diamond Ring</Td>
                  <Td>Price updated to $2,500</Td>
                  <Td>Sarah M.</Td>
                  <Td>10 mins ago</Td>
                </tr>
                <tr>
                  <Td className="text-white">Silver Chain 925</Td>
                  <Td>Stock adjusted (+50)</Td>
                  <Td>Warehouse API</Td>
                  <Td>1 hour ago</Td>
                </tr>
                <tr>
                  <Td className="text-white">Summer Collection 2027</Td>
                  <Td>Draft Created</Td>
                  <Td>Baher Brain (AI)</Td>
                  <Td>3 hours ago</Td>
                </tr>
              </tbody>
            </Table>
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
                <Button variant="secondary" className="w-full text-xs py-1.5 h-auto">Generate with Baher Brain</Button>
              </div>
              <div className="p-4 bg-black/40 rounded border border-white/5">
                <p className="text-sm text-white mb-2">High demand predicted for &quot;Gold Plated Bracelets&quot;.</p>
                <Button variant="secondary" className="w-full text-xs py-1.5 h-auto">Review Inventory</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
