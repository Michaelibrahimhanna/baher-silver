-- Create ENUMs for ERP
CREATE TYPE material_type AS ENUM ('raw_material', 'packaging', 'consumable');
CREATE TYPE material_unit AS ENUM ('g', 'kg', 'piece');
CREATE TYPE cost_type AS ENUM ('standard', 'market', 'purchase', 'average');

-- 1. Suppliers Table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    whatsapp VARCHAR(50),
    currency VARCHAR(10) DEFAULT 'EGP',
    tax_number VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    payment_terms VARCHAR(255),
    lead_time_days INTEGER DEFAULT 0,
    rating NUMERIC(3, 2) DEFAULT 0.00,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 2. Alter Materials Table (Adding new fields for ERP)
-- Assuming `materials` already exists from catalog domain.
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS type material_type DEFAULT 'raw_material',
ADD COLUMN IF NOT EXISTS purity VARCHAR(50),
ADD COLUMN IF NOT EXISTS unit material_unit DEFAULT 'piece',
ADD COLUMN IF NOT EXISTS standard_cost NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS last_purchase_cost NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS average_cost NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS market_cost NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS min_stock NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id);

-- 3. Material Cost History
CREATE TABLE IF NOT EXISTS public.material_cost_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID REFERENCES public.materials(id) NOT NULL,
    cost NUMERIC(12, 2) NOT NULL,
    cost_type cost_type NOT NULL,
    reason VARCHAR(255),
    supplier_id UUID REFERENCES public.suppliers(id),
    purchase_order_id UUID, -- Will reference future purchasing table
    changed_by UUID REFERENCES auth.users(id),
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. BOM (Bill of Materials) Versioning
CREATE TABLE IF NOT EXISTS public.boms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID REFERENCES public.product_variants(id) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    effective_to TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 5. BOM Items
CREATE TABLE IF NOT EXISTS public.bom_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_id UUID REFERENCES public.boms(id) NOT NULL,
    material_id UUID REFERENCES public.materials(id) NOT NULL,
    quantity NUMERIC(12, 4) NOT NULL DEFAULT 1.0000,
    expected_waste NUMERIC(5, 2) DEFAULT 0.00, -- percentage
    actual_waste NUMERIC(5, 2) DEFAULT 0.00, -- percentage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Variant Costs (Configuration)
CREATE TABLE IF NOT EXISTS public.variant_costs (
    variant_id UUID PRIMARY KEY REFERENCES public.product_variants(id),
    labor_cost NUMERIC(12, 2) DEFAULT 0.00,
    manufacturing_cost NUMERIC(12, 2) DEFAULT 0.00,
    packaging_cost NUMERIC(12, 2) DEFAULT 0.00,
    overhead_cost NUMERIC(12, 2) DEFAULT 0.00,
    tax_rate NUMERIC(5, 2) DEFAULT 0.00,
    discount_rate NUMERIC(5, 2) DEFAULT 0.00,
    profit_margin_target NUMERIC(5, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Cost Calculation History
CREATE TABLE IF NOT EXISTS public.cost_calculation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID REFERENCES public.product_variants(id) NOT NULL,
    bom_id UUID REFERENCES public.boms(id),
    material_cost NUMERIC(12, 2) DEFAULT 0.00,
    labor_cost NUMERIC(12, 2) DEFAULT 0.00,
    manufacturing_cost NUMERIC(12, 2) DEFAULT 0.00,
    packaging_cost NUMERIC(12, 2) DEFAULT 0.00,
    waste_cost NUMERIC(12, 2) DEFAULT 0.00,
    overhead_cost NUMERIC(12, 2) DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) DEFAULT 0.00,
    profit_margin NUMERIC(12, 2) DEFAULT 0.00,
    final_selling_price NUMERIC(12, 2) DEFAULT 0.00,
    calculated_by UUID REFERENCES auth.users(id),
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_suppliers
BEFORE UPDATE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_boms
BEFORE UPDATE ON public.boms
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_bom_items
BEFORE UPDATE ON public.bom_items
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_variant_costs
BEFORE UPDATE ON public.variant_costs
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- Enable RLS and add basic policies
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_cost_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variant_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_calculation_history ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins have full access to suppliers" ON public.suppliers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access to material_cost_history" ON public.material_cost_history FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access to boms" ON public.boms FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access to bom_items" ON public.bom_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access to variant_costs" ON public.variant_costs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access to cost_calculation_history" ON public.cost_calculation_history FOR ALL USING (auth.role() = 'authenticated');
