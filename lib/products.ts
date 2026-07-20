import { Product } from './types';

export const products: Product[] = [
  {
    id: 'p1',
    name: { en: 'Classic Silver Ring', ar: 'خاتم فضة كلاسيكي' },
    price: 120,
    image: 'https://images.unsplash.com/photo-1605100804763-247f6612d543?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    category: 'rings',
    isNew: true,
    isBestSeller: true,
    isHandmade: true
  },
  {
    id: 'p2',
    name: { en: 'Elegance Drop Earrings', ar: 'أقراط قطرة الأناقة' },
    price: 95,
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    category: 'earrings',
    isLimited: true
  },
  {
    id: 'p3',
    name: { en: 'Minimalist Chain Necklace', ar: 'قلادة سلسلة بسيطة' },
    price: 150,
    image: 'https://images.unsplash.com/photo-1599643478514-4a4204b41b18?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    category: 'necklaces',
    isBestSeller: true
  },
  {
    id: 'p4',
    name: { en: 'Sparkling Zircon Bracelet', ar: 'سوار زركون متلألئ' },
    price: 110,
    image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    category: 'bracelets',
    isNew: true
  },
  {
    id: 'p5',
    name: { en: 'Royal Crown Ring', ar: 'خاتم التاج الملكي' },
    price: 180,
    image: 'https://images.unsplash.com/photo-1605100804763-247f6612d543?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    category: 'rings',
    isBestSeller: true,
    isHandmade: true
  },
  {
    id: 'p6',
    name: { en: 'Pearl Drop Necklace', ar: 'قلادة لؤلؤة' },
    price: 165,
    image: 'https://images.unsplash.com/photo-1599643478514-4a4204b41b18?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    category: 'necklaces',
    isLimited: true
  },
  {
    id: 'p7',
    name: { en: 'Interlocked Silver Bangle', ar: 'إسورة فضية متداخلة' },
    price: 140,
    image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    category: 'bracelets',
    isBestSeller: true
  },
  {
    id: 'p8',
    name: { en: 'Crystal Stud Earrings', ar: 'أقراط كريستال صغيرة' },
    price: 85,
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    category: 'earrings',
    isNew: true
  }
];

export function getFeaturedProducts() {
  return products.slice(0, 8);
}

export function getNewArrivals() {
  return products.filter(p => p.isNew).slice(0, 8);
}

export function getBestSellers() {
  return products.filter(p => p.isBestSeller).slice(0, 8);
}
