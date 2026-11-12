const path = require('node:path');
const fs = require('node:fs');

const rootDir = path.resolve(__dirname, '..');
const canonicalDataDir = path.join(rootDir, '.data');
const testWorkspace = path.join(rootDir, '.data_phase_c_test_isolated');
const testDataDir = path.join(testWorkspace, '.data');

function assertSafeTestDirectory(targetPath) {
  const resolved = path.resolve(targetPath);
  const resolvedRoot = path.resolve(rootDir);
  const resolvedCanonical = path.resolve(canonicalDataDir);

  if (resolved === resolvedCanonical || resolved.startsWith(resolvedCanonical + path.sep)) {
    throw new Error(`[SAFETY VIOLATION] Target path is within canonical .data: ${resolved}`);
  }
  if (!resolved.startsWith(resolvedRoot + path.sep)) {
    throw new Error(`[SAFETY VIOLATION] Target path is outside project root: ${resolved}`);
  }
  if (!path.basename(resolved).includes('test')) {
    throw new Error(`[SAFETY VIOLATION] Target directory name must contain 'test': ${resolved}`);
  }
}

// 1. Clean and setup isolated workspace
assertSafeTestDirectory(testWorkspace);
if (fs.existsSync(testWorkspace)) {
  fs.rmSync(testWorkspace, { recursive: true, force: true });
}
fs.mkdirSync(testWorkspace, { recursive: true });
fs.mkdirSync(testDataDir, { recursive: true });

// 2. Switch working directory so productEngine and posTransactionEngine use isolated .data
process.chdir(testWorkspace);

// 3. Execute Phase C Gate via jiti
const createJiti = require(path.join(rootDir, 'node_modules/jiti'));
const jiti = createJiti(__filename, {
  alias: {
    '@': rootDir
  }
});

process.on('exit', (code) => {
  if (code === 0) {
    try {
      process.chdir(rootDir);
      if (fs.existsSync(testWorkspace)) {
        fs.rmSync(testWorkspace, { recursive: true, force: true });
      }
    } catch (_) {}
  }
});

jiti(path.join(rootDir, 'scripts', 'test_phase_c_slice1_gate.ts'));
