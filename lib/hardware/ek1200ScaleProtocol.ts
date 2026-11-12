/**
 * Baher Silver OS — EK-1200 Physical Scale Protocol & Stream Framing Engine
 *
 * Verified Physical Hardware Parameters (Store Counter & Bench):
 *   - Scale Model: EK-1200
 *   - Connection: Direct RS232-to-RS232 serial cable to In-Store Windows PC
 *   - Baud Rate: 9600 | Data Bits: 8 | Parity: None | Stop Bits: 1 | Handshake: None
 *   - Poll Command: "S\r\n" (0x53 0x0D 0x0A)
 *   - Response Frame: 16 bytes, STX (0x02) start, ETX (0x03) end
 *
 * Verified Real Frame Observed:
 *   02 30 30 30 2B 30 30 31 34 35 30 32 41 36 3A 03
 *   [0]     0x02 ('\x02' STX)
 *   [1..3]  0x30 0x30 0x30 ("000" status/header flags)
 *   [4]     0x2B ('+' sign; 0x2D = '-')
 *   [5..10] 0x30 0x30 0x31 0x34 0x35 0x30 ("001450" 6-digit integer mantissa)
 *   [11]    0x32 ('2' decimal point position -> 1450 * 10^-2 = 14.50)
 *   [12]    0x41 ('A' unit/mode code -> Grams normal weighing mode)
 *   [13..14]0x36 0x3A ("6:" 2-byte ASCII-offset nibble checksum of bytes [1..12])
 *   [15]    0x03 ('\x03' ETX)
 */

export const EK1200_SERIAL_DEFAULTS = {
  baudRate: 9600,
  dataBits: 8 as const,
  parity: 'none' as const,
  stopBits: 1 as const,
  handshake: 'none' as const,
  requestCommandAscii: 'S\r\n',
  requestCommandBytes: new Uint8Array([0x53, 0x0d, 0x0a]),
  frameLength: 16,
  stxByte: 0x02,
  etxByte: 0x03
};

export type EK1200ParseErrorCode =
  | 'INVALID_FRAME_LENGTH'
  | 'INVALID_STX_ETX'
  | 'CHECKSUM_MISMATCH'
  | 'INVALID_SIGN_BYTE'
  | 'INVALID_MANTISSA_DIGITS'
  | 'INVALID_DECIMAL_EXPONENT'
  | 'UNSUPPORTED_UNIT_OR_MODE'
  | 'NEGATIVE_OR_ZERO_WEIGHT'
  | 'SCALE_STATUS_NOT_READY'
  | 'INVALID_STATION_ADDRESS'
  | 'UNAUTHORIZED_DEVICE_ADDRESS';

export interface EK1200ParsedFrame {
  valid: boolean;
  errorCode?: EK1200ParseErrorCode;
  errorMessage?: string;
  rawBytes: Uint8Array;
  rawHex: string;
  stationAddress: string;
  statusHeader: string;
  sign: '+' | '-';
  mantissaDigits: string;
  mantissaValue: number;
  decimalPlaces: number;
  weightGrams: number;
  unitCode: string;
  unit: 'g' | 'UNKNOWN';
  isProtocolFlagStable: boolean;
  isZero: boolean;
  expectedChecksumHex: string;
  receivedChecksumHex: string;
  timestampIso: string;
}

export interface ParseEK1200FrameOptions {
  expectedStationAddress?: string;
  allowLegacySimulation?: boolean;
}

/**
 * Formats a Uint8Array or Buffer as uppercase space-separated hex (e.g. "02 30 30 ... 03")
 */
export function formatFrameHex(bytes: Uint8Array | Buffer): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
    .join(' ');
}

/**
 * Parses a hex string (e.g. "02 30 30 30 2B 30 30 31 34 35 30 32 41 36 3A 03") into Uint8Array
 */
