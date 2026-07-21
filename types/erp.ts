export type MaterialType = 'raw_material' | 'packaging' | 'consumable';
export type CostType = 'standard' | 'market' | 'purchase' | 'average';
export type POStatus = 'draft' | 'sent' | 'confirmed' | 'partially_received' | 'received' | 'cancelled';

export interface LookupEntity {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type WarehouseType = LookupEntity;
export type TransferStatus = LookupEntity;
export type StockTransactionType = LookupEntity;

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  type_id: string;
  address?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  
  // Relations
  type?: WarehouseType;
}

export interface WarehouseLocation {
  id: string;
  warehouse_id: string;
  parent_location_id?: string | null;
  code: string;
  name: string;
  description?: string | null;
  path?: string | null;
  depth: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface WarehouseTransfer {
  id: string;
  reference_number: string;
  from_warehouse_id?: string | null;
  to_warehouse_id?: string | null;
  status_id: string;
  notes?: string | null;
  requested_by?: string | null;
  approved_by?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  cancelled_by?: string | null;
  cancelled_at?: string | null;
  completed_by?: string | null;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  
  // Relations
  items?: WarehouseTransferItem[];
}

export interface WarehouseTransferItem {
  id: string;
  transfer_id: string;
  material_id?: string | null;
  variant_id?: string | null;
  quantity: number;
  unit_id: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface StockLedgerEntry {
  id: string;
  material_id?: string | null;
  variant_id?: string | null;
  warehouse_id: string;
  location_id?: string | null;
  transaction_type_id: string;
  quantity: number;
  unit_id: string;
  running_balance: number;
  unit_cost: number;
  total_cost: number;
  reference_id?: string | null;
  reference_type?: string | null;
  performed_by?: string | null;
  event_id?: string | null;
  created_at?: string;
}

export interface MeasurementUnit {
  id: string;
  code: string;
  name: string;
  category: string;
  base_multiplier: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol?: string | null;
  decimals: number;
  exchange_rate: number;
  exchange_rate_updated_at?: string;
  is_base_currency: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  currency_id: string;
  status: POStatus;
  order_date?: string;
  expected_delivery?: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  shipping_cost: number;
  grand_total: number;
  notes?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  
  // Relations
  supplier?: Supplier;
  currency?: Currency;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  material_id: string;
  quantity: number;
  unit_id: string;
  unit_price: number;
  total_price: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  
  // Relations
  material?: unknown;
  unit?: MeasurementUnit;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  currency_id: string;
  tax_number?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  payment_terms?: string | null;
  lead_time_days: number;
  rating: number;
  notes?: string | null;
  is_active: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface MaterialCostHistory {
  id: string;
  material_id: string;
  cost: number;
  cost_type: CostType;
  reason?: string | null;
  supplier_id?: string | null;
  purchase_order_id?: string | null;
  changed_by?: string | null;
  effective_from: string;
  created_at?: string;
}

export interface BOM {
  id: string;
  variant_id: string;
  version: number;
  effective_from: string;
  effective_to?: string | null;
  is_active: boolean;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  
  // Relations
  items?: BOMItem[];
}

export interface BOMItem {
  id: string;
  bom_id: string;
  material_id: string;
  quantity: number;
  expected_waste: number;
  actual_waste: number;
  created_at?: string;
  updated_at?: string;
  
  // Relations
  material?: unknown; // To be populated with Material
}

export interface VariantCost {
  variant_id: string;
  labor_cost: number;
  manufacturing_cost: number;
  packaging_cost: number;
  overhead_cost: number;
  tax_rate: number;
  discount_rate: number;
  profit_margin_target: number;
  created_at?: string;
  updated_at?: string;
}

export interface CostCalculationHistory {
  id: string;
  variant_id: string;
  bom_id?: string | null;
  material_cost: number;
  labor_cost: number;
  manufacturing_cost: number;
  packaging_cost: number;
  waste_cost: number;
  overhead_cost: number;
  tax_amount: number;
  discount_amount: number;
  profit_margin: number;
  final_selling_price: number;
  calculated_by?: string | null;
  calculated_at: string;
}
