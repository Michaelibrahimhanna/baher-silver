import { NextResponse } from 'next/server';
import { createPieceForProduct, getPiecesForProduct } from '@/lib/db/productEngine';
import { assertApiAuth, handleApiAuthError } from '@/lib/auth/apiGuard';

export async function GET(request: Request) {
  try {
    const auth = await assertApiAuth(request, {
      requiredPermission: 'product:read',
      actionDescription: 'List Pieces'
    });

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'Missing product_id query parameter' },
        { status: 400 }
      );
    }

    const pieces = getPiecesForProduct(productId, auth.organizationId);
    return NextResponse.json({ success: true, count: pieces.length, pieces });
  } catch (error: unknown) {
    return handleApiAuthError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await assertApiAuth(request, {
      requiredPermission: 'product:manage',
      actionDescription: 'Create Serialized Piece'
    });

    const body = await request.json();
    body.organization_id = auth.organizationId; // Enforce server-derived tenant identity

    const piece = createPieceForProduct(body);
    return NextResponse.json({ success: true, piece }, { status: 201 });
  } catch (error: unknown) {
    return handleApiAuthError(error);
  }
}
