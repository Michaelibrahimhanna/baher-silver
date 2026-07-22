import { Product } from './types';

export const products: Product[] = [
  {
    id: 'p1',
    slug: 'classic-silver-ring',
    name: { en: 'Classic 925 Silver Ring', ar: 'خاتم فضة كلاسيكي عيار 925' },
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
      description: { en: 'A timeless classic, meticulously handcrafted from 925 sterling silver. This ring is designed to be worn every day, offering both elegance and durability.', ar: 'خاتم كلاسيكي خالد، مصنوع يدوياً بعناية من الفضة عيار 925 ليعكس الأناقة والمتانة.' },
      materials: [
        { en: '925 Sterling Silver', ar: 'فضة إسترليني عيار 925' },
        { en: 'Rhodium Plating for anti-tarnish', ar: 'طلاء روديوم حامي من التآكل والبريق' }
      ],
      careGuide: { en: 'Keep away from moisture. Store in the provided Baher Silver pouch when not in use.', ar: 'احفظه بعيداً عن الرطوبة. خزنه في حقيبة باهر سيلفر المخملية.' },
      shippingReturns: { en: 'Free worldwide shipping on orders over $200. 30-day return policy.', ar: 'شحن مجاني عالمياً للطلبات فوق 200 دولار. سياسة إرجاع لمدة 30 يوماً.' },
      certificate: { en: 'Includes Baher Silver Authenticity Certificate.', ar: 'يتضمن شهادة أصالة مشفرة من باهر سيلفر.' }
    }
  },
  {
    id: 'p2',
    slug: 'elegance-drop-earrings',
    name: { en: 'Elegance Drop Earrings', ar: 'أقراط قطرة الأناقة الملكية' },
    price: 95,
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    category: 'earrings',
    stockStatus: 'IN_STOCK',
    isLimited: true,
    isNew: true,
    details: {
      description: { en: 'Minimalist drop earrings that catch the light perfectly with subtle zircon embellishments.', ar: 'أقراط قطرة راقية تلتقط الضوء بشكل مثالي مرصعة بلمسات زركون ساحرة.' },
      materials: [{ en: '925 Sterling Silver', ar: 'فضة إسترليني عيار 925' }],
      careGuide: { en: 'Wipe with a soft cloth after use.', ar: 'امسح بقطعة قماش ناعمة بعد الاستخدام.' },
      shippingReturns: { en: 'Standard 3-5 days delivery.', ar: 'توصيل قياسي خلال 3-5 أيام.' },
      certificate: { en: 'Authenticity Certificate included.', ar: 'شهادة أصالة متضمنة.' }
    }
  },
  {
    id: 'p3',
    slug: 'minimalist-chain-necklace',
    name: { en: 'Minimalist Chain Necklace', ar: 'قلادة سلسلة بسيطة أنيقة' },
    price: 150,
    image: 'https://images.unsplash.com/photo-1599643478514-4a4204b41b18?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    category: 'necklaces',
    stockStatus: 'IN_STOCK',
    isBestSeller: true,
    details: {
      description: { en: 'Sleek 925 silver chain necklace designed for layered or standalone perfection.', ar: 'قلادة سلسلة فضة 925 أنيقة ناعمة مصممة للارتداء المزدوج أو المنفرد.' },
      materials: [{ en: '925 Sterling Silver', ar: 'فضة عيار 925' }],
      careGuide: { en: 'Store flat to prevent tangling.', ar: 'احفظها مفرودة لمنع التشابك.' }
    }
  },
  {
    id: 'p4',
    slug: 'sparkling-zircon-bracelet',
    name: { en: 'Sparkling Zircon Bracelet', ar: 'سوار زركون ملكي متلألئ' },
    price: 110,
    image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    category: 'bracelets',
    stockStatus: 'IN_STOCK',
    isNew: true,
    isHandmade: true,
    details: {
      description: { en: 'Exquisite silver bracelet inlaid with brilliant zircon stones for evening sophistication.', ar: 'سوار فضي فاخر مرصع بأحجار الزركون المتلألئة لإطلالة ملفتة في المناسبات.' },
      materials: [{ en: '925 Sterling Silver & AAA Zircon', ar: 'فضة عيار 925 وأحجار زركون AAA' }]
    }
  },
  {
    id: 'p5',
    slug: 'royal-solitaire-ring',
    name: { en: 'Royal Solitaire Silver Ring', ar: 'خاتم سولتير ملكي فاخر' },
    price: 180,
    image: 'https://images.unsplash.com/photo-1605100804763-247f6612d543?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    category: 'rings',
    stockStatus: 'IN_STOCK',
    isBestSeller: true,
    details: {
      description: { en: 'A majestic solitaire ring featuring a high-brilliance focal crystal mounted on 925 silver.', ar: 'خاتم سولتير فاخر بحجر كريستالي براق مرصع على قاعدة من الفضة عيار 925.' }
    }
  },
  {
    id: 'p6',
    slug: 'heritage-pendant-necklace',
    name: { en: 'Heritage Pendant Necklace', ar: 'قلادة دلاية التراث العريق' },
    price: 165,
    image: 'https://images.unsplash.com/photo-1599643478514-4a4204b41b18?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    category: 'necklaces',
    stockStatus: 'IN_STOCK',
    isHandmade: true,
    details: {
      description: { en: 'Artisanal silver pendant necklace with engraved heritage motifs.', ar: 'قلادة دلاية فضية مصنوعة يدوياً بنقوش تراثية عريقة.' }
    }
  },
  {
    id: 'p7',
    slug: 'luxe-silver-bangle',
    name: { en: 'Luxe Silver Cuff Bangle', ar: 'سوار كاف فضة فاخر' },
    price: 140,
    image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    category: 'bracelets',
    stockStatus: 'IN_STOCK',
    isLimited: true,
    details: {
      description: { en: 'Solid sterling silver cuff bangle polished to a mirror finish.', ar: 'سوار كاف مصمت من الفضة الإسترليني مصقول بعناية فائقة.' }
    }
  },
  {
    id: 'p8',
    slug: 'crystal-stud-earrings',
    name: { en: 'Crystal Stud Silver Earrings', ar: 'أقراط ستاد كريستال ناعمة' },
    price: 75,
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    category: 'earrings',
    stockStatus: 'IN_STOCK',
    isNew: true,
    details: {
      description: { en: 'Charming crystal stud earrings designed for everyday minimalist elegance.', ar: 'أقراط ستاد ناعمة مرصعة ببلورات براقة صممت للأناقة اليومية.' }
    }
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
