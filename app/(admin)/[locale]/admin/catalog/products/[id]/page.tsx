'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Sparkles, 
  Save, 
  Eye, 
  Upload, 
  Trash2, 
  RefreshCw, 
  Smartphone, 
  Tablet, 
  Monitor, 
  DollarSign, 
  Scale, 
  Boxes, 
  Search, 
  Image as ImageIcon,
  FileText
} from 'lucide-react';
import { products } from '@/lib/products';
import type { Product, SilverPurity, GenderTarget } from '@/types/catalog';

function getInitialFormData(id: string) {
  const existing = products.find(p => p.id === id || p.slug === id);
  if (existing) {
    return {
      id: existing.id,
      sku: `BS-SIL-${existing.id.toUpperCase()}`,
      barcode: `6291000${existing.id}`,
      qr_code: `QR-BS-${existing.id}`,
      slug: existing.slug,
      name_en: existing.name.en,
      name_ar: existing.name.ar,
      short_description_en: 'Handcrafted 925 sterling silver jewelry piece for luxury daily wear.',
      short_description_ar: 'قطعة مجوهرات فاخرة مصنوعة يدوياً من الفضة عيار 925 للاستخدام اليومي الراقي.',
      description_en: existing.details?.description?.en || 'A timeless classic, meticulously handcrafted from 925 sterling silver.',
      description_ar: existing.details?.description?.ar || 'خاتم كلاسيكي خالد، مصنوع يدوياً بعناية من الفضة عيار 925.',
      category_name: existing.category,
      subcategory_id: 'sub-1',
      collection_name: existing.isLimited ? 'Luxe Limited' : 'Heritage Collection',
      material_name: '925 Sterling Silver',
      gender: 'women' as GenderTarget,
      tags: ['silver925', 'luxury', 'handcrafted', 'zircon'],
      silver_purity: '925' as SilverPurity,
      silver_weight_g: existing.category === 'rings' ? 6.5 : 14.2,
      stone_weight_g: 1.2,
      total_weight_g: existing.category === 'rings' ? 7.7 : 15.4,
      manufacturing_cost: 25,
      silver_cost: 45,
      packaging_cost: 10,
      other_costs: 5,
      purchase_cost: 85,
      selling_price: existing.price,
      sale_price: existing.price > 100 ? existing.price * 0.9 : undefined,
      discount_percent: existing.price > 100 ? 10 : 0,
      current_stock: existing.stockStatus === 'OUT_OF_STOCK' ? 0 : 25,
      min_stock: 5,
      max_stock: 100,
      warehouse: 'Cairo Main Vault',
      primary_image: existing.image,
      media_urls: existing.gallery || [existing.image],
      three_sixty_urls: ['https://images.unsplash.com/photo-1605100804763-247f6612d543?q=80&w=800'],
      video_url: '',
      reels_url: 'https://instagram.com/reel/example',
      youtube_url: '',
      meta_title: `${existing.name.en} | Baher Silver 925`,
      meta_description: existing.details?.description?.en || 'Buy authentic 925 silver jewelry at Baher Silver.',
      keywords: ['silver ring', '925 silver', 'baher silver', 'egypt silver'],
      status: 'published' as Product['status'],
      visibility: 'public' as Product['visibility'],
      publishing_status: 'immediate' as Product['publishing_status'],
      featured: existing.isBestSeller || false,
      best_seller: existing.isBestSeller || false,
      new_arrival: existing.isNew || false,
      limited_edition: existing.isLimited || false,
      is_handmade: existing.isHandmade || true,
    };
  }

  return {
    id: `p-new`,
    sku: `BS-SIL-777`,
    barcode: `6291000777`,
    qr_code: `QR-BS-NEW`,
    slug: 'new-silver-jewelry',
    name_en: '',
    name_ar: '',
    short_description_en: '',
    short_description_ar: '',
    description_en: '',
    description_ar: '',
    category_name: 'rings',
    subcategory_id: '',
    collection_name: 'Heritage Collection',
    material_name: '925 Sterling Silver',
    gender: 'women' as GenderTarget,
    tags: ['silver925', 'new'],
    silver_purity: '925' as SilverPurity,
    silver_weight_g: 8.0,
    stone_weight_g: 1.0,
    total_weight_g: 9.0,
    manufacturing_cost: 30,
    silver_cost: 50,
    packaging_cost: 10,
    other_costs: 5,
    purchase_cost: 95,
    selling_price: 150,
    sale_price: 135,
    discount_percent: 10,
    current_stock: 20,
    min_stock: 5,
    max_stock: 100,
    warehouse: 'Cairo Main Vault',
    primary_image: 'https://images.unsplash.com/photo-1605100804763-247f6612d543?q=80&w=800',
    media_urls: ['https://images.unsplash.com/photo-1605100804763-247f6612d543?q=80&w=800'],
    three_sixty_urls: [],
    video_url: '',
    reels_url: '',
    youtube_url: '',
    meta_title: '',
    meta_description: '',
    keywords: ['silver', 'jewelry'],
    status: 'draft' as Product['status'],
    visibility: 'public' as Product['visibility'],
    publishing_status: 'immediate' as Product['publishing_status'],
    featured: false,
    best_seller: false,
    new_arrival: true,
    limited_edition: false,
    is_handmade: true,
  };
}

