import * as React from 'react';
import { 
  Button, Input, Textarea, Select, MultiSelect, Table, Th, Td, DataCard, KPICard, 
  Badge, Pill, EmptyState, Skeleton, Toast, Tabs, Breadcrumbs, Pagination, SearchComponent, Filter,
  ModalPlaceholder, DrawerPlaceholder
} from '@/components/admin/ui';

export const metadata = {
  title: 'Baher OS | Design System',
};

export default function DesignSystem() {
  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20">
      <div>
        <h1 className="text-4xl font-serif text-white tracking-tight">Design System</h1>
        <p className="text-[#888888] font-light mt-1">The foundation of Baher OS. Luxury through restraint and utility.</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-serif text-white border-b border-white/5 pb-2">1. Actions</h2>
        <div className="flex flex-wrap gap-4 items-center p-6 bg-[#0A0A0A] border border-white/5 rounded-lg">
          <Button variant="primary">Primary Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Button variant="ghost">Ghost Button</Button>
          <Button variant="primary" disabled>Disabled</Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-serif text-white border-b border-white/5 pb-2">2. Forms</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-[#0A0A0A] border border-white/5 rounded-lg">
          <div className="space-y-4">
            <Input placeholder="Standard Input" />
            <Select>
              <option>Select Option A</option>
              <option>Select Option B</option>
            </Select>
            <MultiSelect />
          </div>
          <div className="space-y-4">
            <Textarea placeholder="Write a description..." />
            <div className="flex gap-2">
              <SearchComponent />
              <Filter />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-serif text-white border-b border-white/5 pb-2">3. Data Display & Tables</h2>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KPICard title="Revenue" value="$45k" trend="+12%" />
            <KPICard title="Orders" value="128" trend="+2%" />
            <KPICard title="Conversion" value="3.2%" />
          </div>
          <DataCard title="Recent Products">
            <Table>
              <thead>
                <tr>
                  <Th>Product</Th>
                  <Th>SKU</Th>
                  <Th>Status</Th>
                  <Th>Price</Th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <Td>Elegance Necklace</Td>
                  <Td className="text-xs">BH-NL-001</Td>
                  <Td><Badge variant="success">Published</Badge></Td>
                  <Td>$1,200</Td>
                </tr>
                <tr>
                  <Td>Diamond Studs</Td>
                  <Td className="text-xs">BH-ER-002</Td>
                  <Td><Badge variant="warning">Low Stock</Badge></Td>
                  <Td>$850</Td>
                </tr>
              </tbody>
            </Table>
            <Pagination />
          </DataCard>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-serif text-white border-b border-white/5 pb-2">4. Indicators & Feedback</h2>
        <div className="flex flex-wrap gap-8 p-6 bg-[#0A0A0A] border border-white/5 rounded-lg items-center">
          <div className="flex gap-2">
            <Badge>Default Badge</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
          </div>
          <div className="flex gap-2">
            <Pill>Pill Tag</Pill>
          </div>
          <Toast title="Success" description="Product created successfully." />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-serif text-white border-b border-white/5 pb-2">5. Navigation & States</h2>
        <div className="space-y-6 p-6 bg-[#0A0A0A] border border-white/5 rounded-lg">
          <Breadcrumbs />
          <Tabs />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
            <EmptyState title="No Products Found" description="Get started by creating your first catalog item." />
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-10 w-3/4" />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-serif text-white border-b border-white/5 pb-2">6. Overlays</h2>
        <div className="flex flex-col lg:flex-row gap-8 p-6 bg-[#0A0A0A] border border-white/5 rounded-lg overflow-hidden">
          <div className="flex-1 flex justify-center items-center bg-black/50 p-6 rounded-lg border border-white/5">
            <ModalPlaceholder />
          </div>
          <div className="flex-shrink-0 bg-black/50 p-0 rounded-lg border border-white/5 overflow-hidden">
            <DrawerPlaceholder />
          </div>
        </div>
      </section>

    </div>
  );
}
