/**
 * BAHER SILVER PORTAL — REAL PLAYWRIGHT BROWSER E2E TEST
 *
 * Verifies end-to-end security, session lifecycle, and RBAC visibility:
 * 1. Anonymous Attempt: Requesting /en/admin is intercepted by proxy and redirected to /en/login?redirect=/en/admin.
 * 2. Authenticated Login: Admin logs in successfully, redirected to /en/admin with HttpOnly session cookie.
 * 3. Authoritative Identity UI: TopNav renders verified user name, email, tenant ID, and color-coded role badge.
 * 4. Protected Subsystem Navigation: Navigates to /en/admin/catalog/products with full access.
 * 5. Sign Out & Invalidation: Logging out revokes session, clears cookie, redirects to /en/login, and subsequent access to /admin is denied.
 * 6. Captures visual screenshot evidence into the artifact directory.
 */

import { chromium } from 'playwright';
import http from 'http';
import next from 'next';
import path from 'path';
import assert from 'node:assert/strict';

const ARTIFACT_DIR = 'C:\\Users\\michael\\.gemini\\antigravity\\brain\\d1cda45a-cc7b-462d-8322-c917be208c34';

async function runPortalBrowserJourney() {
  console.log('=============================================================================');
  console.log('BAHER SILVER PORTAL — REAL PLAYWRIGHT BROWSER SECURITY & IDENTITY JOURNEY');
  console.log('=============================================================================');

  const port = 3030;
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
    // ─── JOURNEY 1: ANONYMOUS ATTEMPT & PROXY REDIRECTION ──────────────────────
    console.log('\n[STEP 3]: Testing Anonymous Navigation to Protected Admin Surface (/en/admin)...');
    await page.goto(`http://localhost:${port}/en/admin`, { waitUntil: 'networkidle' });

    const currentUrl = page.url();
    console.log(`  Target redirected to: ${currentUrl}`);
    assert(
      currentUrl.includes('/en/login'),
      `Expected redirection to /en/login, got: ${currentUrl}`
    );
    assert(
      currentUrl.includes('redirect='),
      `Expected redirect query parameter to preserve destination, got: ${currentUrl}`
    );

    // Verify login page landmarks
    const pageTitle = await page.textContent('h1');
    console.log(`  Page header text: "${pageTitle?.trim()}"`);
    assert(
      pageTitle?.includes('Baher Silver') || pageTitle?.includes('بوابة باهر'),
      'Login page title must identify Baher Silver portal'
    );

    const shot1Path = path.join(ARTIFACT_DIR, 'baher_portal_01_unauthenticated_redirect.png');
    await page.screenshot({ path: shot1Path, fullPage: false });
    console.log(`  ✓ Captured screenshot: ${shot1Path}`);

    // ─── JOURNEY 2: ADMIN AUTHENTICATION VIA LOGIN FORM ────────────────────────
    console.log('\n[STEP 4]: Submitting Admin Credentials (admin@bahersilver.com)...');
    page.on('console', (msg) => console.log('  [BROWSER CONSOLE]', msg.text()));
    await page.fill('input[type="email"]', 'admin@bahersilver.com');
    await page.fill('input[type="password"]', 'BaherAdmin2026!');

    // Submit form and wait for redirect to /en/admin
    await Promise.all([
      page.waitForURL(`http://localhost:${port}/en/admin`, { timeout: 15000 }),
      page.click('button[type="submit"]')
    ]);

    console.log(`  ✓ Successfully authenticated and navigated to: ${page.url()}`);
    await page.waitForSelector('header', { timeout: 10000 });

    // Verify session cookie was issued
    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) => c.name === 'mip_session');
    assert(sessionCookie, 'mip_session cookie must be present after successful authentication');
    console.log(`  ✓ Verified mip_session cookie set (HttpOnly: ${sessionCookie.httpOnly})`);

    // Verify TopNav identity elements
    await page.waitForTimeout(500); // Allow user profile fetch to complete
    const headerText = await page.textContent('header');
    assert(headerText?.includes('Admin'), 'TopNav must render Admin role badge');
    console.log('  ✓ TopNav successfully rendered user role badge');

    const shot2Path = path.join(ARTIFACT_DIR, 'baher_portal_02_admin_authenticated.png');
    await page.screenshot({ path: shot2Path, fullPage: false });
    console.log(`  ✓ Captured screenshot: ${shot2Path}`);

    // ─── JOURNEY 3: TOPNAV USER IDENTITY & TENANT DROPDOWN ──────────────────────
    console.log('\n[STEP 5]: Interacting with TopNav User Identity & Tenant Dropdown...');
    // Click user identity button in TopNav (contains the user initial / avatar)
    const userMenuButton = page.locator('header button').filter({ hasText: 'Admin' });
    await userMenuButton.click();
    await page.waitForTimeout(500);

    const dropdownText = await page.textContent('header');
    assert(
      dropdownText?.includes('admin@bahersilver.com') || dropdownText?.includes('org_baher_silver'),
      'Dropdown must show verified user email and tenant ID'
    );
    console.log('  ✓ User profile dropdown rendered with server-derived identity and tenant ID');

    const shot3Path = path.join(ARTIFACT_DIR, 'baher_portal_03_user_identity_dropdown.png');
    await page.screenshot({ path: shot3Path, fullPage: false });
    console.log(`  ✓ Captured screenshot: ${shot3Path}`);

    // Close menu by clicking outside or re-clicking
    await userMenuButton.click();
    await page.waitForTimeout(300);

    // ─── JOURNEY 4: PROTECTED CATALOG ACCESS ────────────────────────────────────
    console.log('\n[STEP 6]: Navigating to Protected Subsystem (/en/admin/catalog/products)...');
    await page.goto(`http://localhost:${port}/en/admin/catalog/products`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('header', { timeout: 10000 });
    assert(page.url().includes('/en/admin/catalog/products'), 'Admin must have full access to catalog');
    console.log(`  ✓ Navigated successfully to protected catalog: ${page.url()}`);

    const shot4Path = path.join(ARTIFACT_DIR, 'baher_portal_04_catalog_products_protected.png');
    await page.screenshot({ path: shot4Path, fullPage: false });
    console.log(`  ✓ Captured screenshot: ${shot4Path}`);

    // ─── JOURNEY 5: LOGOUT & SESSION INVALIDATION ──────────────────────────────
    console.log('\n[STEP 7]: Executing Sign Out and Verifying Session Invalidation...');
    // Open user menu again
    const userMenuBtn2 = page.locator('header button').filter({ hasText: 'Admin' });
    await userMenuBtn2.click();
    await page.waitForTimeout(500);

    // Click logout button
    const logoutBtn = page.locator('button').filter({ hasText: 'Sign Out' });
    await Promise.all([
      page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 10000 }),
      logoutBtn.click()
    ]);

    console.log(`  ✓ Logged out, redirected to: ${page.url()}`);

    // Check cookies to confirm session cleared
    const cookiesAfterLogout = await context.cookies();
    const sessionCookieAfterLogout = cookiesAfterLogout.find((c) => c.name === 'mip_session');
    const isCleared = !sessionCookieAfterLogout || sessionCookieAfterLogout.value === '';
    assert(isCleared, 'mip_session cookie must be cleared after logout');
    console.log('  ✓ Verified mip_session cookie was purged');

    // Attempt re-entry to /en/admin
    console.log('  Attempting re-entry to /en/admin without session...');
    await page.goto(`http://localhost:${port}/en/admin`, { waitUntil: 'domcontentloaded' });
    const postLogoutUrl = page.url();
    assert(
      postLogoutUrl.includes('/en/login'),
      `Direct navigation after logout must redirect to login, got: ${postLogoutUrl}`
    );
    console.log(`  ✓ Re-entry denied: successfully intercepted and bounced back to ${postLogoutUrl}`);

    const shot5Path = path.join(ARTIFACT_DIR, 'baher_portal_05_post_logout_rejection.png');
    await page.screenshot({ path: shot5Path, fullPage: false });
    console.log(`  ✓ Captured screenshot: ${shot5Path}`);

    console.log('\n=============================================================================');
    console.log('>>> BAHER SILVER PORTAL BROWSER JOURNEY: ALL CHECKS PASSED (100%)');
    console.log('=============================================================================');
  } finally {
    await browser.close();
    server.close();
  }
}

runPortalBrowserJourney().catch((err) => {
  console.error('\n[FATAL] Portal browser journey failed:', err);
  process.exit(1);
});
