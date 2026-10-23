import type { 
  MasterEntity, 
  MasterPurityLevel, 
  MasterStoneType, 
  MasterSupplier, 
  MasterWarehouse,
  CustomFieldDefinition,
  ProductTemplate 
} from '@/types/catalog';

export const MASTER_PURITY_LEVELS: MasterPurityLevel[] = [
  { id: 'pur-925', slug: 'silver-925', name_ar: 'فضة عيار 925 (Sterling Silver)', name_en: '925 Sterling Silver', code: '925', purity_value: 0.925, is_active: true },
  { id: 'pur-950', slug: 'silver-950', name_ar: 'فضة عيار 950 (Britannia Silver)', name_en: '950 Britannia Silver', code: '950', purity_value: 0.950, is_active: true },
  { id: 'pur-999', slug: 'silver-999', name_ar: 'فضة نية عيار 999 (Fine Silver)', name_en: '999 Fine Silver', code: '999', purity_value: 0.999, is_active: true },
  { id: 'pur-900', slug: 'silver-900', name_ar: 'فضة عيار 900 (Coin Silver)', name_en: '900 Coin Silver', code: '900', purity_value: 0.900, is_active: true },
  { id: 'pur-800', slug: 'silver-800', name_ar: 'فضة عيار 800 (تراثية وأنتيك)', name_en: '800 Heritage Silver', code: '800', purity_value: 0.800, is_active: true },
];

export const MASTER_STONE_TYPES: MasterStoneType[] = [
  { id: 'st-zircon', slug: 'zircon', name_ar: 'زركون نقي (Cubic Zirconia)', name_en: 'Cubic Zirconia', hardness_mohs: 8.5, is_active: true },
  { id: 'st-turquoise', slug: 'turquoise', name_ar: 'فيروز سينائي (Sinai Turquoise)', name_en: 'Sinai Turquoise', hardness_mohs: 6.0, is_active: true },
  { id: 'st-onyx', slug: 'onyx', name_ar: 'عقيق أسود (Black Onyx)', name_en: 'Black Onyx', hardness_mohs: 7.0, is_active: true },
  { id: 'st-marcasite', slug: 'marcasite', name_ar: 'مرقشيت سويسري (Swiss Marcasite)', name_en: 'Swiss Marcasite', hardness_mohs: 6.5, is_active: true },
  { id: 'st-pearl', slug: 'freshwater-pearl', name_ar: 'لؤلؤ طبيعي (Natural Pearl)', name_en: 'Freshwater Pearl', hardness_mohs: 3.5, is_active: true },
  { id: 'st-ruby-created', slug: 'created-ruby', name_ar: 'ياقوت أحمر (Created Ruby)', name_en: 'Created Ruby', hardness_mohs: 9.0, is_active: true },
];

export const MASTER_STONE_COLORS: MasterEntity[] = [
  { id: 'sc-clear', slug: 'crystal-clear', name_ar: 'شفاف كربستالي', name_en: 'Crystal Clear', code: '#FFFFFF', is_active: true },
  { id: 'sc-deep-blue', slug: 'deep-blue', name_ar: 'أزرق ملكي (Sapphire)', name_en: 'Deep Sapphire Blue', code: '#002366', is_active: true },
  { id: 'sc-emerald-green', slug: 'emerald-green', name_ar: 'أخضر زمردي', name_en: 'Emerald Green', code: '#50C878', is_active: true },
  { id: 'sc-ruby-red', slug: 'ruby-red', name_ar: 'أحمر ياقوتي', name_en: 'Ruby Red', code: '#E0115F', is_active: true },
  { id: 'sc-black', slug: 'jet-black', name_ar: 'أسود فحمي', name_en: 'Jet Black', code: '#0A0A0A', is_active: true },
  { id: 'sc-turquoise', slug: 'turquoise-cyan', name_ar: 'تركواز سماوي', name_en: 'Turquoise Cyan', code: '#40E0D0', is_active: true },
];

export const MASTER_FINISHES: MasterEntity[] = [
  { id: 'fin-rhodium', slug: 'rhodium-plated', name_ar: 'طلاء روديوم ناصع (Rhodium Plated)', name_en: 'White Rhodium Plated', is_active: true },
  { id: 'fin-oxidized', slug: 'oxidized-vintage', name_ar: 'معتق مؤكسد (Oxidized Vintage)', name_en: 'Oxidized Vintage Finish', is_active: true },
  { id: 'fin-high-polish', slug: 'high-polish', name_ar: 'تلميع مرآة (High Polish)', name_en: 'Mirror Polish', is_active: true },
  { id: 'fin-gold-vermeil', slug: 'gold-vermeil-18k', name_ar: 'طلاء ذهب 18K (Gold Vermeil)', name_en: '18K Gold Vermeil', is_active: true },
  { id: 'fin-matte-brushed', slug: 'matte-brushed', name_ar: 'مطفأ رملي (Matte Brushed)', name_en: 'Matte Satin Brushed', is_active: true },
];

export const MASTER_SUPPLIERS: MasterSupplier[] = [
  { id: 'sup-cairo-craft', slug: 'cairo-artisan-guild', name_ar: 'ورشه خان الخليلي الفنية', name_en: 'Khan El-Khalili Artisan Guild', country: 'Egypt', is_active: true },
  { id: 'sup-italy-silver', slug: 'vicenza-silver-co', name_ar: 'شركة فيتشينزا الإيطالية للفضة', name_en: 'Vicenza Silver Co. Italy', country: 'Italy', is_active: true },
  { id: 'sup-istanbul-casting', slug: 'grand-bazaar-casting', name_ar: 'مصبوغة البازار الكبير إسطنبول', name_en: 'Grand Bazaar Casting House', country: 'Turkey', is_active: true },
];

