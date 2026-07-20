import { ReactNode } from 'react';
import './globals.css';
import { Manrope, Alexandria, Cormorant_Garamond } from 'next/font/google';
import Providers from "@/lib/react-query/provider";

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' });
const alexandria = Alexandria({ subsets: ['arabic'], variable: '--font-alexandria' });
const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-cormorant' });

export const metadata = {
  title: 'Baher Silver | Premium Luxury Jewelry',
  description: 'Luxury 925 Silver Jewelry crafted with elegance and timeless beauty.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`${manrope.variable} ${alexandria.variable} ${cormorant.variable}`}>
      <body className="font-manrope flex flex-col min-h-screen bg-background text-foreground antialiased selection:bg-primary/30 selection:text-primary">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
