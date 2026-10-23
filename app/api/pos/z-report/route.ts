import { NextRequest, NextResponse } from 'next/server';
import { assertApiAuth, handleApiAuthError } from '@/lib/auth/apiGuard';
import { ZReportEngine } from '@/lib/services/pos/zReportEngine';
import { CashShiftEngine } from '@/lib/services/pos/cashShiftEngine';

export async function GET(req: NextRequest) {
  try {
    const auth = await assertApiAuth(req, {
      requiredPermission: 'report:read',
      actionDescription: 'Generate Daily Closing Z-Report'
    });

    const { searchParams } = new URL(req.url);
    let shiftId = searchParams.get('shiftId');
    const terminalId = searchParams.get('terminalId') || 'POS-01';

    if (!shiftId) {
      const active = CashShiftEngine.getActiveShiftForTerminal(auth.organizationId, terminalId);
      if (!active) {
        return NextResponse.json(
          { success: false, error: `No active shift found for terminal "${terminalId}"` },
          { status: 404 }
        );
      }
      shiftId = active.id;
    }

    const zReport = ZReportEngine.generateZReportForShift({
      organizationId: auth.organizationId,
      shiftId
    });

    return NextResponse.json({
      success: true,
      zReport
    });
  } catch (err: unknown) {
    return handleApiAuthError(err);
  }
}
