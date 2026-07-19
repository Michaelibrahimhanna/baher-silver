import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const locales = ['en', 'ar'];
const defaultLocale = 'en';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip public files and api routes
  if (
    pathname.includes('.') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next')
  ) {
    return;
  }

  // Check if pathname is missing a locale
  const pathnameIsMissingLocale = locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  // Redirect if there is no locale
  if (pathnameIsMissingLocale) {
    const newUrl = new URL(`/${defaultLocale}${pathname}`, request.url);
    return NextResponse.redirect(newUrl);
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
