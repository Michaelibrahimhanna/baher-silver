/**
 * Baher Silver — Point of Sale (POS) & Cash Till Domain Types
 * 
 * Defines canonical data models for retail sales, returns, cash shifts,
 * till journal movements, and receipt structures.
 */

import { ProductProfileType, SilverPurity } from '@/lib/types';
import type { SilverRateSource, SilverSpotRateRecord } from '@/types/catalog';

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
  scaleAttestation?: any;
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
  weightOverrideToken?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  idempotencyKey?: string;
  benchmarkSpotRate999?: number;
  spotRateRecord?: SilverSpotRateRecord;
  requireApprovedSpotRate?: boolean;
  allowStaleRate?: boolean;
  rateOverrideToken?: string;
  rateOverrideReason?: string;
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
  purity_ratio?: number;
  unrounded_metal_rate?: number;
  quantity: number;
  weight_grams: number;
  spot_price_per_gram: number;
  metal_value: number;
  workmanship_fee: number;
  unit_price: number;
  discount_amount: number;
  total_price: number;
  pricing_mode?: 'BY_WEIGHT' | 'FIXED';
  pricing_policy_mode?: 'PRO_RATA_RATIO' | 'COMMERCIAL_TIER_TABLE';
  price_source?: string;
  price_effective_at?: string;
  gram_rate_at_sale?: number;
  tax_amount?: number;
  tax_rate_percent?: number;
  tax_basis?: string;
  is_returned?: boolean;
  returned_quantity?: number;
  rate_override?: {
    originalRate: number;
    overrideRate: number;
    managerId?: string;
    managerName?: string;
    managerRole?: string;
    reason?: string;
    timestamp: string;
  };
}

export interface POSManagerOverride {
  manager_id: string;
  manager_name: string;
  manager_role: string;
  reason: string;
  approved_at: string;
  approved_discount_amount: number;
  subtotal: number;
  token_id?: string;
  branch_id?: string;
  action_type?: string;
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
  benchmark_spot_999?: number;
  spot_rate_source?: SilverRateSource;
  spot_rate_effective_at?: string;
  is_live_market_feed?: boolean;
  rate_override?: {
    originalRate: number;
    overrideRate: number;
    managerId?: string;
    managerName?: string;
    managerRole?: string;
    reason?: string;
    timestamp: string;
  };
  items: POSSaleItem[];
  pricing_policy_mode?: 'PRO_RATA_RATIO' | 'COMMERCIAL_TIER_TABLE';
  price_source?: string;
  price_effective_at?: string;
  gram_rate_at_sale?: number;
  tax_amount?: number;
  tax_source?: string;
  internal_qr_payload_base64?: string;
  eta_receipt_uuid?: string;
  eta_submission_status?: 'DISABLED_LOCAL' | 'QUEUED' | 'SUBMITTED';
  returned_serials?: string[];
  returned_amount?: number;
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
  scaleAttestations?: Record<string, any> | any[];
  managerOverrideToken?: string;
  overrideReason?: string;
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
    net_sales?: number;
  };
  metrics: {
    sales_transactions_count: number;
    returns_count: number;
    silver_pieces_sold: number;
    retail_pieces_sold: number;
    total_silver_grams_sold: number;
    silver_grams_by_purity: Record<SilverPurity, number>;
    silver_pieces_returned?: number;
    net_silver_pieces_sold?: number;
    total_silver_grams_returned?: number;
    net_silver_grams_sold?: number;
  };
}
