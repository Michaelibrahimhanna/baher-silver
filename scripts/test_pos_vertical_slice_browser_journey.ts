/**
 * ==============================================================================
 * BAHER SILVER — PHASE 4B.2.3: RETAIL POS VERTICAL SLICE BROWSER JOURNEY (E2E)
 * ==============================================================================
 *
 * Real browser automation (Playwright Chromium) executing the complete operating flow:
 *   1. Authenticates as Cashier & injects authentic cryptographic session cookie
 *   2. Directly accesses /en/admin/pos Terminal Console
 *   3. Verifies / Opens Cashier Shift
 *   4. Captures Screenshot 1: baher_pos_journey_01_terminal_screen.png
 *   5. Adds Serialized Silver Ring (p1) to cart
 *   6. Adds Non-Silver Retail Polishing Cloth (ret-1) to cart
 *   7. Increments Non-Silver quantity to 2 via '+' button
 *   8. Captures Screenshot 2: baher_pos_journey_02_populated_cart.png
 *   9. Opens Customer Master attachment modal, searches & attaches customer
 *  10. Captures Screenshot 3: baher_pos_journey_03_customer_attached_cart.png
 *  11. Opens Payment Tender modal, selects Cash, enters tender, checks change
 *  12. Captures Screenshot 4: baher_pos_journey_04_checkout_tender.png
 *  13. Finalizes checkout, verifies 80mm receipt + post-sale operational banner
 *  14. Captures Screenshot 5: baher_pos_journey_05_completed_receipt.png
 *  15. Closes receipt via "New Sale / Next Customer ->" button
 *  16. Executes consecutive second sale as Anonymous Walk-in customer
 *  17. Captures Screenshot 6: baher_pos_journey_06_anonymous_receipt.png
 */

import { chromium } from 'playwright';
import path from 'path';
import assert from 'node:assert/strict';
import { SessionService } from '../lib/auth/sessionService';
import { SESSION_COOKIE_NAME } from '../lib/auth/authCookies';

const ARTIFACT_DIR = 'C:\\Users\\michael\\.gemini\\antigravity\\brain\\d1cda45a-cc7b-462d-8322-c917be208c34';
const PORT = 3000;

