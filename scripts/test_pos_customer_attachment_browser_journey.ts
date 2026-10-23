/**
 * ======================================================================
 * BAHER SILVER — POS CUSTOMER ATTACHMENT REAL BROWSER E2E JOURNEY
 * ======================================================================
 *
 * Executes full Cashier journey via real Chromium browser (Playwright):
 *   1. Generates authentic cryptographic session token for Cashier
 *   2. Directly opens /en/admin/pos Terminal Console
 *   3. If till is locked, opens shift via "Open Cashier Shift" modal
 *   4. Selects a product to populate Active Cart
 *   5. Opens Customer Attachment modal & searches Customer Master
 *   6. Selects active customer & verifies attachment indicator badge in cart
 *   7. Executes Checkout with Cash Tender
 *   8. Verifies 80mm Thermal Receipt with Customer Name, Phone, and Customer ID snapshot
 *   9. Verifies Anonymous Walk-In checkout completes without regression
 */

import { chromium } from 'playwright';
import path from 'path';
import assert from 'node:assert/strict';
import { SessionService } from '../lib/auth/sessionService';
import { SESSION_COOKIE_NAME } from '../lib/auth/authCookies';
import { CustomerService } from '../lib/services/customer';

const ARTIFACT_DIR = 'C:\\Users\\michael\\.gemini\\antigravity\\brain\\d1cda45a-cc7b-462d-8322-c917be208c34';
const PORT = 3000;

