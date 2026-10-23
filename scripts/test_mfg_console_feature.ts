/**
 * BAHER REAL BROWNFIELD FEATURE TEST: MANUFACTURING CONSOLE TELEMETRY & RBAC
 *
 * Verifies:
 * 1. GET /api/mfg/orders/console returns valid KPI aggregation.
 * 2. Order telemetry enrichment with stage sequence, WIP, scrap, mass-balance.
 * 3. Status filtering works correctly.
 * 4. RBAC Authorization check blocks restricted roles with 403.
 */

import assert from 'node:assert/strict';
import { handleConsoleTelemetry } from '../lib/services/mfg/mfgConsoleService';
import { GET } from '../app/api/mfg/orders/console/route';
import { NextRequest } from 'next/server';

async function runConsoleFeatureTests() {
  console.log('=============================================================================');
  console.log('BAHER BROWNFIELD FEATURE TEST: MANUFACTURING CONSOLE TELEMETRY & RBAC');
  console.log('=============================================================================');

  // MOCK SUPABASE CLIENT WITH SEEDED TELEMETRY DATA
  const mockDbState = {
    production_orders: [
      {
        id: 'ord-101',
        order_code: 'MO-2026-00101',
        product_id: 'prod-ring',
        variant_id: 'var-ring-54',
        planned_quantity: 100,
        completed_quantity: 99,
        scrapped_quantity: 1,
        status: 'IN_PROGRESS',
        qc_status: 'REWORK_REQUIRED',
        mass_balance_status: 'BALANCED',
        target_date: '2026-09-10',
        created_at: new Date().toISOString(),
        product: { name_ar: 'خاتم فضة ملكي عيار 925', name_en: 'Royal Silver Ring' },
        variant: { sku: 'SKU-RNG-925-54', weight: 15.5 }
      },
      {
        id: 'ord-102',
        order_code: 'MO-2026-00102',
        product_id: 'prod-bracelet',
        variant_id: 'var-brc-01',
        planned_quantity: 50,
        completed_quantity: 0,
        scrapped_quantity: 0,
        status: 'READY_FOR_EXECUTION',
        qc_status: 'NOT_STARTED',
        mass_balance_status: 'NOT_EVALUATED',
        target_date: '2026-09-15',
        created_at: new Date().toISOString(),
        product: { name_ar: 'سوار فضة كلاسيكي', name_en: 'Classic Silver Bracelet' },
        variant: { sku: 'SKU-BRC-925-01', weight: 28.0 }
      }
    ],
    work_center_queue_jobs: [
      {
        id: 'job-1',
        order_id: 'ord-101',
        stage_code: 'POLISHING',
        sequence_no: 40,
        status: 'IN_OPERATION',
        actual_minutes: 35
      }
    ],
    production_order_wip_lots: [
      {
        id: 'wip-1',
        order_id: 'ord-101',
        wip_lot_number: 'WIP-LOT-001',
        quantity: 92,
        weight_grams: 1426.0,
        current_stage_code: 'POLISHING',
        status: 'IN_PROCESS'
      },
      {
        id: 'wip-2',
        order_id: 'ord-101',
        wip_lot_number: 'WIP-LOT-002',
        quantity: 8,
        weight_grams: 124.0,
        current_stage_code: 'POLISHING',
        status: 'REWORK'
      }
    ],
    production_scrap_ledger: [
      {
        id: 'scrap-1',
        order_id: 'ord-101',
        weight_grams: 310.5,
        recovered_pure_silver: 294.975
      }
    ]
  };

  const createMockQuery = (tableName: string) => {
    let data = [...((mockDbState as any)[tableName] || [])];
    const query: any = {
      select: () => query,
      eq: (field: string, value: any) => {
        data = data.filter((row: any) => row[field] === value);
        return query;
      },
      in: (field: string, values: any[]) => {
        data = data.filter((row: any) => values.includes(row[field]));
        return query;
      },
      order: () => query,
      limit: () => query,
      then: (resolve: any) => resolve({ data, error: null })
    };
    return query;
  };

  const mockSupabase = {
    from: (table: string) => createMockQuery(table)
  };

  // TEST 1: Authorized admin request returns 200 with calculated telemetry
  console.log('\n--- TEST 1: Authorized Console Telemetry Retrieval ---');
  const req1 = new NextRequest('http://localhost:3000/api/mfg/orders/console?status=ALL', {
    headers: { 'x-user-role': 'admin' }
  });
  const res1 = await handleConsoleTelemetry(req1, mockSupabase);
  assert.equal(res1.status, 200, 'Expected status 200 for admin');
  const body1 = await res1.json();
  assert.equal(body1.success, true);
  assert.ok(typeof body1.kpis === 'object', 'KPIs object must exist');
  assert.equal(body1.kpis.total_orders, 2, 'Total orders KPI should be 2');
  assert.equal(body1.kpis.active_in_execution, 1, 'Active in execution KPI should be 1');
  assert.equal(body1.kpis.total_wip_pieces, 100, 'Total WIP pieces should be 92+8 = 100');
  assert.equal(body1.kpis.total_scrap_grams, 310.5, 'Total scrap grams should match scrap ledger');

  assert.equal(body1.data.length, 2);
  const ord1 = body1.data.find((o: any) => o.id === 'ord-101');
  assert.equal(ord1.current_stage_code, 'POLISHING');
  assert.equal(ord1.current_sequence_no, 40);
  assert.equal(ord1.active_wip_quantity, 100);
  assert.equal(ord1.qc_status, 'REWORK_REQUIRED');
  assert.equal(ord1.mass_balance_status, 'BALANCED');
  console.log('  ✓ Admin request returned valid enriched telemetry with accurate math');

  // TEST 2: Status filtering
  console.log('\n--- TEST 2: Filter by Status ---');
  const req2 = new NextRequest('http://localhost:3000/api/mfg/orders/console?status=IN_PROGRESS', {
    headers: { 'x-user-role': 'workshop_supervisor' }
  });
  const res2 = await handleConsoleTelemetry(req2, mockSupabase);
  assert.equal(res2.status, 200);
  const body2 = await res2.json();
  assert.equal(body2.success, true);
  assert.equal(body2.data.length, 1);
  assert.equal(body2.data[0].id, 'ord-101');
  assert.equal(body2.data[0].status, 'IN_PROGRESS');
  console.log('  ✓ Status filter correctly isolated IN_PROGRESS order');

  // TEST 3: RBAC Authorization rejection
  console.log('\n--- TEST 3: RBAC Authorization Rejection ---');
  const req3 = new NextRequest('http://localhost:3000/api/mfg/orders/console?status=ALL', {
    headers: { 'x-user-role': 'restricted_guest' }
  });
  const res3 = await handleConsoleTelemetry(req3, mockSupabase);
  assert.equal(res3.status, 403, 'Expected status 403 for restricted_guest');
  const body3 = await res3.json();
  assert.equal(body3.success, false);
  assert.ok(body3.error.includes('403 Forbidden'));
  console.log('  ✓ RBAC boundary rejected restricted_guest with 403');

  // TEST 4: Default GET Entrypoint Data Source Unavailable Check
  console.log('\n--- TEST 4: Default GET Entrypoint Data Source Unavailable Handling ---');
  const req4 = new NextRequest('http://localhost:3000/api/mfg/orders/console');
  const res4 = await GET(req4);
  assert.equal(res4.status, 503, 'Expected status 503 Data Source Unavailable when DB is unreachable');
  const body4 = await res4.json();
  assert.equal(body4.success, false);
  assert.equal(body4.error_code, 'DATA_SOURCE_UNAVAILABLE');
  console.log('  ✓ Standard GET entrypoint correctly reports 503 when live DB connection is offline');

  console.log('\n=============================================================================');
  console.log('BROWNFIELD FEATURE ACCEPTANCE: ALL 4 TESTS PASSED (100% SUCCESS RATE)');
  console.log('=============================================================================');
}

runConsoleFeatureTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
