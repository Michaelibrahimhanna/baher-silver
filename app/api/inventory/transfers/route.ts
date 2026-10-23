import { NextResponse } from 'next/server';
import { executeWarehouseTransfer } from '@/lib/db/productEngine';
import { assertApiAuth, handleApiAuthError } from '@/lib/auth/apiGuard';

export async function POST(request: Request) {
  try {
    const auth = await assertApiAuth(request, {
      requiredPermission: 'inventory:manage',
      actionDescription: 'Execute Warehouse Transfer'
    });

    const body = await request.json();
    const idempotencyKey =
      request.headers.get('Idempotency-Key') ||
      request.headers.get('idempotency-key') ||
      body.idempotency_key;

    if (!body.from_warehouse_id || !body.to_warehouse_id) {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'Both from_warehouse_id and to_warehouse_id are mandatory.' },
        { status: 400 }
      );
    }

    const result = executeWarehouseTransfer({
      piece_id: body.piece_id,
      serial_number: body.serial_number,
      product_id: body.product_id,
      quantity: body.quantity ? Number(body.quantity) : 1,
      from_warehouse_id: body.from_warehouse_id,
      to_warehouse_id: body.to_warehouse_id,
      from_location_code: body.from_location_code,
      to_location_code: body.to_location_code,
      actor_user_id: auth.user.id,
      actor_role: auth.user.role,
      reason: body.reason || 'Inter-warehouse transfer via API',
      organization_id: auth.organizationId,
      idempotency_key: idempotencyKey
    });

    return NextResponse.json({
      success: true,
      transfer_id: result.transfer_id,
      outbound_event: result.outbound_event,
      inbound_event: result.inbound_event,
      piece: result.piece
    }, { status: 200 });
  } catch (error: unknown) {
    return handleApiAuthError(error);
  }
}
