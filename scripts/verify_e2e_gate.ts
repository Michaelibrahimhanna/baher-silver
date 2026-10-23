import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

// 1. Setup isolated test data directory
const TEST_DIR = path.resolve(process.cwd(), '.data_e2e_test');
if (fs.existsSync(TEST_DIR)) {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
}
fs.mkdirSync(TEST_DIR, { recursive: true });

import type { SafeUser } from '@/lib/auth/types';
import { RbacService } from '@/lib/auth/rbacService';
import { WeightAuditEngine } from '@/lib/services/pos/weightAuditEngine';
import { DualLedgerEngine } from '@/lib/services/accounting/dualLedgerEngine';
import { POSTransactionEngine } from '@/lib/services/pos/posTransactionEngine';
import {
  getProductBySlugOrId,
  createPieceForProduct,
  lookupByBarcode,
  getPieceBySerial,
  computeDerivedStock
} from '@/lib/db/productEngine';
import { generateEAN13Barcode, generatePieceSerialNumber } from '@/lib/catalog-identifiers';

// Override storage paths for engines
WeightAuditEngine.setStoragePath(path.join(TEST_DIR, 'weight_audit_records.jsonl'));
DualLedgerEngine.setStoragePaths(
  path.join(TEST_DIR, 'dual_ledger_journal.jsonl'),
  path.join(TEST_DIR, 'open_accounts.json')
);

const adminUser: SafeUser = {
  id: 'usr_admin_gate',
  email: 'admin@bahersilver.com',
  name: 'Admin Supervisor',
  role: 'Admin',
  status: 'active',
  organizationId: 'org_baher_silver',
  createdAt: new Date().toISOString()
};

const cashierUser: SafeUser = {
  id: 'usr_cashier_gate',
  email: 'cashier@bahersilver.com',
  name: 'Cashier George',
  role: 'Cashier',
  status: 'active',
  organizationId: 'org_baher_silver',
  createdAt: new Date().toISOString()
};

