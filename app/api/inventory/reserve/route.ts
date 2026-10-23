import { NextResponse } from 'next/server';
import { inventoryService } from '@/lib/services/inventoryInterface';
import { assertApiAuth, handleApiAuthError } from '@/lib/auth/apiGuard';

export async function POST(request: Request) {
  try {
    const auth = await assertApiAuth(request, {
      requiredPermission: 'inventory:manage',
      actionDescription: 'Manage Inventory Reservations'
    });

    const body = await request.json();
    const action = body.action || 'reserve';

    if (action === 'release') {
      if (!body.reservation_id && !body.reservationId) {
        return NextResponse.json(
          { success: false, error: 'BAD_REQUEST', message: 'Missing reservation_id for release.' },
          { status: 400 }
        );
      }
      const released = await inventoryService.releaseStock(
        body.reservation_id || body.reservationId,
        auth.organizationId
      );
      return NextResponse.json({ success: released, action: 'release' });
    }

    if (action === 'confirm') {
      if (!body.reservation_id && !body.reservationId) {
        return NextResponse.json(
          { success: false, error: 'BAD_REQUEST', message: 'Missing reservation_id for confirm.' },
          { status: 400 }
        );
      }
      const confirmed = await inventoryService.confirmReservation(
        body.reservation_id || body.reservationId,
        auth.organizationId
      );
      return NextResponse.json({ success: confirmed, action: 'confirm' });
    }

    // Default: reserve
    const items = body.items;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'items array is required for reservation.' },
        { status: 400 }
      );
    }

    const result = await inventoryService.reserveStock(
      body.order_id || body.orderId,
      items,
      auth.organizationId,
      auth.user.id
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'RESERVATION_FAILED', message: result.errorMessage },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      reservation_id: result.reservationId,
      expires_at: result.expiresAt,
      allocated_pieces: result.allocatedPieces
    }, { status: 201 });
  } catch (error: unknown) {
    return handleApiAuthError(error);
  }
}
