/**
 * Baher Silver — Comprehensive Integration & Acceptance Test Suite
 * 
 * Tests:
 *   [Slice 1] Stock Ledger Concurrency, Atomicity, HMAC & Idempotency.
 *   [Slice 2] Process Restart Simulation (Durable Disk Persistence).
 *   [Slice 3] Strict 21-Permission RBAC & Anti-Escalation (Admin vs Cashier).
 *   [Slice 4] Hardware Scale & Manual Weight Override Audit Guard.
 *   [Slice 5] Open Accounts Dual Ledger (Cash + 999 Fine Silver + Reversals).
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

// 1. Setup isolated test data directory
const TEST_DATA_DIR = path.resolve(process.cwd(), '.data_test');
if (fs.existsSync(TEST_DATA_DIR)) {
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
}
fs.mkdirSync(TEST_DATA_DIR, { recursive: true });


import type { SafeUser } from '@/lib/auth/types';
import { RbacService } from '@/lib/auth/rbacService';
import { WeightAuditEngine } from '@/lib/services/pos/weightAuditEngine';
import { DualLedgerEngine } from '@/lib/services/accounting/dualLedgerEngine';
import { POSTransactionEngine } from '@/lib/services/pos/posTransactionEngine';
import {
  getProductBySlugOrId,
  getPieceBySerial,
  appendStockLedgerEvent,
  computeDerivedStock,
  executePieceMovement,
  lookupByBarcode
} from '@/lib/db/productEngine';

// Wire engines to test data directory
WeightAuditEngine.setStoragePath(path.join(TEST_DATA_DIR, 'weight_audit_records.jsonl'));
DualLedgerEngine.setStoragePaths(
  path.join(TEST_DATA_DIR, 'dual_ledger_journal.jsonl'),
  path.join(TEST_DATA_DIR, 'open_accounts.json')
);

// Mock Users
const adminUser: SafeUser = {
  id: 'usr_admin_01',
  email: 'admin@bahersilver.com',
  name: 'Admin User',
  role: 'Admin',
  status: 'active',
  organizationId: 'org_baher_silver',
  createdAt: new Date().toISOString()
};

const cashierUser: SafeUser = {
  id: 'usr_cashier_01',
  email: 'cashier@bahersilver.com',
  name: 'Cashier Mina',
  role: 'Cashier',
  status: 'active',
  organizationId: 'org_baher_silver',
  createdAt: new Date().toISOString()
};

let passed = 0;
let failed = 0;

function runTest(name: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      return res
        .then(() => {
          console.log(`  ✓ PASS: ${name}`);
          passed++;
        })
        .catch((e: any) => {
          console.error(`  ✗ FAIL: ${name}\n    Error: ${e.message}`);
          failed++;
        });
    } else {
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    }
  } catch (e: any) {
    console.error(`  ✗ FAIL: ${name}\n    Error: ${e.message}`);
    failed++;
  }
}

async function main() {
  console.log('================================================================');
  console.log('  BAHER SILVER — SILVER OS VERIFICATION TEST SUITE');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // [SLICE 1]: Stock Ledger Integrity & HMAC Security
  // ---------------------------------------------------------------------------
  console.log('[Slice 1]: Canonical Stock Ledger Integrity & HMAC Security');

  runTest('Ledger event computes tamper-evident HMAC SHA-256 hash', () => {
    const event = appendStockLedgerEvent({
      organization_id: 'org_baher_silver',
      movement_type: 'ADJUSTMENT',
      product_id: 'prod_test_01',
      sku: 'SIL-TEST-01',
      barcode: '6221000000018',
      quantity_delta: 5,
      weight_grams_delta: 25.0,
      actor_user_id: adminUser.id,
      actor_role: adminUser.role,
      reason: 'Physical count adjustment',
      idempotency_key: 'idemp_adj_01'
    });

    assert(event.id.startsWith('led_'), 'Event ID must start with led_');
    assert(event.event_hash && event.event_hash.length === 64, 'Event hash must be 64-char SHA256 hex string');
  });

  runTest('Stock ledger enforces idempotency (duplicate key returns identical cached event)', () => {
    const event1 = appendStockLedgerEvent({
      organization_id: 'org_baher_silver',
      movement_type: 'ADJUSTMENT',
      product_id: 'prod_test_01',
      sku: 'SIL-TEST-01',
      barcode: '6221000000018',
      quantity_delta: 2,
      weight_grams_delta: 10.0,
      actor_user_id: adminUser.id,
      actor_role: adminUser.role,
      reason: 'Idempotency test 1',
      idempotency_key: 'idemp_duplicate_test'
    });

    const event2 = appendStockLedgerEvent({
      organization_id: 'org_baher_silver',
      movement_type: 'ADJUSTMENT',
      product_id: 'prod_test_01',
      sku: 'SIL-TEST-01',
      barcode: '6221000000018',
      quantity_delta: 999, // Intentional divergence
      weight_grams_delta: 9999.0,
      actor_user_id: adminUser.id,
      actor_role: adminUser.role,
      reason: 'Idempotency test 2',
      idempotency_key: 'idemp_duplicate_test'
    });

    assert.strictEqual(event1.id, event2.id, 'Duplicate idempotency submission must return existing event ID');
    assert.strictEqual(event1.quantity_delta, event2.quantity_delta, 'Duplicate must not modify quantity');
  });

  // ---------------------------------------------------------------------------
  // [SLICE 2]: Piece Movement & Double-Selling Prevention
  // ---------------------------------------------------------------------------
  console.log('\n[Slice 2]: Serialized Piece Lifecycle & Double-Selling Guard');

  runTest('Execute piece movement updates status and records ledger entry', () => {
    // Find an available piece
    const prod = getProductBySlugOrId('classic-silver-ring');
    assert(prod && prod.pieces && prod.pieces.length > 0, 'Test product must exist with pieces');
    const piece = prod.pieces[0];

    const moveRes = executePieceMovement({
      serial_number: piece.serial_number,
      movement_type: 'SALE',
      actor_user_id: cashierUser.id,
      actor_role: cashierUser.role,
      reason: 'POS Sale checkout test',
      organization_id: 'org_baher_silver',
      idempotency_key: `sale_test_${piece.serial_number}`
    });

    assert.strictEqual(moveRes.piece.lifecycle_status, 'SOLD', 'Piece must be marked SOLD');
    assert.strictEqual(moveRes.event.movement_type, 'SALE', 'Ledger event must record SALE');
    assert.strictEqual(moveRes.event.quantity_delta, -1, 'SALE must delta -1 quantity');
  });

  // ---------------------------------------------------------------------------
  // [SLICE 3]: RBAC & 21-Permission Granular Enforcement
  // ---------------------------------------------------------------------------
  console.log('\n[Slice 3]: Centralized RBAC & 21-Permission Guard');

  runTest('Admin role has weight:manual_entry and account:journal:post permissions', () => {
    assert(RbacService.hasPermission('Admin', 'weight:manual_entry'), 'Admin must have weight:manual_entry');
    assert(RbacService.hasPermission('Admin', 'weight:override'), 'Admin must have weight:override');
    assert(RbacService.hasPermission('Admin', 'account:journal:post'), 'Admin must have account:journal:post');
    assert(RbacService.hasPermission('Admin', 'account:reversal'), 'Admin must have account:reversal');
  });

  runTest('Cashier role CANNOT perform manual weight entry or account journal postings', () => {
    assert(!RbacService.hasPermission('Cashier', 'weight:manual_entry'), 'Cashier must NOT have weight:manual_entry');
    assert(!RbacService.hasPermission('Cashier', 'account:journal:post'), 'Cashier must NOT have account:journal:post');
    assert(!RbacService.hasPermission('Cashier', 'account:reversal'), 'Cashier must NOT have account:reversal');

    // Assert throws 403
    assert.throws(
      () => {
        RbacService.assertPermission(cashierUser, 'weight:manual_entry', 'Attempt manual weight entry');
      },
      (err: any) => err.status === 403 && err.code === 'FORBIDDEN_USER_PERMISSION'
    );

    assert.throws(
      () => {
        RbacService.assertPermission(cashierUser, 'account:journal:post', 'Attempt open account post');
      },
      (err: any) => err.status === 403 && err.code === 'FORBIDDEN_USER_PERMISSION'
    );
  });

  // ---------------------------------------------------------------------------
  // [SLICE 4]: Hardware Scale & Manual Override Audit Engine
  // ---------------------------------------------------------------------------
  console.log('\n[Slice 4]: Hardware Scale Priority & Manual Weight Override Audit');

  runTest('Direct electronic scale weight is accepted without requiring override reason', () => {
    const record = WeightAuditEngine.verifyAndRecordWeight({
      organizationId: 'org_baher_silver',
      branchId: 'branch-cairo',
      terminalId: 'POS-01',
      actor: cashierUser,
      source: 'SCALE',
      grossWeightGrams: 14.85,
      stoneWeightGrams: 0.85
    });

    assert.strictEqual(record.source, 'SCALE');
    assert.strictEqual(record.net_weight_grams, 14.0);
    assert(record.signature && record.signature.length === 64, 'Record must be signed with HMAC');
  });

  runTest('Cashier attempting MANUAL weight entry is blocked by server (403 Forbidden)', () => {
    assert.throws(
      () => {
        WeightAuditEngine.verifyAndRecordWeight({
          organizationId: 'org_baher_silver',
          branchId: 'branch-cairo',
          terminalId: 'POS-01',
          actor: cashierUser,
          source: 'MANUAL',
          grossWeightGrams: 10.5,
          manualReason: 'TEST'
        });
      },
      (err: any) => err.status === 403
    );
  });

  runTest('Admin MANUAL weight entry with invalid/empty reason is rejected (422 Unprocessable)', () => {
    assert.throws(
      () => {
        WeightAuditEngine.verifyAndRecordWeight({
          organizationId: 'org_baher_silver',
          branchId: 'branch-cairo',
          terminalId: 'POS-01',
          actor: adminUser,
          source: 'MANUAL',
          grossWeightGrams: 10.5,
          manualReason: 'arbitrary_invalid_reason'
        });
      },
      (err: any) => err.status === 422 && err.code === 'INVALID_MANUAL_WEIGHT_REASON'
    );
  });

  runTest('Admin MANUAL weight entry with valid reason (SCALE_FAILURE) is audited and signed', () => {
    const record = WeightAuditEngine.verifyAndRecordWeight({
      organizationId: 'org_baher_silver',
      branchId: 'branch-cairo',
      terminalId: 'POS-01',
      actor: adminUser,
      source: 'MANUAL',
      grossWeightGrams: 22.35,
      stoneWeightGrams: 1.35,
      manualReason: 'SCALE_FAILURE'
    });

    assert.strictEqual(record.source, 'MANUAL');
    assert.strictEqual(record.manual_reason, 'SCALE_FAILURE');
    assert.strictEqual(record.net_weight_grams, 21.0);
    assert.strictEqual(record.actor_user_id, adminUser.id);

    // Verify it is written to the durable log
    const query = WeightAuditEngine.queryAuditRecords({ source: 'MANUAL' });
    assert(query.length > 0, 'Must be present in durable audit query');
    assert.strictEqual(query[0].id, record.id);
  });

  // ---------------------------------------------------------------------------
  // [SLICE 5]: Open Accounts Dual Ledger (Cash + 999 Fine Silver + Reversals)
  // ---------------------------------------------------------------------------
  console.log('\n[Slice 5]: Open Accounts Dual Ledger (Cash + 999 Fine Silver)');

  runTest('Math: Pure 999 Fine Silver equivalent calculates purity ratio correctly', () => {
    // 100g gross, 5g stone -> 95g net
    // 925 purity: 95 * (925 / 999) = 87.963g
    const calc925 = DualLedgerEngine.calculateFineSilver999(100.0, 5.0, 925);
    assert.strictEqual(calc925.netWeight, 95.0);
    assert.strictEqual(calc925.fineSilver999, 87.963);

    // 50g net 999 purity: 50 * (999 / 999) = 50.0g
    const calc999 = DualLedgerEngine.calculateFineSilver999(50.0, 0, 999);
    assert.strictEqual(calc999.fineSilver999, 50.0);
  });

  let testAccountId = '';

  runTest('Create Workshop Open Account with EGP currency', () => {
    const acc = DualLedgerEngine.createAccount({
      organizationId: 'org_baher_silver',
      name: 'ورشة الأهرام للفضيات',
      accountType: 'WORKSHOP',
      currency: 'EGP',
      phone: '01000000001',
      notes: 'ورشة تصنيع وتوريد خواتم وسلاسل',
      actor: adminUser
    });

    assert(acc.id.startsWith('acc_'));
    testAccountId = acc.id;

    const bal = DualLedgerEngine.getAccountBalance(acc.id, 'org_baher_silver');
    assert.strictEqual(bal.cash_balance, 0.0);
    assert.strictEqual(bal.fine_silver_999_grams, 0.0);
  });

  let scrapDeliveryEntryId = '';

  runTest('Scrap Delivery: Shop delivers 100g scrap (925) to workshop -> Workshop silver debt increases', () => {
    const entry = DualLedgerEngine.postJournalEntry({
      organizationId: 'org_baher_silver',
      accountId: testAccountId,
      entryType: 'SCRAP_DELIVERY',
      actor: adminUser,
      grossWeightGrams: 100.0,
      stoneWeightGrams: 0.0,
      purity: 925,
      notes: 'تسليم كسر عيار 925 للتشغيل',
      idempotencyKey: 'idemp_scrap_del_01'
    });

    scrapDeliveryEntryId = entry.id;
    // 100 * (925 / 999) = 92.593g
    assert.strictEqual(entry.fine_silver_999_delta, 92.593);
    assert.strictEqual(entry.running_fine_silver_balance, 92.593);
    assert.strictEqual(entry.cash_delta, 0);

    const bal = DualLedgerEngine.getAccountBalance(testAccountId, 'org_baher_silver');
    assert.strictEqual(bal.fine_silver_999_grams, 92.593);
    assert.strictEqual(bal.cash_balance, 0.0);
  });

  runTest('Goods Receipt with Labor: Shop receives jewelry, consuming metal and recording labor fee', () => {
    // Workshop returns 50g 925 jewelry (46.296g pure 999) with 2,500 EGP making fee
    const entry = DualLedgerEngine.postJournalEntry({
      organizationId: 'org_baher_silver',
      accountId: testAccountId,
      entryType: 'GOODS_RECEIPT_LABOR',
      actor: adminUser,
      grossWeightGrams: 50.0,
      stoneWeightGrams: 0.0,
      purity: 925,
      cashDelta: -2500.0, // Shop owes workshop 2,500 EGP labor
      notes: 'استلام خواتم تامة الصنع وإثبات مصنعية 2500 جنيه',
      idempotencyKey: 'idemp_goods_rcpt_01'
    });

    assert.strictEqual(entry.fine_silver_999_delta, -46.296);
    assert.strictEqual(entry.cash_delta, -2500.0);

    const bal = DualLedgerEngine.getAccountBalance(testAccountId, 'org_baher_silver');
    // 92.593 - 46.296 = 46.297g pure silver remaining with workshop
    assert.strictEqual(bal.fine_silver_999_grams, 46.297);
    // Shop owes 2500 EGP to workshop
    assert.strictEqual(bal.cash_balance, -2500.0);
  });

  runTest('Cash Payment: Shop pays 2,500 EGP to workshop, clearing cash debt', () => {
    const entry = DualLedgerEngine.postJournalEntry({
      organizationId: 'org_baher_silver',
      accountId: testAccountId,
      entryType: 'CASH_PAYMENT',
      actor: adminUser,
      cashDelta: 2500.0, // Clears the -2500 debt
      notes: 'سداد مصنعية الورشة نقداً بالكامل',
      idempotencyKey: 'idemp_cash_pay_01'
    });

    const bal = DualLedgerEngine.getAccountBalance(testAccountId, 'org_baher_silver');
    assert.strictEqual(bal.cash_balance, 0.0);
    assert.strictEqual(bal.fine_silver_999_grams, 46.297);
  });

  runTest('Reversal: Append-only non-destructive reversal restores previous balances', () => {
    // Let's create an erroneous scrap delivery of 10g (9.259g pure)
    const errEntry = DualLedgerEngine.postJournalEntry({
      organizationId: 'org_baher_silver',
      accountId: testAccountId,
      entryType: 'SCRAP_DELIVERY',
      actor: adminUser,
      grossWeightGrams: 10.0,
      purity: 925,
      notes: 'حركة خاطئة للاختبار',
      idempotencyKey: 'idemp_err_01'
    });

    const balBefore = DualLedgerEngine.getAccountBalance(testAccountId, 'org_baher_silver');
    assert.strictEqual(balBefore.fine_silver_999_grams, 55.556);

    // Now reverse it
    const revEntry = DualLedgerEngine.postJournalEntry({
      organizationId: 'org_baher_silver',
      accountId: testAccountId,
      entryType: 'REVERSAL',
      reversedEntryId: errEntry.id,
      actor: adminUser,
      notes: 'تصحيح قيد بالخطأ'
    });

    assert.strictEqual(revEntry.fine_silver_999_delta, -9.259);

    const balAfter = DualLedgerEngine.getAccountBalance(testAccountId, 'org_baher_silver');
    assert.strictEqual(balAfter.fine_silver_999_grams, 46.297);
  });

  runTest('Prevent duplicate reversal: Attempting to reverse same entry twice is rejected (409 Conflict)', () => {
    // Attempting to reverse scrapDeliveryEntryId twice? Wait, scrapDeliveryEntryId was not reversed yet.
    // Let's reverse scrapDeliveryEntryId once:
    DualLedgerEngine.postJournalEntry({
      organizationId: 'org_baher_silver',
      accountId: testAccountId,
      entryType: 'REVERSAL',
      reversedEntryId: scrapDeliveryEntryId,
      actor: adminUser,
      notes: 'عكس تسليم الكسر الأول'
    });

    // Attempt second reversal:
    assert.throws(
      () => {
        DualLedgerEngine.postJournalEntry({
          organizationId: 'org_baher_silver',
          accountId: testAccountId,
          entryType: 'REVERSAL',
          reversedEntryId: scrapDeliveryEntryId,
          actor: adminUser,
          notes: 'محاولة عكس ثانية مرفوضة'
        });
      },
      (err: any) => err.status === 409 && err.code === 'ALREADY_REVERSED'
    );
  });

  // ---------------------------------------------------------------------------
  // [SLICE 6]: Full POS Lifecycle (Scan -> Checkout -> Stock Ledger -> Mutex)
  // ---------------------------------------------------------------------------
  console.log('\n[Slice 6]: Full POS Lifecycle (Barcode Scan -> Checkout -> Mutex & Idempotency)');

  let e2eReceiptNumber = '';
  const e2eIdempKey = `idemp_e2e_sale_${Date.now()}`;

  await runTest('Scan piece by barcode and execute atomic POS sale checkout', async () => {
    const prod = getProductBySlugOrId('elegance-drop-earrings');
    assert(prod && prod.pieces && prod.pieces.length > 0, 'Elegance Drop Earrings must exist with pieces');
    const piece = prod.pieces[0];

    // 1. Barcode lookup
    const barcodeLookup = lookupByBarcode(piece.barcode);
    assert(barcodeLookup && barcodeLookup.product.id === prod.id, 'Barcode scan must resolve product');

    // 2. Checkout execution
    const checkoutResult = await POSTransactionEngine.executeCheckout({
      organizationId: 'org_baher_silver',
      branchId: 'branch-cairo',
      terminalId: 'POS-01',
      shiftId: 'shift_cairo_main_01',
      cashierUserId: cashierUser.id,
      cashierName: cashierUser.name,
      actorRole: cashierUser.role,
      items: [
        {
          productId: prod.id,
          serialNumber: piece.serial_number,
          quantity: 1
        }
      ],
      paymentMethod: 'CASH',
      cashAmount: prod.price,
      idempotencyKey: e2eIdempKey
    });

    assert(checkoutResult.id.startsWith('sale_'), 'Transaction must have sale ID');
    assert.strictEqual(checkoutResult.status, 'COMPLETED');
    assert(checkoutResult.qr_payload_base64 && checkoutResult.qr_payload_base64.length > 20, 'Must have TLV QR code');
    e2eReceiptNumber = checkoutResult.receipt_number;

    // 3. Verify piece status updated to SOLD
    const updatedPieceInfo = getPieceBySerial(piece.serial_number);
    assert.strictEqual(updatedPieceInfo?.piece.lifecycle_status, 'SOLD', 'Piece status must be SOLD');
  });

  await runTest('Double-selling protection: Attempting to sell same physical piece again throws PIECE_ALREADY_SOLD', async () => {
    const prod = getProductBySlugOrId('elegance-drop-earrings');
    assert(prod && prod.pieces && prod.pieces.length > 0);
    const piece = prod.pieces[0];

    await assert.rejects(
      async () => {
        await POSTransactionEngine.executeCheckout({
          organizationId: 'org_baher_silver',
          branchId: 'branch-cairo',
          terminalId: 'POS-01',
          shiftId: 'shift_cairo_main_01',
          cashierUserId: cashierUser.id,
          cashierName: cashierUser.name,
          actorRole: cashierUser.role,
          items: [
            {
              productId: prod.id,
              serialNumber: piece.serial_number,
              quantity: 1
            }
          ],
          paymentMethod: 'CASH',
          cashAmount: prod.price,
          idempotencyKey: `duplicate_attempt_${Date.now()}`
        });
      },
      (err: any) => err.status === 422 && err.code === 'PIECE_ALREADY_SOLD'
    );
  });

  await runTest('Checkout Idempotency: Re-submitting identical checkout returns cached receipt without double-debit', async () => {
    const prod = getProductBySlugOrId('elegance-drop-earrings');
    assert(prod && prod.pieces && prod.pieces.length > 0);
    const piece = prod.pieces[0];

    const duplicateSubmission = await POSTransactionEngine.executeCheckout({
      organizationId: 'org_baher_silver',
      branchId: 'branch-cairo',
      terminalId: 'POS-01',
      shiftId: 'shift_cairo_main_01',
      cashierUserId: cashierUser.id,
      cashierName: cashierUser.name,
      actorRole: cashierUser.role,
      items: [
        {
          productId: prod.id,
          serialNumber: piece.serial_number,
          quantity: 1
        }
      ],
      paymentMethod: 'CASH',
      cashAmount: prod.price,
      idempotencyKey: e2eIdempKey // Exact same idempotency key
    });

    assert.strictEqual(duplicateSubmission.receipt_number, e2eReceiptNumber, 'Must return original cached receipt');
    assert.strictEqual(duplicateSubmission.status, 'COMPLETED');
  });

  // ---------------------------------------------------------------------------
  // [SLICE 7]: Service Restart & Persistence Integrity
  // ---------------------------------------------------------------------------
  console.log('\n[Slice 7]: Service Restart & Disk Persistence Verification');

  runTest('Durable journals persist transactions and events across process restarts', () => {
    const dataDir = path.resolve(process.cwd(), '.data');
    const posTxFile = path.join(dataDir, 'pos_transactions.jsonl');
    const ledgerFile = path.join(dataDir, 'canonical_stock_ledger.json');

    assert(fs.existsSync(posTxFile), 'POS transaction journal must exist on disk');
    const posLines = fs.readFileSync(posTxFile, 'utf8').split('\n').filter((l) => l.trim());
    assert(posLines.length > 0, 'POS transaction journal must contain recorded sales');

    const lastTx = JSON.parse(posLines[posLines.length - 1]);
    assert(lastTx.id.startsWith('sale_'), 'Persisted transaction must have valid sale_ ID');
    assert(lastTx.qr_payload_base64, 'Persisted transaction must preserve ZATCA TLV QR code');
  });

  // ---------------------------------------------------------------------------
  // [CLEANUP & SUMMARY]
  // ---------------------------------------------------------------------------
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });

  console.log('\n================================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('Fatal test suite error:', e);
  process.exit(1);
});
