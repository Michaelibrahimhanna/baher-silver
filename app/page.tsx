import { getDictionary } from '@/lib/dictionary';
import { Hero } from '@/components/home/Hero';
import { FeaturedCollection } from '@/components/home/FeaturedCollection';

export default async function RootPage() {
  const locale = 'en';
  const dict = await getDictionary(locale);

  return (
    <>
      <Hero dict={dict} />
      <FeaturedCollection dict={dict} locale={locale} />
    </>
  );
}
