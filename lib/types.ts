export interface ProductVariant {
  id: string;
  name: { en: string; ar: string };
  color?: string; // hex code for swatches
}

export interface ProductDetails {
  description?: { en: string; ar: string };
  materials?: { en: string; ar: string }[];
  material?: { en: string; ar: string };
  silverWeight?: string;
  careGuide?: { en: string; ar: string };
  shippingReturns?: { en: string; ar: string };
  certificate?: { en: string; ar: string };
}

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'in_stock' | 'low_stock' | 'out_of_stock';

export type PieceLifecycleStatus =
  | 'RAW_MATERIAL'
  | 'IN_PRODUCTION'
  | 'FINISHED_GOODS'
  | 'IN_VAULT'
  | 'IN_SHOWCASE'
  | 'RESERVED'
  | 'SOLD'
  | 'RETURNED'
  | 'MAINTENANCE'
  | 'QUARANTINED'
  | 'SCRAPPED';

export interface IndividualPiece {
  id: string;
  product_id: string;
  variant_id?: string;
  sku: string;
  serial_number: string;
  barcode: string;
  organization_id: string;
  warehouse_id: string;
  location_code: string;
  current_weight_grams: number;
  lifecycle_status: PieceLifecycleStatus;
  manufacturing_order_id?: string;
  wip_lot_id?: string;
  batch_id?: string;
  gemstone_lot_ids?: string[];
  cost_basis: number;
  retail_price: number;
  dpp_passport_id?: string;
  created_at: string;
  updated_at: string;
}

export type ProductProfileType = 'SILVER_JEWELRY' | 'NON_SILVER_RETAIL';

export type SilverPurity = '800' | '900' | '925' | '950' | '999';

export interface Product {
  id: string;
  slug: string;
  sku?: string;
  barcode?: string;
  profile_type?: ProductProfileType;
  is_serialized?: boolean;
  metal?: string;
  purity?: SilverPurity;
  weight_grams?: number;
  labor_cost?: number;
  cost_price?: number;
  selling_price?: number;
  gemstone_ids?: string[];
  organization_id?: string;
  pieces?: IndividualPiece[];
  name: {
    en: string;
    ar: string;
  };
  price: number;
  image: string;
  gallery?: string[]; // Additional images for PDP
  category: string; // matches category slug
  stockStatus?: StockStatus;
  variants?: ProductVariant[];
  details?: ProductDetails;
  isNew?: boolean;
  isBestSeller?: boolean;
  isLimited?: boolean;
  isHandmade?: boolean;

  // Non-Silver Retail Profile Fields (Commercial Merchandise)
  brand?: string;
  model_number?: string;
  warranty_period?: string;
  material_description?: string;
  package_weight_grams?: number;
  tax_classification?: string;
}

export interface Category {
  id: string;
  name: {
    en: string;
    ar: string;
  };
  slug: string;
  image: string;
}
