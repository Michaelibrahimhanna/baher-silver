import { getProductsByCategory } from "@/lib/products";
import { categories } from "@/lib/categories";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Filters from "@/components/product/Filters";
import Sorting from "@/components/product/Sorting";
import ProductGridClient from "@/components/product/ProductGridClient";
import { getDictionary } from "@/lib/dictionary";

interface PageProps {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
  searchParams: Promise<{
    sort?: string;
    [key: string]: string | string[] | undefined;
  }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { locale, slug } = await params;
  const isAr = locale === 'ar';
  const categoryObj = categories.find(c => c.slug === slug);
  const title = categoryObj ? categoryObj.name[locale as 'en' | 'ar'] : slug;

  return {
    title: `${title} | ${isAr ? 'باهر سيلفر' : 'Baher Silver'}`,
    description: isAr ? `تسوق أفضل قطع ${title} من الفضة عيار 925` : `Explore fine 925 sterling silver ${title}.`,
  };
}

export default async function CategoryPLP({ params, searchParams }: PageProps) {
  const { locale: rawLocale, slug } = await params;
  const locale = (rawLocale === 'ar' ? 'ar' : 'en') as 'en' | 'ar';
  const resolvedSearchParams = await searchParams;
  const dict = await getDictionary(locale);

  let products = getProductsByCategory(slug);

  if (resolvedSearchParams.sort === 'price-asc') {
    products = [...products].sort((a, b) => a.price - b.price);
  } else if (resolvedSearchParams.sort === 'price-desc') {
    products = [...products].sort((a, b) => b.price - a.price);
  }

  const categoryObj = categories.find(c => c.slug === slug);
  const title = categoryObj ? categoryObj.name[locale] : slug.replace(/-/g, ' ');

  const breadcrumbItems = [
    { label: dict.header?.home || (locale === 'ar' ? 'الرئيسية' : 'Home'), href: `/${locale}` },
    { label: title, href: `/${locale}/category/${slug}` }
  ];

  return (
    <div className="min-h-screen bg-background pt-32 pb-24 text-foreground">
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-12">
        
        {/* Header */}
        <div className="mb-12">
          <Breadcrumbs items={breadcrumbItems} />
          <div className="mt-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-serif text-primary capitalize">{title}</h1>
              <p className="text-muted-foreground text-sm mt-2">
                {products.length} {locale === 'ar' ? 'منتج متاح' : 'products available'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Sorting />
            </div>
          </div>
        </div>

        {/* Layout with Sidebar */}
        <div className="flex gap-x-12">
          <Filters />
          
          <div className="flex-1">
            {products.length > 0 ? (
              <ProductGridClient products={products} locale={locale} />
            ) : (
              <div className="py-24 text-center border border-white/10 rounded-sm bg-secondary/10">
                <h3 className="text-2xl font-serif text-primary mb-2">
                  {locale === 'ar' ? 'لا توجد منتجات' : 'No products found'}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {locale === 'ar' ? 'جرب تغيير تصفية المنتجات أو البحث.' : 'Try adjusting your filters or search.'}
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
