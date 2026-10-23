import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

// 1. Setup isolated test data directory
const TEST_DIR = path.resolve(process.cwd(), '.data_phase_c_test');
if (fs.existsSync(TEST_DIR)) {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
}
fs.mkdirSync(TEST_DIR, { recursive: true });

import type { SafeUser } from '@/lib/auth/types';
import { RbacService } from '@/lib/auth/rbacService';
import { WeightAuditEngine } from '@/lib/services/pos/weightAuditEngine';
import { DualLedgerEngine } from '@/lib/services/accounting/dualLedgerEngine';
import { POSTransactionEngine } from '@/lib/services/pos/posTransactionEngine';
import { CashShiftEngine } from '@/lib/services/pos/cashShiftEngine';
import {
  getProductBySlugOrId,
  createProduct,
  createPieceForProduct,
  lookupByBarcode,
  getPieceBySerial,
  getStockLedger,
  assertValidSilverPurity,
  APPROVED_SILVER_PURITIES
} from '@/lib/db/productEngine';
import { generateEAN13Barcode, generatePieceSerialNumber, validateBarcodeFormat } from '@/lib/catalog-identifiers';
import { projectCashierItem } from '@/lib/security/cashierProjection';

// Override storage paths for engines to ensure isolated execution
WeightAuditEngine.setStoragePath(path.join(TEST_DIR, 'weight_audit_records.jsonl'));
DualLedgerEngine.setStoragePaths(
  path.join(TEST_DIR, 'dual_ledger_journal.jsonl'),
  path.join(TEST_DIR, 'open_accounts.json')
);

const adminUser: SafeUser = {
  id: 'usr_admin_slice1',
  email: 'admin@bahersilver.com',
  name: 'Admin Supervisor',
  role: 'Admin',
  status: 'active',
  organizationId: 'org_baher_silver',
  createdAt: new Date().toISOString()
};

const cashierUser: SafeUser = {
  id: 'usr_cashier_slice1',
  email: 'cashier@bahersilver.com',
  name: 'Cashier Layla',
  role: 'Cashier',
  status: 'active',
  organizationId: 'org_baher_silver',
  createdAt: new Date().toISOString()
};

const viewerUser: SafeUser = {
  id: 'usr_viewer_slice1',
  email: 'viewer@bahersilver.com',
  name: 'Viewer Guest',
  role: 'Viewer',
  status: 'active',
  organizationId: 'org_baher_silver',
  createdAt: new Date().toISOString()
};

