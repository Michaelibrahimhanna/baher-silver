import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/lib/auth/sessionService';
import { setSessionCookie } from '@/lib/auth/authCookies';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const role = (body.role || 'Admin').toLowerCase();

    let email = 'admin@bahersilver.com';
    let password = 'BaherAdmin2026!';

    if (role === 'storemanager' || role === 'manager') {
      email = 'storemanager@bahersilver.com';
      password = 'BaherManager2026!';
    } else if (role === 'cashier') {
      email = 'cashier@bahersilver.com';
      password = 'BaherCashier2026!';
    } else if (role === 'viewer') {
      email = 'viewer@bahersilver.com';
      password = 'BaherViewer2026!';
    } else if (role === 'foreignadmin' || role === 'foreign') {
      email = 'foreign_admin@othercorp.com';
      password = 'ForeignAdmin2026!';
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
    return NextResponse.json(
      { success: false, error: 'DEV_LOGIN_FAILED', message: error.message },
      { status: 500 }
    );
  }
}
