import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ManufacturingBusinessQueryService } from '@/lib/services/erp/ManufacturingBusinessQueryService';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const result = await ManufacturingBusinessQueryService.queryOrderReadiness(id, supabase as any);

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to evaluate readiness' },
      { status: error.message?.includes('not found') ? 404 : 400 }
    );
  }
}
