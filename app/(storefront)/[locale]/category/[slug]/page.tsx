import { getProductsByCategory } from "@/lib/products";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Filters from "@/components/product/Filters";
import Sorting from "@/components/product/Sorting";
import ProductGridClient from "@/components/product/ProductGridClient";

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

// Simple title capitalization
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default async function CategoryPLP({ params, searchParams }: PageProps) {
  const { locale, slug } = await params;
  const resolvedSearchParams = await searchParams;
  
  // Fetch products
  let products = getProductsByCategory(slug);

  // Handle mock sorting if searchParams.sort exists
  if (resolvedSearchParams.sort === 'price-asc') {
    products = [...products].sort((a, b) => a.price - b.price);
  } else if (resolvedSearchParams.sort === 'price-desc') {
    products = [...products].sort((a, b) => b.price - a.price);
  }

  const categoryName = capitalize(slug.replace(/-/g, ' '));
  
  // Fallback for translation if dictionary is not used
  const title = categoryName;

  const breadcrumbItems = [
    { label: "Home", href: `/${locale}` },
    { label: title, href: `/${locale}/category/${slug}` }
  ];

  return (
    <div className="min-h-screen bg-white pt-24 pb-16">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-12">
          <Breadcrumbs items={breadcrumbItems} />
          <div className="mt-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-serif text-gray-900 mb-4">{title}</h1>
              <p className="text-gray-500">{products.length} products</p>
            </div>
            <div className="flex items-center gap-4">
              <button className="lg:hidden px-4 py-2 border border-gray-200 rounded-full text-sm font-medium">
                Filters
              </button>
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
              <div className="py-24 text-center">
                <h3 className="text-2xl font-serif text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-500">Try adjusting your filters or search.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
