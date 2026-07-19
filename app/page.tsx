import { getDictionary } from '@/lib/dictionary';
import { Hero } from '@/components/home/Hero';
import { Categories } from '@/components/home/Categories';
import { FeaturedCollection } from '@/components/home/FeaturedCollection';
import { LuxuryBanner } from '@/components/home/LuxuryBanner';
import { NewArrivals } from '@/components/home/NewArrivals';
import { BestSellers } from '@/components/home/BestSellers';
import { AboutBaher } from '@/components/home/AboutBaher';
import { InstagramGallery } from '@/components/home/InstagramGallery';
import { Newsletter } from '@/components/home/Newsletter';

export default async function RootPage() {
  const locale = 'en';
  const dict = await getDictionary(locale);

  return (
    <>
      <Hero dict={dict} />
      <Categories dict={dict} locale={locale} />
      <FeaturedCollection dict={dict} locale={locale} />
      <LuxuryBanner dict={dict} />
      <NewArrivals dict={dict} locale={locale} />
      <BestSellers dict={dict} locale={locale} />
      <AboutBaher dict={dict} />
      <InstagramGallery dict={dict} />
      <Newsletter dict={dict} />
    </>
  );
}
