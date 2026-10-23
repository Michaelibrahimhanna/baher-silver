/**
 * Baher Silver — Retail Customer Master Domain Types (Phase 4B.2.2A)
 *
 * Strictly scoped to Customer Master identity, contact info, and tenant scoping.
 * No financial, ledger, credit, or loyalty fields.
 */

export type CustomerStatus = 'ACTIVE' | 'SUSPENDED';

export interface CustomerProfile {
  id: string;
  organization_id: string;
  name: string;
  phone: string;
  normalized_phone: string;
  email?: string | null;
  address?: string | null;
  status: CustomerStatus;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface CreateCustomerInput {
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
}

export interface UpdateCustomerInput {
  name?: string;
  phone?: string;
  email?: string | null;
  address?: string | null;
  status?: CustomerStatus;
}

export interface CustomerSearchFilters {
  query?: string;
  status?: CustomerStatus;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
}

export interface CustomerAuthContext {
  organizationId: string;
  actorUserId?: string;
  actorRole?: string;
}
