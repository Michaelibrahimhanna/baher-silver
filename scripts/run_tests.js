const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, '.data');
const testDataDir = path.join(rootDir, '.data_test');

if (fs.existsSync(dataDir)) fs.rmSync(dataDir, { recursive: true, force: true });
if (fs.existsSync(testDataDir)) fs.rmSync(testDataDir, { recursive: true, force: true });

const createJiti = require('../node_modules/jiti');
const jiti = createJiti(__filename, {
  alias: {
    '@': rootDir
  }
});

jiti(path.join(__dirname, 'verify_silver_os_integration.ts'));
