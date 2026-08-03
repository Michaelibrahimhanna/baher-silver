import { NextResponse } from 'next/server';
import { getProducts, createProduct } from '@/lib/db/productEngine';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || undefined;
  const collection = searchParams.get('collection') || undefined;
  const query = searchParams.get('query') || undefined;
  const status = searchParams.get('status') || undefined;
  const isBestSeller = searchParams.get('isBestSeller') === 'true';
  const isNew = searchParams.get('isNew') === 'true';

  const products = getProducts({ category, collection, query, status, isBestSeller, isNew });
  return NextResponse.json({ success: true, count: products.length, products });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newProduct = createProduct(body);
    return NextResponse.json({ success: true, product: newProduct }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create product';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
