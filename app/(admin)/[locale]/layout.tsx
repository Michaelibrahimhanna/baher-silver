import { ReactNode } from 'react';
import '@/app/globals.css';
import { Manrope, Alexandria, Cormorant_Garamond } from 'next/font/google';
import Providers from "@/lib/react-query/provider";
import { Metadata } from 'next';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' });
const alexandria = Alexandria({ subsets: ['arabic'], variable: '--font-alexandria' });
const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-cormorant' });

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const resolvedLocale = (locale === 'ar' ? 'ar' : 'en') as 'en' | 'ar';
  return {
    title: resolvedLocale === 'ar' ? 'باهر سيلفر | لوحة التحكم' : 'Baher Silver | Admin Dashboard',
  };
}

export default async function AdminRootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const resolvedLocale = (locale === 'ar' ? 'ar' : 'en') as 'en' | 'ar';
  
  const dir = resolvedLocale === 'ar' ? 'rtl' : 'ltr';
  const fontClass = resolvedLocale === 'ar' ? alexandria.variable : manrope.variable;

  return (
    <html lang={resolvedLocale} dir={dir} className={`${manrope.variable} ${alexandria.variable} ${cormorant.variable} ${fontClass}`}>
      <body className="font-manrope flex flex-col min-h-screen bg-background text-foreground antialiased selection:bg-primary/30 selection:text-primary">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
