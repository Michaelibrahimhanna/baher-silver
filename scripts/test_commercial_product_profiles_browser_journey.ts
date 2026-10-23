import { chromium } from 'playwright';
import path from 'path';
import assert from 'node:assert/strict';

const ARTIFACT_DIR = 'C:\\Users\\michael\\.gemini\\antigravity\\brain\\d1cda45a-cc7b-462d-8322-c917be208c34';

async function runCommercialProfilesBrowserJourney() {
  console.log('=============================================================================');
  console.log('BAHER SILVER — PHASE 4A: COMMERCIAL PRODUCT PROFILES BROWSER JOURNEY');
  console.log('=============================================================================\n');

  const port = 3000;
  console.log(`[STEP 1]: Connecting to running Next.js instance on http://localhost:${port}...`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'en-US'
  });
  const page = await context.newPage();

  try {
    // 1. Authenticate as Admin
    console.log('\n[STEP 2]: Authenticating as Admin at /en/login...');
    await page.goto(`http://localhost:${port}/en/login?redirect=/en/admin/catalog/products`, { waitUntil: 'networkidle' });

    await page.fill('input[type="email"]', 'admin@bahersilver.com');
    await page.fill('input[type="password"]', 'BaherAdmin2026!');

    await Promise.all([
      page.waitForURL(`http://localhost:${port}/en/admin/catalog/products`, { timeout: 15000 }),
      page.click('button[type="submit"]')
    ]);

    console.log(`  ✓ Successfully authenticated and reached: ${page.url()}`);
    await page.waitForSelector('table', { timeout: 10000 });

    // 2. Capture Catalog Table with Profile Badges
    console.log('\n[STEP 3]: Verifying Catalog Table with Profile Badges...');
    const pageText = await page.textContent('body');
    assert(pageText?.includes('All Profiles'), 'Must have All Profiles filter dropdown');
    assert(pageText?.includes('Silver') || pageText?.includes('Retail'), 'Must show profile badges');

    const shot1Path = path.join(ARTIFACT_DIR, 'baher_profile_01_catalog_table.png');
    await page.screenshot({ path: shot1Path, fullPage: false });
    console.log(`  ✓ Captured screenshot: ${shot1Path}`);

    // 3. Filter by Retail Merchandise Only
    console.log('\n[STEP 4]: Testing Profile Dropdown Filter (NON_SILVER_RETAIL)...');
    const profileSelect = page.locator('select:has-text("All Profiles")');
    await profileSelect.selectOption('NON_SILVER_RETAIL');
    await page.waitForTimeout(1000);

    const shot2Path = path.join(ARTIFACT_DIR, 'baher_profile_02_retail_merchandise_filter.png');
    await page.screenshot({ path: shot2Path, fullPage: false });
    console.log(`  ✓ Captured screenshot: ${shot2Path}`);

    // Reset filter
    await profileSelect.selectOption('all');
    await page.waitForTimeout(500);

    // 4. Navigate to Product Editor (New Product)
    console.log('\n[STEP 5]: Navigating to New Product Editor (/en/admin/catalog/products/new)...');
    await page.goto(`http://localhost:${port}/en/admin/catalog/products/new`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=Commercial Product Profile', { timeout: 10000 });

    const shot3Path = path.join(ARTIFACT_DIR, 'baher_profile_03_editor_silver_profile.png');
    await page.screenshot({ path: shot3Path, fullPage: false });
    console.log(`  ✓ Captured screenshot: ${shot3Path}`);

    // 5. Toggle to Non-Silver Retail Merchandise Profile
    console.log('\n[STEP 6]: Toggling to Non-Silver Retail Merchandise Profile...');
    const retailProfileBtn = page.locator('button:has-text("بضاعة تجارية عامة")');
    await retailProfileBtn.click();
    await page.waitForTimeout(500);

    await page.waitForSelector('text=Commercial Retail Attributes', { timeout: 5000 });
    console.log('  ✓ Commercial retail attributes panel rendered in DOM');

    const shot4Path = path.join(ARTIFACT_DIR, 'baher_profile_04_editor_retail_profile.png');
    await page.screenshot({ path: shot4Path, fullPage: false });
    console.log(`  ✓ Captured screenshot: ${shot4Path}`);

    // 6. Check Master Attributes Tab (Tab 2) for Non-Silver Notice
    console.log('\n[STEP 7]: Checking Master Attributes Tab with Non-Silver Profile...');
    const masterAttrsTab = page.locator('button:has-text("السمات والحقول المخصصة")');
    await masterAttrsTab.click();
    await page.waitForTimeout(500);

    const tabText = await page.textContent('body');
    assert(tabText?.includes('لا تنطبق عليه عيارات الفضة الخالصة'), 'Must show non-silver notice hiding purity');

    const shot5Path = path.join(ARTIFACT_DIR, 'baher_profile_05_editor_master_attrs_disabled.png');
    await page.screenshot({ path: shot5Path, fullPage: false });
    console.log(`  ✓ Captured screenshot: ${shot5Path}`);

    console.log('\n=============================================================================');
    console.log('🎉 ALL BROWSER JOURNEY TESTS & SCREENSHOTS COMPLETED SUCCESSFULLY!');
    console.log('=============================================================================\n');
  } catch (err: any) {
    console.error('Browser journey error:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

runCommercialProfilesBrowserJourney().catch((err) => {
  console.error(err);
  process.exit(1);
});
