import { OrderSuccessClient } from './OrderSuccessClient';

export default async function OrderSuccessPage({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>;
}) {
  const { locale, orderId } = await params;
  const resolvedLocale = locale === 'ar' ? 'ar' : 'en';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <OrderSuccessClient orderIdParam={orderId} locale={resolvedLocale} />
    </div>
  );
}
