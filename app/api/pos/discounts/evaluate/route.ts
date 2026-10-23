import { NextRequest, NextResponse } from 'next/server';
import { assertApiAuth, handleApiAuthError } from '@/lib/auth/apiGuard';
import { POSDiscountEngine } from '@/lib/services/pos/posDiscountEngine';

export async function POST(req: NextRequest) {
  try {
    // 1. Authoritative verification of caller session
    await assertApiAuth(req, {
      requiredPermission: 'pos:sale:create',
      actionDescription: 'Evaluate POS Cart Discount'
    });

    const body = await req.json();

    const subtotal = Number(body.subtotal);
    if (isNaN(subtotal) || subtotal < 0) {
      return NextResponse.json(
        { success: false, error: 'Subtotal must be a valid non-negative number.' },
        { status: 400 }
      );
    }

    let discountAmount = 0;
    if (body.discountPercent !== undefined && body.discountPercent !== null) {
      const percent = Number(body.discountPercent);
      if (isNaN(percent) || percent < 0 || percent > 100) {
        return NextResponse.json(
          { success: false, error: 'Discount percent must be between 0 and 100.' },
          { status: 400 }
        );
      }
      discountAmount = Number(((subtotal * percent) / 100).toFixed(2));
    } else if (body.discountAmount !== undefined && body.discountAmount !== null) {
      discountAmount = Number(body.discountAmount);
    }

    const evaluation = POSDiscountEngine.evaluateDiscount(subtotal, discountAmount);

    return NextResponse.json({
      success: true,
      evaluation
    });
  } catch (err: unknown) {
    return handleApiAuthError(err);
  }
}
