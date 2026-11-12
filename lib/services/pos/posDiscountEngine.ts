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
import fs from 'fs';
import path from 'path';
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

/**
 * Canonicalizes boutique branch identifiers.
 * Normalizes Cairo main boutique aliases ('branch-cairo', 'branch_cairo', 'branch_cairo_main')
 * to the canonical form 'branch_cairo_main'.
 */
export function normalizeBranchId(branchId?: string): string {
  if (!branchId) return '';
  const trimmed = branchId.trim().toLowerCase();
  if (trimmed === 'branch-cairo' || trimmed === 'branch_cairo' || trimmed === 'branch_cairo_main') {
    return 'branch_cairo_main';
  }
  return trimmed;
}

/**
 * Checks whether an issued token branch matches the target checkout branch.
 * Supports organization-wide wildcard '*' or 'ALL'.
 */
export function isBranchMatch(tokenBranch?: string, targetBranch?: string): boolean {
  if (!tokenBranch || tokenBranch === '*' || tokenBranch === 'ALL') return true;
  if (!targetBranch) return false;
  return normalizeBranchId(tokenBranch) === normalizeBranchId(targetBranch);
}

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
  tokenId: string;
  actionType: 'DISCOUNT_OVERRIDE' | 'RATE_OVERRIDE' | 'WEIGHT_OVERRIDE';
  managerId: string;
  managerName: string;
  managerRole: UserRole;
  organizationId: string;
  branchId: string;
  approvedDiscount: number;
  overrideRate?: number;
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
   * Authenticates manager credentials, verifies RBAC, tenant, and branch match,
   * and issues a short-lived HMAC-signed override token with cryptographic single-use nonce.
   *
   * NOTE: The manager password is NEVER returned, logged, or forwarded to checkout.
   */
  public static async authenticateAndGenerateOverride(params: {
    managerEmail: string;
    managerPassword: string;
    organizationId: string;
    branchId?: string;
    requestedDiscount: number;
    discountReason: string;
    subtotal: number;
  }): Promise<{
    overrideToken: string;
    manager: { id: string; name: string; role: UserRole };
    approvedDiscount: number;
    branchId: string;
    tokenId: string;
  }> {
    const {
      managerEmail,
      managerPassword,
      organizationId,
      branchId,
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

    // 4. Branch Scoping Guard:
    // StoreManager is bound to their assigned branch.
    // Admin / Owner possess organization-wide authority ('org:manage').
    const isOrgWideManager =
      rolePermissions.includes('org:manage') ||
      manager.role === 'Owner' ||
      manager.role === 'Admin';
    const effectiveBranch = branchId || manager.branchId || 'branch_cairo_main';

    if (!isOrgWideManager && manager.branchId) {
      if (branchId && !isBranchMatch(manager.branchId, branchId)) {
        const err: any = new Error(
          `Cross-branch discount override forbidden. Manager belongs to branch "${manager.branchId}", cannot authorize overrides for branch "${branchId}".`
        );
        err.code = 'CROSS_BRANCH_OVERRIDE_FORBIDDEN';
        err.status = 403;
        throw err;
      }
    }

    // 5. Validate discount boundaries
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

    // 6. Generate HMAC-signed Override Token with unique tokenId & branch binding (15-min TTL)
    const now = Date.now();
    const tokenId = `ovr_disc_${now}_${crypto.randomBytes(8).toString('hex')}`;
    const tokenBranch = branchId || manager.branchId || (isOrgWideManager ? '*' : 'branch_cairo_main');

    const payload: ManagerOverridePayload = {
      tokenId,
      actionType: 'DISCOUNT_OVERRIDE',
      managerId: manager.id,
      managerName: manager.name,
      managerRole: manager.role,
      organizationId,
      branchId: tokenBranch,
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
      approvedDiscount: roundedDiscount,
      branchId: tokenBranch,
      tokenId
    };
  }

  /**
   * Authenticates manager credentials and generates an HMAC-signed rate override token
   * with unique single-use tokenId and branch binding.
   */
  public static async authenticateAndGenerateRateOverride(params: {
    managerEmail: string;
    managerPassword: string;
    organizationId: string;
    branchId?: string;
    overrideRate: number;
    reason: string;
  }): Promise<{
    overrideToken: string;
    manager: { id: string; name: string; role: UserRole };
    branchId: string;
    tokenId: string;
  }> {
    const { managerEmail, managerPassword, organizationId, branchId, overrideRate, reason } = params;
    if (!managerEmail || !managerPassword) {
      const err: any = new Error('Manager email and password are required for rate override.');
      err.code = 'MANAGER_CREDENTIALS_REQUIRED';
      err.status = 400;
      throw err;
    }

    const trimmedReason = (reason || '').trim();
    if (!trimmedReason) {
      const err: any = new Error('A non-empty reason is mandatory for manager rate override.');
      err.code = 'RATE_OVERRIDE_REASON_REQUIRED';
      err.status = 400;
      throw err;
    }

    const authResult = await SessionService.authenticate(managerEmail, managerPassword);
    const manager = authResult.user;

    if (manager.organizationId !== organizationId) {
      const err: any = new Error(
        `Cross-tenant rate override forbidden. Manager does not belong to organization "${organizationId}".`
      );
      err.code = 'CROSS_TENANT_OVERRIDE_FORBIDDEN';
      err.status = 403;
      throw err;
    }

    const rolePermissions = ROLE_PERMISSIONS[manager.role] || [];
    if (!rolePermissions.includes('pos:discount:override')) {
      const err: any = new Error(
        `User "${manager.email}" with role "${manager.role}" is not authorized to approve spot rate overrides.`
      );
      err.code = 'UNAUTHORIZED_OVERRIDE_ROLE';
      err.status = 403;
      throw err;
    }

    // Branch Scoping Guard
    const isOrgWideManager =
      rolePermissions.includes('org:manage') ||
      manager.role === 'Owner' ||
      manager.role === 'Admin';

    if (!isOrgWideManager && manager.branchId) {
      if (branchId && !isBranchMatch(manager.branchId, branchId)) {
        const err: any = new Error(
          `Cross-branch rate override forbidden. Manager belongs to branch "${manager.branchId}", cannot authorize overrides for branch "${branchId}".`
        );
        err.code = 'CROSS_BRANCH_OVERRIDE_FORBIDDEN';
        err.status = 403;
        throw err;
      }
    }

    const now = Date.now();
    const tokenId = `ovr_rate_${now}_${crypto.randomBytes(8).toString('hex')}`;
    const tokenBranch = branchId || manager.branchId || (isOrgWideManager ? '*' : 'branch_cairo_main');

    const payload: ManagerOverridePayload = {
      tokenId,
      actionType: 'RATE_OVERRIDE',
      managerId: manager.id,
      managerName: manager.name,
      managerRole: manager.role,
      organizationId,
      branchId: tokenBranch,
      approvedDiscount: 0,
      overrideRate,
      subtotal: 0,
      reason: `Rate override to ${overrideRate} EGP/g: ${trimmedReason}`,
      issuedAt: now,
      expiresAt: now + OVERRIDE_TOKEN_TTL_MS
    };

    const payloadJson = JSON.stringify(payload);
    const payloadB64 = Buffer.from(payloadJson, 'utf-8').toString('base64url');
    const signature = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payloadB64)
      .digest('base64url');

    return {
      overrideToken: `${payloadB64}.${signature}`,
      manager: {
        id: manager.id,
        name: manager.name,
        role: manager.role
      },
      branchId: tokenBranch,
      tokenId
    };
  }

  /**
   * Authenticates manager credentials and generates an HMAC-signed weight override token
   * for approving scale weight variance or authorized manual weight entry.
   */
  public static async authenticateAndGenerateWeightOverride(params: {
    managerEmail: string;
    managerPassword: string;
    organizationId: string;
    branchId?: string;
    reason: string;
    varianceGrams?: number;
  }): Promise<{
    overrideToken: string;
    manager: { id: string; name: string; role: UserRole };
    branchId: string;
    tokenId: string;
  }> {
    const { managerEmail, managerPassword, organizationId, branchId, reason } = params;
    if (!managerEmail || !managerPassword) {
      const err: any = new Error('Manager email and password are required for weight override.');
      err.code = 'MANAGER_CREDENTIALS_REQUIRED';
      err.status = 400;
      throw err;
    }

    const trimmedReason = (reason || '').trim();
    if (!trimmedReason) {
      const err: any = new Error('A non-empty reason is mandatory for manager weight override.');
      err.code = 'WEIGHT_OVERRIDE_REASON_REQUIRED';
      err.status = 400;
      throw err;
    }

    const authResult = await SessionService.authenticate(managerEmail, managerPassword);
    const manager = authResult.user;

    if (manager.organizationId !== organizationId) {
      const err: any = new Error(
        `Cross-tenant weight override forbidden. Manager does not belong to organization "${organizationId}".`
      );
      err.code = 'CROSS_TENANT_OVERRIDE_FORBIDDEN';
      err.status = 403;
      throw err;
    }

    const rolePermissions = ROLE_PERMISSIONS[manager.role] || [];
    if (!rolePermissions.includes('weight:override') && !rolePermissions.includes('pos:discount:override') && manager.role !== 'Owner' && manager.role !== 'Admin') {
      const err: any = new Error(
        `User "${manager.email}" with role "${manager.role}" is not authorized to approve weight overrides.`
      );
      err.code = 'UNAUTHORIZED_OVERRIDE_ROLE';
      err.status = 403;
      throw err;
    }

    const isOrgWideManager =
      rolePermissions.includes('org:manage') ||
      manager.role === 'Owner' ||
      manager.role === 'Admin';

    if (!isOrgWideManager && manager.branchId) {
      if (branchId && !isBranchMatch(manager.branchId, branchId)) {
        const err: any = new Error(
          `Cross-branch weight override forbidden. Manager belongs to branch "${manager.branchId}", cannot authorize overrides for branch "${branchId}".`
        );
        err.code = 'CROSS_BRANCH_OVERRIDE_FORBIDDEN';
        err.status = 403;
        throw err;
      }
    }

    const tokenBranch = isOrgWideManager ? (branchId || '*') : (manager.branchId || branchId || '*');
    const now = Date.now();
    const tokenId = `ovr_wt_${now}_${crypto.randomBytes(6).toString('hex')}`;

    const payload: ManagerOverridePayload = {
      tokenId,
      actionType: 'WEIGHT_OVERRIDE',
      managerId: manager.id,
      managerName: manager.name,
      managerRole: manager.role,
      organizationId,
      branchId: tokenBranch,
      approvedDiscount: 0,
      subtotal: 0,
      reason: trimmedReason,
      issuedAt: now,
      expiresAt: now + OVERRIDE_TOKEN_TTL_MS
    };

    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payloadB64)
      .digest('base64url');

    return {
      overrideToken: `${payloadB64}.${signature}`,
      manager: {
        id: manager.id,
        name: manager.name,
        role: manager.role
      },
      branchId: tokenBranch,
      tokenId
    };
  }

  /**
   * Cryptographically verifies an HMAC-signed manager override token.
   *
   * Verifies:
   *   - Signature integrity using SESSION_SECRET
   *   - Expiration (15 minutes)
   *   - Tenant matching (anti-IDOR)
   *   - Intended operation (DISCOUNT_OVERRIDE vs RATE_OVERRIDE vs WEIGHT_OVERRIDE)
   *   - Branch binding (anti-cross-branch token reuse)
   *   - Manager role still possesses authority
   *   - Single-use replay protection (rejects if already consumed on disk)
   *   - Approved discount amount accommodates the requested discount
   */
  public static verifyOverrideToken(
    tokenString: string,
    organizationId: string,
    requestedDiscount: number,
    options?: {
      branchId?: string;
      expectedAction?: 'DISCOUNT_OVERRIDE' | 'RATE_OVERRIDE' | 'WEIGHT_OVERRIDE';
    }
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

    // 5. Intended Operation Guard
    if (options?.expectedAction && payload.actionType) {
      if (payload.actionType !== options.expectedAction) {
        const err: any = new Error(
          `OVERRIDE_ACTION_MISMATCH: Token was issued for "${payload.actionType}" but presented for "${options.expectedAction}". Replay across distinct operations prohibited.`
        );
        err.code = 'OVERRIDE_ACTION_MISMATCH';
        err.status = 403;
        throw err;
      }
    }

    // 6. Branch Binding Guard
    if (options?.branchId && payload.branchId) {
      if (!isBranchMatch(payload.branchId, options.branchId)) {
        const err: any = new Error(
          `CROSS_BRANCH_OVERRIDE_TOKEN: Token was issued for branch "${payload.branchId}" and cannot authorize operations in branch "${options.branchId}".`
        );
        err.code = 'CROSS_BRANCH_OVERRIDE_TOKEN';
        err.status = 403;
        throw err;
      }
    }

    // 7. Role Authorization Check
    const rolePermissions = ROLE_PERMISSIONS[payload.managerRole] || [];
    if (!rolePermissions.includes('pos:discount:override')) {
      const err: any = new Error(
        `Token issuer role "${payload.managerRole}" does not have 'pos:discount:override' permission.`
      );
      err.code = 'UNAUTHORIZED_OVERRIDE_ROLE';
      err.status = 403;
      throw err;
    }

    // 8. Replay / Single-Use Check (Persistent Check)
    if (POSDiscountEngine.isTokenConsumed(tokenString)) {
      const err: any = new Error(
        'OVERRIDE_TOKEN_ALREADY_CONSUMED: Manager override token has already been consumed in a completed transaction. Replay is strictly prohibited.'
      );
      err.code = 'OVERRIDE_TOKEN_ALREADY_CONSUMED';
      err.status = 409;
      throw err;
    }

    // 9. Discount Capacity Check (for discount overrides)
    if (options?.expectedAction !== 'RATE_OVERRIDE' && payload.actionType !== 'RATE_OVERRIDE') {
      const roundedRequested = Number(requestedDiscount.toFixed(2));
      if (roundedRequested > payload.approvedDiscount + 0.01) {
        const err: any = new Error(
          `Requested discount (${roundedRequested} EGP) exceeds manager-approved limit (${payload.approvedDiscount} EGP).`
        );
        err.code = 'DISCOUNT_EXCEEDS_OVERRIDE_LIMIT';
        err.status = 400;
        throw err;
      }
    }

    return {
      manager_id: payload.managerId,
      manager_name: payload.managerName,
      manager_role: payload.managerRole,
      reason: payload.reason,
      approved_at: new Date(payload.issuedAt).toISOString(),
      approved_discount_amount: payload.approvedDiscount,
      subtotal: payload.subtotal,
      token_id: payload.tokenId,
      branch_id: payload.branchId,
      action_type: payload.actionType
    };
  }

  // ===========================================================================
  // DURABLE, ATOMIC SINGLE-USE TOKEN CONSUMPTION REGISTRY
  // ===========================================================================

  /**
   * Derives a safe, non-sensitive fingerprint key for a token.
   * Uses tokenId if present, or SHA-256 of the token signature.
   */
  public static getTokenKey(tokenString: string): string {
    const parts = (tokenString || '').trim().split('.');
    if (parts.length >= 2) {
      try {
        const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf-8'));
        if (payload.tokenId) return payload.tokenId;
      } catch (_) {}
      return crypto.createHash('sha256').update(parts[1]).digest('hex');
    }
    return crypto.createHash('sha256').update(tokenString).digest('hex');
  }

  /**
   * Checks whether a token has already been consumed and committed.
   */
  public static isTokenConsumed(tokenString: string): boolean {
    const key = this.getTokenKey(tokenString);
    const registryDir = path.resolve(process.cwd(), '.data', 'consumed_override_tokens');
    const markerFile = path.join(registryDir, `${key}.json`);
    if (fs.existsSync(markerFile)) {
      try {
        const content = JSON.parse(fs.readFileSync(markerFile, 'utf8'));
        return content.status === 'COMMITTED';
      } catch (_) {
        return true;
      }
    }
    return false;
  }

  /**
   * Atomically reserves a token for checkout execution.
   * Guarantees that concurrent requests cannot both acquire the token.
   * Throws OVERRIDE_TOKEN_ALREADY_CONSUMED (409) on conflict.
   */
  public static reserveOverrideToken(
    tokenString: string,
    context: { organizationId: string; branchId: string; actorUserId: string }
  ): { tokenKey: string } {
    const key = this.getTokenKey(tokenString);
    const registryDir = path.resolve(process.cwd(), '.data', 'consumed_override_tokens');
    if (!fs.existsSync(registryDir)) {
      fs.mkdirSync(registryDir, { recursive: true });
    }

    const markerFile = path.join(registryDir, `${key}.json`);
    const record = {
      tokenKey: key,
      status: 'PENDING',
      organizationId: context.organizationId,
      branchId: context.branchId,
      actorUserId: context.actorUserId,
      reservedAt: Date.now()
    };

    try {
      // Atomic creation via exclusive creation flag 'wx' (OS kernel primitive)
      fs.writeFileSync(markerFile, JSON.stringify(record), { flag: 'wx' });
      return { tokenKey: key };
    } catch (err: any) {
      if (err.code === 'EEXIST') {
        try {
          const existing = JSON.parse(fs.readFileSync(markerFile, 'utf8'));
          if (existing.status === 'COMMITTED') {
            const conflictErr: any = new Error(
              'OVERRIDE_TOKEN_ALREADY_CONSUMED: Manager override token has already been consumed in a completed transaction. Replay is prohibited.'
            );
            conflictErr.code = 'OVERRIDE_TOKEN_ALREADY_CONSUMED';
            conflictErr.status = 409;
            throw conflictErr;
          }

          // If pending and less than 30s old, actively in-flight
          if (existing.status === 'PENDING' && Date.now() - existing.reservedAt < 30000) {
            const conflictErr: any = new Error(
              'OVERRIDE_TOKEN_ALREADY_CONSUMED: Manager override token is currently being processed by another concurrent transaction.'
            );
            conflictErr.code = 'OVERRIDE_TOKEN_ALREADY_CONSUMED';
            conflictErr.status = 409;
            throw conflictErr;
          }

          // Stale reservation (>30s) -> overwrite
          fs.writeFileSync(markerFile, JSON.stringify(record), { flag: 'w' });
          return { tokenKey: key };
        } catch (innerErr: any) {
          if (innerErr.code === 'OVERRIDE_TOKEN_ALREADY_CONSUMED') throw innerErr;
        }
      }
      throw err;
    }
  }

  /**
   * Commits token consumption upon successful transaction persistence.
   * Appends non-sensitive audit event to consumed_override_tokens.jsonl.
   */
  public static commitOverrideToken(
    tokenString: string,
    context: {
      transactionId: string;
      receiptNumber: string;
      managerId: string;
      branchId: string;
      reason: string;
    }
  ): void {
    const key = this.getTokenKey(tokenString);
    const dataDir = path.resolve(process.cwd(), '.data');
    const registryDir = path.join(dataDir, 'consumed_override_tokens');
    const auditLogFile = path.join(dataDir, 'consumed_override_tokens.jsonl');

    if (!fs.existsSync(registryDir)) {
      fs.mkdirSync(registryDir, { recursive: true });
    }

    const markerFile = path.join(registryDir, `${key}.json`);
    const commitRecord = {
      tokenKey: key,
      status: 'COMMITTED',
      transactionId: context.transactionId,
      receiptNumber: context.receiptNumber,
      managerId: context.managerId,
      branchId: context.branchId,
      reason: context.reason,
      committedAt: new Date().toISOString()
    };

    fs.writeFileSync(markerFile, JSON.stringify(commitRecord), { flag: 'w' });

    try {
      fs.appendFileSync(auditLogFile, JSON.stringify(commitRecord) + '\n', 'utf8');
    } catch (e: any) {
      console.error('[POSDiscountEngine] Warning: Could not append consumed token audit log:', e.message);
    }
  }

  /**
   * Releases a pending reservation if transaction aborts before completion.
   */
  public static releaseOverrideTokenReservation(tokenString: string): void {
    const key = this.getTokenKey(tokenString);
    const registryDir = path.resolve(process.cwd(), '.data', 'consumed_override_tokens');
    const markerFile = path.join(registryDir, `${key}.json`);
    if (fs.existsSync(markerFile)) {
      try {
        const existing = JSON.parse(fs.readFileSync(markerFile, 'utf8'));
        if (existing.status === 'PENDING') {
          fs.unlinkSync(markerFile);
        }
      } catch (_) {}
    }
  }
}
