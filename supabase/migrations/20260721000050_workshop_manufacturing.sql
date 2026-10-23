-- =============================================================================
-- BAHER SILVER ERP — WORKSHOP MANUFACTURING ENGINE & STONE DOMAIN MIGRATION
-- Milestone: Baher L.0.1 (Workshop Engine & Gemstone Foundation)
-- Specialized for Baher Silver Factory (Silver 925 / 999 Jewelry)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. GEMSTONES MASTER DATA & PARCELS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gemstones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,                       -- e.g. 'STN-ZIRCON-3MM-WHT'
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    category VARCHAR(50) NOT NULL DEFAULT 'semi_precious',   -- precious, semi_precious, synthetic, organic
    stone_type VARCHAR(100) NOT NULL,                      -- Zircon, Turquoise, Topaz, Onyx, Ruby, Sapphire
    color VARCHAR(50),                                     -- White, Swiss Blue, Emerald Green, Black, Red
    shape VARCHAR(50),                                     -- Round, Oval, Cushion, Emerald, Princess, Cabochon, Pear
    cut VARCHAR(50) DEFAULT 'Brilliant',                   -- Brilliant, Step, Mixed, Cabochon, Faceted
    size_mm VARCHAR(50),                                   -- e.g. '3.0mm', '4x6mm', '1.25mm'
    quality VARCHAR(50) DEFAULT 'AAA',                     -- AAA, AA, A, Commercial
    treatment VARCHAR(100) DEFAULT 'Natural',              -- Natural, Heat-treated, Synthetic, None
    origin VARCHAR(100),                                   -- Egypt (Sinai), Thailand, Burma, Brazil
    weight_grams NUMERIC(10, 4) DEFAULT 0.0000,            -- Base Authoritative Weight in Grams
    weight_carats NUMERIC(10, 3) DEFAULT 0.000,            -- Secondary Display Weight (1g = 5ct)
    quantity INTEGER DEFAULT 0,                            -- Current on-hand count of pieces in bulk
    purchase_price NUMERIC(12, 2) DEFAULT 0.00,
    selling_price NUMERIC(12, 2) DEFAULT 0.00,
    certificate_url TEXT,
    image_url TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.gemstone_lots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gemstone_id UUID NOT NULL REFERENCES public.gemstones(id) ON DELETE CASCADE,
    batch_number VARCHAR(100) UNIQUE NOT NULL,             -- e.g. 'LOT-2026-STN-001'
    supplier_id UUID REFERENCES public.suppliers(id),
    supplier_invoice VARCHAR(100),
    purchase_date DATE DEFAULT CURRENT_DATE,
    purchase_price NUMERIC(12, 2) DEFAULT 0.00,
    initial_quantity INTEGER NOT NULL DEFAULT 0,
    available_quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER NOT NULL DEFAULT 0,
    weight_grams NUMERIC(10, 4) DEFAULT 0.0000,
    weight_carats NUMERIC(10, 3) DEFAULT 0.000,
    warehouse_id UUID REFERENCES public.warehouses(id),
    location_id UUID REFERENCES public.warehouse_locations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. ENHANCE BOM ITEMS FOR GEMSTONE & MULTI-MATERIAL SUPPORT
-- -----------------------------------------------------------------------------

ALTER TABLE public.bom_items
ADD COLUMN IF NOT EXISTS line_type VARCHAR(30) DEFAULT 'raw_material', -- SILVER, STONE, COMPONENT, CHEMICAL, CONSUMABLE, PACKAGING
ADD COLUMN IF NOT EXISTS gemstone_id UUID REFERENCES public.gemstones(id),
ADD COLUMN IF NOT EXISTS waste_factor_pct NUMERIC(5, 2) DEFAULT 0.00,  -- e.g. 5.0% casting loss, 2.0% setting breakage
ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(10) DEFAULT 'g';       -- 'g', 'piece', 'ct', 'ml'