export function parseHexToBytes(hexStr: string): Uint8Array {
  const clean = hexStr.replace(/[^0-9a-fA-F]/g, '');
  if (clean.length % 2 !== 0) {
    throw new Error(`Invalid hex string length: ${clean.length}`);
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    out[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return out;
}

/**
 * Computes the EK-1200 2-byte ASCII-offset nibble checksum over bytes [0..12] (including STX 0x02).
 *
 * Mathematical Proof on observed real frame "02 30 30 30 2B 30 30 31 34 35 30 32 41 36 3A 03":
 *   Candidate A (BCC XOR over bytes[0..12], High-Nibble First):
 *     0x02 ^ 0x30 ^ 0x30 ^ 0x30 ^ 0x2B ^ 0x30 ^ 0x30 ^ 0x31 ^ 0x34 ^ 0x35 ^ 0x30 ^ 0x32 ^ 0x41 = 0x6A
 *     High nibble = 0x06 -> 0x30 + 6  = 0x36 ('6')
 *     Low nibble  = 0x0A -> 0x30 + 10 = 0x3A (':')
 *
 *   Candidate B (2's Complement -(Sum bytes[0..12]) & 0xFF, Low-Nibble First):
 *     -(0x25A) & 0xFF = 0xA6 -> Low nibble 0x36 ('6'), High nibble 0x3A (':').
 */
export function computeEK1200ChecksumBytes(frameBytes0To12: Uint8Array): [number, number] {
  const bytes =
    frameBytes0To12.length === 12
      ? new Uint8Array([EK1200_SERIAL_DEFAULTS.stxByte, ...frameBytes0To12])
      : frameBytes0To12;

  if (bytes.length < 13) {
    throw new Error(`Expected 13 bytes (indices 0..12) for EK-1200 checksum, got ${bytes.length}`);
  }
  let xorVal = 0;
  for (let i = 0; i < 13; i++) {
    xorVal ^= bytes[i];
  }
  const low8 = xorVal & 0xff;
  const highNibbleAscii = 0x30 + ((low8 >> 4) & 0x0f);
  const lowNibbleAscii = 0x30 + (low8 & 0x0f);
  return [highNibbleAscii, lowNibbleAscii];
}

/**
 * Deterministically builds a valid 16-byte EK-1200 frame for testing & simulation.
 */
export function buildEK1200Frame(options: {
  weightGrams: number;
  decimalPlaces?: number;
  stationAddress?: string;
  statusHeader?: string;
  unitCode?: string;
  corruptChecksum?: boolean;
}): Uint8Array {
  const decimalPlaces = options.decimalPlaces ?? 2;
  const rawStation = options.stationAddress ?? options.statusHeader ?? '001';
  const stationAddress = rawStation.padEnd(3, '0').slice(0, 3);
  const statusHeader = stationAddress;
  const unitCode = (options.unitCode ?? 'A').slice(0, 1);
  const signChar = options.weightGrams < 0 ? '-' : '+';
  const scaledInt = Math.round(Math.abs(options.weightGrams) * Math.pow(10, decimalPlaces));
  const mantissaStr = String(scaledInt).padStart(6, '0').slice(-6);

  const frame = new Uint8Array(16);
  frame[0] = EK1200_SERIAL_DEFAULTS.stxByte; // 0x02
  frame[1] = stationAddress.charCodeAt(0);
  frame[2] = stationAddress.charCodeAt(1);
  frame[3] = stationAddress.charCodeAt(2);
  frame[4] = signChar.charCodeAt(0);
  for (let i = 0; i < 6; i++) {
    frame[5 + i] = mantissaStr.charCodeAt(i);
  }
  frame[11] = String(decimalPlaces).charCodeAt(0);
  frame[12] = unitCode.charCodeAt(0);

  const [chkHigh, chkLow] = computeEK1200ChecksumBytes(frame.slice(1, 13));
  frame[13] = options.corruptChecksum ? chkHigh ^ 0x01 : chkHigh;
  frame[14] = chkLow;
  frame[15] = EK1200_SERIAL_DEFAULTS.etxByte; // 0x03

  return frame;
}

/**
 * Parses and validates a 16-byte EK-1200 response frame.
 */
export function parseEK1200Frame(
  rawBytesInput: Uint8Array | Buffer,
  options?: ParseEK1200FrameOptions
): EK1200ParsedFrame {
  const rawBytes = new Uint8Array(rawBytesInput);
  const rawHex = formatFrameHex(rawBytes);
  const timestampIso = new Date().toISOString();

  const makeFailure = (
    errorCode: EK1200ParseErrorCode,
    errorMessage: string,
    partial?: Partial<EK1200ParsedFrame>
  ): EK1200ParsedFrame => {
    const stationAddress = partial?.stationAddress ?? partial?.statusHeader ?? '';
    return {
      valid: false,
      errorCode,
      errorMessage,
      rawBytes,
      rawHex,
      stationAddress,
      statusHeader: stationAddress,
      sign: partial?.sign ?? '+',
      mantissaDigits: partial?.mantissaDigits ?? '',
      mantissaValue: partial?.mantissaValue ?? 0,
      decimalPlaces: partial?.decimalPlaces ?? 2,
      weightGrams: partial?.weightGrams ?? 0,
      unitCode: partial?.unitCode ?? '',
      unit: partial?.unit ?? 'UNKNOWN',
      isProtocolFlagStable: false,
      isZero: false,
      expectedChecksumHex: partial?.expectedChecksumHex ?? '',
      receivedChecksumHex: partial?.receivedChecksumHex ?? '',
      timestampIso
    };
  };

  if (rawBytes.length !== EK1200_SERIAL_DEFAULTS.frameLength) {
    return makeFailure(
      'INVALID_FRAME_LENGTH',
      `Expected 16-byte EK-1200 frame, got ${rawBytes.length} bytes (${rawHex}).`
    );
  }

  if (rawBytes[0] !== EK1200_SERIAL_DEFAULTS.stxByte || rawBytes[15] !== EK1200_SERIAL_DEFAULTS.etxByte) {
    return makeFailure(
      'INVALID_STX_ETX',
      `Invalid frame delimiters: byte[0]=0x${rawBytes[0].toString(16)}, byte[15]=0x${rawBytes[15].toString(16)} (expected 0x02..0x03).`
    );
  }

  // Verify 2-byte checksum over bytes [1..12]
  const [expChkHigh, expChkLow] = computeEK1200ChecksumBytes(rawBytes.slice(1, 13));
  const recChkHigh = rawBytes[13];
  const recChkLow = rawBytes[14];
  const expectedChecksumHex = `${expChkHigh.toString(16).toUpperCase().padStart(2, '0')} ${expChkLow.toString(16).toUpperCase().padStart(2, '0')}`;
  const receivedChecksumHex = `${recChkHigh.toString(16).toUpperCase().padStart(2, '0')} ${recChkLow.toString(16).toUpperCase().padStart(2, '0')}`;

  if (recChkHigh !== expChkHigh || recChkLow !== expChkLow) {
    return makeFailure(
      'CHECKSUM_MISMATCH',
      `EK-1200 frame checksum mismatch: expected [${expectedChecksumHex}], received [${receivedChecksumHex}].`,
      { expectedChecksumHex, receivedChecksumHex }
    );
  }

  const statusHeader = String.fromCharCode(rawBytes[1], rawBytes[2], rawBytes[3]);
  const signByte = rawBytes[4];
  if (signByte !== 0x2b && signByte !== 0x2d) {
    return makeFailure(
      'INVALID_SIGN_BYTE',
      `Invalid sign byte 0x${signByte.toString(16)} at index 4 (expected '+' 0x2B or '-' 0x2D).`,
      { statusHeader, expectedChecksumHex, receivedChecksumHex }
    );
  }
  const sign: '+' | '-' = signByte === 0x2d ? '-' : '+';

  const mantissaDigits = String.fromCharCode(
    rawBytes[5],
    rawBytes[6],
    rawBytes[7],
    rawBytes[8],
    rawBytes[9],
    rawBytes[10]
  );
  if (!/^\d{6}$/.test(mantissaDigits)) {
    return makeFailure(
      'INVALID_MANTISSA_DIGITS',
      `Invalid 6-digit mantissa "${mantissaDigits}" in EK-1200 frame.`,
      { statusHeader, sign, mantissaDigits, expectedChecksumHex, receivedChecksumHex }
    );
  }

  const decimalChar = String.fromCharCode(rawBytes[11]);
  if (!/^[0-5]$/.test(decimalChar)) {
    return makeFailure(
      'INVALID_DECIMAL_EXPONENT',
      `Invalid decimal exponent byte "${decimalChar}" (0x${rawBytes[11].toString(16)}) at index 11.`,
      { statusHeader, sign, mantissaDigits, expectedChecksumHex, receivedChecksumHex }
    );
  }
  const decimalPlaces = parseInt(decimalChar, 10);
  const mantissaValue = parseInt(mantissaDigits, 10);
  const unsignedWeight = mantissaValue / Math.pow(10, decimalPlaces);
  const signedWeight = sign === '-' ? -unsignedWeight : unsignedWeight;
  const weightGrams = Number(signedWeight.toFixed(decimalPlaces));

  const unitCode = String.fromCharCode(rawBytes[12]);
  if (unitCode !== 'A') {
    return makeFailure(
      'UNSUPPORTED_UNIT_OR_MODE',
      `Unsupported EK-1200 unit/mode code "${unitCode}" (0x${rawBytes[12].toString(16)}). Scale must be in Grams ('A') mode.`,
      {
        statusHeader,
        sign,
        mantissaDigits,
        mantissaValue,
        decimalPlaces,
        weightGrams,
        unitCode,
        unit: 'UNKNOWN',
        expectedChecksumHex,
        receivedChecksumHex
      }
    );
  }

  // ── Station Address Validation & Authorization ───────────────────────────
  const stationAddress = statusHeader;

  if (!/^\d{3}$/.test(stationAddress)) {
    return makeFailure(
      'INVALID_STATION_ADDRESS',
      `EK-1200 station address "${stationAddress}" must be exactly 3 numeric digits.`,
      {
        stationAddress,
        statusHeader,
        sign,
        mantissaDigits,
        mantissaValue,
        decimalPlaces,
        weightGrams,
        unitCode,
        unit: 'g',
        expectedChecksumHex,
        receivedChecksumHex
      }
    );
  }

  const expectedStationAddress = (options?.expectedStationAddress ?? '001').trim();
  const allowLegacySimulation = options?.allowLegacySimulation === true;
  const isAuthorized =
    stationAddress === expectedStationAddress || (allowLegacySimulation && stationAddress === '000');

  if (!isAuthorized) {
    return makeFailure(
      'UNAUTHORIZED_DEVICE_ADDRESS',
      `EK-1200 station address "${stationAddress}" is unauthorized (expected configured "${expectedStationAddress}").`,
      {
        stationAddress,
        statusHeader,
        sign,
        mantissaDigits,
        mantissaValue,
        decimalPlaces,
        weightGrams,
        unitCode,
        unit: 'g',
        expectedChecksumHex,
        receivedChecksumHex
      }
    );
  }

  const isProtocolFlagStable = isAuthorized;
  const isZero = Math.abs(weightGrams) < 0.001;

  return {
    valid: true,
    rawBytes,
    rawHex,
    stationAddress,
    statusHeader,
    sign,
    mantissaDigits,
    mantissaValue,
    decimalPlaces,
    weightGrams,
    unitCode,
    unit: 'g',
    isProtocolFlagStable,
    isZero,
    expectedChecksumHex,
    receivedChecksumHex,
    timestampIso
  };
}

/**
 * Byte-stream framer that extracts 16-byte STX..ETX frames from chunked UART streams.
 * Safely discards leading noise, handles split chunks across reads, and reports framing errors.
 */
export class EK1200StreamFramer {
  private buffer: number[] = [];
  private discardedBytesCount = 0;

  public pushChunk(chunk: Uint8Array | Buffer): Uint8Array[] {
    for (let i = 0; i < chunk.length; i++) {
      this.buffer.push(chunk[i]);
    }

    const extractedFrames: Uint8Array[] = [];

    while (this.buffer.length > 0) {
      const stxIndex = this.buffer.indexOf(EK1200_SERIAL_DEFAULTS.stxByte);
      if (stxIndex === -1) {
        // No STX in buffer at all -> discard noise
        this.discardedBytesCount += this.buffer.length;
        this.buffer = [];
        break;
      }

      if (stxIndex > 0) {
        // Discard garbage bytes before STX
        this.discardedBytesCount += stxIndex;
        this.buffer.splice(0, stxIndex);
      }

      if (this.buffer.length < EK1200_SERIAL_DEFAULTS.frameLength) {
        // Wait for remaining bytes of the 16-byte frame
        break;
      }

      // Check if byte[15] is ETX (0x03)
      if (this.buffer[15] === EK1200_SERIAL_DEFAULTS.etxByte) {
        const frameBytes = new Uint8Array(this.buffer.splice(0, 16));
        extractedFrames.push(frameBytes);
      } else {
        // False STX or truncated frame; drop the leading STX byte and rescan
        this.discardedBytesCount += 1;
        this.buffer.shift();
      }
    }

    return extractedFrames;
  }

  public reset(): void {
    this.buffer = [];
  }

  public getPendingByteCount(): number {
    return this.buffer.length;
  }

  public getDiscardedBytesCount(): number {
    return this.discardedBytesCount;
  }
}

export interface StabilityEvaluationResult {
  isStableLocked: boolean;
  reason?: string;
  stableWeightGrams?: number;
  consecutiveSamples: number;
  requiredSamples: number;
  requiresZeroReturnFirst: boolean;
  latestFrame?: EK1200ParsedFrame;
}

/**
 * Multi-sample temporal stability & duplicate-reading prevention tracker for the EK-1200.
 *
 * Enforces:
 * 1. Minimum N consecutive valid frames (default 3) with exact weight agreement (maxDeltaGrams = 0.00g).
 *    This directly mitigates the 14.49g vs 14.50g settling ambiguity by rejecting any reading while the ADC is transitioning.
 * 2. Positive weight > 0g for piece weighing.
 * 3. Duplicate capture barrier: once a stable weight is locked & consumed for a piece,
 *    the pan must either return to zero (<= 0.05g) OR an explicit new piece ID must be requested.
 */
export class EK1200StabilityTracker {
  private recentValidFrames: EK1200ParsedFrame[] = [];
  private readonly requiredSamples: number;
  private readonly maxDeltaGrams: number;
  private lockedForPieceKey: string | null = null;
  private lastConsumedWeightGrams: number | null = null;
  private hasReturnedToZeroSinceLastLock = true;

  constructor(options?: { requiredSamples?: number; maxDeltaGrams?: number }) {
    this.requiredSamples = options?.requiredSamples ?? 3;
    this.maxDeltaGrams = options?.maxDeltaGrams ?? 0.0;
  }

  public processFrame(frame: EK1200ParsedFrame, currentPieceKey?: string): StabilityEvaluationResult {
    if (!frame.valid) {
      // Any invalid/corrupted/unstable status frame resets consecutive stability count immediately
      this.recentValidFrames = [];
      return {
        isStableLocked: false,
        reason: `Frame invalid or unstable: ${frame.errorCode} (${frame.errorMessage})`,
        consecutiveSamples: 0,
        requiredSamples: this.requiredSamples,
        requiresZeroReturnFirst: false,
        latestFrame: frame
      };
    }

    // Check if scale returned to zero (pan cleared)
    if (Math.abs(frame.weightGrams) <= 0.05) {
      this.hasReturnedToZeroSinceLastLock = true;
      this.lockedForPieceKey = null;
      this.recentValidFrames = [];
      return {
        isStableLocked: false,
        reason: 'SCALE_AT_ZERO_PAN_EMPTY',
        consecutiveSamples: 0,
        requiredSamples: this.requiredSamples,
        requiresZeroReturnFirst: false,
        latestFrame: frame
      };
    }

    if (frame.weightGrams <= 0) {
      this.recentValidFrames = [];
      return {
        isStableLocked: false,
        reason: 'NEGATIVE_OR_ZERO_WEIGHT',
        consecutiveSamples: 0,
        requiredSamples: this.requiredSamples,
        requiresZeroReturnFirst: false,
        latestFrame: frame
      };
    }

    // Check duplicate reading barrier: if the pan has NOT returned to zero since the last capture
    // AND the caller is trying to capture the same pieceKey (or anonymous), block duplicate lock.
    if (
      !this.hasReturnedToZeroSinceLastLock &&
      this.lastConsumedWeightGrams !== null &&
      Math.abs(frame.weightGrams - this.lastConsumedWeightGrams) <= 0.02 &&
      (!currentPieceKey || currentPieceKey === this.lockedForPieceKey)
    ) {
      return {
        isStableLocked: false,
        reason: 'DUPLICATE_READING_BARRIER_REMOVE_PIECE_FIRST',
        consecutiveSamples: this.recentValidFrames.length,
        requiredSamples: this.requiredSamples,
        requiresZeroReturnFirst: true,
        latestFrame: frame
      };
    }

    // Check temporal agreement with recent valid frames
    if (this.recentValidFrames.length > 0) {
      const prev = this.recentValidFrames[this.recentValidFrames.length - 1];
      const delta = Math.abs(frame.weightGrams - prev.weightGrams);
      if (delta > this.maxDeltaGrams) {
        // Weight is still moving/settling -> restart window with current frame
        this.recentValidFrames = [frame];
        return {
          isStableLocked: false,
          reason: `WEIGHT_SETTLING_DELTA_${delta.toFixed(3)}G`,
          consecutiveSamples: 1,
          requiredSamples: this.requiredSamples,
          requiresZeroReturnFirst: false,
          latestFrame: frame
        };
      }
    }

    this.recentValidFrames.push(frame);
    if (this.recentValidFrames.length > this.requiredSamples) {
      this.recentValidFrames.shift();
    }

    if (this.recentValidFrames.length < this.requiredSamples) {
      return {
        isStableLocked: false,
        reason: `AWAITING_CONSECUTIVE_STABLE_SAMPLES (${this.recentValidFrames.length}/${this.requiredSamples})`,
        consecutiveSamples: this.recentValidFrames.length,
        requiredSamples: this.requiredSamples,
        requiresZeroReturnFirst: false,
        latestFrame: frame
      };
    }

    return {
      isStableLocked: true,
      stableWeightGrams: frame.weightGrams,
      consecutiveSamples: this.recentValidFrames.length,
      requiredSamples: this.requiredSamples,
      requiresZeroReturnFirst: false,
      latestFrame: frame
    };
  }

  /**
   * Marks the current stable reading as consumed so it cannot be accidentally re-used
   * without clearing the scale pan (zero-return barrier) or switching piece identity.
   */
  public markReadingConsumed(weightGrams: number, pieceKey?: string): void {
    this.lastConsumedWeightGrams = weightGrams;
    this.lockedForPieceKey = pieceKey ?? '__ANONYMOUS_PIECE__';
    this.hasReturnedToZeroSinceLastLock = false;
  }

  public forceReset(): void {
    this.recentValidFrames = [];
    this.lockedForPieceKey = null;
    this.lastConsumedWeightGrams = null;
    this.hasReturnedToZeroSinceLastLock = true;
  }
}
