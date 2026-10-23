import type { IndividualPiece } from '@/lib/types';

export type ProductStatus = 'draft' | 'published' | 'hidden' | 'archived' | 'out_of_stock' | 'coming_soon' | 'pre_order' | 'discontinued';
export type VisibilityStatus = 'public' | 'hidden';
export type PublishingStatus = 'immediate' | 'scheduled';
export type ProductProfileType = 'SILVER_JEWELRY' | 'NON_SILVER_RETAIL';
export type SilverPurity = '800' | '900' | '925' | '950' | '999';
export type GenderTarget = 'women' | 'men' | 'unisex';

export interface Brand {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  logo_path?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface Material {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  type?: 'raw_material' | 'packaging' | 'consumable';
  purity?: string | null;
  unit_id?: string | null;
  standard_cost?: number;
  last_purchase_cost?: number;
  average_cost?: number;
  market_cost?: number;
  min_stock?: number;
  supplier_id?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface Category {
  id: string;
  parent_id?: string | null;
  slug: string;
  name_ar: string;
  name_en: string;
  description_ar?: string;
  description_en?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface Collection {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  description_ar?: string;
  description_en?: string;
  start_date?: string;
  end_date?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

// Master Data System Interfaces
export interface MasterEntity {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  code?: string;
  description_ar?: string;
  description_en?: string;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
}

export interface MasterPurityLevel extends MasterEntity {
  purity_value: number; // e.g. 0.925
}

export interface MasterStoneType extends MasterEntity {
  hardness_mohs?: number;
}

export interface MasterSupplier extends MasterEntity {
  email?: string;
  phone?: string;
  country?: string;
}

export interface MasterWarehouse extends MasterEntity {
  location_code?: string;
  capacity?: number;
}

// Dynamic Custom Fields
export interface CustomFieldDefinition {
  id: string;
  key: string;
  label_ar: string;
  label_en: string;
  field_type: 'text' | 'number' | 'select' | 'boolean' | 'date';
  options?: string[]; // for select type
  is_required: boolean;
  default_value?: string;
  placeholder_ar?: string;
  placeholder_en?: string;
}

export interface ProductCustomFieldValue {
  field_id: string;
  key: string;
  value: string | number | boolean;
}

// Dynamic Product Templates
export interface ProductTemplate {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  icon?: string;
  default_category_id?: string;
  default_attributes?: string[];
  required_custom_fields?: string[];
  suggested_specifications?: { key_ar: string; key_en: string; default_val?: string }[];
}

// Dynamic Key/Value Specifications (Shopify style)
export interface ProductSpecification {
  id: string;
  key_ar: string;
  key_en: string;
  value_ar: string;
  value_en: string;
}

// Formula Pricing Engine Model
export interface PricingFormula {
  id: string;
  name_ar: string;
  name_en: string;
  expression: string; // e.g. "(silver_weight * live_silver_spot * purity) + stone_cost + manufacturing + labor + packaging + overhead + profit"
  is_default: boolean;
  variables: {
    silver_weight: number;
    live_silver_spot: number;
    purity: number;
    stone_cost: number;
    manufacturing: number;
    labor: number;
    packaging: number;
    overhead: number;
    profit_margin_percent: number;
  };
}

// Product Relations
export type RelationType = 'related' | 'bought_together' | 'matching_collection' | 'accessory' | 'replacement';

export interface ProductRelationItem {
  id: string;
  target_product_id: string;
  target_product_sku: string;
  target_product_name_ar: string;
  target_product_name_en: string;
  target_product_image?: string;
  target_product_price?: number;
  relation_type: RelationType;
}

// Dual QR Codes Model
export interface DualQRCodes {
  internal_qr: {
    code: string;
    payload: string; // SKU, Stock, Location
    destination_type: 'inventory_scan' | 'staff_app';
  };
  customer_qr: {
    code: string;
    payload: string; // URL based on destination type
    destination_type: 'product_page' | 'memories' | 'verify' | 'warranty' | 'repair_history';
    custom_destination_url?: string;
  };
}

// Printable Label Preset
export type LabelPresetType = 'a4_sheet' | 'thermal_50x30' | 'zebra_30x20';

export interface LabelPreset {
  id: LabelPresetType;
  name: string;
  cols: number;
  rows: number;
  width_mm: number;
  height_mm: number;
  shows_qr: boolean;
  shows_barcode: boolean;
  shows_price: boolean;
}

// Activity Log Model
export interface ProductActivityLog {
  id: string;
  product_id: string;
  actor_name: string;
  actor_role: string;
  action_type: 'create' | 'update' | 'price_change' | 'stock_change' | 'status_change' | 'duplicate';
  description_ar: string;
  description_en: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  barcode?: string;
  internal_qr?: string;
  customer_qr?: string;
  weight?: number;
  length?: number;
  size?: string;
  color?: string;
  stone?: string;
  plating?: string;
  pricing_strategy: 'manual' | 'smart' | 'formula';
  regular_price: number;
  sale_price?: number;
  price_adjustment?: number;
  current_stock: number;
  status: ProductStatus;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  product?: { name_en: string };
}

// Product Version History Model
export interface ProductVersion {
  version_id: string;
  product_id: string;
  version_number: number;
  snapshot: Product;
  created_at: string;
  created_by: string;
  change_summary?: string;
}

// Approval Workflow Architecture Models
export type ApprovalRole = 'editor' | 'reviewer' | 'publisher';
export type WorkflowState = 'draft' | 'pending_review' | 'changes_requested' | 'approved' | 'published' | 'rejected';

export interface WorkflowHistoryEntry {
  id: string;
  from_state: WorkflowState;
  to_state: WorkflowState;
  actor_role: ApprovalRole;
  actor_id: string;
  actor_name: string;
  comments?: string;
  timestamp: string;
}

export interface ProductApprovalWorkflow {
  current_state: WorkflowState;
  assigned_editor_id?: string;
  assigned_reviewer_id?: string;
  assigned_publisher_id?: string;
  history: WorkflowHistoryEntry[];
}

// AI Product Health Score Models
export interface HealthScoreBreakdown {
  seo: number;           // 0-15
  pricing: number;       // 0-20
  description: number;   // 0-20
  specifications: number;// 0-15
  variants: number;      // 0-15
  completeness: number;  // 0-10
  media: number;         // 0-5
}

export interface HealthScoreResult {
  overallScore: number;  // 0-100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  breakdown: HealthScoreBreakdown;
  recommendations: string[];
}

// Dynamic QR Router Destinations
export type QRDestinationType = 
  | 'product' 
  | 'warranty' 
  | 'authentication' 
  | 'repair' 
  | 'certificate' 
  | 'memories' 
  | 'events'
  | 'video_messages'
  | 'gift_pages'
  | 'future_services';

export interface QRRouterConfig {
  qr_code: string;
  router_token: string;
  destination_type: QRDestinationType;
  custom_target_url?: string;
  is_active: boolean;
  scan_count: number;
  created_at: string;
}

export interface Product {
  id: string;
  brand_id?: string | null;
  material_id?: string | null;
  category_id?: string | null;
  subcategory_id?: string | null;
  collection_id?: string | null;
  template_id?: string | null;
  profile_type?: ProductProfileType;
  slug: string;
  sku: string;
  barcode?: string;
  is_serialized?: boolean;
  pieces?: IndividualPiece[];
  internal_qr?: string;
  customer_qr?: string;
  qr_destination_type?: QRDestinationType;
  qr_router_config?: QRRouterConfig;
  
  // Names & Descriptions
  name_ar: string;
  name_en: string;
  short_description_ar?: string;
  short_description_en?: string;
  description_ar?: string;
  description_en?: string;
  internal_notes?: string; // Staff only note
  story_ar?: string;
  story_en?: string;
  
  // Classification & Master References
  category_name?: string;
  collection_name?: string;
  material_name?: string;
  stone_type_id?: string;
  stone_color_id?: string;
  purity_level_id?: string;
  finish_id?: string;
  supplier_id?: string;
  gender?: GenderTarget;
  tags?: string[];
  
  // Custom Fields & Dynamic Specs
  custom_fields?: ProductCustomFieldValue[];
  specifications?: ProductSpecification[];
  
  // Silver Data & Costs
  silver_purity?: SilverPurity;
  silver_weight_g?: number;
  stone_weight_g?: number;
  total_weight_g?: number;
  
  // Formula Costing & Pricing
  pricing_formula_id?: string;
  labor_cost?: number;
  stone_cost?: number;
  manufacturing_cost?: number;
  silver_cost?: number;
  packaging_cost?: number;
  overhead_cost?: number;
  other_costs?: number;
  purchase_cost?: number;
  profit_margin_percent?: number;
  
  // Prices
  selling_price: number;
  sale_price?: number;
  discount_percent?: number;
  profit?: number;
  
  // Inventory
  current_stock: number;
  min_stock?: number;
  max_stock?: number;
  warehouse?: string;
  warehouse_id?: string;
  
  // Media Placeholder Data
  primary_image: string;
  media_urls?: string[];
  three_sixty_urls?: string[];
  video_url?: string;
  reels_url?: string;
  youtube_url?: string;
  
  // SEO
  meta_title?: string;
  meta_description?: string;
  keywords?: string[];
  og_image?: string;
  
  // Status & Badges
  status: ProductStatus;
  visibility: VisibilityStatus;
  publishing_status: PublishingStatus;
  featured: boolean;
  best_seller: boolean;
  new_arrival: boolean;
  limited_edition?: boolean;
  is_handmade?: boolean;

  // Enterprise Architecture Capabilities
  version_history?: ProductVersion[];
  workflow_state?: WorkflowState;
  workflow?: ProductApprovalWorkflow;
  health_score?: HealthScoreResult;
  is_soft_deleted?: boolean;
  
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;

  // Relations & Extras
  brand?: string | Pick<Brand, 'name_en'> | null;
  model_number?: string;
  warranty_period?: string;
  material_description?: string;
  package_weight_grams?: number;
  tax_classification?: string;
  material?: Pick<Material, 'name_en'> | null;
  variants?: ProductVariant[];
  relations?: ProductRelationItem[];
  activity_logs?: ProductActivityLog[];
}


