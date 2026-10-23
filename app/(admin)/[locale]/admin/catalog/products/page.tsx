'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit3, 
  Copy, 
  Trash2, 
  Download,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  RotateCcw,
  Archive,
  Activity,
  CheckCircle2,
  Sparkles,
  Printer,
  Barcode,
  Scan,
  ExternalLink
} from 'lucide-react';
import type { Product } from '@/types/catalog';
import { softDeleteProduct, restoreProductFromRecycleBin, filterActiveProducts, filterSoftDeletedProducts } from '@/lib/recycle-bin';
import { calculateProductHealthScore } from '@/lib/product-health-score';
import { PrintableLabelsModal } from '@/components/admin/catalog/PrintableLabelsModal';

function ProductsContent() {
  const searchParams = useSearchParams();

  // Active View Tab: 'active' or 'recycle_bin'
  const [viewTab, setViewTab] = React.useState<'active' | 'recycle_bin'>('active');

  // Search & Filter State
  const [query, setQuery] = React.useState(searchParams?.get('search') || '');
  const [selectedCategory, setSelectedCategory] = React.useState(searchParams?.get('category') || 'all');
  const [selectedStatus, setSelectedStatus] = React.useState(searchParams?.get('status') || 'all');
  const [selectedProfile, setSelectedProfile] = React.useState<string>(searchParams?.get('profile') || 'all');
  const [sortBy, setSortBy] = React.useState(searchParams?.get('sort') || 'newest');
  const [currentPage, setCurrentPage] = React.useState(Number(searchParams?.get('page')) || 1);

  // Barcode Scanner & Rapid Lookup State
  const [barcodeInput, setBarcodeInput] = React.useState('');
  const [isBarcodeLookingUp, setIsBarcodeLookingUp] = React.useState(false);
  const [barcodeLookupResult, setBarcodeLookupResult] = React.useState<{
    found: boolean;
    match_type: 'product' | 'piece';
    product: Product;
    piece?: any;
    location?: string;
    lifecycle_status?: string;
  } | null>(null);
  const [barcodeError, setBarcodeError] = React.useState<string | null>(null);

  // Label Printing Modal State
  const [printingProduct, setPrintingProduct] = React.useState<Product | null>(null);

  // Real Database Products & Categories State
  const [allProductsList, setAllProductsList] = React.useState<Product[]>([]);
  const [categoriesList, setCategoriesList] = React.useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);

  const pageSize = 8;

  const fetchProducts = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [catRes, prodRes] = await Promise.all([
        fetch('/api/categories').then((r) => r.json()),
        fetch(
          `/api/products?${new URLSearchParams({
            ...(query ? { query } : {}),
            ...(selectedCategory !== 'all' ? { category: selectedCategory } : {}),
            ...(selectedStatus !== 'all' ? { status: selectedStatus } : {}),
            ...(selectedProfile !== 'all' ? { profile_type: selectedProfile } : {}),
          }).toString()}`
        ).then((r) => r.json()),
      ]);

      if (catRes.success) setCategoriesList(catRes.categories || []);
      if (prodRes.success && Array.isArray(prodRes.products)) {
        setAllProductsList(prodRes.products);
      }
    } catch (e) {
      console.error('Failed to load catalog data', e);
    } finally {
      setIsLoading(false);
    }
  }, [query, selectedCategory, selectedStatus, selectedProfile]);

  React.useEffect(() => {
    let active = true;
    const load = async () => {
      if (active) {
        await fetchProducts();
      }
    };
    void load();
    return () => { active = false; };
  }, [fetchProducts]);

  // Dedicated Barcode / Piece Fast Lookup Action
  const handleBarcodeLookup = async (codeToSearch?: string) => {
    const code = (codeToSearch !== undefined ? codeToSearch : barcodeInput).trim();
    if (!code) {
      setBarcodeLookupResult(null);
      setBarcodeError(null);
      return;
    }
    setIsBarcodeLookingUp(true);
    setBarcodeError(null);
    try {
      const res = await fetch(`/api/barcode/lookup?code=${encodeURIComponent(code)}`);
      const data = await res.json();
      const payload = data.result || data;
      if (res.ok && payload.found) {
        setBarcodeLookupResult(payload);
        setBarcodeError(null);
      } else {
        setBarcodeLookupResult(null);
        setBarcodeError(data.message || data.error || 'لم يتم العثور على أي منتج أو قطعة مطابقة لهذا الباركود');
      }
    } catch (e: any) {
      setBarcodeError(e.message || 'فشل الاتصال بمحرك الباركود');
    } finally {
      setIsBarcodeLookingUp(false);
    }
  };

  // Soft Delete Action (Move to Recycle Bin)
  const handleSoftDelete = (product: Product) => {
    if (confirm(`هل أنت تأكد من نقل المنتج "${product.name_ar || product.name_en}" إلى سلة المحذوفات (Recycle Bin)؟`)) {
      const updated = softDeleteProduct(product);
      setAllProductsList((prev) => prev.map((p) => (p.id === product.id ? updated : p)));
      setActionMessage(`تم نقل المنتج "${product.name_ar}" إلى سلة المحذوفات بنجاح.`);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  // Restore Action (From Recycle Bin)
  const handleRestore = (product: Product) => {
    const restored = restoreProductFromRecycleBin(product);
    setAllProductsList((prev) => prev.map((p) => (p.id === product.id ? restored : p)));
    setActionMessage(`تم استعادة المنتج "${product.name_ar}" بنجاح إلى الكتالوج النشط.`);
    setTimeout(() => setActionMessage(null), 4000);
  };

  // Permanent Hard Delete Action (Only inside Recycle Bin)
  const handlePermanentDelete = async (id: string) => {
    if (confirm(`تحذير: سيتم حذف المنتج "${id}" نهائياً من قاعدة البيانات! هل تريد الاستمرار؟`)) {
      try {
        const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          setAllProductsList((prev) => prev.filter((p) => p.id !== id));
          setActionMessage(`تم حذف المنتج ${id} نهائياً.`);
          setTimeout(() => setActionMessage(null), 4000);
        } else {
          alert(`فشل الحذف النهائي: ${data.error}`);
        }
      } catch (e: unknown) {
        const errorMsg = e instanceof Error ? e.message : 'Delete failed';
        alert(`خطأ أثناء الحذف: ${errorMsg}`);
      }
    }
  };

  const handleDuplicate = async (product: Product) => {
    try {
      const stamp = String(product.id || 'p') + '_copy';
      const dupData: Partial<Product> = {
        ...product,
        id: `prod-${stamp}`,
        name_en: `${product.name_en || 'Product'} (Copy)`,
        name_ar: `${product.name_ar || 'منتج'} (نسخة)`,
        slug: `${product.slug || 'product'}-copy-${stamp}`,
      };
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dupData),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage('تم تكرار المنتج في قاعدة البيانات بنجاح!');
        fetchProducts();
        setTimeout(() => setActionMessage(null), 4000);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      alert(`Duplicate failed: ${msg}`);
    }
  };

  // Filter Active vs Soft Deleted
  const displayedByTab = React.useMemo(() => {
    return viewTab === 'active'
      ? filterActiveProducts(allProductsList)
      : filterSoftDeletedProducts(allProductsList);
  }, [allProductsList, viewTab]);

  // Sort Products
  const sortedProducts = React.useMemo(() => {
    const list = [...displayedByTab];
    if (sortBy === 'price-asc') {
      list.sort((a, b) => (a.selling_price || 0) - (b.selling_price || 0));
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => (b.selling_price || 0) - (a.selling_price || 0));
    }
    return list;
  }, [displayedByTab, sortBy]);

  const totalPages = Math.ceil(sortedProducts.length / pageSize) || 1;
  const paginatedProducts = sortedProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const activeCount = filterActiveProducts(allProductsList).length;
  const deletedCount = filterSoftDeletedProducts(allProductsList).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="text-[10px] tracking-[0.3em] uppercase text-amber-400 font-bold">
            ENTERPRISE CATALOG • SOFT DELETE & RECYCLE BIN
          </span>
          <h1 className="text-3xl font-serif text-white tracking-tight mt-1">Enterprise Products Module</h1>
          <p className="text-xs text-slate-400 mt-1">
            إدارة شاملة لمنتجات الفضة، دعم الأرشيف والسلة (Recycle Bin)، وتقييم الجودة بالذكاء الاصطناعي.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchProducts()}
            className="bg-white/5 text-white border border-white/10 px-3.5 py-2.5 rounded-xl text-xs font-medium uppercase tracking-wider flex items-center gap-2 hover:bg-white/10 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-amber-400" /> Refresh
          </button>
          <button className="bg-white/5 text-white border border-white/10 px-4 py-2.5 rounded-xl text-xs font-medium uppercase tracking-wider flex items-center gap-2 hover:bg-white/10 transition-colors">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <Link href="/admin/catalog/ai-machine">
            <button className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-amber-500/30 transition-all shadow-md">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" /> AI Product Machine
            </button>
          </Link>
          <Link href="/admin/catalog/products/new">
            <button className="bg-amber-500 text-black px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20">
              <Plus className="w-4 h-4" /> Create Product
            </button>
          </Link>
        </div>
      </div>

      {actionMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Recycle Bin vs Active Toggle Tabs */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setViewTab('active'); setCurrentPage(1); }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              viewTab === 'active'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-black/30 text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span>المنتجات النشطة (Active Products)</span>
            <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-bold">
              {activeCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setViewTab('recycle_bin'); setCurrentPage(1); }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              viewTab === 'recycle_bin'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                : 'bg-black/30 text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Archive className="h-3.5 w-3.5" />
            <span>سلة المحذوفات (Recycle Bin)</span>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">
              {deletedCount}
            </span>
          </button>
        </div>
      </div>

      {/* Real-time Barcode Scanner & Rapid Verification Bar */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 backdrop-blur-md space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
            <Scan className="w-4 h-4 animate-pulse" />
            <span>ماسح الباركود الفوري (Instant Barcode & Piece Scanner):</span>
            <span className="text-[10px] text-slate-400 font-normal">يدعم EAN-13 والرموز التسلسلية للقطع Code-128</span>
          </div>
          {barcodeLookupResult && (
            <button
              onClick={() => { setBarcodeLookupResult(null); setBarcodeInput(''); }}
              className="text-[10px] text-slate-400 hover:text-white underline"
            >
              مسح النتيجة (Clear Scan)
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Barcode className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="امسح بالباركود سكانر أو أدخل رقم الباركود (EAN-13) أو الرقم التسلسلي للقطعة..."
              value={barcodeInput}
              onChange={(e) => {
                setBarcodeInput(e.target.value);
                if (e.target.value.length >= 8) {
                  handleBarcodeLookup(e.target.value);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleBarcodeLookup();
                }
              }}
              className="w-full bg-slate-950 border border-amber-500/30 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 font-mono focus:outline-none focus:border-amber-400"
            />
          </div>
          <button
            type="button"
            onClick={() => handleBarcodeLookup()}
            disabled={isBarcodeLookingUp || !barcodeInput.trim()}
            className="bg-amber-500 text-black px-4 py-2 rounded-xl text-xs font-bold hover:bg-amber-400 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-md shadow-amber-500/20"
          >
            {isBarcodeLookingUp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Scan className="w-3.5 h-3.5" />}
            بحث سريع
          </button>
        </div>

        {/* Scan Result Feedback */}
        {barcodeLookupResult && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs animate-in fade-in">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="font-bold text-white flex items-center gap-2">
                  <span>{barcodeLookupResult.product.name_ar || barcodeLookupResult.product.name_en}</span>
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-mono text-emerald-300 uppercase border border-emerald-500/30">
                    {barcodeLookupResult.match_type === 'piece' ? 'مطابقة قطعة تسلسلية (Serialized Piece)' : 'مطابقة منتج (Master Product)'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 font-mono mt-0.5 flex flex-wrap gap-x-3">
                  <span>SKU: {barcodeLookupResult.product.sku}</span>
                  <span>الباركود: {barcodeLookupResult.product.barcode}</span>
                  {barcodeLookupResult.piece && (
                    <>
                      <span>السيريال: {barcodeLookupResult.piece.serial_number}</span>
                      <span>الموقع: {barcodeLookupResult.piece.location_code || 'VAULT'}</span>
                      <span className="text-amber-300 font-semibold">الحالة: {barcodeLookupResult.piece.lifecycle_status}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setPrintingProduct(barcodeLookupResult.product)}
                className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-white/20"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                طباعة الملصق
              </button>
              <Link
                href={`/admin/catalog/products/${barcodeLookupResult.product.id}`}
                className="bg-amber-500 hover:bg-amber-400 text-black px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
              >
                فتح السجل
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {barcodeError && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300 flex items-center gap-2">
            <span>{barcodeError}</span>
          </div>
        )}
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-[#050505] border border-white/10 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder="Search products by Name, SKU, Category..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        {/* Category & Status Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter className="w-4 h-4 text-amber-400 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-900 border border-white/10 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Categories</option>
            {categoriesList.map((c, i) => (
              <option key={i} value={(c.slug as string) || ''}>
                {(c.name as { en?: string })?.en || (c.slug as string)}
              </option>
            ))}
          </select>

          <select
            value={selectedProfile}
            onChange={(e) => setSelectedProfile(e.target.value)}
            className="bg-slate-900 border border-white/10 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 font-semibold"
          >
            <option value="all">All Profiles</option>
            <option value="SILVER_JEWELRY">✨ Silver Jewelry</option>
            <option value="NON_SILVER_RETAIL">🛍️ Retail Merchandise</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-900 border border-white/10 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-900 border border-white/10 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
          >
            <option value="newest">Newest First</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#050505] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-amber-400 uppercase text-[10px] tracking-wider font-semibold border-b border-white/10">
              <tr>
                <th className="p-4">Media</th>
                <th className="p-4">Product Name</th>
                <th className="p-4">SKU / ID</th>
                <th className="p-4">Health Score</th>
                <th className="p-4">Price</th>
                <th className="p-4">Stock Status</th>
                <th className="p-4">Badges</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400 text-sm">
                    Loading database products...
                  </td>
                </tr>
              ) : paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400 text-sm">
                    {viewTab === 'recycle_bin'
                      ? 'سلة المحذوفات فارغة حالياً (No soft deleted items).'
                      : 'No products found matching filters.'}
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p) => {
                  const nameEn = p.name_en || (p as { name?: { en?: string } }).name?.en || 'Product';
                  const nameAr = p.name_ar || (p as { name?: { ar?: string } }).name?.ar || 'منتج';
                  const priceVal = p.selling_price || (p as unknown as { price?: number }).price || 0;
                  const isOutOfStock = p.status === 'out_of_stock' || p.current_stock === 0;

                  const health = calculateProductHealthScore(p);

                  return (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                      <td className="p-4">
                        <div className="relative w-12 h-12 bg-slate-900 rounded-xl overflow-hidden border border-white/10">
                          <Image
                            src={p.primary_image || (p as unknown as { image?: string }).image || 'https://images.unsplash.com/photo-1605100804763-247f6612d543?q=80&w=800'}
                            alt={nameEn}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        </div>
                      </td>

                      <td className="p-4">
                        <Link href={`/admin/catalog/products/${p.id}`} className="hover:text-amber-400 font-medium text-white transition-colors block">
                          {nameEn}
                        </Link>
                        <span className="text-[11px] text-slate-400">{nameAr}</span>
                      </td>

                      <td className="p-4 font-mono text-[11px]">
                        <span className="text-amber-400 block">{p.sku || p.id}</span>
                        <div className="mt-1">
                          {p.profile_type === 'NON_SILVER_RETAIL' ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              🛍️ Retail {p.brand ? `(${p.brand})` : ''}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-700/60 text-slate-300 border border-slate-600">
                              ✨ Silver {p.silver_purity || '925'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* AI Health Score Badge */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <Activity className="h-3.5 w-3.5 text-amber-400" />
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black border ${
                            health.grade === 'A+' || health.grade === 'A'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          }`}>
                            {health.grade} ({health.overallScore})
                          </span>
                        </div>
                      </td>

                      <td className="p-4 font-semibold text-white">{priceVal} EGP</td>

                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase border ${
                          !isOutOfStock ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}>
                          {!isOutOfStock ? 'In Stock' : 'Out of stock'}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {p.best_seller && <span className="px-1.5 py-0.5 text-[8px] bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase font-bold">BEST SELLER</span>}
                          {p.new_arrival && <span className="px-1.5 py-0.5 text-[8px] bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase font-bold">NEW</span>}
                        </div>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex justify-end items-center gap-2">
                          {viewTab === 'recycle_bin' ? (
                            <>
                              <button
                                onClick={() => handleRestore(p)}
                                title="استعادة من سلة المحذوفات"
                                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                استعادة
                              </button>
                              <button
                                onClick={() => handlePermanentDelete(p.id)}
                                title="حذف نهائي"
                                className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-lg"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setPrintingProduct(p)}
                                title="طباعة ملصق الباركود (Barcode / Labels)"
                                className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              <Link href={`/en/product/${p.slug}`} target="_blank" className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg">
                                <Eye className="w-4 h-4" />
                              </Link>
                              <Link href={`/admin/catalog/products/${p.id}`} className="p-1.5 text-amber-400 hover:bg-amber-500/20 rounded-lg">
                                <Edit3 className="w-4 h-4" />
                              </Link>
                              <button onClick={() => handleDuplicate(p)} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg">
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleSoftDelete(p)}
                                title="نقل إلى سلة المحذوفات"
                                className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-lg"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/[0.02]">
          <span className="text-xs text-slate-400">
            Showing {paginatedProducts.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, sortedProducts.length)} of {sortedProducts.length} Products
          </span>

          <div className="flex items-center gap-2">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="p-2 bg-white/5 border border-white/10 rounded-xl text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-amber-400 font-mono px-3">Page {currentPage} of {totalPages}</span>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="p-2 bg-white/5 border border-white/10 rounded-xl text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Printable Labels Modal */}
      {printingProduct && (
        <PrintableLabelsModal
          isOpen={Boolean(printingProduct)}
          onClose={() => setPrintingProduct(null)}
          productName={printingProduct.name_ar || printingProduct.name_en || ''}
          sku={printingProduct.sku || printingProduct.id}
          barcode={printingProduct.barcode || ''}
          price={printingProduct.selling_price || 0}
        />
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <React.Suspense fallback={<div className="p-12 text-center text-slate-400">Loading catalog products engine...</div>}>
      <ProductsContent />
    </React.Suspense>
  );
}
