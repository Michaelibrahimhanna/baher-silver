import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SessionService } from '@/lib/auth/sessionService';
import { SESSION_COOKIE_NAME } from '@/lib/auth/authCookies';

const locales = ['en', 'ar'];
const defaultLocale = 'ar';

function getLocaleFromRequest(request: NextRequest, cookieName: string): string {
  const cookieLocale = request.cookies.get(cookieName)?.value;
  if (cookieLocale && locales.includes(cookieLocale)) {
    return cookieLocale;
  }

  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const languages = acceptLanguage.split(',').map((lang) => lang.split(';')[0].trim().substring(0, 2));
    for (const lang of languages) {
      if (locales.includes(lang)) {
        return lang;
      }
    }
  }

  return defaultLocale;
}

// Public API endpoints that do not require authentication
function isPublicApiRoute(pathname: string, method: string): boolean {
  // Auth endpoints are public (login, me, logout, dev-login)
  if (pathname.startsWith('/api/auth/')) return true;

  // Customer Checkout & Receipt / DPP verification
  if (pathname === '/api/checkout/process' && method === 'POST') return true;
  if (pathname === '/api/receipt/verify' && method === 'POST') return true;

  // Storefront Public Read APIs
  if (method === 'GET') {
    if (pathname === '/api/categories') return true;
    if (pathname === '/api/collections') return true;
    if (pathname === '/api/products') return true;
    if (pathname === '/api/products/search') return true;
    // Allow GET /api/products/[id] for customer viewing
    if (pathname.startsWith('/api/products/') && !pathname.includes('/ai-brain') && !pathname.includes('/bulk')) {
      return true;
    }
  }

  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // 1. Skip static assets, Next internals, and favicon
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/r/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // ─── 2. API ROUTE SECURITY GATEWAY ──────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    if (isPublicApiRoute(pathname, method)) {
      return NextResponse.next();
    }

    // Protected API: Verify session token
    const token =
      request.cookies.get(SESSION_COOKIE_NAME)?.value ||
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHENTICATED',
          message: 'Authentication required. Missing or expired session token.'
        },
        { status: 401 }
      );
    }

    const auth = await SessionService.validateSession(token);
    if (!auth) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHENTICATED',
          message: 'Invalid, expired, or revoked session. Please log in again.'
        },
        { status: 401 }
      );
    }

    // Forward verified identity headers downstream to API route handlers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', auth.user.id);
    requestHeaders.set('x-user-role', auth.user.role);
    requestHeaders.set('x-tenant-id', auth.user.organizationId);
    requestHeaders.set('x-user-email', auth.user.email);

    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    });
  }

  // ─── 3. LOCALE RESOLUTION & REDIRECTION ─────────────────────────────────────
  const isAdminPath = pathname.startsWith('/admin') || pathname.match(/^\/(en|ar)\/admin/);
  const isBusinessSurface =
    isAdminPath ||
    pathname.startsWith('/erp') ||
    pathname.match(/^\/(en|ar)\/erp/) ||
    pathname.startsWith('/mfg') ||
    pathname.match(/^\/(en|ar)\/mfg/);

  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  let currentLocale = defaultLocale;
  if (pathnameHasLocale) {
    currentLocale = pathname.split('/')[1];
  } else {
    // Resolve locale and redirect
    const cookieName = isAdminPath ? 'NEXT_ADMIN_LOCALE' : 'NEXT_LOCALE';
    currentLocale = getLocaleFromRequest(request, cookieName);

    const url = request.nextUrl.clone();
    url.pathname = `/${currentLocale}${pathname}`;
    return NextResponse.redirect(url);
  }

  // ─── 4. AUTHENTICATED BUSINESS / ADMIN SURFACE GATEWAY ──────────────────────
  if (isBusinessSurface) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    let isAuthenticated = false;
    let authUser = null;

    if (token) {
      const auth = await SessionService.validateSession(token);
      if (auth) {
        isAuthenticated = true;
        authUser = auth.user;
      }
    }

    if (!isAuthenticated) {
      // Redirect unauthenticated requests to the portal login page
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = `/${currentLocale}/login`;
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Forward verified identity headers to server components
    const requestHeaders = new Headers(request.headers);
    if (authUser) {
      requestHeaders.set('x-user-id', authUser.id);
      requestHeaders.set('x-user-role', authUser.role);
      requestHeaders.set('x-tenant-id', authUser.organizationId);
      requestHeaders.set('x-user-email', authUser.email);
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    });
  }

  // ─── 5. PUBLIC CUSTOMER STOREFRONT SURFACE ──────────────────────────────────
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Intercept all paths except internal _next and explicit static files
    '/((?!_next|images|favicon.ico).*)'
  ]
};
