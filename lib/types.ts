export interface ProductVariant {
  id: string;
  name: { en: string; ar: string };
  color?: string; // hex code for swatches
}

export interface ProductDetails {
  description?: { en: string; ar: string };
  materials?: { en: string; ar: string }[];
  careGuide?: { en: string; ar: string };
  shippingReturns?: { en: string; ar: string };
  certificate?: { en: string; ar: string };
}

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'MADE_TO_ORDER';

export interface Product {
  id: string;
  slug: string;
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
