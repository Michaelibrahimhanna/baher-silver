/**
 * BAHER SILVER — PHASE 4B.2.2A: CUSTOMER REPOSITORY & SERVICE ACCEPTANCE SUITE
 *
 * Validates:
 * 1. Server-Side Customer ID Generation (^cust_[a-zA-Z0-9_-]+$)
 * 2. E.164 Phone Normalization (Egyptian mobile + international formats + malformed rejection)
 * 3. Customer Profile Persistence & Schema Conformance (Zero financial fields)
 * 4. Tenant Isolation & Context Enforcement (Derived exclusively from auth context)
 * 5. Multi-Tenant Duplicate Phone Rules (Unique per tenant, allowed across different tenants)
 * 6. IDOR Prevention (Cross-tenant access forbidden across all CRUD methods)
 * 7. Soft Delete Lifecycle & Query Filtering
 * 8. Search & Autocomplete by Partial Name / Phone
 * 9. Supabase Query Contract Verification (Correct table, column, and filter chaining)
 * 10. Scope Boundary Verification (Absence of API routes, POS UI mutations, or financial fields)
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  CustomerService,
  SupabaseCustomerRepository,
  generateCustomerId,
  normalizePhoneNumber,
  CustomerProfile,
  CustomerAuthContext
} from '../lib/services/customer';

async function runCustomerMasterTestSuite() {
  console.log('===============================================================');
  console.log('  BAHER SILVER — PHASE 4B.2.2A: CUSTOMER DOMAIN ACCEPTANCE');
  console.log('===============================================================');

  let passedTests = 0;
  let totalTests = 0;

  function runTest(name: string, fn: () => void | Promise<void>) {
    totalTests++;
    try {
      const result = fn();
      if (result && typeof result.then === 'function') {
        return result.then(() => {
          console.log(`  ✓ [PASS] ${name}`);
          passedTests++;
        }).catch((err: any) => {
          console.error(`  ✗ [FAIL] ${name}:`, err);
          throw err;
        });
      } else {
        console.log(`  ✓ [PASS] ${name}`);
        passedTests++;
      }
    } catch (err: any) {
      console.error(`  ✗ [FAIL] ${name}:`, err);
      throw err;
    }
  }

  // Clear repository state before starting
  SupabaseCustomerRepository.clearMemoryStore();

  const TENANT_A: CustomerAuthContext = {
    organizationId: 'org_baher_silver',
    actorUserId: 'user_admin_01',
    actorRole: 'BRANCH_MANAGER'
  };

  const TENANT_B: CustomerAuthContext = {
    organizationId: 'org_competitor_retail',
    actorUserId: 'user_comp_01',
    actorRole: 'ADMIN'
  };

  // --------------------------------------------------------------------------
  // TEST GROUP 1: ID Generation & Format Conformance
  // --------------------------------------------------------------------------
  await runTest('ID Generation > Produces canonical cust_ prefixed ID conforming to SQL regex', () => {
    for (let i = 0; i < 20; i++) {
      const id = generateCustomerId();
      assert.match(id, /^cust_[a-zA-Z0-9_-]+$/, `ID "${id}" must match SQL regex ^cust_[a-zA-Z0-9_-]+$`);
      assert.ok(id.length <= 64, `ID "${id}" length must be <= 64 characters (is ${id.length})`);
    }
  });

  // --------------------------------------------------------------------------
  // TEST GROUP 2: E.164 Phone Normalization
  // --------------------------------------------------------------------------
  await runTest('Phone Normalization > Correctly normalizes Egyptian domestic mobile numbers', () => {
    // 010 (Vodafone), 011 (Etisalat), 012 (Orange), 015 (WE)
    assert.equal(normalizePhoneNumber('01012345678'), '+201012345678');
    assert.equal(normalizePhoneNumber('01198765432'), '+201198765432');
    assert.equal(normalizePhoneNumber('01234567890'), '+201234567890');
    assert.equal(normalizePhoneNumber('01555555555'), '+201555555555');

    // With country code without +
    assert.equal(normalizePhoneNumber('201012345678'), '+201012345678');

    // With whitespace, dashes, parentheses
    assert.equal(normalizePhoneNumber('010-1234-5678'), '+201012345678');
    assert.equal(normalizePhoneNumber('(011) 9876 5432'), '+201198765432');
    assert.equal(normalizePhoneNumber('  012.3456.7890  '), '+201234567890');
  });

  await runTest('Phone Normalization > Correctly normalizes international phone numbers', () => {
    // Saudi Arabia with +
    assert.equal(normalizePhoneNumber('+966 50 123 4567'), '+966501234567');
    // Saudi Arabia with 00 prefix
    assert.equal(normalizePhoneNumber('00966501234567'), '+966501234567');
    // UAE
    assert.equal(normalizePhoneNumber('+971 (50) 987-6543'), '+971509876543');
    // USA
    assert.equal(normalizePhoneNumber('+1-212-555-0199'), '+12125550199');
  });

  await runTest('Phone Normalization > Rejects malformed and invalid phone inputs with 400', () => {
    const invalidInputs = [
      '',
      '   ',
      '010-CALL-NOW',
      'not-a-phone',
      '12345',               // Too short (< 8 digits)
      '01912345678',         // Invalid Egyptian mobile prefix 019
      '+12345678901234567',  // Too long (> 15 digits)
      '01012345678#',        // Invalid symbol
    ];

    for (const input of invalidInputs) {
      assert.throws(
        () => normalizePhoneNumber(input),
        (err: any) => err.code === 'INVALID_PHONE_NUMBER' && err.status === 400,
        `Expected input "${input}" to be rejected with 400 INVALID_PHONE_NUMBER`
      );
    }
  });

  // --------------------------------------------------------------------------
  // TEST GROUP 3: Tenant Authentication Context Enforcement
  // --------------------------------------------------------------------------
  const service = new CustomerService();

  await runTest('Tenant Context > Rejects requests missing authenticated server context', async () => {
    await assert.rejects(
      async () => await service.createCustomer(null as any, { name: 'Tarek', phone: '01011112222' }),
      (err: any) => err.code === 'UNAUTHORIZED_TENANT' && err.status === 401
    );

    await assert.rejects(
      async () => await service.createCustomer({ organizationId: '' } as any, { name: 'Tarek', phone: '01011112222' }),
      (err: any) => err.code === 'UNAUTHORIZED_TENANT' && err.status === 401
    );
  });

  // --------------------------------------------------------------------------
  // TEST GROUP 4: Customer Creation & Schema Integrity
  // --------------------------------------------------------------------------
  let customerA1: CustomerProfile;

  await runTest('Customer Creation > Creates customer profile with canonical fields and no financial fields', async () => {
    customerA1 = await service.createCustomer(TENANT_A, {
      name: 'Ahmed El-Sayed',
      phone: '01012345678',
      email: 'ahmed.elsayed@example.com',
      address: '15 El-Gomhouria St, Downtown Cairo'
    });

    assert.ok(customerA1.id.startsWith('cust_'), 'ID must start with cust_');
    assert.equal(customerA1.organization_id, 'org_baher_silver');
    assert.equal(customerA1.name, 'Ahmed El-Sayed');
    assert.equal(customerA1.phone, '01012345678');
    assert.equal(customerA1.normalized_phone, '+201012345678');
    assert.equal(customerA1.email, 'ahmed.elsayed@example.com');
    assert.equal(customerA1.address, '15 El-Gomhouria St, Downtown Cairo');
    assert.equal(customerA1.status, 'ACTIVE');
    assert.ok(customerA1.created_at, 'created_at must be populated');
    assert.ok(customerA1.updated_at, 'updated_at must be populated');
    assert.equal(customerA1.deleted_at, null);

    // Strict Architectural Check: Customer Master MUST NOT contain financial fields
    assert.equal((customerA1 as any).store_credit, undefined, 'Must NOT contain store_credit');
    assert.equal((customerA1 as any).balance, undefined, 'Must NOT contain balance');
    assert.equal((customerA1 as any).loyalty_points, undefined, 'Must NOT contain loyalty_points');
    assert.equal((customerA1 as any).total_spent, undefined, 'Must NOT contain total_spent');
  });

  // --------------------------------------------------------------------------
  // TEST GROUP 5: Multi-Tenant Duplicate Phone Rules
  // --------------------------------------------------------------------------
  await runTest('Tenant Phone Uniqueness > Rejects duplicate phone within the same tenant with 409', async () => {
    await assert.rejects(
      async () => {
        await service.createCustomer(TENANT_A, {
          name: 'Ahmed Clone',
          phone: '(010) 1234-5678' // Same normalized phone +201012345678
        });
      },
      (err: any) => err.code === 'DUPLICATE_CUSTOMER_PHONE' && err.status === 409
    );
  });

  await runTest('Tenant Isolation > Allows identical phone number in a different organization', async () => {
    // Tenant B creates customer with identical phone number
    const customerB1 = await service.createCustomer(TENANT_B, {
      name: 'Ahmed Competitor Client',
      phone: '01012345678' // Same normalized phone
    });

    assert.ok(customerB1.id.startsWith('cust_'));
    assert.equal(customerB1.organization_id, 'org_competitor_retail');
    assert.equal(customerB1.normalized_phone, '+201012345678');
    assert.notEqual(customerB1.id, customerA1.id, 'IDs must be unique');
  });

  // --------------------------------------------------------------------------
  // TEST GROUP 6: IDOR Protection (Cross-Tenant Data Isolation)
  // --------------------------------------------------------------------------
  await runTest('IDOR Protection > Tenant B cannot retrieve Tenant A customer by ID (returns 404)', async () => {
    await assert.rejects(
      async () => await service.getCustomerById(TENANT_B, customerA1.id),
      (err: any) => err.code === 'CUSTOMER_NOT_FOUND' && err.status === 404
    );
  });

  await runTest('IDOR Protection > Tenant B cannot update Tenant A customer', async () => {
    await assert.rejects(
      async () => await service.updateCustomer(TENANT_B, customerA1.id, { name: 'Hacked Name' }),
      (err: any) => err.code === 'CUSTOMER_NOT_FOUND' && err.status === 404
    );

    // Verify Tenant A customer remains unchanged
    const original = await service.getCustomerById(TENANT_A, customerA1.id);
    assert.equal(original.name, 'Ahmed El-Sayed');
  });

  await runTest('IDOR Protection > Tenant B cannot soft-delete Tenant A customer', async () => {
    await assert.rejects(
      async () => await service.deleteCustomer(TENANT_B, customerA1.id),
      (err: any) => err.code === 'CUSTOMER_NOT_FOUND' && err.status === 404
    );

    // Verify Tenant A customer is still active
    const original = await service.getCustomerById(TENANT_A, customerA1.id);
    assert.equal(original.status, 'ACTIVE');
    assert.equal(original.deleted_at, null);
  });

  // --------------------------------------------------------------------------
  // TEST GROUP 7: Search & Lookup Capabilities
  // --------------------------------------------------------------------------
  let customerA2: CustomerProfile;
  let customerA3: CustomerProfile;

  await runTest('Search & Lookup > Finds customers by normalized phone and by partial search', async () => {
    customerA2 = await service.createCustomer(TENANT_A, {
      name: 'Mona Mahmoud',
      phone: '01198765432',
      email: 'mona@jewelry.eg'
    });

    customerA3 = await service.createCustomer(TENANT_A, {
      name: 'Youssef El-Sayed',
      phone: '01234567890'
    });

    // Lookup by exact phone (formatted or raw)
    const byPhone = await service.getCustomerByPhone(TENANT_A, '011-9876-5432');
    assert.ok(byPhone);
    assert.equal(byPhone?.id, customerA2.id);
    assert.equal(byPhone?.name, 'Mona Mahmoud');

    // Search by partial name "El-Sayed" -> should find Ahmed and Youssef
    const nameResults = await service.searchCustomers(TENANT_A, { query: 'El-Sayed' });
    assert.equal(nameResults.length, 2);
    const names = nameResults.map(r => r.name);
    assert.ok(names.includes('Ahmed El-Sayed'));
    assert.ok(names.includes('Youssef El-Sayed'));

    // Search results in Tenant B must NOT include Tenant A customers
    const tenantBResults = await service.searchCustomers(TENANT_B, { query: 'El-Sayed' });
    assert.equal(tenantBResults.length, 0);
  });

  // --------------------------------------------------------------------------
  // TEST GROUP 8: Update Customer Profile
  // --------------------------------------------------------------------------
  await runTest('Update Profile > Modifies contact information and status within tenant', async () => {
    const updated = await service.updateCustomer(TENANT_A, customerA2.id, {
      name: 'Mona Mahmoud Radi',
      address: '22 Al-Azhar St, Khan el-Khalili, Cairo',
      status: 'SUSPENDED'
    });

    assert.equal(updated.name, 'Mona Mahmoud Radi');
    assert.equal(updated.address, '22 Al-Azhar St, Khan el-Khalili, Cairo');
    assert.equal(updated.status, 'SUSPENDED');
    assert.ok(new Date(updated.updated_at).getTime() >= new Date(customerA2.updated_at).getTime());

    // Verify phone update with duplicate rejection
    await assert.rejects(
      async () => {
        // Attempting to change Mona's phone to Ahmed's phone (01012345678)
        await service.updateCustomer(TENANT_A, customerA2.id, {
          phone: '01012345678'
        });
      },
      (err: any) => err.code === 'DUPLICATE_CUSTOMER_PHONE' && err.status === 409
    );
  });

  // --------------------------------------------------------------------------
  // TEST GROUP 9: Soft Delete Lifecycle
  // --------------------------------------------------------------------------
  await runTest('Soft Delete > Soft-deletes customer and hides from default search and lookup', async () => {
    const success = await service.deleteCustomer(TENANT_A, customerA3.id);
    assert.equal(success, true);

    // Lookup by ID fails with 404 by default
    await assert.rejects(
      async () => await service.getCustomerById(TENANT_A, customerA3.id),
      (err: any) => err.code === 'CUSTOMER_NOT_FOUND' && err.status === 404
    );

    // Lookup by ID with includeDeleted=true succeeds
    const deletedCustomer = await service.getCustomerById(TENANT_A, customerA3.id, true);
    assert.ok(deletedCustomer);
    assert.ok(deletedCustomer.deleted_at);

    // Default search hides soft-deleted customer
    const activeSearch = await service.searchCustomers(TENANT_A, { query: 'Youssef' });
    assert.equal(activeSearch.length, 0);

    // Search with includeDeleted includes soft-deleted customer
    const searchWithDeleted = await service.searchCustomers(TENANT_A, { query: 'Youssef', includeDeleted: true });
    assert.equal(searchWithDeleted.length, 1);
  });

  // --------------------------------------------------------------------------
  // TEST GROUP 10: Supabase Client Query Builder Contract Verification
  // --------------------------------------------------------------------------
  await runTest('Supabase Query Contract > Injected mock client verifies correct table and filters', async () => {
    const calls: { table?: string; filters: Array<{ op: string; field: string; val: any }> } = {
      filters: []
    };

    const mockSupabase = {
      from: (table: string) => {
        calls.table = table;
        const builder: any = {
          select: () => builder,
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: {
                  id: 'cust_test_123',
                  organization_id: 'org_baher_silver',
                  name: 'Test Client',
                  phone: '01000000000',
                  normalized_phone: '+20100000000',
                  status: 'ACTIVE',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                },
                error: null
              })
            })
          }),
          eq: (field: string, val: any) => {
            calls.filters.push({ op: 'eq', field, val });
            return builder;
          },
          is: (field: string, val: any) => {
            calls.filters.push({ op: 'is', field, val });
            return builder;
          },
          maybeSingle: async () => ({
            data: {
              id: 'cust_test_123',
              organization_id: 'org_baher_silver',
              name: 'Test Client',
              phone: '01000000000',
              normalized_phone: '+20100000000',
              status: 'ACTIVE',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              deleted_at: null
            },
            error: null
          })
        };
        return builder;
      }
    };

    const injectedRepo = new SupabaseCustomerRepository(mockSupabase);
    const injectedService = new CustomerService(injectedRepo);

    const fetched = await injectedService.getCustomerById(TENANT_A, 'cust_test_123');
    assert.equal(fetched.id, 'cust_test_123');
    assert.equal(calls.table, 'retail_customers', 'Must target public.retail_customers table');
    assert.ok(calls.filters.some(f => f.field === 'id' && f.val === 'cust_test_123'));
    assert.ok(calls.filters.some(f => f.field === 'organization_id' && f.val === 'org_baher_silver'), 'Must enforce organization_id');
    assert.ok(calls.filters.some(f => f.field === 'deleted_at' && f.val === null), 'Must filter out deleted_at by default');
  });

  // --------------------------------------------------------------------------
  // TEST GROUP 11: Absolute Scope Boundary Verification
  // --------------------------------------------------------------------------
  await runTest('Scope Boundary > No customer account or store credit services exist', () => {
    const storeCreditPath = path.join(process.cwd(), 'lib', 'services', 'customer', 'storeCredit.ts');
    assert.equal(fs.existsSync(storeCreditPath), false, 'Store Credit must NOT exist in Customer domain');
  });

  await runTest('Scope Boundary > Customer Master model contains zero store credit, loyalty, or GL fields', () => {
    const customerModelKeys = Object.keys(customerA1);
    const forbiddenKeys = [
      'store_credit',
      'store_credit_balance',
      'credit_limit',
      'loyalty_points',
      'loyalty_tier',
      'ar_balance',
      'ledger_id',
      'total_spend',
      'account_balance'
    ];

    for (const key of forbiddenKeys) {
      assert.equal(customerModelKeys.includes(key), false, `Forbidden key "${key}" found in CustomerProfile`);
    }
  });

  console.log('===============================================================');
  console.log(`  PHASE 4B.2.2A TEST RESULTS: ${passedTests}/${totalTests} PASSED (0 FAILED)`);
  console.log('===============================================================');
  console.log('\n🎉 ALL PHASE 4B.2.2A CUSTOMER REPOSITORY & SERVICE TESTS PASSED PERFECTLY!\n');
}

runCustomerMasterTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
