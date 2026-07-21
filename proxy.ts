import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const locales = ['en', 'ar'];
const defaultLocale = 'en';

function getLocaleFromRequest(request: NextRequest, cookieName: string): string {
  // 1. User Preference / Cookie
  const cookieLocale = request.cookies.get(cookieName)?.value;
  if (cookieLocale && locales.includes(cookieLocale)) {
    return cookieLocale;
  }

  // 3. Browser Language
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    // Simple parsing, assuming formats like 'ar-SA,ar;q=0.9,en-US;q=0.8,en;q=0.7'
    const languages = acceptLanguage.split(',').map(lang => lang.split(';')[0].trim().substring(0, 2));
    for (const lang of languages) {
      if (locales.includes(lang)) {
        return lang;
      }
    }
  }

  // 4. Default Locale
  return defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files, API routes, Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check if it's an admin route
  const isAdmin = pathname.startsWith('/admin') || pathname.match(/^\/(en|ar)\/admin/);

  // Extract current locale from path
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (!pathnameHasLocale) {
    // Resolve locale
    const cookieName = isAdmin ? 'NEXT_ADMIN_LOCALE' : 'NEXT_LOCALE';
    const locale = getLocaleFromRequest(request, cookieName);

    // Redirect to include the locale
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname}`;
    
    // Example: /admin -> /en/admin, / -> /en
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip all internal paths (_next)
    '/((?!_next|api|favicon.ico|.*\\.).*)',
  ],
};
