import { ReactNode } from 'react';
import { getDictionary } from '@/lib/dictionary';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default async function StorefrontLayout({ children }: { children: ReactNode }) {
  const locale = 'en';
  const dict = await getDictionary(locale);

  return (
    <>
      <Header dict={dict} locale={locale} />
      <main className="flex-grow">
        {children}
      </main>
      <Footer dict={dict} locale={locale} />
    </>
  );
}
