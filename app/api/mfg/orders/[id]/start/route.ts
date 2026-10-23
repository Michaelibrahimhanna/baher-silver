import { NextRequest, NextResponse } from 'next/server';
import { ProductionExecutionEngine } from '@/lib/services/erp/ProductionExecutionEngine';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const actorId = body.actor_id || 'sys-exec-01';

    const result = await ProductionExecutionEngine.startExecution(id, actorId);
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
