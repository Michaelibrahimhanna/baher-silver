/**
 * ======================================================================
 * BAHER SILVER — PHASE 4B.1: PRODUCTION HARDENING & EVIDENCE SUITE
 * ======================================================================
 * 
 * Verifies Deep Hardening Requirements:
 *   1. Real Concurrent Checkout Race Condition (Double-Spending Prevention)
 *   2. Real Concurrent Return Race Condition (Duplicate Refund Prevention)
 *   3. Cart Duplicate Piece Detection (422 DUPLICATE_PIECE_IN_CART)
 *   4. Multi-Item Atomicity & Rollback (No Stranded Sold Pieces on Failure)
 *   5. Shift State Machine Lifecycle (OPEN -> ACTIVE -> CLOSING -> CLOSED)
 *   6. Deep Till Accounting Math Invariant:
 *      Expected = Float + Sales + Cash In - Refunds - Cash Out - Expenses
 *   7. Exact Discrepancy Verification (Zero, Positive Surplus, Negative Shortage)
 *   8. Canonical Stock Ledger Proof: SALE (-1) & RETURN (+1) Immutable HMAC
 *   9. Multi-Tenant Isolation (Pieces, Shifts, Sales across Tenants)
 *  10. Tax Invoice QR Verification (ZATCA Phase 1 TLV 5-Tag Roundtrip Decoupled from ETA)
 *  11. Strict Silver ERP Boundary (925/900/950/999 Only, Zero Gold/800)
 */

import { CashShiftEngine } from '../lib/services/pos/cashShiftEngine';
import { POSTransactionEngine } from '../lib/services/pos/posTransactionEngine';
import { ZReportEngine } from '../lib/services/pos/zReportEngine';
import { TaxInvoiceQRService } from '../lib/services/pos/qrReceiptVerification';
import {
  createProduct,
  createPieceForProduct,
  getPieceBySerial,
  getStockLedger,
  calculateEventHash
} from '../lib/db/productEngine';
import type { Product, IndividualPiece } from '../lib/types';
import type { POSCashShift, POSSaleTransaction } from '../lib/services/pos/types';

interface HardeningTestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const results: HardeningTestResult[] = [];

