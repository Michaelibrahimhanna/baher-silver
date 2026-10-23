import { NextRequest, NextResponse } from 'next/server';
import { assertApiAuth, handleApiAuthError } from '@/lib/auth/apiGuard';
import { POSDiscountEngine } from '@/lib/services/pos/posDiscountEngine';

export async function POST(req: NextRequest) {
  try {
    // 1. Authoritative verification of caller session
    const auth = await assertApiAuth(req, {
      requiredPermission: 'pos:sale:create',
      actionDescription: 'Request Manager Discount Override'
    });

    const body = await req.json();

    const managerEmail = (body.managerEmail || '').trim();
    const managerPassword = body.managerPassword;
    const requestedDiscount = Number(body.requestedDiscount || body.discountAmount || 0);
    const discountReason = (body.discountReason || body.reason || '').trim();
    const subtotal = Number(body.subtotal || 0);

    if (!managerEmail || !managerPassword) {
      return NextResponse.json(
        { success: false, error: 'Manager email and password are required.' },
        { status: 400 }
      );
    }

    if (!discountReason) {
      return NextResponse.json(
        { success: false, error: 'A non-empty reason is mandatory for manager discount override.' },
        { status: 400 }
      );
    }

    // 2. Authenticate manager & issue cryptographic override token
    // Security: organizationId is derived strictly from caller's verified auth context
    const overrideResult = await POSDiscountEngine.authenticateAndGenerateOverride({
      managerEmail,
      managerPassword,
      organizationId: auth.organizationId,
      requestedDiscount,
      discountReason,
      subtotal
    });

    return NextResponse.json({
      success: true,
      overrideToken: overrideResult.overrideToken,
      manager: overrideResult.manager,
      approvedDiscount: overrideResult.approvedDiscount
    });
  } catch (err: unknown) {
    return handleApiAuthError(err);
  }
}
