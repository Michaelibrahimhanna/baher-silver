export type BlockType =
  | 'hero'
  | 'banner'
  | 'collection_highlight'
  | 'faq'
  | 'testimonial'
  | 'newsletter'
  | 'footer'
  | 'about'
  | 'contact'
  | 'gallery'
  | 'video';

export interface BilingualText {
  en: string;
  ar: string;
}

export interface SEOMetadata {
  metaTitle: BilingualText;
  metaDescription: BilingualText;
  ogImage?: string;
  canonicalUrl?: string;
  keywords?: string[];
}

export interface ContentBlock {
  id: string;
  type: BlockType;
  order: number;
  title?: BilingualText;
  subtitle?: BilingualText;
  body?: BilingualText;
  buttonText?: BilingualText;
  buttonLink?: string;
  imageUrl?: string;
  videoUrl?: string;
  galleryImages?: string[];
  items?: {
    question?: BilingualText;
    answer?: BilingualText;
    authorName?: string;
    authorRole?: string;
    quote?: BilingualText;
    avatarUrl?: string;
  }[];
}

export interface ContentVersion {
  versionId: string;
  createdAt: string;
  createdByName: string;
  blocksSnapshot: ContentBlock[];
}

export type PublishStatus = 'draft' | 'published' | 'scheduled';

export interface CMSPage {
  id: string;
  slug: string; // e.g. 'home', 'about', 'spring-sale'
  title: BilingualText;
  seo: SEOMetadata;
  blocks: ContentBlock[];
  status: PublishStatus;
  scheduledPublishAt?: string;
  versions: ContentVersion[];
  aiPromptMetadata?: {
    lastGeneratedPrompt?: string;
    aiModelUsed?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: BilingualText;
  excerpt: BilingualText;
  content: BilingualText;
  coverImage: string;
  category: string;
  tags: string[];
  author: string;
  publishedAt: string;
  seo: SEOMetadata;
}

class CMSService {
  private pages: Map<string, CMSPage> = new Map();
  private blogPosts: BlogPost[] = [];

  constructor() {
    this.seedDefaultData();
  }