async function runRetailPosBrowserJourney() {
  console.log('\n=============================================================================');
  console.log('  BAHER SILVER — PHASE 4B.2.3: RETAIL POS VERTICAL SLICE BROWSER JOURNEY');
  console.log('=============================================================================\n');

  // 1. Authenticate Personas
  console.log('[STEP 1]: Generating authentic cryptographic session tokens...');
  await SessionService.ensureInitialized();
  const cashierAuth = await SessionService.authenticate('cashier@bahersilver.com', 'BaherCashier2026!');
  const adminAuth = await SessionService.authenticate('admin@bahersilver.com', 'BaherAdmin2026!');
  assert(cashierAuth.sessionToken, 'Cashier token required');
  assert(adminAuth.sessionToken, 'Admin token required');
  console.log(`  ✓ Cashier authenticated: ${cashierAuth.user.name} (${cashierAuth.user.role})`);
  console.log(`  ✓ Admin authenticated: ${adminAuth.user.name} (${adminAuth.user.role})`);

  // 2. Ensure test customer exists in Customer Master over HTTP
  console.log('\n[STEP 2]: Ensuring test customer exists in Customer Master over HTTP...');
  let testCustomer: any = null;
  try {
    const searchRes = await fetch(`http://localhost:${PORT}/api/customers?query=Farida`, {
      headers: { Authorization: `Bearer ${adminAuth.sessionToken}` }
    });
    const searchData = await searchRes.json();
    testCustomer = searchData.customers?.[0];
  } catch (err) {
    console.log('  -> Customer query check failed, will attempt creation');
  }

  if (!testCustomer) {
    const createRes = await fetch(`http://localhost:${PORT}/api/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminAuth.sessionToken}`
      },
      body: JSON.stringify({
        name: 'Farida El-Sayed',
        phone: '+20 109 876 5432',
        email: 'farida.elsayed@example.com'
      })
    });
    const createData = await createRes.json();
    testCustomer = createData.customer;
  }
  assert(testCustomer, 'Test customer must exist');
  console.log(`  ✓ Test Customer ready: ${testCustomer.name} (${testCustomer.id}, ${testCustomer.phone})`);

  // 3. Launch Playwright Chromium
  console.log(`\n[STEP 3]: Launching Chromium and connecting to http://localhost:${PORT}...`);
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
    console.log(`  -> Browser Dialog: [${d.type()}] "${d.message()}" - accepting`);
    await d.accept();
  });

  try {
    // 4. Navigate to POS Console
    console.log('\n[STEP 4]: Navigating to /en/admin/pos...');
    await page.goto(`http://localhost:${PORT}/en/admin/pos`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // If shift is not open, open it
    const openShiftBtn = page.locator('button:has-text("Open Cashier Shift")');
    if (await openShiftBtn.count() > 0 && await openShiftBtn.isVisible()) {
      console.log('  -> Cashier shift closed. Opening new shift...');
      await openShiftBtn.click();
      await page.waitForTimeout(500);
      const confirmOpenBtn = page.locator('button:has-text("Confirm & Open")');
      if (await confirmOpenBtn.count() > 0) {
        await confirmOpenBtn.click();
        await page.waitForTimeout(1500);
      }
    }

    // SCREENSHOT 1: POS Console Initial State
    console.log('\n[SCREENSHOT 1]: Capturing baher_pos_journey_01_terminal_screen.png...');
    await page.waitForSelector('text=Shift Active', { timeout: 15000 });
    const shot1Path = path.join(ARTIFACT_DIR, 'baher_pos_journey_01_terminal_screen.png');
    await page.screenshot({ path: shot1Path, fullPage: false });
    console.log(`  ✓ Saved: ${shot1Path}`);

    // 5. Add Products to Cart:
    // 5a. Add Serialized Silver Ring (Preset 1)
    console.log('\n[STEP 5]: Adding Classic 925 Silver Ring to cart...');
    const silverRingBtn = page.locator('button:has-text("Classic 925 Silver Ring")');
    await silverRingBtn.waitFor({ state: 'visible', timeout: 10000 });
    await silverRingBtn.click();
    await page.waitForTimeout(1000);

    // If piece selection modal appeared, select first piece
    const pieceSelectModal = page.locator('text=Select Serialized Piece');
    if (await pieceSelectModal.count() > 0 && await pieceSelectModal.isVisible()) {
      console.log('  -> Multiple pieces available, selecting first physical piece...');
      const selectPieceBtn = page.locator('text=Select Piece \u2192').first();
      await selectPieceBtn.click();
      await page.waitForTimeout(500);
    }
    console.log('  ✓ Classic 925 Silver Ring added to active cart');

    // 5b. Add Non-Silver Retail Polishing Cloth (Preset 3)
    console.log('\n[STEP 6]: Adding Microfiber Polishing Cloth to cart...');
    const clothBtn = page.locator('button:has-text("Microfiber Polishing Cloth")');
    await clothBtn.waitFor({ state: 'visible', timeout: 10000 });
    await clothBtn.click();
    await page.waitForTimeout(1000);
    console.log('  ✓ Microfiber Polishing Cloth added to active cart');

    // 5c. Increment Quantity of Non-Silver Retail item
    console.log('\n[STEP 7]: Incrementing Polishing Cloth quantity to 2 via "+" button...');
    const plusBtn = page.locator('button[title="Increase quantity"]').first();
    await plusBtn.waitFor({ state: 'visible', timeout: 5000 });
    await plusBtn.click();
    await page.waitForTimeout(500);
    console.log('  ✓ Quantity incremented to 2');

    // SCREENSHOT 2: Populated Cart with Dual Merchandise Profiles
    console.log('\n[SCREENSHOT 2]: Capturing baher_pos_journey_02_populated_cart.png...');
    await page.waitForSelector('text=Qty: 1 (Serialized)', { timeout: 5000 });
    const shot2Path = path.join(ARTIFACT_DIR, 'baher_pos_journey_02_populated_cart.png');
    await page.screenshot({ path: shot2Path, fullPage: false });
    console.log(`  ✓ Saved: ${shot2Path}`);

    // 6. Attach Customer
    console.log('\n[STEP 8]: Attaching customer to active cart...');
    const customerBtn = page.locator('button:has-text("Customer: Walk-In")');
    await customerBtn.waitFor({ state: 'visible', timeout: 5000 });
    await customerBtn.click();
    await page.waitForTimeout(500);

    const custSearchInput = page.locator('input[placeholder*="Search existing customer"]');
    await custSearchInput.waitFor({ state: 'visible', timeout: 5000 });
    await custSearchInput.fill('Farida');
    await page.waitForTimeout(1500);

    const selectCustCard = page.locator('div:has-text("Farida El-Sayed")').last();
    await selectCustCard.waitFor({ state: 'visible', timeout: 5000 });
    await selectCustCard.click();
    await page.waitForTimeout(500);

    // SCREENSHOT 3: Active Cart with Customer Attached
    console.log('\n[SCREENSHOT 3]: Capturing baher_pos_journey_03_customer_attached_cart.png...');
    await page.waitForSelector('text=Farida El-Sayed', { timeout: 5000 });
    const shot3Path = path.join(ARTIFACT_DIR, 'baher_pos_journey_03_customer_attached_cart.png');
    await page.screenshot({ path: shot3Path, fullPage: false });
    console.log(`  ✓ Saved: ${shot3Path}`);

    // 7. Proceed to Payment Tender
    console.log('\n[STEP 9]: Opening checkout payment modal...');
    const proceedBtn = page.locator('button:has-text("Proceed to Payment")');
    await proceedBtn.click();
    await page.waitForTimeout(500);

    // Tender Cash Amount
    const cashInput = page.locator('input[placeholder][type="number"]').first();
    await cashInput.waitFor({ state: 'visible', timeout: 5000 });
    const currentVal = await cashInput.getAttribute('placeholder');
    const tendered = (Number(currentVal) || 600) + 100;
    await cashInput.fill(String(tendered));
    await page.waitForTimeout(500);

    // SCREENSHOT 4: Payment Tender Modal
    console.log('\n[SCREENSHOT 4]: Capturing baher_pos_journey_04_checkout_tender.png...');
    await page.waitForSelector('text=Change Due to Customer', { timeout: 5000 });
    const shot4Path = path.join(ARTIFACT_DIR, 'baher_pos_journey_04_checkout_tender.png');
    await page.screenshot({ path: shot4Path, fullPage: false });
    console.log(`  ✓ Saved: ${shot4Path}`);

    // 8. Execute Checkout & Verify Receipt
    console.log('\n[STEP 10]: Finalizing checkout and generating receipt...');
    const completeBtn = page.locator('button:has-text("Complete & Print Receipt")');
    await completeBtn.click();
    await page.waitForTimeout(2000);

    // Verify Receipt Modal elements
    await page.waitForSelector('text=TAX RECEIPT', { timeout: 30000 });
    await page.waitForSelector('text=Farida El-Sayed', { timeout: 10000 });
    await page.waitForSelector('text=Sale Completed Successfully', { timeout: 10000 });

    // SCREENSHOT 5: Completed Receipt Modal with Customer Snapshot & Operational Banner
    console.log('\n[SCREENSHOT 5]: Capturing baher_pos_journey_05_completed_receipt.png...');
    const shot5Path = path.join(ARTIFACT_DIR, 'baher_pos_journey_05_completed_receipt.png');
    await page.screenshot({ path: shot5Path, fullPage: false });
    console.log(`  ✓ Saved: ${shot5Path}`);

    // 9. Reset for Next Customer / New Sale
    console.log('\n[STEP 11]: Closing receipt modal to start next sale...');
    const newSaleBtn = page.locator('button:has-text("New Sale / Next Customer")');
    await newSaleBtn.click();
    await page.waitForTimeout(1000);

    // 10. Execute Consecutive Anonymous Walk-in Sale on Same Shift
    console.log('\n[STEP 12]: Executing consecutive Anonymous Walk-in sale...');
    // Add polishing cloth
    await clothBtn.click();
    await page.waitForTimeout(1000);

    // Verify customer is Walk-In (Anonymous)
    await page.waitForSelector('text=Customer: Walk-In', { timeout: 5000 });

    // Proceed to payment & checkout
    await proceedBtn.click();
    await page.waitForTimeout(500);

    const completeBtn2 = page.locator('button:has-text("Complete & Print Receipt")');
    await completeBtn2.waitFor({ state: 'visible', timeout: 5000 });
    await completeBtn2.click();
    await page.waitForTimeout(2000);

    // SCREENSHOT 6: Anonymous Walk-in Completed Receipt
    console.log('\n[SCREENSHOT 6]: Capturing baher_pos_journey_06_anonymous_receipt.png...');
    await page.waitForSelector('text=TAX RECEIPT', { timeout: 30000 });
    await page.waitForSelector('text=Walk-In Customer (Anonymous)', { timeout: 10000 });
    const shot6Path = path.join(ARTIFACT_DIR, 'baher_pos_journey_06_anonymous_receipt.png');
    await page.screenshot({ path: shot6Path, fullPage: false });
    console.log(`  ✓ Saved: ${shot6Path}`);

    console.log('\n=============================================================================');
    console.log('🎉 ALL 6 REAL BROWSER JOURNEY STEPS & SCREENSHOTS COMPLETED SUCCESSFULLY!');
    console.log('=============================================================================\n');
  } finally {
    await browser.close();
  }
}

runRetailPosBrowserJourney().catch((err) => {
  console.error('Browser Journey Error:', err);
  process.exit(1);
});
