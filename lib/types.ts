export interface Product {
  id: string;
  name: {
    en: string;
    ar: string;
  };
  price: number;
  image: string;
  category: string;
  isNew?: boolean;
  isBestSeller?: boolean;
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
