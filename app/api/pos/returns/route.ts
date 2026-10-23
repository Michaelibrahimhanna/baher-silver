import { NextRequest, NextResponse } from 'next/server';
import { assertApiAuth, handleApiAuthError } from '@/lib/auth/apiGuard';
import { POSTransactionEngine } from '@/lib/services/pos/posTransactionEngine';

export async function POST(req: NextRequest) {
  try {
    const auth = await assertApiAuth(req, {
      requiredPermission: 'pos:sale:refund',
      actionDescription: 'Execute POS Sale Return'
    });

    const body = await req.json();

    if (!body.originalSaleId) {
      return NextResponse.json(
        { success: false, error: 'originalSaleId is required for return processing' },
        { status: 400 }
      );
    }

    if (!body.shiftId) {
      return NextResponse.json(
        { success: false, error: 'Active shiftId is required to process refund' },
        { status: 400 }
      );
    }

    const result = await POSTransactionEngine.executeReturn({
      organizationId: auth.organizationId,
      branchId: body.branchId || 'branch-cairo',
      terminalId: body.terminalId || 'POS-01',
      shiftId: body.shiftId,
      originalSaleId: body.originalSaleId,
      cashierUserId: auth.user.id,
      cashierName: auth.user.email?.split('@')[0] || 'Cashier',
      actorRole: auth.user.role,
      returnReason: body.returnReason || 'Customer Return',
      returnedPieceSerials: body.returnedPieceSerials,
      refundMethod: body.refundMethod || 'CASH',
      idempotencyKey: body.idempotencyKey || req.headers.get('x-idempotency-key') || undefined
    });

    return NextResponse.json({
      success: true,
      returnTransaction: result.returnTransaction,
      originalSale: result.originalSale
    });
  } catch (err: unknown) {
    return handleApiAuthError(err);
  }
}
