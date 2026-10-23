import { NextRequest, NextResponse } from 'next/server';
import { ProductionExecutionEngine } from '@/lib/services/erp/ProductionExecutionEngine';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    if (body.sample_size === undefined || body.passed_count === undefined || !body.outcome) {
      return NextResponse.json(
        { error: '422 Unprocessable Entity: sample_size, passed_count, and outcome are required.' },
        { status: 422 }
      );
    }

    const result = await ProductionExecutionEngine.recordQCInspection({
      order_id: id,
      inspector_id: body.inspector_id || 'qc-insp-01',
      sample_size: Number(body.sample_size),
      passed_count: Number(body.passed_count),
      failed_count: Number(body.failed_count || 0),
      rework_count: Number(body.rework_count || 0),
      outcome: body.outcome,
      defect_category: body.defect_category,
      rework_target_stage: body.rework_target_stage,
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
