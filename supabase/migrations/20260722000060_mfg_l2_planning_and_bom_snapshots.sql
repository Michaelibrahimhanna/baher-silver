-- =============================================================================
-- BAHER SILVER ERP — MANUFACTURING OPERATING SYSTEM
-- Milestone: Baher L.2 (Production Order Planning & Snapshot-Safe BOM)
-- Non-destructive additive migration. Preserves Frozen Baselines I, J, K, L.1.
-- =============================================================================

-- 1. ENHANCE MASTER BOMS FOR APPROVAL WORKFLOW
ALTER TABLE public.boms 
ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'DRAFT',
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_boms_variant_status_dates 
ON public.boms (variant_id, status, is_active, effective_from, effective_to);

-- 2. ENHANCE PRODUCTION ORDERS (ADDITIVE ONLY — NO COLLISION WITH L.0.1)
ALTER TABLE public.production_orders
ADD COLUMN IF NOT EXISTS organization_id UUID,
ADD COLUMN IF NOT EXISTS branch_id UUID,
ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES public.warehouses(id),
ADD COLUMN IF NOT EXISTS bom_id UUID REFERENCES public.boms(id),
ADD COLUMN IF NOT EXISTS bom_version INTEGER,
ADD COLUMN IF NOT EXISTS bom_snapshot_id UUID,
ADD COLUMN IF NOT EXISTS readiness_status VARCHAR(30) DEFAULT 'NOT_EVALUATED',
ADD COLUMN IF NOT EXISTS reservation_status VARCHAR(30) DEFAULT 'UNRESERVED',
ADD COLUMN IF NOT EXISTS qc_status VARCHAR(30) DEFAULT 'NOT_STARTED';

CREATE INDEX IF NOT EXISTS idx_production_orders_org_branch 
ON public.production_orders (organization_id, branch_id);

CREATE INDEX IF NOT EXISTS idx_production_orders_readiness 
ON public.production_orders (readiness_status);

CREATE INDEX IF NOT EXISTS idx_production_orders_snapshot 
ON public.production_orders (bom_snapshot_id);

-- 3. PRODUCTION ORDER BOM SNAPSHOTS (IMMUTABLE HISTORICAL RECIPES)
CREATE TABLE IF NOT EXISTS public.production_order_bom_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.production_orders(id) ON DELETE RESTRICT,
    bom_id UUID NOT NULL REFERENCES public.boms(id) ON DELETE RESTRICT,
    bom_version INTEGER NOT NULL,
    snapshot_hash VARCHAR(64) NOT NULL, -- SHA-256 Hex Digest of Canonical JSON
    snapshot_data JSONB NOT NULL,       -- Deterministically sorted component lines
    snapshotted_by UUID REFERENCES auth.users(id),
    snapshotted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT uq_order_bom_snapshot UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_pobs_bom_id 
ON public.production_order_bom_snapshots (bom_id);

-- Attach foreign key constraint back to production_orders safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_production_orders_bom_snapshot'
  ) THEN
    ALTER TABLE public.production_orders
    ADD CONSTRAINT fk_production_orders_bom_snapshot
    FOREIGN KEY (bom_snapshot_id) REFERENCES public.production_order_bom_snapshots(id);
  END IF;
END $$;

-- 4. IDEMPOTENCY RECORDS (PREVENTS DUPLICATE MUTATIONS)
CREATE TABLE IF NOT EXISTS public.idempotency_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) UNIQUE NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource_id VARCHAR(100),
    response_payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_idempotency_key 
ON public.idempotency_records (key);

-- 5. SEED L.2 MANUFACTURING PERMISSIONS
INSERT INTO public.permissions (name, description) VALUES
('mfg:order:create', 'Create draft manufacturing production orders'),
('mfg:order:plan', 'Calculate requirements and evaluate warehouse readiness'),
('mfg:order:confirm', 'Freeze immutable BOM snapshot and confirm production order'),
('mfg:order:override_shortage', 'Authorize manager override for partially ready production orders'),
('mfg:order:cancel', 'Cancel pending or planned production orders'),
('bom:master:approve', 'Approve engineering Bill of Materials for production')
ON CONFLICT (name) DO NOTHING;

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.production_order_bom_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to bom_snapshots" 
ON public.production_order_bom_snapshots FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admins have full access to idempotency_records" 
ON public.idempotency_records FOR ALL USING (auth.role() = 'authenticated');
