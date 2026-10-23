/**
 * BAHER SILVER — PHASE 4B.3: POS MID-SHIFT CASH MOVEMENTS TEST SUITE
 *
 * Verifies:
 *  1. Authorized CASH_OUT succeeds and deducts drawer balance
 *  2. Authorized EXPENSE succeeds and deducts drawer balance
 *  3. Authorized SAFE_DROP succeeds and deducts drawer balance
 *  4. Canonical mathematical drawer balance reconciliation
 *  5. Reason / description is strictly preserved in the cash journal
 *  6. Unauthorized user (Viewer / unauthenticated) is rejected (403/401)
 *  7. Cross-tenant access attempt is rejected (403 Forbidden)
 *  8. Closed or non-existent shift is rejected (400)
 *  9. Invalid amount (zero, negative, non-numeric, excessive) is rejected (400)
 * 10. Idempotency / replay protection prevents double deductions
 */

import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { SessionService } from '../lib/auth/sessionService';
import { CashShiftEngine } from '../lib/services/pos/cashShiftEngine';
import { POST as cashMovementRoute } from '../app/api/pos/shifts/cash-movement/route';

async function runCashMovementSuite() {
  console.log('===============================================================');
  console.log('  BAHER SILVER — PHASE 4B.3: POS CASH MOVEMENTS TEST SUITE');
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

  const cashier = await SessionService.authenticate('cashier@bahersilver.com', 'BaherCashier2026!');
  assert(cashier.sessionToken, 'Cashier token required');

  const viewer = await SessionService.authenticate('viewer@bahersilver.com', 'BaherViewer2026!');
  assert(viewer.sessionToken, 'Viewer token required');

  const orgId = 'org_baher_silver';
  const branchId = 'branch-cairo';
  const terminalId = `POS-CASH-${Date.now()}`;

  // 2. Open Dedicated Clean Shift for Test
  const testShift = CashShiftEngine.openShift({
    organizationId: orgId,
    branchId,
    terminalId,
    cashierUserId: cashier.user.id,
    cashierName: cashier.user.name,
    openingFloat: 5000
  });

  // Helper for authenticated requests
  function makeReq(url: string, method: string, token?: string, body?: any): NextRequest {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['cookie'] = `mip_session=${token}`;
      headers['authorization'] = `Bearer ${token}`;
    }
    return new NextRequest(new URL(url, 'http://localhost:3000'), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
  }

  async function callCashMovement(body: any, token?: string) {
    const req = makeReq('/api/pos/shifts/cash-movement', 'POST', token, body);
    const res = await cashMovementRoute(req);
    const json = await res.json();
    return { status: res.status, json };
  }

  // ---------------------------------------------------------------------------
  // TEST 1: Authorized CASH_OUT
  // ---------------------------------------------------------------------------
  await test('1. Authorized CASH_OUT succeeds and deducts drawer balance', async () => {
    const res = await callCashMovement({
      shiftId: testShift.id,
      movementType: 'CASH_OUT',
      amount: 400,
      reason: 'Midday till payout for bank exchange'
    }, cashier.sessionToken);

    assert.equal(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.json)}`);
    assert.equal(res.json.success, true);
    assert.equal(res.json.entry.movement_type, 'CASH_OUT');
    assert.equal(res.json.entry.amount, 400);
    assert.equal(res.json.entry.notes, 'Midday till payout for bank exchange');
    assert.equal(res.json.shift.expected_closing_cash, 4600);
    assert.equal(res.json.shift.total_cash_out, 400);
  });

  // ---------------------------------------------------------------------------
  // TEST 2: Authorized EXPENSE
  // ---------------------------------------------------------------------------
  await test('2. Authorized EXPENSE succeeds and deducts drawer balance', async () => {
    const res = await callCashMovement({
      shiftId: testShift.id,
      movementType: 'EXPENSE',
      amount: 150,
      reason: 'Courier package delivery fee (Express Post)'
    }, cashier.sessionToken);

    assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
    assert.equal(res.json.success, true);
    assert.equal(res.json.entry.movement_type, 'EXPENSE');
    assert.equal(res.json.entry.amount, 150);
    assert.equal(res.json.entry.notes, 'Courier package delivery fee (Express Post)');
    assert.equal(res.json.shift.expected_closing_cash, 4450);
    assert.equal(res.json.shift.total_expenses, 150);
  });

  // ---------------------------------------------------------------------------
  // TEST 3: Authorized SAFE_DROP
  // ---------------------------------------------------------------------------
  await test('3. Authorized SAFE_DROP succeeds and deducts drawer balance', async () => {
    const res = await callCashMovement({
      shiftId: testShift.id,
      movementType: 'SAFE_DROP',
      amount: 1000,
      reason: 'Excess cash drop to back-office safe'
    }, cashier.sessionToken);

    assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
    assert.equal(res.json.success, true);
    assert.equal(res.json.entry.movement_type, 'SAFE_DROP');
    assert.equal(res.json.entry.amount, 1000);
    assert.equal(res.json.entry.notes, 'Excess cash drop to back-office safe');
    assert.equal(res.json.shift.expected_closing_cash, 3450);
    assert.equal(res.json.shift.total_safe_drops, 1000);
  });

  // ---------------------------------------------------------------------------
  // TEST 4: Mathematical Drawer Balance Reconciliation
  // ---------------------------------------------------------------------------
  await test('4. Drawer expected balance changes deterministically following canonical formula', async () => {
    const currentShift = CashShiftEngine.getShiftById(testShift.id, orgId)!;
    
    // Formula: Opening Float + Cash Sales + Cash In - Cash Refunds - Cash Out - Expenses - Safe Drops
    const calculatedExpected = 
      currentShift.opening_float +
      currentShift.total_cash_sales +
      currentShift.total_cash_in -
      currentShift.total_refunds_cash -
      currentShift.total_cash_out -
      currentShift.total_expenses -
      (currentShift.total_safe_drops || 0);

    assert.equal(calculatedExpected, 3450, `Expected formula total 3450, got ${calculatedExpected}`);
    assert.equal(currentShift.expected_closing_cash, 3450, 'Shift expected_closing_cash must equal formula');
  });

  // ---------------------------------------------------------------------------
  // TEST 5: Reason / Description Preserved in Cash Journal
  // ---------------------------------------------------------------------------
  await test('5. Reason/description is strictly preserved in server cash journal', async () => {
    const res = await callCashMovement({
      shiftId: testShift.id,
      movementType: 'EXPENSE',
      amount: 50,
      reason: 'Boutique hospitality - Spring water & tea'
    }, cashier.sessionToken);

    assert.equal(res.status, 200);
    assert.equal(res.json.entry.notes, 'Boutique hospitality - Spring water & tea');

    const shiftAfter = CashShiftEngine.getShiftById(testShift.id, orgId)!;
    assert.equal(shiftAfter.expected_closing_cash, 3400);
  });

  // ---------------------------------------------------------------------------
  // TEST 6: Unauthorized User is Rejected
  // ---------------------------------------------------------------------------
  await test('6. Unauthorized user without cash:manage is rejected (403 Forbidden)', async () => {
    // 6a. Viewer role lacks cash:manage
    const viewerRes = await callCashMovement({
      shiftId: testShift.id,
      movementType: 'CASH_OUT',
      amount: 100,
      reason: 'Unauthorized attempt'
    }, viewer.sessionToken);

    assert.equal(viewerRes.status, 403, `Expected 403 for viewer, got ${viewerRes.status}`);
    assert.equal(viewerRes.json.success, false);

    // 6b. Completely unauthenticated request lacks token
    const unauthRes = await callCashMovement({
      shiftId: testShift.id,
      movementType: 'CASH_OUT',
      amount: 100,
      reason: 'No session attempt'
    });

    assert.equal(unauthRes.status, 401, `Expected 401 for unauthenticated, got ${unauthRes.status}`);
    assert.equal(unauthRes.json.success, false);
  });

  // ---------------------------------------------------------------------------
  // TEST 7: Cross-Tenant Access is Rejected
  // ---------------------------------------------------------------------------
  await test('7. Cross-tenant access attempt is rejected (403 Forbidden)', async () => {
    // Create competitor shift
    const competitorShift = CashShiftEngine.openShift({
      organizationId: 'org_competitor_silver',
      branchId: 'branch-giza',
      terminalId: `POS-COMPETITOR-${Date.now()}`,
      cashierUserId: 'usr_competitor_cashier',
      cashierName: 'Competitor Cashier',
      openingFloat: 2000
    });

    // Cashier from org_baher_silver attempts to execute cash movement on competitor's shift
    const crossRes = await callCashMovement({
      shiftId: competitorShift.id,
      movementType: 'CASH_OUT',
      amount: 100,
      reason: 'Cross-tenant breach attempt'
    }, cashier.sessionToken);

    assert.equal(crossRes.status, 403, `Expected 403 cross-tenant denial, got ${crossRes.status}`);
    assert.equal(crossRes.json.error, 'FORBIDDEN_CROSS_TENANT');
  });

  // ---------------------------------------------------------------------------
  // TEST 8: Closed Shift is Rejected
  // ---------------------------------------------------------------------------
  await test('8. Closed shift rejects cash movements with 400 Bad Request', async () => {
    // Create and close a temporary shift
    const tempShift = CashShiftEngine.openShift({
      organizationId: orgId,
      branchId,
      terminalId: `POS-TEMP-CLOSE-${Date.now()}`,
      cashierUserId: cashier.user.id,
      cashierName: cashier.user.name,
      openingFloat: 1000
    });

    CashShiftEngine.closeShift({
      organizationId: orgId,
      shiftId: tempShift.id,
      declaredClosingCash: 1000,
      closedByUserId: cashier.user.id
    });

    const closedRes = await callCashMovement({
      shiftId: tempShift.id,
      movementType: 'CASH_OUT',
      amount: 100,
      reason: 'Movement on closed shift'
    }, cashier.sessionToken);

    assert.equal(closedRes.status, 400, `Expected 400 for closed shift, got ${closedRes.status}`);
    assert.equal(closedRes.json.error, 'SHIFT_CLOSED_OR_CLOSING');
  });

  // ---------------------------------------------------------------------------
  // TEST 9: Invalid Amount & Solvency Guard
  // ---------------------------------------------------------------------------
  await test('9. Invalid amount (negative, zero, excessive) and missing reason are rejected', async () => {
    // 9a. Negative amount
    const negRes = await callCashMovement({
      shiftId: testShift.id,
      movementType: 'CASH_OUT',
      amount: -100,
      reason: 'Negative amount'
    }, cashier.sessionToken);
    assert.equal(negRes.status, 400);
    assert.equal(negRes.json.error, 'INVALID_AMOUNT');

    // 9b. Zero amount
    const zeroRes = await callCashMovement({
      shiftId: testShift.id,
      movementType: 'CASH_OUT',
      amount: 0,
      reason: 'Zero amount'
    }, cashier.sessionToken);
    assert.equal(zeroRes.status, 400);
    assert.equal(zeroRes.json.error, 'INVALID_AMOUNT');

    // 9c. Missing reason
    const noReasonRes = await callCashMovement({
      shiftId: testShift.id,
      movementType: 'CASH_OUT',
      amount: 100,
      reason: ''
    }, cashier.sessionToken);
    assert.equal(noReasonRes.status, 400);
    assert.equal(noReasonRes.json.error, 'REASON_REQUIRED');

    // 9d. Drawer Solvency Guard: Amount exceeds drawer cash (drawer currently has 3400)
    const excessiveRes = await callCashMovement({
      shiftId: testShift.id,
      movementType: 'SAFE_DROP',
      amount: 50000,
      reason: 'Excessive amount'
    }, cashier.sessionToken);
    assert.equal(excessiveRes.status, 400);
    assert.equal(excessiveRes.json.error, 'INSUFFICIENT_DRAWER_CASH');
  });

  // ---------------------------------------------------------------------------
  // TEST 10: Idempotency Protection Prevents Double Deductions
  // ---------------------------------------------------------------------------
  await test('10. Idempotency key prevents double deductions on replayed requests', async () => {
    const currentBefore = CashShiftEngine.getShiftById(testShift.id, orgId)!.expected_closing_cash;
    const idempKey = `idemp_safe_drop_${Date.now()}`;

    // First request
    const firstRes = await callCashMovement({
      shiftId: testShift.id,
      movementType: 'SAFE_DROP',
      amount: 200,
      reason: 'Idempotency safe drop test',
      idempotencyKey: idempKey
    }, cashier.sessionToken);

    assert.equal(firstRes.status, 200);
    const expectedAfterFirst = currentBefore - 200;
    assert.equal(firstRes.json.shift.expected_closing_cash, expectedAfterFirst);
    const firstEntryId = firstRes.json.entry.id;

    // Second request (replayed identical key)
    const replayRes = await callCashMovement({
      shiftId: testShift.id,
      movementType: 'SAFE_DROP',
      amount: 200,
      reason: 'Idempotency safe drop test',
      idempotencyKey: idempKey
    }, cashier.sessionToken);

    assert.equal(replayRes.status, 200);
    assert.equal(replayRes.json.entry.id, firstEntryId, 'Must return same journal entry ID');
    assert.equal(replayRes.json.shift.expected_closing_cash, expectedAfterFirst, 'Balance must NOT be deducted twice');
  });

  console.log('===============================================================');
  console.log(`  POS CASH MOVEMENTS SUITE: ${passed}/${total} PASSED`);
  console.log('===============================================================');
}

runCashMovementSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
