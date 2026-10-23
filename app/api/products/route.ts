import { NextResponse } from 'next/server';
import { getProducts, createProduct } from '@/lib/db/productEngine';
import { assertApiAuth, handleApiAuthError } from '@/lib/auth/apiGuard';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || undefined;
  const collection = searchParams.get('collection') || undefined;
  const query = searchParams.get('query') || undefined;
  const status = searchParams.get('status') || undefined;
  const isBestSeller = searchParams.get('isBestSeller') === 'true';
  const isNew = searchParams.get('isNew') === 'true';
  const profile_type = (searchParams.get('profile_type') as any) || undefined;

  const products = getProducts({ category, collection, query, status, isBestSeller, isNew, profile_type });
  return NextResponse.json({ success: true, count: products.length, products });
}

export async function POST(request: Request) {
  try {
    const auth = await assertApiAuth(request, {
      requiredPermission: 'product:manage',
      actionDescription: 'Product Creation'
    });

    const body = await request.json();
    body.organization_id = auth.organizationId;
    const newProduct = createProduct(body);
    return NextResponse.json({ success: true, product: newProduct }, { status: 201 });
  } catch (error: unknown) {
    return handleApiAuthError(error);
  }
}
