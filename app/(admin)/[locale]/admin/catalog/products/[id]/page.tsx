'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Sparkles, 
  Save, 
  Printer, 
  Copy, 
  RefreshCw, 
  Search, 
  Image as ImageIcon,
  Tag,
  Sliders,
  Layers,
  Calculator,
  QrCode,
  Network,
  History,
  Heart,
  Lock,
  CheckCircle2,
  Eye,
  Trash2,
  AlertCircle
} from 'lucide-react';
import type { Product, ProductStatus, QRDestinationType } from '@/types/catalog';
import { MASTER_PURITY_LEVELS, MASTER_STONE_TYPES, MASTER_STONE_COLORS, MASTER_FINISHES, MASTER_SUPPLIERS, MASTER_WAREHOUSES, CUSTOM_FIELD_DEFINITIONS, PRODUCT_TEMPLATES } from '@/lib/master-data';
import { generateSKU, generateEAN13Barcode } from '@/lib/catalog-identifiers';
import { duplicateProduct } from '@/lib/catalog-duplication';
import { createProductVersionSnapshot } from '@/lib/product-versioning';
import { createInitialWorkflow } from '@/lib/approval-workflow';
import { softDeleteProduct } from '@/lib/recycle-bin';

// Enterprise & Modular Components
import { CustomFieldsRenderer } from '@/components/admin/catalog/CustomFieldsRenderer';
import { ProductVariantsMatrix } from '@/components/admin/catalog/ProductVariantsMatrix';
import { FormulaPricingCalculator } from '@/components/admin/catalog/FormulaPricingCalculator';
import { DualQRCodePreview } from '@/components/admin/catalog/DualQRCodePreview';
import { PrintableLabelsModal } from '@/components/admin/catalog/PrintableLabelsModal';
import { ProductRelationsManager } from '@/components/admin/catalog/ProductRelationsManager';
import { ProductActivityTimeline } from '@/components/admin/catalog/ProductActivityTimeline';
import { BaherBrainDrawer } from '@/components/admin/catalog/BaherBrainDrawer';
import { BaherMemoriesPanel } from '@/components/admin/catalog/BaherMemoriesPanel';
import { MediaPlaceholderTab } from '@/components/admin/catalog/MediaPlaceholderTab';
import { LiveProductPreviewModal } from '@/components/admin/catalog/LiveProductPreviewModal';
import { ProductVersionHistoryModal } from '@/components/admin/catalog/ProductVersionHistoryModal';
import { ProductHealthScoreCard } from '@/components/admin/catalog/ProductHealthScoreCard';

