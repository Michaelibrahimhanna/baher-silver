// =============================================================================
// BAHER SILVER ERP — MANUFACTURING OPERATING SYSTEM
// Milestone: Baher L.4 (Real Shop-Floor Production Execution)
// Core Domain Types, Enums & Contracts
// =============================================================================

export type WIPLotStatus =
  | 'READY_FOR_STAGE'
  | 'IN_PROCESS'
  | 'COMPLETED_STAGE'
  | 'QC_HOLD'
  | 'REWORK'
  | 'CONSUMED_INTO_NEXT'
  | 'SCRAPPED'
  | 'CANCELLED';

export type QCOutcome = 'PASSED' | 'REWORK_REQUIRED' | 'FAILED';

export type MassBalanceStatus = 'NOT_EVALUATED' | 'BALANCED' | 'VARIANCE_BLOCKED' | 'OVERRIDDEN';

export interface ProductionOrderWIPLot {
  id: string;
  order_id: string;
  wip_lot_number: string;
  current_stage_code: string;
  work_center_id: string;
  warehouse_id: string;
  location_id?: string | null;
  quantity: number;
  weight_grams: number;
  status: WIPLotStatus;
  source_wip_lot_id?: string | null;
  destination_stage_code?: string | null;
  version: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProductionMaterialConsumption {
  id: string;
  order_id: string;
  lot_allocation_id: string;
  stage_log_id?: string | null;
  wip_lot_id: string;
  stock_ledger_id: string;
  consumed_quantity: number;
  unit_of_measure: string;
  consumed_at?: string;
  consumed_by?: string | null;
}

export interface ProductionQCInspection {
  id: string;
  order_id: string;
  inspector_id: string;
  stage_code: string;
  sample_size: number;
  passed_count: number;
  failed_count: number;
  rework_count: number;
  outcome: QCOutcome;
  defect_category?: string | null;
  rework_target_stage?: string | null;
  notes?: string | null;
  inspected_at?: string;
}

export interface StageMaterialConsumptionRule {
  id: string;
  line_type: string;
  item_code_pattern: string;
  consumption_stage_code: string;
  work_center_code: string;
  description?: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface MassBalanceResult {
  order_id: string;
  order_code: string;
  measured_input_silver_grams: number;
  measured_finished_goods_silver_grams: number;
  measured_scrap_silver_grams: number;
  expected_loss_grams: number;
  total_accounted_grams: number;
  variance_grams: number;
  is_balanced: boolean; // |variance| <= 0.5000g
  status: MassBalanceStatus;
  scrap_breakdown: Record<string, number>;
  recovered_pure_silver_grams: number;
}

export interface ExecutionSummaryDTO {
  order_id: string;
  order_code: string;
  status: string;
  planned_quantity: number;
  completed_quantity: number;
  scrapped_quantity: number;
  current_stage_code?: string | null;
  current_work_center_code?: string | null;
  active_wip_quantity: number;
  active_wip_weight_grams: number;
  qc_status: string;
  mass_balance_status: MassBalanceStatus;
  stages_completed_count: number;
  total_stages_count: number;
}

export interface StartStageInput {
  order_id: string;
  stage_code: string;
  actor_id: string;
  operator_id?: string;
  idempotency_key?: string;
}

export interface CompleteStageInput {
  order_id: string;
  stage_code: string;
  actor_id: string;
  passed_quantity: number;
  scrapped_quantity?: number;
  rework_quantity?: number;
  measured_output_weight_grams: number;
  scrap_weight_grams?: number;
  scrap_category?:
    | 'CASTING_SPRUE'
    | 'BENCH_FILINGS'
    | 'POLISHING_DUST'
    | 'STONE_DAMAGE'
    | 'CHEMICAL_LOSS'
    | 'RECOVERED_SILVER';
  scrap_reason?: string;
  rework_target_stage?: string;
  actual_minutes?: number;
  notes?: string;
  idempotency_key?: string;
}

export interface ConsumeMaterialInput {
  order_id: string;
  stage_code: string;
  actor_id: string;
  lot_allocation_id?: string;
  quantity?: number;
  idempotency_key?: string;
}

export interface RecordQCInput {
  order_id: string;
  inspector_id: string;
  sample_size: number;
  passed_count: number;
  failed_count?: number;
  rework_count?: number;
  outcome: QCOutcome;
  defect_category?: string;
  rework_target_stage?: string;
  notes?: string;
  idempotency_key?: string;
}

export interface CompleteOrderInput {
  order_id: string;
  actor_id: string;
  notes?: string;
  idempotency_key?: string;
}

export interface CancelExecutionInput {
  order_id: string;
  actor_id: string;
  reason: string;
  idempotency_key?: string;
}
