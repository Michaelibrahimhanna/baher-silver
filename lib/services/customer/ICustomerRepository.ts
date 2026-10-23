/**
 * Baher Silver — Retail Customer Master Repository Interface (Phase 4B.2.2A)
 *
 * All operations require explicit tenant organizationId to enforce isolation at the persistence boundary.
 */

import { CustomerProfile, CustomerSearchFilters } from './types';

export interface ICustomerRepository {
  create(customer: CustomerProfile): Promise<CustomerProfile>;
  findById(id: string, organizationId: string, includeDeleted?: boolean): Promise<CustomerProfile | null>;
  findByNormalizedPhone(normalizedPhone: string, organizationId: string, includeDeleted?: boolean): Promise<CustomerProfile | null>;
  search(organizationId: string, filters: CustomerSearchFilters): Promise<CustomerProfile[]>;
  update(id: string, organizationId: string, updates: Partial<CustomerProfile>): Promise<CustomerProfile>;
  softDelete(id: string, organizationId: string): Promise<boolean>;
}
