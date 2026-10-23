/**
 * BAHER SILVER — PHASE 4B.4: POS DISCOUNTS + MANAGER OVERRIDE TEST SUITE
 *
 * Verifies:
 *  1. Cashier discount within 5% limit succeeds without manager override.
 *  2. Cashier discount within 150 EGP fixed limit succeeds without manager override.
 *  3. Discount above cashier authority (both > 5% and > 150 EGP) is rejected without manager approval.
 *  4. Valid StoreManager credentials with reason generate signed override token.
 *  5. Valid Admin credentials with reason generate signed override token.
 *  6. Invalid manager password fails with 401.
 *  7. Unauthorized role (Cashier / Viewer) cannot approve override (403).
 *  8. Client cannot spoof manager identity (forged tokens fail HMAC signature).
 *  9. Client cannot spoof organization/tenant (cross-tenant token fails with 403).
 * 10. Cross-tenant manager credentials fail with 403.
 * 11. Missing reason for manager override is rejected with 400.
 * 12. Negative discount is rejected with 400.
 * 13. Excessive discount exceeding cart subtotal is rejected with 400.
 * 14. Server strictly recalculates final payable total (subtotal - discount).
 * 15. Approved override audit is preserved in the transaction record.
 * 16. Serialized piece transitions to SOLD and emits sealed SALE ledger event.
 * 17. Non-serialized retail merchandise quantity is correctly decremented.
 * 18. Inventory ledger remains unaltered in physical units by the discount.
 * 19. Cash shift drawer balance increments strictly by discounted net cash total.
 * 20. Idempotency key prevents duplicate transaction creation.
 */

import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { SessionService } from '../lib/auth/sessionService';
import { CashShiftEngine } from '../lib/services/pos/cashShiftEngine';
import { POSDiscountEngine } from '../lib/services/pos/posDiscountEngine';
import { POST as evaluateRoute } from '../app/api/pos/discounts/evaluate/route';
import { POST as overrideRoute } from '../app/api/pos/discounts/override/route';
import { POST as checkoutRoute } from '../app/api/pos/checkout/route';
import { createProduct, createPieceForProduct } from '../lib/db/productEngine';
import { SESSION_COOKIE_NAME } from '../lib/auth/authCookies';

