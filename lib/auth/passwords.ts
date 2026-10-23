/**
 * Cryptographic Password Hashing & Verification (scrypt)
 *
 * Uses Node.js built-in crypto module with unique 32-byte salts and timing-safe comparison.
 */

import crypto from 'crypto';

const SCRYPT_PARAMS = {
  N: 16384,
  r: 8,
  p: 1,
  keyLen: 64,
  saltLen: 32
};

export async function hashPassword(password: string): Promise<string> {
  if (!password || typeof password !== 'string' || password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  const salt = crypto.randomBytes(SCRYPT_PARAMS.saltLen);
  const derivedKey = crypto.scryptSync(password, salt, SCRYPT_PARAMS.keyLen, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p
  });

  return `scrypt$${SCRYPT_PARAMS.N}$${SCRYPT_PARAMS.r}$${SCRYPT_PARAMS.p}$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    if (!password || !storedHash) return false;

    const parts = storedHash.split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') {
      return false;
    }

    const N = parseInt(parts[1], 10);
    const r = parseInt(parts[2], 10);
    const p = parseInt(parts[3], 10);
    const salt = Buffer.from(parts[4], 'hex');
    const originalHash = Buffer.from(parts[5], 'hex');

    const testHash = crypto.scryptSync(password, salt, originalHash.length, {
      N,
      r,
      p
    });

    return crypto.timingSafeEqual(originalHash, testHash);
  } catch {
    return false;
  }
}
