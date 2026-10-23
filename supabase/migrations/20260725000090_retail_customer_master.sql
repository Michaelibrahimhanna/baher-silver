-- ============================================================================
-- Migration: 20260725000090_retail_customer_master.sql
-- Domain: Retail POS Customer Master (Phase 4B.2.1)
-- Scope: Additive Customer Master schema (Migration Only)
-- ============================================================================

-- 1. Lifecycle Status ENUM
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'customer_status') THEN
        CREATE TYPE customer_status AS ENUM ('ACTIVE', 'SUSPENDED');
    END IF;
END $$;

-- 2. Retail Customer Master Table
CREATE TABLE IF NOT EXISTS public.retail_customers (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    normalized_phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    status customer_status DEFAULT 'ACTIVE' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Multi-Tenant Uniqueness Constraint: Phone uniqueness is strictly scoped by organization
    CONSTRAINT uq_retail_customers_org_phone UNIQUE (organization_id, normalized_phone),
    CONSTRAINT chk_retail_customer_id_format CHECK (id ~ '^cust_[a-zA-Z0-9_-]+$')
);

-- 3. Dedicated Indexes
-- Accelerates cashier search & autocomplete by customer name within organization
CREATE INDEX IF NOT EXISTS idx_retail_customers_org_name 
ON public.retail_customers (organization_id, name);

-- Accelerates customer directory queries while filtering soft-deleted records
CREATE INDEX IF NOT EXISTS idx_retail_customers_org_active 
ON public.retail_customers (organization_id) 
WHERE deleted_at IS NULL;

-- 4. Authoritative updated_at Trigger
CREATE OR REPLACE FUNCTION public.handle_retail_customer_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_retail_customers_updated_at ON public.retail_customers;
CREATE TRIGGER trg_retail_customers_updated_at
BEFORE UPDATE ON public.retail_customers
FOR EACH ROW EXECUTE FUNCTION public.handle_retail_customer_updated_at();
