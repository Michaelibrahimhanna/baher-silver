/**
 * Baher Silver — Safe Test Harness Runner for Silver OS Integration Tests
 * 
 * Safety Guarantees:
 * 1. NEVER mutates, deletes, or resets the active canonical `.data/` directory.
 * 2. Runs tests in an isolated, dedicated workspace (`.data_test_isolated/`).
 * 3. Asserts safety barriers before any directory deletion (must be within project root,
 *    must contain 'test', and must never match or contain the canonical .data directory).
 * 4. Preserves active application data, configuration, and developer environment intact.
 */

const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const canonicalDataDir = path.join(rootDir, '.data');
const testWorkspace = path.join(rootDir, '.data_test_isolated');
const testDataDir = path.join(testWorkspace, '.data');

/**
 * Validates that a target path is strictly safe for test-related deletion.
 * Throws a fatal exception if the path points to or inside canonical .data,
 * falls outside the project root, or does not explicitly contain 'test'.
 */
function assertSafeTestDirectory(targetPath) {
  const resolved = path.resolve(targetPath);
  const resolvedRoot = path.resolve(rootDir);
  const resolvedCanonical = path.resolve(canonicalDataDir);

  // Guard 1: Absolute prohibition on touching canonical .data
  if (resolved === resolvedCanonical || resolved.startsWith(resolvedCanonical + path.sep)) {
    throw new Error(`[CRITICAL SAFETY VIOLATION] Refusing cleanup! Target path is within canonical .data: ${resolved}`);
  }

  // Guard 2: Prohibition on paths outside the project root
  if (!resolved.startsWith(resolvedRoot + path.sep)) {
    throw new Error(`[CRITICAL SAFETY VIOLATION] Refusing cleanup! Target path is outside project root: ${resolved}`);
  }

  // Guard 3: Directory must explicitly contain 'test'
  const baseName = path.basename(resolved);
  if (!baseName.includes('test')) {
    throw new Error(`[CRITICAL SAFETY VIOLATION] Refusing cleanup! Target directory name must contain 'test': ${resolved}`);
  }
}

// 1. Initial cleanup of isolated test workspace from previous runs
assertSafeTestDirectory(testWorkspace);
if (fs.existsSync(testWorkspace)) {
  fs.rmSync(testWorkspace, { recursive: true, force: true });
}

// 2. Setup fresh isolated test workspace with internal .data directory
fs.mkdirSync(testWorkspace, { recursive: true });
fs.mkdirSync(testDataDir, { recursive: true });

// 3. Switch process working directory to isolated test workspace
// This ensures that all modules resolving path.resolve(process.cwd(), '.data')
// are redirected to the isolated test directory without touching the canonical store.
process.chdir(testWorkspace);

// 4. Register exit hook to clean up isolated test workspace safely
process.on('exit', (code) => {
  try {
    process.chdir(rootDir);
    if (fs.existsSync(testWorkspace)) {
      assertSafeTestDirectory(testWorkspace);
      fs.rmSync(testWorkspace, { recursive: true, force: true });
    }
  } catch (err) {
    // Suppress secondary cleanup errors on exit if Windows locks persist
  }
});

// 5. Execute Silver OS Integration & Phase 1.1 Test Suites via JITI
const createJiti = require('../node_modules/jiti');
const jiti = createJiti(__filename, {
  alias: {
    '@': rootDir
  }
});

// Run Slice 1-7 Integration Suite
jiti(path.join(__dirname, 'verify_silver_os_integration.ts'));

// Run Phase 1.1 Acceptance Suite (Tenant Isolation, UUIDs, Weight Audit, Mock Scale, Barcode)
process.env.RUN_STANDALONE = 'true';
jiti(path.join(__dirname, 'test_mip_silver_os_phase1.ts'));

// Run Phase 1.2 Acceptance Suite (Pricing Engine, Karat Scaling, Rounding, Margin Guardrails)
jiti(path.join(__dirname, 'test_mip_silver_os_phase1_2_pricing.ts'));

// Run Phase 1.3 Acceptance Suite (Item Lifecycle, Barcode Printing, Scale HAL)
jiti(path.join(__dirname, 'test_mip_silver_os_phase1_3.ts'));

// Run Phase 1.4 Acceptance Suite (POS Integration, Cashier Workflow, Pre-Staging Verification)
jiti(path.join(__dirname, 'test_mip_silver_os_phase1_4_pos.ts'));

// Run Postgres Adapter Acceptance Suite (PostgreSQL 16 Schema, Row Locking, ACID Boundaries)
jiti(path.join(__dirname, 'test_postgres_silver_os_adapter.ts'));
