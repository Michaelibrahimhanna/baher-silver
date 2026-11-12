/**
 * Baher Silver — POS Receipt Verification & Egyptian Tax Authority (ETA) Decoupling
 * 
 * ARCHITECTURAL SPECIFICATION & LEGAL BOUNDARIES:
 * 
 * 1. Internal Store Verification QR (رمز التحقق الداخلي للمحل):
 *    - Encodes Tag-Length-Value (TLV) Base64 payload containing:
 *      Tag 1: Seller Name (UTF-8)
 *      Tag 2: Unified Tax ID / الرقم الضريبي الموحد (ASCII/UTF-8)
 *      Tag 3: Receipt Timestamp (ISO 8601 UTC)
 *      Tag 4: Receipt Net Total Amount (Formatted to 2 decimals)
 *      Tag 5: Tax Amount (Formatted to 2 decimals)
 *    - LEGAL NOTICE: This QR code is strictly an INTERNAL store verification fingerprint
 *      designed for offline boutique cashier auditing, fraud prevention, and customer return tracking.
 *      It DOES NOT represent an official Egyptian Tax Authority (ETA) government e-Receipt.
 * 
 * 2. Egyptian Tax Authority (ETA) e-Receipt (منظومة الإيصال الإلكتروني B2C):
 *    - Regulated under Unified Tax Procedures Law No. 206 of 2020.
 *    - Integration Requirements:
 *      a) POS Machine Onboarding via ETA POS Portal (https://pos.eta.gov.eg).
 *      b) POS Device Credentials: POS Serial Number, Device ID, Client ID, Client Secret / Device Certificate.
 *      c) CHANNEL NOTE: In the Egyptian e-Receipt retail POS system, a physical USB PKI token
 *         is NOT mandatory on every retail checkout terminal. Retail POS terminals authenticate
 *         via registered POS device credentials issued by the ETA POS portal.
 *         (Physical USB e-Seal PKCS#11 tokens are mandatory for B2B e-Invoicing / الفاتورة الإلكترونية).
 *      d) Official ETA Receipt QR contains the public ETA verification portal URL:
 *         `https://invoicing.eta.gov.eg/receipts/search/{receiptUUID}` (or preprod).
 *    - STATUS: Currently decoupled. No data is transmitted to live ETA production servers.
 */

export interface ITLVTag {
  tag: number;
  value: string;
}

export interface IInternalReceiptQRMetadata {
  standard: 'INTERNAL_STORE_VERIFICATION_TLV';
  sellerName: string;
  sellerTaxId: string;
  timestamp: string;
  totalAmount: number;
  taxAmount: number;
  qrPayloadBase64: string;
  isOfficialGovernmentReceipt: false;
  legalNotice: string;
}

export interface IETAOfficialQRMetadata {
  standard: 'ETA_OFFICIAL_E_RECEIPT';
  receiptUUID: string;
  environment: 'preprod' | 'production';
  verificationUrl: string;
  isOfficialGovernmentReceipt: true;
  submittedAt: string;
}

export interface ITaxInvoiceQRMetadata {
  standard: 'INTERNAL_STORE_VERIFICATION_TLV' | 'ZATCA_PHASE_1_TLV' | 'ETA_ELECTRONIC_RECEIPT';
  sellerName: string;
  sellerVatId: string;
  timestamp: string;
  totalAmount: number;
  taxAmount: number;
  qrPayloadBase64: string;
  etaComplianceStatus: 'INTERNAL_STORE_VERIFICATION_ONLY' | 'DECOUPLED_OFFLINE_TLV' | 'ONLINE_ETA_INTEGRATED';
  isOfficialGovernmentReceipt?: boolean;
}

export class TaxInvoiceQRService {
  public static readonly DEFAULT_SELLER_NAME = 'شركة باهر للفضيات (Baher Silver LLC)';
  public static readonly DEFAULT_TAX_ID = '300-482-918'; // Egyptian Tax Registration Number

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
   * Generates the authoritative Internal Store Verification QR payload.
   * This is used for local store auditing and return validation.
   */
  public static generateInternalReceiptQR(params: {
    sellerName?: string;
    taxNumber?: string;
    timestamp: string;
    totalAmount: number;
    taxAmount?: number;
  }): IInternalReceiptQRMetadata {
    const seller = params.sellerName || this.DEFAULT_SELLER_NAME;
    const taxId = params.taxNumber || this.DEFAULT_TAX_ID;
    const totalStr = params.totalAmount.toFixed(2);
    const taxStr = (params.taxAmount || 0).toFixed(2);

    const tlv1 = this.encodeTLVTag(1, seller);
    const tlv2 = this.encodeTLVTag(2, taxId);
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
      standard: 'INTERNAL_STORE_VERIFICATION_TLV',
      sellerName: seller,
      sellerTaxId: taxId,
      timestamp: params.timestamp,
      totalAmount: params.totalAmount,
      taxAmount: params.taxAmount || 0,
      qrPayloadBase64: qrBase64,
      isOfficialGovernmentReceipt: false,
      legalNotice: 'رمز تحقق داخلي لمحل باهر للفضيات لمطابقة الإيصالات والمرتجعات. لا يمثل إيصالًا ضريبيًا حكوميًا معتمدًا من مصلحة الضرائب المصرية.'
    };
  }

  /**
   * Generates the Official ETA e-Receipt QR structure when an ETA UUID is issued.
   */
  public static generateOfficialETAQR(params: {
    receiptUUID: string;
    environment?: 'preprod' | 'production';
    submittedAt?: string;
  }): IETAOfficialQRMetadata {
    const env = params.environment || 'preprod';
    const baseUrl = env === 'production'
      ? 'https://invoicing.eta.gov.eg/receipts/search'
      : 'https://invoicing.preprod.eta.gov.eg/receipts/search';
    
    return {
      standard: 'ETA_OFFICIAL_E_RECEIPT',
      receiptUUID: params.receiptUUID,
      environment: env,
      verificationUrl: `${baseUrl}/${params.receiptUUID}`,
      isOfficialGovernmentReceipt: true,
      submittedAt: params.submittedAt || new Date().toISOString()
    };
  }

  /**
   * Backward-compatible helper for legacy test suites.
   * Explicitly marks status as INTERNAL_STORE_VERIFICATION_ONLY and non-government.
   */
  public static generateZATCAPhase1Payload(params: {
    sellerName?: string;
    vatNumber?: string;
    timestamp: string;
    totalAmount: number;
    taxAmount?: number;
  }): ITaxInvoiceQRMetadata {
    const internal = this.generateInternalReceiptQR({
      sellerName: params.sellerName,
      taxNumber: params.vatNumber,
      timestamp: params.timestamp,
      totalAmount: params.totalAmount,
      taxAmount: params.taxAmount
    });

    return {
      standard: 'INTERNAL_STORE_VERIFICATION_TLV',
      sellerName: internal.sellerName,
      sellerVatId: internal.sellerTaxId,
      timestamp: internal.timestamp,
      totalAmount: internal.totalAmount,
      taxAmount: internal.taxAmount,
      qrPayloadBase64: internal.qrPayloadBase64,
      etaComplianceStatus: 'INTERNAL_STORE_VERIFICATION_ONLY',
      isOfficialGovernmentReceipt: false
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
