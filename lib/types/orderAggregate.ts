import { Money } from './money';

export type OrderStatus =
  | 'Draft'
  | 'Pending'
  | 'Paid'
  | 'Processing'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled'
  | 'Refunded';

export interface OrderStateTransition {
  id: string;
  timestamp: string;
  fromState: OrderStatus;
  toState: OrderStatus;
  actor: string; // e.g. "Customer", "Paymob Webhook", "System", "Admin"
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface PricingSnapshot {
  subtotal: Money;
  discount: Money;
  shipping: Money;
  taxes: Money;
  total: Money;
  exchangeRate: number;
  currency: string;
  calculatedAt: string;
}

export interface ShippingSnapshot {
  zoneId: string;
  zoneName: string;
  governorate: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  carrierId: string;
  carrierName: string;
  trackingNumber: string;
  baseRate: Money;
  freeShippingApplied: boolean;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  variantId?: string;
  sku: string;
  unitPrice: Money;
  quantity: number;
  lineTotal: Money;
}

export interface PaymentAttempt {
  paymentAttemptId: string;
  idempotencyKey: string;
  provider: string; // 'Paymob' | 'Stripe' | 'Fawry' | 'ValU' | 'COD'
  providerReference?: string; // Gateway transaction ID / reference
  amount: Money;
  status: 'Pending' | 'Success' | 'Declined' | 'Timeout' | 'Expired' | 'Failed';
  retryCount: number;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderInvoice {
  invoiceId: string;
  invoiceNumber: string; // e.g., INV-BS-2026-000001
  issuedAt: string;
  sellerVatId: string;
  buyerName: string;
  buyerEmail: string;
  buyerVatId?: string;
  pricingSnapshot: PricingSnapshot;
  status: 'Draft' | 'Issued' | 'Paid' | 'Void';
}

export interface OrderShipment {
  shipmentId: string;
  orderId: string;
  carrierId: string;
  carrierName: string;
  trackingNumber: string;
  shippingSnapshot: ShippingSnapshot;
  status: 'Pending' | 'Dispatched' | 'InTransit' | 'OutForDelivery' | 'Delivered' | 'Failed';
  dispatchedAt?: string;
  deliveredAt?: string;
}

/**
 * ORDER AGGREGATE ROOT
 * Order controls state transitions and encapsulates all aggregate entities.
 */
export interface OrderAggregate {
  id: string;
  orderNumber: string; // Business Order Number: e.g. BS-2026-000001
  status: OrderStatus;
  customerId?: string;
  isGuest: boolean;
  guestEmail?: string;
  guestPhone?: string;
  
  // Aggregate Child Entities & Snapshots
  items: OrderItem[];
  pricingSnapshot: PricingSnapshot;
  shippingSnapshot: ShippingSnapshot;
  payments: PaymentAttempt[];
  shipments: OrderShipment[];
  invoice?: OrderInvoice;
  
  // State History Audit Log
  stateHistory: OrderStateTransition[];
  
  // Metadata
  fraudRiskScore?: number;
  createdAt: string;
  updatedAt: string;
}
