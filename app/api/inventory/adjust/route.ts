import { NextResponse } from 'next/server';
import { recordStockAdjustment } from '@/lib/db/productEngine';
import { assertApiAuth, handleApiAuthError } from '@/lib/auth/apiGuard';

export async function POST(request: Request) {
  try {
    const auth = await assertApiAuth(request, {
      requiredPermission: 'inventory:audit',
      actionDescription: 'Record Stock Adjustment'
    });

    const body = await request.json();
    const idempotencyKey =
      request.headers.get('Idempotency-Key') ||
      request.headers.get('idempotency-key') ||
      body.idempotency_key;

    if (!body.product_id || !body.warehouse_id) {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'product_id and warehouse_id are required.' },
        { status: 400 }
      );
    }

    if (body.physical_count === undefined || body.expected_count === undefined) {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'physical_count and expected_count are required.' },
        { status: 400 }
      );
    }

    if (!body.reason || body.reason.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'A detailed justification reason (min 5 characters) is mandatory.' },
        { status: 422 }
      );
    }

    const event = recordStockAdjustment({
      product_id: body.product_id,
      piece_id: body.piece_id,
      serial_number: body.serial_number,
      warehouse_id: body.warehouse_id,
      location_code: body.location_code,
      physical_count: Number(body.physical_count),
      expected_count: Number(body.expected_count),
      actor_user_id: auth.user.id,
      actor_role: auth.user.role,
      reason: body.reason,
      organization_id: auth.organizationId,
      idempotency_key: idempotencyKey
    });

    return NextResponse.json({
      success: true,
      event
    }, { status: 200 });
  } catch (error: unknown) {
    return handleApiAuthError(error);
  }
}
