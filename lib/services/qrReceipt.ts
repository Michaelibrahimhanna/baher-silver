import { OrderAggregate } from '../types/orderAggregate';

export interface IQRReceipt {
  orderNumber: string;
  sellerName: string;
  sellerVatId: string;
  timestamp: string;
  totalAmountInCents: number;
  taxAmountInCents: number;
  qrPayloadBase64: string;
  verificationUrl: string;
}

class QRReceiptService {
  private sellerName = 'Baher Silver LLC';
  private sellerVatId = '300-482-918';

  /**
   * Encodes TLV (Tag-Length-Value) structure per ZATCA / Egyptian E-Receipt Standard:
   * Tag 1: Seller Name
   * Tag 2: VAT Registration Number
   * Tag 3: Timestamp
   * Tag 4: Total Amount
   * Tag 5: VAT Total Amount
   */
  private encodeTLV(tag: number, value: string): Uint8Array {
    const encoder = new TextEncoder();
    const valueBytes = encoder.encode(value);
    const result = new Uint8Array(2 + valueBytes.length);
    result[0] = tag;
    result[1] = valueBytes.length;
    result.set(valueBytes, 2);
    return result;
  }

  generateReceiptPayload(order: OrderAggregate): IQRReceipt {
    const timestamp = order.createdAt;
    const totalAmountStr = (order.pricingSnapshot.total.amountInCents / 100).toFixed(2);
    const taxAmountStr = (order.pricingSnapshot.taxes.amountInCents / 100).toFixed(2);

    const tlv1 = this.encodeTLV(1, this.sellerName);
    const tlv2 = this.encodeTLV(2, this.sellerVatId);
    const tlv3 = this.encodeTLV(3, timestamp);
    const tlv4 = this.encodeTLV(4, totalAmountStr);
    const tlv5 = this.encodeTLV(5, taxAmountStr);

    const fullTlv = new Uint8Array(tlv1.length + tlv2.length + tlv3.length + tlv4.length + tlv5.length);
    let offset = 0;
    [tlv1, tlv2, tlv3, tlv4, tlv5].forEach(arr => {
      fullTlv.set(arr, offset);
      offset += arr.length;
    });

    let binaryString = '';
    fullTlv.forEach(byte => { binaryString += String.fromCharCode(byte); });
    const qrPayloadBase64 = typeof btoa !== 'undefined' 
      ? btoa(binaryString) 
      : Buffer.from(binaryString, 'binary').toString('base64');

    const verificationUrl = `/api/receipt/verify?orderNumber=${order.orderNumber}&signature=${encodeURIComponent(qrPayloadBase64.slice(0, 16))}`;

    return {
      orderNumber: order.orderNumber,
      sellerName: this.sellerName,
      sellerVatId: this.sellerVatId,
      timestamp,
      totalAmountInCents: order.pricingSnapshot.total.amountInCents,
      taxAmountInCents: order.pricingSnapshot.taxes.amountInCents,
      qrPayloadBase64,
      verificationUrl,
    };
  }
}

export const qrReceiptService = new QRReceiptService();
