import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/lib/auth/sessionService';
import { extractSessionToken, clearSessionCookie } from '@/lib/auth/authCookies';

export async function POST(request: NextRequest) {
  try {
    const token = extractSessionToken(request);
    if (token) {
      await SessionService.invalidateSession(token);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully.'
    });

    clearSessionCookie(response, request);
    return response;
  } catch (error: any) {
    const response = NextResponse.json({
      success: true,
      message: 'Logged out.'
    });
    clearSessionCookie(response, request);
    return response;
  }
}
