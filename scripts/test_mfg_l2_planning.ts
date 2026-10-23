import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { BOMSnapshotService } from '../lib/services/erp/BOMSnapshotService';
import { MaterialRequirementsEngine } from '../lib/services/erp/MaterialRequirementsEngine';
import { WarehouseReadinessService } from '../lib/services/erp/WarehouseReadinessService';
import { ProductionOrderPlanningService } from '../lib/services/erp/ProductionOrderPlanningService';
import { ManufacturingBusinessQueryService } from '../lib/services/erp/ManufacturingBusinessQueryService';
import type { BOMSnapshotLine, ProductionOrderBOMSnapshot } from '../types/erp';

let passedTests = 0;
let totalTests = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    const result = fn();
    if (result && typeof (result as any).then === 'function') {
      await result;
    }
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}:`, err);
    throw err;
  }
}

/**
 * Mock In-Memory Supabase Client for Full Deterministic L.2 Suite
 */
function createMockSupabase(initialState?: any) {
  const state: Record<string, any[]> = {
    products: initialState?.products || [
      { id: 'prod-001', name_ar: 'خاتم سولتير فضة 925', name_en: 'Solitaire Ring 925' }
    ],
    product_variants: initialState?.product_variants || [
      { id: 'var-001', product_id: 'prod-001', sku: 'RNG-925-SOL-014', weight: 15.5 },
      { id: 'var-002', product_id: 'prod-999', sku: 'MISMATCHED-VAR', weight: 10.0 }
    ],
    boms: initialState?.boms || [
      {
        id: 'bom-v1',
        variant_id: 'var-001',
        version: 1,
        status: 'SUPERSEDED',
        is_active: true,
        effective_from: '2026-01-01T00:00:00Z',
        effective_to: '2026-02-01T00:00:00Z',
        items: [
          {
            id: 'bi-v1-1',
            bom_id: 'bom-v1',
            line_type: 'raw_material',
            quantity: 15.0,
            waste_factor_pct: 3.0,
            unit_of_measure: 'g',
            material: { id: 'mat-001', name: 'حبيبات فضة إيطالي', purity: '925', type: 'raw_material', unit: 'g', standard_cost: 65 }
          }
        ]
      },
      {
        id: 'bom-v2',
        variant_id: 'var-001',
        version: 2,
        status: 'APPROVED',
        is_active: true,
        effective_from: '2026-02-01T00:00:00Z',
        effective_to: null,
        items: [
          {
            id: 'bi-v2-1',
            bom_id: 'bom-v2',
            line_type: 'raw_material',
            quantity: 18.0,
            waste_factor_pct: 3.0,
            unit_of_measure: 'g',
            material: { id: 'mat-001', name: 'حبيبات فضة إيطالي', purity: '925', type: 'raw_material', unit: 'g', standard_cost: 65 }
          },
          {
            id: 'bi-v2-2',
            bom_id: 'bom-v2',
            line_type: 'raw_material',
            quantity: 1.0,
            waste_factor_pct: 2.0,
            unit_of_measure: 'piece',
            gemstone: { id: 'gem-001', code: 'STN-ZIRCON-3MM-WHT', name_ar: 'فص زيركون سويسري 3 مم', purchase_price: 15 }
          },
          {
            id: 'bi-v2-3',
            bom_id: 'bom-v2',
            line_type: 'packaging',
            quantity: 1.0,
            waste_factor_pct: 0.0,
            unit_of_measure: 'piece',
            material: { id: 'mat-pkg-001', name: 'علبة سولتير قطيفة', type: 'packaging', unit: 'piece', standard_cost: 25 }
          }
        ]
      }
    ],
    production_orders: initialState?.production_orders || [],
    production_order_bom_snapshots: initialState?.production_order_bom_snapshots || [],
    production_order_timeline: initialState?.production_order_timeline || [],
    inventory_batches: initialState?.inventory_batches || [
      { id: 'batch-01', material_id: 'mat-001', warehouse_id: 'wh-raw', remaining_quantity: 2500.0 },
      { id: 'batch-02', material_id: 'mat-pkg-001', warehouse_id: 'wh-raw', remaining_quantity: 150.0 }
    ],
    gemstone_lots: initialState?.gemstone_lots || [
      { id: 'lot-01', gemstone_id: 'gem-001', warehouse_id: 'wh-raw', available_quantity: 350, reserved_quantity: 50 }
    ],
    production_material_allocations: initialState?.production_material_allocations || [
      { id: 'alloc-01', item_code: 'حبيبات فضة إيطالي', allocated_quantity: 200.0, consumed_quantity: 0.0, status: 'ALLOCATED' }
    ],
    idempotency_records: initialState?.idempotency_records || [],
    event_store: initialState?.event_store || []
  };

  return {
    state,
    from(table: string) {
      const currentTable = state[table] || [];
      const filters: Array<(row: any) => boolean> = [];
      let sortFn: ((a: any, b: any) => number) | null = null;
      let limitCount: number | null = null;

      const builder: any = {
        select(fields = '*') {
          return builder;
        },
        eq(col: string, val: any) {
          filters.push((row) => row[col] === val);
          return builder;
        },
        in(col: string, vals: any[]) {
          filters.push((row) => vals.includes(row[col]));
          return builder;
        },
        lte(col: string, val: any) {
          filters.push((row) => new Date(row[col]) <= new Date(val));
          return builder;
        },
        order(col: string, { ascending = true } = {}) {
          sortFn = (a, b) => {
            if (a[col] < b[col]) return ascending ? -1 : 1;
            if (a[col] > b[col]) return ascending ? 1 : -1;
            return 0;
          };
          return builder;
        },
        limit(n: number) {
          limitCount = n;
          return builder;
        },
        async single() {
          let rows = currentTable.filter((r: any) => filters.every((f) => f(r)));
          if (sortFn) rows.sort(sortFn);
          if (rows.length === 0) return { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
          return { data: rows[0], error: null };
        },
        insert(rows: any[]) {
          const inserted = rows.map((r) => ({
            id: r.id || `id-${Date.now()}-${Math.random().toString().slice(2, 6)}`,
            created_at: new Date().toISOString(),
            ...r
          }));
          if (!state[table]) state[table] = [];
          state[table].push(...inserted);

          return {
            select(fields = '*') {
              return {
                single: async () => ({ data: inserted[0], error: null }),
                then(resolve: any) {
                  resolve({ data: inserted, error: null });
                }
              };
            },
            then(resolve: any) {
              resolve({ data: inserted.length === 1 ? inserted[0] : inserted, error: null });
            }
          };
        },
        update(updates: any) {
          return {
            eq(col: string, val: any) {
              const rows = currentTable.filter((r: any) => r[col] === val);
              rows.forEach((r: any) => Object.assign(r, updates));
              return {
                data: rows[0] || null,
                error: null,
                select() {
                  return {
                    single: async () => ({ data: rows[0], error: null })
                  };
                }
              };
            }
          };
        },
        then(resolve: any) {
          let rows = currentTable.filter((r: any) => filters.every((f) => f(r)));
          if (sortFn) rows.sort(sortFn);
          if (limitCount !== null) rows = rows.slice(0, limitCount);
          resolve({ data: rows, error: null, count: rows.length });
        }
      };

      return builder;
    }
  } as any;
}

async function runL2PlanningTests() {
  console.log('=============================================================================');
  console.log('BAHER L.2: PRODUCTION ORDER PLANNING & SNAPSHOT-SAFE BOM — ACCEPTANCE SUITE');
  console.log('=============================================================================\n');

  const mockDb = createMockSupabase();

  // ---------------------------------------------------------------------------
  // SUITE 1: PRODUCTION ORDER LIFECYCLE & VALIDATION
  // ---------------------------------------------------------------------------
  console.log('[SUITE 1] Production Order Creation & Validation');

  await test('CRITERION 1: Create Production Order in DRAFT with Code Generation', async () => {
    const order = await ProductionOrderPlanningService.createDraftOrder(
      {
        organization_id: 'org-001',
        branch_id: 'branch-factory-01',
        warehouse_id: 'wh-raw',
        product_id: 'prod-001',
        variant_id: 'var-001',
        planned_quantity: 100,
        priority: 'HIGH',
        target_date: '2026-09-15',
        notes: 'Initial production run'
      },
      mockDb
    );

    assert.equal(order.status, 'DRAFT');
    assert.equal(order.readiness_status, 'NOT_EVALUATED');
    assert.equal(order.reservation_status, 'UNRESERVED');
    assert.equal(order.qc_status, 'NOT_STARTED');
    assert.ok(order.order_code.startsWith('MO-'));
    assert.equal(order.planned_quantity, 100);
  });

  await test('CRITERION 2: Reject Incompatible Product & Variant Combination', async () => {
    await assert.rejects(
      async () => {
        await ProductionOrderPlanningService.createDraftOrder(
          {
            organization_id: 'org-001',
            branch_id: 'branch-factory-01',
            warehouse_id: 'wh-raw',
            product_id: 'prod-001', // prod-001 does not match var-002 (prod-999)
            variant_id: 'var-002',
            planned_quantity: 50,
            target_date: '2026-09-15'
          },
          mockDb
        );
      },
      /Incompatible combination/
    );
  });

  await test('CRITERION 18: Organization Isolation — Reject Missing organization_id', async () => {
    await assert.rejects(
      async () => {
        await ProductionOrderPlanningService.createDraftOrder(
          {
            organization_id: '',
            branch_id: 'branch-factory-01',
            warehouse_id: 'wh-raw',
            product_id: 'prod-001',
            variant_id: 'var-001',
            planned_quantity: 50,
            target_date: '2026-09-15'
          },
          mockDb
        );
      },
      /organization_id, branch_id, and warehouse_id are required/
    );
  });

  await test('CRITERION 19: Branch Isolation — Reject Missing branch_id', async () => {
    await assert.rejects(
      async () => {
        await ProductionOrderPlanningService.createDraftOrder(
          {
            organization_id: 'org-001',
            branch_id: '',
            warehouse_id: 'wh-raw',
            product_id: 'prod-001',
            variant_id: 'var-001',
            planned_quantity: 50,
            target_date: '2026-09-15'
          },
          mockDb
        );
      },
      /organization_id, branch_id, and warehouse_id are required/
    );
  });

  // ---------------------------------------------------------------------------
  // SUITE 2: MASTER BOM RESOLUTION & VERSIONING
  // ---------------------------------------------------------------------------
  console.log('\n[SUITE 2] Approved Master BOM Resolution & Versioning');

  await test('CRITERION 3: Approved BOM Resolution — Only Picks status = APPROVED', async () => {
    const { bom } = await ProductionOrderPlanningService.resolveApprovedBOM(
      'var-001',
      '2026-09-15',
      mockDb
    );
    assert.equal(bom.status, 'APPROVED');
  });

  await test('CRITERION 4: BOM Versioning Resolution — Resolves Latest Version for Date Window', async () => {
    const { bom } = await ProductionOrderPlanningService.resolveApprovedBOM(
      'var-001',
      '2026-09-15',
      mockDb
    );
    assert.equal(bom.version, 2);
  });

  await test('CRITERION 4B: Historical BOM Resolution Prior to Effective Date', async () => {
    const testDb = createMockSupabase({
      boms: [
        {
          id: 'bom-v1-hist',
          variant_id: 'var-hist',
          version: 1,
          status: 'APPROVED',
          is_active: true,
          effective_from: '2026-01-01T00:00:00Z',
          effective_to: '2026-02-01T00:00:00Z',
          items: [{ line_type: 'raw_material', quantity: 15, unit_of_measure: 'g', material: { id: 'm1', name: 'Silver' } }]
        },
        {
          id: 'bom-v2-future',
          variant_id: 'var-hist',
          version: 2,
          status: 'APPROVED',
          is_active: true,
          effective_from: '2026-02-01T00:00:00Z',
          effective_to: null,
          items: [{ line_type: 'raw_material', quantity: 18, unit_of_measure: 'g', material: { id: 'm1', name: 'Silver' } }]
        }
      ]
    });

    const { bom: resolvedJan } = await ProductionOrderPlanningService.resolveApprovedBOM(
      'var-hist',
      '2026-01-15T00:00:00Z',
      testDb
    );
    assert.equal(resolvedJan.version, 1);

    const { bom: resolvedFeb } = await ProductionOrderPlanningService.resolveApprovedBOM(
      'var-hist',
      '2026-02-15T00:00:00Z',
      testDb
    );
    assert.equal(resolvedFeb.version, 2);
  });

  await test('EDGE CASE: Reject when No Approved BOM Exists', async () => {
    await assert.rejects(
      async () => {
        await ProductionOrderPlanningService.resolveApprovedBOM('non-existent-var', '2026-09-15', mockDb);
      },
      /422 Unprocessable Entity: No approved Bill of Materials/
    );
  });

  // ---------------------------------------------------------------------------
  // SUITE 3: MATERIAL REQUIREMENTS CALCULATION ENGINE
  // ---------------------------------------------------------------------------
  console.log('\n[SUITE 3] Pure Material Requirements Engine');

  const testLines: BOMSnapshotLine[] = [
    {
      line_number: 1,
      line_type: 'SILVER',
      item_id: 'mat-001',
      item_code: 'حبيبات فضة إيطالي',
      item_name: 'حبيبات فضة 925',
      base_quantity: 18.0,
      waste_factor_pct: 3.0, // 3% casting sprue loss
      unit_of_measure: 'g'
    },
    {
      line_number: 2,
      line_type: 'STONE',
      item_id: 'gem-001',
      item_code: 'STN-ZIRCON-3MM-WHT',
      item_name: 'فص زيركون أبيض',
      base_quantity: 1.0,
      waste_factor_pct: 2.0, // 2% setting breakage
      unit_of_measure: 'piece'
    },
    {
      line_number: 3,
      line_type: 'PACKAGING',
      item_id: 'mat-pkg-001',
      item_code: 'PKG-LUXURY-BOX',
      item_name: 'علبة قطيفة',
      base_quantity: 1.0,
      waste_factor_pct: 0.0,
      unit_of_measure: 'piece'
    }
  ];

  await test('CRITERION 8: Pure Net Requirement Calculation (planned_quantity * base_quantity)', () => {
    const plannedQty = 100;
    const reqs = MaterialRequirementsEngine.calculateRequirements(plannedQty, testLines);
    assert.equal(reqs[0].net_required_quantity, 1800.0);
    assert.equal(reqs[1].net_required_quantity, 100.0);
    assert.equal(reqs[2].net_required_quantity, 100.0);
  });

  await test('CRITERION 9: Gross Waste Factor Calculation (ROUND(net * (1 + waste/100), 4))', () => {
    const plannedQty = 100;
    const reqs = MaterialRequirementsEngine.calculateRequirements(plannedQty, testLines);
    assert.equal(reqs[0].gross_required_quantity, 1854.0); // 1800 * 1.03
    assert.equal(reqs[1].gross_required_quantity, 102.0);  // 100 * 1.02
    assert.equal(reqs[2].gross_required_quantity, 100.0);  // 100 * 1.00
  });

  await test('CRITERION 10: UOM Correctness (g for Silver, piece for Stones and Packaging)', () => {
    const reqs = MaterialRequirementsEngine.calculateRequirements(50, testLines);
    assert.equal(reqs[0].unit_of_measure, 'g');
    assert.equal(reqs[1].unit_of_measure, 'piece');
    assert.equal(reqs[2].unit_of_measure, 'piece');
  });

  // ---------------------------------------------------------------------------
  // SUITE 4: INVENTORY AVAILABILITY & GEMSTONE NON-DOUBLE-COUNTING
  // ---------------------------------------------------------------------------
  console.log('\n[SUITE 4] Warehouse Stock Availability & Gemstone Non-Double-Counting');

  await test('CRITERION 11: Physical Inventory Calculation from Batches and Lots', async () => {
    const readiness = await WarehouseReadinessService.evaluateReadiness({
      orderId: 'order-001',
      orderCode: 'MO-2026-000101',
      productId: 'prod-001',
      variantId: 'var-001',
      sku: 'RNG-925-SOL-014',
      plannedQuantity: 100,
      warehouseId: 'wh-raw',
      lines: testLines,
      supabaseClient: mockDb
    });

    const silver = readiness.lines.find((l) => l.line_type === 'SILVER');
    assert.ok(silver);
    assert.equal(silver.on_hand_quantity, 2500.0);
  });

  await test('CRITERION 12: Committed Quantity Calculation from Active Allocations', async () => {
    const readiness = await WarehouseReadinessService.evaluateReadiness({
      orderId: 'order-001',
      orderCode: 'MO-2026-000101',
      productId: 'prod-001',
      variantId: 'var-001',
      sku: 'RNG-925-SOL-014',
      plannedQuantity: 100,
      warehouseId: 'wh-raw',
      lines: testLines,
      supabaseClient: mockDb
    });

    const silver = readiness.lines.find((l) => l.line_type === 'SILVER');
    assert.ok(silver);
    assert.equal(silver.committed_quantity, 200.0);
    assert.equal(silver.net_available_quantity, 2300.0);
  });

  await test('CRITERION 13: Gemstone Non-Double-Counting Verification', async () => {
    // gemstone_lots has available_quantity = 350, reserved_quantity = 50
    // Net available must be 350 directly, WITHOUT subtracting 50 a second time!
    const readiness = await WarehouseReadinessService.evaluateReadiness({
      orderId: 'order-001',
      orderCode: 'MO-2026-000101',
      productId: 'prod-001',
      variantId: 'var-001',
      sku: 'RNG-925-SOL-014',
      plannedQuantity: 100,
      warehouseId: 'wh-raw',
      lines: testLines,
      supabaseClient: mockDb
    });

    const stoneLine = readiness.lines.find((l) => l.line_type === 'STONE');
    assert.ok(stoneLine);
    assert.equal(stoneLine.on_hand_quantity, 400.0); // 350 + 50
    assert.equal(stoneLine.committed_quantity, 50.0);
    assert.equal(stoneLine.net_available_quantity, 350.0); // Exactly 350 available
    assert.equal(stoneLine.shortage_quantity, 0.0);       // Required 102 <= 350 available
    assert.equal(stoneLine.status, 'READY');
  });

  await test('CRITERION 14: Shortage Quantity Calculation (MAX(0, gross - net_available))', async () => {
    // Required 1854g, available 2300g -> Shortage = 0
    // Test scenario where stock is short:
    const shortDb = createMockSupabase({
      inventory_batches: [{ id: 'b1', material_id: 'mat-001', warehouse_id: 'wh-raw', remaining_quantity: 1000.0 }],
      production_material_allocations: []
    });

    const readiness = await WarehouseReadinessService.evaluateReadiness({
      orderId: 'order-001',
      orderCode: 'MO-2026-000101',
      productId: 'prod-001',
      variantId: 'var-001',
      sku: 'RNG-925-SOL-014',
      plannedQuantity: 100,
      warehouseId: 'wh-raw',
      lines: testLines,
      supabaseClient: shortDb
    });

    const silver = readiness.lines.find((l) => l.line_type === 'SILVER');
    assert.ok(silver);
    assert.equal(silver.net_available_quantity, 1000.0);
    assert.equal(silver.gross_required_quantity, 1854.0);
    assert.equal(silver.shortage_quantity, 854.0); // 1854 - 1000 = 854.0g short!
    assert.equal(silver.status, 'SHORTAGE');
  });

  await test('CRITERION 15: Overall Readiness Status Calculation', async () => {
    const readyReport = await WarehouseReadinessService.evaluateReadiness({
      orderId: 'order-001',
      orderCode: 'MO-2026-000101',
      productId: 'prod-001',
      variantId: 'var-001',
      sku: 'RNG-925-SOL-014',
      plannedQuantity: 100,
      warehouseId: 'wh-raw',
      lines: testLines,
      supabaseClient: mockDb
    });
    assert.equal(readyReport.overall_status, 'READY');
  });

  // ---------------------------------------------------------------------------
  // SUITE 5: READINESS SEMANTICS & GATING
  // ---------------------------------------------------------------------------
  console.log('\n[SUITE 5] Deterministic Readiness Semantics & Gating Rules');

  await test('CRITERION 16: Primary Silver Shortage Causes Hard-Block (NOT_READY)', async () => {
    const shortSilverDb = createMockSupabase({
      inventory_batches: [
        { id: 'batch-01', material_id: 'mat-001', warehouse_id: 'wh-raw', remaining_quantity: 1000.0 }
      ],
      production_material_allocations: []
    });

    const readiness = await WarehouseReadinessService.evaluateReadiness({
      orderId: 'order-001',
      orderCode: 'MO-2026-000101',
      productId: 'prod-001',
      variantId: 'var-001',
      sku: 'RNG-925-SOL-014',
      plannedQuantity: 100,
      warehouseId: 'wh-raw',
      lines: testLines,
      supabaseClient: shortSilverDb
    });

    assert.equal(readiness.overall_status, 'NOT_READY');
    assert.equal(readiness.critical_silver_available, false);
  });

  await test('CRITERION 17 & 20: Manager Shortage Override Workflow & RBAC Gating', async () => {
    const partialDb = createMockSupabase({
      inventory_batches: [
        { id: 'batch-01', material_id: 'mat-001', warehouse_id: 'wh-raw', remaining_quantity: 2500.0 },
        { id: 'batch-02', material_id: 'mat-pkg-001', warehouse_id: 'wh-raw', remaining_quantity: 10.0 } // 10 boxes on hand vs 100 required
      ],
      production_material_allocations: []
    });

    // 1. Create order
    const ord = await ProductionOrderPlanningService.createDraftOrder(
      {
        organization_id: 'org-001',
        branch_id: 'branch-factory-01',
        warehouse_id: 'wh-raw',
        product_id: 'prod-001',
        variant_id: 'var-001',
        planned_quantity: 100,
        target_date: '2026-09-15'
      },
      partialDb
    );

    await ProductionOrderPlanningService.planOrder(ord.id, partialDb);

    // 2. Confirming WITHOUT override token must fail with 422! (Criterion 20 RBAC)
    await assert.rejects(
      async () => {
        await ProductionOrderPlanningService.confirmOrder(ord.id, {}, partialDb);
      },
      /Order is PARTIALLY_READY. Confirmation requires manager override/
    );

    // 3. Confirming WITH manager override token and justification succeeds! (Criterion 17)
    const confirmedPartial = await ProductionOrderPlanningService.confirmOrder(
      ord.id,
      {
        manager_override_token: 'mfg:order:override_shortage:mgr-007',
        justification: 'Luxury packaging boxes arriving from Cairo warehouse tomorrow morning.',
        actor_id: 'mgr-007'
      },
      partialDb
    );

    assert.equal(confirmedPartial.order.status, 'CONFIRMED');
    assert.equal(confirmedPartial.readinessReport.overall_status, 'PARTIALLY_READY');
  });

  // ---------------------------------------------------------------------------
  // SUITE 6: SNAPSHOT CREATION & IMMUTABILITY (HYBRID ARCHITECTURE)
  // ---------------------------------------------------------------------------
  console.log('\n[SUITE 6] Snapshot Creation, SHA-256 Hashing & Immutability');

  await test('CRITERION 5: Snapshot Creation on Confirm Order', async () => {
    const snapDb = createMockSupabase();
    const order = await ProductionOrderPlanningService.createDraftOrder(
      {
        organization_id: 'org-001',
        branch_id: 'branch-factory-01',
        warehouse_id: 'wh-raw',
        product_id: 'prod-001',
        variant_id: 'var-001',
        planned_quantity: 100,
        target_date: '2026-09-15'
      },
      snapDb
    );
    await ProductionOrderPlanningService.planOrder(order.id, snapDb);
    const confirmResult = await ProductionOrderPlanningService.confirmOrder(order.id, {}, snapDb);

    assert.equal(confirmResult.order.status, 'CONFIRMED');
    assert.ok(confirmResult.snapshot.id);
    assert.ok(confirmResult.snapshot.snapshot_hash);
    assert.equal(confirmResult.snapshot.snapshot_hash.length, 64);
  });

  await test('CRITERION 6 & 7: Snapshot Immutability and BOM Update Isolation', async () => {
    const isoDb = createMockSupabase();
    const order = await ProductionOrderPlanningService.createDraftOrder(
      {
        organization_id: 'org-001',
        branch_id: 'branch-factory-01',
        warehouse_id: 'wh-raw',
        product_id: 'prod-001',
        variant_id: 'var-001',
        planned_quantity: 100,
        target_date: '2026-09-15'
      },
      isoDb
    );
    await ProductionOrderPlanningService.planOrder(order.id, isoDb);
    await ProductionOrderPlanningService.confirmOrder(order.id, {}, isoDb);

    // Mutate Master BOM
    isoDb.state.boms[1].items[0].quantity = 999.0;

    // Load Snapshot -> Must remain isolated at 18.0g!
    const reloaded = await BOMSnapshotService.getSnapshotByOrderId(order.id, isoDb);
    assert.equal(reloaded.snapshot_data[0].base_quantity, 18.0);
  });

  await test('INTEGRITY PROTECTION: Corrupted Snapshot Hash Fails Closed', async () => {
    const corruptDb = createMockSupabase();

    await BOMSnapshotService.createSnapshot({
      orderId: 'order-tamper-test',
      bomId: 'bom-v2',
      bomVersion: 2,
      lines: testLines,
      supabaseClient: corruptDb
    });

    // Tamper with snapshot data behind the scenes
    corruptDb.state.production_order_bom_snapshots[0].snapshot_data[0].base_quantity = 50.0;

    // Loading snapshot must detect hash mismatch and reject!
    await assert.rejects(
      async () => {
        await BOMSnapshotService.getSnapshotByOrderId('order-tamper-test', corruptDb);
      },
      /CRITICAL INTEGRITY VIOLATION/
    );
  });

  // ---------------------------------------------------------------------------
  // SUITE 7: GOVERNANCE, IDEMPOTENCY & AUDIT
  // ---------------------------------------------------------------------------
  console.log('\n[SUITE 7] Governance, Idempotency & Audit Trail');

  await test('CRITERION 21: Audit Trail Persistence (Timeline & Event Store)', async () => {
    const auditDb = createMockSupabase();
    const ord = await ProductionOrderPlanningService.createDraftOrder(
      {
        organization_id: 'org-001',
        branch_id: 'branch-factory-01',
        warehouse_id: 'wh-raw',
        product_id: 'prod-001',
        variant_id: 'var-001',
        planned_quantity: 10,
        target_date: '2026-09-15'
      },
      auditDb
    );
    await ProductionOrderPlanningService.planOrder(ord.id, auditDb);
    await ProductionOrderPlanningService.confirmOrder(ord.id, { actor_id: 'auditor-01' }, auditDb);

    const timelineEntries = auditDb.state.production_order_timeline;
    assert.ok(timelineEntries.length >= 3);
    assert.ok(timelineEntries.some((t: any) => t.action === 'CREATE_DRAFT'));
    assert.ok(timelineEntries.some((t: any) => t.action === 'PLAN_ORDER'));
    assert.ok(timelineEntries.some((t: any) => t.action === 'CONFIRM_ORDER'));

    const events = auditDb.state.event_store;
    assert.ok(events.length >= 1);
    assert.equal(events[0].event_name, 'ProductionOrderConfirmed');
  });

  await test('CRITERION 22: Idempotency Key Prevents Duplicate Confirmation', async () => {
    const idemDb = createMockSupabase();
    const idemKey = 'idem-key-confirm-001';

    const ord = await ProductionOrderPlanningService.createDraftOrder(
      {
        organization_id: 'org-001',
        branch_id: 'branch-factory-01',
        warehouse_id: 'wh-raw',
        product_id: 'prod-001',
        variant_id: 'var-001',
        planned_quantity: 50,
        target_date: '2026-09-15'
      },
      idemDb
    );
    await ProductionOrderPlanningService.planOrder(ord.id, idemDb);

    const res1 = await ProductionOrderPlanningService.confirmOrder(
      ord.id,
      { idempotency_key: idemKey, actor_id: 'user-01' },
      idemDb
    );

    const snapshotCountBefore = idemDb.state.production_order_bom_snapshots.length;

    const res2 = await ProductionOrderPlanningService.confirmOrder(
      ord.id,
      { idempotency_key: idemKey, actor_id: 'user-01' },
      idemDb
    );

    const snapshotCountAfter = idemDb.state.production_order_bom_snapshots.length;

    assert.equal(snapshotCountBefore, snapshotCountAfter); // No duplicate snapshot!
    assert.equal(res1.order.id, res2.order.id);
  });

  await test('CRITERION 23: Transaction Rollback Integrity on Snapshot Failure', async () => {
    const failDb = createMockSupabase();
    const originalFrom = failDb.from.bind(failDb);

    const ord = await ProductionOrderPlanningService.createDraftOrder(
      {
        organization_id: 'org-001',
        branch_id: 'branch-factory-01',
        warehouse_id: 'wh-raw',
        product_id: 'prod-001',
        variant_id: 'var-001',
        planned_quantity: 50,
        target_date: '2026-09-15'
      },
      failDb
    );
    await ProductionOrderPlanningService.planOrder(ord.id, failDb);

    // Simulate DB failure specifically on snapshot table insertion
    failDb.from = (table: string) => {
      if (table === 'production_order_bom_snapshots') {
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({ data: null, error: { message: 'Database disk I/O failure' } })
            })
          })
        } as any;
      }
      return originalFrom(table);
    };

    // Confirm fails -> Order status remains PLANNED
    await assert.rejects(
      async () => {
        await ProductionOrderPlanningService.confirmOrder(ord.id, {}, failDb);
      },
      /Failed to create BOM snapshot: Database disk I\/O failure/
    );

    const orderAfterFailure = failDb.state.production_orders.find((o: any) => o.id === ord.id);
    assert.equal(orderAfterFailure.status, 'PLANNED'); // Not CONFIRMED!
  });

  await test('CRITERION 24: Zero Reservation Side Effects in L.2', async () => {
    const initialLotAvailable = mockDb.state.gemstone_lots[0].available_quantity;
    const initialLotReserved = mockDb.state.gemstone_lots[0].reserved_quantity;
    const initialBatchRemaining = mockDb.state.inventory_batches[0].remaining_quantity;

    const o = await ProductionOrderPlanningService.createDraftOrder(
      {
        organization_id: 'org-001',
        branch_id: 'branch-factory-01',
        warehouse_id: 'wh-raw',
        product_id: 'prod-001',
        variant_id: 'var-001',
        planned_quantity: 100,
        target_date: '2026-09-15'
      },
      mockDb
    );
    await ProductionOrderPlanningService.planOrder(o.id, mockDb);
    await ProductionOrderPlanningService.getReadinessReport(o.id, mockDb);

    // Verify physical inventory lot quantities are 100% UNTOUCHED!
    assert.equal(mockDb.state.gemstone_lots[0].available_quantity, initialLotAvailable);
    assert.equal(mockDb.state.gemstone_lots[0].reserved_quantity, initialLotReserved);
    assert.equal(mockDb.state.inventory_batches[0].remaining_quantity, initialBatchRemaining);
  });

  await test('CRITERION 25: Block Future Milestone Transitions (IN_PROGRESS, QC, etc. Throw 422)', () => {
    assert.throws(
      () => ProductionOrderPlanningService.assertValidL2Transition('IN_PROGRESS'),
      /422 Unprocessable Entity: Transition to 'IN_PROGRESS' belongs to future milestones/
    );
    assert.throws(
      () => ProductionOrderPlanningService.assertValidL2Transition('QUALITY_CHECK'),
      /422 Unprocessable Entity: Transition to 'QUALITY_CHECK' belongs to future milestones/
    );
    assert.throws(
      () => ProductionOrderPlanningService.assertValidL2Transition('COMPLETED'),
      /422 Unprocessable Entity: Transition to 'COMPLETED' belongs to future milestones/
    );
  });

  // ---------------------------------------------------------------------------
  // SUITE 8: AI / VOICE BUSINESS QUERY READ-ONLY CONTRACTS
  // ---------------------------------------------------------------------------
  console.log('\n[SUITE 8] AI & Voice Read-Only Business Query Tooling');

  await test('AI QUERY 1: queryOrderDetails Returns Grounded Envelope', async () => {
    const aiDb = createMockSupabase();
    const ord = await ProductionOrderPlanningService.createDraftOrder(
      {
        organization_id: 'org-001',
        branch_id: 'branch-factory-01',
        warehouse_id: 'wh-raw',
        product_id: 'prod-001',
        variant_id: 'var-001',
        planned_quantity: 25,
        target_date: '2026-09-15'
      },
      aiDb
    );

    const result = await ManufacturingBusinessQueryService.queryOrderDetails(ord.id, aiDb);
    assert.equal(result.source, 'canonical_database');
    assert.equal(result.verified, true);
    assert.equal(result.query_type, 'ORDER_DETAILS_QUERY');
    assert.equal(result.data.id, ord.id);
    assert.equal(result.evidence.record_count, 1);
  });

  await test('AI QUERY 2: queryOrderReadiness & queryMissingMaterials', async () => {
    const aiDb = createMockSupabase({
      inventory_batches: [
        { id: 'b1', material_id: 'mat-001', warehouse_id: 'wh-raw', remaining_quantity: 2500.0 },
        { id: 'b2', material_id: 'mat-pkg-001', warehouse_id: 'wh-raw', remaining_quantity: 5.0 } // 5 boxes on hand vs 25 required
      ],
      production_material_allocations: []
    });

    const ord = await ProductionOrderPlanningService.createDraftOrder(
      {
        organization_id: 'org-001',
        branch_id: 'branch-factory-01',
        warehouse_id: 'wh-raw',
        product_id: 'prod-001',
        variant_id: 'var-001',
        planned_quantity: 25,
        target_date: '2026-09-15'
      },
      aiDb
    );
    await ProductionOrderPlanningService.planOrder(ord.id, aiDb);

    const readinessResult = await ManufacturingBusinessQueryService.queryOrderReadiness(ord.id, aiDb);
    assert.equal(readinessResult.data.overall_status, 'PARTIALLY_READY');

    const missingResult = await ManufacturingBusinessQueryService.queryMissingMaterials(ord.id, aiDb);
    assert.equal(missingResult.data.missing_count, 1);
    assert.equal(missingResult.data.missing_items[0].line_type, 'PACKAGING');
    assert.equal(missingResult.data.missing_items[0].shortage, 20.0); // 25 - 5 = 20 missing
  });

  console.log('\n=============================================================================');
  console.log(`ACCEPTANCE RESULTS: ${passedTests}/${totalTests} Tests Passed (100% Success Rate)`);
  console.log('STATUS: Milestone L.2 Production Order Planning & Snapshot Engine Fully Validated.');
  console.log('=============================================================================\n');
}

runL2PlanningTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
