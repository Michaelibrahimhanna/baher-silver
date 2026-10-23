import { NextRequest, NextResponse } from 'next/server';
import { assertApiAuth, handleApiAuthError } from '@/lib/auth/apiGuard';
import { POSTransactionEngine } from '@/lib/services/pos/posTransactionEngine';

export async function POST(req: NextRequest) {
  try {
    const auth = await assertApiAuth(req, {
      requiredPermission: 'pos:sale:create',
      actionDescription: 'Execute POS Sale Checkout'
    });

    const body = await req.json();

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cart must contain at least one item' },
        { status: 400 }
      );
    }

    if (!body.shiftId) {
      return NextResponse.json(
        { success: false, error: 'Active shiftId is required for POS checkout' },
        { status: 400 }
      );
    }

    // Enforce server-derived tenant & cashier identity
    const transaction = await POSTransactionEngine.executeCheckout({
      organizationId: auth.organizationId,
      branchId: body.branchId || 'branch-cairo',
      terminalId: body.terminalId || 'POS-01',
      shiftId: body.shiftId,
      cashierUserId: auth.user.id,
      cashierName: auth.user.email?.split('@')[0] || 'Cashier',
      actorRole: auth.user.role,
      items: body.items,
      paymentMethod: body.paymentMethod || 'CASH',
      cashAmount: body.cashAmount,
      cardAmount: body.cardAmount,
      instapayAmount: body.instapayAmount,
      discountAmount: body.discountAmount,
      discountReason: body.discountReason,
      managerOverrideToken: body.managerOverrideToken || req.headers.get('x-manager-override-token') || undefined,
      customerId: body.customerId || undefined,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      idempotencyKey: body.idempotencyKey || req.headers.get('x-idempotency-key') || undefined
    });

    return NextResponse.json({
      success: true,
      transaction
    });
  } catch (err: unknown) {
    return handleApiAuthError(err);
  }
}
