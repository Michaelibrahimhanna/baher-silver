import { NextRequest, NextResponse } from 'next/server';
import { assertApiAuth, handleApiAuthError } from '@/lib/auth/apiGuard';
import { WeightAuditEngine, WeightSource } from '@/lib/services/pos/weightAuditEngine';
import { getWeightIntegrityPolicy } from '@/lib/services/pos/weightPolicyConfig';
import { SessionService } from '@/lib/auth/sessionService';
import { RbacService } from '@/lib/auth/rbacService';

export async function POST(req: NextRequest) {
  try {
    const auth = await assertApiAuth(req, {
      actionDescription: 'Verify and Record Physical Weight'
    });

    const body = await req.json();

    const source: WeightSource = body.source || 'SCALE';
    const grossWeight = Number(body.grossWeightGrams ?? body.gross_weight_grams ?? 0);
    const stoneWeight = Number(body.stoneWeightGrams ?? body.stone_weight_grams ?? 0);
    const registeredGrossWeight =
      body.registeredGrossWeightGrams !== undefined
        ? Number(body.registeredGrossWeightGrams)
        : body.registered_gross_weight_grams !== undefined
        ? Number(body.registered_gross_weight_grams)
        : undefined;

    let actor = auth.user;
    let varianceApprovedByUserId: string | undefined;
    let varianceApprovedByRole: string | undefined;

    const managerEmail = (body.managerEmail || '').trim();
    const managerPassword = body.managerPassword;

    // 1. If source is MANUAL and current user lacks weight:manual_entry permission,
    // allow elevating through manager credentials
    if (source === 'MANUAL' && !RbacService.hasPermission(auth.user.role, 'weight:manual_entry')) {
      if (!managerEmail || !managerPassword) {
        return NextResponse.json(
          {
            success: false,
            error: 'FORBIDDEN',
            message: 'Manual weight entry requires Admin authority or manager authorization.'
          },
          { status: 403 }
        );
      }

      const authManager = await SessionService.authenticate(managerEmail, managerPassword);
      if (!RbacService.hasPermission(authManager.user.role, 'weight:manual_entry')) {
        return NextResponse.json(
          {
            success: false,
            error: 'FORBIDDEN',
            message: `User ${authManager.user.email} (${authManager.user.role}) lacks manual weight entry authority.`
          },
          { status: 403 }
        );
      }
      actor = authManager.user;
    }

    // 2. If there is a weight variance exceeding tolerance and manager credentials are provided,
    // verify the manager's role for variance approval
    const policy = getWeightIntegrityPolicy();
    if (
      registeredGrossWeight !== undefined &&
      registeredGrossWeight > 0 &&
      Math.abs(grossWeight - registeredGrossWeight) > policy.commercialToleranceGrams + 0.0001
    ) {
      if (managerEmail && managerPassword) {
        const authManager = await SessionService.authenticate(managerEmail, managerPassword);
        if (!policy.overrideAllowedRoles.includes(authManager.user.role)) {
          return NextResponse.json(
            {
              success: false,
              error: 'FORBIDDEN',
              message: `User ${authManager.user.email} (${authManager.user.role}) is not authorized to approve weight variances.`
            },
            { status: 403 }
          );
        }
        varianceApprovedByUserId = authManager.user.id;
        varianceApprovedByRole = authManager.user.role;
      }
    }

    const record = WeightAuditEngine.verifyAndRecordWeight({
      organizationId: auth.organizationId,
      branchId: body.branchId || 'branch-cairo',
      terminalId: body.terminalId || 'POS-01',
      actor,
      source,
      grossWeightGrams: grossWeight,
      stoneWeightGrams: stoneWeight,
      registeredGrossWeightGrams: registeredGrossWeight,
      manualReason: body.manualReason || body.manual_reason,
      varianceOverrideReason: body.varianceOverrideReason || body.variance_override_reason || body.manualReason,
      varianceApprovedByUserId,
      varianceApprovedByRole,
      pieceId: body.pieceId || body.piece_id,
      sku: body.sku,
      serialNumber: body.serialNumber || body.serial_number,
      scaleAttestation: body.scaleAttestation || body.scale_attestation,
      requireScaleAttestation: Boolean(body.requireScaleAttestation)
    });

    return NextResponse.json({
      success: true,
      record
    });
  } catch (err: unknown) {
    return handleApiAuthError(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await assertApiAuth(req, {
      requiredPermission: 'audit:read',
      actionDescription: 'Query Weight Audit Trail'
    });

    const { searchParams } = new URL(req.url);
    const serial = searchParams.get('serial_number') || undefined;
    const source = (searchParams.get('source') as WeightSource) || undefined;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 50;

    const records = WeightAuditEngine.queryAuditRecords({
      organizationId: auth.organizationId,
      serialNumber: serial,
      source,
      limit
    });

    return NextResponse.json({
      success: true,
      count: records.length,
      records
    });
  } catch (err: unknown) {
    return handleApiAuthError(err);
  }
}
