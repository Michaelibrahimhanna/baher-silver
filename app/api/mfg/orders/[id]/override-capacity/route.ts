import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WorkCenterSchedulingService } from '@/lib/services/erp/WorkCenterSchedulingService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json().catch(() => ({}));

    if (!body.justification) {
      return NextResponse.json(
        { success: false, error: 'Mandatory justification required for capacity override.' },
        { status: 422 }
      );
    }

    const result = await WorkCenterSchedulingService.overrideCapacity(
      {
        order_id: id,
        actor_id: body.actor_id || 'system-manager',
        justification: body.justification,
        idempotency_key: body.idempotency_key
      },
      supabase as any
    );

    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error: any) {
    const isUnprocessable = error.message?.includes('422');
    const isNotFound = error.message?.includes('404');
    const status = isNotFound ? 404 : isUnprocessable ? 422 : 400;

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to override capacity' },
      { status }
    );
  }
}
