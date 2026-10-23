/**
 * Baher Silver Portal — RBAC & Scope Enforcement Service
 * 
 * Enforces role permissions, multi-tenant isolation, and resource scoping.
 */

import { UserRole, UserPersona, Permission, ROLE_PERMISSIONS, SafeUser } from './types';

export class RbacService {
  /**
   * Returns the persona associated with a given role.
   */
  public static getPersonaForRole(role: UserRole): UserPersona {
    switch (role) {
      case 'Owner':
        return 'executive_owner';
      case 'Admin':
      case 'Developer':
      case 'Member':
      case 'Agent':
      case 'Viewer':
      case 'Service':
        return 'builder_developer';
      case 'StoreManager':
      case 'Cashier':
      case 'InventoryOperator':
      case 'Accountant':
        return 'business_operator';
      default:
        return 'business_operator';
    }
  }

  /**
   * Checks if a given role has a specific permission.
   */
  public static hasPermission(role: UserRole, permission: Permission): boolean {
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission);
  }

  /**
   * Asserts that a user has a specific permission; throws 403 error on failure.
   */
  public static assertPermission(user: SafeUser, permission: Permission, actionDescription: string = 'Operation'): void {
    if (!this.hasPermission(user.role, permission)) {
      const err: any = new Error(
        `SECURITY_VIOLATION: User "${user.email}" with role "${user.role}" lacks required permission "${permission}" for ${actionDescription}.`
      );
      err.code = 'FORBIDDEN_USER_PERMISSION';
      err.status = 403;
      throw err;
    }
  }

  /**
   * Asserts that a user is operating within their authoritative organization/tenant scope.
   * Throws 403 on cross-tenant access attempts.
   */
  public static assertTenantScope(user: SafeUser, targetTenantId?: string): void {
    if (!targetTenantId) return;

    // Strict Tenant Isolation: User tenant must match target resource tenant
    if (user.organizationId !== targetTenantId) {
      const err: any = new Error(
        `SECURITY_VIOLATION: Cross-tenant access denied. User belongs to tenant "${user.organizationId}", cannot access tenant "${targetTenantId}".`
      );
      err.code = 'FORBIDDEN_CROSS_TENANT';
      err.status = 403;
      throw err;
    }
  }

  /**
   * Asserts that a user is operating on their own data or is an Admin/Owner.
   * Throws 403 on cross-user access attempts.
   */
  public static assertUserScope(user: SafeUser, targetUserId?: string): void {
    if (!targetUserId) return;

    // Owners and Admins can manage users within their tenant
    if (user.role === 'Owner' || user.role === 'Admin') {
      return;
    }

    if (user.id !== targetUserId) {
      const err: any = new Error(
        `SECURITY_VIOLATION: Cross-user access denied. User "${user.id}" cannot access or modify user "${targetUserId}".`
      );
      err.code = 'FORBIDDEN_CROSS_USER';
      err.status = 403;
      throw err;
    }
  }
}
