import { AccordionCheckout } from '@/components/checkout/AccordionCheckout';

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const resolvedLocale = locale === 'ar' ? 'ar' : 'en';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      <AccordionCheckout locale={resolvedLocale} />
    </div>
  );
}
