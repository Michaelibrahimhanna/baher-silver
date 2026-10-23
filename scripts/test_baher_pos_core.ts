/**
 * ======================================================================
 * BAHER SILVER — PHASE 4B.1: CORE RETAIL TRANSACTIONS & CASH TILL SUITE
 * ======================================================================
 * 
 * Verifies:
 *   1. Cash Shift & Till Lifecycle (OPEN -> ACTIVE -> CLOSED, Float, Solvency)
 *   2. Server-Authoritative Checkout across Dual Profiles (Silver vs Retail)
 *   3. Concurrency Safety & Piece Exclusivity (No Double-Selling of Serialized Pieces)
 *   4. Persistence-Level Idempotency Protection
 *   5. Non-Destructive Compensating Returns & Drawer Solvency Checks
 *   6. Deterministic Daily Z-Report (925/900/950/999 Silver Purities vs Retail)
 *   7. Strict Silver-Only Manufacturing Invariant Preservation
 */

import { CashShiftEngine } from '../lib/services/pos/cashShiftEngine';
import { POSTransactionEngine } from '../lib/services/pos/posTransactionEngine';
import { ZReportEngine } from '../lib/services/pos/zReportEngine';
import {
  createProduct,
  createPieceForProduct,
  getPieceBySerial,
  getStockLedger,
  calculateEventHash
} from '../lib/db/productEngine';
import type { Product, IndividualPiece } from '../lib/types';
import type { POSCashShift, POSSaleTransaction } from '../lib/services/pos/types';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];

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

