import { Category } from './types';

export const categories: Category[] = [
  {
    id: 'c1',
    name: {
      en: 'Rings',
      ar: 'خواتم'
    },
    slug: 'rings',
    image: 'https://images.unsplash.com/photo-1605100804763-247f6612d543?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'c2',
    name: {
      en: 'Necklaces',
      ar: 'قلائد'
    },
    slug: 'necklaces',
    image: 'https://images.unsplash.com/photo-1599643478514-4a4204b41b18?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'c3',
    name: {
      en: 'Bracelets',
      ar: 'أساور'
    },
    slug: 'bracelets',
    image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'c4',
    name: {
      en: 'Earrings',
      ar: 'أقراط'
    },
    slug: 'earrings',
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  }
];

export function getAllCategories() {
  return categories;
}
