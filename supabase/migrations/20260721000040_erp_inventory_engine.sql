-- 1. Settings & Feature Flags
CREATE TABLE IF NOT EXISTS public.erp_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000',
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.erp_settings (setting_key, setting_value, description) VALUES
('allow_negative_stock', 'false'::jsonb, 'Allow stock ledger balance to go below zero.')
ON CONFLICT (setting_key) DO NOTHING;

-- 2. Generic Inventory Transactions
CREATE TABLE IF NOT EXISTS public.inventory_transaction_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory_transaction_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.inventory_transaction_types (code, name, sort_order) VALUES
('goods_receipt', 'Goods Receipt', 10),
('goods_issue', 'Goods Issue', 20),
('stock_adjustment', 'Stock Adjustment', 30),
('physical_count', 'Physical Count', 40)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.inventory_transaction_statuses (code, name, sort_order) VALUES
('draft', 'Draft', 10),
('pending_approval', 'Pending Approval', 20),
('approved', 'Approved', 30),
('completed', 'Completed', 40),
('cancelled', 'Cancelled', 50)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_type_id UUID REFERENCES public.inventory_transaction_types(id) NOT NULL,
    status_id UUID REFERENCES public.inventory_transaction_statuses(id) NOT NULL,
    reference_number VARCHAR(50) UNIQUE NOT NULL,
    warehouse_id UUID REFERENCES public.warehouses(id) NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.inventory_transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES public.inventory_transactions(id) NOT NULL,
    material_id UUID REFERENCES public.materials(id),
    variant_id UUID REFERENCES public.product_variants(id),
    location_id UUID REFERENCES public.warehouse_locations(id),
    quantity NUMERIC(12, 4) NOT NULL,
    unit_cost NUMERIC(12, 2) DEFAULT 0.00,
    total_cost NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 3. Inventory Batches (FIFO Support)
CREATE TABLE IF NOT EXISTS public.inventory_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID REFERENCES public.materials(id),
    variant_id UUID REFERENCES public.product_variants(id),
    warehouse_id UUID REFERENCES public.warehouses(id) NOT NULL,
    location_id UUID REFERENCES public.warehouse_locations(id),
    receipt_transaction_id UUID REFERENCES public.inventory_transactions(id) NOT NULL,
    
    batch_number VARCHAR(100),
    lot_number VARCHAR(100),
    supplier_batch_number VARCHAR(100),
    expiry_date DATE,
    
    original_quantity NUMERIC(12, 4) NOT NULL,
    remaining_quantity NUMERIC(12, 4) NOT NULL,
    unit_cost NUMERIC(12, 2) NOT NULL,
    receipt_date TIMESTAMP WITH TIME ZONE NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 4. Reservations & Allocations
CREATE TABLE IF NOT EXISTS public.allocation_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.allocation_statuses (code, name, sort_order) VALUES
('reserved', 'Reserved', 10),
('allocated', 'Allocated', 20),
('consumed', 'Consumed', 30),
('released', 'Released', 40)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.inventory_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID REFERENCES public.materials(id),
    variant_id UUID REFERENCES public.product_variants(id),
    warehouse_id UUID REFERENCES public.warehouses(id) NOT NULL,
    reference_type VARCHAR(50) NOT NULL,
    reference_id UUID NOT NULL,
    quantity NUMERIC(12, 4) NOT NULL,
    priority INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    status_id UUID REFERENCES public.allocation_statuses(id) NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 5. Physical Count Workflow
CREATE TABLE IF NOT EXISTS public.physical_count_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID REFERENCES public.warehouses(id) NOT NULL,
    status_id UUID REFERENCES public.inventory_transaction_statuses(id) NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.physical_count_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.physical_count_sessions(id) NOT NULL,
    material_id UUID REFERENCES public.materials(id),
    variant_id UUID REFERENCES public.product_variants(id),
    location_id UUID REFERENCES public.warehouse_locations(id),
    expected_quantity NUMERIC(12, 4) NOT NULL,
    counted_quantity NUMERIC(12, 4),
    variance_quantity NUMERIC(12, 4),
    variance_cost NUMERIC(12, 2),
    is_approved BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 6. Stock Ledger Rename running_balance -> balance_after_transaction
-- First check if the column exists to avoid errors on multiple runs
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stock_ledger' AND column_name='running_balance') THEN
    ALTER TABLE public.stock_ledger RENAME COLUMN running_balance TO balance_after_transaction;
  END IF;
END $$;

-- Triggers for updated_at
CREATE TRIGGER set_timestamp_inventory_transaction_types BEFORE UPDATE ON public.inventory_transaction_types FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_inventory_transaction_statuses BEFORE UPDATE ON public.inventory_transaction_statuses FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_inventory_transactions BEFORE UPDATE ON public.inventory_transactions FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_inventory_transaction_items BEFORE UPDATE ON public.inventory_transaction_items FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_inventory_batches BEFORE UPDATE ON public.inventory_batches FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_allocation_statuses BEFORE UPDATE ON public.allocation_statuses FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_inventory_allocations BEFORE UPDATE ON public.inventory_allocations FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_physical_count_sessions BEFORE UPDATE ON public.physical_count_sessions FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_physical_count_items BEFORE UPDATE ON public.physical_count_items FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- RLS Enablement
ALTER TABLE public.erp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transaction_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transaction_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocation_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physical_count_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physical_count_items ENABLE ROW LEVEL SECURITY;

-- Admins full access policies
CREATE POLICY "Admins full access erp_settings" ON public.erp_settings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins full access inventory_transaction_types" ON public.inventory_transaction_types FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins full access inventory_transaction_statuses" ON public.inventory_transaction_statuses FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins full access inventory_transactions" ON public.inventory_transactions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins full access inventory_transaction_items" ON public.inventory_transaction_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins full access inventory_batches" ON public.inventory_batches FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins full access allocation_statuses" ON public.allocation_statuses FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins full access inventory_allocations" ON public.inventory_allocations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins full access physical_count_sessions" ON public.physical_count_sessions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins full access physical_count_items" ON public.physical_count_items FOR ALL USING (auth.role() = 'authenticated');