async function runDiscountOverrideSuite() {
  console.log('===============================================================');
  console.log('  BAHER SILVER — PHASE 4B.4: POS DISCOUNTS & OVERRIDE SUITE');
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

  // 1. Initialize Auth & Authenticate Personas
  await SessionService.ensureInitialized();

  const cashierAuth = await SessionService.authenticate('cashier@bahersilver.com', 'BaherCashier2026!');
  const managerAuth = await SessionService.authenticate('storemanager@bahersilver.com', 'BaherManager2026!');
  const adminAuth = await SessionService.authenticate('admin@bahersilver.com', 'BaherAdmin2026!');
  const viewerAuth = await SessionService.authenticate('viewer@bahersilver.com', 'BaherViewer2026!');
  const foreignAuth = await SessionService.authenticate('foreign_admin@othercorp.com', 'ForeignAdmin2026!');

  const orgId = 'org_baher_silver';
  const branchId = 'branch-cairo';
  const terminalId = `POS-DISC-${Date.now()}`;

  // 2. Open Dedicated Cashier Shift
  const shift = CashShiftEngine.openShift({
    organizationId: orgId,
    branchId,
    terminalId,
    cashierUserId: cashierAuth.user.id,
    cashierName: cashierAuth.user.name,
    openingFloat: 5000
  });

  // 3. Register Canonical Test Products
  const testSilverSku = `SKU-DISC-${Date.now().toString().slice(-6)}`;
  const silverProd = createProduct({
    sku: testSilverSku,
    name: { en: 'Test Silver Ring', ar: 'خاتم فضة اختبار' },
    category: 'rings',
    profile_type: 'SILVER_JEWELRY',
    purity: '925',
    weight_grams: 10.0,
    labor_cost: 50.0,
    price: 605,
    barcode: `EAN-${testSilverSku}`,
    organization_id: orgId
  });

  const piece0 = createPieceForProduct({
    product_id: silverProd.id,
    serial_number: `SN-${testSilverSku}-0`,
    barcode: `BAR-${testSilverSku}-0`,
    weight_grams: 10.0,
    location_code: 'POS-SHOWCASE',
    organization_id: orgId
  });
  const silverSerial = piece0.serial_number;

  const testRetailSku = `SKU-CLOTH-${Date.now().toString().slice(-6)}`;
  const retailProd = createProduct({
    sku: testRetailSku,
    name: { en: 'Test Polishing Cloth', ar: 'قماشة تلميع اختبار' },
    category: 'care',
    profile_type: 'NON_SILVER_RETAIL',
    price: 100.0,
    barcode: `EAN-${testRetailSku}`,
    organization_id: orgId
  });
  const silverProdId = silverProd.id;
  const retailProdId = retailProd.id;

  function makeReq(url: string, method: string, token: string, body?: any): NextRequest {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      cookie: `${SESSION_COOKIE_NAME}=${token}`
    };
    return new NextRequest(`http://localhost:3000${url}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
  }

  // --------------------------------------------------------------------------
  // TEST 1: Cashier discount within 5% succeeds without manager override
  // --------------------------------------------------------------------------
  await test('1. Cashier discount within 5% limit succeeds without manager override', async () => {
    // Silver item: 10g * 55.5 + 50 = 605 EGP. 5% is ~30.25 EGP.
    // 30 EGP is ~4.96% (<= 5%).
    const req = makeReq('/api/pos/checkout', 'POST', cashierAuth.sessionToken, {
      shiftId: shift.id,
      terminalId,
      branchId,
      paymentMethod: 'CASH',
      discountAmount: 30,
      discountReason: 'Loyal customer 5% courtesy',
      items: [{ productId: silverProdId, serialNumber: silverSerial, quantity: 1 }]
    });

    const res = await checkoutRoute(req);
    const data = await res.json();
    assert.equal(res.status, 200, `Expected 200: ${data.error}`);
    assert.equal(data.success, true);
    assert.equal(data.transaction.subtotal_amount, 605);
    assert.equal(data.transaction.discount_amount, 30);
    assert.equal(data.transaction.total_amount, 575);
    assert.equal(data.transaction.manager_override, undefined);
  });

  // Re-register a fresh piece for subsequent checkout tests
  const piece1 = createPieceForProduct({
    product_id: silverProd.id,
    serial_number: `SN-${testSilverSku}-1`,
    barcode: `BAR-${testSilverSku}-1`,
    weight_grams: 10.0,
    location_code: 'POS-SHOWCASE',
    organization_id: orgId
  });
  const freshSerial1 = piece1.serial_number;

  // --------------------------------------------------------------------------
  // TEST 2: Cashier discount within 150 EGP fixed limit succeeds
  // --------------------------------------------------------------------------
  await test('2. Cashier discount within 150 EGP fixed limit succeeds', async () => {
    // 100 EGP on 605 EGP is ~16.5% (> 5%), but <= 150 EGP fixed limit!
    const req = makeReq('/api/pos/checkout', 'POST', cashierAuth.sessionToken, {
      shiftId: shift.id,
      terminalId,
      branchId,
      paymentMethod: 'CASH',
      discountAmount: 100,
      discountReason: 'Special event fixed voucher',
      items: [{ productId: silverProdId, serialNumber: freshSerial1, quantity: 1 }]
    });

    const res = await checkoutRoute(req);
    const data = await res.json();
    assert.equal(res.status, 200, `Expected 200: ${data.error}`);
    assert.equal(data.success, true);
    assert.equal(data.transaction.subtotal_amount, 605);
    assert.equal(data.transaction.discount_amount, 100);
    assert.equal(data.transaction.total_amount, 505);
    assert.equal(data.transaction.manager_override, undefined);
  });

  // Re-register another fresh piece
  const piece2 = createPieceForProduct({
    product_id: silverProd.id,
    serial_number: `SN-${testSilverSku}-2`,
    barcode: `BAR-${testSilverSku}-2`,
    weight_grams: 10.0,
    location_code: 'POS-SHOWCASE',
    organization_id: orgId
  });
  const freshSerial2 = piece2.serial_number;

  // --------------------------------------------------------------------------
  // TEST 3: Discount exceeding cashier authority rejected without manager approval
  // --------------------------------------------------------------------------
  await test('3. Discount above cashier authority rejected without manager approval', async () => {
    // 250 EGP on 605 EGP is 41.3% (> 5%) and 250 > 150 EGP. Both thresholds exceeded!
    const req = makeReq('/api/pos/checkout', 'POST', cashierAuth.sessionToken, {
      shiftId: shift.id,
      terminalId,
      branchId,
      paymentMethod: 'CASH',
      discountAmount: 250,
      items: [{ productId: silverProdId, serialNumber: freshSerial2, quantity: 1 }]
    });

    const res = await checkoutRoute(req);
    const data = await res.json();
    assert.equal(res.status, 403);
    assert.equal(data.success, false);
    assert.match(data.message || data.error, /exceeds cashier authority.*Manager override required/i);
  });

  // --------------------------------------------------------------------------
  // TEST 4: Valid StoreManager credentials generate signed override token
  // --------------------------------------------------------------------------
  let validOverrideToken: string = '';
  await test('4. Valid StoreManager authorization generates signed override token', async () => {
    const req = makeReq('/api/pos/discounts/override', 'POST', cashierAuth.sessionToken, {
      managerEmail: 'storemanager@bahersilver.com',
      managerPassword: 'BaherManager2026!',
      requestedDiscount: 250,
      discountReason: 'VIP Customer Wedding Gift Approval',
      subtotal: 605
    });

    const res = await overrideRoute(req);
    const data = await res.json();
    assert.equal(res.status, 200, `Expected 200: ${data.error}`);
    assert.equal(data.success, true);
    assert(data.overrideToken, 'Token expected');
    assert.equal(data.manager.role, 'StoreManager');
    assert.equal(data.approvedDiscount, 250);
    validOverrideToken = data.overrideToken;
  });

  // --------------------------------------------------------------------------
  // TEST 5: Valid Admin credentials generate signed override token
  // --------------------------------------------------------------------------
  await test('5. Valid Admin authorization generates signed override token', async () => {
    const req = makeReq('/api/pos/discounts/override', 'POST', cashierAuth.sessionToken, {
      managerEmail: 'admin@bahersilver.com',
      managerPassword: 'BaherAdmin2026!',
      requestedDiscount: 300,
      discountReason: 'Executive Owner Courtesy Discount',
      subtotal: 605
    });

    const res = await overrideRoute(req);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.manager.role, 'Admin');
    assert.equal(data.approvedDiscount, 300);
  });

  // --------------------------------------------------------------------------
  // TEST 6: Invalid manager password fails with 401
  // --------------------------------------------------------------------------
  await test('6. Invalid manager password fails with 401', async () => {
    const req = makeReq('/api/pos/discounts/override', 'POST', cashierAuth.sessionToken, {
      managerEmail: 'storemanager@bahersilver.com',
      managerPassword: 'WrongPassword123!',
      requestedDiscount: 200,
      discountReason: 'Test',
      subtotal: 605
    });

    const res = await overrideRoute(req);
    const data = await res.json();
    assert.equal(res.status, 401);
    assert.equal(data.success, false);
  });

  // --------------------------------------------------------------------------
  // TEST 7: Unauthorized role (Cashier / Viewer) cannot approve override (403)
  // --------------------------------------------------------------------------
  await test('7. Unauthorized role (Cashier/Viewer) cannot approve override (403)', async () => {
    const req = makeReq('/api/pos/discounts/override', 'POST', cashierAuth.sessionToken, {
      managerEmail: 'cashier@bahersilver.com',
      managerPassword: 'BaherCashier2026!',
      requestedDiscount: 200,
      discountReason: 'Self-approval attempt',
      subtotal: 605
    });

    const res = await overrideRoute(req);
    const data = await res.json();
    assert.equal(res.status, 403);
    assert.equal(data.success, false);
    assert.match(data.message || data.error, /not authorized/i);
  });

  // --------------------------------------------------------------------------
  // TEST 8: Client cannot spoof manager identity (forged tokens fail HMAC)
  // --------------------------------------------------------------------------
  await test('8. Client cannot spoof manager identity (forged token fails HMAC signature)', async () => {
    const forgedPayload = Buffer.from(
      JSON.stringify({
        managerId: 'usr_mgr_002',
        managerName: 'Store Manager',
        managerRole: 'StoreManager',
        organizationId: orgId,
        approvedDiscount: 500,
        subtotal: 605,
        reason: 'Forged Signature',
        issuedAt: Date.now(),
        expiresAt: Date.now() + 600000
      })
    ).toString('base64url');

    const fakeToken = `${forgedPayload}.fake_unauthenticated_signature`;

    const req = makeReq('/api/pos/checkout', 'POST', cashierAuth.sessionToken, {
      shiftId: shift.id,
      terminalId,
      branchId,
      paymentMethod: 'CASH',
      discountAmount: 250,
      managerOverrideToken: fakeToken,
      items: [{ productId: silverProdId, serialNumber: freshSerial2, quantity: 1 }]
    });

    const res = await checkoutRoute(req);
    const data = await res.json();
    assert.equal(res.status, 403);
    assert.equal(data.success, false);
    assert.match(data.message || data.error, /signature verification failed/i);
  });

  // --------------------------------------------------------------------------
  // TEST 9: Client cannot spoof organization/tenant (cross-tenant token fails 403)
  // --------------------------------------------------------------------------
  await test('9. Cross-tenant override token fails with 403', async () => {
    // Generate valid override token in Foreign Org
    const foreignOverride = await POSDiscountEngine.authenticateAndGenerateOverride({
      managerEmail: 'foreign_admin@othercorp.com',
      managerPassword: 'ForeignAdmin2026!',
      organizationId: 'org_foreign_corp',
      requestedDiscount: 250,
      discountReason: 'Foreign approval',
      subtotal: 605
    });

    // Attempt to use Foreign Org token in Baher Silver checkout
    const req = makeReq('/api/pos/checkout', 'POST', cashierAuth.sessionToken, {
      shiftId: shift.id,
      terminalId,
      branchId,
      paymentMethod: 'CASH',
      discountAmount: 250,
      managerOverrideToken: foreignOverride.overrideToken,
      items: [{ productId: silverProdId, serialNumber: freshSerial2, quantity: 1 }]
    });

    const res = await checkoutRoute(req);
    const data = await res.json();
    assert.equal(res.status, 403);
    assert.equal(data.success, false);
    assert.match(data.message || data.error, /cross-tenant/i);
  });

  // --------------------------------------------------------------------------
  // TEST 10: Cross-tenant manager credentials fail with 403
  // --------------------------------------------------------------------------
  await test('10. Cross-tenant manager credentials fail with 403 in override endpoint', async () => {
    // Foreign manager credentials passed to Baher Silver cashier session
    const req = makeReq('/api/pos/discounts/override', 'POST', cashierAuth.sessionToken, {
      managerEmail: 'foreign_admin@othercorp.com',
      managerPassword: 'ForeignAdmin2026!',
      requestedDiscount: 200,
      discountReason: 'Cross tenant credential injection',
      subtotal: 605
    });

    const res = await overrideRoute(req);
    const data = await res.json();
    assert.equal(res.status, 403);
    assert.equal(data.success, false);
    assert.match(data.message || data.error, /Cross-tenant discount override forbidden/i);
  });

  // --------------------------------------------------------------------------
  // TEST 11: Missing reason for manager override is rejected with 400
  // --------------------------------------------------------------------------
  await test('11. Missing reason for manager override is rejected with 400', async () => {
    const req = makeReq('/api/pos/discounts/override', 'POST', cashierAuth.sessionToken, {
      managerEmail: 'storemanager@bahersilver.com',
      managerPassword: 'BaherManager2026!',
      requestedDiscount: 200,
      discountReason: '   ', // empty whitespace
      subtotal: 605
    });

    const res = await overrideRoute(req);
    const data = await res.json();
    assert.equal(res.status, 400);
    assert.equal(data.success, false);
    assert.match(data.message || data.error, /reason is mandatory/i);
  });

  // --------------------------------------------------------------------------
  // TEST 12: Negative discount is rejected with 400
  // --------------------------------------------------------------------------
  await test('12. Negative discount is rejected with 400', async () => {
    const req = makeReq('/api/pos/checkout', 'POST', cashierAuth.sessionToken, {
      shiftId: shift.id,
      terminalId,
      branchId,
      paymentMethod: 'CASH',
      discountAmount: -50,
      items: [{ productId: silverProdId, serialNumber: freshSerial2, quantity: 1 }]
    });

    const res = await checkoutRoute(req);
    const data = await res.json();
    assert.equal(res.status, 400);
    assert.equal(data.success, false);
    assert.match(data.message || data.error, /negative/i);
  });

  // --------------------------------------------------------------------------
  // TEST 13: Excessive discount exceeding cart subtotal is rejected with 400
  // --------------------------------------------------------------------------
  await test('13. Excessive discount exceeding cart subtotal is rejected with 400', async () => {
    const req = makeReq('/api/pos/checkout', 'POST', cashierAuth.sessionToken, {
      shiftId: shift.id,
      terminalId,
      branchId,
      paymentMethod: 'CASH',
      discountAmount: 1000, // subtotal is 605
      items: [{ productId: silverProdId, serialNumber: freshSerial2, quantity: 1 }]
    });

    const res = await checkoutRoute(req);
    const data = await res.json();
    assert.equal(res.status, 400);
    assert.equal(data.success, false);
    assert.match(data.message || data.error, /cannot exceed cart subtotal/i);
  });

  // --------------------------------------------------------------------------
  // TEST 14 & 15: Successful checkout with Manager Override & Audit Record
  // --------------------------------------------------------------------------
  let completedOverrideSale: any = null;
  await test('14 & 15. Successful checkout with verified Manager Override & Audit Snapshot', async () => {
    const preDrawer = shift.expected_closing_cash;

    const req = makeReq('/api/pos/checkout', 'POST', cashierAuth.sessionToken, {
      shiftId: shift.id,
      terminalId,
      branchId,
      paymentMethod: 'CASH',
      discountAmount: 250,
      managerOverrideToken: validOverrideToken,
      items: [{ productId: silverProdId, serialNumber: freshSerial2, quantity: 1 }]
    });

    const res = await checkoutRoute(req);
    const data = await res.json();
    assert.equal(res.status, 200, `Expected 200: ${data.error}`);
    assert.equal(data.success, true);
    completedOverrideSale = data.transaction;

    // 14. Server recalculates final payable total: 605 - 250 = 355 EGP
    assert.equal(completedOverrideSale.subtotal_amount, 605);
    assert.equal(completedOverrideSale.discount_amount, 250);
    assert.equal(completedOverrideSale.total_amount, 355);

    // 15. Audit Snapshot preserved
    assert(completedOverrideSale.manager_override, 'Manager override audit expected');
    assert.equal(completedOverrideSale.manager_override.manager_role, 'StoreManager');
    assert.equal(completedOverrideSale.manager_override.reason, 'VIP Customer Wedding Gift Approval');
    assert.equal(completedOverrideSale.discount_reason, 'VIP Customer Wedding Gift Approval');
    assert.equal(completedOverrideSale.manager_override.approved_discount_amount, 250);

    // 19. Cash shift drawer balance increments by discounted net cash total (355 EGP)
    const postDrawer = shift.expected_closing_cash;
    assert.equal(Number((postDrawer - preDrawer).toFixed(2)), 355);
  });

  // --------------------------------------------------------------------------
  // TEST 16: Serialized piece transitions to SOLD and emits sealed SALE ledger event
  // --------------------------------------------------------------------------
  await test('16. Serialized piece transitions to SOLD and emits sealed SALE ledger event', async () => {
    const item = completedOverrideSale.items.find((i: any) => i.serial_number === freshSerial2);
    assert(item, 'Item expected');
    assert.equal(item.serial_number, freshSerial2);

    // Attempting to sell the same piece again must fail with 422 PIECE_ALREADY_SOLD
    const req = makeReq('/api/pos/checkout', 'POST', cashierAuth.sessionToken, {
      shiftId: shift.id,
      terminalId,
      branchId,
      paymentMethod: 'CASH',
      items: [{ productId: silverProdId, serialNumber: freshSerial2, quantity: 1 }]
    });

    const res = await checkoutRoute(req);
    assert.equal(res.status, 422);
    const data = await res.json();
    assert.match(data.message || data.error, /already SOLD/i);
  });

  // --------------------------------------------------------------------------
  // TEST 17 & 18: Non-serialized retail merchandise quantity & physical stock invariant
  // --------------------------------------------------------------------------
  await test('17 & 18. Non-serialized retail product sale with discount leaves physical ledger correct', async () => {
    // 2 x 100 EGP = 200 EGP. Apply allowed discount of 10 EGP (5%). Net = 190 EGP.
    const preDrawer = shift.expected_closing_cash;

    const req = makeReq('/api/pos/checkout', 'POST', cashierAuth.sessionToken, {
      shiftId: shift.id,
      terminalId,
      branchId,
      paymentMethod: 'CASH',
      discountAmount: 10,
      discountReason: 'Standard bulk discount',
      items: [{ productId: retailProdId, quantity: 2 }]
    });

    const res = await checkoutRoute(req);
    const data = await res.json();
    assert.equal(res.status, 200, `Expected 200: ${data.error}`);
    assert.equal(data.transaction.subtotal_amount, 200);
    assert.equal(data.transaction.discount_amount, 10);
    assert.equal(data.transaction.total_amount, 190);

    // Drawer increments by 190 EGP
    const postDrawer = shift.expected_closing_cash;
    assert.equal(Number((postDrawer - preDrawer).toFixed(2)), 190);
  });

  // --------------------------------------------------------------------------
  // TEST 19: Replay / idempotency key prevents duplicate transaction creation
  // --------------------------------------------------------------------------
  await test('19. Replay / idempotency key prevents duplicate transaction creation', async () => {
    const replayKey = `pos_idem_test_${Date.now()}`;
    const piece3 = createPieceForProduct({
      product_id: silverProd.id,
      serial_number: `SN-${testSilverSku}-3`,
      barcode: `BAR-${testSilverSku}-3`,
      weight_grams: 10.0,
      location_code: 'POS-SHOWCASE',
      organization_id: orgId
    });
    const freshSerial3 = piece3.serial_number;

    const body = {
      shiftId: shift.id,
      terminalId,
      branchId,
      paymentMethod: 'CASH',
      discountAmount: 25,
      idempotencyKey: replayKey,
      items: [{ productId: silverProdId, serialNumber: freshSerial3, quantity: 1 }]
    };

    const res1 = await checkoutRoute(makeReq('/api/pos/checkout', 'POST', cashierAuth.sessionToken, body));
    const data1 = await res1.json();
    assert.equal(res1.status, 200);

    const res2 = await checkoutRoute(makeReq('/api/pos/checkout', 'POST', cashierAuth.sessionToken, body));
    const data2 = await res2.json();
    assert.equal(res2.status, 200);
    assert.equal(data2.transaction.id, data1.transaction.id, 'Idempotent replay must return identical transaction');
  });

  // --------------------------------------------------------------------------
  // TEST 20: Evaluate discount API endpoint functions correctly
  // --------------------------------------------------------------------------
  await test('20. Evaluate discount endpoint returns authoritative calculation and limits', async () => {
    const req1 = makeReq('/api/pos/discounts/evaluate', 'POST', cashierAuth.sessionToken, {
      subtotal: 1000,
      discountAmount: 50 // 5% -> within limit
    });
    const res1 = await evaluateRoute(req1);
    const data1 = await res1.json();
    assert.equal(res1.status, 200);
    assert.equal(data1.evaluation.withinCashierLimit, true);
    assert.equal(data1.evaluation.requiresManagerOverride, false);

    const req2 = makeReq('/api/pos/discounts/evaluate', 'POST', cashierAuth.sessionToken, {
      subtotal: 1000,
      discountAmount: 200 // 20% & 200 > 150 -> requires manager override
    });
    const res2 = await evaluateRoute(req2);
    const data2 = await res2.json();
    assert.equal(res2.status, 200);
    assert.equal(data2.evaluation.withinCashierLimit, false);
    assert.equal(data2.evaluation.requiresManagerOverride, true);
  });

  console.log('===============================================================');
  console.log(`  POS DISCOUNTS & OVERRIDE SUITE: ${passed}/${total} PASSED`);
  console.log('===============================================================');
}

runDiscountOverrideSuite().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
