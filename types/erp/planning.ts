// =============================================================================
// BAHER SILVER ERP — MANUFACTURING OPERATING SYSTEM
// Milestone: Baher L.2 (Production Order Planning & Snapshot-Safe BOM)
// Core Domain Types, Enums & Contracts
// =============================================================================

export type ProductionOrderStatus =
  | 'DRAFT'
  | 'PLANNED'
  | 'SHORTAGE_BLOCKED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'QUALITY_CHECK'
  | 'COMPLETED'
  | 'CLOSED'
  | 'CANCELLED';

export type ReadinessStatus =
  | 'NOT_EVALUATED'
  | 'READY'
  | 'PARTIALLY_READY'
  | 'NOT_READY';

export type ReservationStatus =
  | 'UNRESERVED'
  | 'PARTIALLY_RESERVED'
  | 'FULLY_RESERVED'
  | 'CONSUMED'
  | 'RELEASED';

export type QCStatus =
  | 'NOT_STARTED'
  | 'IN_INSPECTION'
  | 'PASSED'
  | 'FAILED'
  | 'REWORK_REQUIRED';

export type BOMStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'SUPERSEDED';

export type BOMLineType =
  | 'SILVER'
  | 'STONE'
  | 'COMPONENT'
  | 'CHEMICAL'
  | 'PACKAGING'
  | 'CONSUMABLE';

export interface BOMSnapshotLine {
  line_number: number;
  line_type: BOMLineType;
  item_id: string;
  item_code: string;
  item_name: string;
  purity?: string | null;
  base_quantity: number;
  waste_factor_pct: number;
  unit_of_measure: string;
  unit_cost_snapshot?: number | null;
}

export interface ProductionOrderBOMSnapshot {
  id: string;
  order_id: string;
  bom_id: string;
  bom_version: number;
  snapshot_hash: string;
  snapshot_data: BOMSnapshotLine[];
  snapshotted_by?: string | null;
  snapshotted_at: string;
}

export interface MaterialRequirementLine {
  line_number: number;
  line_type: BOMLineType;
  item_id: string;
  item_code: string;
  item_name: string;
  unit_of_measure: string;
  base_quantity: number;
  waste_factor_pct: number;
  net_required_quantity: number;
  gross_required_quantity: number;
  on_hand_quantity: number;
  committed_quantity: number;
  net_available_quantity: number;
  shortage_quantity: number;
  status: 'READY' | 'SHORTAGE';
}

export interface WarehouseReadinessReport {
  order_id: string;
  order_code: string;
  product_id: string;
  variant_id: string;
  sku: string;
  planned_quantity: number;
  warehouse_id: string;
  evaluated_at: string;
  overall_status: ReadinessStatus;
  total_shortages_count: number;
  critical_silver_available: boolean;
  lines: MaterialRequirementLine[];
}

export interface CreateDraftOrderInput {
  organization_id: string;
  branch_id: string;
  warehouse_id: string;
  product_id: string;
  variant_id: string;
  planned_quantity: number;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  target_date: string;
  notes?: string;
  created_by?: string;
}

export interface ConfirmOrderOptions {
  actor_id?: string;
  manager_override_token?: string;
  justification?: string;
  idempotency_key?: string;
}
