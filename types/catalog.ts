export type ProductStatus = 'draft' | 'published' | 'archived';
export type VisibilityStatus = 'public' | 'hidden';
export type PublishingStatus = 'immediate' | 'scheduled';

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
  slug: string;
  name_ar: string;
  name_en: string;
  description_ar?: string;
  description_en?: string;
  story_ar?: string;
  story_en?: string;
  status: ProductStatus;
  visibility: VisibilityStatus;
  publishing_status: PublishingStatus;
  featured: boolean;
  best_seller: boolean;
  new_arrival: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;

  // Relations
  brand?: Pick<Brand, 'name_en'> | null;
  material?: Pick<Material, 'name_en'> | null;
  variants?: ProductVariant[];
}
