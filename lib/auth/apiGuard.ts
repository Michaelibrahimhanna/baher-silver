/**
 * Baher Silver Portal — Server-Side API Guard
 *
 * Enforces authoritative authentication, permission checks (RBAC),
 * and tenant isolation for all sensitive Next.js route handlers.
 *
 * CRITICAL GUARDRAIL:
 * Does NOT trust client-provided tenantId, userId, or role in request body.
 * Derives trusted identity strictly from verified server-side session.
 */

import { NextResponse } from 'next/server';
import { Permission, UserRole, AuthenticatedRequestContext, ROLE_PERMISSIONS } from './types';
import { SessionService } from './sessionService';
import { RbacService } from './rbacService';
import { extractSessionToken } from './authCookies';

export interface ApiGuardOptions {
  requiredPermission?: Permission;
  requiredRole?: UserRole;
  targetTenantId?: string;
  targetUserId?: string;
  actionDescription?: string;
}

/**
 * Authoritatively validates authentication, RBAC permissions, and tenant isolation.
 * Throws 401 or 403 on violations.
 */
export async function assertApiAuth(
  request: Request,
  options: ApiGuardOptions = {}
): Promise<AuthenticatedRequestContext> {
  // 1. Extract session token from cookie or Authorization header
  const token = extractSessionToken(request);
  if (!token) {
    const err: any = new Error('Authentication required. Missing or expired session cookie.');
    err.code = 'UNAUTHENTICATED';
    err.status = 401;
    throw err;
  }

  // 2. Cryptographically validate session token
  const authResult = await SessionService.validateSession(token);
  if (!authResult) {
    const err: any = new Error('Invalid, expired, or revoked session. Please log in again.');
    err.code = 'UNAUTHENTICATED';
    err.status = 401;
    throw err;
  }

  const { session, user } = authResult;

  // 3. Enforce Role check if required
  if (options.requiredRole && user.role !== options.requiredRole && user.role !== 'Owner') {
    const err: any = new Error(
      `SECURITY_VIOLATION: Role "${user.role}" is not authorized. Required role: "${options.requiredRole}".`
    );
    err.code = 'FORBIDDEN_ROLE_RESTRICTED';
    err.status = 403;
    throw err;
  }

  // 4. Enforce Granular RBAC Permission check
  if (options.requiredPermission) {
    RbacService.assertPermission(user, options.requiredPermission, options.actionDescription);
  }

  // 5. Enforce Strict Tenant Scope Isolation (Zero Cross-Tenant Leaks)
  if (options.targetTenantId) {
    RbacService.assertTenantScope(user, options.targetTenantId);
  }

  // 6. Enforce User Scope Isolation (Zero Cross-User Leaks)
  if (options.targetUserId) {
    RbacService.assertUserScope(user, options.targetUserId);
  }

  return {
    user,
    session,
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
    permissions: ROLE_PERMISSIONS[user.role] || []
  };
}

/**
 * Standard error response formatter for API route handlers.
 */
export function handleApiAuthError(error: unknown): NextResponse {
  const err = error as any;
  const status = err?.status || (err?.code === 'UNAUTHENTICATED' ? 401 : 403);
  const code = err?.code || (status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN');
  const message = err?.message || 'Access denied by security gateway.';

  return NextResponse.json(
    {
      success: false,
      error: code,
      message,
      timestamp: new Date().toISOString()
    },
    { status }
  );
}