  /**
   * Seed default bilingual homepage composed entirely from CMS blocks
   */
  private seedDefaultData(): void {
    const homePage: CMSPage = {
      id: 'cms-page-home',
      slug: 'home',
      title: { en: 'Baher Silver Homepage', ar: 'الصفحة الرئيسية - باهر للفضة' },
      status: 'published',
      seo: {
        metaTitle: { en: 'Baher Silver | Luxury 925 Silver Jewelry', ar: 'باهر للفضة | مجوهرات فضية فاخرة عيار 925' },
        metaDescription: { en: 'Discover handcrafted luxury 925 sterling silver rings, necklaces, and bracelets in Cairo, Egypt.', ar: 'اكتشف مجوهرات الفضة عيار 925 المصنوعة يدوياً بأناقة في القاهرة.' },
        ogImage: '/images/hero-banner.jpg',
        canonicalUrl: 'https://bahersilver.com/en',
        keywords: ['silver jewelry', '925 sterling', 'cairo luxury'],
      },
      blocks: [
        {
          id: 'blk-hero-1',
          type: 'hero',
          order: 1,
          title: { en: 'Designed To Amaze', ar: 'صُمم ليبهر' },
          subtitle: { en: 'Luxury 925 Silver Jewelry crafted with elegance', ar: 'مجوهرات فضية فاخرة عيار 925 مصممة بأناقة وخبرة' },
          buttonText: { en: 'Shop Collection', ar: 'تسوق التشكيلة' },
          buttonLink: '/category/rings',
          imageUrl: '/images/hero.jpg',
        },
        {
          id: 'blk-coll-1',
          type: 'collection_highlight',
          order: 2,
          title: { en: 'The Royal Collection', ar: 'التشكيلة الملكية' },
          subtitle: { en: 'Timeless Sterling Elegance', ar: 'أناقة فضية خالدة' },
          buttonLink: '/category/necklaces',
        },
        {
          id: 'blk-faq-1',
          type: 'faq',
          order: 3,
          title: { en: 'Frequently Asked Questions', ar: 'الأسئلة الشائعة' },
          items: [
            {
              question: { en: 'Is all jewelry 925 Sterling Silver?', ar: 'هل كل المجوهرات فضة عيار 925 ناصعة؟' },
              answer: { en: 'Yes, every piece is hallmarked authentic 925 sterling silver.', ar: 'نعم، كل قطعة مختومة ومضمونة بأنها فضة عيار 925 أصيلة.' },
            },
            {
              question: { en: 'Do you offer nationwide shipping in Egypt?', ar: 'هل يتوفر الشحن لجميع المحافظات؟' },
              answer: { en: 'Yes, we deliver across all 27 governorates in 24-48 hours.', ar: 'نعم، نوفر التوصيل لجميع المحافظات خلال 24-48 ساعة.' },
            },
          ],
        },
      ],
      versions: [
        {
          versionId: 'v1.0',
          createdAt: new Date().toISOString(),
          createdByName: 'Lead Content Strategist',
          blocksSnapshot: [],
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.pages.set('home', homePage);

    // Seed Demo Blog Article
    this.blogPosts.push({
      id: 'blog-1',
      slug: 'how-to-care-for-925-silver',
      title: { en: 'How to Care for 925 Sterling Silver Jewelry', ar: 'طريقة العناية بمجوهرات الفضة عيار 925 الحقيقية' },
      excerpt: { en: 'Essential tips to maintain the brilliant shine of your sterling silver pieces.', ar: 'نصائح أساسية للحفاظ على بريق ولمعان مجوهراتك الفضية لسنوات.' },
      content: { en: 'Sterling silver is a precious metal that requires gentle care...', ar: 'الفضة الإسترليني عيان 925 معدن نفيس يحتاج إلى عناية خاصة...' },
      coverImage: '/blog/silver-care.jpg',
      category: 'Care Guide',
      tags: ['Silver Care', 'Maintenance', 'Luxury'],
      author: 'Baher Master Jeweler',
      publishedAt: '2026-07-15T00:00:00.000Z',
      seo: {
        metaTitle: { en: 'How to Care for 925 Silver', ar: 'العناية بالفضة عيار 925' },
        metaDescription: { en: 'Learn how to clean and protect sterling silver jewelry.', ar: 'تعلم كيفية تنظيف وحماية الفضة عيار 925.' },
      },
    });
  }

  public getPageBySlug(slug: string): CMSPage | undefined {
    return this.pages.get(slug);
  }

  public savePage(page: CMSPage, editorName = 'Admin Editor'): CMSPage {
    const existing = this.pages.get(page.slug);
    
    // Save version history snapshot before update
    const newVersion: ContentVersion = {
      versionId: `v${(existing?.versions.length || 0) + 1}.0`,
      createdAt: new Date().toISOString(),
      createdByName: editorName,
      blocksSnapshot: JSON.parse(JSON.stringify(page.blocks)),
    };

    const updated: CMSPage = {
      ...page,
      versions: [newVersion, ...(existing?.versions || [])],
      updatedAt: new Date().toISOString(),
    };

    this.pages.set(page.slug, updated);
    return updated;
  }

  public restorePageVersion(slug: string, versionId: string): CMSPage | undefined {
    const page = this.pages.get(slug);
    if (!page) return undefined;

    const version = page.versions.find(v => v.versionId === versionId);
    if (!version) return undefined;

    const restored: CMSPage = {
      ...page,
      blocks: JSON.parse(JSON.stringify(version.blocksSnapshot)),
      updatedAt: new Date().toISOString(),
    };

    this.pages.set(slug, restored);
    return restored;
  }

  public getBlogPosts(): BlogPost[] {
    return this.blogPosts;
  }

  public getBlogPostBySlug(slug: string): BlogPost | undefined {
    return this.blogPosts.find(p => p.slug === slug);
  }

  /**
   * Future AI Content Generation Prompt Simulator
   */
  public generateAIBilingualContentPrompt(topic: string): { en: string; ar: string } {
    return {
      en: `[AI Generated Draft for "${topic}"]: Crafted with precision from solid 925 sterling silver, combining timeless elegance with modern luxury aesthetics.`,
      ar: `[مسودة ذكاء اصطناعي لـ "${topic}"]: صُممت بدقة متناهية من الفضة النقية عيار 925، لتجمع بين الأناقة الخالدة والفخامة العصرية.`,
    };
  }
}

export const cmsService = new CMSService();
