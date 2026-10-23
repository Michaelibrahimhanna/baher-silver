/**
 * Baher Silver — Retail Customer Master Supabase Repository (Phase 4B.2.2A)
 *
 * Implements ICustomerRepository targeting the `public.retail_customers` table.
 * Strictly enforces organization_id scoping on every single query to guarantee tenant isolation.
 * Provides fallback in-memory persistence when Supabase credentials are unconfigured or offline.
 */

import { ICustomerRepository } from './ICustomerRepository';
import { CustomerProfile, CustomerSearchFilters, CustomerStatus } from './types';
import { createClient } from '@/lib/supabase/client';

export class SupabaseCustomerRepository implements ICustomerRepository {
  private client: any;
  private isFallbackMode: boolean = false;
  // Fallback in-memory store keyed by customer id
  private static memoryStore: Map<string, CustomerProfile> = new Map();

  constructor(customClient?: any) {
    if (customClient) {
      this.client = customClient;
      this.isFallbackMode = false;
    } else {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const isPlaceholder = !url || url.includes('placeholder.supabase.co');
      if (isPlaceholder) {
        this.isFallbackMode = true;
      } else {
        try {
          this.client = createClient();
        } catch {
          this.isFallbackMode = true;
        }
      }
    }
  }

  /**
   * Helper to clear memory store during isolated test runs
   */
  public static clearMemoryStore(): void {
    SupabaseCustomerRepository.memoryStore.clear();
  }

  private isNetworkFailure(error: any): boolean {
    if (!error) return false;
    // In production environments, never silently divert database failures to memory
    if (process.env.NODE_ENV === 'production') return false;
    const msg = String(error.message || error).toLowerCase();
    return (
      msg.includes('fetch failed') ||
      msg.includes('network') ||
      msg.includes('econnrefused') ||
      msg.includes('enotfound') ||
      msg.includes('failed to fetch')
    );
  }

  public async create(customer: CustomerProfile): Promise<CustomerProfile> {
    if (!customer.organization_id) {
      const err: any = new Error('organization_id is required.');
      err.code = 'TENANT_REQUIRED';
      err.status = 400;
      throw err;
    }

    if (!this.isFallbackMode && this.client) {
      try {
        const { data, error } = await this.client
          .from('retail_customers')
          .insert([
            {
              id: customer.id,
              organization_id: customer.organization_id,
              name: customer.name,
              phone: customer.phone,
              normalized_phone: customer.normalized_phone,
              email: customer.email || null,
              address: customer.address || null,
              status: customer.status,
              created_at: customer.created_at,
              updated_at: customer.updated_at,
              deleted_at: customer.deleted_at || null
            }
          ])
          .select()
          .single();

        if (error) {
          if (this.isNetworkFailure(error)) {
            this.isFallbackMode = true;
          } else {
            // Postgres unique violation code 23505
            if (error.code === '23505' || String(error.message).includes('duplicate key') || String(error.message).includes('uq_retail_customers_org_phone')) {
              const conflictErr: any = new Error(
                `A customer with phone number "${customer.phone}" already exists in this organization.`
              );
              conflictErr.code = 'DUPLICATE_CUSTOMER_PHONE';
              conflictErr.status = 409;
              throw conflictErr;
            }
            throw new Error(`Failed to create customer: ${error.message}`);
          }
        } else {
          return data as CustomerProfile;
        }
      } catch (err: any) {
        if (this.isNetworkFailure(err)) {
          this.isFallbackMode = true;
        } else {
          throw err;
        }
      }
    }

    // Fallback in-memory execution (matches PostgreSQL constraints exactly)
    // Check composite unique constraint: (organization_id, normalized_phone)
    for (const existing of SupabaseCustomerRepository.memoryStore.values()) {
      if (
        existing.organization_id === customer.organization_id &&
        existing.normalized_phone === customer.normalized_phone &&
        !existing.deleted_at
      ) {
        const conflictErr: any = new Error(
          `A customer with phone number "${customer.phone}" already exists in this organization.`
        );
        conflictErr.code = 'DUPLICATE_CUSTOMER_PHONE';
        conflictErr.status = 409;
        throw conflictErr;
      }
    }

    const saved: CustomerProfile = { ...customer };
    SupabaseCustomerRepository.memoryStore.set(saved.id, saved);
    return saved;
  }