async function runPhase4B1Tests() {
  console.log('\n===============================================================');
  console.log('  BAHER SILVER — PHASE 4B.1: CORE TRANSACTIONS & TILL SUITE');
  console.log('===============================================================\n');

  const tenantId = 'org_baher_silver';
  const branchId = 'branch-cairo';
  const terminalId = `POS-TEST-${Date.now()}`;
  const cashierId = 'usr_cashier_test';

  // ---------------------------------------------------------------------------
  // SUITE 1: Cash Shift & Till Lifecycle
  // ---------------------------------------------------------------------------
  let shift: POSCashShift;

  await test('Till Lifecycle', 'Opens new cashier shift with opening float and records in journal', () => {
    shift = CashShiftEngine.openShift({
      organizationId: tenantId,
      branchId,
      terminalId,
      cashierUserId: cashierId,
      cashierName: 'Youssef Cashier',
      openingFloat: 2000
    });

    assert(shift.id, 'Shift must have an ID');
    assert(shift.status === 'OPEN', 'Initial status must be OPEN');
    assert(shift.opening_float === 2000, 'Opening float must be 2000');
    assert(shift.expected_closing_cash === 2000, 'Expected closing cash must initially equal float');

    const journal = CashShiftEngine.listJournalEntries(shift.id, tenantId);
    assert(journal.length === 1, 'Journal must contain opening float entry');
    assert(journal[0].movement_type === 'OPENING_FLOAT', 'Movement type must be OPENING_FLOAT');
    assert(journal[0].amount === 2000, 'Journal amount must be 2000');
  });

  await test('Till Lifecycle', 'Opening a second shift on same terminal while active is rejected with 409', () => {
    let rejected = false;
    try {
      CashShiftEngine.openShift({
        organizationId: tenantId,
        branchId,
        terminalId,
        cashierUserId: 'usr_another_cashier',
        openingFloat: 1000
      });
    } catch (err: any) {
      rejected = true;
      assert(err.code === 'ACTIVE_SHIFT_EXISTS', `Expected ACTIVE_SHIFT_EXISTS, got ${err.code}`);
      assert(err.status === 409, `Expected status 409, got ${err.status}`);
    }
    assert(rejected, 'Expected duplicate shift creation to be blocked');
  });

  await test('Till Lifecycle', 'Drawer solvency prevents payouts/refunds exceeding available cash', () => {
    let rejected = false;
    try {
      CashShiftEngine.atomicDeductCashDrawer({
        organizationId: tenantId,
        branchId,
        terminalId,
        shiftId: shift.id,
        amount: 2500, // Shift only has 2000
        movementType: 'REFUND_CASH',
        actorUserId: cashierId,
        notes: 'Excessive refund'
      });
    } catch (err: any) {
      rejected = true;
      assert(err.code === 'INSUFFICIENT_DRAWER_CASH', `Expected INSUFFICIENT_DRAWER_CASH, got ${err.code}`);
      assert(err.status === 400, `Expected status 400, got ${err.status}`);
    }
    assert(rejected, 'Expected insolvent drawer deduction to fail');
  });

  await test('Till Lifecycle', 'Cash in and cash out update expected drawer balance deterministically', () => {
    CashShiftEngine.recordJournalMovement({
      organizationId: tenantId,
      branchId,
      terminalId,
      shiftId: shift.id,
      movementType: 'CASH_IN',
      paymentMethod: 'CASH',
      amount: 500,
      actorUserId: cashierId,
      notes: 'Additional change from vault'
    });

    const updated = CashShiftEngine.getShiftById(shift.id, tenantId)!;
    assert(updated.expected_closing_cash === 2500, `Expected 2500, got ${updated.expected_closing_cash}`);
    assert(updated.total_cash_in === 500, 'Cash in total must match');
  });

  // ---------------------------------------------------------------------------
  // SUITE 2: Dual Profile Server-Authoritative Checkout
  // ---------------------------------------------------------------------------
  let silverProd: Product;
  let silverPiece: IndividualPiece;
  let retailProd: Product;
  let completedSale: POSSaleTransaction;

  await test('Checkout Engine', 'Setup test products: Serialized Silver Jewelry + Retail Merchandise', () => {
    silverProd = createProduct({
      organization_id: tenantId,
      name_en: 'Royal Lotus Silver Pendant',
      name_ar: 'دلاية زهرة اللوتس الملكية',
      category: 'necklaces',
      profile_type: 'SILVER_JEWELRY',
      purity: '925',
      weight_grams: 10.0,
      labor_cost: 40.0,
      price: 595
    });

    silverPiece = silverProd.pieces![0];
    assert(silverPiece.serial_number.includes('BHR-'), 'Serial must have BHR- prefix');
    assert(silverPiece.lifecycle_status === 'IN_SHOWCASE' || silverPiece.lifecycle_status === 'IN_VAULT', 'Must be available');

    retailProd = createProduct({
      organization_id: tenantId,
      name_en: 'Baher Velour Presentation Pouch',
      name_ar: 'جراب باهر قطيفة فاخر',
      category: 'packaging',
      profile_type: 'NON_SILVER_RETAIL',
      brand: 'Baher Packaging',
      price: 60.0
    });

    assert(retailProd.profile_type === 'NON_SILVER_RETAIL', 'Must be NON_SILVER_RETAIL');
    assert(retailProd.purity === undefined, 'Must not have purity');
  });

  await test('Checkout Engine', 'Executes atomic dual-profile sale with spot calculation and fixed price', async () => {
    completedSale = await POSTransactionEngine.executeCheckout({
      organizationId: tenantId,
      branchId,
      terminalId,
      shiftId: shift.id,
      cashierUserId: cashierId,
      cashierName: 'Youssef Cashier',
      actorRole: 'Cashier',
      customerName: 'Kareem Tarek',
      customerPhone: '01012345678',
      paymentMethod: 'CASH',
      idempotencyKey: `idemp_sale_01_${Date.now()}`,
      items: [
        {
          productId: silverProd.id,
          serialNumber: silverPiece.serial_number,
          quantity: 1,
          customWeightGrams: 10.0 // 10g @ 55.5 = 555 + 40 labor = 595 EGP
        },
        {
          productId: retailProd.id,
          quantity: 2 // 2 * 60 = 120 EGP
        }
      ]
    });

    assert(completedSale.id, 'Sale must have an ID');
    assert(completedSale.receipt_number.startsWith('REC-'), 'Receipt must start with REC-');
    assert(completedSale.status === 'COMPLETED', 'Status must be COMPLETED');

    // Expected total: 595 (silver) + 120 (retail) = 715 EGP
    assert(completedSale.total_amount === 715, `Expected 715 EGP, got ${completedSale.total_amount}`);
    assert(completedSale.total_silver_weight_grams === 10.0, 'Total silver weight must be 10g');
    assert(completedSale.cash_amount === 715, 'Cash amount must be 715');

    // Verify Canonical Piece Status Transition: IN_SHOWCASE -> SOLD
    const pieceInfo = getPieceBySerial(silverPiece.serial_number, tenantId);
    assert(pieceInfo!.piece.lifecycle_status === 'SOLD', `Piece status must be SOLD, got ${pieceInfo!.piece.lifecycle_status}`);

    // Verify Canonical Stock Ledger Entry
    const ledgerResult = getStockLedger({ organization_id: tenantId });
    const saleEvent = ledgerResult.events.find((e) => e.reference_id === completedSale.id && e.serial_number === silverPiece.serial_number);
    assert(saleEvent, 'Ledger must contain SALE event for piece');
    assert(saleEvent!.movement_type === 'SALE', 'Movement type must be SALE');
    assert(saleEvent!.quantity_delta === -1, 'Quantity delta must be -1');

    // Verify HMAC Integrity
    const computedHash = calculateEventHash(saleEvent!);
    assert(saleEvent!.event_hash === computedHash, 'Ledger HMAC integrity must match calculated hash');

    // Verify Cash Shift Updated
    const updatedShift = CashShiftEngine.getShiftById(shift.id, tenantId)!;
    assert(updatedShift.total_cash_sales === 715, `Expected 715 cash sales, got ${updatedShift.total_cash_sales}`);
    assert(updatedShift.expected_closing_cash === 3215, `Expected 3215 closing cash, got ${updatedShift.expected_closing_cash}`);

    // Verify ZATCA / ETA QR payload
    assert(completedSale.qr_payload_base64 && completedSale.qr_payload_base64.length > 20, 'Must have ETA QR payload');
  });

  // ---------------------------------------------------------------------------
  // SUITE 3: Concurrency Safety & Piece Exclusivity
  // ---------------------------------------------------------------------------
  await test('Piece Exclusivity', 'Attempting to sell an already SOLD piece fails with 422 PIECE_ALREADY_SOLD', async () => {
    let rejected = false;
    try {
      await POSTransactionEngine.executeCheckout({
        organizationId: tenantId,
        branchId,
        terminalId,
        shiftId: shift.id,
        cashierUserId: cashierId,
        actorRole: 'Cashier',
        paymentMethod: 'CASH',
        items: [
          {
            productId: silverProd.id,
            serialNumber: silverPiece.serial_number, // Already sold in previous test
            quantity: 1
          }
        ]
      });
    } catch (err: any) {
      rejected = true;
      assert(err.code === 'PIECE_ALREADY_SOLD', `Expected PIECE_ALREADY_SOLD, got ${err.code}`);
      assert(err.status === 422, `Expected status 422, got ${err.status}`);
    }
    assert(rejected, 'Expected second checkout of same piece to be blocked');
  });

  await test('Piece Exclusivity', 'Attempting to sell a RESERVED piece fails with 422 PIECE_RESERVED', async () => {
    // Create new piece and reserve it
    const newPiece = createPieceForProduct({
      product_id: silverProd.id,
      organization_id: tenantId,
      weight_grams: 8.0
    });

    const { executePieceMovement } = await import('../lib/db/productEngine');
    executePieceMovement({
      serial_number: newPiece.serial_number,
      movement_type: 'RESERVATION_HOLD',
      actor_user_id: cashierId,
      actor_role: 'Cashier',
      reason: 'Held for VIP reservation',
      organization_id: tenantId
    });

    let rejected = false;
    try {
      await POSTransactionEngine.executeCheckout({
        organizationId: tenantId,
        branchId,
        terminalId,
        shiftId: shift.id,
        cashierUserId: cashierId,
        actorRole: 'Cashier',
        paymentMethod: 'CASH',
        items: [
          {
            productId: silverProd.id,
            serialNumber: newPiece.serial_number,
            quantity: 1
          }
        ]
      });
    } catch (err: any) {
      rejected = true;
      assert(err.code === 'PIECE_RESERVED', `Expected PIECE_RESERVED, got ${err.code}`);
      assert(err.status === 422, `Expected status 422, got ${err.status}`);
    }
    assert(rejected, 'Expected sale of reserved piece to be blocked');
  });

  // ---------------------------------------------------------------------------
  // SUITE 4: Idempotency Protection
  // ---------------------------------------------------------------------------
  await test('Idempotency Protection', 'Duplicate checkout request with identical key returns cached transaction', async () => {
    const idempKey = `idemp_repeat_test_${Date.now()}`;
    const piece3 = createPieceForProduct({
      product_id: silverProd.id,
      organization_id: tenantId,
      weight_grams: 9.0
    });

    const txn1 = await POSTransactionEngine.executeCheckout({
      organizationId: tenantId,
      branchId,
      terminalId,
      shiftId: shift.id,
      cashierUserId: cashierId,
      actorRole: 'Cashier',
      paymentMethod: 'CASH',
      idempotencyKey: idempKey,
      items: [{ productId: silverProd.id, serialNumber: piece3.serial_number, quantity: 1 }]
    });

    const ledgerCountBefore = getStockLedger({ organization_id: tenantId }).events.length;

    const txn2 = await POSTransactionEngine.executeCheckout({
      organizationId: tenantId,
      branchId,
      terminalId,
      shiftId: shift.id,
      cashierUserId: cashierId,
      actorRole: 'Cashier',
      paymentMethod: 'CASH',
      idempotencyKey: idempKey,
      items: [{ productId: silverProd.id, serialNumber: piece3.serial_number, quantity: 1 }]
    });

    const ledgerCountAfter = getStockLedger({ organization_id: tenantId }).events.length;

    assert(txn1.id === txn2.id, 'Idempotent replay must return exact same transaction ID');
    assert(txn1.receipt_number === txn2.receipt_number, 'Receipt numbers must match');
    assert(ledgerCountBefore === ledgerCountAfter, 'Idempotent replay must NOT duplicate ledger events');
  });

  // ---------------------------------------------------------------------------
  // SUITE 5: Non-Destructive Compensating Returns
  // ---------------------------------------------------------------------------
  await test('Returns Engine', 'Processes non-destructive return, restocking piece and refunding cash', async () => {
    const returnResult = await POSTransactionEngine.executeReturn({
      organizationId: tenantId,
      branchId,
      terminalId,
      shiftId: shift.id,
      originalSaleId: completedSale.id,
      cashierUserId: cashierId,
      actorRole: 'Cashier',
      returnReason: 'Customer changed mind within 14 days'
    });

    assert(returnResult.returnTransaction.is_return, 'Must be marked as return');
    assert(returnResult.returnTransaction.receipt_number.startsWith('RET-'), 'Return receipt must start with RET-');
    assert(returnResult.returnTransaction.total_amount === -715, 'Return total must be negative 715 EGP');
    assert(returnResult.originalSale.status === 'RETURNED', 'Original sale status must be updated to RETURNED');

    // Verify Piece Restocked to VAULT
    const pieceInfo = getPieceBySerial(silverPiece.serial_number, tenantId);
    assert(pieceInfo!.piece.lifecycle_status === 'IN_VAULT', `Piece must be restored to IN_VAULT, got ${pieceInfo!.piece.lifecycle_status}`);

    // Verify Compensating Stock Ledger Event
    const ledgerResult = getStockLedger({ organization_id: tenantId });
    const returnEvent = ledgerResult.events.find((e) => e.reference_id === returnResult.returnTransaction.id && e.serial_number === silverPiece.serial_number);
    assert(returnEvent, 'Ledger must contain CUSTOMER_RETURN compensating event');
    assert(returnEvent!.movement_type === 'CUSTOMER_RETURN', 'Movement type must be CUSTOMER_RETURN');
    assert(returnEvent!.quantity_delta === 1, 'Quantity delta must be +1');

    // Verify Cash Refund Journal & Drawer Solvency
    const updatedShift = CashShiftEngine.getShiftById(shift.id, tenantId)!;
    assert(updatedShift.total_refunds_cash === 715, `Expected 715 in refunds, got ${updatedShift.total_refunds_cash}`);
    assert(updatedShift.expected_closing_cash === 3039.5, `Expected 3039.5 after refund, got ${updatedShift.expected_closing_cash}`);
  });

  await test('Returns Engine', 'Attempting duplicate return on already returned sale fails with 409', async () => {
    let rejected = false;
    try {
      await POSTransactionEngine.executeReturn({
        organizationId: tenantId,
        branchId,
        terminalId,
        shiftId: shift.id,
        originalSaleId: completedSale.id,
        cashierUserId: cashierId,
        actorRole: 'Cashier',
        returnReason: 'Duplicate attempt'
      });
    } catch (err: any) {
      rejected = true;
      assert(err.code === 'SALE_ALREADY_RETURNED', `Expected SALE_ALREADY_RETURNED, got ${err.code}`);
      assert(err.status === 409, `Expected status 409, got ${err.status}`);
    }
    assert(rejected, 'Expected duplicate return to be blocked');
  });

  // ---------------------------------------------------------------------------
  // SUITE 6: Deterministic Z-Report Generation & Shift Closing
  // ---------------------------------------------------------------------------
  await test('Z-Report Engine', 'Closes shift and generates deterministic Daily Z-Report with silver breakdown', () => {
    const currentShift = CashShiftEngine.getShiftById(shift.id, tenantId)!;
    const closeResult = CashShiftEngine.closeShift({
      organizationId: tenantId,
      shiftId: shift.id,
      declaredClosingCash: currentShift.expected_closing_cash,
      closedByUserId: cashierId,
      closingNotes: 'Shift reconciled cleanly with zero variance.'
    });

    assert(closeResult.shift.status === 'CLOSED', 'Shift status must be CLOSED');
    assert(closeResult.discrepancy === 0, 'Discrepancy must be 0');

    const zReport = ZReportEngine.generateZReportForShift({
      organizationId: tenantId,
      shiftId: shift.id
    });

    assert(zReport.report_number.startsWith('ZREP-'), 'Z-report must start with ZREP-');
    assert(zReport.financials.opening_float === 2000, 'Opening float must match');
    assert(zReport.financials.cash_sales > 0, 'Must record cash sales');
    assert(zReport.financials.cash_refunds === 715, 'Must record cash refunds');
    assert(zReport.financials.declared_closing_cash === currentShift.expected_closing_cash, 'Declared cash must match');
    assert(zReport.financials.cash_discrepancy === 0, 'Discrepancy must be 0');

    // Strict Silver Invariant Verification
    assert(zReport.metrics.silver_grams_by_purity['925'] !== undefined, 'Must support 925 silver');
    assert((zReport.metrics.silver_grams_by_purity as any)['800'] === undefined, 'Purity 800 MUST NOT exist in Z-Report');
    assert((zReport.metrics.silver_grams_by_purity as any)['18k'] === undefined, 'Gold karats MUST NOT exist in Z-Report');
  });

  // ---------------------------------------------------------------------------
  // SUITE 7: Strict Silver Manufacturing Invariant Boundary
  // ---------------------------------------------------------------------------
  await test('Manufacturing Boundary', 'POS retail sales cannot enter or trigger manufacturing orders', async () => {
    const { ProductionOrderPlanningService } = await import('../lib/services/erp/ProductionOrderPlanningService');

    let rejected = false;
    try {
      await ProductionOrderPlanningService.createDraftOrder({
        organization_id: tenantId,
        branch_id: branchId,
        warehouse_id: 'wh-cairo-main',
        product_id: retailProd.id, // Non-silver retail merchandise
        variant_id: 'var-retail-1',
        planned_quantity: 5,
        target_date: new Date().toISOString()
      });
    } catch (err: any) {
      rejected = true;
      assert(err.code === 'NON_SILVER_PRODUCT_CANNOT_BE_MANUFACTURED', `Expected NON_SILVER_PRODUCT_CANNOT_BE_MANUFACTURED, got ${err.code}`);
      assert(err.status === 422, `Expected status 422, got ${err.status}`);
    }
    assert(rejected, 'Expected non-silver retail merchandise to be barred from factory manufacturing');
  });

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log('\n===============================================================');
  console.log(`  PHASE 4B.1 TEST RESULTS: ${passed}/${results.length} PASSED (${failed} FAILED)`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL PHASE 4B.1 RETAIL TRANSACTION & TILL TESTS PASSED PERFECTLY!\n');
  }
}

runPhase4B1Tests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
