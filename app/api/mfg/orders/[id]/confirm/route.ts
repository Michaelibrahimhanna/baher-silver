import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ProductionOrderPlanningService } from '@/lib/services/erp/ProductionOrderPlanningService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json().catch(() => ({}));
    const idempotencyKey = request.headers.get('idempotency-key') || body.idempotency_key;

    const result = await ProductionOrderPlanningService.confirmOrder(
      id,
      {
        actor_id: body.actor_id,
        manager_override_token: body.manager_override_token,
        justification: body.justification,
        idempotency_key: idempotencyKey || undefined
      },
      supabase as any
    );

    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error: any) {
    const isUnprocessable = error.message?.includes('422');
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to confirm order' },
      { status: isUnprocessable ? 422 : 400 }
    );
  }
}