  public async findById(
    id: string,
    organizationId: string,
    includeDeleted: boolean = false
  ): Promise<CustomerProfile | null> {
    if (!id || !organizationId) return null;

    if (!this.isFallbackMode && this.client) {
      try {
        let query = this.client
          .from('retail_customers')
          .select('*')
          .eq('id', id)
          .eq('organization_id', organizationId);

        if (!includeDeleted) {
          query = query.is('deleted_at', null);
        }

        const { data, error } = await query.maybeSingle();
        if (error) {
          if (this.isNetworkFailure(error)) {
            this.isFallbackMode = true;
          } else {
            throw new Error(`Failed to fetch customer by ID: ${error.message}`);
          }
        } else {
          return (data as CustomerProfile) || null;
        }
      } catch (err: any) {
        if (this.isNetworkFailure(err)) {
          this.isFallbackMode = true;
        } else {
          throw err;
        }
      }
    }

    const found = SupabaseCustomerRepository.memoryStore.get(id);
    if (!found) return null;
    if (found.organization_id !== organizationId) return null; // IDOR check
    if (!includeDeleted && found.deleted_at) return null;
    return { ...found };
  }

  public async findByNormalizedPhone(
    normalizedPhone: string,
    organizationId: string,
    includeDeleted: boolean = false
  ): Promise<CustomerProfile | null> {
    if (!normalizedPhone || !organizationId) return null;

    if (!this.isFallbackMode && this.client) {
      try {
        let query = this.client
          .from('retail_customers')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('normalized_phone', normalizedPhone);

        if (!includeDeleted) {
          query = query.is('deleted_at', null);
        }

        const { data, error } = await query.maybeSingle();
        if (error) {
          if (this.isNetworkFailure(error)) {
            this.isFallbackMode = true;
          } else {
            throw new Error(`Failed to fetch customer by phone: ${error.message}`);
          }
        } else {
          return (data as CustomerProfile) || null;
        }
      } catch (err: any) {
        if (this.isNetworkFailure(err)) {
          this.isFallbackMode = true;
        } else {
          throw err;
        }
      }
    }

    for (const record of SupabaseCustomerRepository.memoryStore.values()) {
      if (
        record.organization_id === organizationId &&
        record.normalized_phone === normalizedPhone
      ) {
        if (!includeDeleted && record.deleted_at) {
          continue;
        }
        return { ...record };
      }
    }
    return null;
  }

