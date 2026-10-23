-- =============================================================================
-- MILESTONE L.4 ADDITIVE MIGRATION: REAL SHOP-FLOOR PRODUCTION EXECUTION
-- Migration: 20260724000080_mfg_l4_production_execution.sql
-- Strictly additive, non-destructive, and backward-compatible with I, J, K, L.1, L.2, L.3.
-- =============================================================================

-- 1. STAGE MATERIAL CONSUMPTION RULES (LOOKUP TABLE)
CREATE TABLE IF NOT EXISTS public.stage_material_consumption_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    line_type VARCHAR(30) NOT NULL, -- SILVER, STONE, CHEMICAL, PACKAGING, COMPONENT, CONSUMABLE
    item_code_pattern VARCHAR(100) NOT NULL DEFAULT '*',
    consumption_stage_code VARCHAR(30) NOT NULL, -- CASTING, SETTING, RHODIUM, PACKAGING, CLEANING, POLISHING
    work_center_code VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed Factory Standard Consumption Stage Rules
INSERT INTO public.stage_material_consumption_rules (line_type, item_code_pattern, consumption_stage_code, work_center_code, description) VALUES
('SILVER', '*', 'CASTING', 'WC-CASTING', 'Silver raw materials and casting grains consumed at furnace melt'),
('STONE', '*', 'SETTING', 'WC-SETTING', 'Gemstones issued and set into jewelry pieces at setting bench'),
('CHEMICAL', '*RHODIUM*', 'RHODIUM', 'WC-RHODIUM', 'Rhodium plating concentrates consumed in electroplating bath'),
('CHEMICAL', '*', 'CLEANING', 'WC-CLEANING', 'Degreasing and ultrasonic cleaning solutions'),
('COMPONENT', '*', 'SETTING', 'WC-SETTING', 'Pre-fabricated mounts, clasps, and bezels'),
('CONSUMABLE', '*', 'POLISHING', 'WC-POLISHING', 'Abrasive rouge, polishing compounds, and tumbling media'),
('PACKAGING', '*', 'PACKAGING', 'WC-PACKAGING', 'Velvet boxes, certificates, tags, and pouches')
ON CONFLICT DO NOTHING;

-- 2. PRODUCTION ORDER WIP LOTS (AUTHORITATIVE PHYSICAL PIECE CUSTODY)
CREATE TABLE IF NOT EXISTS public.production_order_wip_lots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
    wip_lot_number VARCHAR(100) NOT NULL UNIQUE,
    
    -- Physical Topology
    current_stage_code VARCHAR(30) NOT NULL,
    work_center_id UUID NOT NULL REFERENCES public.work_centers(id),
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
    location_id UUID REFERENCES public.warehouse_locations(id),
    
    -- Quantity & Weight Conservation
    quantity INTEGER NOT NULL CHECK (quantity >= 0),
    weight_grams NUMERIC(12, 4) NOT NULL CHECK (weight_grams >= 0.0000),
    
    -- Authoritative State Machine
    status VARCHAR(30) NOT NULL CHECK (
        status IN (
            'READY_FOR_STAGE',
            'IN_PROCESS',
            'COMPLETED_STAGE',
            'QC_HOLD',
            'REWORK',
            'CONSUMED_INTO_NEXT',
            'SCRAPPED',
            'CANCELLED'
        )
    ),
    
    -- Lineage Tracking
    source_wip_lot_id UUID REFERENCES public.production_order_wip_lots(id),
    destination_stage_code VARCHAR(30),
    
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wip_order ON public.production_order_wip_lots(order_id);
CREATE INDEX IF NOT EXISTS idx_wip_stage ON public.production_order_wip_lots(current_stage_code);
CREATE INDEX IF NOT EXISTS idx_wip_status ON public.production_order_wip_lots(status);
CREATE INDEX IF NOT EXISTS idx_wip_source ON public.production_order_wip_lots(source_wip_lot_id);

-- 3. PRODUCTION QC INSPECTIONS (100% UNIT INSPECTION AUDIT)
CREATE TABLE IF NOT EXISTS public.production_qc_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
    inspector_id UUID NOT NULL REFERENCES auth.users(id),
    stage_code VARCHAR(30) NOT NULL DEFAULT 'QC',
    
    sample_size INTEGER NOT NULL CHECK (sample_size > 0),
    passed_count INTEGER NOT NULL CHECK (passed_count >= 0),
    failed_count INTEGER NOT NULL CHECK (failed_count >= 0),
    rework_count INTEGER NOT NULL CHECK (rework_count >= 0),
    
    outcome VARCHAR(30) NOT NULL CHECK (outcome IN ('PASSED', 'REWORK_REQUIRED', 'FAILED')),
    defect_category VARCHAR(50),
    rework_target_stage VARCHAR(30),
    notes TEXT,
    inspected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT chk_qc_counts_balance CHECK (
        sample_size = passed_count + failed_count + rework_count
    )
);

CREATE INDEX IF NOT EXISTS idx_qc_order ON public.production_qc_inspections(order_id);
CREATE INDEX IF NOT EXISTS idx_qc_outcome ON public.production_qc_inspections(outcome);

