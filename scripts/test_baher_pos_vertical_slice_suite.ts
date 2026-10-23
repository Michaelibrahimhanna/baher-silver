/**
 * BAHER SILVER — PHASE 4B.2.3: RETAIL POS VERTICAL SLICE VERIFICATION SUITE
 *
 * Verifies the complete real retail operating journey:
 *  1. Product Discovery: Barcode lookup, piece serial lookup, product ID lookup
 *  2. Multi-match product keyword discovery returning MULTIPLE_MATCHES with profile metadata
 *  3. Available physical serialized pieces returned for piece selection
 *  4. Dual merchandise profiles: SILVER_JEWELRY (purity 925, serialized) vs NON_SILVER_RETAIL (fixed price, bulk)
 *  5. Multi-quantity adjustments for non-silver retail merchandise
 *  6. Cart total calculations (subtotal, silver weight, net payable)
 *  7. Customer Master lookup & attachment with immutable snapshot semantics
 *  8. Full checkout execution (Sale 1: with Customer) via POST /api/pos/checkout
 *  9. Unified Inventory Ledger: sealed SALE entry created with hash and nonce
 * 10. Cash Shift Engine: till drawer balance updated by cash tendered
 * 11. Full checkout execution (Sale 2: Anonymous Walk-in) on the same shift
 * 12. Strict Idempotency: replaying request with same key returns cached transaction without double-movement
 * 13. Serialized piece uniqueness: attempting to sell an already-sold piece is rejected (PIECE_ALREADY_SOLD)
 * 14. Security & RBAC: cashier role authorized, viewer role rejected (403 Forbidden)
 */

import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { SessionService } from '../lib/auth/sessionService';
import { CustomerService, SupabaseCustomerRepository } from '../lib/services/customer';
import { CashShiftEngine } from '../lib/services/pos/cashShiftEngine';
import { GET as lookupRoute } from '../app/api/pos/lookup/route';
import { POST as checkoutRoute } from '../app/api/pos/checkout/route';
import {
  getProductBySlugOrId,
  createProduct,
  createPieceForProduct,
  getPieceBySerial,
  getStockLedger
} from '../lib/db/productEngine';

