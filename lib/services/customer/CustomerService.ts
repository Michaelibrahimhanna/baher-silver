/**
 * Baher Silver — Retail Customer Master Domain Service (Phase 4B.2.2A)
 *
 * Implements server-authoritative Customer Master business logic:
 *   1. Strict Server-Side Customer ID Generation (cust_${Date.now()}_${entropy})
 *   2. Strict E.164 Phone Normalization (Egyptian mobile + international standard)
 *   3. Enforced Tenant Isolation: Derives organization_id exclusively from authenticated server context.
 *   4. Multi-Tenant Duplicate Phone Prevention (Unique per tenant, allowed across tenants)
 *   5. Complete IDOR Prevention (Cross-tenant lookup fails with 404)
 *   6. Default Soft-Delete Filtering
 *   7. Zero Financial / Ledger Fields
 */

import crypto from 'node:crypto';
import { ICustomerRepository } from './ICustomerRepository';
import { SupabaseCustomerRepository } from './SupabaseCustomerRepository';
import {
  CustomerProfile,
  CustomerStatus,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerSearchFilters,
  CustomerAuthContext
} from './types';

/**
 * Server-authoritatively generates canonical customer ID matching regex: ^cust_[a-zA-Z0-9_-]+$
 */
export function generateCustomerId(): string {
  const entropy = crypto.randomBytes(4).toString('hex');
  const id = `cust_${Date.now()}_${entropy}`;
  if (!/^cust_[a-zA-Z0-9_-]+$/.test(id) || id.length > 64) {
    throw new Error(`Generated invalid customer ID: ${id}`);
  }
  return id;
}

/**
 * Normalizes phone numbers to standard E.164 format.
 * - Handles domestic Egyptian mobile (010, 011, 012, 015 -> +201...)
 * - Handles domestic numbers with country code without plus (2010... -> +2010...)
 * - Handles 00 prefix international format (00966... -> +966...)
 * - Rejects malformed or non-phone inputs with 400 INVALID_PHONE_NUMBER
 */
export function normalizePhoneNumber(raw: string): string {
  if (!raw || typeof raw !== 'string') {
    const err: any = new Error('Phone number is required.');
    err.code = 'INVALID_PHONE_NUMBER';
    err.status = 400;
    throw err;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    const err: any = new Error('Phone number cannot be blank.');
    err.code = 'INVALID_PHONE_NUMBER';
    err.status = 400;
    throw err;
  }

  // Reject alphabetic characters
  if (/[a-zA-Z]/.test(trimmed)) {
    const err: any = new Error(`Phone number "${raw}" contains invalid alphabetic characters.`);
    err.code = 'INVALID_PHONE_NUMBER';
    err.status = 400;
    throw err;
  }

  // Strip formatting whitespace, hyphens, parens, and dots
  const sanitized = trimmed.replace(/[\s\-\(\)\.]/g, '');

  let normalized: string;

  if (sanitized.startsWith('+')) {
    const digitsOnly = sanitized.slice(1);
    if (!/^\d+$/.test(digitsOnly)) {
      const err: any = new Error(`Phone number "${raw}" contains invalid characters.`);
      err.code = 'INVALID_PHONE_NUMBER';
      err.status = 400;
      throw err;
    }
    normalized = `+${digitsOnly}`;
  } else if (sanitized.startsWith('00')) {
    const digitsOnly = sanitized.slice(2);
    if (!/^\d+$/.test(digitsOnly)) {
      const err: any = new Error(`Phone number "${raw}" contains invalid characters.`);
      err.code = 'INVALID_PHONE_NUMBER';
      err.status = 400;
      throw err;
    }
    normalized = `+${digitsOnly}`;
  } else if (/^01[0125]\d{8}$/.test(sanitized)) {
    // Domestic Egyptian mobile format: 010, 011, 012, 015 (11 digits)
    normalized = `+20${sanitized.slice(1)}`;
  } else if (/^201[0125]\d{8}$/.test(sanitized)) {
    // Egyptian mobile with 20 prefix
    normalized = `+${sanitized}`;
  } else if (/^\d+$/.test(sanitized)) {
    if (sanitized.startsWith('0')) {
      const err: any = new Error(
        `Local phone number "${raw}" is not a recognized Egyptian mobile format (expected 11 digits starting with 010, 011, 012, or 015).`
      );
      err.code = 'INVALID_PHONE_NUMBER';
      err.status = 400;
      throw err;
    }
    normalized = `+${sanitized}`;
  } else {
    const err: any = new Error(`Phone number "${raw}" format is invalid.`);
    err.code = 'INVALID_PHONE_NUMBER';
    err.status = 400;
    throw err;
  }

  // E.164 length check: 8 to 15 digits
  const digitCount = normalized.length - 1;
  if (digitCount < 8 || digitCount > 15) {
    const err: any = new Error(
      `Phone number "${raw}" has ${digitCount} digits. E.164 phone numbers must be between 8 and 15 digits.`
    );
    err.code = 'INVALID_PHONE_NUMBER';
    err.status = 400;
    throw err;
  }

  return normalized;
}