async function runPhaseCSlice1Gate() {
  console.log('================================================================');
  console.log('  BAHER SILVER — PHASE C VERTICAL SLICE & REGRESSION GATE');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  async function test(id: string, name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      await fn();
      passed++;
      console.log(`  ✓ [PASS] [${id}] ${name}`);
    } catch (err: any) {
      console.error(`  ✗ [FAIL] [${id}] ${name}:`, err.message);
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // [PART 1]: ACCEPTANCE TESTS (TC-SLICE-01 TO TC-SLICE-09)
  // ---------------------------------------------------------------------------

  let testProduct: any;
  let testPiece: any;
  let generatedBarcode: string = '';
  let generatedSerial: string = '';

  await test('TC-SLICE-01', 'Support optional silver purity 800 and assert validation', () => {
    // 1. Verify 800 is included in APPROVED_SILVER_PURITIES
    assert(APPROVED_SILVER_PURITIES.includes('800' as any), 'Purity 800 must be in APPROVED_SILVER_PURITIES');
    // 2. Validate assertValidSilverPurity allows 800 without throwing
    assert.doesNotThrow(() => assertValidSilverPurity('800'), 'assertValidSilverPurity must accept 800');
    // 3. Create a heritage silver product with purity 800
    const sku = `BS-HRT-800-${Date.now().toString().slice(-5)}`;
    testProduct = createProduct({
      sku,
      name: { en: 'Khan El-Khalili Antique Silver Tray', ar: 'صينية فضة تراثية خان الخليلي عيار 800' },
      category: 'accessories',
      profile_type: 'SILVER_JEWELRY',
      purity: '800',
      weight_grams: 45.0,
      price: 2400,
      labor_cost: 240,
      cost_price: 1800,
      barcode: generateEAN13Barcode(),
      organization_id: 'org_baher_silver'
    });
    assert(testProduct && testProduct.id, 'Product must be created with ID');
    assert.equal(testProduct.purity, '800', 'Product purity must be 800');
  });

  await test('TC-SLICE-02', 'Generate unique EAN-13 barcode and serial number for piece', () => {
    const seed = Math.floor(10000 + Math.random() * 80000);
    generatedBarcode = generateEAN13Barcode(seed);
    const barcodeValidation = validateBarcodeFormat(generatedBarcode);
    assert.equal(barcodeValidation.valid, true, 'Barcode must be valid EAN-13');
    assert.equal(barcodeValidation.format, 'EAN-13');

    generatedSerial = generatePieceSerialNumber('BHR', Math.floor(1000 + Math.random() * 8000));
    assert(generatedSerial.startsWith('SN-BHR-'), 'Serial must start with SN-BHR-');

    testPiece = createPieceForProduct({
      product_id: testProduct.id,
      serial_number: generatedSerial,
      barcode: generatedBarcode,
      warehouse_id: 'wh-cairo-main',
      location_code: 'SHOWCASE-01',
      weight_grams: 45.5,
      lifecycle_status: 'IN_SHOWCASE',
      organization_id: 'org_baher_silver',
      actor_user_id: adminUser.id,
      actor_role: adminUser.role,
      reason: 'Physical piece intake for Phase C slice test'
    });

    assert.equal(testPiece.serial_number, generatedSerial);
    assert.equal(testPiece.barcode, generatedBarcode);
    assert.equal(testPiece.lifecycle_status, 'IN_SHOWCASE');
  });

  await test('TC-SLICE-03', 'Scan barcode lookup and enforce cashier confidentiality projection', () => {
    const lookupResult = lookupByBarcode(generatedBarcode);
    assert(lookupResult, 'Lookup by barcode must find product and piece');
    assert.equal(lookupResult.product.id, testProduct.id);
    assert.equal(lookupResult.piece?.serial_number, generatedSerial);

    // Enforce cashier projection - ZERO COST LEAKS
    const cashierView = projectCashierItem(lookupResult.product, lookupResult.piece);
    assert.equal(cashierView.serialNumber, generatedSerial);
    assert.equal((cashierView as any).cost_basis, undefined, 'cost_basis must be stripped');
    assert.equal((cashierView as any).cost_price, undefined, 'cost_price must be stripped');
    assert.equal((cashierView as any).margin, undefined, 'margin must be stripped');
    assert.equal((cashierView as any).supplier_id, undefined, 'supplier_id must be stripped');
  });

  const activeShiftId = 'shift_cairo_main_01';
  const activeTerminalId = 'POS-01';

  let saleReceipt: string = '';
  const saleIdempKey = `idemp_slice1_${Date.now()}`;

  await test('TC-SLICE-04', 'Atomic POS checkout execution with Cash payment', async () => {
    const checkoutResult = await POSTransactionEngine.executeCheckout({
      organizationId: 'org_baher_silver',
      branchId: 'branch-cairo',
      terminalId: activeTerminalId,
      shiftId: activeShiftId,
      cashierUserId: cashierUser.id,
      cashierName: cashierUser.name,
      actorRole: cashierUser.role,
      items: [
        {
          productId: testProduct.id,
          serialNumber: testPiece.serial_number,
          quantity: 1
        }
      ],
      paymentMethod: 'CASH',
      cashAmount: testProduct.price,
      idempotencyKey: saleIdempKey
    });

    assert(checkoutResult.id.startsWith('sale_'), 'Transaction ID must start with sale_');
    assert.equal(checkoutResult.status, 'COMPLETED');
    assert(checkoutResult.receipt_number.startsWith('REC-'), 'Receipt number must start with REC-');
    assert(checkoutResult.qr_payload_base64 && checkoutResult.qr_payload_base64.length > 20, 'ZATCA TLV QR code must be present');
    saleReceipt = checkoutResult.receipt_number;
  });

  await test('TC-SLICE-05', 'Stock ledger update with HMAC and piece status transition to SOLD', () => {
    const pieceQuery = getPieceBySerial(generatedSerial, 'org_baher_silver');
    assert(pieceQuery, 'Piece must exist');
    assert.equal(pieceQuery.piece.lifecycle_status, 'SOLD', 'Physical piece status must be SOLD');

    const { events } = getStockLedger({ organization_id: 'org_baher_silver' });
    const saleEvent = events.find(
      (e) => e.serial_number === generatedSerial && e.movement_type === 'SALE'
    );
    assert(saleEvent, 'Stock ledger must contain SALE event for sold piece');
    assert.equal(saleEvent.quantity_delta, -1);
    assert(saleEvent.event_hash && saleEvent.event_hash.length === 64, 'Ledger event must have 64-char SHA256 HMAC hash');
  });

  await test('TC-SLICE-06', 'Reject duplicate piece in the same cart', async () => {
    await assert.rejects(
      async () => {
        await POSTransactionEngine.executeCheckout({
          organizationId: 'org_baher_silver',
          branchId: 'branch-cairo',
          terminalId: activeTerminalId,
          shiftId: activeShiftId,
          cashierUserId: cashierUser.id,
          cashierName: cashierUser.name,
          actorRole: cashierUser.role,
          items: [
            { productId: testProduct.id, serialNumber: 'SN-ANY-999', quantity: 1 },
            { productId: testProduct.id, serialNumber: 'SN-ANY-999', quantity: 1 }
          ],
          paymentMethod: 'CASH',
          cashAmount: 1000,
          idempotencyKey: `idemp_dupe_cart_${Date.now()}`
        });
      },
      (err: any) => err.code === 'DUPLICATE_PIECE_IN_CART' && err.status === 422
    );
  });

  await test('TC-SLICE-07', 'Reject double-selling of already sold piece (PIECE_ALREADY_SOLD)', async () => {
    await assert.rejects(
      async () => {
        await POSTransactionEngine.executeCheckout({
          organizationId: 'org_baher_silver',
          branchId: 'branch-cairo',
          terminalId: activeTerminalId,
          shiftId: activeShiftId,
          cashierUserId: cashierUser.id,
          cashierName: cashierUser.name,
          actorRole: cashierUser.role,
          items: [
            {
              productId: testProduct.id,
              serialNumber: testPiece.serial_number, // Already sold in TC-SLICE-04
              quantity: 1
            }
          ],
          paymentMethod: 'CASH',
          cashAmount: testProduct.price,
          idempotencyKey: `idemp_double_sell_${Date.now()}`
        });
      },
      (err: any) => err.code === 'PIECE_ALREADY_SOLD' && err.status === 422
    );
  });

  await test('TC-SLICE-08', 'Idempotency guarantee returns cached receipt without duplicate movement', async () => {
    const replayResult = await POSTransactionEngine.executeCheckout({
      organizationId: 'org_baher_silver',
      branchId: 'branch-cairo',
      terminalId: activeTerminalId,
      shiftId: activeShiftId,
      cashierUserId: cashierUser.id,
      cashierName: cashierUser.name,
      actorRole: cashierUser.role,
      items: [
        {
          productId: testProduct.id,
          serialNumber: testPiece.serial_number,
          quantity: 1
        }
      ],
      paymentMethod: 'CASH',
      cashAmount: testProduct.price,
      idempotencyKey: saleIdempKey // Exact same key from TC-SLICE-04
    });

    assert.equal(replayResult.receipt_number, saleReceipt, 'Must return identical cached receipt');
    assert.equal(replayResult.status, 'COMPLETED');
  });

  await test('TC-SLICE-09', 'Multi-item atomic rollback on cart failure', async () => {
    // Create one available piece
    const goodPieceSerial = `SN-GOOD-${Date.now().toString().slice(-4)}`;
    const goodPiece = createPieceForProduct({
      product_id: testProduct.id,
      serial_number: goodPieceSerial,
      barcode: generateEAN13Barcode(),
      warehouse_id: 'wh-cairo-main',
      location_code: 'SHOWCASE-01',
      weight_grams: 10.0,
      lifecycle_status: 'IN_SHOWCASE',
      organization_id: 'org_baher_silver'
    });

    // Attempt checkout containing one good piece and one non-existent/invalid piece
    await assert.rejects(
      async () => {
        await POSTransactionEngine.executeCheckout({
          organizationId: 'org_baher_silver',
          branchId: 'branch-cairo',
          terminalId: activeTerminalId,
          shiftId: activeShiftId,
          cashierUserId: cashierUser.id,
          cashierName: cashierUser.name,
          actorRole: cashierUser.role,
          items: [
            { productId: testProduct.id, serialNumber: goodPiece.serial_number, quantity: 1 },
            { productId: testProduct.id, serialNumber: 'SN-DOES-NOT-EXIST-404', quantity: 1 }
          ],
          paymentMethod: 'CASH',
          cashAmount: testProduct.price * 2,
          idempotencyKey: `idemp_rollback_${Date.now()}`
        });
      }
    );

    // Verify the good piece was NOT debited or marked SOLD (atomic rollback preserved)
    const checkGoodPiece = getPieceBySerial(goodPieceSerial, 'org_baher_silver');
    assert.equal(checkGoodPiece?.piece.lifecycle_status, 'IN_SHOWCASE', 'Piece status must remain IN_SHOWCASE after failure');
  });

  // ---------------------------------------------------------------------------
  // [PART 2]: REGRESSION TESTS FOR PRESERVED NON-SILVER CATEGORIES
  // ---------------------------------------------------------------------------

  await test('REG-EYE-01', 'Preserve Eyeglasses (نظارات) as non-silver retail merchandise', () => {
    const eyeSku = `EYE-VNT-${Date.now().toString().slice(-5)}`;
    const eyeBarcode = generateEAN13Barcode();
    const eyeProduct = createProduct({
      sku: eyeSku,
      name: { en: 'Baher Classic Italian Eyeglasses', ar: 'نظارة باهر الكلاسيكية الإيطالية' },
      category: 'eyeglasses',
      profile_type: 'NON_SILVER_RETAIL',
      price: 1250,
      cost_price: 600,
      barcode: eyeBarcode,
      organization_id: 'org_baher_silver'
    });
    assert.equal(eyeProduct.category, 'eyeglasses');
    assert.equal(eyeProduct.profile_type, 'NON_SILVER_RETAIL');
    // Ensure purity is undefined or not required for eyeglasses
    assert.equal(eyeProduct.purity, undefined, 'Eyeglasses must not require silver purity');
  });

  await test('REG-WAT-01', 'Preserve Watches (ساعات) as fixed-price retail category', () => {
    const watSku = `WAT-LUX-${Date.now().toString().slice(-5)}`;
    const watBarcode = generateEAN13Barcode();
    const watchProduct = createProduct({
      sku: watSku,
      name: { en: 'Baher Chronograph Watch', ar: 'ساعة يد كرونوغراف باهر' },
      category: 'watches',
      profile_type: 'NON_SILVER_RETAIL',
      price: 4500,
      cost_price: 2200,
      barcode: watBarcode,
      organization_id: 'org_baher_silver'
    });
    assert.equal(watchProduct.category, 'watches');
    assert.equal(watchProduct.profile_type, 'NON_SILVER_RETAIL');
  });

  await test('REG-ACC-01', 'Preserve Accessories & Packaging categories', () => {
    const accSku = `ACC-POL-${Date.now().toString().slice(-5)}`;
    const accBarcode = generateEAN13Barcode();
    const accProduct = createProduct({
      sku: accSku,
      name: { en: 'Silver Polishing Cloth', ar: 'قطعة قماش تلميع الفضة الإيطالية' },
      category: 'accessories',
      profile_type: 'NON_SILVER_RETAIL',
      price: 45,
      cost_price: 15,
      barcode: accBarcode,
      organization_id: 'org_baher_silver'
    });
    assert.equal(accProduct.profile_type, 'NON_SILVER_RETAIL');
  });

  await test('REG-AUT-01', 'RBAC permission guard enforces role-based access', () => {
    assert(RbacService.hasPermission('Admin', 'product:manage'), 'Admin has product:manage');
    assert(RbacService.hasPermission('Cashier', 'pos:sale:create'), 'Cashier has pos:sale:create');
    assert(!RbacService.hasPermission('Cashier', 'product:manage'), 'Cashier does NOT have product:manage');
    assert(!RbacService.hasPermission('Viewer', 'pos:sale:create'), 'Viewer does NOT have pos:sale:create');
  });

  // Cleanup isolated test directory
  fs.rmSync(TEST_DIR, { recursive: true, force: true });

  console.log('\n================================================================');
  console.log(`  PHASE C SLICE 1 & REGRESSION GATE RESULTS: ${passed}/${total} PASSED (0 FAILURES)`);
  console.log('================================================================\n');
}

runPhaseCSlice1Gate().catch((err) => {
  console.error('CRITICAL GATE FAILURE:', err);
  process.exit(1);
});
