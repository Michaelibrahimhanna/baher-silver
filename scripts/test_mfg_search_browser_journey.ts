/**
 * BAHER REAL PLAYWRIGHT BROWSER JOURNEY — MANUFACTURING CONSOLE SEARCH & FILTER
 *
 * Verifies:
 * 1. Manufacturing console renders search input control with correct placeholder.
 * 2. Typing order code ('MO-2026-BRW-01') filters the DOM to display only the matching order.
 * 3. Typing product name ('سوار') dynamically updates the DOM to display only the bracelet order.
 * 4. Typing SKU ('SKU-RNG-925-54') dynamically filters to the ring order.
 * 5. Clearing search input restores all orders to the DOM.
 * 6. Captures screenshot evidence to .mip/evidence/mfg_console_search_verification.png.
 */

import { chromium } from 'playwright';
import http from 'http';
import next from 'next';
import path from 'path';
import fs from 'fs';
import assert from 'node:assert/strict';

async function runSearchBrowserJourney() {
  console.log('=============================================================================');
  console.log('BAHER MANUFACTURING CONSOLE SEARCH & FILTER — REAL BROWSER JOURNEY');
  console.log('=============================================================================');

  const port = 3019;
  const projectDir = path.resolve(__dirname, '..');

  console.log('\n[STEP 1]: Initializing Next.js application runtime...');
  const app = next({ dev: false, dir: projectDir, hostname: 'localhost', port });
  await app.prepare();
  const handle = app.getRequestHandler();

  const mockOrders = [
    {
      id: 'ord-journey-01',
      order_code: 'MO-2026-BRW-01',
      product_name: 'خاتم فضة ملكي عيار 925',
      sku: 'SKU-RNG-925-54',
      planned_quantity: 100,
      completed_quantity: 90,
      scrapped_quantity: 2,
      status: 'IN_PROGRESS',
      current_stage_code: 'POLISHING',
      current_sequence_no: 40,
      active_wip_quantity: 88,
      active_wip_weight_grams: 1364.0,
      total_scrap_weight_grams: 310.5,
      qc_status: 'REWORK_REQUIRED',
      mass_balance_status: 'BALANCED',
      target_date: '2026-09-10',
      created_at: new Date().toISOString()
    },
    {
      id: 'ord-journey-02',
      order_code: 'MO-2026-BRW-02',
      product_name: 'سوار فضة كلاسيكي',
      sku: 'SKU-BRC-925-01',
      planned_quantity: 50,
      completed_quantity: 0,
      scrapped_quantity: 0,
      status: 'READY_FOR_EXECUTION',
      current_stage_code: 'CASTING',
      current_sequence_no: 10,
      active_wip_quantity: 0,
      active_wip_weight_grams: 0.0,
      total_scrap_weight_grams: 0.0,
      qc_status: 'NOT_STARTED',
      mass_balance_status: 'NOT_EVALUATED',
      target_date: '2026-09-15',
      created_at: new Date().toISOString()
    }
  ];

  const server = http.createServer((req, res) => {
    if (req.url?.startsWith('/api/mfg/orders/console')) {
      const parsedUrl = new URL(req.url, `http://localhost:${port}`);
      const statusFilter = parsedUrl.searchParams.get('status') || 'ALL';
      const search = (parsedUrl.searchParams.get('search') || '').trim().toLowerCase();

      let results = mockOrders;
      if (statusFilter !== 'ALL') {
        results = results.filter((o) => o.status === statusFilter);
      }
      if (search) {
        results = results.filter(
          (o) =>
            o.order_code.toLowerCase().includes(search) ||
            o.product_name.toLowerCase().includes(search) ||
            o.sku.toLowerCase().includes(search)
        );
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: true,
          data_state: results.length > 0 ? 'REAL_DATA_PRESENT' : 'NO_DATA',
          kpis: {
            total_orders: results.length,
            active_in_execution: results.filter((o) => o.status === 'IN_PROGRESS').length,
            total_wip_pieces: results.reduce((acc, o) => acc + o.active_wip_quantity, 0),
            total_scrap_grams: results.reduce((acc, o) => acc + o.total_scrap_weight_grams, 0)
          },
          data: results
        })
      );
      return;
    }

    handle(req, res);
  });

  await new Promise<void>((resolve) => server.listen(port, resolve));
  console.log(`  ✓ Next.js server listening on http://localhost:${port}`);

  console.log('\n[STEP 2]: Launching Playwright Chromium Headless Engine...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ar-EG'
  });
  const page = await context.newPage();

  try {
    // 1. Navigate to Manufacturing Console
    console.log('\n[STEP 3]: Navigating to /en/admin/erp/manufacturing...');
    const response = await page.goto(`http://localhost:${port}/en/admin/erp/manufacturing`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    assert.equal(response?.status(), 200, 'Page must return HTTP 200');
    console.log('  ✓ Navigation successful (HTTP 200 OK)');

    // 2. Locate Search Input
    console.log('\n[STEP 4]: Verifying Search Input field in rendered DOM...');
    const searchInput = page.locator('input[data-testid="mfg-search-input"]');
    await searchInput.waitFor({ state: 'visible', timeout: 10000 });
    const placeholder = await searchInput.getAttribute('placeholder');
    assert.ok(placeholder?.includes('بحث بكود الأمر'), 'Search input placeholder must be present');
    console.log(`  ✓ Search input located with placeholder: "${placeholder}"`);

    // Verify baseline contains both orders
    await page.waitForSelector('table', { timeout: 10000 });
    let tableText = await page.textContent('table');
    assert.ok(tableText?.includes('MO-2026-BRW-01'), 'Order 1 must be present initially');
    assert.ok(tableText?.includes('MO-2026-BRW-02'), 'Order 2 must be present initially');
    console.log('  ✓ Baseline table displays all orders prior to search');

    // 3. Test Search by Order Code
    console.log('\n[STEP 5]: Typing order code "MO-2026-BRW-01" into search field...');
    await searchInput.fill('MO-2026-BRW-01');
    await page.waitForTimeout(300);
    tableText = await page.textContent('table');
    assert.ok(tableText?.includes('MO-2026-BRW-01'), 'Matching order MO-2026-BRW-01 must be visible');
    assert.ok(!tableText?.includes('MO-2026-BRW-02'), 'Non-matching order MO-2026-BRW-02 must be hidden');
    console.log('  ✓ Search by Order Code correctly isolated MO-2026-BRW-01');

    // 4. Test Search by Product Name
    console.log('\n[STEP 6]: Typing product name "سوار" into search field...');
    await searchInput.fill('سوار');
    await page.waitForTimeout(300);
    tableText = await page.textContent('table');
    assert.ok(tableText?.includes('MO-2026-BRW-02'), 'Matching order MO-2026-BRW-02 must be visible');
    assert.ok(!tableText?.includes('MO-2026-BRW-01'), 'Non-matching order MO-2026-BRW-01 must be hidden');
    console.log('  ✓ Search by Product Name ("سوار") correctly isolated MO-2026-BRW-02');

    // 5. Test Search by SKU
    console.log('\n[STEP 7]: Typing SKU "SKU-RNG-925-54" into search field...');
    await searchInput.fill('SKU-RNG-925-54');
    await page.waitForTimeout(300);
    tableText = await page.textContent('table');
    assert.ok(tableText?.includes('MO-2026-BRW-01'), 'Matching SKU must display MO-2026-BRW-01');
    assert.ok(!tableText?.includes('MO-2026-BRW-02'), 'Non-matching SKU must hide MO-2026-BRW-02');
    console.log('  ✓ Search by SKU correctly isolated MO-2026-BRW-01');

    // 6. Test Clear Button
    console.log('\n[STEP 8]: Clicking clear button (✕) to restore full list...');
    const clearBtn = page.locator('button[title="مسح البحث"]');
    await clearBtn.click();
    await page.waitForTimeout(300);
    tableText = await page.textContent('table');
    assert.ok(tableText?.includes('MO-2026-BRW-01'), 'Order 1 must return after clear');
    assert.ok(tableText?.includes('MO-2026-BRW-02'), 'Order 2 must return after clear');
    console.log('  ✓ Clear button restored all orders to DOM');

    // 7. Capture Screenshot Evidence
    const evidenceDir = path.resolve(projectDir, '.mip', 'evidence');
    if (!fs.existsSync(evidenceDir)) {
      fs.mkdirSync(evidenceDir, { recursive: true });
    }
    const screenshotPath = path.join(evidenceDir, 'mfg_console_search_verification.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`\n[STEP 9]: Screenshot evidence saved: ${screenshotPath}`);

    console.log('\n=============================================================================');
    console.log('BROWSER VERIFICATION COMPLETE: ALL SEARCH & FILTER INTERACTIONS PASSED');
    console.log('=============================================================================');
  } finally {
    await browser.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    console.log('  ✓ Clean shutdown: Browser and server terminated safely');
  }
}

runSearchBrowserJourney().catch((err) => {
  console.error('Browser search journey failed:', err);
  process.exit(1);
});
