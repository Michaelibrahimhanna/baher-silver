/**
 * Baher Silver Portal — Secure Cookie Manager
 *
 * Enforces HttpOnly, SameSite=Lax, and Secure flags for production session tokens.
 */

import { NextResponse } from 'next/server';

export const SESSION_COOKIE_NAME = 'mip_session';

export function isSecureContext(request?: Request): boolean {
  if (request) {
    const proto = request.headers.get('x-forwarded-proto');
    if (proto) return proto === 'https';
    try {
      return request.url.startsWith('https://');
    } catch {
      return false;
    }
  }
  return process.env.NODE_ENV === 'production' && process.env.COOKIE_INSECURE !== 'true';
}

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_INSECURE !== 'true',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 // 7 days in seconds
};

/**
 * Injects the secure session cookie into a NextResponse.
 */
export function setSessionCookie(response: NextResponse, token: string, request?: Request): void {
  const secure = isSecureContext(request);
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60
  });
}

/**
 * Clears the session cookie from a NextResponse upon logout.
 */
export function clearSessionCookie(response: NextResponse, request?: Request): void {
  const secure = isSecureContext(request);
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  });
}

/**
 * Extracts session token from NextRequest or standard Request headers.
 */
export function extractSessionToken(request: Request): string | null {
  // 1. Check Cookie header
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = cookieHeader.split(';').map((c) => c.trim());
  for (const cookie of cookies) {
    if (cookie.startsWith(`${SESSION_COOKIE_NAME}=`)) {
      return cookie.slice(`${SESSION_COOKIE_NAME}=`.length);
    }
  }

  // 2. Fallback to Authorization: Bearer header (for direct API / testing clients)
  const authHeader = request.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }

  return null;
}
