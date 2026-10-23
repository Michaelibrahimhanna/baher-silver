import type { DualQRCodes } from '@/types/catalog';

export type QRDestinationType = 'product_page' | 'memories' | 'verify' | 'warranty' | 'repair_history';

/**
 * Generates an Enterprise SKU following pattern: BS-{CAT_PREFIX}-{MAT_CODE}-{SERIAL}
 */
export function generateSKU(categorySlug: string = 'jew', materialCode: string = 'SIL', serial?: number): string {
  const cat = categorySlug.substring(0, 3).toUpperCase();
  const mat = materialCode.substring(0, 3).toUpperCase();
  const num = serial || Math.floor(100 + Math.random() * 900);
  return `BS-${cat}-${mat}-${num}`;
}

/**
 * Generates EAN-13 compliant 13-digit barcode with valid check digit
 */
export function generateEAN13Barcode(seed?: number): string {
  const prefix = '6291000'; // Egypt Jewelry EAN prefix
  const middle = String(seed || Math.floor(10000 + Math.random() * 90000)).padStart(5, '0');
  const raw12 = `${prefix}${middle}`;
  
  // Calculate EAN-13 Check Digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(raw12[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return `${raw12}${checkDigit}`;
}

/**
 * Generates Extensible Dual QR Codes payload
 */
export function generateDualQRCodes(
  sku: string, 
  slug: string, 
  destinationType: QRDestinationType = 'product_page',
  customUrl?: string,
  warehouseLocation: string = 'CAI-V1'
): DualQRCodes {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bahersilver.com';

  let customerPayload = `${baseUrl}/product/${slug}`;
  if (customUrl) {
    customerPayload = customUrl;
  } else {
    switch (destinationType) {
      case 'memories':
        customerPayload = `${baseUrl}/memories/${slug}`;
        break;
      case 'verify':
        customerPayload = `${baseUrl}/verify/${sku}`;
        break;
      case 'warranty':
        customerPayload = `${baseUrl}/warranty/${sku}`;
        break;
      case 'repair_history':
        customerPayload = `${baseUrl}/repairs/${sku}`;
        break;
      case 'product_page':
      default:
        customerPayload = `${baseUrl}/product/${slug}`;
        break;
    }
  }

  const internalPayload = JSON.stringify({
    type: 'STAFF_INVENTORY_SCAN',
    sku,
    warehouse: warehouseLocation,
    timestamp: new Date().toISOString(),
  });

  return {
    internal_qr: {
      code: `QR-INT-${sku}`,
      payload: internalPayload,
      destination_type: 'inventory_scan'
    },
    customer_qr: {
      code: `QR-CUST-${slug}`,
      payload: customerPayload,
      destination_type: destinationType,
      custom_destination_url: customUrl
    }
  };
}

/**
 * Generates an Enterprise Serial Number for an individual piece.
 * Pattern: SN-BHR-{YEAR}-{COUNTER_PADDED}
 */
export function generatePieceSerialNumber(prefix: string = 'BHR', sequence?: number): string {
  const year = new Date().getFullYear();
  const counter = sequence !== undefined ? sequence : Math.floor(1000 + Math.random() * 9000);
  const padded = String(counter).padStart(5, '0');
  return `SN-${prefix.toUpperCase()}-${year}-${padded}`;
}

/**
 * Validates whether a barcode string conforms to either:
 * 1. EAN-13 (13 digits with valid check digit)
 * 2. Code-128 / Alphanumeric standard barcode (4 to 32 alphanumeric chars)
 */
export function validateBarcodeFormat(barcode: string): { valid: boolean; format: 'EAN-13' | 'CODE-128' | 'UNKNOWN'; error?: string } {
  if (!barcode || typeof barcode !== 'string') {
    return { valid: false, format: 'UNKNOWN', error: 'Barcode must be a non-empty string' };
  }
  const clean = barcode.trim();
  if (clean.length < 4 || clean.length > 32) {
    return { valid: false, format: 'UNKNOWN', error: 'Barcode length must be between 4 and 32 characters' };
  }

  // Check EAN-13
  if (/^\d{13}$/.test(clean)) {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(clean[i], 10);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    if (parseInt(clean[12], 10) === checkDigit) {
      return { valid: true, format: 'EAN-13' };
    }
    return { valid: false, format: 'EAN-13', error: `Invalid EAN-13 check digit. Expected ${checkDigit}, got ${clean[12]}` };
  }

  // Check Code-128 (alphanumeric, dashes, underscores)
  if (/^[A-Za-z0-9\-_]+$/.test(clean)) {
    return { valid: true, format: 'CODE-128' };
  }

  return { valid: false, format: 'UNKNOWN', error: 'Barcode contains invalid characters. Use digits or standard alphanumeric.' };
}
