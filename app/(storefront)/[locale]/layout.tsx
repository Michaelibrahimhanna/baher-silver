import { ReactNode } from 'react';
import '@/app/globals.css';
import { Manrope, Alexandria, Cormorant_Garamond } from 'next/font/google';
import Providers from "@/lib/react-query/provider";
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getDictionary } from '@/lib/dictionary';
import { Metadata } from 'next';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' });
const alexandria = Alexandria({ subsets: ['arabic'], variable: '--font-alexandria' });
const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-cormorant' });

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const resolvedLocale = (locale === 'ar' ? 'ar' : 'en') as 'en' | 'ar';
  
  // Minimal example - if you have seo titles in dict you can use them
  return {
    title: resolvedLocale === 'ar' ? 'باهر سيلفر | مجوهرات فاخرة' : 'Baher Silver | Premium Luxury Jewelry',
    description: resolvedLocale === 'ar' ? 'مجوهرات فضية فاخرة' : 'Luxury 925 Silver Jewelry crafted with elegance and timeless beauty.',
  };
}

export default async function StorefrontRootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const resolvedLocale = (locale === 'ar' ? 'ar' : 'en') as 'en' | 'ar';
  const dict = await getDictionary(resolvedLocale);
  
  const dir = resolvedLocale === 'ar' ? 'rtl' : 'ltr';
  const fontClass = resolvedLocale === 'ar' ? alexandria.variable : manrope.variable;

  return (
    <html lang={resolvedLocale} dir={dir} className={`${manrope.variable} ${alexandria.variable} ${cormorant.variable} ${fontClass}`}>
      <body className="font-manrope flex flex-col min-h-screen bg-background text-foreground antialiased selection:bg-primary/30 selection:text-primary">
        <Providers>
          <Header dict={dict} locale={resolvedLocale} />
          <main className="flex-grow">
            {children}
          </main>
          <Footer dict={dict} locale={resolvedLocale} />
        </Providers>
      </body>
    </html>
  );
}
