import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cmsService } from '@/lib/services/cms';

export default async function JournalArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const isAr = locale === 'ar';
  const post = cmsService.getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="max-w-4xl mx-auto px-4 py-12 space-y-8 text-slate-800 dark:text-slate-100">
      <div className="space-y-4 text-center">
        <span className="px-3 py-1 bg-amber-500/10 text-amber-500 text-xs font-bold uppercase tracking-wider rounded-full">
          {post.category}
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
          {isAr ? post.title.ar : post.title.en}
        </h1>
        <div className="flex justify-center items-center gap-4 text-xs text-slate-400 font-mono">
          <span>By {post.author}</span>
          <span>•</span>
          <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg space-y-6 leading-relaxed text-sm">
        <p className="text-base font-semibold text-amber-500">
          {isAr ? post.excerpt.ar : post.excerpt.en}
        </p>
        <div className="space-y-4 text-slate-600 dark:text-slate-300">
          <p>{isAr ? post.content.ar : post.content.en}</p>
        </div>

        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span key={tag} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-mono">
              #{tag}
            </span>
          ))}
        </div>
      </div>

      <div className="text-center pt-4">
        <Link
          href={`/${locale}/journal`}
          className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors inline-block"
        >
          {isAr ? '← العودة إلى قائمة المقالات' : '← Back to Journal'}
        </Link>
      </div>
    </article>
  );
}
