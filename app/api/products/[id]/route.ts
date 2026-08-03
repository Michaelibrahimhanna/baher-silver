import { NextResponse } from 'next/server';
import { getProductBySlugOrId, updateProduct, deleteProduct } from '@/lib/db/productEngine';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const product = getProductBySlugOrId(id);
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
    const { id } = await params;
    const body = await request.json();
    const updated = updateProduct(id, body);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, product: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to update product';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = deleteProduct(id);
  if (!deleted) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, message: `Product ${id} deleted successfully` });
}
