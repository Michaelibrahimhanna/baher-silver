import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ProductionHandoffService } from '@/lib/services/erp/ProductionHandoffService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const envelope = await ProductionHandoffService.getExecutionHandoffEnvelope(
      id,
      supabase as any
    );

    return NextResponse.json({ success: true, data: envelope }, { status: 200 });
  } catch (error: any) {
    const isNotFound = error.message?.includes('404');
    const isUnprocessable = error.message?.includes('422');
    const status = isNotFound ? 404 : isUnprocessable ? 422 : 400;

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get execution handoff envelope' },
      { status }
    );
  }
}
