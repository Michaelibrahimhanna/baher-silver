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
    const idempotencyKey = request.headers.get('idempotency-key') || body.idempotency_key;

    const result = await WorkCenterSchedulingService.scheduleOrder(
      {
        order_id: id,
        actor_id: body.actor_id,
        target_date: body.target_date,
        idempotency_key: idempotencyKey || undefined
      },
      supabase as any
    );

    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error: any) {
    const isConflict = error.message?.includes('409');
    const isUnprocessable = error.message?.includes('422');
    const isNotFound = error.message?.includes('404');
    const status = isConflict ? 409 : isNotFound ? 404 : isUnprocessable ? 422 : 400;

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to schedule order' },
      { status }
    );
  }
}
