import Link from 'next/link';
import { cmsService } from '@/lib/services/cms';

export default async function JournalListingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === 'ar';
  const posts = cmsService.getBlogPosts();

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-8 text-slate-800 dark:text-slate-100">
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <h1 className="text-4xl font-extrabold tracking-tight">
          {isAr ? 'مجلة باهر للفضة والدليل الإرشادي' : 'The Baher Journal & Editorial'}
        </h1>
        <p className="text-xs text-slate-500">
          {isAr ? 'مقالات وأدلة العناية بالفخامة الفضية عيار 925' : 'Stories, care guides, and silver craftsmanship insights.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {posts.map((post) => (
          <div key={post.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between">
            <div className="p-6 space-y-3">
              <span className="px-3 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase tracking-wider rounded-full">
                {post.category}
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {isAr ? post.title.ar : post.title.en}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                {isAr ? post.excerpt.ar : post.excerpt.en}
              </p>
            </div>
            <div className="p-6 pt-0 flex justify-between items-center text-xs border-t border-slate-100 dark:border-slate-800/60 mt-4">
              <span className="text-slate-400 font-mono">{post.author}</span>
              <Link
                href={`/${locale}/journal/${post.slug}`}
                className="font-bold text-amber-500 hover:text-amber-600 transition-colors"
              >
                {isAr ? 'اقرأ المقال كامل' : 'Read Article →'}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