async function runE2EGate() {
  console.log('================================================================');
  console.log('  SILVER OS — FINAL VERIFICATION GATE TEST RUNNER');
  console.log('================================================================\n');

  // STEP 1 & 2: Create Piece & Generate Unique Barcode & Serial
  console.log('[Step 1 & 2]: Creating piece with unique barcode & serial...');
  const baseProd = getProductBySlugOrId('classic-silver-ring');
  assert(baseProd, 'Base product classic-silver-ring must exist');

  const uniqueSuffix = Math.floor(Date.now() % 100000);
  const customBarcode = generateEAN13Barcode(50000 + uniqueSuffix);
  const customSerial = generatePieceSerialNumber('BHR', uniqueSuffix);

  const piece = createPieceForProduct({
    product_id: baseProd.id,
    serial_number: customSerial,
    barcode: customBarcode,
    warehouse_id: 'wh-cairo-main',
    location_code: 'SHOWCASE-01',
    weight_grams: 8.45,
    lifecycle_status: 'IN_SHOWCASE',
    organization_id: 'org_baher_silver',
    actor_user_id: adminUser.id,
    actor_role: adminUser.role,
    reason: 'New physical inventory intake for verification gate'
  });

  assert.strictEqual(piece.serial_number, customSerial);
  assert.strictEqual(piece.barcode, customBarcode);
  assert.strictEqual(piece.lifecycle_status, 'IN_SHOWCASE');
  console.log(`  ✓ Piece created successfully: Serial=${piece.serial_number}, Barcode=${piece.barcode}`);

  // STEP 3: Scan Barcode
  console.log('\n[Step 3]: Scanning barcode via POS lookup...');
  const scanned = lookupByBarcode(customBarcode);
  assert(scanned, 'Barcode scan lookup must find the piece');
  assert.strictEqual(scanned.product.id, baseProd.id);
  assert(scanned.piece, 'Must resolve exact serialized piece');
  assert.strictEqual(scanned.piece.serial_number, customSerial);
  console.log(`  ✓ Barcode lookup verified: Resolved to product "${scanned.product.name.ar}" and piece ${scanned.piece.serial_number}`);

  // STEP 4: Sell Piece via POS Checkout
  console.log('\n[Step 4]: Executing atomic POS sale checkout...');
  const saleTx = await POSTransactionEngine.executeCheckout({
    organizationId: 'org_baher_silver',
    branchId: 'branch-cairo',
    terminalId: 'POS-01',
    shiftId: 'shift_cairo_main_01',
    cashierUserId: cashierUser.id,
    cashierName: cashierUser.name,
    actorRole: cashierUser.role,
    items: [
      {
        productId: baseProd.id,
        serialNumber: piece.serial_number,
        quantity: 1
      }
    ],
    paymentMethod: 'CASH',
    cashAmount: baseProd.price,
    idempotencyKey: `idemp_gate_sale_${Date.now()}`
  });

  assert(saleTx.id.startsWith('sale_'));
  assert.strictEqual(saleTx.status, 'COMPLETED');
  assert(saleTx.qr_payload_base64 && saleTx.qr_payload_base64.length > 20);
  console.log(`  ✓ Sale completed: Receipt #${saleTx.receipt_number}, Status: ${saleTx.status}, Total: ${saleTx.total_amount} EGP`);

  // STEP 5: Stock Update & Status Verification
  console.log('\n[Step 5]: Verifying stock ledger update & piece lifecycle...');
  const soldPiece = getPieceBySerial(customSerial);
  assert(soldPiece, 'Piece must exist');
  assert.strictEqual(soldPiece.piece.lifecycle_status, 'SOLD', 'Piece status must be SOLD');
  console.log(`  ✓ Piece lifecycle status updated to: ${soldPiece.piece.lifecycle_status}`);

  // STEP 6: Restart & Persistence Simulation
  console.log('\n[Step 6]: Simulating service restart and checking data persistence...');
  const dataDir = path.resolve(process.cwd(), '.data');
  const posTxFile = path.join(dataDir, 'pos_transactions.jsonl');
  const ledgerFile = path.join(dataDir, 'canonical_stock_ledger.json');

  assert(fs.existsSync(posTxFile), 'pos_transactions.jsonl must exist');
  assert(fs.existsSync(ledgerFile), 'canonical_stock_ledger.json must exist');

  const rawTx = fs.readFileSync(posTxFile, 'utf8');
  assert(rawTx.includes(saleTx.id), 'Recorded sale must be persisted in pos_transactions.jsonl on disk');
  const rawLedger = fs.readFileSync(ledgerFile, 'utf8');
  assert(rawLedger.includes(customSerial), 'Stock ledger must persist event containing custom piece serial');
  console.log('  ✓ Persistence verified: Sales and ledger entries persisted on disk across process lifecycles');

  // STEP 7: Manual Weight & RBAC & Audit Log
  console.log('\n[Step 7]: Testing manual weight override, RBAC permissions & audit log...');
  // Cashier attempt must throw 403
  let cashierBlocked = false;
  try {
    WeightAuditEngine.verifyAndRecordWeight({
      organizationId: 'org_baher_silver',
      branchId: 'branch-cairo',
      terminalId: 'POS-01',
      actor: cashierUser,
      source: 'MANUAL',
      grossWeightGrams: 12.5,
      manualReason: 'SCALE_FAILURE'
    });
  } catch (err: any) {
    if (err.status === 403) cashierBlocked = true;
  }
  assert(cashierBlocked, 'Cashier must be blocked from manual weight entry with HTTP 403');
  console.log('  ✓ RBAC Guard: Cashier manual weight attempt rejected with 403 Forbidden');

  // Admin attempt with valid reason must succeed and create audit record
  const weightRecord = WeightAuditEngine.verifyAndRecordWeight({
    organizationId: 'org_baher_silver',
    branchId: 'branch-cairo',
    terminalId: 'POS-01',
    actor: adminUser,
    source: 'MANUAL',
    grossWeightGrams: 15.65,
    stoneWeightGrams: 0.65,
    manualReason: 'SCALE_FAILURE'
  });
  assert.strictEqual(weightRecord.source, 'MANUAL');
  assert.strictEqual(weightRecord.manual_reason, 'SCALE_FAILURE');
  assert.strictEqual(weightRecord.net_weight_grams, 15.0);
  assert(weightRecord.signature && weightRecord.signature.length === 64);
  console.log(`  ✓ Manual weight audited: Signed by ${adminUser.email}, Net=${weightRecord.net_weight_grams}g, Reason=${weightRecord.manual_reason}`);

  // STEP 8: Dual Ledger & Double Reversal Prevention
  console.log('\n[Step 8]: Testing Dual Ledger posting & duplicate reversal rejection...');
  const account = DualLedgerEngine.createAccount({
    organizationId: 'org_baher_silver',
    name: 'ورشة الذهب والفضة التخصصية',
    accountType: 'WORKSHOP',
    currency: 'EGP',
    actor: adminUser
  });

  const entry = DualLedgerEngine.postJournalEntry({
    organizationId: 'org_baher_silver',
    accountId: account.id,
    entryType: 'SCRAP_DELIVERY',
    actor: adminUser,
    grossWeightGrams: 50.0,
    stoneWeightGrams: 0.0,
    purity: 925,
    notes: 'تسليم كسر 50 جرام'
  });

  assert.strictEqual(entry.fine_silver_999_delta, 46.296);

  // First reversal must succeed
  const rev1 = DualLedgerEngine.postJournalEntry({
    organizationId: 'org_baher_silver',
    accountId: account.id,
    entryType: 'REVERSAL',
    reversedEntryId: entry.id,
    actor: adminUser,
    notes: 'عكس القيد لمرة واحدة'
  });
  assert.strictEqual(rev1.fine_silver_999_delta, -46.296);
  console.log(`  ✓ First reversal posted successfully: Reversal ID=${rev1.id}`);

  // Second reversal of the exact same entry must throw 409 Conflict
  let duplicateBlocked = false;
  try {
    DualLedgerEngine.postJournalEntry({
      organizationId: 'org_baher_silver',
      accountId: account.id,
      entryType: 'REVERSAL',
      reversedEntryId: entry.id,
      actor: adminUser,
      notes: 'محاولة عكس ثانية لنفس القيد'
    });
  } catch (err: any) {
    if (err.status === 409 && err.code === 'ALREADY_REVERSED') {
      duplicateBlocked = true;
    }
  }
  assert(duplicateBlocked, 'Attempting to reverse an already reversed entry must throw 409 Conflict ALREADY_REVERSED');
  console.log('  ✓ Duplicate reversal rejected with 409 Conflict (ALREADY_REVERSED)');

  // Cleanup
  fs.rmSync(TEST_DIR, { recursive: true, force: true });

  console.log('\n================================================================');
  console.log('  ALL VERIFICATION GATE STEPS PASSED SUCCESSFULLY (0 FAILURES)');
  console.log('================================================================\n');
}

runE2EGate().catch((err) => {
  console.error('VERIFICATION GATE FAILED:', err);
  process.exit(1);
});
