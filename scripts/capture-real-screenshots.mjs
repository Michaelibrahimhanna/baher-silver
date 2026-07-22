import puppeteer from 'puppeteer';
import path from 'path';

const pagesToCapture = [
  { name: '01_home_en_desktop', url: 'https://www.bahersilver.com/en', viewport: { width: 1440, height: 900 } },
  { name: '01_home_ar_mobile', url: 'https://www.bahersilver.com/ar', viewport: { width: 390, height: 844 }, isMobile: true },
  { name: '02_collections_en', url: 'https://www.bahersilver.com/en/collections', viewport: { width: 1440, height: 900 } },
  { name: '03_category_rings', url: 'https://www.bahersilver.com/en/category/rings', viewport: { width: 1440, height: 900 } },
  { name: '04_product_detail', url: 'https://www.bahersilver.com/en/product/classic-silver-ring', viewport: { width: 1440, height: 900 } },
  { name: '05_checkout_flow', url: 'https://www.bahersilver.com/en/checkout', viewport: { width: 1440, height: 900 } },
  { name: '06_account_portal', url: 'https://www.bahersilver.com/en/account', viewport: { width: 1440, height: 900 } },
  { name: '07_journal_editorial', url: 'https://www.bahersilver.com/en/journal', viewport: { width: 1440, height: 900 } },
  { name: '08_admin_dashboard', url: 'https://www.bahersilver.com/en/admin', viewport: { width: 1440, height: 900 } },
  { name: '09_admin_cms_builder', url: 'https://www.bahersilver.com/en/admin/cms', viewport: { width: 1440, height: 900 } },
];

async function captureAll() {
  const artifactDir = `C:\\Users\\michael\\.gemini\\antigravity\\brain\\84434e4f-6756-41b4-9dca-4a30edf61f67`;
  console.log('Launching Puppeteer browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  for (const item of pagesToCapture) {
    console.log(`Capturing [${item.name}] from ${item.url}...`);
    await page.setViewport(item.viewport);
    try {
      await page.goto(item.url, { waitUntil: 'networkidle2', timeout: 30000 });
      const filePath = path.join(artifactDir, `${item.name}.png`);
      await page.screenshot({ path: filePath, fullPage: false });
      console.log(`✓ Saved screenshot to ${filePath}`);
    } catch (err) {
      console.error(`✗ Error capturing ${item.name}:`, err.message);
    }
  }

  await browser.close();
  console.log('Finished capturing all real live production screenshots!');
}

captureAll().catch(console.error);
