/**
 * Baher Silver — POS Discount & Manager Override Engine
 *
 * Canonical Rules:
 *   1. Default Cashier Authority:
 *      - Maximum discount: 5% OR 150 EGP (whichever is higher/applies).
 *      - If discount <= 5% || discount <= 150 EGP, cashier is authorized.
 *   2. Manager Override Requirement:
 *      - If discount > 5% && discount > 150 EGP, manager authorization is required.
 *      - Requires genuine manager credentials evaluated against SessionService.
 *      - Verifies manager role has 'pos:discount:override' permission.
 *      - Strict same-tenant isolation (cross-tenant credentials rejected with 403).
 *      - Mandatory non-empty reason.
 *      - Generates short-lived HMAC-signed override token.
 *   3. Checkout Protection:
 *      - Manager password NEVER enters checkout.
 *      - Checkout verifies the cryptographic override token.
 *      - Server recalculates all totals, cash drawer, and stock ledger effects.
 */

import crypto from 'crypto';
import { SessionService } from '@/lib/auth/sessionService';
import { ROLE_PERMISSIONS, UserRole } from '@/lib/auth/types';
import { POSManagerOverride } from './types';

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.MIP_SESSION_SECRET ||
  'baher-silver-portal-production-session-secret-key-32';

export const CASHIER_MAX_DISCOUNT_PERCENT = 5.0;
export const CASHIER_MAX_DISCOUNT_FIXED_EGP = 150.0;
export const OVERRIDE_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

export interface DiscountEvaluationResult {
  isValid: boolean;
  withinCashierLimit: boolean;
  requiresManagerOverride: boolean;
  discountAmount: number;
  discountPercent: number;
  subtotal: number;
  finalTotal: number;
  message?: string;
}

export interface ManagerOverridePayload {
  managerId: string;
  managerName: string;
  managerRole: UserRole;
  organizationId: string;
  approvedDiscount: number;
  subtotal: number;
  reason: string;
  issuedAt: number;
  expiresAt: number;
}

export class POSDiscountEngine {
  /**
   * Evaluates a requested discount against canonical cashier authority limits.
   */
  public static evaluateDiscount(
    subtotal: number,
    discountAmount: number
  ): DiscountEvaluationResult {
    if (typeof subtotal !== 'number' || !Number.isFinite(subtotal) || subtotal < 0) {
      const err: any = new Error('Invalid subtotal amount.');
      err.code = 'INVALID_SUBTOTAL';
      err.status = 400;
      throw err;
    }

    if (typeof discountAmount !== 'number' || !Number.isFinite(discountAmount)) {
      const err: any = new Error('Invalid discount amount.');
      err.code = 'INVALID_DISCOUNT_AMOUNT';
      err.status = 400;
      throw err;
    }

    const roundedDiscount = Number(discountAmount.toFixed(2));
    const roundedSubtotal = Number(subtotal.toFixed(2));

    if (roundedDiscount < 0) {
      const err: any = new Error('Discount amount cannot be negative.');
      err.code = 'INVALID_DISCOUNT_AMOUNT';
      err.status = 400;
      throw err;
    }

    if (roundedDiscount > roundedSubtotal) {
      const err: any = new Error(
        `Discount (${roundedDiscount} EGP) cannot exceed cart subtotal (${roundedSubtotal} EGP).`
      );
      err.code = 'DISCOUNT_EXCEEDS_SUBTOTAL';
      err.status = 400;
      throw err;
    }

    if (roundedDiscount === 0) {
      return {
        isValid: true,
        withinCashierLimit: true,
        requiresManagerOverride: false,
        discountAmount: 0,
        discountPercent: 0,
        subtotal: roundedSubtotal,
        finalTotal: roundedSubtotal
      };
    }

    const effectivePercent =
      roundedSubtotal > 0 ? Number(((roundedDiscount / roundedSubtotal) * 100).toFixed(2)) : 0;

    // Rule: Within cashier limit if percent <= 5% OR fixed amount <= 150 EGP
    const withinCashierLimit =
      effectivePercent <= CASHIER_MAX_DISCOUNT_PERCENT ||
      roundedDiscount <= CASHIER_MAX_DISCOUNT_FIXED_EGP;

    const requiresManagerOverride = !withinCashierLimit;
    const finalTotal = Number((roundedSubtotal - roundedDiscount).toFixed(2));

    return {
      isValid: true,
      withinCashierLimit,
      requiresManagerOverride,
      discountAmount: roundedDiscount,
      discountPercent: effectivePercent,
      subtotal: roundedSubtotal,
      finalTotal,
      message: requiresManagerOverride
        ? `Discount (${roundedDiscount} EGP / ${effectivePercent}%) exceeds cashier authority (5% or 150 EGP). Manager override required.`
        : undefined
    };
  }

