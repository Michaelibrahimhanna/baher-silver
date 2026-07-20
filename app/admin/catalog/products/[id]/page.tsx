'use client';

import * as React from 'react';
import { Button, Input, Textarea, Badge } from '@/components/admin/ui';
import { Sparkles, ChevronDown, ChevronRight, Save, Eye, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const EditorSection = ({ title, children, defaultOpen = true }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  return (
    <div className="bg-[#121212] border border-white/5 rounded-lg overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between bg-[#0A0A0A]/50 hover:bg-[#0A0A0A] transition-colors"
      >
        <h3 className="text-white font-medium">{title}</h3>
        {isOpen ? <ChevronDown className="w-4 h-4 text-[#888888]" /> : <ChevronRight className="w-4 h-4 text-[#888888]" />}
      </button>
      {isOpen && (
        <div className="p-6 border-t border-white/5">
          {children}
        </div>
      )}
    </div>
  );
};

import { useProduct, useCreateProduct, useUpdateProduct } from '@/lib/hooks/useCatalog';
import type { Product } from '@/types/catalog';
import { useParams, useRouter } from 'next/navigation';
import { Toast } from '@/components/admin/ui';

export default function ProductEditor() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const isNew = id === 'new';

  const { data: product, isLoading } = useProduct(id);
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [showToast, setShowToast] = React.useState(false);

  const [prevProductId, setPrevProductId] = React.useState<string | null>(null);
  
  if (product && product.id !== prevProductId) {
    setPrevProductId(product.id);
    setName(product.name_en || '');
    setDescription(product.description_en || '');
  }

  const handleSave = async () => {
    const payload: Partial<Product> = { name_en: name, description_en: description, status: 'draft' };
    try {
      if (isNew) {
        const newProd = await createMutation.mutateAsync(payload);
        router.push(`/admin/catalog/products/${newProd.id}`);
      } else {
        await updateMutation.mutateAsync({ id, updates: payload });
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading && !isNew) return <div className="p-12 text-center text-[#888888]">Loading product data...</div>;

  return (
    <div className="max-w-5xl mx-auto pb-32 animate-in fade-in duration-700 relative">
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50">
          <Toast title="Product Saved" description="Your changes have been saved to the database." />
        </div>
      )}
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/catalog/products" className="w-10 h-10 flex items-center justify-center rounded-full border border-white/10 hover:bg-white/5 transition-colors text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-serif text-white">{isNew ? 'New Product' : name || 'Untitled Product'}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-[#888888]">
            <span>{product?.status || 'Draft'} Mode</span>
            <span className="w-1 h-1 rounded-full bg-[#555555]"></span>
            <span>{isNew ? 'Not saved' : 'Saved remotely'}</span>
          </div>
        </div>
        <div className="ml-auto flex gap-3">
          <Button variant="ghost" className="gap-2"><Eye className="w-4 h-4" /> Preview</Button>
          <Button 
            variant="primary" 
            className="gap-2" 
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            <Save className="w-4 h-4" /> 
            {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Product'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <EditorSection title="General">
            <div className="space-y-6">
              <div>
                <label className="text-xs text-[#888888] mb-1.5 block">Product Title</label>
                <div className="flex gap-2">
                  <Input value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} className="flex-1" />
                  <Button variant="secondary" className="px-3" title="Generate with AI"><Sparkles className="w-4 h-4 text-white" /></Button>
                </div>
              </div>
              <div>
                <label className="text-xs text-[#888888] mb-1.5 flex justify-between">
                  <span>Luxury Description</span>
                  <button className="text-white hover:underline flex items-center gap-1 text-[10px]"><Sparkles className="w-3 h-3" /> Generate with Baher Brain</button>
                </label>
                <Textarea value={description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)} className="min-h-[150px]" placeholder="Craft a story of elegance..." />
              </div>
            </div>
          </EditorSection>

          <EditorSection title="Media">
            <div className="border-2 border-dashed border-white/10 rounded-lg p-12 flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors cursor-pointer">
              <Sparkles className="w-8 h-8 text-[#555555] mb-4" />
              <h4 className="text-white font-medium mb-1">Drag and drop images</h4>
              <p className="text-xs text-[#888888]">Supports high-res WebP, JPG, PNG, and MP4.</p>
              <Button variant="secondary" className="mt-4 text-xs">Improve Images with AI (Placeholder)</Button>
            </div>
          </EditorSection>

          <EditorSection title="Variants & Attributes" defaultOpen={false}>
            <div className="text-center py-8 text-[#888888] text-sm">
              Manage sizes, materials, and colors.
            </div>
          </EditorSection>
          
          <EditorSection title="Pricing & Inventory" defaultOpen={false}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[#888888] mb-1.5 block">Price (USD)</label>
                <Input placeholder="0.00" />
              </div>
              <div>
                <label className="text-xs text-[#888888] mb-1.5 block">SKU</label>
                <Input placeholder="e.g. BH-R-001" />
              </div>
            </div>
          </EditorSection>
        </div>

        <div className="space-y-6">
          <EditorSection title="Publishing">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-white">Status</span>
                <Badge variant="warning">Draft</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-white">Visibility</span>
                <span className="text-sm text-[#888888]">Hidden</span>
              </div>
            </div>
          </EditorSection>
          
          <EditorSection title="Taxonomy">
            <div className="space-y-4">
              <div>
                <label className="text-xs text-[#888888] mb-1.5 flex justify-between">
                  <span>Categories</span>
                  <button className="text-white flex items-center gap-1 text-[10px]"><Sparkles className="w-3 h-3" /> Suggest</button>
                </label>
                <div className="flex flex-wrap gap-2">
                  <Badge>Rings</Badge>
                  <button className="text-xs text-[#555555] hover:text-white">+ Add Category</button>
                </div>
              </div>
            </div>
          </EditorSection>
          
          <EditorSection title="SEO Engine">
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-br from-[#1A1A1A] to-[#121212] border border-white/5 rounded text-center">
                <Sparkles className="w-6 h-6 text-white/50 mx-auto mb-2" />
                <p className="text-xs text-white mb-3">Let Baher Brain optimize meta titles and JSON-LD schema.</p>
                <Button variant="secondary" className="w-full text-xs">Generate SEO</Button>
              </div>
            </div>
          </EditorSection>
        </div>
      </div>
    </div>
  );
}
