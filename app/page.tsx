import { getDictionary } from '@/lib/dictionary';
import { Hero } from '@/components/home/Hero';
import { FeaturedCollection } from '@/components/home/FeaturedCollection';
import { WhyBaher } from '@/components/home/WhyBaher';
import { BestSellers } from '@/components/home/BestSellers';
import { QRGift } from '@/components/home/QRGift';
import { Reviews } from '@/components/home/Reviews';
import { InstagramGallery } from '@/components/home/InstagramGallery';
import { Newsletter } from '@/components/home/Newsletter';

export default async function RootPage() {
  const locale = 'en';
  const dict = await getDictionary(locale);

  return (
    <>
      <Hero dict={dict} />
      <FeaturedCollection dict={dict} locale={locale} />
      <WhyBaher dict={dict} />
      <BestSellers dict={dict} locale={locale} />
      <QRGift dict={dict} />
      <Reviews dict={dict} />
      <InstagramGallery dict={dict} />
      <Newsletter dict={dict} />
    </>
  );
}
