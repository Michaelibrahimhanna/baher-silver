import { NextRequest, NextResponse } from 'next/server';
import { assertApiAuth, handleApiAuthError } from '@/lib/auth/apiGuard';
import { CashShiftEngine } from '@/lib/services/pos/cashShiftEngine';

export async function GET(req: NextRequest) {
  try {
    const auth = await assertApiAuth(req, {
      requiredPermission: 'pos:sale:create',
      actionDescription: 'Query Active Cash Shift'
    });

    const { searchParams } = new URL(req.url);
    const terminalId = searchParams.get('terminalId') || 'POS-01';

    const activeShift = CashShiftEngine.getActiveShiftForTerminal(auth.organizationId, terminalId);

    return NextResponse.json({
      success: true,
      hasActiveShift: Boolean(activeShift),
      shift: activeShift
    });
  } catch (err: unknown) {
    return handleApiAuthError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await assertApiAuth(req, {
      requiredPermission: 'pos:shift:open',
      actionDescription: 'Open New Cash Shift'
    });

    const body = await req.json();

    if (body.openingFloat === undefined || body.openingFloat < 0) {
      return NextResponse.json(
        { success: false, error: 'Valid non-negative openingFloat is required' },
        { status: 400 }
      );
    }

    const shift = CashShiftEngine.openShift({
      organizationId: auth.organizationId,
      branchId: body.branchId || 'branch-cairo',
      terminalId: body.terminalId || 'POS-01',
      cashierUserId: auth.user.id,
      cashierName: auth.user.email?.split('@')[0] || 'Cashier',
      openingFloat: Number(body.openingFloat)
    });

    return NextResponse.json({
      success: true,
      shift
    });
  } catch (err: unknown) {
    return handleApiAuthError(err);
  }
}
