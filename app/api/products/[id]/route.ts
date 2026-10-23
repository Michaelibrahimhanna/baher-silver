import { NextResponse } from 'next/server';
import { getProductBySlugOrId, updateProduct, deleteProduct } from '@/lib/db/productEngine';
import { assertApiAuth, handleApiAuthError } from '@/lib/auth/apiGuard';
import { extractSessionToken } from '@/lib/auth/authCookies';
import { SessionService } from '@/lib/auth/sessionService';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let organizationId: string | undefined = undefined;

  // Optional tenant scoping if request carries an authenticated session
  const token = extractSessionToken(request);
  if (token) {
    const auth = await SessionService.validateSession(token);
    if (auth) {
      organizationId = auth.user.organizationId;
    }
  }

  const product = getProductBySlugOrId(id, organizationId);
  if (!product) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, product });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await assertApiAuth(request, {
      requiredPermission: 'product:manage',
      actionDescription: 'Product Update'
    });

    const { id } = await params;
    const body = await request.json();
    body.organization_id = auth.organizationId; // Strictly bind server-derived tenant ID

    const updated = updateProduct(id, body);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, product: updated });
  } catch (error: unknown) {
    return handleApiAuthError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await assertApiAuth(request, {
      requiredPermission: 'product:manage',
      actionDescription: 'Product Deletion'
    });

    const { id } = await params;
    const deleted = deleteProduct(id, auth.organizationId);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: `Product ${id} deleted successfully` });
  } catch (error: unknown) {
    return handleApiAuthError(error);
  }
}
