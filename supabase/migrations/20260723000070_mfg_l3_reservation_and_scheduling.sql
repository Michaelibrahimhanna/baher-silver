-- =============================================================================
-- MILESTONE L.3 ADDITIVE MIGRATION: MATERIAL RESERVATION & CAPACITY SCHEDULING
-- Migration: 20260723000070_mfg_l3_reservation_and_scheduling.sql
-- Strictly additive, non-destructive, and backward-compatible.
-- =============================================================================

-- 1. Enable btree_gist extension for scalar + range exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Extend inventory_batches (Milestone K table) with reserved_quantity
ALTER TABLE public.inventory_batches
ADD COLUMN IF NOT EXISTS reserved_quantity NUMERIC(12, 4) NOT NULL DEFAULT 0.0000;

-- Idempotent check constraint for inventory_batches bounds
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_inventory_batches_reserved_bounds'
    ) THEN
        ALTER TABLE public.inventory_batches
        ADD CONSTRAINT chk_inventory_batches_reserved_bounds
        CHECK (reserved_quantity >= 0.0000 AND reserved_quantity <= remaining_quantity);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_inventory_batches_avail_l3
ON public.inventory_batches (material_id, warehouse_id, remaining_quantity, reserved_quantity);

-- 3. Extend work_center_queue_jobs (Milestone L.0.1 table) with scheduling columns
ALTER TABLE public.work_center_queue_jobs
ADD COLUMN IF NOT EXISTS scheduled_start_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS scheduled_end_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS scheduling_status VARCHAR(30) DEFAULT 'SCHEDULED';

-- Idempotent exclusion constraint preventing overlapping bookings on the same work center
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ex_work_center_no_time_overlap'
    ) THEN
        ALTER TABLE public.work_center_queue_jobs
        ADD CONSTRAINT ex_work_center_no_time_overlap
        EXCLUDE USING gist (
            work_center_id WITH =,
            tstzrange(scheduled_start_time, scheduled_end_time, '[)') WITH &&
        )
        WHERE (status != 'CANCELLED' AND scheduled_start_time IS NOT NULL AND scheduled_end_time IS NOT NULL);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_wc_queue_jobs_schedule_l3 
ON public.work_center_queue_jobs (work_center_id, scheduled_start_time, scheduled_end_time);

-- 4. Extend production_orders with scheduling sub-status and override fields
ALTER TABLE public.production_orders
ADD COLUMN IF NOT EXISTS scheduling_status VARCHAR(30) DEFAULT 'UNSCHEDULED',
ADD COLUMN IF NOT EXISTS target_date_breached BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS override_authorized_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_production_orders_sched_status
ON public.production_orders (scheduling_status);

-- 5. Extend production_material_allocations with released_quantity if missing
ALTER TABLE public.production_material_allocations
ADD COLUMN IF NOT EXISTS released_quantity NUMERIC(12, 4) NOT NULL DEFAULT 0.0000;

-- 6. Create Granular Child Lot Allocations Table (Tier 2 Physical Traceability)
CREATE TABLE IF NOT EXISTS public.production_material_lot_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    allocation_id UUID NOT NULL REFERENCES public.production_material_allocations(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
    line_type VARCHAR(30) NOT NULL, -- SILVER, STONE, COMPONENT, CHEMICAL, CONSUMABLE, PACKAGING
    
    -- Physical Lot Source Linkage (Mutually exclusive)
    inventory_batch_id UUID REFERENCES public.inventory_batches(id) ON DELETE RESTRICT,
    gemstone_lot_id UUID REFERENCES public.gemstone_lots(id) ON DELETE RESTRICT,
    
    -- Exact Quantities
    allocated_quantity NUMERIC(12, 4) NOT NULL CHECK (allocated_quantity > 0.0000),
    consumed_quantity NUMERIC(12, 4) NOT NULL DEFAULT 0.0000 CHECK (consumed_quantity >= 0.0000),
    released_quantity NUMERIC(12, 4) NOT NULL DEFAULT 0.0000 CHECK (released_quantity >= 0.0000),
    unit_of_measure VARCHAR(10) NOT NULL,
    
    -- Lifecycle Status
    status VARCHAR(40) NOT NULL DEFAULT 'RESERVED', -- RESERVED, CONSUMED, PARTIALLY_CONSUMED, PARTIALLY_CONSUMED_AND_RELEASED, RELEASED, CANCELLED
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT chk_lot_source_mutually_exclusive CHECK (
        (inventory_batch_id IS NOT NULL AND gemstone_lot_id IS NULL) OR
        (gemstone_lot_id IS NOT NULL AND inventory_batch_id IS NULL)
    ),
    CONSTRAINT chk_lot_alloc_bounds CHECK (
        consumed_quantity + released_quantity <= allocated_quantity
    )
);

CREATE INDEX IF NOT EXISTS idx_lot_alloc_order ON public.production_material_lot_allocations(order_id);
CREATE INDEX IF NOT EXISTS idx_lot_alloc_parent ON public.production_material_lot_allocations(allocation_id);
CREATE INDEX IF NOT EXISTS idx_lot_alloc_batch ON public.production_material_lot_allocations(inventory_batch_id);
CREATE INDEX IF NOT EXISTS idx_lot_alloc_stone ON public.production_material_lot_allocations(gemstone_lot_id);

-- 7. Seed Milestone L.3 Permissions
INSERT INTO public.permissions (code, name, category) VALUES
('mfg:reservation:create', 'Create physical lot material reservation', 'manufacturing'),
('mfg:reservation:release', 'Release physical lot material reservation', 'manufacturing'),
('mfg:schedule:create', 'Create finite work center production schedule', 'manufacturing'),
('mfg:schedule:override_capacity', 'Override capacity shortage or target date breach', 'manufacturing')
ON CONFLICT (code) DO NOTHING;

-- 8. Enable Row-Level Security (RLS) on lot allocations
ALTER TABLE public.production_material_lot_allocations ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'production_material_lot_allocations' AND policyname = 'Tenant and branch isolation for lot_allocations'
    ) THEN
        CREATE POLICY "Tenant and branch isolation for lot_allocations"
        ON public.production_material_lot_allocations FOR ALL
        USING (
            order_id IN (
                SELECT id FROM public.production_orders
                WHERE organization_id = (auth.jwt() ->> 'organization_id')::uuid
                  AND (branch_id IS NULL OR branch_id = (auth.jwt() ->> 'branch_id')::uuid)
            )
        );
    END IF;
END $$;
