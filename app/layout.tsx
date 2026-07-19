import { ReactNode } from 'react';
import './globals.css';
import { Manrope, Alexandria, Cormorant_Garamond } from 'next/font/google';
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

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = 'en';
  const dict = await getDictionary(locale);

  return (
    <html lang="en" dir="ltr" className={`${manrope.variable} ${alexandria.variable} ${cormorant.variable}`}>
      <body className="font-manrope flex flex-col min-h-screen">
        <Header dict={dict} locale={locale} />
        <main className="flex-grow pt-20">
          {children}
        </main>
        <Footer dict={dict} locale={locale} />
      </body>
    </html>
  );
}
