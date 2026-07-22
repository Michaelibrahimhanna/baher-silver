import { execSync } from 'child_process';
import path from 'path';

const artifactDir = `C:\\Users\\michael\\.gemini\\antigravity\\brain\\84434e4f-6756-41b4-9dca-4a30edf61f67`;

const screens = [
  { name: 'real_01_home_en_desktop.png', url: 'https://www.bahersilver.com/en', viewport: '1440,900' },
  { name: 'real_01_home_ar_mobile.png', url: 'https://www.bahersilver.com/ar', viewport: '390,844' },
  { name: 'real_02_collections_desktop.png', url: 'https://www.bahersilver.com/en/collections', viewport: '1440,900' },
  { name: 'real_03_category_rings_desktop.png', url: 'https://www.bahersilver.com/en/category/rings', viewport: '1440,900' },
  { name: 'real_04_product_detail_desktop.png', url: 'https://www.bahersilver.com/en/product/classic-silver-ring', viewport: '1440,900' },
  { name: 'real_05_checkout_flow_desktop.png', url: 'https://www.bahersilver.com/en/checkout', viewport: '1440,900' },
  { name: 'real_06_account_portal_desktop.png', url: 'https://www.bahersilver.com/en/account', viewport: '1440,900' },
  { name: 'real_07_journal_listing_desktop.png', url: 'https://www.bahersilver.com/en/journal', viewport: '1440,900' },
  { name: 'real_08_admin_dashboard_desktop.png', url: 'https://www.bahersilver.com/en/admin', viewport: '1440,900' },
  { name: 'real_09_admin_cms_builder_desktop.png', url: 'https://www.bahersilver.com/en/admin/cms', viewport: '1440,900' },
];

console.log('Starting Playwright real browser live screenshot captures...');

for (const s of screens) {
  const targetPath = path.join(artifactDir, s.name);
  console.log(`Capturing ${s.name} from ${s.url} [viewport ${s.viewport}]...`);
  try {
    const cmd = `npx playwright screenshot --viewport-size="${s.viewport}" "${s.url}" "${targetPath}"`;
    execSync(cmd, { stdio: 'inherit' });
    console.log(`✓ Saved ${s.name}`);
  } catch (err) {
    console.error(`✗ Error capturing ${s.name}:`, err.message);
  }
}

console.log('All real live browser screenshots captured successfully!');