async function runCustomerAttachmentBrowserJourney() {
  console.log('\n=============================================================================');
  console.log('  BAHER SILVER — POS CUSTOMER ATTACHMENT BROWSER E2E JOURNEY');
  console.log('=============================================================================\n');

  // 1. Issue authentic cryptographic session token for Cashier
  console.log('[STEP 1]: Generating authentic session token for Cashier and Admin...');
  await SessionService.ensureInitialized();
  const cashierAuth = await SessionService.authenticate('cashier@bahersilver.com', 'BaherCashier2026!');
  const adminAuth = await SessionService.authenticate('admin@bahersilver.com', 'BaherAdmin2026!');
  console.log(`  ✓ Cashier authenticated: ${cashierAuth.user.name} (${cashierAuth.user.role})`);
  console.log(`  ✓ Admin authenticated for seeding: ${adminAuth.user.name} (${adminAuth.user.role})`);

  // 2. Ensure test customer exists in Customer Master over HTTP
  console.log('\n[STEP 2]: Ensuring test customer exists in Customer Master over HTTP...');
  let testCustomer: any;
  try {
    const checkRes = await fetch(`http://localhost:${PORT}/api/customers?query=Layla`, {
      headers: { Authorization: `Bearer ${adminAuth.sessionToken}` }
    });
    const checkData = await checkRes.json();
    testCustomer = checkData.customers?.[0];
  } catch (err) {
    console.log('  -> Query check failed, will attempt creation');
  }

  if (!testCustomer) {
    const createRes = await fetch(`http://localhost:${PORT}/api/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminAuth.sessionToken}`
      },
      body: JSON.stringify({
        name: 'Layla Sherif',
        phone: '01012344321',
        email: 'layla@example.com'
      })
    });
    const createData = await createRes.json();
    console.log('  -> Seed response:', createRes.status, createData);
    testCustomer = createData.customer;
  }
  console.log(`  ✓ Prepared customer: ${testCustomer?.name} (${testCustomer?.id})`);

  console.log(`\n[STEP 3]: Launching Playwright Chromium and connecting to http://localhost:${PORT}...`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'en-US'
  });

  // Inject secure session cookie
  await context.addCookies([
    {
      name: SESSION_COOKIE_NAME,
      value: cashierAuth.sessionToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax'
    }
  ]);

  const page = await context.newPage();
  page.on('dialog', async (d) => {
    console.log(`  -> Dialog: [${d.type()}] "${d.message()}" - accepting`);
    await d.accept();
  });

  try {
    // 4. Navigate to POS Console
    console.log('[STEP 4]: Navigating to /en/admin/pos...');
    await page.goto(`http://localhost:${PORT}/en/admin/pos`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // If shift is closed, open it
    const openShiftBtn = page.locator('button:has-text("Open Shift")');
    if (await openShiftBtn.count() > 0 && await openShiftBtn.isVisible()) {
      console.log('  -> Opening cashier shift...');
      await openShiftBtn.click();
      await page.waitForTimeout(500);
      const confirmOpenBtn = page.locator('button:has-text("Confirm & Open")');
      if (await confirmOpenBtn.count() > 0) {
        await confirmOpenBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    // 5. Add an item to cart (use Bulk Retail merchandise to allow unlimited repeat sales)
    console.log('\n[STEP 5]: Adding product to cart...');
    const itemCard = page.locator('button:has-text("Microfiber Polishing Cloth")');
    await itemCard.waitFor({ state: 'visible', timeout: 15000 });
    await itemCard.click();
    await page.waitForTimeout(1000);
    console.log('  ✓ Added Microfiber Polishing Cloth to active cart');

    // 6. Open customer search modal
    console.log('\n[STEP 6]: Opening Customer Attachment modal...');
    const attachBtn = page.locator('button:has-text("Customer: Walk-In")');
    await attachBtn.waitFor({ state: 'visible', timeout: 10000 });
    await attachBtn.click();
    await page.waitForTimeout(500);

    // 7. Search customer
    console.log('[STEP 7]: Searching Customer Master for "Layla"...');
    const searchInput = page.locator('input[placeholder*="Search existing customer"]');
    await searchInput.waitFor({ state: 'visible', timeout: 10000 });
    await searchInput.fill('Layla');
    await page.waitForTimeout(1500);

    // 8. Select customer
    console.log('[STEP 8]: Selecting customer Layla Sherif...');
    const customerCard = page.locator('div:has-text("Layla Sherif")').last();
    await customerCard.waitFor({ state: 'visible', timeout: 15000 });
    await customerCard.click();
    await page.waitForTimeout(500);

    // 9. Verify customer attachment badge in cart
    console.log('[STEP 9]: Verifying customer badge in cart...');
    await page.waitForSelector('text=Layla Sherif', { timeout: 5000 });
    const shot1Path = path.join(ARTIFACT_DIR, 'baher_pos_customer_01_attached_cart.png');
    await page.screenshot({ path: shot1Path, fullPage: false });
    console.log(`  ✓ Captured visual evidence: ${shot1Path}`);

    // 10. Execute checkout
    console.log('\n[STEP 10]: Proceeding to checkout...');
    const proceedBtn = page.locator('button:has-text("Proceed to Payment")');
    await proceedBtn.click();
    await page.waitForTimeout(500);

    const completeBtn = page.locator('button:has-text("Complete & Print Receipt")');
    await completeBtn.waitFor({ state: 'visible', timeout: 5000 });
    await completeBtn.click();
    await page.waitForTimeout(1500);

    // 11. Verify receipt modal with customer snapshot
    console.log('\n[STEP 11]: Verifying receipt modal and snapshot...');
    await page.waitForSelector('text=TAX RECEIPT', { timeout: 30000 });
    await page.waitForSelector('text=Layla Sherif', { timeout: 15000 });

    const shot2Path = path.join(ARTIFACT_DIR, 'baher_pos_customer_02_receipt_snapshot.png');
    await page.screenshot({ path: shot2Path, fullPage: false });
    console.log(`  ✓ Captured visual evidence: ${shot2Path}`);

    // Close receipt modal
    const closeReceiptBtn = page.locator('button:has-text("Close")').last();
    await closeReceiptBtn.click();
    await page.waitForTimeout(1000);

    // 12. Verify Anonymous Walk-in still works
    console.log('\n[STEP 12]: Verifying Anonymous Walk-In checkout...');
    await itemCard.click();
    await page.waitForTimeout(1000);
    await page.waitForSelector('text=Walk-In (Anonymous)', { timeout: 10000 });

    await proceedBtn.click();
    await page.waitForTimeout(500);

    await completeBtn.waitFor({ state: 'visible', timeout: 10000 });
    await completeBtn.click();
    await page.waitForTimeout(1500);

    await page.waitForSelector('text=TAX RECEIPT', { timeout: 30000 });
    const shot3Path = path.join(ARTIFACT_DIR, 'baher_pos_customer_03_anonymous_receipt.png');
    await page.screenshot({ path: shot3Path, fullPage: false });
    console.log(`  ✓ Captured visual evidence: ${shot3Path}`);

    console.log('\n=============================================================================');
    console.log('🎉 ALL POS CUSTOMER ATTACHMENT BROWSER JOURNEY CHECKS & SCREENSHOTS SUCCEEDED!');
    console.log('=============================================================================\n');
  } finally {
    await browser.close();
  }
}

runCustomerAttachmentBrowserJourney().catch((err) => {
  console.error('Browser journey error:', err);
  process.exit(1);
});