export const MASTER_WAREHOUSES: MasterWarehouse[] = [
  { id: 'wh-cairo-main', slug: 'cairo-main-vault', name_ar: 'الخزينة الرئيسية - القاهرة', name_en: 'Cairo Central Vault', location_code: 'EG-CAI-V1', capacity: 50000, is_active: true },
  { id: 'wh-alex-branch', slug: 'alex-vault', name_ar: 'خزينة فرع الإسكندرية', name_en: 'Alexandria Branch Vault', location_code: 'EG-ALY-V2', capacity: 15000, is_active: true },
  { id: 'wh-online-fulfillment', slug: 'online-fulfillment', name_ar: 'مركز شحن المتجر الإلكتروني', name_en: 'E-Commerce Fulfillment Center', location_code: 'EG-ECOM-F1', capacity: 30000, is_active: true },
];

export const CUSTOM_FIELD_DEFINITIONS: CustomFieldDefinition[] = [
  { id: 'cf-warranty', key: 'warranty_period', label_ar: 'فترة الضمان', label_en: 'Warranty Period', field_type: 'select', options: ['1 Year Lifetime Silver Guarantee', '2 Years Warranty', '5 Years VIP Certificate'], is_required: false, default_value: '1 Year Lifetime Silver Guarantee' },
  { id: 'cf-origin', key: 'origin_country', label_ar: 'بلد الصنع والتجميع', label_en: 'Country of Origin', field_type: 'select', options: ['Egypt (Handmade)', 'Italy', 'Turkey', 'Thailand'], is_required: false, default_value: 'Egypt (Handmade)' },
  { id: 'cf-collection-year', key: 'collection_year', label_ar: 'سنة الإصدار', label_en: 'Collection Release Year', field_type: 'number', is_required: false, default_value: '2026' },
  { id: 'cf-designer', key: 'designer_name', label_ar: 'اسم المصمم الفني', label_en: 'Lead Artisan / Designer', field_type: 'text', is_required: false, placeholder_ar: 'م. باهر إبراهيم', placeholder_en: 'Baher Ibrahim Studio' },
  { id: 'cf-certificate', key: 'certificate_number', label_ar: 'رقم شهادة النقاء الجمركية', label_en: 'Hallmark Certificate No.', field_type: 'text', is_required: false, placeholder_ar: 'EGY-SIL-2026-XXXX', placeholder_en: 'EGY-SIL-2026-XXXX' },
];

export const PRODUCT_TEMPLATES: ProductTemplate[] = [
  { 
    id: 'tmpl-ring', 
    slug: 'ring-template', 
    name_ar: 'قالب خواتم الفضة (Rings Template)', 
    name_en: 'Silver Rings Template',
    icon: 'Disc',
    default_category_id: 'cat-rings',
    default_attributes: ['material', 'purity', 'stone_type', 'stone_color', 'finish'],
    required_custom_fields: ['warranty_period', 'origin_country', 'certificate_number'],
    suggested_specifications: [
      { key_ar: 'مقاس الخاتم القياسي', key_en: 'Standard Ring Size', default_val: 'US 7 / EU 54' },
      { key_ar: 'طريقة تثبيت الحجر', key_en: 'Stone Setting Type', default_val: 'Prong Setting (تركيب سنون)' },
      { key_ar: 'عرض الإطار السفلي', key_en: 'Band Width', default_val: '3.5 mm' }
    ]
  },
  { 
    id: 'tmpl-necklace', 
    slug: 'necklace-template', 
    name_ar: 'قالب سلاسل وقلائد الفضة (Necklace Template)', 
    name_en: 'Silver Necklace Template',
    icon: 'Link',
    default_category_id: 'cat-necklaces',
    default_attributes: ['material', 'purity', 'finish', 'supplier'],
    required_custom_fields: ['warranty_period', 'designer_name'],
    suggested_specifications: [
      { key_ar: 'طول السلسلة الرئيسي', key_en: 'Chain Length', default_val: '45 cm + 5 cm extension' },
      { key_ar: 'نوع المشبك', key_en: 'Clasp Type', default_val: 'Lobster Claw (مشبك قفل)' },
      { key_ar: 'قابلية تعديل الطول', key_en: 'Adjustable Extension', default_val: 'Yes (نعم)' }
    ]
  },
  { 
    id: 'tmpl-bracelet', 
    slug: 'bracelet-template', 
    name_ar: 'قالب أسورة وأنسجة الفضة (Bracelet Template)', 
    name_en: 'Silver Bracelet Template',
    icon: 'Circle',
    default_category_id: 'cat-bracelets',
    default_attributes: ['material', 'purity', 'stone_type', 'finish'],
    required_custom_fields: ['warranty_period', 'certificate_number'],
    suggested_specifications: [
      { key_ar: 'محيط الأسورة', key_en: 'Wrist Inner Circumference', default_val: '18 cm' },
      { key_ar: 'سمك الحلقات', key_en: 'Link Diameter', default_val: '4.0 mm' }
    ]
  },
  { 
    id: 'tmpl-pendant', 
    slug: 'pendant-template', 
    name_ar: 'قالب دلايات وميداليات الفضة (Pendant Template)', 
    name_en: 'Silver Pendant Template',
    icon: 'Sparkles',
    default_category_id: 'cat-pendants',
    default_attributes: ['material', 'purity', 'stone_type', 'stone_color', 'finish'],
    required_custom_fields: ['origin_country', 'certificate_number'],
    suggested_specifications: [
      { key_ar: 'أبعاد الدلاية (طول×عرض)', key_en: 'Pendant Dimensions', default_val: '25 mm x 18 mm' },
      { key_ar: 'قطر الحلقة العلوية', key_en: 'Bail Inner Diameter', default_val: '5.0 mm' }
    ]
  }
];
