import { NextResponse } from 'next/server';
import { reconcileStock } from '@/lib/db/productEngine';
import { assertApiAuth, handleApiAuthError } from '@/lib/auth/apiGuard';

export async function GET(request: Request) {
  try {
    const auth = await assertApiAuth(request, {
      requiredPermission: 'inventory:read',
      actionDescription: 'Run Stock Reconciliation Report'
    });

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouse_id') || undefined;

    const report = reconcileStock(auth.organizationId, warehouseId);

    return NextResponse.json({
      success: true,
      report
    });
  } catch (error: unknown) {
    return handleApiAuthError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await assertApiAuth(request, {
      requiredPermission: 'inventory:audit',
      actionDescription: 'Trigger Stock Reconciliation Audit'
    });

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // empty body is fine
    }

    const report = reconcileStock(auth.organizationId, body.warehouse_id);

    return NextResponse.json({
      success: true,
      report
    });
  } catch (error: unknown) {
    return handleApiAuthError(error);
  }
}