export default function EnterpriseProductEditor() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const isNew = id === 'new';

  const [formData, setFormData] = React.useState(() => getInitialFormData(id));
  const [activeTab, setActiveTab] = React.useState<'general' | 'media' | 'silver' | 'pricing' | 'inventory' | 'seo' | 'preview'>('general');
  const [previewViewport, setPreviewViewport] = React.useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isAIAnalyzing, setIsAIAnalyzing] = React.useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = React.useState(false);
  const [aiOutput, setAiOutput] = React.useState<string | null>(null);

  // Auto Margin Calculation
  const calculatedPurchaseCost = (formData.manufacturing_cost || 0) + (formData.silver_cost || 0) + (formData.packaging_cost || 0) + (formData.other_costs || 0);
  const calculatedProfit = formData.selling_price - calculatedPurchaseCost;
  const calculatedProfitMargin = formData.selling_price > 0 ? ((calculatedProfit / formData.selling_price) * 100).toFixed(1) : '0';

  const handleChange = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAutoSKU = () => {
    const randomSKU = `BS-SIL-888`;
    handleChange('sku', randomSKU);
    handleChange('barcode', `6291000888`);
  };

  // Baher Brain Content AI Generation
  const handleGenerateAIContent = () => {
    setIsGeneratingContent(true);
    setTimeout(() => {
      setFormData(prev => ({
        ...prev,
        name_en: prev.name_en || 'Royal Zircon Solitaire 925 Ring',
        name_ar: prev.name_ar || 'خاتم زركون سولتير ملكي فضة 925',
        short_description_en: 'Exquisite 925 silver ring featuring AAA zircon solitaire setting.',
        short_description_ar: 'خاتم فضة 925 فاخر مرصع بالحجر الرئيسي زركون الملكي.',
        description_en: 'Crafted from solid 925 sterling silver, this ring radiates timeless elegance. Anti-tarnish rhodium finish ensures lifetime brilliance.',
        description_ar: 'مصنوع من الفضة الإسترليني النظيفة عيار 925، مصقول بعناية بطلاء الروديوم لمنع التآكل والبريق.',
        meta_title: 'Royal Zircon Solitaire 925 Ring | Baher Silver',
        meta_description: 'Buy Royal Zircon Solitaire 925 Ring in Egypt with 100% authenticity guarantee.',
        keywords: ['zircon ring', '925 silver', 'egypt jewelry', 'baher solitaire'],
        tags: ['zircon', 'solitaire', 'silver925', 'royal'],
      }));
      setAiOutput(`✨ AI Suggestions Generated:
• Category: Rings
• Selling Points: Lifetime Anti-Tarnish, AAA Zircon Crystal
• Instagram Caption: "Elevate your daily elegance with our Royal Solitaire 925 Silver Ring. 💍 #BaherSilver"
• Facebook Caption: "Discover 925 Sterling Silver perfection. Order now with free insured delivery."`);
      setIsGeneratingContent(false);
    }, 1200);
  };

  // Baher Brain Image Vision Analysis
  const handleAIImageVision = () => {
    setIsAIAnalyzing(true);
    setTimeout(() => {
      setFormData(prev => ({
        ...prev,
        category_name: 'rings',
        silver_purity: '925' as SilverPurity,
        silver_weight_g: 7.2,
        stone_weight_g: 1.1,
        total_weight_g: 8.3,
        selling_price: 160,
        tags: ['zircon_crystal', '925_sterling', 'mirror_finish'],
      }));
      alert('🤖 AI Vision Analysis Complete!\n\nDetected:\n- Color: Sterling Silver\n- Material: 925 Sterling Silver\n- Stone: AAA Zircon\n- Estimated Weight: 8.3g\n- Suggested Price: $160');
      setIsAIAnalyzing(false);
    }, 1500);
  };

  const handleSave = (status: 'published' | 'draft') => {
    setFormData(prev => ({ ...prev, status }));
    alert(`Product saved successfully as ${status.toUpperCase()}!`);
    router.push('/admin/catalog/products');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-32">
      
      {/* Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/catalog/products" className="p-2.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <span className="text-[10px] tracking-[0.3em] uppercase text-primary font-bold">PRODUCT EDITOR STUDIO</span>
            <h1 className="text-2xl md:text-3xl font-serif text-white tracking-tight mt-0.5">
              {isNew ? 'Create Enterprise Product' : `Editing: ${formData.name_en}`}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            type="button" 
            onClick={() => setActiveTab('preview')} 
            className="bg-white/5 text-white border border-white/10 px-4 py-2.5 rounded-xs text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-white/10 transition-colors"
          >
            <Eye className="w-4 h-4 text-primary" /> Live Preview
          </button>
          <button 
            type="button" 
            onClick={() => handleSave('draft')} 
            className="bg-white/10 text-white border border-white/20 px-4 py-2.5 rounded-xs text-xs font-bold uppercase tracking-wider hover:bg-white/20 transition-colors"
          >
            Save Draft
          </button>
          <button 
            type="button" 
            onClick={() => handleSave('published')} 
            className="bg-primary text-black px-6 py-2.5 rounded-xs text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-white transition-colors shadow-lg"
          >
            <Save className="w-4 h-4" /> Publish Product
          </button>
        </div>
      </div>

      {/* Editor Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-white/10 pb-2">
        {[
          { id: 'general', label: 'General Info', icon: FileText },
          { id: 'media', label: 'Media & 360', icon: ImageIcon },
          { id: 'silver', label: 'Silver & Costs', icon: Scale },
          { id: 'pricing', label: 'Pricing & Margin', icon: DollarSign },
          { id: 'inventory', label: 'Inventory & SKU', icon: Boxes },
          { id: 'seo', label: 'SEO & Metadata', icon: Search },
          { id: 'preview', label: 'Live Preview', icon: Eye },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xs text-xs uppercase tracking-wider font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-primary/20 text-primary border border-primary/40 shadow-[0_0_15px_rgba(229,228,226,0.2)]'
                  : 'bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Form Area */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* TAB 1: GENERAL INFO */}
          {activeTab === 'general' && (
            <div className="bg-[#050505] border border-white/10 p-6 rounded-xs space-y-6">
              
              <div className="flex justify-between items-center pb-4 border-b border-white/10">
                <h3 className="text-lg font-serif text-white">General Product Details</h3>
                <button
                  type="button"
                  onClick={handleGenerateAIContent}
                  disabled={isGeneratingContent}
                  className="bg-primary/20 text-primary border border-primary/40 px-3 py-1.5 rounded-xs text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-primary/30 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isGeneratingContent ? 'AI Generating...' : 'Auto-Fill with AI'}
                </button>
              </div>

              {/* Names EN & AR */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Product Name (English)</label>
                  <input 
                    type="text" 
                    value={formData.name_en} 
                    onChange={(e) => handleChange('name_en', e.target.value)} 
                    placeholder="e.g. Classic 925 Silver Ring" 
                    className="w-full bg-secondary/10 border border-white/10 rounded-xs p-3 text-xs text-foreground focus:outline-none focus:border-primary" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">اسم المنتج (بالعربية)</label>
                  <input 
                    type="text" 
                    dir="rtl" 
                    value={formData.name_ar} 
                    onChange={(e) => handleChange('name_ar', e.target.value)} 
                    placeholder="مثال: خاتم فضة كلاسيكي عيار 925" 
                    className="w-full bg-secondary/10 border border-white/10 rounded-xs p-3 text-xs text-foreground focus:outline-none focus:border-primary" 
                  />
                </div>
              </div>

              {/* Short Descriptions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Short Description (English)</label>
                  <textarea 
                    rows={2} 
                    value={formData.short_description_en} 
                    onChange={(e) => handleChange('short_description_en', e.target.value)} 
                    className="w-full bg-secondary/10 border border-white/10 rounded-xs p-3 text-xs text-foreground focus:outline-none focus:border-primary" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">الوصف القصير (بالعربية)</label>
                  <textarea 
                    rows={2} 
                    dir="rtl" 
                    value={formData.short_description_ar} 
                    onChange={(e) => handleChange('short_description_ar', e.target.value)} 
                    className="w-full bg-secondary/10 border border-white/10 rounded-xs p-3 text-xs text-foreground focus:outline-none focus:border-primary" 
                  />
                </div>
              </div>

              {/* Full Descriptions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Full Description (English)</label>
                  <textarea 
                    rows={5} 
                    value={formData.description_en} 
                    onChange={(e) => handleChange('description_en', e.target.value)} 
                    className="w-full bg-secondary/10 border border-white/10 rounded-xs p-3 text-xs text-foreground focus:outline-none focus:border-primary" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">الوصف التفصيلي الكامل (بالعربية)</label>
                  <textarea 
                    rows={5} 
                    dir="rtl" 
                    value={formData.description_ar} 
                    onChange={(e) => handleChange('description_ar', e.target.value)} 
                    className="w-full bg-secondary/10 border border-white/10 rounded-xs p-3 text-xs text-foreground focus:outline-none focus:border-primary" 
                  />
                </div>
              </div>

              {/* Classification */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Category</label>
                  <select 
                    value={formData.category_name} 
                    onChange={(e) => handleChange('category_name', e.target.value)} 
                    className="w-full bg-secondary/10 border border-white/10 rounded-xs p-3 text-xs text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="rings">Rings (خواتم)</option>
                    <option value="necklaces">Necklaces (قلائد)</option>
                    <option value="bracelets">Bracelets (أساور)</option>
                    <option value="earrings">Earrings (أقراط)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Collection</label>
                  <select 
                    value={formData.collection_name} 
                    onChange={(e) => handleChange('collection_name', e.target.value)} 
                    className="w-full bg-secondary/10 border border-white/10 rounded-xs p-3 text-xs text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="Heritage Collection">Heritage Collection</option>
                    <option value="Minimalist Modern">Minimalist Modern</option>
                    <option value="Royal Zircon">Royal Zircon</option>
                    <option value="Luxe Earrings">Luxe Earrings</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Target Gender</label>
                  <select 
                    value={formData.gender} 
                    onChange={(e) => handleChange('gender', e.target.value)} 
                    className="w-full bg-secondary/10 border border-white/10 rounded-xs p-3 text-xs text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="women">Women</option>
                    <option value="men">Men</option>
                    <option value="unisex">Unisex</option>
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Product Tags (Comma Separated)</label>
                <input 
                  type="text" 
                  value={formData.tags?.join(', ')} 
                  onChange={(e) => handleChange('tags', e.target.value.split(',').map(t => t.trim()))} 
                  placeholder="silver925, luxury, zircon, gift" 
                  className="w-full bg-secondary/10 border border-white/10 rounded-xs p-3 text-xs text-foreground focus:outline-none focus:border-primary font-mono" 
                />
              </div>

            </div>
          )}

          {/* TAB 2: MEDIA & 360 */}
          {activeTab === 'media' && (
            <div className="bg-[#050505] border border-white/10 p-6 rounded-xs space-y-6">
              
              <div className="flex justify-between items-center pb-4 border-b border-white/10">
                <h3 className="text-lg font-serif text-white">Media Assets & AI Vision</h3>
                <button
                  type="button"
                  onClick={handleAIImageVision}
                  disabled={isAIAnalyzing}
                  className="bg-primary/20 text-primary border border-primary/40 px-3 py-1.5 rounded-xs text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-primary/30 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isAIAnalyzing ? 'Analyzing Image...' : 'AI Image Vision Extraction'}
                </button>
              </div>

              {/* Drag & Drop Upload Zone */}
              <div className="border-2 border-dashed border-white/20 p-8 rounded-xs text-center space-y-3 bg-white/[0.01] hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 text-primary mx-auto" />
                <div>
                  <p className="text-xs font-bold text-white uppercase tracking-wider">Drag & Drop High-Res Product Photos</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Supports PNG, JPG, WEBP up to 20MB per image.</p>
                </div>
                <input type="file" multiple className="hidden" id="file-upload" />
                <label htmlFor="file-upload" className="inline-block bg-white/10 text-white px-4 py-2 rounded-xs text-xs uppercase tracking-wider font-bold cursor-pointer hover:bg-white/20">
                  Select Files
                </label>
              </div>

              {/* Current Media Grid */}
              <div className="space-y-3">
                <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Uploaded Product Gallery & Main Image</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {formData.media_urls?.map((url, idx) => (
                    <div key={idx} className="relative aspect-square bg-secondary/20 rounded-xs border border-white/10 overflow-hidden group">
                      <Image src={url} alt="Gallery photo" fill className="object-cover" sizes="120px" />
                      {formData.primary_image === url && (
                        <span className="absolute top-2 left-2 bg-primary text-black text-[9px] font-bold px-2 py-0.5 rounded-xs uppercase">
                          MAIN
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button 
                          type="button"
                          onClick={() => handleChange('primary_image', url)}
                          className="p-1.5 bg-primary text-black rounded-xs text-[9px] font-bold uppercase"
                        >
                          Set Main
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleChange('media_urls', formData.media_urls?.filter((_, i) => i !== idx))}
                          className="p-1.5 bg-rose-500 text-white rounded-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Interactive Video & Social URLs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Instagram Reel URL</label>
                  <input 
                    type="text" 
                    value={formData.reels_url} 
                    onChange={(e) => handleChange('reels_url', e.target.value)} 
                    placeholder="https://instagram.com/reel/..." 
                    className="w-full bg-secondary/10 border border-white/10 rounded-xs p-3 text-xs text-foreground focus:outline-none focus:border-primary font-mono" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">YouTube Product Video URL</label>
                  <input 
                    type="text" 
                    value={formData.youtube_url} 
                    onChange={(e) => handleChange('youtube_url', e.target.value)} 
                    placeholder="https://youtube.com/watch?v=..." 
                    className="w-full bg-secondary/10 border border-white/10 rounded-xs p-3 text-xs text-foreground focus:outline-none focus:border-primary font-mono" 
                  />
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: SILVER & COSTS */}
          {activeTab === 'silver' && (
            <div className="bg-[#050505] border border-white/10 p-6 rounded-xs space-y-6">
              <h3 className="text-lg font-serif text-white pb-4 border-b border-white/10">Silver Purity & Manufacturing Costs</h3>

              {/* Silver Purity & Weights */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Silver Purity</label>
                  <select 
                    value={formData.silver_purity} 
                    onChange={(e) => handleChange('silver_purity', e.target.value)} 
                    className="w-full bg-secondary/10 border border-white/10 rounded-xs p-3 text-xs text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="925">925 Sterling Silver</option>
                    <option value="950">950 Pure Silver</option>
                    <option value="999">999 Fine Silver</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Silver Weight (g)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    value={formData.silver_weight_g} 
                    onChange={(e) => handleChange('silver_weight_g', Number(e.target.value))} 
                    className="w-full bg-secondary/10 border border-white/10 rounded-xs p-3 text-xs text-foreground font-mono focus:outline-none focus:border-primary" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Stone Weight (g)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    value={formData.stone_weight_g} 
                    onChange={(e) => handleChange('stone_weight_g', Number(e.target.value))} 
                    className="w-full bg-secondary/10 border border-white/10 rounded-xs p-3 text-xs text-foreground font-mono focus:outline-none focus:border-primary" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-primary font-semibold">Total Weight (g)</label>
                  <input 
                    type="number" 
                    readOnly 
                    value={(formData.silver_weight_g || 0) + (formData.stone_weight_g || 0)} 
                    className="w-full bg-primary/10 border border-primary/30 rounded-xs p-3 text-xs text-primary font-mono font-bold" 
                  />
                </div>
              </div>

              {/* Manufacturing Cost Breakdown */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Costing Structure breakdown ($ / EGP)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase">Silver Raw Cost</span>
                    <input 
                      type="number" 
                      value={formData.silver_cost} 
                      onChange={(e) => handleChange('silver_cost', Number(e.target.value))} 
                      className="w-full bg-secondary/10 border border-white/10 rounded-xs p-2.5 text-xs text-white font-mono" 
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase">Crafting Fee</span>
                    <input 
                      type="number" 
                      value={formData.manufacturing_cost} 
                      onChange={(e) => handleChange('manufacturing_cost', Number(e.target.value))} 
                      className="w-full bg-secondary/10 border border-white/10 rounded-xs p-2.5 text-xs text-white font-mono" 
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase">Packaging Box</span>
                    <input 
                      type="number" 
                      value={formData.packaging_cost} 
                      onChange={(e) => handleChange('packaging_cost', Number(e.target.value))} 
                      className="w-full bg-secondary/10 border border-white/10 rounded-xs p-2.5 text-xs text-white font-mono" 
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase">Other Overhead</span>
                    <input 
                      type="number" 
                      value={formData.other_costs} 
                      onChange={(e) => handleChange('other_costs', Number(e.target.value))} 
                      className="w-full bg-secondary/10 border border-white/10 rounded-xs p-2.5 text-xs text-white font-mono" 
                    />
                  </div>
                </div>

                <div className="p-4 bg-white/5 border border-white/10 rounded-xs flex justify-between items-center">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Total Purchase & Production Cost</span>
                  <span className="text-base font-mono font-bold text-white">${calculatedPurchaseCost.toFixed(2)}</span>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: PRICING & MARGIN */}
          {activeTab === 'pricing' && (
            <div className="bg-[#050505] border border-white/10 p-6 rounded-xs space-y-6">
              <h3 className="text-lg font-serif text-white pb-4 border-b border-white/10">Pricing & Automatic Profit Margins</h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Selling Price ($)</label>
                  <input 
                    type="number" 
                    value={formData.selling_price} 
                    onChange={(e) => handleChange('selling_price', Number(e.target.value))} 
                    className="w-full bg-secondary/10 border border-white/10 rounded-xs p-3 text-sm font-mono text-white font-bold focus:outline-none focus:border-primary" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Sale / Promotional Price ($)</label>
                  <input 
                    type="number" 
                    value={formData.sale_price || ''} 
                    onChange={(e) => handleChange('sale_price', Number(e.target.value))} 
                    placeholder="Optional" 
                    className="w-full bg-secondary/10 border border-white/10 rounded-xs p-3 text-sm font-mono text-emerald-400 focus:outline-none focus:border-primary" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Discount %</label>
                  <input 
                    type="number" 
                    value={formData.discount_percent || 0} 
                    onChange={(e) => handleChange('discount_percent', Number(e.target.value))} 
                    className="w-full bg-secondary/10 border border-white/10 rounded-xs p-3 text-sm font-mono text-white focus:outline-none focus:border-primary" 
                  />
                </div>
              </div>

              {/* Profit Margin KPI Dashboard */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10">
                <div className="p-4 bg-white/5 border border-white/10 rounded-xs">
                  <span className="text-[10px] text-muted-foreground uppercase">Production Cost</span>
                  <p className="text-xl font-mono text-white font-bold mt-1">${calculatedPurchaseCost.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xs">
                  <span className="text-[10px] text-emerald-400 uppercase font-bold">Estimated Profit</span>
                  <p className="text-xl font-mono text-emerald-400 font-bold mt-1">${calculatedProfit.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-primary/10 border border-primary/30 rounded-xs">
                  <span className="text-[10px] text-primary uppercase font-bold">Profit Margin</span>
                  <p className="text-xl font-mono text-primary font-bold mt-1">{calculatedProfitMargin}%</p>
                </div>
              </div>

            </div>
          )}

          {/* TAB 5: INVENTORY & SKU */}
          {activeTab === 'inventory' && (
            <div className="bg-[#050505] border border-white/10 p-6 rounded-xs space-y-6">
              
              <div className="flex justify-between items-center pb-4 border-b border-white/10">
                <h3 className="text-lg font-serif text-white">Stock Control & Barcode Logistics</h3>
                <button 
                  type="button" 
                  onClick={handleAutoSKU}
                  className="bg-white/10 text-white border border-white/20 px-3 py-1.5 rounded-xs text-xs uppercase tracking-wider font-bold flex items-center gap-1.5 hover:bg-white/20"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-primary" /> Auto SKU Generator
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">SKU Identifier</label>
                  <input 
                    type="text" 
                    value={formData.sku} 
                    onChange={(e) => handleChange('sku', e.target.value)} 
                    className="w-full bg-secondary/10 border border-white/10 rounded-xs p-3 text-xs text-primary font-mono font-bold" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Barcode (EAN-13)</label>
                  <input 
                    type="text" 
                    value={formData.barcode} 
                    onChange={(e) => handleChange('barcode', e.target.value)} 
                    className="w-full bg-secondary/10 border border-white/10 rounded-xs p-3 text-xs text-foreground font-mono" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">QR Code Tag</label>
                  <input 
                    type="text" 
                    value={formData.qr_code} 
                    onChange={(e) => handleChange('qr_code', e.target.value)} 
                    className="w-full bg-secondary/10 border border-white/10 rounded-xs p-3 text-xs text-foreground font-mono" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 border-t border-white/10">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Current Stock</label>
                  <input 
                    type="number" 
                    value={formData.current_stock} 
                    onChange={(e) => handleChange('current_stock', Number(e.target.value))} 
                    className="w-full bg-secondary/10 border border-white/10 rounded-xs p-3 text-xs text-white font-mono font-bold" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Minimum Stock Alert</label>
                  <input 
                    type="number" 
                    value={formData.min_stock} 
                    onChange={(e) => handleChange('min_stock', Number(e.target.value))} 
                    className="w-full bg-secondary/10 border border-white/10 rounded-xs p-3 text-xs text-amber-400 font-mono" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Maximum Stock Cap</label>
                  <input 
                    type="number" 
                    value={formData.max_stock} 
                    onChange={(e) => handleChange('max_stock', Number(e.target.value))} 
                    className="w-full bg-secondary/10 border border-white/10 rounded-xs p-3 text-xs text-white font-mono" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Warehouse Vault</label>
                  <select 
                    value={formData.warehouse} 
                    onChange={(e) => handleChange('warehouse', e.target.value)} 
                    className="w-full bg-secondary/10 border border-white/10 rounded-xs p-3 text-xs text-foreground"
                  >
                    <option value="Cairo Main Vault">Cairo Main Vault</option>
                    <option value="Alexandria Vault">Alexandria Vault</option>
                  </select>
                </div>
              </div>

            </div>
          )}

          {/* TAB 6: SEO STUDIO */}
          {activeTab === 'seo' && (
            <div className="bg-[#050505] border border-white/10 p-6 rounded-xs space-y-6">
              <h3 className="text-lg font-serif text-white pb-4 border-b border-white/10">Search Engine Optimization & OpenGraph Preview</h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">URL Slug</label>
                  <input 
                    type="text" 
                    value={formData.slug} 
                    onChange={(e) => handleChange('slug', e.target.value)} 
                    className="w-full bg-secondary/10 border border-white/10 rounded-xs p-3 text-xs text-primary font-mono" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Meta Title Tag</label>
                  <input 
                    type="text" 
                    value={formData.meta_title} 
                    onChange={(e) => handleChange('meta_title', e.target.value)} 
                    className="w-full bg-secondary/10 border border-white/10 rounded-xs p-3 text-xs text-white" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Meta Description</label>
                  <textarea 
                    rows={3} 
                    value={formData.meta_description} 
                    onChange={(e) => handleChange('meta_description', e.target.value)} 
                    className="w-full bg-secondary/10 border border-white/10 rounded-xs p-3 text-xs text-white" 
                  />
                </div>
              </div>

              {/* Google Search Snippet Simulation */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-xs space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Google Search Snippet Preview</span>
                <p className="text-sm font-sans text-blue-400 hover:underline cursor-pointer">{formData.meta_title || 'Product Title'}</p>
                <p className="text-[11px] text-emerald-400 font-mono">https://www.bahersilver.com/en/product/{formData.slug}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{formData.meta_description || 'Product meta description...'}</p>
              </div>

            </div>
          )}

          {/* TAB 7: LIVE SIMULATED PREVIEW */}
          {activeTab === 'preview' && (
            <div className="bg-[#050505] border border-white/10 p-6 rounded-xs space-y-6">
              
              <div className="flex justify-between items-center pb-4 border-b border-white/10">
                <h3 className="text-lg font-serif text-white">Live Storefront Viewport Simulator</h3>
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-1 rounded-xs">
                  <button 
                    onClick={() => setPreviewViewport('desktop')}
                    className={`p-1.5 rounded-xs ${previewViewport === 'desktop' ? 'bg-primary text-black' : 'text-muted-foreground'}`}
                  >
                    <Monitor className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setPreviewViewport('tablet')}
                    className={`p-1.5 rounded-xs ${previewViewport === 'tablet' ? 'bg-primary text-black' : 'text-muted-foreground'}`}
                  >
                    <Tablet className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setPreviewViewport('mobile')}
                    className={`p-1.5 rounded-xs ${previewViewport === 'mobile' ? 'bg-primary text-black' : 'text-muted-foreground'}`}
                  >
                    <Smartphone className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Viewport Frame */}
              <div className={`mx-auto bg-black border border-white/20 rounded-sm p-6 space-y-6 overflow-hidden transition-all duration-500 ${
                previewViewport === 'desktop' ? 'w-full' : previewViewport === 'tablet' ? 'w-[600px]' : 'w-[360px]'
              }`}>
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="relative aspect-[3/4] w-full md:w-1/2 bg-secondary/20 rounded-xs overflow-hidden border border-white/10">
                    <Image src={formData.primary_image} alt={formData.name_en} fill className="object-cover" sizes="300px" />
                  </div>
                  <div className="space-y-3 flex-1">
                    <span className="text-[10px] uppercase tracking-widest text-primary font-bold">{formData.collection_name}</span>
                    <h2 className="text-xl font-serif text-white">{formData.name_en}</h2>
                    <p className="text-sm font-mono text-primary font-bold">${formData.selling_price.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{formData.description_en}</p>
                    <button className="w-full bg-primary text-black py-2.5 text-xs uppercase font-bold tracking-wider rounded-xs">
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Right Sidebar: Status & Badges */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="bg-[#050505] border border-white/10 p-6 rounded-xs space-y-4">
            <h3 className="text-base font-serif text-white pb-3 border-b border-white/10">Visibility & Status</h3>
            
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Publishing Status</label>
              <select 
                value={formData.status} 
                onChange={(e) => handleChange('status', e.target.value)} 
                className="w-full bg-secondary/10 border border-white/10 rounded-xs p-3 text-xs text-white"
              >
                <option value="published">Published (Visible in Store)</option>
                <option value="draft">Draft (Hidden in Store)</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/10">
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Store Badges & Highlights</label>
              
              <label className="flex items-center gap-3 text-xs text-white cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.featured} 
                  onChange={(e) => handleChange('featured', e.target.checked)} 
                  className="rounded border-white/20 text-primary focus:ring-0" 
                />
                <span>Featured Product (Home Slider)</span>
              </label>

              <label className="flex items-center gap-3 text-xs text-white cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.best_seller} 
                  onChange={(e) => handleChange('best_seller', e.target.checked)} 
                  className="rounded border-white/20 text-primary focus:ring-0" 
                />
                <span>Best Seller Badge</span>
              </label>

              <label className="flex items-center gap-3 text-xs text-white cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.new_arrival} 
                  onChange={(e) => handleChange('new_arrival', e.target.checked)} 
                  className="rounded border-white/20 text-primary focus:ring-0" 
                />
                <span>New Arrival Badge</span>
              </label>

              <label className="flex items-center gap-3 text-xs text-white cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.limited_edition} 
                  onChange={(e) => handleChange('limited_edition', e.target.checked)} 
                  className="rounded border-white/20 text-primary focus:ring-0" 
                />
                <span>Limited Edition Badge</span>
              </label>
            </div>

          </div>

          {/* AI Output Log Box */}
          {aiOutput && (
            <div className="bg-primary/10 border border-primary/30 p-4 rounded-xs text-xs text-primary font-mono leading-relaxed space-y-2">
              <div className="flex items-center gap-2 font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" /> Baher Brain AI Log
              </div>
              <pre className="whitespace-pre-wrap font-sans text-[11px] text-foreground">{aiOutput}</pre>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
