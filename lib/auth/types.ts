/**
 * Baher Silver Portal — Canonical Authentication & RBAC Types
 * 
 * Reuses and aligns with MIP Platform role-based access control vocabulary.
 */

export type UserRole =
  | 'Owner'
  | 'Admin'
  | 'Developer'
  | 'Member'
  | 'Agent'
  | 'Viewer'
  | 'StoreManager'
  | 'Cashier'
  | 'InventoryOperator'
  | 'Accountant'
  | 'Service';

export type UserPersona = 'executive_owner' | 'builder_developer' | 'business_operator';

export type Permission =
  // Platform & Project Scopes
  | 'org:manage'
  | 'org:members:manage'
  | 'branch:manage'
  | 'terminal:manage'
  | 'warehouse:manage'
  | 'audit:read'
  | 'project:create'
  | 'project:delete'
  | 'project:read'
  | 'project:write'
  | 'agent:invoke'
  | 'agent:plan'
  | 'agent:execute_plan'
  | 'tool:fs:read'
  | 'tool:fs:write'
  | 'tool:terminal:run'
  | 'workflow:run'
  | 'workflow:approve'
  | 'workflow:rollback'
  | 'staging:deploy'
  | 'prod:deploy'
  | 'credential:manage'
  | 'credential:use'
  // Business Operator Scopes (POS & Store)
  | 'pos:sale:create'
  | 'pos:sale:refund'
  | 'pos:shift:open'
  | 'pos:shift:close'
  | 'pos:discount:override'
  // Inventory & Product Scopes
  | 'inventory:read'
  | 'inventory:move'
  | 'inventory:audit'
  | 'inventory:manage'
  | 'product:read'
  | 'product:manage'
  // Production / Manufacturing Scopes
  | 'production:read'
  | 'production:manage'
  // Gemstone Scopes
  | 'gemstone:read'
  | 'gemstone:manage'
  // Customer & Supplier Scopes
  | 'customer:read'
  | 'customer:manage'
  | 'supplier:read'
  | 'supplier:manage'
  // Cash & Expenses Scopes
  | 'expense:create'
  | 'expense:read'
  | 'expense:manage'
  | 'cash:read'
  | 'cash:manage'
  // Reporting & AI Business Query Scopes
  | 'report:read'
  | 'report:branch:view'
  | 'report:org:view'
  | 'ai:business_query:basic'
  | 'ai:business_query:full'
  // Admin User/Role Management Scopes
  | 'admin:users'
  | 'admin:permissions'
  // Weight & Scale Scopes (REA Port)
  | 'weight:manual_entry'
  | 'weight:override'
  // Open Accounts Dual Ledger Scopes (REA Port)
  | 'account:read'
  | 'account:journal:post'
  | 'account:reversal'
  | 'account:settlement'
  // Scrap & Metal Exchange Scopes
  | 'scrap:buyback';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  Owner: [
    'org:manage',
    'org:members:manage',
    'branch:manage',
    'terminal:manage',
    'warehouse:manage',
    'audit:read',
    'project:create',
    'project:delete',
    'project:read',
    'project:write',
    'agent:invoke',
    'agent:plan',
    'agent:execute_plan',
    'tool:fs:read',
    'tool:fs:write',
    'tool:terminal:run',
    'workflow:run',
    'workflow:approve',
    'workflow:rollback',
    'staging:deploy',
    'prod:deploy',
    'credential:manage',
    'credential:use',
    'pos:sale:create',
    'pos:sale:refund',
    'pos:shift:open',
    'pos:shift:close',
    'pos:discount:override',
    'inventory:read',
    'inventory:move',
    'inventory:audit',
    'inventory:manage',
    'product:read',
    'product:manage',
    'production:read',
    'production:manage',
    'gemstone:read',
    'gemstone:manage',
    'customer:read',
    'customer:manage',
    'supplier:read',
    'supplier:manage',
    'expense:create',
    'expense:read',
    'expense:manage',
    'cash:read',
    'cash:manage',
    'report:read',
    'report:branch:view',
    'report:org:view',
    'ai:business_query:basic',
    'ai:business_query:full',
    'admin:users',
    'admin:permissions',
    'weight:manual_entry',
    'weight:override',
    'account:read',
    'account:journal:post',
    'account:reversal',
    'account:settlement',
    'scrap:buyback'
  ],
  Admin: [
    'org:members:manage',
    'branch:manage',
    'terminal:manage',
    'warehouse:manage',
    'audit:read',
    'project:create',
    'project:delete',
    'project:read',
    'project:write',
    'agent:invoke',
    'agent:plan',
    'agent:execute_plan',
    'tool:fs:read',
    'tool:fs:write',
    'tool:terminal:run',
    'workflow:run',
    'workflow:approve',
    'workflow:rollback',
    'staging:deploy',
    'credential:manage',
    'credential:use',
    'pos:sale:create',
    'pos:sale:refund',
    'pos:shift:open',
    'pos:shift:close',
    'pos:discount:override',
    'inventory:read',
    'inventory:move',
    'inventory:audit',
    'inventory:manage',
    'product:read',
    'product:manage',
    'production:read',
    'production:manage',
    'gemstone:read',
    'gemstone:manage',
    'customer:read',
    'customer:manage',
    'supplier:read',
    'supplier:manage',
    'expense:create',
    'expense:read',
    'expense:manage',
    'cash:read',
    'cash:manage',
    'report:read',
    'report:branch:view',
    'report:org:view',
    'ai:business_query:basic',
    'ai:business_query:full',
    'admin:users',
    'admin:permissions',
    'weight:manual_entry',
    'weight:override',
    'account:read',
    'account:journal:post',
    'account:reversal',
    'account:settlement',
    'scrap:buyback'
  ],
  Developer: [
    'project:create',
    'project:read',
    'project:write',
    'agent:invoke',
    'agent:plan',
    'agent:execute_plan',
    'tool:fs:read',
    'tool:fs:write',
    'tool:terminal:run',
    'workflow:run',
    'staging:deploy',
    'credential:use',
    'product:read',
    'ai:business_query:basic'
  ],
  Member: [
    'project:create',
    'project:read',
    'project:write',
    'agent:invoke',
    'agent:plan',
    'agent:execute_plan',
    'tool:fs:read',
    'tool:fs:write',
    'tool:terminal:run',
    'credential:use'
  ],
  StoreManager: [
    'branch:manage',
    'pos:sale:create',
    'pos:sale:refund',
    'pos:shift:open',
    'pos:shift:close',
    'pos:discount:override',
    'inventory:read',
    'inventory:move',
    'inventory:audit',
    'inventory:manage',
    'product:read',
    'product:manage',
    'production:read',
    'gemstone:read',
    'customer:read',
    'customer:manage',
    'supplier:read',
    'supplier:manage',
    'expense:create',
    'expense:read',
    'cash:read',
    'cash:manage',
    'report:read',
    'report:branch:view',
    'ai:business_query:basic',
    'ai:business_query:full',
    'weight:override',
    'account:read',
    'scrap:buyback'
  ],
  Cashier: [
    'pos:sale:create',
    'pos:shift:open',
    'pos:shift:close',
    'cash:read',
    'cash:manage',
    'product:read',
    'customer:read',
    'customer:manage',
    'ai:business_query:basic',
    'scrap:buyback'
  ],
  InventoryOperator: [
    'inventory:read',
    'inventory:move',
    'inventory:audit',
    'inventory:manage',
    'product:read',
    'product:manage',
    'production:read',
    'production:manage',
    'gemstone:read',
    'gemstone:manage',
    'supplier:read',
    'ai:business_query:basic'
  ],
  Accountant: [
    'expense:create',
    'expense:read',
    'expense:manage',
    'cash:read',
    'cash:manage',
    'report:read',
    'report:branch:view',
    'report:org:view',
    'ai:business_query:basic',
    'ai:business_query:full',
    'account:read',
    'account:journal:post',
    'account:reversal',
    'account:settlement'
  ],
  Agent: [
    'project:read',
    'tool:fs:read',
    'tool:fs:write',
    'tool:terminal:run',
    'credential:use'
  ],
  Viewer: [
    'project:read',
    'product:read',
    'inventory:read',
    'production:read',
    'gemstone:read',
    'report:read',
    'report:branch:view'
  ],
  Service: [
    'project:read',
    'agent:invoke',
    'tool:fs:read',
    'credential:use'
  ]
};

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
  branchId?: string;
  status: 'active' | 'suspended' | 'invited';
  createdAt: string;
}

export interface DbUserRecord extends SafeUser {
  passwordHash: string;
}

export interface AuthSession {
  sessionId: string;
  userId: string;
  organizationId: string;
  role: UserRole;
  email: string;
  createdAt: number;
  expiresAt: number;
  nonce: string;
}

export interface AuthenticatedRequestContext {
  user: SafeUser;
  session: AuthSession;
  userId: string;
  organizationId: string;
  role: UserRole;
  permissions: Permission[];
}
