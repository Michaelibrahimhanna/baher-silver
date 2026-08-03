import { NextResponse } from 'next/server';
import { getCollections, createCollection } from '@/lib/db/productEngine';

export async function GET() {
  const collections = getCollections();
  return NextResponse.json({ success: true, count: collections.length, collections });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.nameEn || !body.nameAr) {
      return NextResponse.json({ success: false, error: 'Collection English and Arabic names are required' }, { status: 400 });
    }
    const newCollection = createCollection(body);
    return NextResponse.json({ success: true, collection: newCollection }, { status: 201 });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to create collection';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
  }
}
