/**
 * BAHER SILVER — PHASE 4B.2.2B: CUSTOMER API BOUNDARY ACCEPTANCE SUITE
 *
 * Programmatically and authoritatively verifies:
 * 1. Authenticated customer creation via POST /api/customers (201 Created)
 * 2. Unauthenticated request rejected with 401 UNAUTHENTICATED
 * 3. Missing/invalid permission rejected with 403 FORBIDDEN_USER_PERMISSION (e.g. Viewer role)
 * 4. organizationId cannot be supplied by client (server binds strictly to session)
 * 5. Authenticated Tenant A cannot read Tenant B customer (returns 404 CUSTOMER_NOT_FOUND)
 * 6. Authenticated Tenant A cannot update Tenant B customer (returns 404 CUSTOMER_NOT_FOUND)
 * 7. Authenticated Tenant A cannot delete Tenant B customer (returns 404 CUSTOMER_NOT_FOUND)
 * 8. Same normalized phone duplicate within tenant rejected with 409 DUPLICATE_CUSTOMER_PHONE
 * 9. Same normalized phone across tenants allowed and isolated
 * 10. Malformed phone rejected with 400 INVALID_PHONE_NUMBER
 * 11. Search remains tenant-scoped (Tenant A search does not return Tenant B records)
 * 12. Soft-deleted customer remains hidden by default in search and GET by ID
 * 13. Customer Master JSON payload contains ZERO financial / ledger fields
 */

import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { SessionService } from '../lib/auth/sessionService';
import { SupabaseCustomerRepository } from '../lib/services/customer';
import { POST as postCustomer, GET as searchCustomers } from '../app/api/customers/route';
import {
  GET as getCustomerById,
  PUT as putCustomer,
  PATCH as patchCustomer,
  DELETE as deleteCustomer
} from '../app/api/customers/[id]/route';

