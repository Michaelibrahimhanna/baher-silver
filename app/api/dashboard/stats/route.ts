import { NextResponse } from 'next/server';
import { getDashboardMetrics } from '@/lib/db/productEngine';
import { assertApiAuth, handleApiAuthError } from '@/lib/auth/apiGuard';

export async function GET(request: Request) {
  try {
    await assertApiAuth(request, {
      requiredPermission: 'report:read',
      actionDescription: 'Dashboard Stats View'
    });

    const stats = getDashboardMetrics();
    return NextResponse.json({ success: true, stats });
  } catch (error: unknown) {
    return handleApiAuthError(error);
  }
}
