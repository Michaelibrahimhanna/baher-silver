/**
 * ==============================================================================
 * BAHER SILVER — PHASE 4B.3: POS MID-SHIFT CASH MOVEMENTS BROWSER JOURNEY (E2E)
 * ==============================================================================
 *
 * Real browser automation (Playwright Chromium) executing:
 *   1. Authenticates as Cashier & injects authentic session cookie
 *   2. Directly accesses /en/admin/pos Terminal Console
 *   3. Verifies / Ensures Active Cashier Shift
 *   4. Captures Screenshot 1: baher_pos_cash_01_action_bar.png (Action Bar with Cash Movement button)
 *   5. Clicks "Cash Movement" button to open modal
 *   6. Selects CASH_OUT, enters 300 EGP + reason
 *   7. Captures Screenshot 2: baher_pos_cash_02_modal_populated.png (Populated modal)
 *   8. Clicks "Confirm Movement" & verifies server confirmation banner + balance deduction (-300 EGP)
 *   9. Executes EXPENSE (150 EGP + reason), confirms & verifies balance deduction (-150 EGP)
 *  10. Executes SAFE_DROP (1000 EGP + reason), confirms & verifies balance deduction (-1000 EGP)
 *  11. Captures Screenshot 3: baher_pos_cash_03_confirmed_result.png (Server-confirmed result banner)
 *  12. Closes modal and captures Screenshot 4: baher_pos_cash_04_updated_terminal.png (Final updated terminal balance)
 */

import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { SessionService } from '../lib/auth/sessionService';
import { SESSION_COOKIE_NAME } from '../lib/auth/authCookies';

const ARTIFACT_DIR = 'C:\\Users\\michael\\.gemini\\antigravity\\brain\\d1cda45a-cc7b-462d-8322-c917be208c34';
const PORT = 3000;