async function runCustomerApiTestSuite() {
  console.log('===============================================================');
  console.log('  BAHER SILVER — PHASE 4B.2.2B: CUSTOMER API ACCEPTANCE SUITE');
  console.log('===============================================================');

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => Promise<void>) {
    total++;
    try {
      await fn();
      passed++;
      console.log(`  ✓ [PASS] ${name}`);
    } catch (err: any) {
      console.error(`  ✗ [FAIL] ${name}:`, err);
      throw err;
    }
  }

  // 1. Initialize Auth Store & Clean Customer In-Memory Store
  await SessionService.ensureInitialized();
  SupabaseCustomerRepository.clearMemoryStore();

  // 2. Authenticate Personas
  // Tenant A: Admin
  const adminA = await SessionService.authenticate('admin@bahersilver.com', 'BaherAdmin2026!');
  assert(adminA.sessionToken, 'Admin A token required');
  assert.equal(adminA.user.organizationId, 'org_baher_silver');

  // Tenant A: Cashier
  const cashierA = await SessionService.authenticate('cashier@bahersilver.com', 'BaherCashier2026!');
  assert(cashierA.sessionToken, 'Cashier A token required');
  assert.equal(cashierA.user.role, 'Cashier');

  // Tenant A: Viewer (has NO customer:manage or customer:read)
  const viewerA = await SessionService.authenticate('viewer@bahersilver.com', 'BaherViewer2026!');
  assert(viewerA.sessionToken, 'Viewer A token required');
  assert.equal(viewerA.user.role, 'Viewer');

  // Tenant B: Foreign Admin (Org: org_foreign_corp)
  const adminB = await SessionService.authenticate('foreign_admin@othercorp.com', 'ForeignAdmin2026!');
  assert(adminB.sessionToken, 'Admin B token required');
  assert.equal(adminB.user.organizationId, 'org_foreign_corp');

  let tenantACustomerId: string;
  let tenantBCustomerId: string;

  // --------------------------------------------------------------------------
  // TEST 1: Authenticated Create
  // --------------------------------------------------------------------------
  await test('1. Authenticated create > Cashier creates retail customer via POST /api/customers', async () => {
    const req = new NextRequest('http://localhost:3000/api/customers', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${cashierA.sessionToken}`
      },
      body: JSON.stringify({
        name: 'Karim Mostafa',
        phone: '01012345678',
        email: 'karim@example.com',
        address: '5 Hassan Sabry St, Zamalek'
      })
    });

    const res = await postCustomer(req);
    assert.equal(res.status, 201, `Expected 201 Created, got ${res.status}`);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.customer.id.startsWith('cust_'));
    assert.equal(json.customer.organization_id, 'org_baher_silver');
    assert.equal(json.customer.name, 'Karim Mostafa');
    assert.equal(json.customer.normalized_phone, '+201012345678');
    assert.equal(json.customer.status, 'ACTIVE');

    tenantACustomerId = json.customer.id;
  });

  // --------------------------------------------------------------------------
  // TEST 2: Unauthenticated Request Rejected
  // --------------------------------------------------------------------------
  await test('2. Unauthenticated request > Missing session token is rejected with 401', async () => {
    const req = new NextRequest('http://localhost:3000/api/customers', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Hacker', phone: '01099998888' })
    });

    const res = await postCustomer(req);
    assert.equal(res.status, 401, `Expected 401 Unauthenticated, got ${res.status}`);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error, 'UNAUTHENTICATED');
  });

  // --------------------------------------------------------------------------
  // TEST 3: Missing/Invalid Permission Rejected
  // --------------------------------------------------------------------------
  await test('3. Permission guard > Viewer role without customer:manage is rejected with 403', async () => {
    const req = new NextRequest('http://localhost:3000/api/customers', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${viewerA.sessionToken}`
      },
      body: JSON.stringify({ name: 'Viewer Client', phone: '01055554444' })
    });

    const res = await postCustomer(req);
    assert.equal(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error, 'FORBIDDEN_USER_PERMISSION');
  });

  // --------------------------------------------------------------------------
  // TEST 4: organizationId Cannot Be Supplied by Client
  // --------------------------------------------------------------------------
  await test('4. Tenant spoofing > Client-provided organizationId in body is ignored', async () => {
    const req = new NextRequest('http://localhost:3000/api/customers', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${cashierA.sessionToken}` // Cashier belongs to org_baher_silver
      },
      // Attacker attempts to forge organizationId to another tenant
      body: JSON.stringify({
        organizationId: 'org_spoofed_competitor',
        organization_id: 'org_spoofed_competitor',
        name: 'Legit User',
        phone: '01122334455'
      })
    });

    const res = await postCustomer(req);
    assert.equal(res.status, 201);
    const json = await res.json();
    // Server must authoritatively bind to cashier's organizationId
    assert.equal(json.customer.organization_id, 'org_baher_silver');
    assert.notEqual(json.customer.organization_id, 'org_spoofed_competitor');
  });

  // Setup: Tenant B creates customer
  const tenantBSetupReq = new NextRequest('http://localhost:3000/api/customers', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${adminB.sessionToken}` // Foreign Corp
    },
    body: JSON.stringify({
      name: 'Nader Alex Client',
      phone: '01299887766'
    })
  });
  const tenantBRes = await postCustomer(tenantBSetupReq);
  assert.equal(tenantBRes.status, 201);
  const tenantBData = await tenantBRes.json();
  tenantBCustomerId = tenantBData.customer.id;
  assert.equal(tenantBData.customer.organization_id, 'org_foreign_corp');

  // --------------------------------------------------------------------------
  // TEST 5: Cross-Tenant Read Blocked (Anti-IDOR)
  // --------------------------------------------------------------------------
  await test('5. Cross-tenant IDOR > Tenant A cannot read Tenant B customer by ID (404)', async () => {
    const req = new NextRequest(`http://localhost:3000/api/customers/${tenantBCustomerId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${adminA.sessionToken}` // Tenant A
      }
    });

    const res = await getCustomerById(req, { params: Promise.resolve({ id: tenantBCustomerId }) });
    assert.equal(res.status, 404, `Expected 404 Not Found, got ${res.status}`);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error, 'CUSTOMER_NOT_FOUND');
  });

  // --------------------------------------------------------------------------
  // TEST 6: Cross-Tenant Update Blocked (Anti-IDOR)
  // --------------------------------------------------------------------------
  await test('6. Cross-tenant IDOR > Tenant A cannot update Tenant B customer (404)', async () => {
    const req = new NextRequest(`http://localhost:3000/api/customers/${tenantBCustomerId}`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${adminA.sessionToken}` // Tenant A
      },
      body: JSON.stringify({ name: 'Hacked In Tenant B' })
    });

    const res = await putCustomer(req, { params: Promise.resolve({ id: tenantBCustomerId }) });
    assert.equal(res.status, 404, `Expected 404 Not Found, got ${res.status}`);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error, 'CUSTOMER_NOT_FOUND');
  });

  // --------------------------------------------------------------------------
  // TEST 7: Cross-Tenant Delete Blocked (Anti-IDOR)
  // --------------------------------------------------------------------------
  await test('7. Cross-tenant IDOR > Tenant A cannot delete Tenant B customer (404)', async () => {
    const req = new NextRequest(`http://localhost:3000/api/customers/${tenantBCustomerId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${adminA.sessionToken}` // Tenant A
      }
    });

    const res = await deleteCustomer(req, { params: Promise.resolve({ id: tenantBCustomerId }) });
    assert.equal(res.status, 404, `Expected 404 Not Found, got ${res.status}`);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error, 'CUSTOMER_NOT_FOUND');
  });

  // --------------------------------------------------------------------------
  // TEST 8: Same Normalized Phone Duplicate Within Tenant Rejected
  // --------------------------------------------------------------------------
  await test('8. Duplicate phone > Same normalized phone in Tenant A rejected with 409', async () => {
    const req = new NextRequest('http://localhost:3000/api/customers', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${cashierA.sessionToken}`
      },
      // Karim Mostafa's phone formatted differently: (010) 1234-5678 -> +201012345678
      body: JSON.stringify({
        name: 'Karim Imposter',
        phone: '(010) 1234-5678'
      })
    });

    const res = await postCustomer(req);
    assert.equal(res.status, 409, `Expected 409 Conflict, got ${res.status}`);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error, 'DUPLICATE_CUSTOMER_PHONE');
  });

  // --------------------------------------------------------------------------
  // TEST 9: Same Normalized Phone Across Tenants Allowed
  // --------------------------------------------------------------------------
  await test('9. Multi-tenant phone > Identical normalized phone across tenants allowed', async () => {
    // Tenant B creates a customer with Karim's same phone (01012345678)
    const req = new NextRequest('http://localhost:3000/api/customers', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${adminB.sessionToken}` // Tenant B
      },
      body: JSON.stringify({
        name: 'Karim Foreign Client',
        phone: '01012345678'
      })
    });

    const res = await postCustomer(req);
    assert.equal(res.status, 201, `Expected 201 Created for foreign tenant, got ${res.status}`);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.customer.organization_id, 'org_foreign_corp');
    assert.equal(json.customer.normalized_phone, '+201012345678');
    assert.notEqual(json.customer.id, tenantACustomerId);
  });

  // --------------------------------------------------------------------------
  // TEST 10: Malformed Phone Rejected
  // --------------------------------------------------------------------------
  await test('10. Validation > Malformed phone input is rejected with 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/customers', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${cashierA.sessionToken}`
      },
      body: JSON.stringify({
        name: 'Invalid Phone User',
        phone: '010-CALL-ME'
      })
    });

    const res = await postCustomer(req);
    assert.equal(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error, 'INVALID_PHONE_NUMBER');
  });

  // --------------------------------------------------------------------------
  // TEST 11: Search Remains Tenant-Scoped
  // --------------------------------------------------------------------------
  await test('11. Search scoping > Tenant A search does not return Tenant B customers', async () => {
    // Search for "Karim" in Tenant A -> should find only Tenant A's Karim Mostafa
    const reqA = new NextRequest('http://localhost:3000/api/customers?query=Karim', {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminA.sessionToken}` }
    });

    const resA = await searchCustomers(reqA);
    assert.equal(resA.status, 200);
    const jsonA = await resA.json();
    assert.equal(jsonA.success, true);
    assert.equal(jsonA.count, 1);
    assert.equal(jsonA.customers[0].id, tenantACustomerId);
    assert.equal(jsonA.customers[0].organization_id, 'org_baher_silver');

    // Search for "Karim" in Tenant B -> should find only Tenant B's Karim Foreign Client
    const reqB = new NextRequest('http://localhost:3000/api/customers?query=Karim', {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminB.sessionToken}` }
    });

    const resB = await searchCustomers(reqB);
    assert.equal(resB.status, 200);
    const jsonB = await resB.json();
    assert.equal(jsonB.success, true);
    assert.equal(jsonB.count, 1);
    assert.equal(jsonB.customers[0].organization_id, 'org_foreign_corp');
    assert.notEqual(jsonB.customers[0].id, tenantACustomerId);
  });

  // --------------------------------------------------------------------------
  // TEST 12: Soft-Deleted Customer Remains Hidden by Default
  // --------------------------------------------------------------------------
  await test('12. Soft-delete lifecycle > Deleted customer is hidden from default GET and search', async () => {
    // Delete Tenant A customer
    const delReq = new NextRequest(`http://localhost:3000/api/customers/${tenantACustomerId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminA.sessionToken}` }
    });
    const delRes = await deleteCustomer(delReq, { params: Promise.resolve({ id: tenantACustomerId }) });
    assert.equal(delRes.status, 200);

    // GET by ID by default returns 404
    const getReq = new NextRequest(`http://localhost:3000/api/customers/${tenantACustomerId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminA.sessionToken}` }
    });
    const getRes = await getCustomerById(getReq, { params: Promise.resolve({ id: tenantACustomerId }) });
    assert.equal(getRes.status, 404);

    // Search by default returns 0
    const searchReq = new NextRequest('http://localhost:3000/api/customers?query=Karim', {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminA.sessionToken}` }
    });
    const searchRes = await searchCustomers(searchReq);
    assert.equal(searchRes.status, 200);
    const searchJson = await searchRes.json();
    assert.equal(searchJson.count, 0);

    // Search with includeDeleted=true returns the record
    const searchDelReq = new NextRequest('http://localhost:3000/api/customers?query=Karim&includeDeleted=true', {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminA.sessionToken}` }
    });
    const searchDelRes = await searchCustomers(searchDelReq);
    assert.equal(searchDelRes.status, 200);
    const searchDelJson = await searchDelRes.json();
    assert.equal(searchDelJson.count, 1);
    assert.ok(searchDelJson.customers[0].deleted_at);
  });

  // --------------------------------------------------------------------------
  // TEST 13: Customer Model Contains Zero Financial Fields
  // --------------------------------------------------------------------------
  await test('13. Financial isolation > Customer API responses contain zero store credit or ledger fields', async () => {
    const req = new NextRequest('http://localhost:3000/api/customers', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${adminA.sessionToken}`
      },
      body: JSON.stringify({
        name: 'Amina Fawzy',
        phone: '01511223344'
      })
    });

    const res = await postCustomer(req);
    assert.equal(res.status, 201);
    const json = await res.json();
    const customer = json.customer;

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
      assert.equal(key in customer, false, `Forbidden key "${key}" detected in customer API response`);
    }
  });

  console.log('===============================================================');
  console.log(`  PHASE 4B.2.2B API RESULTS: ${passed}/${total} PASSED (0 FAILED)`);
  console.log('===============================================================');
  console.log('\n🎉 ALL PHASE 4B.2.2B CUSTOMER API TESTS PASSED PERFECTLY!\n');
}

runCustomerApiTestSuite().catch((err) => {
  console.error('Fatal API test error:', err);
  process.exit(1);
});
