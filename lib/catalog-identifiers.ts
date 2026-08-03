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
