import { NextRequest, NextResponse } from 'next/server';
import { ProductionExecutionEngine } from '@/lib/services/erp/ProductionExecutionEngine';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    if (!body.justification) {
      return NextResponse.json(
        { error: '422 Unprocessable Entity: Mandatory justification is required.' },
        { status: 422 }
      );
    }

    const result = await ProductionExecutionEngine.overrideMassBalance(
      id,
      body.actor_id || 'mgr-override-01',
      body.justification
    );
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
