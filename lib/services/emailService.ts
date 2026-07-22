import { OrderAggregate } from '../types/orderAggregate';

export interface EmailOptions {
  to: string;
  subject: string;
  bodyHtml: string;
}

export interface IEmailProvider {
  sendEmail(options: EmailOptions): Promise<boolean>;
}

class MockEmailProvider implements IEmailProvider {
  async sendEmail(options: EmailOptions): Promise<boolean> {
    console.log(`[EmailService Provider] Sent email to ${options.to} with subject "${options.subject}"`);
    return true;
  }
}

class EmailService {
  private provider: IEmailProvider = new MockEmailProvider();

  async sendOrderConfirmation(order: OrderAggregate, recipientEmail: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #1a1a1a;">Order Confirmation - ${order.orderNumber}</h2>
        <p>Thank you for shopping with <strong>Baher Silver</strong>! Your order has been placed successfully.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>Order Number:</strong> ${order.orderNumber}</p>
          <p style="margin: 4px 0;"><strong>Status:</strong> ${order.status}</p>
          <p style="margin: 4px 0;"><strong>Shipping Zone:</strong> ${order.shippingSnapshot.zoneName}</p>
        </div>
        <p>You can track your order status anytime on our website.</p>
      </div>
    `;

    return this.provider.sendEmail({
      to: recipientEmail,
      subject: `Order Confirmation #${order.orderNumber} - Baher Silver`,
      bodyHtml: html,
    });
  }

  async sendPaymentFailureRecovery(orderNumber: string, recipientEmail: string, recoveryUrl: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #fecaca; background-color: #fef2f2; border-radius: 8px;">
        <h2 style="color: #991b1b;">Payment Attention Needed - ${orderNumber}</h2>
        <p>We were unable to process your payment for order <strong>${orderNumber}</strong>.</p>
        <p>Don't worry! Your order items are reserved. Click below to re-attempt payment or switch payment methods:</p>
        <a href="${recoveryUrl}" style="display: inline-block; background-color: #991b1b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Complete Payment Now</a>
      </div>
    `;

    return this.provider.sendEmail({
      to: recipientEmail,
      subject: `Action Required: Complete your order #${orderNumber}`,
      bodyHtml: html,
    });
  }
}

export const emailService = new EmailService();
