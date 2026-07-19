import { Manrope, Alexandria, Cormorant_Garamond } from 'next/font/google';
import '../globals.css';
import { ReactNode } from 'react';
import { getDictionary } from '@/lib/dictionary';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' });
const alexandria = Alexandria({ subsets: ['arabic'], variable: '--font-alexandria' });
const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-cormorant' });

export const metadata = {
  title: 'Baher Silver | Premium Luxury Jewelry',
  description: 'Luxury 925 Silver Jewelry crafted with elegance and timeless beauty.',
};

export async function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'ar' }];
}

export default async function RootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = (lang === 'ar' ? 'ar' : 'en') as 'en' | 'ar';
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  
  // Use Cormorant for headings and Manrope/Alexandria for body
  const fontClass = locale === 'ar' ? 'font-alexandria' : 'font-manrope';
  const dict = await getDictionary(locale);

  return (
    <html lang={lang} dir={dir} className={`${manrope.variable} ${alexandria.variable} ${cormorant.variable}`}>
      <body className={`${fontClass} flex flex-col min-h-screen`}>
        <Header dict={dict} locale={locale} />
        <main className="flex-grow pt-20">
          {children}
        </main>
        <Footer dict={dict} locale={locale} />
      </body>
    </html>
  );
}
