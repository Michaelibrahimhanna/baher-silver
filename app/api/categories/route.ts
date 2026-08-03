import { NextResponse } from 'next/server';
import { getCategories, createCategory } from '@/lib/db/productEngine';

export async function GET() {
  const categories = getCategories();
  return NextResponse.json({ success: true, count: categories.length, categories });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.nameEn || !body.nameAr) {
      return NextResponse.json({ success: false, error: 'Category English and Arabic names are required' }, { status: 400 });
    }
    const newCategory = createCategory(body);
    return NextResponse.json({ success: true, category: newCategory }, { status: 201 });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to create category';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
  }
}