  /**
   * Authenticates manager credentials, verifies RBAC and tenant match,
   * and issues a short-lived HMAC-signed override token.
   *
   * NOTE: The manager password is NEVER returned, logged, or forwarded to checkout.
   */
  public static async authenticateAndGenerateOverride(params: {
    managerEmail: string;
    managerPassword: string;
    organizationId: string;
    requestedDiscount: number;
    discountReason: string;
    subtotal: number;
  }): Promise<{
    overrideToken: string;
    manager: { id: string; name: string; role: UserRole };
    approvedDiscount: number;
  }> {
    const {
      managerEmail,
      managerPassword,
      organizationId,
      requestedDiscount,
      discountReason,
      subtotal
    } = params;

    if (!managerEmail || !managerPassword) {
      const err: any = new Error('Manager email and password are required for discount override.');
      err.code = 'MANAGER_CREDENTIALS_REQUIRED';
      err.status = 400;
      throw err;
    }

    const trimmedReason = (discountReason || '').trim();
    if (!trimmedReason) {
      const err: any = new Error('A non-empty reason is mandatory for manager discount override.');
      err.code = 'DISCOUNT_REASON_REQUIRED';
      err.status = 400;
      throw err;
    }

    // 1. Authenticate manager credentials authoritatively
    const authResult = await SessionService.authenticate(managerEmail, managerPassword);
    const manager = authResult.user;

    // 2. Strict Tenant Isolation Guard (Anti-IDOR)
    if (manager.organizationId !== organizationId) {
      const err: any = new Error(
        `Cross-tenant discount override forbidden. Manager does not belong to organization "${organizationId}".`
      );
      err.code = 'CROSS_TENANT_OVERRIDE_FORBIDDEN';
      err.status = 403;
      throw err;
    }

    // 3. RBAC Permission Guard: Must possess 'pos:discount:override'
    const rolePermissions = ROLE_PERMISSIONS[manager.role] || [];
    if (!rolePermissions.includes('pos:discount:override')) {
      const err: any = new Error(
        `User "${manager.email}" with role "${manager.role}" is not authorized to approve discount overrides.`
      );
      err.code = 'UNAUTHORIZED_OVERRIDE_ROLE';
      err.status = 403;
      throw err;
    }

    // 4. Validate discount boundaries
    const roundedDiscount = Number(requestedDiscount.toFixed(2));
    const roundedSubtotal = Number(subtotal.toFixed(2));

    if (roundedDiscount <= 0) {
      const err: any = new Error('Discount amount must be greater than zero.');
      err.code = 'INVALID_DISCOUNT_AMOUNT';
      err.status = 400;
      throw err;
    }

    if (roundedDiscount > roundedSubtotal) {
      const err: any = new Error(
        `Approved discount (${roundedDiscount} EGP) cannot exceed cart subtotal (${roundedSubtotal} EGP).`
      );
      err.code = 'DISCOUNT_EXCEEDS_SUBTOTAL';
      err.status = 400;
      throw err;
    }

    // 5. Generate HMAC-signed Override Token (15-min TTL)
    const now = Date.now();
    const payload: ManagerOverridePayload = {
      managerId: manager.id,
      managerName: manager.name,
      managerRole: manager.role,
      organizationId,
      approvedDiscount: roundedDiscount,
      subtotal: roundedSubtotal,
      reason: trimmedReason,
      issuedAt: now,
      expiresAt: now + OVERRIDE_TOKEN_TTL_MS
    };

    const payloadJson = JSON.stringify(payload);
    const payloadB64 = Buffer.from(payloadJson, 'utf-8').toString('base64url');
    const signature = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payloadB64)
      .digest('base64url');