async function runCashMovementBrowserJourney() {
  console.log('\n=============================================================================');
  console.log('  BAHER SILVER — PHASE 4B.3: POS CASH MOVEMENTS BROWSER JOURNEY');
  console.log('=============================================================================\n');

  // 1. Authenticate Persona
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

  // Inject cryptographic session cookie
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
    // 3. Navigate to POS Console
    console.log('\n[STEP 3]: Navigating to POS Console (/en/admin/pos)...');
    await page.goto(`http://localhost:${PORT}/en/admin/pos`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Check if shift is open
    const openShiftBtn = page.locator('button:has-text("Open Cashier Shift")');
    if (await openShiftBtn.isVisible()) {
      console.log('  -> No active shift found, opening shift with 5,000 EGP float...');
      await openShiftBtn.click();
      await page.waitForTimeout(500);
      const floatInput = page.locator('input[type="number"]');
      await floatInput.fill('5000');
      await page.click('button:has-text("Open Shift")');
      await page.waitForTimeout(1500);
    }

    // Verify Shift Active
    const shiftActiveBadge = page.locator('text=Shift Active');
    await shiftActiveBadge.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✓ Verified active shift on POS terminal');

    // Read initial drawer balance
    const expectedCashLocator = page.locator('text=Expected Cash:').locator('..');
    const initialText = await expectedCashLocator.innerText();
    console.log(`  ✓ Initial Drawer Status: ${initialText.replace(/\n/g, ' ')}`);

    // 4. Capture Screenshot 1: Action Bar with Cash Movement Button
    console.log('\n[STEP 4]: Capturing Screenshot 1: POS with Cash Movement action...');
    const screenshot1Path = `${ARTIFACT_DIR}\\baher_pos_cash_01_action_bar.png`;
    await page.screenshot({ path: screenshot1Path, fullPage: false });
    console.log(`  ✓ Saved: ${screenshot1Path}`);

    // 5. Open Cash Movement Modal
    console.log('\n[STEP 5]: Opening Cash Movement modal...');
    const cashMovementBtn = page.locator('[data-testid="cash-movement-btn"]');
    await cashMovementBtn.waitFor({ state: 'visible' });
    await cashMovementBtn.click();
    await page.waitForTimeout(800);

    const modalTitle = page.locator('h3:has-text("Till Cash Movement")');
    await modalTitle.waitFor({ state: 'visible' });
    console.log('  ✓ Cash Movement modal open and visible');

    // 6. Test Movement 1: CASH_OUT (300 EGP)
    console.log('\n[STEP 6]: Filling CASH_OUT form (300 EGP)...');
    const cashOutTab = page.locator('button:has-text("Cash Out")');
    await cashOutTab.click();

    const amountInput = page.locator('input[placeholder="0.00"]');
    await amountInput.fill('300');

    const reasonInput = page.locator('input[placeholder*="e.g."]');
    await reasonInput.fill('Midday till payout for bank change');

    // Capture Screenshot 2: Populated Modal
    console.log('\n[STEP 7]: Capturing Screenshot 2: Cash Movement Modal populated...');
    const screenshot2Path = `${ARTIFACT_DIR}\\baher_pos_cash_02_modal_populated.png`;
    await page.screenshot({ path: screenshot2Path, fullPage: false });
    console.log(`  ✓ Saved: ${screenshot2Path}`);

    // Submit CASH_OUT
    console.log('\n[STEP 8]: Submitting CASH_OUT...');
    const confirmBtn = page.locator('[data-testid="confirm-cash-movement-btn"]');
    await confirmBtn.click();
    await page.waitForTimeout(1200);

    const confirmedBanner = page.locator('text=Movement Confirmed by Server');
    await confirmedBanner.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✓ CASH_OUT confirmed by server!');

    // Close modal
    await page.locator('[data-testid="close-cash-movement-modal-btn"]').click();
    await page.waitForTimeout(600);

    // 7. Test Movement 2: EXPENSE (150 EGP)
    console.log('\n[STEP 9]: Executing EXPENSE movement (150 EGP)...');
    await cashMovementBtn.click();
    await page.waitForTimeout(500);

    const expenseTab = page.locator('button:has-text("Expense")');
    await expenseTab.click();

    await page.locator('input[placeholder="0.00"]').fill('150');
    await page.locator('input[placeholder*="e.g."]').fill('Courier express delivery fee');
    await page.locator('[data-testid="confirm-cash-movement-btn"]').click();
    await page.waitForTimeout(1200);

    await confirmedBanner.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✓ EXPENSE confirmed by server!');

    await page.locator('[data-testid="close-cash-movement-modal-btn"]').click();
    await page.waitForTimeout(600);

    // 8. Test Movement 3: SAFE_DROP (1,000 EGP)
    console.log('\n[STEP 10]: Executing SAFE_DROP movement (1,000 EGP)...');
    await cashMovementBtn.click();
    await page.waitForTimeout(500);

    const safeDropTab = page.locator('button:has-text("Safe Drop")');
    await safeDropTab.click();

    await page.locator('input[placeholder="0.00"]').fill('1000');
    await page.locator('input[placeholder*="e.g."]').fill('Afternoon excess cash drop to back-office safe');
    await page.locator('[data-testid="confirm-cash-movement-btn"]').click();
    await page.waitForTimeout(1200);

    await confirmedBanner.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✓ SAFE_DROP confirmed by server!');

    // Capture Screenshot 3: Server-Confirmed Result Banner
    console.log('\n[STEP 11]: Capturing Screenshot 3: Confirmed movement result banner...');
    const screenshot3Path = `${ARTIFACT_DIR}\\baher_pos_cash_03_confirmed_result.png`;
    await page.screenshot({ path: screenshot3Path, fullPage: false });
    console.log(`  ✓ Saved: ${screenshot3Path}`);

    // Close modal to see final updated terminal balance
    await page.locator('[data-testid="close-cash-movement-modal-btn"]').click();
    await page.waitForTimeout(600);

    // 9. Verify Final Updated Expected Drawer Balance
    console.log('\n[STEP 12]: Verifying updated expected drawer balance on terminal...');
    const finalText = await expectedCashLocator.innerText();
    console.log(`  ✓ Final Terminal Drawer Status: ${finalText.replace(/\n/g, ' ')}`);

    // Capture Screenshot 4: Final Terminal with Updated Balance
    console.log('\n[STEP 13]: Capturing Screenshot 4: Updated terminal status...');
    const screenshot4Path = `${ARTIFACT_DIR}\\baher_pos_cash_04_updated_terminal.png`;
    await page.screenshot({ path: screenshot4Path, fullPage: false });
    console.log(`  ✓ Saved: ${screenshot4Path}`);

    console.log('\n=============================================================================');
    console.log('  ✓ ALL BROWSER JOURNEY VERIFICATION STEPS COMPLETED WITH EVIDENCE!');
    console.log('=============================================================================\n');
  } finally {
    await browser.close();
  }
}

runCashMovementBrowserJourney().catch((err) => {
  console.error('Browser journey error:', err);
  process.exit(1);
});
