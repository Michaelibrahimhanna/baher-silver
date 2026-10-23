import type { ProductionOrderBOMSnapshot } from './erp/planning';

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
  type: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface InventoryBatch {
  id: string;
  batch_number: string;
  material_id?: string | null;
  variant_id?: string | null;
  warehouse_id: string;
  location_id?: string | null;
  supplier_id?: string | null;
  initial_quantity: number;
  remaining_quantity: number;
  reserved_quantity: number;
  unit_cost: number;
  purity?: string | null;
  received_at: string;
  expiry_date?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface WarehouseTransfer {
  id: string;
  reference_number: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  status_id: string;
  notes?: string | null;
  requested_by?: string | null;
  approved_by?: string | null;
  dispatched_by?: string | null;
  dispatched_at?: string | null;
  received_by?: string | null;
  received_at?: string | null;
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
  from_warehouse?: Warehouse;
  to_warehouse?: Warehouse;
  status?: TransferStatus;
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
  transaction_date: string;
  material_id?: string | null;
  variant_id?: string | null;
  warehouse_id: string;
  location_id?: string | null;
  batch_id?: string | null;
  transaction_type_id: string;
  quantity: number;
  balance_after_transaction: number;
  reference_id?: string | null;
  reference_type?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at?: string;
  
  // Relations
  transaction_type?: StockTransactionType;
  warehouse?: Warehouse;
  location?: WarehouseLocation;
  batch?: InventoryBatch;
}

export interface MeasurementUnit {
  id: string;
  name: string;
  symbol: string;
  unit_type: 'weight' | 'length' | 'volume' | 'piece';
  is_base_unit: boolean;
  base_unit_id?: string | null;
  conversion_factor: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchange_rate: number;
  is_base_currency: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contact_person?: string | null;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  tax_number?: string | null;
  payment_terms?: string | null;
  currency: string;
  currency_id?: string | null;
  lead_time_days?: number | null;
  rating?: number | null;
  notes?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  order_date: string;
  expected_delivery_date?: string | null;
  status: POStatus;
  total_amount: number;
  currency: string;
  notes?: string | null;
  created_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  
  // Relations
  supplier?: Supplier;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  material_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_price: number;
  total_price: number;
  unit_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryTransaction {
  id: string;
  transaction_number: string;
  transaction_type_id: string;
  warehouse_id: string;
  status_id: string;
  reference_type?: string | null;
  reference_id?: string | null;
  notes?: string | null;
  transaction_date: string;
  created_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface InventoryTransactionItem {
  id: string;
  transaction_id: string;
  material_id?: string | null;
  variant_id?: string | null;
  quantity: number;
  unit_id: string;
  unit_cost: number;
  total_cost: number;
  source_location_id?: string | null;
  destination_location_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MaterialCostHistory {
  id: string;
  material_id: string;
  cost_type: CostType;
  cost: number;
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
  status?: string | null;
  effective_from: string;
  effective_to?: string | null;
  is_active: boolean;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
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
  
  // Workshop Manufacturing Enhancements
  line_type?: string;
  gemstone_id?: string | null;
  waste_factor_pct?: number;
  unit_of_measure?: string;

  // Relations
  material?: unknown; // To be populated with Material
  gemstone?: Gemstone;
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

// =============================================================================
// WORKSHOP MANUFACTURING & GEMSTONE DOMAIN TYPES (Baher L.0.1)
// =============================================================================

export interface Gemstone {
  id: string;
  code: string;
  name_ar: string;
  name_en?: string | null;
  category: string;
  stone_type: string;
  color?: string | null;
  shape?: string | null;
  cut?: string | null;
  size_mm?: string | null;
  quality?: string | null;
  treatment?: string | null;
  origin?: string | null;
  weight_grams: number;
  weight_carats: number;
  quantity: number;
  purchase_price: number;
  selling_price: number;
  certificate_url?: string | null;
  image_url?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  
  // Relations
  lots?: GemstoneLot[];
}

export interface GemstoneLot {
  id: string;
  gemstone_id: string;
  batch_number: string;
  supplier_id?: string | null;
  supplier_invoice?: string | null;
  purchase_date?: string | null;
  purchase_price: number;
  initial_quantity: number;
  available_quantity: number;
  reserved_quantity: number;
  weight_grams: number;
  weight_carats: number;
  warehouse_id?: string | null;
  location_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface WorkCenter {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  hourly_capacity: number;
  labor_cost_rate: number;
  electricity_rate: number;
  assigned_operators_count: number;
  status: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RoutingTemplate {
  id: string;
  product_id: string;
  variant_id?: string | null;
  name: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  steps?: RoutingStep[];
}

export interface RoutingStep {
  id: string;
  routing_id: string;
  work_center_id: string;
  sequence_no: number;
  stage_code: string;
  labor_minutes: number;
  machine_minutes: number;
  notes?: string | null;
  created_at?: string;
  work_center?: WorkCenter;
}

export type ProductionOrderStatus =
  | 'DRAFT'
  | 'PLANNED'
  | 'SHORTAGE_BLOCKED'
  | 'CONFIRMED'
  | 'READY_FOR_EXECUTION'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'QUALITY_CHECK'
  | 'COMPLETED'
  | 'CLOSED'
  | 'CANCELLED';

export interface ProductionOrder {
  id: string;
  order_code: string;
  organization_id?: string | null;
  branch_id?: string | null;
  warehouse_id?: string | null;
  product_id: string;
  variant_id?: string | null;
  sku?: string | null;
  planned_quantity: number;
  completed_quantity: number;
  scrapped_quantity: number;
  target_silver_purity: string;
  estimated_silver_weight: number;
  actual_silver_weight: number;
  silver_loss_weight: number;
  bom_id?: string | null;
  bom_version?: number | null;
  bom_snapshot_id?: string | null;
  status: ProductionOrderStatus;
  readiness_status?: string | null;
  reservation_status?: string | null;
  scheduling_status?: string | null;
  target_date_breached?: boolean;
  override_authorized_by?: string | null;
  qc_status?: string | null;
  priority: string;
  assigned_supervisor_id?: string | null;
  assigned_operator_id?: string | null;
  start_date?: string | null;
  target_date?: string | null;
  completion_date?: string | null;
  working_time_minutes: number;
  pause_time_minutes: number;
  total_duration_minutes: number;
  notes?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;

  // Relations
  allocations?: ProductionMaterialAllocation[];
  timeline?: ProductionOrderTimeline[];
  queue_jobs?: WorkCenterQueueJob[];
  scrap_entries?: ProductionScrapLedger[];
  snapshot?: ProductionOrderBOMSnapshot | null;
}

export interface ProductionOrderTimeline {
  id: string;
  order_id: string;
  from_status?: string | null;
  to_status: string;
  action: string;
  actor_id?: string | null;
  details?: string | null;
  created_at?: string;
}

export interface ProductionMaterialAllocation {
  id: string;
  order_id: string;
  line_type: string;
  material_id?: string | null;
  gemstone_id?: string | null;
  item_code: string;
  item_name: string;
  required_quantity: number;
  allocated_quantity: number;
  consumed_quantity: number;
  unit_of_measure: string;
  status: 'ALLOCATED' | 'PARTIAL' | 'SHORTAGE' | 'CONSUMED' | 'RELEASED';
  created_at?: string;
  updated_at?: string;
}

export interface WorkCenterQueueJob {
  id: string;
  work_center_id: string;
  order_id: string;
  sequence_no: number;
  stage_code: string;
  status: 'QUEUED' | 'IN_OPERATION' | 'COMPLETED' | 'SKIPPED';
  estimated_minutes: number;
  actual_minutes: number;
  operator_id?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at?: string;
}

export interface ProductionOperationLog {
  id: string;
  order_id: string;
  work_center_id?: string | null;
  sequence_no: number;
  stage_code: string;
  quantity_passed: number;
  quantity_scrapped: number;
  scrap_reason?: string | null;
  scrap_weight_grams: number;
  estimated_minutes: number;
  actual_minutes: number;
  operator_id?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface ProductionScrapLedger {
  id: string;
  order_id: string;
  scrap_category:
    | 'CASTING_SPRUE'
    | 'BENCH_FILINGS'
    | 'POLISHING_DUST'
    | 'STONE_DAMAGE'
    | 'CHEMICAL_LOSS'
    | 'RECOVERED_SILVER';
  weight_grams: number;
  silver_purity: string;
  recovered_pure_silver: number;
  recorded_by?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface StockAvailabilityLine {
  line_type: string;
  item_code: string;
  item_name: string;
  required_quantity: number;
  on_hand_quantity: number;
  committed_quantity: number;
  available_quantity: number;
  shortage_quantity: number;
  unit_of_measure: string;
  is_satisfied: boolean;
}

export interface StockAvailabilityResult {
  product_id: string;
  variant_id?: string | null;
  planned_quantity: number;
  is_fully_available: boolean;
  total_shortages_count: number;
  lines: StockAvailabilityLine[];
}

// =============================================================================
// CANONICAL UNIFIED STOCK LEDGER & RECONCILIATION DOMAIN TYPES (Phase 3)
// =============================================================================

export type CanonicalStockMovementType =
  | 'RECEIPT'                // Supplier goods receipt or piece minting intake
  | 'PRODUCTION_COMPLETION'  // Finished goods intake from completed manufacturing order
  | 'PRODUCTION_CONSUMPTION' // Raw material / gemstone consumed into manufacturing WIP
  | 'VAULT_TO_SHOWCASE'     // Movement from secure vault safe to retail showcase
  | 'SHOWCASE_TO_VAULT'     // Movement from retail showcase back to vault safe
  | 'TRANSFER_OUT'           // Inter-warehouse transfer outbound leg
  | 'TRANSFER_IN'            // Inter-warehouse transfer inbound leg
  | 'RESERVATION_HOLD'       // Holding inventory for customer cart / manufacturing order
  | 'RESERVATION_RELEASE'    // Releasing held inventory
  | 'ISSUE'                  // General goods issue
  | 'RETURN'                 // General return
  | 'SALE'                   // Outbound sale to retail / e-commerce customer
  | 'CUSTOMER_RETURN'        // Customer return restocked into vault / QC
  | 'ADJUSTMENT'             // Physical cycle count variance (+/-)
  | 'QUARANTINE_HOLD'        // Placed in quarantine / quality control hold
  | 'QUARANTINE_RELEASE'     // Released from quarantine back to vault/showcase
  | 'SCRAP_RECOVERY';        // Unrecoverable scrap or metal reclamation

export interface StockLedgerEvent {
  id: string;                          // Unique ledger event ID ('led_...')
  organization_id: string;             // Strict tenant isolation
  timestamp: string;                   // ISO-8601 UTC timestamp
  movement_type: CanonicalStockMovementType;
  
  // Entity Identification
  product_id: string;
  sku: string;
  barcode: string;
  piece_id?: string;                   // Populated for serialized pieces
  serial_number?: string;              // Populated for serialized pieces
  
  // Manufacturing & Gemstone Lineage
  batch_id?: string;
  gemstone_lot_ids?: string[];
  manufacturing_order_id?: string;
  wip_lot_id?: string;

  // Physical Location Vector
  source_warehouse_id?: string;
  source_location_code?: string;
  dest_warehouse_id?: string;
  dest_location_code?: string;

  // Quantitative Delta
  quantity_delta: number;              // Signed delta (-1, +1, or non-serialized delta)
  weight_grams_delta: number;          // Signed weight delta
  unit_cost?: number;
  total_cost?: number;

  // Authoritative Running Balance snapshot at event time
  balance_after_transaction: number;

  // Provenance & Security
  actor_user_id: string;
  actor_role: string;
  reference_id?: string;               // Order ID, Transfer ID, Count Session ID
  reference_type?: 'ORDER' | 'TRANSFER' | 'RESERVATION' | 'COUNT' | 'PRODUCTION' | 'SYSTEM';
  reason: string;
  idempotency_key?: string;
  event_hash: string;                  // Cryptographic SHA-256 HMAC of event payload
}

export interface DerivedStockBalance {
  product_id: string;
  sku: string;
  barcode: string;
  name: { en: string; ar: string };
  purity?: string;
  category: string;
  is_serialized: boolean;
  total_on_hand: number;
  vault_stock: number;
  showcase_stock: number;
  reserved_stock: number;
  available_stock: number;
  quarantine_stock: number;
  scrapped_stock: number;
  warehouse_breakdown: Record<string, {
    warehouse_id: string;
    warehouse_name: string;
    on_hand: number;
    vault: number;
    showcase: number;
    reserved: number;
    available: number;
  }>;
}

export interface StockReconciliationDivergence {
  entity_id: string;
  entity_type: 'PIECE' | 'PRODUCT' | 'BATCH';
  sku_or_serial: string;
  ledger_balance: number;
  projected_balance: number;
  discrepancy: number;
  reason: string;
}

export interface StockReconciliationReport {
  timestamp: string;
  organization_id: string;
  warehouse_id?: string;
  total_ledger_events: number;
  total_pieces_evaluated: number;
  is_divergent: boolean;
  divergences: StockReconciliationDivergence[];
}

export * from './erp/planning';
export * from './erp/scheduling';
export * from './erp/execution';