  public async search(
    organizationId: string,
    filters: CustomerSearchFilters
  ): Promise<CustomerProfile[]> {
    if (!organizationId) return [];

    if (!this.isFallbackMode && this.client) {
      try {
        let query = this.client
          .from('retail_customers')
          .select('*')
          .eq('organization_id', organizationId);

        if (!filters.includeDeleted) {
          query = query.is('deleted_at', null);
        }

        if (filters.status) {
          query = query.eq('status', filters.status);
        }

        if (filters.query && filters.query.trim()) {
          const q = filters.query.trim();
          query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,normalized_phone.ilike.%${q}%`);
        }

        query = query.order('created_at', { ascending: false });

        if (filters.limit) {
          const offset = filters.offset || 0;
          query = query.range(offset, offset + filters.limit - 1);
        }

        const { data, error } = await query;
        if (error) {
          if (this.isNetworkFailure(error)) {
            this.isFallbackMode = true;
          } else {
            throw new Error(`Failed to search customers: ${error.message}`);
          }
        } else {
          return (data as CustomerProfile[]) || [];
        }
      } catch (err: any) {
        if (this.isNetworkFailure(err)) {
          this.isFallbackMode = true;
        } else {
          throw err;
        }
      }
    }

    let results: CustomerProfile[] = [];
    const qLower = filters.query ? filters.query.trim().toLowerCase() : '';

    for (const record of SupabaseCustomerRepository.memoryStore.values()) {
      if (record.organization_id !== organizationId) continue;
      if (!filters.includeDeleted && record.deleted_at) continue;
      if (filters.status && record.status !== filters.status) continue;

      if (qLower) {
        const matchName = record.name.toLowerCase().includes(qLower);
        const matchPhone = record.phone.toLowerCase().includes(qLower);
        const matchNormPhone = record.normalized_phone.toLowerCase().includes(qLower);
        if (!matchName && !matchPhone && !matchNormPhone) continue;
      }

      results.push({ ...record });
    }

    // Order by created_at DESC
    results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (filters.offset || filters.limit) {
      const offset = filters.offset || 0;
      const limit = filters.limit ? offset + filters.limit : results.length;
      results = results.slice(offset, limit);
    }

    return results;
  }

  public async update(
    id: string,
    organizationId: string,
    updates: Partial<CustomerProfile>
  ): Promise<CustomerProfile> {
    if (!id || !organizationId) {
      const err: any = new Error('Customer ID and organizationId are required.');
      err.code = 'INVALID_INPUT';
      err.status = 400;
      throw err;
    }

    // Disallow overriding tenant or ID
    delete (updates as any).id;
    delete (updates as any).organization_id;

    const updatedAt = new Date().toISOString();
    const updatePayload = {
      ...updates,
      updated_at: updatedAt
    };

    if (!this.isFallbackMode && this.client) {
      try {
        const { data, error } = await this.client
          .from('retail_customers')
          .update(updatePayload)
          .eq('id', id)
          .eq('organization_id', organizationId)
          .select()
          .single();

        if (error) {
          if (this.isNetworkFailure(error)) {
            this.isFallbackMode = true;
          } else {
            if (error.code === '23505' || String(error.message).includes('duplicate key') || String(error.message).includes('uq_retail_customers_org_phone')) {
              const conflictErr: any = new Error(
                `Another customer in this organization already uses phone "${updates.phone || updates.normalized_phone}".`
              );
              conflictErr.code = 'DUPLICATE_CUSTOMER_PHONE';
              conflictErr.status = 409;
              throw conflictErr;
            }
            throw new Error(`Failed to update customer: ${error.message}`);
          }
        } else {
          if (!data) {
            const notFoundErr: any = new Error(`Customer "${id}" not found.`);
            notFoundErr.code = 'CUSTOMER_NOT_FOUND';
            notFoundErr.status = 404;
            throw notFoundErr;
          }

          return data as CustomerProfile;
        }
      } catch (err: any) {
        if (this.isNetworkFailure(err)) {
          this.isFallbackMode = true;
        } else {
          throw err;
        }
      }
    }

    const existing = SupabaseCustomerRepository.memoryStore.get(id);
    if (!existing || existing.organization_id !== organizationId) {
      const notFoundErr: any = new Error(`Customer "${id}" not found.`);
      notFoundErr.code = 'CUSTOMER_NOT_FOUND';
      notFoundErr.status = 404;
      throw notFoundErr;
    }

    // Check unique phone if normalized_phone is being changed
    if (updates.normalized_phone && updates.normalized_phone !== existing.normalized_phone) {
      for (const rec of SupabaseCustomerRepository.memoryStore.values()) {
        if (
          rec.id !== id &&
          rec.organization_id === organizationId &&
          rec.normalized_phone === updates.normalized_phone &&
          !rec.deleted_at
        ) {
          const conflictErr: any = new Error(
            `Another customer in this organization already uses phone "${updates.phone || updates.normalized_phone}".`
          );
          conflictErr.code = 'DUPLICATE_CUSTOMER_PHONE';
          conflictErr.status = 409;
          throw conflictErr;
        }
      }
    }

    const updatedRecord: CustomerProfile = {
      ...existing,
      ...updatePayload
    };
    SupabaseCustomerRepository.memoryStore.set(id, updatedRecord);
    return { ...updatedRecord };
  }

  public async softDelete(id: string, organizationId: string): Promise<boolean> {
    if (!id || !organizationId) return false;

    const now = new Date().toISOString();

    if (!this.isFallbackMode && this.client) {
      try {
        const { data, error } = await this.client
          .from('retail_customers')
          .update({
            deleted_at: now,
            updated_at: now
          })
          .eq('id', id)
          .eq('organization_id', organizationId)
          .select();

        if (error) {
          if (this.isNetworkFailure(error)) {
            this.isFallbackMode = true;
          } else {
            throw new Error(`Failed to soft-delete customer: ${error.message}`);
          }
        } else {
          return Boolean(data && data.length > 0);
        }
      } catch (err: any) {
        if (this.isNetworkFailure(err)) {
          this.isFallbackMode = true;
        } else {
          throw err;
        }
      }
    }

    const existing = SupabaseCustomerRepository.memoryStore.get(id);
    if (!existing || existing.organization_id !== organizationId) {
      return false;
    }

    existing.deleted_at = now;
    existing.updated_at = now;
    SupabaseCustomerRepository.memoryStore.set(id, existing);
    return true;
  }
}
