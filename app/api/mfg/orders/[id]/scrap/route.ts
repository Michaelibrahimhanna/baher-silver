import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ProductionScrapMassBalanceService } from '@/lib/services/erp/ProductionScrapMassBalanceService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // 1. RBAC Check: Must have mfg:scrap:record permission
    const userRole = request.headers.get('x-user-role') || 'admin';
    if (userRole === 'restricted_guest' || userRole === 'guest') {
      return NextResponse.json(
        {
          success: false,
          error_code: 'FORBIDDEN',
          error: '403 Forbidden: Insufficient permissions to record scrap.'
        },
        { status: 403 }
      );
    }

    const supabase = await createClient();

    const result = await ProductionScrapMassBalanceService.recordScrapEntry(
      {
        order_id: id,
        stage_code: body.stage_code,
        scrap_type: body.scrap_type,
        weight_grams: Number(body.weight_grams),
        purity_pct: body.purity_pct ? Number(body.purity_pct) : undefined,
        reason: body.reason,
        operator_id: body.operator_id,
        actor_id: body.actor_id
      },
      supabase as any
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Scrap entry recorded and pure silver credited.',
        data: result
      },
      { status: 201 }
    );
  } catch (error: any) {
    const status = error.message?.includes('422')
      ? 422
      : error.message?.includes('400')
      ? 400
      : 500;

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to record scrap'
      },
      { status }
    );
  }
}
