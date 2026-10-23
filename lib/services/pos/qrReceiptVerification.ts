/**
 * Baher Silver — Tax Invoice QR & Electronic Invoicing Verification
 * 
 * DOMAIN SPECIFICATION & COMPLIANCE BOUNDARIES:
 * 
 * 1. TLV (Tag-Length-Value) Base64 Encoding:
 *    - Standard binary structure for electronic invoice QR codes.
 *    - Pure byte encoding, mathematically deterministic, zero external dependencies.
 * 
 * 2. ZATCA Phase 1 Simplified Tax Invoice:
 *    - Implements Tags 1 to 5 per official ZATCA E-Invoicing Specification:
 *      Tag 1: Seller Name (UTF-8)
 *      Tag 2: VAT Registration Number (ASCII/UTF-8)
 *      Tag 3: Invoice Timestamp (ISO 8601 UTC)
 *      Tag 4: Invoice Total with VAT (Formatted to 2 decimals)
 *      Tag 5: VAT Total Amount (Formatted to 2 decimals)
 *    - Proven, verified, and active in offline POS receipts.
 * 
 * 3. Egyptian Tax Authority (ETA) e-Receipt Decoupling:
 *    - ETA requires online API integration (e-Receipt Core APIs), hardware POS serial numbers,
 *      cryptographic USB hardware token (PKI seal/HSM), and ETA UUID clearance.
 *    - STATUS: Offline TLV QR code is supported for POS receipts.
 *      Online ETA API clearance is decoupled and requires active Tax Authority sandbox/prod credentials.
 *    - We do NOT claim "fully ETA compliant" without an active ETA PKI hardware seal.
 */

export interface ITLVTag {
  tag: number;
  value: string;
}

export interface ITaxInvoiceQRMetadata {
  standard: 'ZATCA_PHASE_1_TLV' | 'ETA_ELECTRONIC_RECEIPT';
  sellerName: string;
  sellerVatId: string;
  timestamp: string;
  totalAmount: number;
  taxAmount: number;
  qrPayloadBase64: string;
  etaComplianceStatus: 'DECOUPLED_OFFLINE_TLV' | 'ONLINE_ETA_INTEGRATED';
}

export class TaxInvoiceQRService {
  private static readonly DEFAULT_SELLER_NAME = 'Baher Silver LLC';
  private static readonly DEFAULT_VAT_ID = '300-482-918';

  /**
   * Encodes a single Tag-Length-Value block according to standard specifications
   */
  public static encodeTLVTag(tag: number, value: string): Uint8Array {
    const encoder = new TextEncoder();
    const valueBytes = encoder.encode(value);
    const result = new Uint8Array(2 + valueBytes.length);
    result[0] = tag;
    result[1] = valueBytes.length;
    result.set(valueBytes, 2);
    return result;
  }

  /**
   * Generates a standard ZATCA Phase 1 TLV Base64 payload
   */
  public static generateZATCAPhase1Payload(params: {
    sellerName?: string;
    vatNumber?: string;
    timestamp: string;
    totalAmount: number;
    taxAmount?: number;
  }): ITaxInvoiceQRMetadata {
    const seller = params.sellerName || this.DEFAULT_SELLER_NAME;
    const vatId = params.vatNumber || this.DEFAULT_VAT_ID;
    const totalStr = params.totalAmount.toFixed(2);
    const taxStr = (params.taxAmount || 0).toFixed(2);

    const tlv1 = this.encodeTLVTag(1, seller);
    const tlv2 = this.encodeTLVTag(2, vatId);
    const tlv3 = this.encodeTLVTag(3, params.timestamp);
    const tlv4 = this.encodeTLVTag(4, totalStr);
    const tlv5 = this.encodeTLVTag(5, taxStr);

    const totalLength = tlv1.length + tlv2.length + tlv3.length + tlv4.length + tlv5.length;
    const fullBuffer = new Uint8Array(totalLength);
    let offset = 0;

    for (const tagArr of [tlv1, tlv2, tlv3, tlv4, tlv5]) {
      fullBuffer.set(tagArr, offset);
      offset += tagArr.length;
    }

    let binaryString = '';
    fullBuffer.forEach((b) => {
      binaryString += String.fromCharCode(b);
    });

    const qrBase64 =
      typeof Buffer !== 'undefined'
        ? Buffer.from(binaryString, 'binary').toString('base64')
        : btoa(binaryString);

    return {
      standard: 'ZATCA_PHASE_1_TLV',
      sellerName: seller,
      sellerVatId: vatId,
      timestamp: params.timestamp,
      totalAmount: params.totalAmount,
      taxAmount: params.taxAmount || 0,
      qrPayloadBase64: qrBase64,
      etaComplianceStatus: 'DECOUPLED_OFFLINE_TLV'
    };
  }

  /**
   * Decodes a TLV Base64 string back to its structured tags for audit verification
   */
  public static decodeTLVBase64(base64Payload: string): ITLVTag[] {
    const binaryStr =
      typeof Buffer !== 'undefined'
        ? Buffer.from(base64Payload, 'base64').toString('binary')
        : atob(base64Payload);

    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const tags: ITLVTag[] = [];
    let idx = 0;
    const decoder = new TextDecoder();

    while (idx < bytes.length) {
      const tag = bytes[idx++];
      const length = bytes[idx++];
      const valBytes = bytes.slice(idx, idx + length);
      idx += length;
      tags.push({
        tag,
        value: decoder.decode(valBytes)
      });
    }

    return tags;
  }
}
