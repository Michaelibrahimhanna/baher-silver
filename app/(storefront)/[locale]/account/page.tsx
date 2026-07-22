import { AccountPortalClient } from './AccountPortalClient';

export default async function CustomerAccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const resolvedLocale = locale === 'ar' ? 'ar' : 'en';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      <AccountPortalClient locale={resolvedLocale} />
    </div>
  );
}
