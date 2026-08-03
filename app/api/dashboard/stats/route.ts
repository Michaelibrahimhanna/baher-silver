import { NextResponse } from 'next/server';
import { getDashboardMetrics } from '@/lib/db/productEngine';

export async function GET() {
  const stats = getDashboardMetrics();
  return NextResponse.json({ success: true, stats });
}
