-- ============================================================================
-- Migration: 20260726000100_silver_os_open_accounts_and_weight.sql
-- Domain: Silver OS — Open Accounts Dual Ledger & Scale Weight Audit
-- Scope: Additive, Idempotent, Append-Only Ledger & Reversal Constraints
-- Guardrails: Zero in-place edits, UNIQUE reversal constraint, decoupled 999 fine silver
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. WEIGHT AUDIT RECORDS (Hardware Scale Priority & Manual Override Audit)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weight_audit_records (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL,
    branch_id VARCHAR(64) NOT NULL,
    terminal_id VARCHAR(64) NOT NULL,
    source VARCHAR(20) NOT NULL CHECK (source IN ('SCALE', 'BARCODE', 'MANUAL')),
    gross_weight_grams NUMERIC(10, 3) NOT NULL CHECK (gross_weight_grams > 0),
    stone_weight_grams NUMERIC(10, 3) NOT NULL DEFAULT 0.000 CHECK (stone_weight_grams >= 0 AND stone_weight_grams < gross_weight_grams),
    net_weight_grams NUMERIC(10, 3) NOT NULL CHECK (net_weight_grams > 0),
    manual_reason VARCHAR(30) CHECK (
        manual_reason IS NULL OR 
        manual_reason IN ('TEST', 'SCALE_FAILURE', 'READING_CORRECTION')
    ),
    actor_user_id VARCHAR(64) NOT NULL,
    actor_email VARCHAR(255) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    piece_id VARCHAR(64),
    sku VARCHAR(100),
    serial_number VARCHAR(100),
    signature VARCHAR(128) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    -- Constraint: Manual overrides MUST have a valid reason code
    CONSTRAINT chk_weight_audit_manual_reason CHECK (
        (source != 'MANUAL') OR (manual_reason IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_weight_audit_org_timestamp 
ON public.weight_audit_records (organization_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_weight_audit_serial 
ON public.weight_audit_records (organization_id, serial_number) 
WHERE serial_number IS NOT NULL;

-- Immutability Trigger: Weight Audit records can NEVER be modified or deleted
CREATE OR REPLACE FUNCTION public.prevent_weight_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'SECURITY_VIOLATION: weight_audit_records is append-only. Mutation (UPDATE/DELETE) is strictly forbidden.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_weight_audit_no_update_delete ON public.weight_audit_records;
CREATE TRIGGER trg_weight_audit_no_update_delete
BEFORE UPDATE OR DELETE ON public.weight_audit_records
FOR EACH ROW EXECUTE FUNCTION public.prevent_weight_audit_mutation();


-- ----------------------------------------------------------------------------
-- 2. OPEN ACCOUNTS MASTER (Workshops, Suppliers, Merchants)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.open_accounts (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    account_type VARCHAR(30) NOT NULL CHECK (account_type IN ('WORKSHOP', 'SUPPLIER', 'MERCHANT')),
    phone VARCHAR(50),
    currency VARCHAR(10) NOT NULL DEFAULT 'EGP',
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    CONSTRAINT uq_open_accounts_org_name UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_open_accounts_org_type 
ON public.open_accounts (organization_id, account_type);


-- ----------------------------------------------------------------------------
-- 3. ACCOUNT JOURNAL ENTRIES (Append-Only Dual Ledger)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.account_journal_entries (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL,
    account_id VARCHAR(64) NOT NULL REFERENCES public.open_accounts(id) ON DELETE RESTRICT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    entry_type VARCHAR(40) NOT NULL CHECK (
        entry_type IN (
            'OPENING_BALANCE',
            'SCRAP_DELIVERY',
            'GOODS_RECEIPT_LABOR',
            'CASH_PAYMENT',
            'CASH_RECEIPT',
            'METAL_SETTLEMENT',
            'REVERSAL'
        )
    ),
    currency VARCHAR(10) NOT NULL DEFAULT 'EGP',
    cash_delta NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    gross_weight_grams NUMERIC(10, 3),
    stone_weight_grams NUMERIC(10, 3),
    net_weight_grams NUMERIC(10, 3),
    purity NUMERIC(6, 2),
    fine_silver_999_delta NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    running_cash_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    running_fine_silver_balance NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    actor_user_id VARCHAR(64) NOT NULL,
    actor_email VARCHAR(255) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    reference_document VARCHAR(100),
    notes TEXT,
    idempotency_key VARCHAR(128),
    reversed_entry_id VARCHAR(64) REFERENCES public.account_journal_entries(id) ON DELETE RESTRICT,
    is_reversed BOOLEAN NOT NULL DEFAULT false,
    signature VARCHAR(128) NOT NULL,

    -- Guarantee 1: Reversal entries must cite an existing entry
    CONSTRAINT chk_reversal_requires_target CHECK (
        (entry_type != 'REVERSAL') OR (reversed_entry_id IS NOT NULL)
    ),

    -- Guarantee 2: An entry can be reversed AT MOST ONCE (prevents duplicate reversal concurrency)
    CONSTRAINT uq_journal_single_reversal UNIQUE (reversed_entry_id),

    -- Guarantee 3: Idempotent posting
    CONSTRAINT uq_journal_org_idempotency UNIQUE (organization_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_account_time 
ON public.account_journal_entries (account_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_journal_entries_org 
ON public.account_journal_entries (organization_id);

-- Immutability Trigger: Journal entries can NEVER be modified or deleted in-place
CREATE OR REPLACE FUNCTION public.prevent_journal_entry_mutation()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow updating is_reversed flag strictly when an entry is compensated by a reversal
    IF TG_OP = 'UPDATE' THEN
        IF (OLD.is_reversed = false AND NEW.is_reversed = true) AND
           (OLD.id = NEW.id AND OLD.cash_delta = NEW.cash_delta AND OLD.fine_silver_999_delta = NEW.fine_silver_999_delta) THEN
            RETURN NEW;
        END IF;
    END IF;
    RAISE EXCEPTION 'SECURITY_VIOLATION: account_journal_entries is append-only. UPDATE/DELETE is forbidden; post a REVERSAL entry instead.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_journal_entry_no_mutation ON public.account_journal_entries;
CREATE TRIGGER trg_journal_entry_no_mutation
BEFORE UPDATE OR DELETE ON public.account_journal_entries
FOR EACH ROW EXECUTE FUNCTION public.prevent_journal_entry_mutation();


-- ----------------------------------------------------------------------------
-- 4. ACCOUNT BALANCES (Cached Dual Snapshot for Fast Reporting)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.account_balances (
    account_id VARCHAR(64) NOT NULL REFERENCES public.open_accounts(id) ON DELETE CASCADE,
    organization_id VARCHAR(64) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'EGP',
    cash_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    fine_silver_999_balance_grams NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    last_journal_entry_id VARCHAR(64) REFERENCES public.account_journal_entries(id),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    PRIMARY KEY (account_id, currency)
);

CREATE INDEX IF NOT EXISTS idx_account_balances_org 
ON public.account_balances (organization_id);

-- ----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (Tenant Isolation)
-- ----------------------------------------------------------------------------
ALTER TABLE public.weight_audit_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.open_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_balances ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation Policies based on current_setting('app.current_tenant_id', true) (Strict Fail-Closed)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_weight_audit') THEN
        CREATE POLICY tenant_isolation_weight_audit ON public.weight_audit_records
        USING (organization_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_open_accounts') THEN
        CREATE POLICY tenant_isolation_open_accounts ON public.open_accounts
        USING (organization_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_journal_entries') THEN
        CREATE POLICY tenant_isolation_journal_entries ON public.account_journal_entries
        USING (organization_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_account_balances') THEN
        CREATE POLICY tenant_isolation_account_balances ON public.account_balances
        USING (organization_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
    END IF;
END $$;
