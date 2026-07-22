import { CMSBuilderClient } from './CMSBuilderClient';

export default async function CMSAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const resolvedLocale = locale === 'ar' ? 'ar' : 'en';

  return (
    <div className="min-h-screen bg-slate-950 pb-20 text-slate-100">
      <CMSBuilderClient locale={resolvedLocale} />
    </div>
  );
}