-- Make material_id nullable so lines can point exclusively to gemstone_id
ALTER TABLE public.bom_items ALTER COLUMN material_id DROP NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. WORK CENTERS & SHOP FLOOR ROUTING
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.work_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,                      -- e.g. 'WC-CASTING'
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    hourly_capacity NUMERIC(8, 2) DEFAULT 10.00,           -- Pieces per hour
    labor_cost_rate NUMERIC(10, 2) DEFAULT 0.00,           -- Hourly technician rate in EGP
    electricity_rate NUMERIC(10, 2) DEFAULT 0.00,          -- Hourly power rate in EGP
    assigned_operators_count INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'ACTIVE',                   -- ACTIVE, MAINTENANCE, OFFLINE
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed the 8 standard silver factory work centers
INSERT INTO public.work_centers (code, name_ar, name_en, hourly_capacity, labor_cost_rate, electricity_rate, assigned_operators_count) VALUES
('WC-CASTING', 'قسم السباكة والصب الأولي', 'Casting & Melt Station', 15.0, 120.0, 45.0, 3),
('WC-CLEANING', 'قسم الكحت والغسيل الكيميائي', 'Tree Removal & Chemical Cleaning', 25.0, 70.0, 20.0, 2),
('WC-SETTING', 'قسم تركيب وحشو الأحجار الكريمة', 'Gemstone Setting Bench', 8.0, 150.0, 15.0, 5),
('WC-POLISHING', 'قسم الصقل والتلميع عالي الجودة', 'Filing, Sanding & High-Luster Buffing', 12.0, 90.0, 35.0, 4),
('WC-RHODIUM', 'قسم الطلاء والجلد بالروديوم', 'Anti-Tarnish Rhodium & Electroplating', 20.0, 180.0, 50.0, 2),
('WC-HALLMARK', 'قسم الختم الحكومي والليزر', 'Government Stamp & Laser Marking', 30.0, 60.0, 10.0, 1),
('WC-QC', 'مختبر فحص ومراقبة الجودة', 'Dimensional & Optical Quality Control', 40.0, 100.0, 15.0, 2),
('WC-PACKAGING', 'قسم التغليف والبطاقة الرقمية', 'Tagging, Passport QR & Final Packaging', 50.0, 50.0, 10.0, 2)
ON CONFLICT (code) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    name_en = EXCLUDED.name_en,
    hourly_capacity = EXCLUDED.hourly_capacity,
    labor_cost_rate = EXCLUDED.labor_cost_rate,
    electricity_rate = EXCLUDED.electricity_rate;