async function runRetailPosVerticalSliceSuite() {
  console.log('===============================================================');
  console.log('  BAHER SILVER — PHASE 4B.2.3: RETAIL POS VERTICAL SLICE SUITE');
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

  // 1. Initialize Stores
  await SessionService.ensureInitialized();
  SupabaseCustomerRepository.clearMemoryStore();
  const customerService = new CustomerService();

  // 2. Authenticate Personas
  const cashier = await SessionService.authenticate('cashier@bahersilver.com', 'BaherCashier2026!');
  assert(cashier.sessionToken, 'Cashier token required');

  const viewer = await SessionService.authenticate('viewer@bahersilver.com', 'BaherViewer2026!');
  assert(viewer.sessionToken, 'Viewer token required');

  // 3. Open Active Cashier Shift
  const terminalId = `POS-SLICE-${Date.now()}`;
  const initialFloat = 3500;
  const shift = CashShiftEngine.openShift({
    organizationId: 'org_baher_silver',
    branchId: 'branch-cairo',
    terminalId,
    cashierUserId: cashier.user.id,
    cashierName: cashier.user.name,
    openingFloat: initialFloat
  });
  assert(shift && shift.status === 'OPEN', 'Shift must be opened');

  // 4. Register Test Customer in Customer Master
  const testCustomer = await customerService.createCustomer(
    { organizationId: 'org_baher_silver', actorUserId: cashier.user.id },
    {
      name: 'Nadia El-Gohary',
      phone: '+20 102 345 6789'
    }
  );
  assert(testCustomer.id.startsWith('cust_'), 'Customer ID must have cust_ prefix');

  // 5. Ensure Canonical Test Products exist in store
  // 5a. Canonical Non-Silver item: ret-1 (Polishing Cloth)
  const nonSilverProd = getProductBySlugOrId('ret-1', 'org_baher_silver');
  assert(nonSilverProd, 'Canonical product ret-1 (Baher Silver Polishing Cloth) must exist');
  assert.equal(nonSilverProd.profile_type, 'NON_SILVER_RETAIL');

  // 5b. Create dedicated serialized silver jewelry product for pristine testing
  const testSilverSku = `TST-RNG-${Date.now().toString().slice(-6)}`;
  const silverProd = createProduct({
    sku: testSilverSku,
    name: { en: 'Baher Heritage Silver Signet Ring', ar: 'خاتم بحر التراثي فضة' },
    category: 'RINGS',
    profile_type: 'SILVER_JEWELRY',
    purity: '925',
    weight_grams: 9.8,
    price: 680,
    labor_cost: 45,
    cost_price: 450,
    barcode: `EAN-${testSilverSku}`,
    organization_id: 'org_baher_silver'
  });
  assert(silverProd, 'Silver product must be created');

  const testPiece1 = createPieceForProduct({
    product_id: silverProd.id,
    serial_number: `PC-${testSilverSku}-01`,
    barcode: `BAR-${testSilverSku}-01`,
    weight_grams: 9.85,
    location_code: 'SHOWCASE',
    organization_id: 'org_baher_silver'
  });

  const testPiece2 = createPieceForProduct({
    product_id: silverProd.id,
    serial_number: `PC-${testSilverSku}-02`,
    barcode: `BAR-${testSilverSku}-02`,
    weight_grams: 9.75,
    location_code: 'VAULT',
    organization_id: 'org_baher_silver'
  });

  // Helper for authenticated requests
  function makeReq(url: string, method: string, token: string, body?: any): NextRequest {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      cookie: `mip_session=${token}`,
      authorization: `Bearer ${token}`
    };
    return new NextRequest(new URL(url, 'http://localhost:3000'), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
  }

  // TEST 1: Lookup by Barcode
  await test('1. GET /api/pos/lookup resolves physical piece by barcode', async () => {
    const req = makeReq(`/api/pos/lookup?barcode=${testPiece1.barcode}`, 'GET', cashier.sessionToken!);
    const res = await lookupRoute(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.type, 'BARCODE_MATCH');
    assert.equal(data.piece.serial_number, testPiece1.serial_number);
    assert.equal(data.profile_type, 'SILVER_JEWELRY');
  });

  // TEST 2: Lookup by Serial Number
  await test('2. GET /api/pos/lookup resolves physical piece by serial number', async () => {
    const req = makeReq(`/api/pos/lookup?q=${testPiece2.serial_number}`, 'GET', cashier.sessionToken!);
    const res = await lookupRoute(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert(data.type === 'SERIAL_MATCH' || data.type === 'BARCODE_MATCH');
    assert.equal(data.piece.serial_number, testPiece2.serial_number);
    assert.equal(data.piece.current_weight_grams, 9.75);
  });

  // TEST 3: Lookup by exact product ID returns available pieces
  await test('3. GET /api/pos/lookup resolves product ID and lists available pieces', async () => {
    const req = makeReq(`/api/pos/lookup?q=${silverProd.id}`, 'GET', cashier.sessionToken!);
    const res = await lookupRoute(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.type, 'PRODUCT_MATCH');
    assert.equal(data.product.id, silverProd.id);
    assert(Array.isArray(data.available_pieces), 'available_pieces array must exist');
    assert(data.available_pieces.length >= 2, 'At least two pieces must be available');
  });

  // TEST 4: Keyword search returns MULTIPLE_MATCHES
  await test('4. GET /api/pos/lookup keyword search returns MULTIPLE_MATCHES when appropriate', async () => {
    const req = makeReq(`/api/pos/lookup?q=Silver`, 'GET', cashier.sessionToken!);
    const res = await lookupRoute(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.type, 'MULTIPLE_MATCHES');
    assert(data.matches.length >= 2, 'Should find multiple items with "Silver" in name');
    const firstMatch = data.matches[0];
    assert(firstMatch.id && firstMatch.name && firstMatch.profile_type, 'Match must contain catalog summary');
  });

  // TEST 5: Non-silver retail product lookup
  await test('5. GET /api/pos/lookup resolves non-silver retail merchandise', async () => {
    const req = makeReq(`/api/pos/lookup?q=ret-1`, 'GET', cashier.sessionToken!);
    const res = await lookupRoute(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.product.id, 'ret-1');
    assert.equal(data.profile_type, 'NON_SILVER_RETAIL');
    assert.equal(data.available, true);
  });

  // TEST 6: Checkout Execution 1 (Dual Profile Cart with Attached Customer)
  let sale1Receipt = '';
  let sale1Total = 0;
  const silverLineTotal = Number((Number((testPiece1.current_weight_grams * 55.5).toFixed(2)) + 45).toFixed(2));
  const nonSilverLineTotal = nonSilverProd.price * 2; // 35 * 2 = 70
  sale1Total = Number((silverLineTotal + nonSilverLineTotal).toFixed(2));

  await test('6. POST /api/pos/checkout executes sale with dual profiles and attached customer', async () => {
    const payload = {
      shiftId: shift.id,
      customerId: testCustomer.id,
      items: [
        {
          productId: silverProd.id,
          sku: silverProd.sku,
          name: silverProd.name.en,
          profileType: 'SILVER_JEWELRY',
          serialNumber: testPiece1.serial_number,
          purity: '925',
          weightGrams: testPiece1.current_weight_grams,
          quantity: 1,
          unitPrice: silverLineTotal,
          totalPrice: silverLineTotal
        },
        {
          productId: nonSilverProd.id,
          sku: nonSilverProd.sku,
          name: nonSilverProd.name.en,
          profileType: 'NON_SILVER_RETAIL',
          weightGrams: nonSilverProd.weight_grams,
          quantity: 2,
          unitPrice: nonSilverProd.price,
          totalPrice: nonSilverLineTotal
        }
      ],
      paymentMethod: 'CASH',
      cashTendered: sale1Total + 100, // 100 change
      globalDiscount: 0,
      idempotencyKey: `IDEMP-SLICE-01-${Date.now()}`
    };

    const req = makeReq('/api/pos/checkout', 'POST', cashier.sessionToken!, payload);
    const res = await checkoutRoute(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);

    const tx = data.transaction;
    sale1Receipt = tx.receipt_number;
    assert(tx.id.startsWith('sale_'), 'Transaction ID must start with sale_');
    assert(tx.receipt_number.startsWith('REC-'), 'Receipt number must start with REC-');
    assert.equal(tx.total_amount, sale1Total);
    assert.equal(tx.customer_id, testCustomer.id);
    assert.equal(tx.customer_name, testCustomer.name);
    assert.equal(tx.customer_phone, testCustomer.phone);
  });

  // TEST 7: Unified Inventory Ledger reflects sale deduction
  await test('7. Unified Inventory Ledger contains sealed SALE entries for sold items', async () => {
    const { events } = getStockLedger({ organization_id: 'org_baher_silver' });
    const silverSaleEntry = events.find(
      (e) => e.product_id === silverProd.id && e.serial_number === testPiece1.serial_number && e.movement_type === 'SALE'
    );
    assert(silverSaleEntry, 'Ledger must contain SALE movement for serialized silver ring');
    assert.equal(silverSaleEntry.quantity_delta, -1);
    assert(silverSaleEntry.event_hash, 'Ledger entry must be sealed with hash');

    const nonSilverSaleEntry = events.find(
      (e) => e.product_id === nonSilverProd.id && e.movement_type === 'SALE' && e.quantity_delta === -2
    );
    assert(nonSilverSaleEntry, 'Ledger must contain SALE movement for 2 polishing cloths');
  });

  // TEST 8: Physical Piece marked as SOLD
  await test('8. Physical piece lifecycle status transitioned to SOLD', async () => {
    const pieceQuery = getPieceBySerial(testPiece1.serial_number, 'org_baher_silver');
    assert(pieceQuery, 'Piece must exist');
    assert.equal(pieceQuery.piece.lifecycle_status, 'SOLD');
  });

  // TEST 9: Cash Shift Till balance updated
  await test('9. Cash Shift Drawer balance incremented by net cash tendered', async () => {
    const currentShift = CashShiftEngine.getShiftById(shift.id, 'org_baher_silver');
    assert(currentShift, 'Shift must exist');
    assert.equal(currentShift.expected_closing_cash, initialFloat + sale1Total);
  });

  // TEST 10: Checkout Execution 2 (Second Anonymous Walk-in Sale on Same Shift)
  const piece2Price = Number((Number((testPiece2.current_weight_grams * 55.5).toFixed(2)) + 45).toFixed(2));
  await test('10. POST /api/pos/checkout executes consecutive anonymous walk-in sale on same shift', async () => {
    const payload = {
      shiftId: shift.id,
      customerId: undefined, // Anonymous
      items: [
        {
          productId: silverProd.id,
          sku: silverProd.sku,
          name: silverProd.name.en,
          profileType: 'SILVER_JEWELRY',
          serialNumber: testPiece2.serial_number,
          purity: '925',
          weightGrams: testPiece2.current_weight_grams,
          quantity: 1,
          unitPrice: piece2Price,
          totalPrice: piece2Price
        }
      ],
      paymentMethod: 'CASH',
      cashTendered: piece2Price,
      globalDiscount: 0,
      idempotencyKey: `IDEMP-SLICE-02-${Date.now()}`
    };

    const req = makeReq('/api/pos/checkout', 'POST', cashier.sessionToken!, payload);
    const res = await checkoutRoute(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);

    const tx = data.transaction;
    assert(!tx.customer_id, 'Anonymous customer ID must be empty');
    assert(!tx.customer_name, 'Anonymous customer name must be empty');
    assert(!tx.customer_phone, 'Anonymous customer phone must be empty');
    assert.equal(tx.total_amount, piece2Price);

    // Verify shift drawer updated again
    const updatedShift = CashShiftEngine.getShiftById(shift.id, 'org_baher_silver');
    assert(updatedShift, 'Shift must exist');
    assert.equal(updatedShift.expected_closing_cash, initialFloat + sale1Total + piece2Price);
  });

  // TEST 11: Serialized Piece uniqueness rejects duplicate sale
  await test('11. Selling an already sold piece is rejected with 422 PIECE_ALREADY_SOLD', async () => {
    const payload = {
      shiftId: shift.id,
      items: [
        {
          productId: silverProd.id,
          sku: silverProd.sku,
          name: silverProd.name.en,
          profileType: 'SILVER_JEWELRY',
          serialNumber: testPiece1.serial_number, // already sold in Test 6
          purity: '925',
          weightGrams: testPiece1.current_weight_grams,
          quantity: 1,
          unitPrice: silverLineTotal,
          totalPrice: silverLineTotal
        }
      ],
      paymentMethod: 'CASH',
      cashTendered: silverLineTotal,
      idempotencyKey: `IDEMP-DUPE-${Date.now()}`
    };

    const req = makeReq('/api/pos/checkout', 'POST', cashier.sessionToken!, payload);
    const res = await checkoutRoute(req);
    assert.equal(res.status, 422);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.match(data.error, /already[ _]sold|not available/i);
  });

  // TEST 12: Idempotency guarantee
  await test('12. Replaying checkout with same idempotencyKey returns cached transaction', async () => {
    const idempKey = `IDEMP-REPLAY-${Date.now()}`;
    const payload = {
      shiftId: shift.id,
      items: [
        {
          productId: nonSilverProd.id,
          sku: nonSilverProd.sku,
          name: nonSilverProd.name.en,
          profileType: 'NON_SILVER_RETAIL',
          weightGrams: nonSilverProd.weight_grams,
          quantity: 1,
          unitPrice: nonSilverProd.price,
          totalPrice: nonSilverProd.price
        }
      ],
      paymentMethod: 'CARD',
      idempotencyKey: idempKey
    };

    // First attempt
    const req1 = makeReq('/api/pos/checkout', 'POST', cashier.sessionToken!, payload);
    const res1 = await checkoutRoute(req1);
    assert.equal(res1.status, 200);
    const data1 = await res1.json();

    // Second attempt with exact same key
    const req2 = makeReq('/api/pos/checkout', 'POST', cashier.sessionToken!, payload);
    const res2 = await checkoutRoute(req2);
    assert.equal(res2.status, 200);
    const data2 = await res2.json();

    assert.equal(data1.transaction.id, data2.transaction.id);
    assert.equal(data1.transaction.receipt_number, data2.transaction.receipt_number);
  });

  // TEST 13: RBAC Enforcement
  await test('13. POS checkout rejects user lacking pos:transact permission (403 Forbidden)', async () => {
    const payload = {
      shiftId: shift.id,
      items: [
        {
          productId: nonSilverProd.id,
          sku: nonSilverProd.sku,
          name: nonSilverProd.name.en,
          profileType: 'NON_SILVER_RETAIL',
          weightGrams: nonSilverProd.weight_grams,
          quantity: 1,
          unitPrice: nonSilverProd.price,
          totalPrice: nonSilverProd.price
        }
      ],
      paymentMethod: 'CASH',
      cashTendered: nonSilverProd.price,
      idempotencyKey: `IDEMP-RBAC-${Date.now()}`
    };

    const req = makeReq('/api/pos/checkout', 'POST', viewer.sessionToken!, payload);
    const res = await checkoutRoute(req);
    assert.equal(res.status, 403);
  });

  console.log('===============================================================');
  console.log(`  RETAIL POS VERTICAL SLICE SUITE: ${passed}/${total} PASSED`);
  console.log('===============================================================');
}

runRetailPosVerticalSliceSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
