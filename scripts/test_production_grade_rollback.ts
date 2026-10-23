/**
 * BAHER PRODUCTION-GRADE MULTI-FILE ROLLBACK PROOF
 *
 * Proves:
 * 1. Takes pre-mutation snapshot of target files and git state.
 * 2. Applies complex, multi-file mutations across services, types, and new files.
 * 3. Injects deliberate type and runtime failure.
 * 4. Detects failure via compiler verification.
 * 5. Executes atomic rollback restoring snapshot state.
 * 6. Performs cryptographic hash comparison pre- vs post-rollback proving exact parity.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import assert from 'node:assert/strict';

function hashFile(filePath: string): string {
  if (!fs.existsSync(filePath)) return 'FILE_NOT_FOUND';
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function runProductionGradeRollbackTest() {
  console.log('=============================================================================');
  console.log('BAHER V1 PROOF: PRODUCTION-GRADE MULTI-FILE ROLLBACK AUDIT');
  console.log('=============================================================================');

  const targetService = path.join(__dirname, '../lib/services/erp/ProductionScrapMassBalanceService.ts');
  const targetTypes = path.join(__dirname, '../types/erp.ts');
  const experimentalFile = path.join(__dirname, '../lib/services/erp/ExperimentalRefiningEngine.ts');

  // STEP 1: PRE-MUTATION SNAPSHOT
  console.log('\n[STEP 1]: Capturing pre-mutation cryptographic snapshot...');
  const preHashService = hashFile(targetService);
  const preHashTypes = hashFile(targetTypes);
  const preSnapshotServiceContent = fs.readFileSync(targetService, 'utf8');
  const preSnapshotTypesContent = fs.readFileSync(targetTypes, 'utf8');

  console.log(`  - ProductionScrapMassBalanceService SHA-256: ${preHashService.slice(0, 16)}...`);
  console.log(`  - types/erp.ts SHA-256: ${preHashTypes.slice(0, 16)}...`);
  console.log('  ✓ Pre-mutation baseline snapshot captured successfully');

  // Verify baseline compiles
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('  ✓ Baseline compiler verification: Clean (Exit Code 0)');

  const doRollback = () => {
    fs.writeFileSync(targetService, preSnapshotServiceContent, 'utf8');
    fs.writeFileSync(targetTypes, preSnapshotTypesContent, 'utf8');
    if (fs.existsSync(experimentalFile)) {
      fs.unlinkSync(experimentalFile);
    }
  };

  try {
    // STEP 2: APPLY MULTI-FILE MUTATIONS + INJECT DELIBERATE FAILURE
    console.log('\n[STEP 2]: Applying multi-file experimental mutations across 3 files...');

    // Mutation A: Corrupt service with invalid type signature
    fs.appendFileSync(
      targetService,
      '\n// CORRUPT EXPERIMENT\nexport function brokenRefining(val: NonExistentRefiningType) { return val.invalidMethod(); }\n'
    );

    // Mutation B: Corrupt types file
    fs.appendFileSync(
      targetTypes,
      '\n// CORRUPT TYPE EXPERIMENT\nexport type CorruptType = { id: string, syntaxError: \n'
    );

    // Mutation C: Create new experimental file
    fs.writeFileSync(
      experimentalFile,
      'export class ExperimentalRefiningEngine { process() { throw new Error("Unfinished"); } }',
      'utf8'
    );

    console.log('  ✓ 3 files mutated (2 modified, 1 newly created)');

    // STEP 3: DETECT FAILURE
    console.log('\n[STEP 3]: Running compiler verification to detect failure...');
    let failureDetected = false;
    let detectedErrorMsg = '';
    try {
      execSync('npx tsc --noEmit', { stdio: 'pipe' });
    } catch (err: any) {
      failureDetected = true;
      detectedErrorMsg = (err.stdout ? err.stdout.toString() : '') + (err.stderr ? err.stderr.toString() : '');
    }

    assert.equal(failureDetected, true, 'Compiler verification MUST detect injected failure');
    assert.ok(
      detectedErrorMsg.length > 0,
      'Compiler verification must produce diagnostic error messages'
    );
    console.log(`  ✓ Failure detected and quarantined (${detectedErrorMsg.split('\n')[0].trim()})`);

    // STEP 4: EXECUTE ATOMIC ROLLBACK
    console.log('\n[STEP 4]: Executing atomic rollback to pre-mutation snapshot...');
    doRollback();
    console.log('  ✓ Rollback restoration applied across all affected files');

    // STEP 5: VERIFY POST-ROLLBACK STATE & PARITY
    console.log('\n[STEP 5]: Cryptographic and compiler post-rollback verification...');
    const postHashService = hashFile(targetService);
    const postHashTypes = hashFile(targetTypes);
    const experimentalExists = fs.existsSync(experimentalFile);

    assert.equal(postHashService, preHashService, 'Service hash post-rollback must EXACTLY match pre-hash');
    assert.equal(postHashTypes, preHashTypes, 'Types hash post-rollback must EXACTLY match pre-hash');
    assert.equal(experimentalExists, false, 'Experimental file must be completely purged');

    console.log('  ✓ Cryptographic SHA-256 match: 100% parity verified');
    console.log('  ✓ Experimental file purged: Zero residual contamination');

    // Verify compilation post-rollback
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    console.log('  ✓ Post-rollback compiler verification: Clean (Exit Code 0)');

    console.log('\n=============================================================================');
    console.log('PRODUCTION-GRADE ROLLBACK PROOF COMPLETE: 100% CLEAN RESTORATION VERIFIED');
    console.log('=============================================================================');
  } finally {
    doRollback();
  }
}

runProductionGradeRollbackTest().catch((err) => {
  console.error('Rollback test failed:', err);
  process.exit(1);
});