export class CustomerService {
  private repository: ICustomerRepository;

  constructor(repository?: ICustomerRepository) {
    this.repository = repository || new SupabaseCustomerRepository();
  }

  /**
   * Asserts server authentication context and non-empty organizationId
   */
  private assertAuthContext(auth: CustomerAuthContext): void {
    if (!auth || !auth.organizationId || typeof auth.organizationId !== 'string' || !auth.organizationId.trim()) {
      const err: any = new Error('Authenticated organization context is required.');
      err.code = 'UNAUTHORIZED_TENANT';
      err.status = 401;
      throw err;
    }
  }

  /**
   * Creates a new customer within the authenticated tenant scope
   */
  public async createCustomer(
    auth: CustomerAuthContext,
    input: CreateCustomerInput
  ): Promise<CustomerProfile> {
    this.assertAuthContext(auth);

    if (!input || !input.name || typeof input.name !== 'string' || !input.name.trim()) {
      const err: any = new Error('Customer name is required.');
      err.code = 'INVALID_CUSTOMER_NAME';
      err.status = 400;
      throw err;
    }

    if (input.name.trim().length > 255) {
      const err: any = new Error('Customer name cannot exceed 255 characters.');
      err.code = 'INVALID_CUSTOMER_NAME';
      err.status = 400;
      throw err;
    }

    const normalizedPhone = normalizePhoneNumber(input.phone);

    // Email validation if provided
    let email: string | null = null;
    if (input.email && input.email.trim()) {
      const trimmedEmail = input.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail) || trimmedEmail.length > 255) {
        const err: any = new Error('Invalid email address format.');
        err.code = 'INVALID_EMAIL';
        err.status = 400;
        throw err;
      }
      email = trimmedEmail;
    }

    // Check duplicate phone in the same organization (active records)
    const existing = await this.repository.findByNormalizedPhone(normalizedPhone, auth.organizationId, false);
    if (existing) {
      const err: any = new Error(
        `A customer with phone number "${input.phone}" already exists in this organization (Customer ID: ${existing.id}).`
      );
      err.code = 'DUPLICATE_CUSTOMER_PHONE';
      err.status = 409;
      throw err;
    }

    const id = generateCustomerId();
    const now = new Date().toISOString();

    const profile: CustomerProfile = {
      id,
      organization_id: auth.organizationId,
      name: input.name.trim(),
      phone: input.phone.trim(),
      normalized_phone: normalizedPhone,
      email,
      address: input.address ? input.address.trim() : null,
      status: 'ACTIVE',
      created_at: now,
      updated_at: now,
      deleted_at: null
    };

    return await this.repository.create(profile);
  }

  /**
   * Retrieves a customer by ID with strict tenant isolation (IDOR protection)
   */
  public async getCustomerById(
    auth: CustomerAuthContext,
    id: string,
    includeDeleted: boolean = false
  ): Promise<CustomerProfile> {
    this.assertAuthContext(auth);

    if (!id || typeof id !== 'string') {
      const err: any = new Error('Customer ID is required.');
      err.code = 'INVALID_CUSTOMER_ID';
      err.status = 400;
      throw err;
    }

    const customer = await this.repository.findById(id, auth.organizationId, includeDeleted);
    if (!customer) {
      const err: any = new Error(`Customer "${id}" not found.`);
      err.code = 'CUSTOMER_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    return customer;
  }

  /**
   * Retrieves a customer by phone number within tenant scope
   */
  public async getCustomerByPhone(
    auth: CustomerAuthContext,
    phone: string,
    includeDeleted: boolean = false
  ): Promise<CustomerProfile | null> {
    this.assertAuthContext(auth);
    const normalizedPhone = normalizePhoneNumber(phone);
    return await this.repository.findByNormalizedPhone(normalizedPhone, auth.organizationId, includeDeleted);
  }

  /**
   * Searches customers within authenticated tenant scope
   */
  public async searchCustomers(
    auth: CustomerAuthContext,
    filters: CustomerSearchFilters = {}
  ): Promise<CustomerProfile[]> {
    this.assertAuthContext(auth);
    return await this.repository.search(auth.organizationId, filters);
  }

  /**
   * Updates customer profile fields within authenticated tenant scope
   */
  public async updateCustomer(
    auth: CustomerAuthContext,
    id: string,
    input: UpdateCustomerInput
  ): Promise<CustomerProfile> {
    this.assertAuthContext(auth);

    // Ensure customer exists and belongs to this tenant
    const existing = await this.getCustomerById(auth, id, false);

    const updates: Partial<CustomerProfile> = {};

    if (input.name !== undefined) {
      if (!input.name || !input.name.trim() || input.name.trim().length > 255) {
        const err: any = new Error('Customer name must be a non-empty string under 255 characters.');
        err.code = 'INVALID_CUSTOMER_NAME';
        err.status = 400;
        throw err;
      }
      updates.name = input.name.trim();
    }

    if (input.phone !== undefined) {
      const newNormalized = normalizePhoneNumber(input.phone);
      if (newNormalized !== existing.normalized_phone) {
        const duplicate = await this.repository.findByNormalizedPhone(newNormalized, auth.organizationId, false);
        if (duplicate && duplicate.id !== id) {
          const err: any = new Error(
            `Another customer in this organization already uses phone "${input.phone}".`
          );
          err.code = 'DUPLICATE_CUSTOMER_PHONE';
          err.status = 409;
          throw err;
        }
      }
      updates.phone = input.phone.trim();
      updates.normalized_phone = newNormalized;
    }

    if (input.email !== undefined) {
      if (input.email && input.email.trim()) {
        const trimmedEmail = input.email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail) || trimmedEmail.length > 255) {
          const err: any = new Error('Invalid email address format.');
          err.code = 'INVALID_EMAIL';
          err.status = 400;
          throw err;
        }
        updates.email = trimmedEmail;
      } else {
        updates.email = null;
      }
    }

    if (input.address !== undefined) {
      updates.address = input.address ? input.address.trim() : null;
    }

    if (input.status !== undefined) {
      if (input.status !== 'ACTIVE' && input.status !== 'SUSPENDED') {
        const err: any = new Error('Status must be either ACTIVE or SUSPENDED.');
        err.code = 'INVALID_CUSTOMER_STATUS';
        err.status = 400;
        throw err;
      }
      updates.status = input.status;
    }

    return await this.repository.update(id, auth.organizationId, updates);
  }

  /**
   * Soft-deletes a customer record within authenticated tenant scope
   */
  public async deleteCustomer(auth: CustomerAuthContext, id: string): Promise<boolean> {
    this.assertAuthContext(auth);
    // Verify tenant ownership
    await this.getCustomerById(auth, id, false);
    return await this.repository.softDelete(id, auth.organizationId);
  }
}
