import { OrderAggregate, OrderInvoice } from '../types/orderAggregate';

export interface IInvoiceService {
  generateInvoice(order: OrderAggregate): OrderInvoice;
}

class InvoiceService implements IInvoiceService {
  private sellerVatId = 'EG-VAT-982401924';

  generateInvoice(order: OrderAggregate): OrderInvoice {
    const invoiceNumber = `INV-${order.orderNumber}`;
    const buyerName = order.isGuest ? 'Guest Customer' : 'Registered Customer';
    const buyerEmail = order.guestEmail || 'customer@bahersilver.com';

    return {
      invoiceId: `inv-${Math.random().toString(36).substring(2, 9)}`,
      invoiceNumber,
      issuedAt: new Date().toISOString(),
      sellerVatId: this.sellerVatId,
      buyerName,
      buyerEmail,
      pricingSnapshot: order.pricingSnapshot,
      status: order.status === 'Paid' ? 'Paid' : 'Issued',
    };
  }
}

export const invoiceService: IInvoiceService = new InvoiceService();
