const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const createJiti = require('../node_modules/jiti');
const jiti = createJiti(__filename, {
  alias: {
    '@': rootDir
  }
});

jiti(path.join(__dirname, 'test_phase_c_slice1_gate.ts'));
