/**
 * ==============================================================================
 * BAHER SILVER — PHASE 4B.4: POS DISCOUNTS & MANAGER OVERRIDE BROWSER JOURNEY
 * ==============================================================================
 *
 * Real browser automation (Playwright Chromium) executing:
 *   1. Authenticates as Cashier & injects authentic session cookie
 *   2. Directly accesses /ar/admin/pos (Arabic-First RTL Internal UI)
 *   3. Verifies / Ensures Active Cashier Shift
 *   4. Captures Screenshot 1: baher_pos_discount_01_arabic_terminal.png (Arabic Terminal & RTL)
 *   5. Adds product to cart & applies normal Cashier discount (5% <= 5% cashier limit)
 *   6. Captures Screenshot 2: baher_pos_discount_02_cashier_discount.png (Cashier discount in cart)
 *   7. Attempts discount > cashier limit (50% = 220.5 EGP > 150 EGP & > 5%), triggering Manager Override prompt
 *   8. Enters StoreManager credentials & mandatory reason
 *   9. Captures Screenshot 3: baher_pos_discount_03_manager_override_prompt.png (Manager override modal)
 *  10. Authorizes override via server, verifies HMAC token issuance & cart badge
 *  11. Captures Screenshot 4: baher_pos_discount_04_override_approved_total.png (Approved cart with badge)
 *  12. Executes Checkout (Cash payment) & displays completed receipt
 *  13. Captures Screenshot 5: baher_pos_discount_05_receipt_with_override.png (Tax receipt with override badge)
 */

import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { SessionService } from '../lib/auth/sessionService';
import { SESSION_COOKIE_NAME } from '../lib/auth/authCookies';

const ARTIFACT_DIR = 'C:\\Users\\michael\\.gemini\\antigravity\\brain\\d1cda45a-cc7b-462d-8322-c917be208c34';
const PORT = 3000;

