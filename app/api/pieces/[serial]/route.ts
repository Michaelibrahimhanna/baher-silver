import { NextResponse } from 'next/server';
import { getPieceBySerial, updatePieceLifecycle } from '@/lib/db/productEngine';
import { assertApiAuth, handleApiAuthError } from '@/lib/auth/apiGuard';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ serial: string }> }
) {
  try {
    const auth = await assertApiAuth(request, {
      requiredPermission: 'product:read',
      actionDescription: 'Get Piece By Serial'
    });

    const { serial } = await params;
    const result = getPieceBySerial(serial, auth.organizationId);

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: `Piece "${serial}" not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      piece: result.piece,
      product: result.product
    });
  } catch (error: unknown) {
    return handleApiAuthError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ serial: string }> }
) {
  try {
    const auth = await assertApiAuth(request, {
      requiredPermission: 'product:manage',
      actionDescription: 'Update Piece Lifecycle'
    });

    const { serial } = await params;
    const body = await request.json();
    const { lifecycle_status, location_code } = body;

    if (!lifecycle_status) {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'Missing required field "lifecycle_status"' },
        { status: 400 }
      );
    }

    const updatedPiece = updatePieceLifecycle(serial, lifecycle_status, location_code, auth.organizationId);
    return NextResponse.json({ success: true, piece: updatedPiece });
  } catch (error: unknown) {
    return handleApiAuthError(error);
  }
}
