-- 1. Event Store (Persistence for Domain Events)
CREATE TABLE IF NOT EXISTS public.event_store (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID UNIQUE NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    correlation_id UUID,
    causation_id UUID,
    actor UUID REFERENCES auth.users(id),
    entity_id UUID NOT NULL,
    payload JSONB NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Lookup Tables (Replacing ENUMs)
CREATE TABLE IF NOT EXISTS public.warehouse_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transfer_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stock_transaction_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed Lookup Data
INSERT INTO public.warehouse_types (code, name, sort_order) VALUES
('raw_materials', 'Raw Materials', 10),
('production', 'Production', 20),
('quality_control', 'Quality Control', 30),
('finished_goods', 'Finished Goods', 40),
('showroom', 'Showroom', 50),
('reserved', 'Reserved', 60),
('returns', 'Returns', 70)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.transfer_statuses (code, name, sort_order) VALUES
('draft', 'Draft', 10),
('pending_approval', 'Pending Approval', 20),
('approved', 'Approved', 30),
('in_transit', 'In Transit', 40),
('completed', 'Completed', 50),
('rejected', 'Rejected', 60),
('cancelled', 'Cancelled', 70)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.stock_transaction_types (code, name, sort_order) VALUES
('in', 'Inbound', 10),
('out', 'Outbound', 20),
('transfer_in', 'Transfer In', 30),
('transfer_out', 'Transfer Out', 40),
('adjustment_plus', 'Adjustment (+)', 50),
('adjustment_minus', 'Adjustment (-)', 60)
ON CONFLICT (code) DO NOTHING;

-- 3. Warehouses & Locations
CREATE TABLE IF NOT EXISTS public.warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type_id UUID REFERENCES public.warehouse_types(id) NOT NULL,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.warehouse_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID REFERENCES public.warehouses(id) NOT NULL,
    parent_location_id UUID REFERENCES public.warehouse_locations(id),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    path TEXT, -- Materialized Path for quick traversal
    depth INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 4. Warehouse Transfers
CREATE TABLE IF NOT EXISTS public.warehouse_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_number VARCHAR(50) UNIQUE NOT NULL,
    from_warehouse_id UUID REFERENCES public.warehouses(id),
    to_warehouse_id UUID REFERENCES public.warehouses(id),
    status_id UUID REFERENCES public.transfer_statuses(id) NOT NULL,
    notes TEXT,
    
    -- Workflow Fields
    requested_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    rejected_by UUID REFERENCES auth.users(id),
    rejected_at TIMESTAMP WITH TIME ZONE,
    cancelled_by UUID REFERENCES auth.users(id),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES auth.users(id),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.warehouse_transfer_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID REFERENCES public.warehouse_transfers(id) NOT NULL,
    material_id UUID REFERENCES public.materials(id),
    variant_id UUID REFERENCES public.product_variants(id),
    quantity NUMERIC(12, 4) NOT NULL,
    unit_id UUID REFERENCES public.measurement_units(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 5. Strict Stock Ledger (Immutable)
CREATE TABLE IF NOT EXISTS public.stock_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID REFERENCES public.materials(id),
    variant_id UUID REFERENCES public.product_variants(id),
    warehouse_id UUID REFERENCES public.warehouses(id) NOT NULL,
    location_id UUID REFERENCES public.warehouse_locations(id),
    
    transaction_type_id UUID REFERENCES public.stock_transaction_types(id) NOT NULL,
    
    quantity NUMERIC(12, 4) NOT NULL,
    unit_id UUID REFERENCES public.measurement_units(id) NOT NULL,
    running_balance NUMERIC(12, 4) NOT NULL,
    
    unit_cost NUMERIC(12, 2) DEFAULT 0.00,
    total_cost NUMERIC(12, 2) DEFAULT 0.00,
    
    reference_id UUID, -- E.g. Transfer ID, PO ID
    reference_type VARCHAR(50),
    
    performed_by UUID REFERENCES auth.users(id),
    event_id UUID REFERENCES public.event_store(event_id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. RBAC Foundation
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID REFERENCES public.roles(id) NOT NULL,
    permission_id UUID REFERENCES public.permissions(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

-- Triggers for updated_at
CREATE TRIGGER set_timestamp_warehouse_types BEFORE UPDATE ON public.warehouse_types FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_transfer_statuses BEFORE UPDATE ON public.transfer_statuses FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_stock_transaction_types BEFORE UPDATE ON public.stock_transaction_types FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_warehouses BEFORE UPDATE ON public.warehouses FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_warehouse_locations BEFORE UPDATE ON public.warehouse_locations FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_warehouse_transfers BEFORE UPDATE ON public.warehouse_transfers FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_warehouse_transfer_items BEFORE UPDATE ON public.warehouse_transfer_items FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_roles BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_permissions BEFORE UPDATE ON public.permissions FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- RLS
ALTER TABLE public.event_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transaction_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to event_store" ON public.event_store FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access to warehouse_types" ON public.warehouse_types FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access to transfer_statuses" ON public.transfer_statuses FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access to stock_transaction_types" ON public.stock_transaction_types FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access to warehouses" ON public.warehouses FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access to warehouse_locations" ON public.warehouse_locations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access to warehouse_transfers" ON public.warehouse_transfers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access to warehouse_transfer_items" ON public.warehouse_transfer_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access to stock_ledger" ON public.stock_ledger FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access to roles" ON public.roles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access to permissions" ON public.permissions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access to role_permissions" ON public.role_permissions FOR ALL USING (auth.role() = 'authenticated');
