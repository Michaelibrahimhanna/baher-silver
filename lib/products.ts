import { Product } from './types';

export const products: Product[] = [
  {
    id: 'p1',
    slug: 'classic-silver-ring',
    name: { en: 'Classic Silver Ring', ar: 'خاتم فضة كلاسيكي' },
    price: 120,
    image: 'https://images.unsplash.com/photo-1605100804763-247f6612d543?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1605100804763-247f6612d543?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    ],
    category: 'rings',
    stockStatus: 'IN_STOCK',
    isNew: true,
    isBestSeller: true,
    isHandmade: true,
    variants: [
      { id: 'v1', name: { en: 'Silver', ar: 'فضة' }, color: '#C0C0C0' },
      { id: 'v2', name: { en: 'Gold Plated', ar: 'مطلي بالذهب' }, color: '#FFD700' }
    ],
    details: {
      description: { en: 'A timeless classic, meticulously handcrafted from 925 sterling silver. This ring is designed to be worn every day, offering both elegance and durability.', ar: 'خاتم كلاسيكي خالد، مصنوع يدوياً بعناية من الفضة عيار 925.' },
      materials: [
        { en: '925 Sterling Silver', ar: 'فضة إسترليني عيار 925' },
        { en: 'Rhodium Plating for anti-tarnish', ar: 'طلاء روديوم لمنع البريق' }
      ],
      careGuide: { en: 'Keep away from moisture. Store in the provided Baher Silver pouch when not in use.', ar: 'احفظه بعيداً عن الرطوبة. خزنه في حقيبة باهر سيلفر.' },
      shippingReturns: { en: 'Free worldwide shipping on orders over $200. 30-day return policy.', ar: 'شحن مجاني عالمياً للطلبات فوق 200 دولار. سياسة إرجاع لمدة 30 يوماً.' },
      certificate: { en: 'Includes Baher Silver Authenticity Certificate.', ar: 'يتضمن شهادة أصالة من باهر سيلفر.' }
    }
  },
  {
    id: 'p2',
    slug: 'elegance-drop-earrings',
    name: { en: 'Elegance Drop Earrings', ar: 'أقراط قطرة الأناقة' },
    price: 95,
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    category: 'earrings',
    stockStatus: 'LOW_STOCK',
    isLimited: true,
    details: {
      description: { en: 'Minimalist drop earrings that catch the light perfectly.', ar: 'أقراط قطرة بسيطة تلتقط الضوء بشكل مثالي.' },
      materials: [{ en: '925 Sterling Silver', ar: 'فضة عيار 925' }],
      careGuide: { en: 'Wipe with a soft cloth after use.', ar: 'امسح بقطعة قماش ناعمة بعد الاستخدام.' },
      shippingReturns: { en: 'Standard 3-5 days delivery.', ar: 'توصيل قياسي 3-5 أيام.' },
      certificate: { en: 'Authenticity Certificate included.', ar: 'شهادة الأصالة متضمنة.' }
    }
  },
  {
    id: 'p3',
    slug: 'minimalist-chain-necklace',
    name: { en: 'Minimalist Chain Necklace', ar: 'قلادة سلسلة بسيطة' },
    price: 150,
    image: 'https://images.unsplash.com/photo-1599643478514-4a4204b41b18?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    category: 'necklaces',
    stockStatus: 'OUT_OF_STOCK',
    isBestSeller: true
  },
  {
    id: 'p4',
    slug: 'sparkling-zircon-bracelet',
    name: { en: 'Sparkling Zircon Bracelet', ar: 'سوار زركون متلألئ' },
    price: 110,
    image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    category: 'bracelets',
    stockStatus: 'MADE_TO_ORDER',
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

export function getProductBySlug(slug: string): Product | undefined {
  return products.find(p => p.slug === slug);
}

export function getProductsByCategory(categorySlug: string): Product[] {
  return products.filter(p => p.category === categorySlug);
}

export function searchProducts(query: string): Product[] {
  const q = query.toLowerCase();
  return products.filter(p => 
    p.name.en.toLowerCase().includes(q) || 
    p.name.ar.includes(q)
  );
}