-- 4. ADDITIVE EXTENSIONS TO INVENTORY_BATCHES (FINISHED GOODS LINEAGE)
ALTER TABLE public.inventory_batches
ADD COLUMN IF NOT EXISTS source_wip_lot_id UUID REFERENCES public.production_order_wip_lots(id) ON DELETE RESTRICT,
ADD COLUMN IF NOT EXISTS production_order_id UUID REFERENCES public.production_orders(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_inv_batches_wip ON public.inventory_batches(source_wip_lot_id);
CREATE INDEX IF NOT EXISTS idx_inv_batches_mfg_order ON public.inventory_batches(production_order_id);

-- Layer 1 Constraints on inventory_batches
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_batch_lineage_co_dependency') THEN
        ALTER TABLE public.inventory_batches
        ADD CONSTRAINT chk_batch_lineage_co_dependency
        CHECK (
            (source_wip_lot_id IS NULL AND production_order_id IS NULL) OR
            (source_wip_lot_id IS NOT NULL AND production_order_id IS NOT NULL)
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_mfg_batch_variant_required') THEN
        ALTER TABLE public.inventory_batches
        ADD CONSTRAINT chk_mfg_batch_variant_required
        CHECK (
            production_order_id IS NULL OR (variant_id IS NOT NULL AND material_id IS NULL)
        );
    END IF;
END $$;

-- Layer 2 Trigger: Verify manufactured batch references completed PACKAGING WIP lot
CREATE OR REPLACE FUNCTION public.fn_verify_mfg_batch_lineage()
RETURNS TRIGGER AS $$
DECLARE
    v_wip RECORD;
BEGIN
    IF NEW.production_order_id IS NOT NULL THEN
        SELECT id, order_id, current_stage_code, status, quantity
        INTO v_wip
        FROM public.production_order_wip_lots
        WHERE id = NEW.source_wip_lot_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Manufactured Finished Goods batch must reference a valid WIP lot.';
        END IF;

        IF v_wip.order_id <> NEW.production_order_id THEN
            RAISE EXCEPTION 'Mismatched lineage: WIP lot order (%) does not match batch order (%).',
                v_wip.order_id, NEW.production_order_id;
        END IF;

        IF v_wip.current_stage_code <> 'PACKAGING' OR v_wip.status <> 'COMPLETED_STAGE' THEN
            RAISE EXCEPTION 'Manufactured Finished Goods batch can only be generated from a COMPLETED_STAGE PACKAGING WIP lot.';
        END IF;

        IF NEW.original_quantity <> v_wip.quantity THEN
            RAISE EXCEPTION 'Finished Goods batch quantity (%) does not match final WIP lot passed quantity (%).',
                NEW.original_quantity, v_wip.quantity;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_mfg_batch_lineage ON public.inventory_batches;
CREATE TRIGGER trg_enforce_mfg_batch_lineage
BEFORE INSERT OR UPDATE ON public.inventory_batches
FOR EACH ROW EXECUTE FUNCTION public.fn_verify_mfg_batch_lineage();

-- 5. PRODUCTION OPERATION LOGS ADDITIVE EXTENSIONS
ALTER TABLE public.production_operation_logs
ADD COLUMN IF NOT EXISTS queue_job_id UUID REFERENCES public.work_center_queue_jobs(id),
ADD COLUMN IF NOT EXISTS wip_lot_id UUID REFERENCES public.production_order_wip_lots(id),
ADD COLUMN IF NOT EXISTS quantity_in INTEGER,
ADD COLUMN IF NOT EXISTS quantity_reworked INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_op_logs_queue_job ON public.production_operation_logs(queue_job_id);
CREATE INDEX IF NOT EXISTS idx_op_logs_wip ON public.production_operation_logs(wip_lot_id);

-- 6. PRODUCTION MATERIAL CONSUMPTIONS (RELATIONAL LINEAGE BRIDGE)
CREATE TABLE IF NOT EXISTS public.production_material_consumptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
    lot_allocation_id UUID NOT NULL REFERENCES public.production_material_lot_allocations(id) ON DELETE RESTRICT,
    stage_log_id UUID REFERENCES public.production_operation_logs(id) ON DELETE RESTRICT,
    wip_lot_id UUID REFERENCES public.production_order_wip_lots(id) ON DELETE RESTRICT,
    stock_ledger_id UUID NOT NULL REFERENCES public.stock_ledger(id) ON DELETE RESTRICT,
    
    consumed_quantity NUMERIC(12, 4) NOT NULL CHECK (consumed_quantity > 0.0000),
    unit_of_measure VARCHAR(10) NOT NULL,
    consumed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    consumed_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_pmc_order ON public.production_material_consumptions(order_id);
CREATE INDEX IF NOT EXISTS idx_pmc_wip ON public.production_material_consumptions(wip_lot_id);
CREATE INDEX IF NOT EXISTS idx_pmc_alloc ON public.production_material_consumptions(lot_allocation_id);
CREATE INDEX IF NOT EXISTS idx_pmc_ledger ON public.production_material_consumptions(stock_ledger_id);

-- 7. WORK CENTER QUEUE JOBS ADDITIVE EXTENSIONS
ALTER TABLE public.work_center_queue_jobs
ADD COLUMN IF NOT EXISTS actual_start_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS actual_end_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rework_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS operator_id UUID REFERENCES auth.users(id);

-- 8. PRODUCTION SCRAP LEDGER ADDITIVE EXTENSIONS
ALTER TABLE public.production_scrap_ledger
ADD COLUMN IF NOT EXISTS stage_log_id UUID REFERENCES public.production_operation_logs(id),
ADD COLUMN IF NOT EXISTS work_center_id UUID REFERENCES public.work_centers(id);

-- 9. PRODUCTION ORDERS ADDITIVE EXTENSIONS
ALTER TABLE public.production_orders
ADD COLUMN IF NOT EXISTS mass_balance_status VARCHAR(30) NOT NULL DEFAULT 'NOT_EVALUATED',
ADD COLUMN IF NOT EXISTS qc_status VARCHAR(30) NOT NULL DEFAULT 'NOT_STARTED';

-- 10. IDEMPOTENCY RECORDS EVOLUTION (SAFE COMPOSITE UNIQUE IDENTITY)
ALTER TABLE public.idempotency_records
ADD COLUMN IF NOT EXISTS organization_id UUID,
ADD COLUMN IF NOT EXISTS endpoint VARCHAR(255),
ADD COLUMN IF NOT EXISTS request_hash VARCHAR(64);

-- Backfill existing L.2/L.3 idempotency records safely
UPDATE public.idempotency_records
SET endpoint = COALESCE(endpoint, action, 'unknown'),
    organization_id = COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid)
WHERE endpoint IS NULL OR organization_id IS NULL;

ALTER TABLE public.idempotency_records
ALTER COLUMN organization_id SET NOT NULL,
ALTER COLUMN endpoint SET NOT NULL;

-- Drop legacy standalone UNIQUE(key) constraint if present
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'idempotency_records_key_key'
    ) THEN
        ALTER TABLE public.idempotency_records DROP CONSTRAINT idempotency_records_key_key;
    END IF;
