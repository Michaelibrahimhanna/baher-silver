/**
 * Baher Silver — Point of Sale (POS) & Cash Till Domain Types
 * 
 * Defines canonical data models for retail sales, returns, cash shifts,
 * till journal movements, and receipt structures.
 */

import { ProductProfileType, SilverPurity } from '@/lib/types';

export type POSPaymentMethod = 'CASH' | 'CARD' | 'INSTAPAY' | 'SPLIT';

export type POSTransactionStatus = 'COMPLETED' | 'RETURNED' | 'CANCELLED';

export type POSShiftStatus = 'OPEN' | 'ACTIVE' | 'CLOSING' | 'CLOSED';

export type POSCashMovementType =
  | 'OPENING_FLOAT'
  | 'SALE_CASH'
  | 'SALE_CARD'
  | 'SALE_INSTAPAY'
  | 'REFUND_CASH'
  | 'CASH_IN'
  | 'CASH_OUT'
  | 'EXPENSE'
  | 'SAFE_DROP'
  | 'CLOSING_DECLARATION';

export interface POSCartItemInput {
  productId: string;
  barcode?: string;
  serialNumber?: string;
  quantity: number;
  customWeightGrams?: number;
  customSpotPricePerGram?: number;
  discountAmount?: number;
  discountReason?: string;
}

export interface POSCheckoutInput {
  organizationId: string;
  branchId: string;
  terminalId: string;
  shiftId: string;
  cashierUserId: string;
  cashierName?: string;
  actorRole: string;
  items: POSCartItemInput[];
  paymentMethod: POSPaymentMethod;
  cashAmount?: number;
  cardAmount?: number;
  instapayAmount?: number;
  discountAmount?: number;
  discountReason?: string;
  managerOverrideToken?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  idempotencyKey?: string;
}

export interface POSSaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  sku: string;
  barcode: string;
  serial_number?: string;
  product_name: string;
  profile_type: ProductProfileType;
  purity?: SilverPurity;
  quantity: number;
  weight_grams: number;
  spot_price_per_gram: number;
  metal_value: number;
  workmanship_fee: number;
  unit_price: number;
  discount_amount: number;
  total_price: number;
}

export interface POSManagerOverride {
  manager_id: string;
  manager_name: string;
  manager_role: string;
  reason: string;
  approved_at: string;
  approved_discount_amount: number;
  subtotal: number;
}

export interface POSSaleTransaction {
  id: string;
  receipt_number: string;
  organization_id: string;
  branch_id: string;
  terminal_id: string;
  shift_id: string;
  cashier_user_id: string;
  cashier_name: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  status: POSTransactionStatus;
  payment_method: POSPaymentMethod;
  cash_amount: number;
  card_amount: number;
  instapay_amount: number;
  subtotal_amount: number;
  discount_amount: number;
  discount_reason?: string;
  manager_override?: POSManagerOverride;
  total_amount: number;
  total_silver_weight_grams: number;
  items_count: number;
  is_return: boolean;
  original_transaction_id?: string;
  idempotency_key?: string;
  created_at: string;
  items: POSSaleItem[];
  qr_payload_base64?: string;
  verification_url?: string;
}

export interface POSReturnInput {
  organizationId: string;
  branchId: string;
  terminalId: string;
  shiftId: string;
  originalSaleId: string;
  cashierUserId: string;
  cashierName?: string;
  actorRole: string;
  returnReason: string;
  returnedPieceSerials?: string[]; // Optional specific pieces for partial return
  refundMethod?: 'CASH' | 'CARD';
  idempotencyKey?: string;
}

export interface POSCashShift {
  id: string;
  organization_id: string;
  branch_id: string;
  terminal_id: string;
  cashier_user_id: string;
  cashier_name: string;
  status: POSShiftStatus;
  opened_at: string;
  closed_at?: string | null;
  opening_float: number;
  total_cash_sales: number;
  total_card_sales: number;
  total_instapay_sales: number;
  total_refunds_cash: number;
  total_cash_in: number;
  total_cash_out: number;
  total_expenses: number;
  total_safe_drops?: number;
  expected_closing_cash: number;
  declared_closing_cash?: number | null;
  cash_discrepancy?: number | null;
  closing_notes?: string;
  closed_by_user_id?: string;
}

export interface POSCashJournalEntry {
  id: string;
  organization_id: string;
  branch_id: string;
  terminal_id: string;
  shift_id: string;
  movement_type: POSCashMovementType;
  payment_method: POSPaymentMethod;
  amount: number;
  is_cash_in_drawer: boolean;
  reference_transaction_id?: string;
  actor_user_id: string;
  notes?: string;
  idempotency_key?: string;
  created_at: string;
}

export interface POSZReport {
  report_number: string;
  organization_id: string;
  branch_id: string;
  branch_name: string;
  date: string;
  generated_at: string;
  shift_id?: string;
  shifts_count: number;
  cashier_name: string;
  financials: {
    opening_float: number;
    cash_sales: number;
    card_sales: number;
    instapay_sales: number;
    total_sales: number;
    cash_refunds: number;
    cash_in: number;
    cash_out: number;
    expenses: number;
    safe_drops?: number;
    expected_closing_cash: number;
    declared_closing_cash: number;
    cash_discrepancy: number;
  };
  metrics: {
    sales_transactions_count: number;
    returns_count: number;
    silver_pieces_sold: number;
    retail_pieces_sold: number;
    total_silver_grams_sold: number;
    silver_grams_by_purity: Record<SilverPurity, number>;
  };
}
