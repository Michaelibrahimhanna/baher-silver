import { NextRequest, NextResponse } from 'next/server';
import { ProductionExecutionEngine } from '@/lib/services/erp/ProductionExecutionEngine';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; stage: string }> }
) {
  try {
    const { id, stage } = await context.params;
    const body = await request.json().catch(() => ({}));

    if (body.passed_quantity === undefined) {
      return NextResponse.json(
        { error: '422 Unprocessable Entity: passed_quantity is required.' },
        { status: 422 }
      );
    }

    const result = await ProductionExecutionEngine.completeStage({
      order_id: id,
      stage_code: stage,
      actor_id: body.actor_id || 'sys-op-01',
      passed_quantity: Number(body.passed_quantity),
      scrapped_quantity: Number(body.scrapped_quantity || 0),
      rework_quantity: Number(body.rework_quantity || 0),
      measured_output_weight_grams: Number(body.measured_output_weight_grams || 0.0),
      scrap_weight_grams: Number(body.scrap_weight_grams || 0.0),
      scrap_category: body.scrap_category,
      scrap_reason: body.scrap_reason,
      rework_target_stage: body.rework_target_stage,
      actual_minutes: Number(body.actual_minutes || 25),
      notes: body.notes
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    const message = error.message || 'Internal server error';
    const status = message.includes('404')
      ? 404
      : message.includes('409')
      ? 409
      : message.includes('422')
      ? 422
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
