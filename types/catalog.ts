export type ProductStatus = 'draft' | 'published' | 'archived';
export type VisibilityStatus = 'public' | 'hidden';
export type PublishingStatus = 'immediate' | 'scheduled';
export type SilverPurity = '925' | '950' | '999';
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

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  barcode?: string;
  weight?: number;
  length?: number;
  size?: string;
  color?: string;
  stone?: string;
  plating?: string;
  pricing_strategy: 'manual' | 'smart';
  regular_price: number;
  sale_price?: number;
  price_adjustment?: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  product?: { name_en: string };
}

export interface Product {
  id: string;
  brand_id?: string | null;
  material_id?: string | null;
  category_id?: string | null;
  subcategory_id?: string | null;
  collection_id?: string | null;
  slug: string;
  sku: string;
  barcode?: string;
  qr_code?: string;
  
  // Names & Descriptions
  name_ar: string;
  name_en: string;
  short_description_ar?: string;
  short_description_en?: string;
  description_ar?: string;
  description_en?: string;
  story_ar?: string;
  story_en?: string;
  
  // Classification
  category_name?: string;
  collection_name?: string;
  material_name?: string;
  gender?: GenderTarget;
  tags?: string[];
  
  // Silver Data & Weights
  silver_purity?: SilverPurity;
  silver_weight_g?: number;
  stone_weight_g?: number;
  total_weight_g?: number;
  
  // Costs & Margins
  manufacturing_cost?: number;
  silver_cost?: number;
  packaging_cost?: number;
  other_costs?: number;
  purchase_cost?: number;
  
  // Pricing
  selling_price: number;
  sale_price?: number;
  discount_percent?: number;
  profit?: number;
  profit_margin_percent?: number;
  
  // Inventory
  current_stock: number;
  min_stock?: number;
  max_stock?: number;
  warehouse?: string;
  
  // Media
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
  
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;

  // Relations
  brand?: Pick<Brand, 'name_en'> | null;
  material?: Pick<Material, 'name_en'> | null;
  variants?: ProductVariant[];
}