    const overrideToken = `${payloadB64}.${signature}`;

    return {
      overrideToken,
      manager: {
        id: manager.id,
        name: manager.name,
        role: manager.role
      },
      approvedDiscount: roundedDiscount
    };
  }

  /**
   * Cryptographically verifies an HMAC-signed manager override token.
   *
   * Verifies:
   *   - Signature integrity using SESSION_SECRET
   *   - Expiration (15 minutes)
   *   - Tenant matching (anti-IDOR)
   *   - Manager role still possesses 'pos:discount:override'
   *   - Approved discount amount accommodates the requested discount
   */
  public static verifyOverrideToken(
    tokenString: string,
    organizationId: string,
    requestedDiscount: number
  ): POSManagerOverride {
    if (!tokenString || typeof tokenString !== 'string') {
      const err: any = new Error('Manager override token is required.');
      err.code = 'MANAGER_OVERRIDE_REQUIRED';
      err.status = 403;
      throw err;
    }

    const parts = tokenString.trim().split('.');
    if (parts.length !== 2) {
      const err: any = new Error('Malformed manager override token format.');
      err.code = 'INVALID_OVERRIDE_TOKEN';
      err.status = 403;
      throw err;
    }

    const [payloadB64, signature] = parts;

    // 1. Verify HMAC Signature
    const expectedSig = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payloadB64)
      .digest('base64url');

    const sigBuffer = Buffer.from(signature, 'utf-8');
    const expBuffer = Buffer.from(expectedSig, 'utf-8');

    if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
      const err: any = new Error('Cryptographic signature verification failed for manager override token.');
      err.code = 'INVALID_OVERRIDE_TOKEN_SIGNATURE';
      err.status = 403;
      throw err;
    }

    // 2. Parse Payload
    let payload: ManagerOverridePayload;
    try {
      const jsonStr = Buffer.from(payloadB64, 'base64url').toString('utf-8');
      payload = JSON.parse(jsonStr);
    } catch {
      const err: any = new Error('Invalid JSON payload in manager override token.');
      err.code = 'INVALID_OVERRIDE_TOKEN';
      err.status = 403;
      throw err;
    }

    // 3. Expiry Check
    if (Date.now() > payload.expiresAt) {
      const err: any = new Error('Manager override token has expired. Please re-authorize.');
      err.code = 'OVERRIDE_TOKEN_EXPIRED';
      err.status = 403;
      throw err;
    }

    // 4. Anti-IDOR Tenant Check
    if (payload.organizationId !== organizationId) {
      const err: any = new Error(
        `Cross-tenant token forbidden. Token was issued for tenant "${payload.organizationId}".`
      );
      err.code = 'CROSS_TENANT_OVERRIDE_TOKEN';
      err.status = 403;
      throw err;
    }

    // 5. Role Authorization Check
    const rolePermissions = ROLE_PERMISSIONS[payload.managerRole] || [];
    if (!rolePermissions.includes('pos:discount:override')) {
      const err: any = new Error(
        `Token issuer role "${payload.managerRole}" does not have 'pos:discount:override' permission.`
      );
      err.code = 'UNAUTHORIZED_OVERRIDE_ROLE';
      err.status = 403;
      throw err;
    }

    // 6. Discount Capacity Check
    const roundedRequested = Number(requestedDiscount.toFixed(2));
    if (roundedRequested > payload.approvedDiscount + 0.01) {
      const err: any = new Error(
        `Requested discount (${roundedRequested} EGP) exceeds manager-approved limit (${payload.approvedDiscount} EGP).`
      );
      err.code = 'DISCOUNT_EXCEEDS_OVERRIDE_LIMIT';
      err.status = 400;
      throw err;
    }

    return {
      manager_id: payload.managerId,
      manager_name: payload.managerName,
      manager_role: payload.managerRole,
      reason: payload.reason,
      approved_at: new Date(payload.issuedAt).toISOString(),
      approved_discount_amount: payload.approvedDiscount,
      subtotal: payload.subtotal
    };
  }
}