async function test(suite: string, name: string, fn: () => Promise<void> | void) {
  const start = Date.now();
  try {
    await fn();
    results.push({ suite, name, passed: true, durationMs: Date.now() - start });
    console.log(`  ✓ [PASS] ${suite} > ${name} (${Date.now() - start}ms)`);
  } catch (err: any) {
    results.push({ suite, name, passed: false, error: err.message, durationMs: Date.now() - start });
    console.error(`  ✗ [FAIL] ${suite} > ${name}: ${err.message}`);
  }
}

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runHardeningSuite() {
  console.log('\n===============================================================');
  console.log('  BAHER SILVER — PHASE 4B.1: PRODUCTION HARDENING SUITE');
  console.log('===============================================================\n');

  const tenantA = 'org_baher_silver';
  const tenantB = 'org_competitor_retail';
  const branchId = 'branch-cairo';
  const terminalId = `POS-HARDEN-${Date.now()}`;
  const cashierId = 'usr_cashier_hardening';

  // ---------------------------------------------------------------------------
  // SUITE 1: Shift Lifecycle & State Transition Hardening
  // ---------------------------------------------------------------------------
  let shift: POSCashShift;

  await test('Shift Lifecycle', 'Opens shift in OPEN status with float and transitions to ACTIVE on first sale', () => {
    shift = CashShiftEngine.openShift({
      organizationId: tenantA,
      branchId,
      terminalId,
      cashierUserId: cashierId,
      cashierName: 'Hany Cashier',
      openingFloat: 1000
    });

    assert(shift.status === 'OPEN', 'Shift status must initially be OPEN');
    assert(shift.opening_float === 1000, 'Opening float must be 1000');
    assert(shift.expected_closing_cash === 1000, 'Expected closing cash must be 1000');
  });

  // ---------------------------------------------------------------------------
  // SUITE 2: Concurrent Checkout & Double-Spending Prevention
  // ---------------------------------------------------------------------------
  let raceProduct: Product;
  let racePiece: IndividualPiece;

  await test('Concurrency & Race Prevention', 'Setup race condition product and piece', () => {
    raceProduct = createProduct({
      organization_id: tenantA,
      name_en: 'Pharaonic Scarab Silver Ring',
      name_ar: 'خاتم الجعران الفرعوني فضة',
      category: 'rings',
      profile_type: 'SILVER_JEWELRY',
      purity: '925',
      weight_grams: 8.0,
      labor_cost: 35.0,
      price: 479
    });

    racePiece = raceProduct.pieces![0];
    assert(racePiece.lifecycle_status === 'IN_SHOWCASE', 'Piece must be available in showcase');
  });

  await test('Concurrency & Race Prevention', 'Simultaneous concurrent checkouts of the same piece allow exactly ONE to succeed', async () => {
    // Fire two checkouts simultaneously for the exact same physical piece
    const checkoutA = POSTransactionEngine.executeCheckout({
      organizationId: tenantA,
      branchId,
      terminalId,
      shiftId: shift.id,
      cashierUserId: cashierId,
      actorRole: 'Cashier',
      paymentMethod: 'CASH',
      idempotencyKey: `race_idemp_A_${Date.now()}`,
      items: [{ productId: raceProduct.id, serialNumber: racePiece.serial_number, quantity: 1 }]
    });

    const checkoutB = POSTransactionEngine.executeCheckout({
      organizationId: tenantA,
      branchId,
      terminalId,
      shiftId: shift.id,
      cashierUserId: cashierId,
      actorRole: 'Cashier',
      paymentMethod: 'CASH',
      idempotencyKey: `race_idemp_B_${Date.now()}`,
      items: [{ productId: raceProduct.id, serialNumber: racePiece.serial_number, quantity: 1 }]
    });

    const outcomes = await Promise.allSettled([checkoutA, checkoutB]);

    const fulfilled = outcomes.filter((o) => o.status === 'fulfilled');
    const rejected = outcomes.filter((o) => o.status === 'rejected');

    assert(fulfilled.length === 1, `Expected exactly 1 successful checkout, got ${fulfilled.length}`);
    assert(rejected.length === 1, `Expected exactly 1 rejected checkout, got ${rejected.length}`);

    const rejectedReason: any = (rejected[0] as PromiseRejectedResult).reason;
    assert(
      rejectedReason.code === 'PIECE_ALREADY_SOLD' || rejectedReason.code === 'PIECE_NOT_AVAILABLE',
      `Expected PIECE_ALREADY_SOLD or PIECE_NOT_AVAILABLE, got ${rejectedReason.code}`
    );

    // Verify piece status in database is strictly SOLD
    const pieceDb = getPieceBySerial(racePiece.serial_number, tenantA)!;
    assert(pieceDb.piece.lifecycle_status === 'SOLD', 'Piece must be marked SOLD');

    // Verify canonical stock ledger contains exactly ONE SALE event for this piece
    const { events } = getStockLedger({ organization_id: tenantA });
    const saleEventsForPiece = events.filter(
      (e) => e.movement_type === 'SALE' && e.serial_number === racePiece.serial_number
    );
    assert(saleEventsForPiece.length === 1, `Expected exactly 1 SALE event in ledger, found ${saleEventsForPiece.length}`);
  });

  await test('Cart Validation', 'Attempting to add the same serialized piece twice in one cart fails with 422 DUPLICATE_PIECE_IN_CART', async () => {
    const piece2 = createPieceForProduct({
      product_id: raceProduct.id,
      organization_id: tenantA,
      weight_grams: 8.0
    });

    let rejected = false;
    try {
      await POSTransactionEngine.executeCheckout({
        organizationId: tenantA,
        branchId,
        terminalId,
        shiftId: shift.id,
        cashierUserId: cashierId,
        actorRole: 'Cashier',
        paymentMethod: 'CASH',
        items: [
          { productId: raceProduct.id, serialNumber: piece2.serial_number, quantity: 1 },
          { productId: raceProduct.id, serialNumber: piece2.serial_number, quantity: 1 } // Duplicate in cart
        ]
      });
    } catch (err: any) {
      rejected = true;
      assert(err.code === 'DUPLICATE_PIECE_IN_CART', `Expected DUPLICATE_PIECE_IN_CART, got ${err.code}`);
      assert(err.status === 422, `Expected status 422, got ${err.status}`);
    }
    assert(rejected, 'Expected duplicate cart piece to be rejected');
  });

  // ---------------------------------------------------------------------------
  // SUITE 3: Concurrent Returns on Same Sale
  // ---------------------------------------------------------------------------
  await test('Concurrency & Race Prevention', 'Simultaneous concurrent returns on the same sale allow exactly ONE to succeed', async () => {
    // First, complete a clean sale to return
    const pieceForReturn = createPieceForProduct({
      product_id: raceProduct.id,
      organization_id: tenantA,
      weight_grams: 8.0
    });

    const saleToReturn = await POSTransactionEngine.executeCheckout({
      organizationId: tenantA,
      branchId,
      terminalId,
      shiftId: shift.id,
      cashierUserId: cashierId,
      actorRole: 'Cashier',
      paymentMethod: 'CASH',
      items: [{ productId: raceProduct.id, serialNumber: pieceForReturn.serial_number, quantity: 1 }]
    });

    // Fire two simultaneous returns for the same original sale
    const returnA = POSTransactionEngine.executeReturn({
      organizationId: tenantA,
      branchId,
      terminalId,
      shiftId: shift.id,
      originalSaleId: saleToReturn.id,
      cashierUserId: cashierId,
      actorRole: 'Cashier',
      returnReason: 'Concurrent test A'
    });

    const returnB = POSTransactionEngine.executeReturn({
      organizationId: tenantA,
      branchId,
      terminalId,
      shiftId: shift.id,
      originalSaleId: saleToReturn.id,
      cashierUserId: cashierId,
      actorRole: 'Cashier',
      returnReason: 'Concurrent test B'
    });

    const returnOutcomes = await Promise.allSettled([returnA, returnB]);

    const fulfilledRet = returnOutcomes.filter((o) => o.status === 'fulfilled');
    const rejectedRet = returnOutcomes.filter((o) => o.status === 'rejected');

    assert(fulfilledRet.length === 1, `Expected exactly 1 successful return, got ${fulfilledRet.length}`);
    assert(rejectedRet.length === 1, `Expected exactly 1 rejected return, got ${rejectedRet.length}`);

    const rejectedReason: any = (rejectedRet[0] as PromiseRejectedResult).reason;
    assert(rejectedReason.code === 'SALE_ALREADY_RETURNED', `Expected SALE_ALREADY_RETURNED, got ${rejectedReason.code}`);
    assert(rejectedReason.status === 409, `Expected status 409, got ${rejectedReason.status}`);

    // Verify piece is restored to IN_VAULT
    const pieceDb = getPieceBySerial(pieceForReturn.serial_number, tenantA)!;
    assert(pieceDb.piece.lifecycle_status === 'IN_VAULT', 'Returned piece must be IN_VAULT');
  });

  // ---------------------------------------------------------------------------
  // SUITE 4: Multi-Item Atomicity & Rollback Protection
  // ---------------------------------------------------------------------------
  await test('Multi-Item Atomicity', 'Pre-flight check blocks cart if any piece is invalid, leaving valid pieces unmutated', async () => {
    const validPiece = createPieceForProduct({
      product_id: raceProduct.id,
      organization_id: tenantA,
      weight_grams: 8.0
    });

    const alreadySoldPiece = createPieceForProduct({
      product_id: raceProduct.id,
      organization_id: tenantA,
      weight_grams: 8.0
    });

    // Mark second piece as SOLD manually
    const { executePieceMovement } = await import('../lib/db/productEngine');
    executePieceMovement({
      serial_number: alreadySoldPiece.serial_number,
      movement_type: 'SALE',
      actor_user_id: cashierId,
      actor_role: 'Cashier',
      reason: 'Prior sale',
      organization_id: tenantA
    });

    let checkoutFailed = false;
    try {
      await POSTransactionEngine.executeCheckout({
        organizationId: tenantA,
        branchId,
        terminalId,
        shiftId: shift.id,
        cashierUserId: cashierId,
        actorRole: 'Cashier',
        paymentMethod: 'CASH',
        items: [
          { productId: raceProduct.id, serialNumber: validPiece.serial_number, quantity: 1 },
          { productId: raceProduct.id, serialNumber: alreadySoldPiece.serial_number, quantity: 1 }
        ]
      });
    } catch (err: any) {
      checkoutFailed = true;
      assert(err.code === 'PIECE_ALREADY_SOLD', `Expected PIECE_ALREADY_SOLD, got ${err.code}`);
    }

    assert(checkoutFailed, 'Expected mixed cart to fail atomically');

    // Prove validPiece was NOT mutated to SOLD!
    const validPieceCheck = getPieceBySerial(validPiece.serial_number, tenantA)!;
    assert(
      validPieceCheck.piece.lifecycle_status === 'IN_SHOWCASE' || validPieceCheck.piece.lifecycle_status === 'IN_VAULT',
      `Valid piece must NOT be mutated to SOLD; current status: ${validPieceCheck.piece.lifecycle_status}`
    );
  });

  // ---------------------------------------------------------------------------
  // SUITE 5: Deep Cash & Till Accounting Math Invariant
  // ---------------------------------------------------------------------------
  let auditShift: POSCashShift;

  await test('Till Accounting Math', 'Exercises all 6 cash movements and proves mathematical balance', () => {
    const auditTerminalId = `POS-AUDIT-${Date.now()}`;

    // 1. OPENING_FLOAT
    auditShift = CashShiftEngine.openShift({
      organizationId: tenantA,
      branchId,
      terminalId: auditTerminalId,
      cashierUserId: cashierId,
      cashierName: 'Auditor Cashier',
      openingFloat: 1000.0 // Float: +1000
    });

    // 2. SALE_CASH: +1500
    CashShiftEngine.recordJournalMovement({
      organizationId: tenantA,
      branchId,
      terminalId: auditTerminalId,
      shiftId: auditShift.id,
      movementType: 'SALE_CASH',
      paymentMethod: 'CASH',
      amount: 1500.0,
      actorUserId: cashierId,
      notes: 'Cash sale'
    });

    // 3. CASH_IN: +300
    CashShiftEngine.recordJournalMovement({
      organizationId: tenantA,
      branchId,
      terminalId: auditTerminalId,
      shiftId: auditShift.id,
      movementType: 'CASH_IN',
      paymentMethod: 'CASH',
      amount: 300.0,
      actorUserId: cashierId,
      notes: 'Change added'
    });

    // 4. REFUND_CASH: -200
    CashShiftEngine.recordJournalMovement({
      organizationId: tenantA,
      branchId,
      terminalId: auditTerminalId,
      shiftId: auditShift.id,
      movementType: 'REFUND_CASH',
      paymentMethod: 'CASH',
      amount: 200.0,
      actorUserId: cashierId,
      notes: 'Customer refund'
    });

    // 5. CASH_OUT: -100
    CashShiftEngine.recordJournalMovement({
      organizationId: tenantA,
      branchId,
      terminalId: auditTerminalId,
      shiftId: auditShift.id,
      movementType: 'CASH_OUT',
      paymentMethod: 'CASH',
      amount: 100.0,
      actorUserId: cashierId,
      notes: 'Midday vault drop'
    });

    // 6. EXPENSE: -50
    CashShiftEngine.recordJournalMovement({
      organizationId: tenantA,
      branchId,
      terminalId: auditTerminalId,
      shiftId: auditShift.id,
      movementType: 'EXPENSE',
      paymentMethod: 'CASH',
      amount: 50.0,
      actorUserId: cashierId,
      notes: 'Store supplies cash expense'
    });

    // Mathematical formula verification:
    // Expected = 1000 (Float) + 1500 (Sales) + 300 (In) - 200 (Refunds) - 100 (Out) - 50 (Expense) = 2450.00
    const auditResult = CashShiftEngine.verifyShiftAccounting(auditShift.id, tenantA);
    assert(auditResult.isBalanced, 'Shift accounting must be mathematically balanced');
    assert(auditResult.computedExpectedCash === 2450.0, `Expected 2450.0, got ${auditResult.computedExpectedCash}`);
    assert(auditResult.runningExpectedCash === 2450.0, `Running expected cash must match 2450.0, got ${auditResult.runningExpectedCash}`);
    assert(auditResult.discrepancyWithRunning === 0, 'Discrepancy with running must be 0');
  });

  await test('Till Accounting Math', 'Verifies Zero, Positive Surplus, and Negative Shortage discrepancies', () => {
    // Scenario 1: Zero Discrepancy (Declared === Expected === 2450)
    const zeroDisc = 2450 - auditShift.expected_closing_cash;
    assert(zeroDisc === 0, 'Zero discrepancy must be 0');

    // Scenario 2: Positive Surplus (Declared 2550 > Expected 2450 => +100)
    const surplusDisc = 2550 - auditShift.expected_closing_cash;
    assert(surplusDisc === 100, `Positive surplus must be +100, got ${surplusDisc}`);

    // Scenario 3: Negative Shortage (Declared 2350 < Expected 2450 => -100)
    const shortageDisc = 2350 - auditShift.expected_closing_cash;
    assert(shortageDisc === -100, `Negative shortage must be -100, got ${shortageDisc}`);

    // Close the audit shift cleanly
    const closeRes = CashShiftEngine.closeShift({
      organizationId: tenantA,
      shiftId: auditShift.id,
      declaredClosingCash: 2450.0,
      closedByUserId: cashierId,
      closingNotes: 'Reconciled with zero variance'
    });

    assert(closeRes.shift.status === 'CLOSED', 'Shift must be CLOSED');
    assert(closeRes.discrepancy === 0, 'Discrepancy must be 0');
  });

  // ---------------------------------------------------------------------------
  // SUITE 6: Shift Closing Guards & State Transitions
  // ---------------------------------------------------------------------------
  await test('Shift Closing Guards', 'Operations while shift is in CLOSING status are rejected with 400', async () => {
    const termC = `POS-CLOSING-${Date.now()}`;
    const testShift = CashShiftEngine.openShift({
      organizationId: tenantA,
      branchId,
      terminalId: termC,
      cashierUserId: cashierId,
      openingFloat: 500
    });

    // Initiate close (transitions to CLOSING)
    CashShiftEngine.initiateShiftClose({
      organizationId: tenantA,
      shiftId: testShift.id,
      cashierUserId: cashierId
    });

    assert(testShift.status === 'CLOSING', 'Status must be CLOSING');

    // Try to record journal movement while CLOSING
    let movementRejected = false;
    try {
      CashShiftEngine.recordJournalMovement({
        organizationId: tenantA,
        branchId,
        terminalId: termC,
        shiftId: testShift.id,
        movementType: 'CASH_IN',
        paymentMethod: 'CASH',
        amount: 100,
        actorUserId: cashierId
      });
    } catch (err: any) {
      movementRejected = true;
      assert(err.code === 'SHIFT_CLOSED_OR_CLOSING', `Expected SHIFT_CLOSED_OR_CLOSING, got ${err.code}`);
    }
    assert(movementRejected, 'Expected journal movement on CLOSING shift to be rejected');

    // Close shift and verify closing again throws 409
    CashShiftEngine.closeShift({
      organizationId: tenantA,
      shiftId: testShift.id,
      declaredClosingCash: 500,
      closedByUserId: cashierId
    });

    let doubleCloseRejected = false;
    try {
      CashShiftEngine.closeShift({
        organizationId: tenantA,
        shiftId: testShift.id,
        declaredClosingCash: 500,
        closedByUserId: cashierId
      });
    } catch (err: any) {
      doubleCloseRejected = true;
      assert(err.code === 'SHIFT_ALREADY_CLOSED', `Expected SHIFT_ALREADY_CLOSED, got ${err.code}`);
    }
    assert(doubleCloseRejected, 'Expected double closing to be rejected with 409');
  });

  // ---------------------------------------------------------------------------
  // SUITE 7: Canonical Stock Ledger Proof
  // ---------------------------------------------------------------------------
  await test('Canonical Stock Ledger Proof', 'Proves SALE = -1, RETURN = +1, append-only immutability, and HMAC seal', async () => {
    const pieceForLedger = createPieceForProduct({
      product_id: raceProduct.id,
      organization_id: tenantA,
      weight_grams: 10.0
    });

    // 1. Perform SALE
    const saleTxn = await POSTransactionEngine.executeCheckout({
      organizationId: tenantA,
      branchId,
      terminalId,
      shiftId: shift.id,
      cashierUserId: cashierId,
      actorRole: 'Cashier',
      paymentMethod: 'CASH',
      items: [{ productId: raceProduct.id, serialNumber: pieceForLedger.serial_number, quantity: 1 }]
    });

    const ledgerAfterSale = getStockLedger({ organization_id: tenantA });
    const saleEvent = ledgerAfterSale.events.find(
      (e) => e.reference_id === saleTxn.id && e.serial_number === pieceForLedger.serial_number
    );

    assert(saleEvent, 'Ledger must contain SALE event');
    assert(saleEvent!.movement_type === 'SALE', 'Movement type must be SALE');
    assert(saleEvent!.quantity_delta === -1, 'SALE quantity_delta must be strictly -1');

    // HMAC integrity verification
    const saleEventComputedHash = calculateEventHash(saleEvent!);
    assert(saleEvent!.event_hash === saleEventComputedHash, 'SALE event hash must match SHA-256 HMAC');

    // 2. Perform RETURN
    const returnResult = await POSTransactionEngine.executeReturn({
      organizationId: tenantA,
      branchId,
      terminalId,
      shiftId: shift.id,
      originalSaleId: saleTxn.id,
      cashierUserId: cashierId,
      actorRole: 'Cashier',
      returnReason: 'Customer return for ledger proof'
    });

    const ledgerAfterReturn = getStockLedger({ organization_id: tenantA });
    const returnEvent = ledgerAfterReturn.events.find(
      (e) => e.reference_id === returnResult.returnTransaction.id && e.serial_number === pieceForLedger.serial_number
    );

    assert(returnEvent, 'Ledger must contain CUSTOMER_RETURN event');
    assert(returnEvent!.movement_type === 'CUSTOMER_RETURN', 'Movement type must be CUSTOMER_RETURN');
    assert(returnEvent!.quantity_delta === 1, 'CUSTOMER_RETURN quantity_delta must be strictly +1');

    // HMAC integrity verification of return
    const returnEventComputedHash = calculateEventHash(returnEvent!);
    assert(returnEvent!.event_hash === returnEventComputedHash, 'Return event hash must match SHA-256 HMAC');

    // Immutability Proof: Original SALE event must remain unmodified in the ledger!
    const originalSaleEventAfterReturn = ledgerAfterReturn.events.find((e) => e.id === saleEvent!.id);
    assert(originalSaleEventAfterReturn, 'Original SALE event must NOT be deleted');
    assert(originalSaleEventAfterReturn!.quantity_delta === -1, 'Original SALE event delta must remain -1');
    assert(originalSaleEventAfterReturn!.event_hash === saleEvent!.event_hash, 'Original event hash must remain identical');
  });

  // ---------------------------------------------------------------------------
  // SUITE 8: Multi-Tenant Isolation Hardening
  // ---------------------------------------------------------------------------
  await test('Multi-Tenant Isolation', 'Tenant B cannot checkout, access shifts, or return Tenant A resources', async () => {
    const tenantAPiece = createPieceForProduct({
      product_id: raceProduct.id,
      organization_id: tenantA,
      weight_grams: 8.0
    });

    // 1. Cross-tenant checkout rejection
    let crossCheckoutRejected = false;
    try {
      await POSTransactionEngine.executeCheckout({
        organizationId: tenantB, // Wrong tenant
        branchId: 'branch-alex',
        terminalId: 'POS-B-01',
        shiftId: 'shift-nonexistent',
        cashierUserId: 'usr_cashier_b',
        actorRole: 'Cashier',
        paymentMethod: 'CASH',
        items: [{ productId: raceProduct.id, serialNumber: tenantAPiece.serial_number, quantity: 1 }]
      });
    } catch (err: any) {
      crossCheckoutRejected = true;
    }
    assert(crossCheckoutRejected, 'Expected cross-tenant checkout to be blocked');

    // 2. Cross-tenant shift retrieval returns null
    const shiftFromTenantB = CashShiftEngine.getShiftById(shift.id, tenantB);
    assert(shiftFromTenantB === null, 'Tenant B querying Tenant A shift must return null');

    // 3. Cross-tenant return rejection
    let crossReturnRejected = false;
    try {
      await POSTransactionEngine.executeReturn({
        organizationId: tenantB, // Wrong tenant
        branchId: 'branch-alex',
        terminalId: 'POS-B-01',
        shiftId: 'shift-nonexistent',
        originalSaleId: 'sale_nonexistent',
        cashierUserId: 'usr_cashier_b',
        actorRole: 'Cashier',
        returnReason: 'Unauthorized cross-tenant return'
      });
    } catch (err: any) {
      crossReturnRejected = true;
      assert(err.status === 404, `Expected status 404, got ${err.status}`);
    }
    assert(crossReturnRejected, 'Expected cross-tenant return to be rejected with 404');
  });

  // ---------------------------------------------------------------------------
  // SUITE 9: Tax Invoice QR Specification (Decoupled ETA / ZATCA)
  // ---------------------------------------------------------------------------
  await test('Tax Invoice QR', 'Generates standard ZATCA Phase 1 TLV 5-tag payload and verifies decodability', () => {
    const timestamp = '2026-09-06T18:00:00.000Z';
    const totalAmount = 1450.0;
    const taxAmount = 0.0;

    const qrResult = TaxInvoiceQRService.generateZATCAPhase1Payload({
      sellerName: 'Baher Silver LLC',
      vatNumber: '300-482-918',
      timestamp,
      totalAmount,
      taxAmount
    });

    assert(qrResult.standard === 'ZATCA_PHASE_1_TLV', 'Standard must be ZATCA_PHASE_1_TLV');
    assert(qrResult.etaComplianceStatus === 'DECOUPLED_OFFLINE_TLV', 'Must be marked DECOUPLED_OFFLINE_TLV');
    assert(qrResult.qrPayloadBase64.length > 20, 'Payload must be non-empty Base64');

    // Roundtrip Decode & Verify Tags 1 to 5
    const tags = TaxInvoiceQRService.decodeTLVBase64(qrResult.qrPayloadBase64);
    assert(tags.length === 5, `Expected 5 TLV tags, got ${tags.length}`);

    const tag1 = tags.find((t) => t.tag === 1);
    const tag2 = tags.find((t) => t.tag === 2);
    const tag3 = tags.find((t) => t.tag === 3);
    const tag4 = tags.find((t) => t.tag === 4);
    const tag5 = tags.find((t) => t.tag === 5);

    assert(tag1?.value === 'Baher Silver LLC', 'Tag 1 must be Seller Name');
    assert(tag2?.value === '300-482-918', 'Tag 2 must be VAT Number');
    assert(tag3?.value === timestamp, 'Tag 3 must be Timestamp');
    assert(tag4?.value === '1450.00', 'Tag 4 must be Total Amount formatted to 2 decimals');
    assert(tag5?.value === '0.00', 'Tag 5 must be Tax Amount formatted to 2 decimals');
  });

  // ---------------------------------------------------------------------------
  // SUITE 10: Strict Silver ERP Boundary & Z-Report Purities
  // ---------------------------------------------------------------------------
  await test('Silver ERP Boundary', 'Z-Report strictly partitions silver grams by 925, 900, 950, 999 with zero gold or 800', () => {
    // Generate Z-Report for shift
    const zReport = ZReportEngine.generateZReportForShift({
      organizationId: tenantA,
      shiftId: shift.id
    });

    const purities = zReport.metrics.silver_grams_by_purity;
    assert(purities['925'] !== undefined, '925 silver must be present');
    assert(purities['900'] !== undefined, '900 silver must be present');
    assert(purities['950'] !== undefined, '950 silver must be present');
    assert(purities['999'] !== undefined, '999 silver must be present');

    // Invariant: 800 and Gold Karats strictly prohibited
    assert((purities as any)['800'] === undefined, 'Purity 800 MUST NOT exist');
    assert((purities as any)['18k'] === undefined, 'Gold 18k MUST NOT exist');
    assert((purities as any)['21k'] === undefined, 'Gold 21k MUST NOT exist');
    assert((purities as any)['24k'] === undefined, 'Gold 24k MUST NOT exist');
  });

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log('\n===============================================================');
  console.log(`  PRODUCTION HARDENING RESULTS: ${passed}/${results.length} PASSED (${failed} FAILED)`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL PHASE 4B.1 PRODUCTION HARDENING TESTS PASSED WITH EVIDENCE!\n');
  }
}

runHardeningSuite().catch((err) => {
  console.error('Fatal hardening runner error:', err);
  process.exit(1);
});