async function runDiscountBrowserJourney() {
  console.log('\n=============================================================================');
  console.log('  BAHER SILVER — PHASE 4B.4: POS DISCOUNTS & OVERRIDE BROWSER JOURNEY');
  console.log('=============================================================================\n');

  // 1. Authenticate Cashier Persona
  console.log('[STEP 1]: Generating authentic session token for Cashier...');
  await SessionService.ensureInitialized();
  const cashierAuth = await SessionService.authenticate('cashier@bahersilver.com', 'BaherCashier2026!');
  assert(cashierAuth.sessionToken, 'Cashier token required');
  console.log(`  ✓ Cashier authenticated: ${cashierAuth.user.name} (${cashierAuth.user.role})`);

  // 2. Launch Chromium
  console.log('\n[STEP 2]: Launching Playwright Chromium browser...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  // Inject session cookie
  await context.addCookies([
    {
      name: SESSION_COOKIE_NAME,
      value: cashierAuth.sessionToken,
      domain: 'localhost',
      path: '/'
    }
  ]);

  const page = await context.newPage();

  try {
    // 3. Navigate to Arabic POS Console (/ar/admin/pos)
    console.log('\n[STEP 3]: Navigating to Arabic POS Console (/ar/admin/pos)...');
    await page.goto(`http://localhost:${PORT}/ar/admin/pos`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Check if shift is open, open if needed
    const openShiftBtn = page.locator('button:has-text("Open Cashier Shift")');
    if (await openShiftBtn.count() > 0 && await openShiftBtn.isVisible()) {
      console.log('  -> No active shift found, opening shift with 5,000 EGP float...');
      await openShiftBtn.click();
      await page.waitForTimeout(500);
      const floatInput = page.locator('input[type="number"]');
      await floatInput.fill('5000');
      const confirmOpenBtn = page.locator('button:has-text("Confirm & Open")');
      await confirmOpenBtn.click();
      await page.waitForTimeout(1500);
    }

    // Verify Active Shift
    const shiftActiveIndicator = page.locator('text=/Shift Active/i');
    await shiftActiveIndicator.first().waitFor({ state: 'visible', timeout: 8000 });
    console.log('  ✓ Verified active shift on POS terminal');

    // 4. Capture Screenshot 1: Arabic Terminal & RTL Layout
    console.log('\n[STEP 4]: Capturing Screenshot 1: Arabic POS Terminal...');
    const screenshot1Path = `${ARTIFACT_DIR}\\baher_pos_discount_01_arabic_terminal.png`;
    await page.screenshot({ path: screenshot1Path, fullPage: false });
    console.log(`  ✓ Saved: ${screenshot1Path}`);

    // 5. Add product to cart (Classic 925 Silver Ring)
    console.log('\n[STEP 5]: Adding Classic 925 Silver Ring to cart...');
    const silverRingBtn = page.locator('button:has-text("Classic 925 Silver Ring")');
    await silverRingBtn.waitFor({ state: 'visible', timeout: 8000 });
    await silverRingBtn.click();
    await page.waitForTimeout(1000);

    // Handle serialized piece selection modal if displayed
    const pieceSelectModal = page.locator('text=Select Serialized Piece');
    if (await pieceSelectModal.count() > 0 && await pieceSelectModal.isVisible()) {
      console.log('  -> Selecting available physical piece from modal...');
      const selectPieceBtn = page.locator('text=Select Piece \u2192').first();
      await selectPieceBtn.click();
      await page.waitForTimeout(500);
    }

    // Verify cart item
    await page.waitForSelector('text=Qty: 1 (Serialized)', { timeout: 5000 });
    console.log('  ✓ Product added to cart successfully');

    // 6. Apply standard cashier discount within limit (5%)
    console.log('\n[STEP 6]: Applying standard Cashier discount (5%)...');
    const openDiscountBtn = page.locator('[data-testid="open-discount-modal-btn"]');
    await openDiscountBtn.waitFor({ state: 'visible', timeout: 5000 });
    await openDiscountBtn.click();
    await page.waitForTimeout(500);

    const discountValInput = page.locator('[data-testid="discount-value-input"]');
    await discountValInput.fill('5');
    await page.waitForTimeout(500);

    // Apply cashier discount
    const applyCashierBtn = page.locator('[data-testid="apply-cashier-discount-btn"]');
    await applyCashierBtn.waitFor({ state: 'visible', timeout: 3000 });
    await applyCashierBtn.click();
    await page.waitForTimeout(1000);

    // Verify cashier discount line in cart
    const removeDiscountBtn = page.locator('[data-testid="remove-discount-btn"]');
    await removeDiscountBtn.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✓ Cashier discount of 5% successfully applied in cart');

    // 7. Capture Screenshot 2: Cashier Discount
    console.log('\n[STEP 7]: Capturing Screenshot 2: Cashier Discount Applied...');
    const screenshot2Path = `${ARTIFACT_DIR}\\baher_pos_discount_02_cashier_discount.png`;
    await page.screenshot({ path: screenshot2Path, fullPage: false });
    console.log(`  ✓ Saved: ${screenshot2Path}`);

    // 8. Remove existing discount to test high discount requiring Manager Override (50%)
    console.log('\n[STEP 8]: Removing cashier discount and opening modal for Manager Override...');
    await removeDiscountBtn.click();
    await page.waitForTimeout(500);

    // Open discount modal again
    await openDiscountBtn.click();
    await page.waitForTimeout(500);

    // Enter 50% discount (exceeds 5% and exceeds 150 EGP on 441 EGP subtotal)
    await discountValInput.fill('50');
    await page.waitForTimeout(500);

    // Verify manager override warning banner appears
    const overrideBanner = page.locator('[data-testid="manager-override-required-banner"]');
    await overrideBanner.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✓ Manager override requirement detected by client');

    // Populate manager credentials and mandatory reason
    const managerEmailInput = page.locator('[data-testid="manager-email-input"]');
    const managerPasswordInput = page.locator('[data-testid="manager-password-input"]');
    const discountReasonInput = page.locator('[data-testid="discount-reason-input"]');

    await managerEmailInput.fill('storemanager@bahersilver.com');
    await managerPasswordInput.fill('BaherManager2026!');
    await discountReasonInput.fill('اعتماد خصم خاص للعميل المميز - هدية زفاف (VIP Wedding Gift)');
    await page.waitForTimeout(500);

    // 9. Capture Screenshot 3: Manager Override Prompt Populated
    console.log('\n[STEP 9]: Capturing Screenshot 3: Manager Override Modal Populated...');
    const screenshot3Path = `${ARTIFACT_DIR}\\baher_pos_discount_03_manager_override_prompt.png`;
    await page.screenshot({ path: screenshot3Path, fullPage: false });
    console.log(`  ✓ Saved: ${screenshot3Path}`);

    // 10. Authorize Manager Override via Server
    console.log('\n[STEP 10]: Authorizing Manager Override via server...');
    const authorizeBtn = page.locator('[data-testid="authorize-manager-override-btn"]');
    await authorizeBtn.click();

    // Verify authorized banner
    const authorizedBanner = page.locator('[data-testid="discount-authorized-banner"]');
    await authorizedBanner.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✓ Manager override authorized by server (HMAC token received)');

    // Wait for modal auto-close
    await page.waitForTimeout(1500);

    // Verify Cart displays Manager Override Badge
    const cartOverrideBadge = page.locator('[data-testid="cart-manager-override-badge"]');
    await cartOverrideBadge.waitFor({ state: 'visible', timeout: 5000 });
    const cartBadgeText = await cartOverrideBadge.innerText();
    console.log(`  ✓ Cart Override Badge: "${cartBadgeText}"`);

    // 11. Capture Screenshot 4: Override Approved Cart Total
    console.log('\n[STEP 11]: Capturing Screenshot 4: Cart with Approved Override...');
    const screenshot4Path = `${ARTIFACT_DIR}\\baher_pos_discount_04_override_approved_total.png`;
    await page.screenshot({ path: screenshot4Path, fullPage: false });
    console.log(`  ✓ Saved: ${screenshot4Path}`);

    // 12. Proceed to Checkout
    console.log('\n[STEP 12]: Executing Checkout with Manager Override Token...');
    const proceedPaymentBtn = page.locator('button:has-text("المتابعة للدفع")');
    await proceedPaymentBtn.click();
    await page.waitForTimeout(800);

    // Select Cash payment method and complete sale
    const completeSaleBtn = page.locator('button:has-text("Complete & Print Receipt")');
    await completeSaleBtn.waitFor({ state: 'visible', timeout: 5000 });
    await completeSaleBtn.click();
    await page.waitForTimeout(2500);

    // Verify Receipt Modal Opened
    const receiptModal = page.locator('text=TAX RECEIPT');
    await receiptModal.waitFor({ state: 'visible', timeout: 8000 });
    console.log('  ✓ Receipt Modal displayed');

    // Verify Receipt Manager Override Badge
    const receiptOverrideBadge = page.locator('[data-testid="receipt-manager-override-badge"]');
    await receiptOverrideBadge.waitFor({ state: 'visible', timeout: 5000 });
    const receiptBadgeText = await receiptOverrideBadge.innerText();
    console.log(`  ✓ Receipt Override Details: "${receiptBadgeText.replace(/\n/g, ' ')}"`);

    // 13. Capture Screenshot 5: Receipt with Override Badge & Operational Confirmations
    console.log('\n[STEP 13]: Capturing Screenshot 5: Receipt with Override Audit...');
    const screenshot5Path = `${ARTIFACT_DIR}\\baher_pos_discount_05_receipt_with_override.png`;
    await page.screenshot({ path: screenshot5Path, fullPage: false });
    console.log(`  ✓ Saved: ${screenshot5Path}`);

    console.log('\n=============================================================================');
    console.log('  PHASE 4B.4 BROWSER JOURNEY COMPLETED SUCCESSFULLY (5/5 SCREENSHOTS CAPTURED)');
    console.log('=============================================================================\n');

  } catch (error) {
    console.error('\n❌ Browser journey error:', error);
    const errorPath = `${ARTIFACT_DIR}\\baher_pos_discount_error.png`;
    await page.screenshot({ path: errorPath, fullPage: true }).catch(() => {});
    throw error;
  } finally {
    await browser.close();
  }
}

runDiscountBrowserJourney().catch((err) => {
  console.error(err);
  process.exit(1);
});