CREATE TABLE IF NOT EXISTS public.routing_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
    name VARCHAR(255) DEFAULT 'المسار القياسي للتصنيع',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.routing_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routing_id UUID NOT NULL REFERENCES public.routing_templates(id) ON DELETE CASCADE,
    work_center_id UUID NOT NULL REFERENCES public.work_centers(id),
    sequence_no INTEGER NOT NULL DEFAULT 10,               -- 10, 20, 30, 40...
    stage_code VARCHAR(50) NOT NULL,                       -- CASTING, CLEANING, SETTING, POLISHING, RHODIUM, HALLMARK, QC, PACKAGING
    labor_minutes INTEGER DEFAULT 15,
    machine_minutes INTEGER DEFAULT 10,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4. PRODUCTION ORDERS & WORK ORDER TIMELINE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.production_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code VARCHAR(50) UNIQUE NOT NULL,                 -- e.g. 'MO-2026-000101'
    product_id UUID NOT NULL REFERENCES public.products(id),
    variant_id UUID REFERENCES public.product_variants(id),
    planned_quantity INTEGER NOT NULL CHECK (planned_quantity > 0),
    completed_quantity INTEGER DEFAULT 0,
    scrapped_quantity INTEGER DEFAULT 0,
    target_silver_purity VARCHAR(10) DEFAULT '925',
    estimated_silver_weight NUMERIC(10, 3) DEFAULT 0.000,
    actual_silver_weight NUMERIC(10, 3) DEFAULT 0.000,
    silver_loss_weight NUMERIC(10, 3) DEFAULT 0.000,
    status VARCHAR(30) DEFAULT 'PLANNED',                  -- PLANNED, CONFIRMED, IN_PROGRESS, PAUSED, QUALITY_CHECK, COMPLETED, CLOSED, CANCELLED
    priority VARCHAR(20) DEFAULT 'MEDIUM',                 -- LOW, MEDIUM, HIGH, URGENT
    assigned_supervisor_id UUID REFERENCES auth.users(id),
    assigned_operator_id UUID REFERENCES auth.users(id),
    start_date TIMESTAMP WITH TIME ZONE,
    target_date TIMESTAMP WITH TIME ZONE,
    completion_date TIMESTAMP WITH TIME ZONE,
    working_time_minutes INTEGER DEFAULT 0,
    pause_time_minutes INTEGER DEFAULT 0,
    total_duration_minutes INTEGER DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.production_order_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    action VARCHAR(50) NOT NULL,                            -- CREATE, CONFIRM, START, PAUSE, RESUME, COMPLETE, CANCEL
    actor_id UUID REFERENCES auth.users(id),
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 5. MATERIAL ALLOCATIONS (TRANSACTIONAL RESERVATIONS)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.production_material_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
    line_type VARCHAR(30) NOT NULL,                         -- SILVER, STONE, COMPONENT, CHEMICAL, CONSUMABLE
    material_id UUID REFERENCES public.materials(id),
    gemstone_id UUID REFERENCES public.gemstones(id),
    item_code VARCHAR(100) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    required_quantity NUMERIC(12, 4) NOT NULL,
    allocated_quantity NUMERIC(12, 4) DEFAULT 0.0000,
    consumed_quantity NUMERIC(12, 4) DEFAULT 0.0000,
    unit_of_measure VARCHAR(10) DEFAULT 'g',
    status VARCHAR(30) DEFAULT 'ALLOCATED',                 -- ALLOCATED, PARTIAL, SHORTAGE, CONSUMED, RELEASED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 6. SHOP FLOOR QUEUE JOBS & OPERATION LOGS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.work_center_queue_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_center_id UUID NOT NULL REFERENCES public.work_centers(id),
    order_id UUID NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
    sequence_no INTEGER NOT NULL DEFAULT 10,
    stage_code VARCHAR(50) NOT NULL,
    status VARCHAR(30) DEFAULT 'QUEUED',                   -- QUEUED, IN_OPERATION, COMPLETED, SKIPPED
    estimated_minutes INTEGER DEFAULT 0,
    actual_minutes INTEGER DEFAULT 0,
    operator_id UUID REFERENCES auth.users(id),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.production_operation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
    work_center_id UUID REFERENCES public.work_centers(id),
    sequence_no INTEGER DEFAULT 10,
    stage_code VARCHAR(50) NOT NULL,
    quantity_passed INTEGER DEFAULT 0,
    quantity_scrapped INTEGER DEFAULT 0,
    scrap_reason VARCHAR(100),                             -- POROSITY, CASTING_DEFECT, OVER_POLISHING, STONE_BREAKAGE, DIMENSIONAL_MISMATCH
    scrap_weight_grams NUMERIC(10, 3) DEFAULT 0.000,
    estimated_minutes INTEGER DEFAULT 0,
    actual_minutes INTEGER DEFAULT 0,
    operator_id UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 7. PRODUCTION SCRAP & SILVER RECOVERY LEDGER (95% EFFICIENCY)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.production_scrap_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
    scrap_category VARCHAR(50) NOT NULL,                    -- CASTING_SPRUE, BENCH_FILINGS, POLISHING_DUST, STONE_DAMAGE, CHEMICAL_LOSS, RECOVERED_SILVER
    weight_grams NUMERIC(10, 3) NOT NULL,
    silver_purity VARCHAR(10) DEFAULT '925',
    recovered_pure_silver NUMERIC(10, 3) DEFAULT 0.000,     -- weight_grams * (purity/1000) * 0.95
    recorded_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 8. INDEXES & CONSTRAINTS
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_gemstones_code ON public.gemstones(code);
CREATE INDEX IF NOT EXISTS idx_gemstones_type ON public.gemstones(stone_type);
CREATE INDEX IF NOT EXISTS idx_gemstone_lots_batch ON public.gemstone_lots(batch_number);
CREATE INDEX IF NOT EXISTS idx_gemstone_lots_stone ON public.gemstone_lots(gemstone_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_code ON public.production_orders(order_code);
CREATE INDEX IF NOT EXISTS idx_production_orders_status ON public.production_orders(status);
CREATE INDEX IF NOT EXISTS idx_production_allocations_order ON public.production_material_allocations(order_id);
CREATE INDEX IF NOT EXISTS idx_production_allocations_item ON public.production_material_allocations(item_code);
CREATE INDEX IF NOT EXISTS idx_production_queue_wc ON public.work_center_queue_jobs(work_center_id);
CREATE INDEX IF NOT EXISTS idx_production_queue_order ON public.work_center_queue_jobs(order_id);
CREATE INDEX IF NOT EXISTS idx_production_scrap_order ON public.production_scrap_ledger(order_id);

-- -----------------------------------------------------------------------------
-- 9. TRIGGERS FOR UPDATED_AT
-- -----------------------------------------------------------------------------

CREATE TRIGGER set_timestamp_gemstones
BEFORE UPDATE ON public.gemstones
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_gemstone_lots
BEFORE UPDATE ON public.gemstone_lots
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_work_centers
BEFORE UPDATE ON public.work_centers
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_routing_templates
BEFORE UPDATE ON public.routing_templates
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_production_orders
BEFORE UPDATE ON public.production_orders
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_production_material_allocations
BEFORE UPDATE ON public.production_material_allocations
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- -----------------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------

ALTER TABLE public.gemstones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gemstone_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routing_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_order_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_material_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_center_queue_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_operation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_scrap_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to gemstones" ON public.gemstones FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access to gemstone_lots" ON public.gemstone_lots FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access to work_centers" ON public.work_centers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access to routing_templates" ON public.routing_templates FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access to routing_steps" ON public.routing_steps FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access to production_orders" ON public.production_orders FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access to production_order_timeline" ON public.production_order_timeline FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access to production_material_allocations" ON public.production_material_allocations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access to work_center_queue_jobs" ON public.work_center_queue_jobs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access to production_operation_logs" ON public.production_operation_logs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access to production_scrap_ledger" ON public.production_scrap_ledger FOR ALL USING (auth.role() = 'authenticated');
