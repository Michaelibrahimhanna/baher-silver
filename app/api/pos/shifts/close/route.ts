import { NextRequest, NextResponse } from 'next/server';
import { assertApiAuth, handleApiAuthError } from '@/lib/auth/apiGuard';
import { CashShiftEngine } from '@/lib/services/pos/cashShiftEngine';
import { ZReportEngine } from '@/lib/services/pos/zReportEngine';

export async function POST(req: NextRequest) {
  try {
    const auth = await assertApiAuth(req, {
      requiredPermission: 'pos:shift:close',
      actionDescription: 'Close Cash Shift and Reconcile Till'
    });

    const body = await req.json();

    if (!body.shiftId) {
      return NextResponse.json(
        { success: false, error: 'shiftId is required to close shift' },
        { status: 400 }
      );
    }

    if (body.declaredClosingCash === undefined || body.declaredClosingCash < 0) {
      return NextResponse.json(
        { success: false, error: 'Valid declaredClosingCash count is required' },
        { status: 400 }
      );
    }

    const reconciliation = CashShiftEngine.closeShift({
      organizationId: auth.organizationId,
      shiftId: body.shiftId,
      declaredClosingCash: Number(body.declaredClosingCash),
      closedByUserId: auth.user.id,
      closingNotes: body.closingNotes
    });

    // Automatically generate final closing Z-Report
    const zReport = ZReportEngine.generateZReportForShift({
      organizationId: auth.organizationId,
      shiftId: body.shiftId
    });

    return NextResponse.json({
      success: true,
      reconciliation,
      zReport
    });
  } catch (err: unknown) {
    return handleApiAuthError(err);
  }
}
