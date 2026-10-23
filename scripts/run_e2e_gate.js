const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const createJiti = require('../node_modules/jiti');
const jiti = createJiti(__filename, {
  alias: {
    '@': rootDir
  }
});

jiti(path.join(__dirname, 'verify_e2e_gate.ts'));
