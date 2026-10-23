import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PhysicalMaterialReservationService } from '@/lib/services/erp/PhysicalMaterialReservationService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json().catch(() => ({}));
    const idempotencyKey = request.headers.get('idempotency-key') || body.idempotency_key;

    const result = await PhysicalMaterialReservationService.reserveMaterialsForOrder(
      {
        order_id: id,
        actor_id: body.actor_id,
        idempotency_key: idempotencyKey || undefined
      },
      supabase as any
    );

    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error: any) {
    const isUnprocessable = error.message?.includes('422');
    const isNotFound = error.message?.includes('404');
    const status = isNotFound ? 404 : isUnprocessable ? 422 : 400;

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to reserve materials' },
      { status }
    );
  }
}
