import { NextResponse } from 'next/server';
import { executePieceMovement } from '@/lib/db/productEngine';
import { assertApiAuth, handleApiAuthError } from '@/lib/auth/apiGuard';

export async function POST(request: Request) {
  try {
    const auth = await assertApiAuth(request, {
      requiredPermission: 'inventory:manage',
      actionDescription: 'Execute Stock Movement'
    });

    const body = await request.json();
    const idempotencyKey =
      request.headers.get('Idempotency-Key') ||
      request.headers.get('idempotency-key') ||
      body.idempotency_key;

    if (!body.movement_type) {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'Missing mandatory movement_type field.' },
        { status: 400 }
      );
    }

    if (!body.piece_id && !body.serial_number) {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'Missing mandatory piece identifier (piece_id or serial_number).' },
        { status: 400 }
      );
    }

    const result = executePieceMovement({
      piece_id: body.piece_id,
      serial_number: body.serial_number,
      movement_type: body.movement_type,
      dest_warehouse_id: body.dest_warehouse_id,
      dest_location_code: body.dest_location_code,
      actor_user_id: auth.user.id,
      actor_role: auth.user.role,
      reason: body.reason || `Stock movement ${body.movement_type} via API`,
      reference_id: body.reference_id,
      reference_type: body.reference_type || 'SYSTEM',
      organization_id: auth.organizationId,
      idempotency_key: idempotencyKey
    });

    return NextResponse.json({
      success: true,
      piece: result.piece,
      event: result.event
    }, { status: 200 });
  } catch (error: unknown) {
    return handleApiAuthError(error);
  }
}
