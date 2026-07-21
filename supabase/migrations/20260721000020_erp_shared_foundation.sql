-- 1. Measurement Units
CREATE TABLE IF NOT EXISTS public.measurement_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- Weight, Length, Count, Volume, Packaging
    base_multiplier NUMERIC(12, 4) DEFAULT 1.0000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Seed basic measurement units
INSERT INTO public.measurement_units (code, name, category, base_multiplier) VALUES
('g', 'Gram', 'Weight', 1.0000),
('kg', 'Kilogram', 'Weight', 1000.0000),
('pc', 'Piece', 'Count', 1.0000),
('m', 'Meter', 'Length', 1.0000),
('l', 'Liter', 'Volume', 1.0000),
('box', 'Box', 'Packaging', 1.0000),
('roll', 'Roll', 'Packaging', 1.0000),
('ctn', 'Carton', 'Packaging', 1.0000)
ON CONFLICT (code) DO NOTHING;

-- Safely add unit_id to materials
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.measurement_units(id);

-- Migrate existing material units
UPDATE public.materials m
SET unit_id = mu.id
FROM public.measurement_units mu
WHERE m.unit::text = mu.code;

-- Deprecate old unit column (commenting out drop for future cleanup)
-- ALTER TABLE public.materials DROP COLUMN unit;


-- 2. Currencies
CREATE TABLE IF NOT EXISTS public.currencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    symbol VARCHAR(10),
    decimals INTEGER DEFAULT 2,
    exchange_rate NUMERIC(12, 6) DEFAULT 1.000000,
    exchange_rate_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_base_currency BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Seed base currency
INSERT INTO public.currencies (code, name, symbol, decimals, exchange_rate, is_base_currency) VALUES
('EGP', 'Egyptian Pound', 'E£', 2, 1.000000, true),
('USD', 'US Dollar', '$', 2, 50.000000, false),
('EUR', 'Euro', '€', 2, 55.000000, false)
ON CONFLICT (code) DO NOTHING;

-- Safely add currency_id to suppliers
ALTER TABLE public.suppliers
ADD COLUMN IF NOT EXISTS currency_id UUID REFERENCES public.currencies(id);

-- Migrate existing currencies
UPDATE public.suppliers s
SET currency_id = c.id
FROM public.currencies c
WHERE s.currency = c.code;

-- Handle cases where supplier has a currency not in our seeded list
INSERT INTO public.currencies (code, name, symbol, is_base_currency)
SELECT DISTINCT s.currency, s.currency, s.currency, false
FROM public.suppliers s
WHERE s.currency IS NOT NULL AND s.currency NOT IN (SELECT code FROM public.currencies);

-- Second pass to ensure everything is linked
UPDATE public.suppliers s
SET currency_id = c.id
FROM public.currencies c
WHERE s.currency = c.code AND s.currency_id IS NULL;

-- Deprecate old currency column
-- ALTER TABLE public.suppliers DROP COLUMN currency;


-- 3. Purchase Orders Architecture
CREATE TYPE po_status AS ENUM ('draft', 'sent', 'confirmed', 'partially_received', 'received', 'cancelled');

CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES public.suppliers(id) NOT NULL,
    currency_id UUID REFERENCES public.currencies(id) NOT NULL,
    status po_status DEFAULT 'draft',
    order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expected_delivery TIMESTAMP WITH TIME ZONE,
    subtotal NUMERIC(12, 2) DEFAULT 0.00,
    discount NUMERIC(12, 2) DEFAULT 0.00,
    tax NUMERIC(12, 2) DEFAULT 0.00,
    shipping_cost NUMERIC(12, 2) DEFAULT 0.00,
    grand_total NUMERIC(12, 2) DEFAULT 0.00,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID REFERENCES public.purchase_orders(id) NOT NULL,
    material_id UUID REFERENCES public.materials(id) NOT NULL,
    quantity NUMERIC(12, 4) NOT NULL,
    unit_id UUID REFERENCES public.measurement_units(id) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    total_price NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Triggers for updated_at
CREATE TRIGGER set_timestamp_measurement_units
BEFORE UPDATE ON public.measurement_units
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_currencies
BEFORE UPDATE ON public.currencies
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_purchase_orders
BEFORE UPDATE ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_purchase_order_items
BEFORE UPDATE ON public.purchase_order_items
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- RLS
ALTER TABLE public.measurement_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to measurement_units" ON public.measurement_units FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access to currencies" ON public.currencies FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access to purchase_orders" ON public.purchase_orders FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access to purchase_order_items" ON public.purchase_order_items FOR ALL USING (auth.role() = 'authenticated');
