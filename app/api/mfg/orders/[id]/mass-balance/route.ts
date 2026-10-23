import { NextRequest, NextResponse } from 'next/server';
import { ProductionScrapMassBalanceService } from '@/lib/services/erp/ProductionScrapMassBalanceService';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const result = await ProductionScrapMassBalanceService.calculateMassBalance(id);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    const message = error.message || 'Internal server error';
    const status = message.includes('404') ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