export default function EnterpriseProductEditor() {
  const params = useParams();
  const id = params?.id as string;
  const isNew = id === 'new';

  const [activeTab, setActiveTab] = React.useState<
    'general' | 'master_attrs' | 'variants' | 'pricing' | 'relations' | 'identifiers' | 'seo' | 'timeline' | 'media' | 'memories'
  >('general');

  const [isSaving, setIsSaving] = React.useState(false);
  const [saveMessage, setSaveMessage] = React.useState<string | null>(null);

  // Modals & Drawers State
  const [isLabelsModalOpen, setIsLabelsModalOpen] = React.useState(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = React.useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = React.useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = React.useState(false);

  // Autosave & Recovery State
  const [hasUnsavedDraft, setHasUnsavedDraft] = React.useState(false);
  const [recoveredDraftTime, setRecoveredDraftTime] = React.useState<string | null>(null);
  const [lastAutosavedAt, setLastAutosavedAt] = React.useState<string | null>(null);

  // Initial Product Form State
  const [formData, setFormData] = React.useState<Product>({
    id: isNew ? 'prod-new-item' : id,
    template_id: 'tmpl-ring',
    sku: generateSKU('ring', 'SIL'),
    barcode: generateEAN13Barcode(),
    internal_qr: 'QR-INT-BS-RING-101',
    customer_qr: 'QR-CUST-silver-ring-101',
    qr_destination_type: 'product',
    slug: 'silver-ring-heritage-101',
    name_en: 'Royal Heritage Silver Ring',
    name_ar: 'خاتم فضة التراث الملكي عيار 925',
    short_description_en: 'Authentic 925 Sterling Silver Ring featuring Khan El-Khalili handcrafted filigree pattern.',
    short_description_ar: 'خاتم فضة إسترليني عيار 925 مرصع بزركون نقي مصنع يدوياً بأسلوب الفنون التراثية الشرقية.',
    description_en: 'Detailed handcrafted ring made from solid 925 silver.',
    description_ar: 'قطعة فضية فاخرة مصنوعة من أنقى درجات الفضة عيار 925.',
    internal_notes: 'ملاحظة خاصة بالطاقم: متوفر بالخزينة الرئيسية في درج الخواتم رقم A-12.',
    category_name: 'rings',
    collection_name: 'Heritage Collection',
    material_name: '925 Sterling Silver',
    purity_level_id: 'pur-925',
    stone_type_id: 'st-zircon',
    stone_color_id: 'sc-clear',
    finish_id: 'fin-rhodium',
    supplier_id: 'sup-cairo-craft',
    warehouse_id: 'wh-cairo-main',
    gender: 'women',
    tags: ['silver925', 'heritage', 'luxury', 'handcrafted'],
    silver_purity: '925',
    silver_weight_g: 7.5,
    stone_weight_g: 1.0,
    total_weight_g: 8.5,
    labor_cost: 20,
    stone_cost: 15,
    manufacturing_cost: 25,
    silver_cost: 45,
    packaging_cost: 10,
    overhead_cost: 5,
    purchase_cost: 85,
    selling_price: 180,
    sale_price: 165,
    discount_percent: 8,
    profit_margin_percent: 45,
    current_stock: 15,
    min_stock: 3,
    max_stock: 50,
    warehouse: 'Cairo Central Vault',
    primary_image: 'https://images.unsplash.com/photo-1605100804763-247f6612d543?q=80&w=800',
    media_urls: [
      'https://images.unsplash.com/photo-1605100804763-247f6612d543?q=80&w=800',
      'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=800'
    ],
    meta_title: 'خاتم فضة التراث الملكي عيار 925 | باهر سيلفر',
    meta_description: 'تسوق خاتم فضة عيار 925 أصلي مصنع يدوياً ضمان مدى الحياة من باهر سيلفر.',
    keywords: ['خاتم فضة 925', 'فضة حريمي', 'مجوهرات مصرية'],
    status: 'published',
    visibility: 'public',
    publishing_status: 'immediate',
    featured: true,
    best_seller: true,
    new_arrival: true,
    limited_edition: false,
    is_handmade: true,
    version_history: [],
    workflow: createInitialWorkflow(),
    custom_fields: [
      { field_id: 'cf-warranty', key: 'warranty_period', value: '1 Year Lifetime Silver Guarantee' },
      { field_id: 'cf-origin', key: 'origin_country', value: 'Egypt (Handmade)' }
    ],
    specifications: [
      { id: 'sp-1', key_ar: 'مقاس الخاتم', key_en: 'Ring Size', value_ar: 'US 7 (EU 54)', value_en: 'US 7 (EU 54)' },
      { id: 'sp-2', key_ar: 'نوع التثبيت', key_en: 'Setting', value_ar: 'Prong Setting (تركيب سنون)', value_en: 'Prong Setting' }
    ],
    variants: [],
    relations: [],
    activity_logs: [
      {
        id: 'log-1',
        product_id: isNew ? 'new' : id,
        actor_name: 'م. باهر إبراهيم',
        actor_role: 'Chief Administrator',
        action_type: 'create',
        description_ar: 'تم إنشاء سجل المنتج لأول مرة وتوليد الـ SKUs والـ Barcodes الحصرية.',
        description_en: 'Created master product record and generated identifiers.',
        created_at: new Date().toISOString(),
      }
    ]
  });

  const draftStorageKey = React.useMemo(() => `baher_silver_product_draft_${formData.id}`, [formData.id]);

  // Check for Unsaved Autosaved Local Draft on Mount
  React.useEffect(() => {
    try {
      const savedDraftJson = localStorage.getItem(draftStorageKey);
      if (savedDraftJson) {
        const parsed = JSON.parse(savedDraftJson);
        if (parsed.timestamp && parsed.data) {
          const formattedTime = new Date(parsed.timestamp).toLocaleTimeString('ar-EG');
          setTimeout(() => {
            setHasUnsavedDraft(true);
            setRecoveredDraftTime(formattedTime);
          }, 0);
        }
      }
    } catch {
      // Ignored
    }
  }, [draftStorageKey]);

  // Periodic Autosave Every 5 Seconds
  React.useEffect(() => {
    const timer = setInterval(() => {
      try {
        const timestamp = new Date().toISOString();
        localStorage.setItem(draftStorageKey, JSON.stringify({ timestamp, data: formData }));
        setLastAutosavedAt(new Date(timestamp).toLocaleTimeString('ar-EG'));
      } catch {
        // Ignored
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [draftStorageKey, formData]);

  // Restore Recovered Local Draft
  const handleRestoreLocalDraft = () => {
    try {
      const savedDraftJson = localStorage.getItem(draftStorageKey);
      if (savedDraftJson) {
        const parsed = JSON.parse(savedDraftJson);
        if (parsed.data) {
          setFormData(parsed.data);
          setHasUnsavedDraft(false);
          setSaveMessage('تم استعادة المسودة غير المحفوظة بنجاح!');
          setTimeout(() => setSaveMessage(null), 3000);
        }
      }
    } catch {
      // Ignored
    }
  };

  // Discard Local Draft
  const handleDiscardLocalDraft = () => {
    try {
      localStorage.removeItem(draftStorageKey);
      setHasUnsavedDraft(false);
    } catch {
      // Ignored
    }
  };

  // Update Field Handler
  const handleUpdateField = (field: keyof Product, val: unknown) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  // Duplicate Product Action
  const handleDuplicate = () => {
    const cloned = duplicateProduct(formData);
    setFormData(cloned);
    setSaveMessage('تم تكرار المنتج بنجاح مع توليد SKU وباركود جديد دون تكرار!');
    setTimeout(() => setSaveMessage(null), 4000);
  };

  // Soft Delete Action
  const handleSoftDeleteCurrent = () => {
    if (confirm(`هل أنت تأكد من نقل هذا المنتج إلى سلة المحذوفات؟`)) {
      const deleted = softDeleteProduct(formData);
      setFormData(deleted);
      setSaveMessage('تم نقل المنتج إلى سلة المحذوفات (Soft Deleted).');
      setTimeout(() => setSaveMessage(null), 4000);
    }
  };

  // Save Product Handler & Version Snapshot Creation
  const handleSave = () => {
    setIsSaving(true);

    const versionSnapshot = createProductVersionSnapshot(
      formData,
      'Administrator',
      `Save snapshot at ${new Date().toLocaleTimeString('ar-EG')}`
    );

    const updatedVersions = [versionSnapshot, ...(formData.version_history || [])];

    setTimeout(() => {
      setIsSaving(false);
      setFormData(prev => ({
        ...prev,
        version_history: updatedVersions,
        updated_at: new Date().toISOString(),
      }));
      setSaveMessage(`تم حفظ كافة التغييرات وإنشاء النسخة الإصدارية #${versionSnapshot.version_number} بنجاح!`);

      // Clear local dirty draft on explicit save
      try {
        localStorage.removeItem(draftStorageKey);
      } catch {
        // Ignored
      }

      setTimeout(() => setSaveMessage(null), 3500);
    }, 600);
  };

  return (
    <div className="min-h-screen space-y-6 pb-20 text-right">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/catalog/products"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-slate-400 hover:bg-white/10 hover:text-white transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">
                {isNew ? 'إنشاء منتج فضة جديد (New Product)' : `محرر المنتج: ${formData.name_ar}`}
              </h1>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                formData.status === 'published' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {formData.status.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              SKU: <span className="text-amber-400">{formData.sku}</span> | Barcode: <span className="text-cyan-400">{formData.barcode}</span>
              {lastAutosavedAt && (
                <span className="text-[10px] text-emerald-400 mr-2">
                  (Autosaved {lastAutosavedAt})
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action Header Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPreviewModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 transition-all"
          >
            <Eye className="h-4 w-4 text-cyan-400" />
            Live Preview
          </button>

          <button
            type="button"
            onClick={() => setIsVersionModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition-all"
          >
            <History className="h-4 w-4 text-amber-400" />
            إصدارات ({formData.version_history?.length || 0})
          </button>

          <button
            type="button"
            onClick={() => setIsAiDrawerOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition-all"
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            Baher Brain AI
          </button>

          <button
            type="button"
            onClick={handleDuplicate}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 transition-all"
          >
            <Copy className="h-4 w-4 text-purple-400" />
            تكرار
          </button>

          <button
            type="button"
            onClick={() => setIsLabelsModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 transition-all"
          >
            <Printer className="h-4 w-4 text-cyan-400" />
            ملصق
          </button>

          <button
            type="button"
            onClick={handleSoftDeleteCurrent}
            className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition-all"
          >
            <Trash2 className="h-4 w-4 text-rose-400" />
            سلة المحذوفات
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-black hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20"
          >
            {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            حفظ البيانات (Save Product)
          </button>
        </div>
      </div>

      {/* Recovered Unsaved Local Draft Banner */}
      {hasUnsavedDraft && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0" />
            <div>
              <p className="font-bold text-amber-300">تم العثور على مسودة غير محفوظة (Autosaved Draft Recovered)!</p>
              <p className="text-[11px] text-amber-200/80">
                تاريخ المسودة المحفوظة آلياً: {recoveredDraftTime}. هل ترغب في استعادتها أم تجاهلها؟
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRestoreLocalDraft}
              className="rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-extrabold text-black hover:bg-amber-400 transition-all"
            >
              استعادة المسودة (Restore Draft)
            </button>
            <button
              type="button"
              onClick={handleDiscardLocalDraft}
              className="rounded-xl border border-amber-500/30 bg-black/40 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-white/10 transition-all"
            >
              تجاهل (Discard)
            </button>
          </div>
        </div>
      )}

      {saveMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Product AI Health Score Card Widget */}
      <ProductHealthScoreCard product={formData} />

      {/* Enterprise Tabs Navigation */}
      <div className="flex overflow-x-auto gap-1 border-b border-white/10 pb-2 scrollbar-none">
        {[
          { id: 'general', label: 'البيانات الأساسية والقوالب', icon: Sliders },
          { id: 'master_attrs', label: 'السمات والحقول المخصصة', icon: Layers },
          { id: 'variants', label: 'المتغيرات (Variants Matrix)', icon: Tag },
          { id: 'pricing', label: 'محرك التسعير (Formula Engine)', icon: Calculator },
          { id: 'relations', label: 'المنتجات المرتبطة (Relations)', icon: Network },
          { id: 'identifiers', label: 'الـ QR والموجّه الديناميكي', icon: QrCode },
          { id: 'seo', label: 'محرك الـ SEO و SERP', icon: Search },
          { id: 'timeline', label: 'سجل النشاطات (Timeline)', icon: History },
          { id: 'media', label: 'الميديا (Placeholder)', icon: ImageIcon },
          { id: 'memories', label: 'Baher Memories (سبرينت قادم)', icon: Heart, badge: 'Future' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                  : 'bg-black/30 text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="rounded bg-pink-500/20 px-1.5 py-0.2 text-[9px] text-pink-300 font-bold border border-pink-500/30">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: General Info & Templates & Extended Statuses */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-5 rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md">
            <h3 className="text-base font-bold text-white border-b border-white/10 pb-3">المعلومات والوصف الأساسي</h3>

            {/* Template Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">قالب المنتج (Product Template):</label>
              <select
                value={formData.template_id || ''}
                onChange={(e) => handleUpdateField('template_id', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
              >
                {PRODUCT_TEMPLATES.map(t => (
                  <option key={t.id} value={t.id}>{t.name_ar} ({t.name_en})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">اسم المنتج بالعربية *</label>
                <input
                  type="text"
                  value={formData.name_ar}
                  onChange={(e) => handleUpdateField('name_ar', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">Product Name (English) *</label>
                <input
                  type="text"
                  value={formData.name_en}
                  onChange={(e) => handleUpdateField('name_en', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white font-sans text-left"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">الوصف القصير بالعربية (Short Description AR)</label>
              <textarea
                rows={2}
                value={formData.short_description_ar}
                onChange={(e) => handleUpdateField('short_description_ar', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">الوصف التفصيلي (Full Description AR)</label>
              <textarea
                rows={4}
                value={formData.description_ar}
                onChange={(e) => handleUpdateField('description_ar', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
              />
            </div>

            {/* Internal Notes (Staff Only) */}
            <div className="space-y-1.5 rounded-xl border border-purple-500/30 bg-purple-500/5 p-4">
              <label className="block text-xs font-bold text-purple-300 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-purple-400" />
                ملاحظات داخلية خاصة بالطاقم فقط (Internal Notes - Hidden from Storefront)
              </label>
              <textarea
                rows={2}
                value={formData.internal_notes || ''}
                placeholder="أدخل أي ملاحظات خاصة بالتخزين، المورد، أو تعليمات الصيانة الداخلية..."
                onChange={(e) => handleUpdateField('internal_notes', e.target.value)}
                className="w-full rounded-lg border border-purple-500/20 bg-slate-950 px-3 py-2 text-xs text-slate-200"
              />
            </div>
          </div>

          {/* Right Column: Status & Classification */}
          <div className="space-y-5 rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md">
            <h3 className="text-base font-bold text-white border-b border-white/10 pb-3">الحالة والتصنيف</h3>

            {/* Extended Status Picker */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">حالة المنتج (Product Status):</label>
              <select
                value={formData.status}
                onChange={(e) => handleUpdateField('status', e.target.value as ProductStatus)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs font-semibold text-amber-400"
              >
                <option value="published">منشور ومتاح (Published)</option>
                <option value="draft">مسودة (Draft)</option>
                <option value="hidden">مخفي من المتجر (Hidden)</option>
                <option value="archived">مؤرشف (Archived)</option>
                <option value="out_of_stock">منتهي المخزون (Out of stock)</option>
                <option value="coming_soon">قريباً (Coming Soon)</option>
                <option value="pre_order">حجز مسبق (Pre-Order)</option>
                <option value="discontinued">متوقف إنتاجه (Discontinued)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">التصنيف الرئيسي (Category):</label>
              <input
                type="text"
                value={formData.category_name || 'Rings'}
                onChange={(e) => handleUpdateField('category_name', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">المجموعة / التشيكلة (Collection):</label>
              <input
                type="text"
                value={formData.collection_name || 'Heritage Collection'}
                onChange={(e) => handleUpdateField('collection_name', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Master Attributes & Custom Fields */}
      {activeTab === 'master_attrs' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md space-y-4">
            <h3 className="text-base font-bold text-white border-b border-white/10 pb-3">ربط البيانات المرجعية المركزية (Master Data System)</h3>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">نقاء الفضة (Purity):</label>
                <select
                  value={formData.purity_level_id || ''}
                  onChange={(e) => handleUpdateField('purity_level_id', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
                >
                  {MASTER_PURITY_LEVELS.map(p => (
                    <option key={p.id} value={p.id}>{p.name_ar}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">نوع الحجر (Stone Type):</label>
                <select
                  value={formData.stone_type_id || ''}
                  onChange={(e) => handleUpdateField('stone_type_id', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
                >
                  {MASTER_STONE_TYPES.map(s => (
                    <option key={s.id} value={s.id}>{s.name_ar}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">لون الحجر (Stone Color):</label>
                <select
                  value={formData.stone_color_id || ''}
                  onChange={(e) => handleUpdateField('stone_color_id', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
                >
                  {MASTER_STONE_COLORS.map(c => (
                    <option key={c.id} value={c.id}>{c.name_ar}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">طلاء السطح (Finish):</label>
                <select
                  value={formData.finish_id || ''}
                  onChange={(e) => handleUpdateField('finish_id', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
                >
                  {MASTER_FINISHES.map(f => (
                    <option key={f.id} value={f.id}>{f.name_ar}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">المورد المعتمد (Supplier):</label>
                <select
                  value={formData.supplier_id || ''}
                  onChange={(e) => handleUpdateField('supplier_id', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
                >
                  {MASTER_SUPPLIERS.map(sup => (
                    <option key={sup.id} value={sup.id}>{sup.name_ar}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">الخزينة المودع بها (Warehouse):</label>
                <select
                  value={formData.warehouse_id || ''}
                  onChange={(e) => handleUpdateField('warehouse_id', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
                >
                  {MASTER_WAREHOUSES.map(w => (
                    <option key={w.id} value={w.id}>{w.name_ar}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Dynamic Custom Fields Renderer */}
          <CustomFieldsRenderer
            definitions={CUSTOM_FIELD_DEFINITIONS}
            values={formData.custom_fields || []}
            onChange={(updatedVals) => handleUpdateField('custom_fields', updatedVals)}
          />
        </div>
      )}

      {/* Tab 3: Variants Matrix */}
      {activeTab === 'variants' && (
        <ProductVariantsMatrix
          variants={formData.variants || []}
          productSku={formData.sku}
          productSlug={formData.slug}
          onChange={(updatedVars) => handleUpdateField('variants', updatedVars)}
        />
      )}

      {/* Tab 4: Formula Pricing Engine */}
      {activeTab === 'pricing' && (
        <FormulaPricingCalculator
          initialVars={{
            silverWeightGrams: formData.silver_weight_g,
            stoneCost: formData.stone_cost,
            manufacturingCost: formData.manufacturing_cost,
            packagingCost: formData.packaging_cost,
            laborCost: formData.labor_cost,
            overheadCost: formData.overhead_cost,
            profitMarginPercent: formData.profit_margin_percent,
          }}
          onChange={(calc) => {
            handleUpdateField('selling_price', calc.calculatedSellingPrice);
            handleUpdateField('purchase_cost', calc.totalProductionCost);
            handleUpdateField('silver_cost', calc.silverMaterialCost);
          }}
        />
      )}

      {/* Tab 5: Relations Engine */}
      {activeTab === 'relations' && (
        <ProductRelationsManager
          relations={formData.relations || []}
          onChange={(updatedRelations) => handleUpdateField('relations', updatedRelations)}
        />
      )}

      {/* Tab 6: Extensible Dual QR & Dynamic Router */}
      {activeTab === 'identifiers' && (
        <DualQRCodePreview
          sku={formData.sku}
          slug={formData.slug}
          destinationType={formData.qr_destination_type || 'product'}
          onDestinationChange={(newDest) => handleUpdateField('qr_destination_type', newDest as QRDestinationType)}
        />
      )}

      {/* Tab 7: SEO Engine */}
      {activeTab === 'seo' && (
        <div className="space-y-6 rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md">
          <h3 className="text-base font-bold text-white border-b border-white/10 pb-3">محرك محركات البحث SEO ومعاينة جوجل</h3>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">عنوان الصفحة Meta Title:</label>
              <input
                type="text"
                value={formData.meta_title || ''}
                onChange={(e) => handleUpdateField('meta_title', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">وصف البحث Meta Description:</label>
              <textarea
                rows={3}
                value={formData.meta_description || ''}
                onChange={(e) => handleUpdateField('meta_description', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 8: Timeline */}
      {activeTab === 'timeline' && (
        <ProductActivityTimeline logs={formData.activity_logs || []} />
      )}

      {/* Tab 9: Media — Real Product Source Upload */}
      {activeTab === 'media' && (
        <MediaPlaceholderTab
          primaryImage={formData.primary_image}
          mediaUrls={formData.media_urls || []}
          onPrimaryImageChange={(url) => setFormData((prev) => ({ ...prev, primary_image: url }))}
          onMediaUrlsChange={(urls) => setFormData((prev) => ({ ...prev, media_urls: urls }))}
        />
      )}

      {/* Tab 10: Memories Panel */}
      {activeTab === 'memories' && (
        <BaherMemoriesPanel />
      )}

      {/* Modals & Drawers */}
      <PrintableLabelsModal
        isOpen={isLabelsModalOpen}
        onClose={() => setIsLabelsModalOpen(false)}
        productName={formData.name_ar}
        sku={formData.sku}
        barcode={formData.barcode || ''}
        price={formData.selling_price}
      />

      <BaherBrainDrawer
        isOpen={isAiDrawerOpen}
        onClose={() => setIsAiDrawerOpen(false)}
        productNameAr={formData.name_ar}
        productNameEn={formData.name_en}
        silverWeightGrams={formData.silver_weight_g || 7.5}
        onApplyAIResult={(field, val) => handleUpdateField(field as keyof Product, val)}
      />

      <LiveProductPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        product={formData}
      />

      <ProductVersionHistoryModal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
        product={formData}
        onRestore={(restored) => setFormData(restored)}
      />
    </div>
  );
}
