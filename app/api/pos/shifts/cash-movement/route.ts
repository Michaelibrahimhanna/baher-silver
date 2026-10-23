import { NextRequest, NextResponse } from 'next/server';
import { assertApiAuth, handleApiAuthError } from '@/lib/auth/apiGuard';
import { CashShiftEngine } from '@/lib/services/pos/cashShiftEngine';
import { POSCashMovementType } from '@/lib/services/pos/types';

export async function POST(req: NextRequest) {
  try {
    const auth = await assertApiAuth(req, {
      requiredPermission: 'cash:manage',
      actionDescription: 'Execute Till Cash Movement (CASH_OUT / EXPENSE / SAFE_DROP)'
    });

    const body = await req.json();

    // 1. Amount Validation: Must be finite positive number
    const amount = Number(body.amount);
    if (typeof body.amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      const err: any = new Error('Valid positive amount is required for cash movement.');
      err.code = 'INVALID_AMOUNT';
      err.status = 400;
      throw err;
    }

    // 2. Movement Type Validation
    const validMovements: POSCashMovementType[] = ['CASH_OUT', 'EXPENSE', 'SAFE_DROP', 'CASH_IN'];
    if (!body.movementType || !validMovements.includes(body.movementType)) {
      const err: any = new Error(`Invalid movementType. Must be one of: ${validMovements.join(', ')}.`);
      err.code = 'INVALID_MOVEMENT_TYPE';
      err.status = 400;
      throw err;
    }

    // 3. Reason/Description Validation (Strictly Required)
    const reason = (body.reason || body.notes || '').trim();
    if (!reason) {
      const err: any = new Error('Reason/description is required for till cash movement.');
      err.code = 'REASON_REQUIRED';
      err.status = 400;
      throw err;
    }

    // 4. Server-Authoritative Shift Resolution & Tenant Isolation
    // The client is NEVER authoritative for organizationId, cashierId, branchId, terminalId, or drawer balance.
    let shift = null;
    if (body.shiftId) {
      shift = CashShiftEngine.getShiftById(body.shiftId, auth.organizationId);
      if (!shift) {
        // Check for cross-tenant breach attempt
        const anyTenantShift = CashShiftEngine.findShiftByIdAnyTenant(body.shiftId);
        if (anyTenantShift && anyTenantShift.organization_id !== auth.organizationId) {
          const err: any = new Error(
            `SECURITY_VIOLATION: Cross-tenant access denied. Shift "${body.shiftId}" belongs to another organization.`
          );
          err.code = 'FORBIDDEN_CROSS_TENANT';
          err.status = 403;
          throw err;
        }

        const err: any = new Error(`Shift "${body.shiftId}" not found.`);
        err.code = 'SHIFT_NOT_FOUND';
        err.status = 404;
        throw err;
      }
    } else {
      shift = CashShiftEngine.getActiveShiftForTerminal(auth.organizationId, body.terminalId || 'POS-01');
      if (!shift) {
        const err: any = new Error('Active shift required. No active shift found for terminal.');
        err.code = 'NO_ACTIVE_SHIFT';
        err.status = 400;
        throw err;
      }
    }

    // Shift Lifecycle check: Closed/Closing shift cannot receive movements
    if (shift.status === 'CLOSED' || shift.status === 'CLOSING') {
      const err: any = new Error(`INVALID_OPERATION: Cannot post movements to a ${shift.status} shift (${shift.id}).`);
      err.code = 'SHIFT_CLOSED_OR_CLOSING';
      err.status = 400;
      throw err;
    }

    const idempotencyKey = body.idempotencyKey || req.headers.get('x-idempotency-key') || undefined;

    // 5. Authoritative Execution with Solvency Guard
    let entry;
    if (body.movementType === 'CASH_OUT' || body.movementType === 'EXPENSE' || body.movementType === 'SAFE_DROP') {
      entry = CashShiftEngine.atomicDeductCashDrawer({
        organizationId: auth.organizationId,
        branchId: shift.branch_id,
        terminalId: shift.terminal_id,
        shiftId: shift.id,
        amount,
        movementType: body.movementType,
        actorUserId: auth.user.id,
        notes: reason,
        idempotencyKey
      });
    } else {
      entry = CashShiftEngine.recordJournalMovement({
        organizationId: auth.organizationId,
        branchId: shift.branch_id,
        terminalId: shift.terminal_id,
        shiftId: shift.id,
        movementType: 'CASH_IN',
        paymentMethod: 'CASH',
        amount,
        actorUserId: auth.user.id,
        notes: reason,
        idempotencyKey
      });
    }

    const updatedShift = CashShiftEngine.getShiftById(shift.id, auth.organizationId);

    return NextResponse.json({
      success: true,
      entry,
      shift: updatedShift
    });
  } catch (err: unknown) {
    return handleApiAuthError(err);
  }
}