END $$;

-- Enforce new authoritative composite constraint: (organization_id, endpoint, key)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_idempotency_org_endpoint_key'
    ) THEN
        ALTER TABLE public.idempotency_records
        ADD CONSTRAINT uq_idempotency_org_endpoint_key
        UNIQUE (organization_id, endpoint, key);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_idempotency_org_endpoint_key
ON public.idempotency_records (organization_id, endpoint, key);

-- 11. SEED MILESTONE L.4 PERMISSIONS
INSERT INTO public.permissions (code, name, category) VALUES
('mfg:execution:start', 'Start shop-floor production order execution', 'manufacturing'),
('mfg:stage:execute', 'Clock in, pause, resume, and complete stage queue jobs', 'manufacturing'),
('mfg:material:consume', 'Physically issue and consume allocated inventory lots', 'manufacturing'),
('mfg:scrap:record', 'Record workshop scrap, filings, buffing dust, and broken stones', 'manufacturing'),
('mfg:scrap:override_mass_balance', 'Authorize completion if silver variance exceeds 0.5g tolerance', 'manufacturing'),
('mfg:qc:inspect', 'Perform 100% piece QC inspection, approve, reject, or route to rework', 'manufacturing'),
('mfg:execution:complete', 'Receive finished goods into factory vault and complete production', 'manufacturing'),
('mfg:execution:cancel', 'Execute controlled workshop abort and return materials to recovery', 'manufacturing')
ON CONFLICT (code) DO NOTHING;

-- 12. ROW LEVEL SECURITY (RLS) ON NEW L.4 TABLES
ALTER TABLE public.production_order_wip_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_qc_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_material_consumptions ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'production_order_wip_lots' AND policyname = 'Tenant and branch isolation for wip_lots'
    ) THEN
        CREATE POLICY "Tenant and branch isolation for wip_lots"
        ON public.production_order_wip_lots FOR ALL
        USING (
            order_id IN (
                SELECT id FROM public.production_orders
                WHERE organization_id = (auth.jwt() ->> 'organization_id')::uuid
                  AND (branch_id IS NULL OR branch_id = (auth.jwt() ->> 'branch_id')::uuid)
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'production_qc_inspections' AND policyname = 'Tenant isolation for qc_inspections'
    ) THEN
        CREATE POLICY "Tenant isolation for qc_inspections"
        ON public.production_qc_inspections FOR ALL
        USING (
            order_id IN (
                SELECT id FROM public.production_orders
                WHERE organization_id = (auth.jwt() ->> 'organization_id')::uuid
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'production_material_consumptions' AND policyname = 'Tenant isolation for material_consumptions'
    ) THEN
        CREATE POLICY "Tenant isolation for material_consumptions"
        ON public.production_material_consumptions FOR ALL
        USING (
            order_id IN (
                SELECT id FROM public.production_orders
                WHERE organization_id = (auth.jwt() ->> 'organization_id')::uuid
            )
        );
    END IF;
END $$;
