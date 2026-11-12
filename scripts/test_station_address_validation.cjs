'use strict';

const path = require('node:path');
const { createJiti } = require('jiti');

const rootDir = path.resolve(__dirname, '..');
const jiti = createJiti(__filename, { alias: { '@': rootDir } });

const {
  parseEK1200Frame,
  buildEK1200Frame,
  computeEK1200ChecksumBytes,
  formatFrameHex
} = jiti(path.join(rootDir, 'lib', 'hardware', 'ek1200ScaleProtocol.ts'));

console.log('=== EK-1200 STATION ADDRESS & REGRESSION TEST SUITE ===\n');

let passed = 0;
let failed = 0;

function assert(description, condition, details = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${description}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${description} ${details}`);
    failed++;
  }
}

// 1. Real physical frame from COM6 with 20.05g on address 001
const realPositiveFrame = Buffer.from([
  0x02, 0x30, 0x30, 0x31, 0x2B, 0x30, 0x30, 0x32, 0x30, 0x30, 0x35, 0x32, 0x41, 0x36, 0x3C, 0x03
]);
const parsedPos = parseEK1200Frame(realPositiveFrame);
assert('Real physical positive frame (20.05g) parsed as valid', parsedPos.valid === true);
assert('Station address identified as 001', parsedPos.stationAddress === '001');
assert('Backward-compatible statusHeader alias matches 001', parsedPos.statusHeader === '001');
assert('Parsed weight is exactly 20.05g', parsedPos.weightGrams === 20.05);
assert('Protocol stability flag is true for authorized address', parsedPos.isProtocolFlagStable === true);

// 2. Real physical zero frame from COM6 on address 001
const realZeroFrame = Buffer.from([
  0x02, 0x30, 0x30, 0x31, 0x2B, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x32, 0x41, 0x36, 0x3B, 0x03
]);
const parsedZero = parseEK1200Frame(realZeroFrame);
assert('Real physical zero frame (0.00g) parsed as valid', parsedZero.valid === true);
assert('isZero flag is true', parsedZero.isZero === true);
assert('Parsed weight is 0.00g', parsedZero.weightGrams === 0);

// 3. Legacy simulation address 000 without flag must be REJECTED in production mode
const legacyZeroFrame = buildEK1200Frame({ weightGrams: 0, stationAddress: '000' });
const parsedLegacyDefault = parseEK1200Frame(legacyZeroFrame);
assert('Legacy 000 rejected by default (UNAUTHORIZED_DEVICE_ADDRESS)', 
  parsedLegacyDefault.valid === false && parsedLegacyDefault.errorCode === 'UNAUTHORIZED_DEVICE_ADDRESS');

// 4. Legacy simulation address 000 with explicit allowLegacySimulation flag must be ACCEPTED
const parsedLegacyAllowed = parseEK1200Frame(legacyZeroFrame, { allowLegacySimulation: true });
assert('Legacy 000 accepted when allowLegacySimulation is true', parsedLegacyAllowed.valid === true);
assert('Legacy parsed station address is 000', parsedLegacyAllowed.stationAddress === '000');

// 5. Unauthorized addresses (002, 010, 999) must be REJECTED
for (const addr of ['002', '010', '999']) {
  const frame = buildEK1200Frame({ weightGrams: 15.5, stationAddress: addr });
  const res = parseEK1200Frame(frame, { expectedStationAddress: '001' });
  assert(`Unauthorized address ${addr} rejected (UNAUTHORIZED_DEVICE_ADDRESS)`, 
    res.valid === false && res.errorCode === 'UNAUTHORIZED_DEVICE_ADDRESS');
}

// 6. Malformed station addresses (non-digit characters)
const malformedFrame = buildEK1200Frame({ weightGrams: 10.0, stationAddress: '001' });
malformedFrame[1] = 0x41; // 'A' -> 'A01'
const [mChkHigh, mChkLow] = computeEK1200ChecksumBytes(malformedFrame.slice(1, 13));
malformedFrame[13] = mChkHigh;
malformedFrame[14] = mChkLow;
const resMalformed = parseEK1200Frame(malformedFrame);
assert('Malformed non-numeric address A01 rejected (INVALID_STATION_ADDRESS)',
  resMalformed.valid === false && resMalformed.errorCode === 'INVALID_STATION_ADDRESS');

// 7. Checksum tampering rejection
const tamperedChecksumFrame = buildEK1200Frame({ weightGrams: 20.05, stationAddress: '001', corruptChecksum: true });
const resTampered = parseEK1200Frame(tamperedChecksumFrame);
assert('Corrupt checksum rejected (CHECKSUM_MISMATCH)',
  resTampered.valid === false && resTampered.errorCode === 'CHECKSUM_MISMATCH');

// 8. Custom configured expected station address
const counter2Frame = buildEK1200Frame({ weightGrams: 50.0, stationAddress: '002' });
const resCounter2 = parseEK1200Frame(counter2Frame, { expectedStationAddress: '002' });
assert('Custom configured expected station 002 accepted when matching configuration',
  resCounter2.valid === true && resCounter2.stationAddress === '002');

console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  process.exit(1);
}
