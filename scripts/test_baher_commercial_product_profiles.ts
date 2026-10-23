import {
  createProduct,
  updateProduct,
  getProducts,
  getProductBySlugOrId,
  lookupByBarcode,
  createPieceForProduct,
  APPROVED_SILVER_PURITIES,
  assertValidSilverPurity
} from '../lib/db/productEngine';
import { ProductionOrderPlanningService } from '../lib/services/erp/ProductionOrderPlanningService';
import type { Product, IndividualPiece } from '../lib/types';

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

async function runPhase4ATests() {
  console.log('\n===============================================================');
  console.log('  BAHER SILVER — PHASE 4A: COMMERCIAL PRODUCT PROFILES SUITE');
  console.log('===============================================================\n');

  const tenantA = 'org_baher_silver';
  const tenantB = 'org_rival_silver';

  // ---------------------------------------------------------------------------
  // SUITE 1: Approved Silver Purities and Validation
  // ---------------------------------------------------------------------------
  await test('Purity Domain', 'Approved Silver Purities contain 800, 925, 900, 950, 999', () => {
    assert(APPROVED_SILVER_PURITIES.includes('800'), 'Must support 800 (Heritage/Classic)');
    assert(APPROVED_SILVER_PURITIES.includes('925'), 'Must support 925');
    assert(APPROVED_SILVER_PURITIES.includes('900'), 'Must support 900');
    assert(APPROVED_SILVER_PURITIES.includes('950'), 'Must support 950');
    assert(APPROVED_SILVER_PURITIES.includes('999'), 'Must support 999');
    assert(APPROVED_SILVER_PURITIES.length === 5, 'Must contain the 5 approved silver purities');
  });

  await test('Purity Domain', 'Purity 800 is accepted as optional heritage silver purity', () => {
    let threw = false;
    try {
      assertValidSilverPurity('800');
    } catch {
      threw = true;
    }
    assert(!threw, 'Purity 800 must be accepted without throwing');
  });

  await test('Purity Domain', 'Gold karats (18k, 21k, 24k) and invalid strings are rejected with 422', () => {
    const invalidList = ['18k', '21k', '24k', 'gold', '750', '585', 'platinum', ''];
    for (const inv of invalidList) {
      let rejected = false;
      try {
        assertValidSilverPurity(inv);
      } catch (err: any) {
        rejected = true;
        assert(err.code === 'INVALID_SILVER_PURITY', `Expected INVALID_SILVER_PURITY for ${inv}`);
        assert(err.status === 422, `Expected status 422 for ${inv}`);
      }
      assert(rejected, `Expected purity ${inv} to be rejected`);
    }
  });

  // ---------------------------------------------------------------------------
  // SUITE 2: Silver Jewelry Profile Lifecycle
  // ---------------------------------------------------------------------------
  let silverProd: Product;

  await test('Silver Profile', 'Successfully creates Silver Jewelry with 925 purity and SIL- SKU', () => {
    silverProd = createProduct({
      organization_id: tenantA,
      name_en: 'Heritage Filigree Silver Ring',
      name_ar: 'خاتم فضة فيليجري تراثي',
      category: 'rings',
      profile_type: 'SILVER_JEWELRY',
      purity: '925',
      weight_grams: 8.4,
      labor_cost: 35,
      price: 150
    });

    assert(silverProd.id, 'Product must have an ID');
    assert(silverProd.profile_type === 'SILVER_JEWELRY', 'profile_type must be SILVER_JEWELRY');
    assert(silverProd.metal === 'silver', 'metal must be silver');
    assert(silverProd.purity === '925', 'purity must be 925');
    assert(silverProd.weight_grams === 8.4, 'weight_grams must match');
    assert(silverProd.labor_cost === 35, 'labor_cost must match');
    assert(silverProd.sku!.includes('-SIL-'), `SKU must contain -SIL-, got ${silverProd.sku}`);
    assert(silverProd.pieces && silverProd.pieces.length === 1, 'Initial piece must be created');
    assert(silverProd.pieces![0].serial_number.includes('BHR-'), `Serial must contain BHR-, got ${silverProd.pieces?.[0]?.serial_number}`);
  });

  await test('Silver Profile', 'Creating silver product with invalid purity fails with 422', () => {
    let rejected = false;
    try {
      createProduct({
        organization_id: tenantA,
        name_en: 'Invalid 750 Gold Karat Cuff',
        profile_type: 'SILVER_JEWELRY',
        purity: '750' as any,
        price: 200
      });
    } catch (err: any) {
      rejected = true;
      assert(err.code === 'INVALID_SILVER_PURITY', `Expected INVALID_SILVER_PURITY, got ${err.code}`);
      assert(err.status === 422, `Expected status 422, got ${err.status}`);
    }
    assert(rejected, 'Expected creation with 750 purity to be rejected');
  });

  // ---------------------------------------------------------------------------
  // SUITE 3: Non-Silver Retail Merchandise Profile Lifecycle
  // ---------------------------------------------------------------------------
  let retailProd: Product;

  await test('Retail Profile', 'Successfully creates Non-Silver Retail Merchandise with RET- SKU and commercial fields', () => {
    retailProd = createProduct({
      organization_id: tenantA,
      name_en: 'Baher Microfiber Silver Polishing Cloth',
      name_ar: 'قماشة باهر ميكروفايبر لتلميع الفضة',
      category: 'accessories',
      profile_type: 'NON_SILVER_RETAIL',
      brand: 'Baher Care',
      model_number: 'BC-CLOTH-01',
      warranty_period: 'None',
      material_description: 'Dual-layer microfiber with anti-tarnish micro-abrasives',
      package_weight_grams: 35,
      tax_classification: 'STANDARD_VAT_14',
      price: 45
    });

    assert(retailProd.id, 'Retail product must have an ID');
    assert(retailProd.profile_type === 'NON_SILVER_RETAIL', 'profile_type must be NON_SILVER_RETAIL');
    assert(retailProd.metal === undefined, 'metal must be undefined for non-silver merchandise');
    assert(retailProd.purity === undefined, 'purity must be undefined for non-silver merchandise');
    assert(retailProd.labor_cost === 0, 'labor_cost must be 0 for retail merchandise');
    assert(retailProd.brand === 'Baher Care', 'Brand must match');
    assert(retailProd.model_number === 'BC-CLOTH-01', 'Model number must match');
    assert(retailProd.package_weight_grams === 35, 'Package weight must match');
    assert(retailProd.sku!.includes('-RET-'), `SKU must contain -RET-, got ${retailProd.sku}`);
  });

  await test('Retail Profile', 'Assigning silver purity to Non-Silver Retail Merchandise is rejected with 422 NON_SILVER_CANNOT_HAVE_PURITY', () => {
    let rejected = false;
    try {
      createProduct({
        organization_id: tenantA,
        name_en: 'Fake Silver Watch',
        profile_type: 'NON_SILVER_RETAIL',
        purity: '925',
        price: 500
      });
    } catch (err: any) {
      rejected = true;
      assert(err.code === 'NON_SILVER_CANNOT_HAVE_PURITY', `Expected NON_SILVER_CANNOT_HAVE_PURITY, got ${err.code}`);
      assert(err.status === 422, `Expected status 422, got ${err.status}`);
    }
    assert(rejected, 'Expected setting purity on non-silver retail merchandise to fail');
  });

  await test('Retail Profile', 'Updating Non-Silver Retail product with purity is rejected with 422', () => {
    let rejected = false;
    try {
      updateProduct(retailProd.id, {
        purity: '925',
        organization_id: tenantA
      });
    } catch (err: any) {
      rejected = true;
      assert(err.code === 'NON_SILVER_CANNOT_HAVE_PURITY', `Expected NON_SILVER_CANNOT_HAVE_PURITY, got ${err.code}`);
      assert(err.status === 422, `Expected status 422, got ${err.status}`);
    }
    assert(rejected, 'Expected update with purity on non-silver to fail');
  });

  // ---------------------------------------------------------------------------
  // SUITE 4: Hard Manufacturing ERP Isolation Guards
  // ---------------------------------------------------------------------------
  await test('Manufacturing Guard', 'Creating manufacturing order with Non-Silver Retail product fails with 422 NON_SILVER_PRODUCT_CANNOT_BE_MANUFACTURED', async () => {
    let rejected = false;
    try {
      await ProductionOrderPlanningService.createDraftOrder({
        organization_id: tenantA,
        branch_id: 'branch-cairo',
        warehouse_id: 'wh-cairo-main',
        product_id: retailProd.id,
        variant_id: 'var-dummy-1',
        planned_quantity: 10,
        target_date: new Date().toISOString()
      });
    } catch (err: any) {
      rejected = true;
      assert(err.code === 'NON_SILVER_PRODUCT_CANNOT_BE_MANUFACTURED', `Expected NON_SILVER_PRODUCT_CANNOT_BE_MANUFACTURED, got ${err.code}`);
      assert(err.status === 422, `Expected status 422, got ${err.status}`);
    }
    assert(rejected, 'Expected non-silver product manufacturing order to be blocked');
  });

  await test('Manufacturing Guard', 'Attaching manufacturing lineage (MO/WIP/batch) to non-silver piece fails with 422', () => {
    let rejected = false;
    try {
      createPieceForProduct({
        product_id: retailProd.id,
        organization_id: tenantA,
        manufacturing_order_id: 'MO-2026-999999'
      });
    } catch (err: any) {
      rejected = true;
      assert(err.code === 'NON_SILVER_PRODUCT_CANNOT_BE_MANUFACTURED', `Expected NON_SILVER_PRODUCT_CANNOT_BE_MANUFACTURED, got ${err.code}`);
      assert(err.status === 422, `Expected status 422, got ${err.status}`);
    }
    assert(rejected, 'Expected piece creation with manufacturing order on non-silver to fail');
  });

  await test('Manufacturing Guard', 'Silver jewelry piece CAN have manufacturing lineage without error', () => {
    const mfgPiece = createPieceForProduct({
      product_id: silverProd.id,
      organization_id: tenantA,
      manufacturing_order_id: 'MO-2026-000101',
      wip_lot_id: 'WIP-LOT-01',
      batch_id: 'BATCH-CAST-01',
      weight_grams: 8.5
    });

    assert(mfgPiece.id, 'Piece must be created');
    assert(mfgPiece.manufacturing_order_id === 'MO-2026-000101', 'MO ID must match');
    assert(mfgPiece.wip_lot_id === 'WIP-LOT-01', 'WIP lot ID must match');
    assert(mfgPiece.batch_id === 'BATCH-CAST-01', 'Batch ID must match');
  });

  // ---------------------------------------------------------------------------
  // SUITE 5: First-Class Barcode Resolution & Filtering
  // ---------------------------------------------------------------------------
  await test('Barcode Resolution', 'lookupByBarcode returns accurate profile_type for Silver Jewelry and Non-Silver Retail', () => {
    const silverLookup = lookupByBarcode(silverProd.barcode!);
    assert(silverLookup && silverLookup.found, 'Silver product must be found by barcode');
    assert(silverLookup?.profile_type === 'SILVER_JEWELRY', 'profile_type must be SILVER_JEWELRY');
    assert(silverLookup?.product.purity === '925', 'Silver purity must be preserved');

    const retailLookup = lookupByBarcode(retailProd.barcode!);
    assert(retailLookup && retailLookup.found, 'Retail product must be found by barcode');
    assert(retailLookup?.profile_type === 'NON_SILVER_RETAIL', 'profile_type must be NON_SILVER_RETAIL');
    assert(retailLookup?.product.purity === undefined, 'Retail product must NOT have purity');
    assert(retailLookup?.product.brand === 'Baher Care', 'Retail brand must be returned');
  });

  await test('Catalog Filtering', 'getProducts filters accurately by profile_type', () => {
    const silverList = getProducts({ profile_type: 'SILVER_JEWELRY', organizationId: tenantA });
    assert(silverList.length > 0, 'Silver list must not be empty');
    assert(silverList.every(p => (p.profile_type || 'SILVER_JEWELRY') === 'SILVER_JEWELRY'), 'All items must be SILVER_JEWELRY');

    const retailList = getProducts({ profile_type: 'NON_SILVER_RETAIL', organizationId: tenantA });
    assert(retailList.length > 0, 'Retail list must not be empty');
    assert(retailList.every(p => p.profile_type === 'NON_SILVER_RETAIL'), 'All items must be NON_SILVER_RETAIL');
  });

  // ---------------------------------------------------------------------------
  // SUITE 6: Multi-Tenant Isolation
  // ---------------------------------------------------------------------------
  await test('Tenant Isolation', 'Cross-tenant lookup returns null and cross-tenant mutation is forbidden', () => {
    const lookupOtherTenant = lookupByBarcode(retailProd.barcode!, tenantB);
    assert(lookupOtherTenant === null, 'Cross-tenant lookup must return null');

    let crossMutationBlocked = false;
    try {
      updateProduct(retailProd.id, {
        organization_id: tenantB,
        name_en: 'Compromised Item'
      });
    } catch (err: any) {
      crossMutationBlocked = true;
      assert(err.status === 403, `Expected status 403, got ${err.status}`);
    }
    assert(crossMutationBlocked, 'Expected cross-tenant product update to be blocked with 403');
  });

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n===============================================================');
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`  PHASE 4A TEST RESULTS: ${passed}/${total} PASSED (${failed} FAILED)`);
  console.log('===============================================================\n');

  if (failed > 0) {
    console.error(`💥 TEST SUITE FAILED with ${failed} failure(s).`);
    process.exit(1);
  } else {
    console.log('🎉 ALL PHASE 4A COMMERCIAL PRODUCT PROFILE TESTS PASSED PERFECTLY!\n');
  }
}

runPhase4ATests().catch((err) => {
  console.error('Fatal error running Phase 4A tests:', err);
  process.exit(1);
});
