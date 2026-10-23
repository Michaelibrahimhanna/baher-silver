// =============================================================================
// DOMAIN TYPES & INTERFACES: MILESTONE L.3
// PHYSICAL MATERIAL RESERVATION & WORK CENTER CAPACITY SCHEDULING
// =============================================================================

export type LotAllocationStatus =
  | 'RESERVED'
  | 'CONSUMED'
  | 'PARTIALLY_CONSUMED'
  | 'PARTIALLY_CONSUMED_AND_RELEASED'
  | 'RELEASED'
  | 'CANCELLED';

export type OrderReservationStatus =
  | 'UNRESERVED'
  | 'RESERVING'
  | 'RESERVED'
  | 'PARTIALLY_RESERVED'
  | 'RESERVATION_BLOCKED'
  | 'RELEASED';

export type OrderSchedulingStatus =
  | 'UNSCHEDULED'
  | 'SCHEDULING'
  | 'SCHEDULED'
  | 'CAPACITY_BLOCKED'
  | 'CANCELLED';

export interface ProductionMaterialLotAllocation {
  id: string;
  allocation_id: string;
  order_id: string;
  line_type: string;
  inventory_batch_id: string | null;
  gemstone_lot_id: string | null;
  allocated_quantity: number;
  consumed_quantity: number;
  released_quantity: number;
  unit_of_measure: string;
  status: LotAllocationStatus;
  created_at?: string;
  updated_at?: string;
  
  // Joined details (optional)
  batch_number?: string;
  lot_number?: string;
}

export interface WorkCenterQueueJobExtended {
  id: string;
  work_center_id: string;
  order_id: string;
  sequence_no: number;
  stage_code: string;
  status: string;
  estimated_minutes: number;
  actual_minutes?: number;
  operator_id?: string | null;
  scheduled_start_time?: string | null;
  scheduled_end_time?: string | null;
  scheduling_status?: string;
  started_at?: string | null;
  completed_at?: string | null;
  created_at?: string;

  // Joined work center details
  work_center_code?: string;
  work_center_name?: string;
}

export interface ReserveMaterialsInput {
  order_id: string;
  actor_id?: string;
  idempotency_key?: string;
}

export interface ReserveMaterialsResult {
  order_id: string;
  reservation_status: OrderReservationStatus;
  total_lines_reserved: number;
  total_lots_locked: number;
  allocations: ProductionMaterialLotAllocation[];
  timestamp: string;
}

export interface ReleaseMaterialsInput {
  order_id: string;
  actor_id?: string;
  reason?: string;
  idempotency_key?: string;
}

export interface ReleaseMaterialsResult {
  order_id: string;
  reservation_status: OrderReservationStatus;
  total_released_quantity: number;
  lots_released_count: number;
  timestamp: string;
}

export interface ScheduleOrderInput {
  order_id: string;
  actor_id?: string;
  target_date?: string;
  idempotency_key?: string;
}

export interface ScheduleOrderResult {
  order_id: string;
  scheduling_status: OrderSchedulingStatus;
  target_date_breached: boolean;
  scheduled_start: string;
  scheduled_finish: string;
  target_date: string | null;
  overrun_days?: number;
  queue_jobs: WorkCenterQueueJobExtended[];
  timestamp: string;
}

export interface OverrideCapacityInput {
  order_id: string;
  actor_id: string;
  justification: string;
  idempotency_key?: string;
}

export interface OverrideCapacityResult {
  order_id: string;
  scheduling_status: OrderSchedulingStatus;
  override_authorized_by: string;
  justification: string;
  queue_jobs: WorkCenterQueueJobExtended[];
  timestamp: string;
}

export interface ProductionExecutionHandoffEnvelope {
  order_id: string;
  order_code: string;
  product_id: string;
  variant_id: string | null;
  planned_quantity: number;
  warehouse_id: string;
  bom_snapshot_id: string;
  target_date: string | null;
  scheduled_start: string;
  scheduled_finish: string;
  material_reservations: Array<{
    parent_allocation_id: string;
    item_code: string;
    line_type: string;
    total_reserved_quantity: number;
    unit: string;
    lots: Array<{
      child_lot_allocation_id: string;
      source_type: 'INVENTORY_BATCH' | 'GEMSTONE_LOT';
      source_id: string;
      batch_lot_number: string;
      reserved_quantity: number;
    }>;
  }>;
  queue_jobs: Array<{
    job_id: string;
    work_center_id: string;
    work_center_code: string;
    sequence_no: number;
    stage_code: string;
    scheduled_start: string;
    scheduled_end: string;
    estimated_minutes: number;
  }>;
  generated_at: string;
}
