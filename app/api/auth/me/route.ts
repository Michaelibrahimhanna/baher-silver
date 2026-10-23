import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/lib/auth/sessionService';
import { extractSessionToken } from '@/lib/auth/authCookies';
import { ROLE_PERMISSIONS } from '@/lib/auth/types';

export async function GET(request: NextRequest) {
  try {
    const token = extractSessionToken(request);
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHENTICATED', message: 'No active session token found.' },
        { status: 401 }
      );
    }

    const auth = await SessionService.validateSession(token);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHENTICATED', message: 'Session is invalid or expired.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: auth.user,
      session: {
        sessionId: auth.session.sessionId,
        expiresAt: auth.session.expiresAt
      },
      permissions: ROLE_PERMISSIONS[auth.user.role] || []
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'UNAUTHENTICATED', message: error.message },
      { status: 401 }
    );
  }
}
