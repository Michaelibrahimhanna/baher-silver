import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/lib/auth/sessionService';
import { setSessionCookie } from '@/lib/auth/authCookies';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'INVALID_CREDENTIALS', message: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const { user, sessionToken, session } = await SessionService.authenticate(email, password);

    const response = NextResponse.json({
      success: true,
      user,
      session: {
        expiresAt: session.expiresAt
      }
    });

    setSessionCookie(response, sessionToken, request);
    return response;
  } catch (error: any) {
    const status = error.status || 401;
    const code = error.code || 'AUTHENTICATION_FAILED';
    const message = error.message || 'Authentication failed.';

    return NextResponse.json({ success: false, error: code, message }, { status });
  }
}
