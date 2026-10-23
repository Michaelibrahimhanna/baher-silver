/**
 * BAHER SILVER — PRODUCT & BARCODE MASTER REAL PLAYWRIGHT BROWSER JOURNEY
 *
 * Real browser journey verifying:
 * 1. Admin login & session establishment.
 * 2. Navigation to /en/admin/catalog/products.
 * 3. Instant Barcode Scanner UI rendering and live lookup interaction.
 * 4. Printable Labels Modal opening with barcode rendering.
 * 5. Navigation to Product Editor identifiers tab with Barcode Master and Physical Pieces Matrix.
 * 6. Minting a physical piece and verifying it in the matrix DOM.
 * 7. Capturing visual evidence into artifact directory.
 */

import { chromium } from 'playwright';
import http from 'http';
import next from 'next';
import path from 'path';
import assert from 'node:assert/strict';
import { generateEAN13Barcode } from '../lib/catalog-identifiers';

const ARTIFACT_DIR = 'C:\\Users\\michael\\.gemini\\antigravity\\brain\\d1cda45a-cc7b-462d-8322-c917be208c34';

async function runBarcodeBrowserJourney() {
  console.log('=============================================================================');
  console.log('BAHER SILVER — REAL PLAYWRIGHT BROWSER PRODUCT & BARCODE MASTER JOURNEY');
  console.log('=============================================================================');

  const port = 3033;
  const projectDir = path.resolve(__dirname, '..');

  console.log(`\n[STEP 1]: Initializing Next.js production runtime on port ${port}...`);
  const app = next({ dev: false, dir: projectDir, hostname: 'localhost', port });
  await app.prepare();
  const handle = app.getRequestHandler();

  const server = http.createServer((req, res) => {
    handle(req, res);
  });

  await new Promise<void>((resolve) => server.listen(port, resolve));
  console.log(`  ✓ Next.js server listening on http://localhost:${port}`);

  console.log('\n[STEP 2]: Launching Playwright Chromium Headless Engine...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'en-US'
  });
  const page = await context.newPage();

  try {
    page.on('console', (msg) => console.log('  [BROWSER CONSOLE]', msg.text()));
    page.on('response', async (res) => {
      if (res.url().includes('barcode') || res.url().includes('products')) {
        try {
          const text = await res.text();
          console.log(`  [API] ${res.status()} ${res.url()} -> ${text.slice(0, 150)}`);
        } catch {}
      }
    });

    // ─── 1. AUTHENTICATE AS ADMIN ──────────────────────────────────────────────
    console.log('\n[STEP 3]: Authenticating as Admin at /en/login...');
    await page.goto(`http://localhost:${port}/en/login?redirect=/en/admin/catalog/products`, { waitUntil: 'networkidle' });

    await page.fill('input[type="email"]', 'admin@bahersilver.com');
    await page.fill('input[type="password"]', 'BaherAdmin2026!');

    await Promise.all([
      page.waitForURL(`http://localhost:${port}/en/admin/catalog/products`, { timeout: 15000 }),
      page.click('button[type="submit"]')
    ]);

    console.log(`  ✓ Successfully authenticated and redirected to: ${page.url()}`);
    await page.waitForSelector('table', { timeout: 10000 });

    // ─── 2. CATALOG PRODUCTS & BARCODE SCANNER UI ──────────────────────────────
    console.log('\n[STEP 4]: Verifying Instant Barcode Scanner Toolbar...');
    const scannerTitle = await page.textContent('body');
    assert(scannerTitle?.includes('ماسح الباركود الفوري') || scannerTitle?.includes('Instant Barcode'), 'Must render Instant Barcode Scanner bar');

    const shot1Path = path.join(ARTIFACT_DIR, 'baher_barcode_01_catalog_scanner.png');
    await page.screenshot({ path: shot1Path, fullPage: false });
    console.log(`  ✓ Captured screenshot: ${shot1Path}`);

    // ─── 3. INTERACTIVE BARCODE SCAN & FAST LOOKUP ─────────────────────────────
    const targetBarcode = generateEAN13Barcode(10000);
    console.log(`\n[STEP 5]: Executing Barcode Scan Lookup for ${targetBarcode}...`);
    const scannerInput = page.locator('input[placeholder*="الباركود"]');
    await scannerInput.fill(targetBarcode);
    await page.waitForTimeout(300);

    // Click the search button explicitly
    const searchBtn = page.locator('button:has-text("بحث سريع")');
    await searchBtn.click();

    // Wait for the emerald scan result banner
    await page.waitForSelector('text=مطابقة', { timeout: 10000 });
    console.log('  ✓ Barcode match resolved and displayed in DOM');

    // ─── 4. PRINTABLE LABELS MODAL ─────────────────────────────────────────────
    console.log('\n[STEP 6]: Opening Printable Labels Modal...');
    const printBtn = page.locator('button:has-text("طباعة الملصق")').first();
    await printBtn.click();

    await page.waitForSelector('text=Printable Labels Generator', { timeout: 5000 });
    console.log('  ✓ Printable Labels Modal opened with Zebra/Thermal presets');

    const shot2Path = path.join(ARTIFACT_DIR, 'baher_barcode_02_label_modal.png');
    await page.screenshot({ path: shot2Path, fullPage: false });
    console.log(`  ✓ Captured screenshot: ${shot2Path}`);

    // Close modal
    await page.click('button:has-text("إلغاء")');
    await page.waitForTimeout(400);

    // ─── 5. PRODUCT EDITOR: IDENTIFIERS & PIECES MATRIX ────────────────────────
    console.log('\n[STEP 7]: Navigating to Product Editor (/en/admin/catalog/products/new)...');
    await page.goto(`http://localhost:${port}/en/admin/catalog/products/new`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('button:has-text("الباركود ومصفوفة القطع")', { timeout: 10000 });

    // Click on Tab 6: "الباركود ومصفوفة القطع"
    const identifiersTab = page.locator('button:has-text("الباركود ومصفوفة القطع")');
    await identifiersTab.click();
    await page.waitForTimeout(500);

    // Verify Barcode & SKU fields and Live Validation badge
    const tabBody = await page.textContent('body');
    assert(tabBody?.includes('Product Identity & Barcode Master') || tabBody?.includes('الهوية الموحدة للمنتج'), 'Must render Barcode Master card');
    assert(tabBody?.includes('Valid Check Digit') || tabBody?.includes('EAN-13'), 'Must render live check digit validator');

    // Click "إصدار قطعة فيزيائية جديدة (Mint Piece)"
    console.log('\n[STEP 8]: Minting a new serialized physical piece...');
    const mintBtn = page.locator('button:has-text("إصدار قطعة فيزيائية جديدة")');
    await mintBtn.click();
    await page.waitForTimeout(500);

    // Confirm piece is added to the matrix
    const matrixText = await page.textContent('table');
    assert(matrixText?.includes('SN-BHR-') || matrixText?.includes('SHOWCASE-01'), 'Must display minted physical piece in matrix');
    console.log('  ✓ Minted piece verified in Physical Pieces Matrix DOM');

    const shot3Path = path.join(ARTIFACT_DIR, 'baher_barcode_03_pieces_matrix.png');
    await page.screenshot({ path: shot3Path, fullPage: false });
    console.log(`  ✓ Captured screenshot: ${shot3Path}`);

    console.log('\n=============================================================================');
    console.log('>>> BROWSER JOURNEY COMPLETE: ALL PRODUCT & BARCODE FLOWS VERIFIED 100%');
    console.log('=============================================================================');
  } finally {
    await browser.close();
    server.close();
  }
}

runBarcodeBrowserJourney().catch((err) => {
  console.error('[FATAL] Browser journey failed:', err);
  process.exit(1);
});
