-- ============================================================================
-- BASE TABLES (WAREHOUSES, BRANDS, MATERIALS)
-- ============================================================================

CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) NOT NULL UNIQUE,
    type warehouse_type DEFAULT 'MAIN',
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    country_code VARCHAR(2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) NOT NULL UNIQUE,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    logo_path VARCHAR(1024),
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) NOT NULL UNIQUE,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- PRODUCTS (CATALOG IDENTITY)
-- ============================================================================

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    material_id UUID REFERENCES materials(id) ON DELETE SET NULL,
    
    slug VARCHAR(255) NOT NULL UNIQUE,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    short_description_ar TEXT,
    short_description_en TEXT,
    description_ar TEXT,
    description_en TEXT,
    story_ar TEXT,
    story_en TEXT,
    
    status product_status DEFAULT 'draft',
    visibility visibility_status DEFAULT 'public',
    publishing_status publishing_status DEFAULT 'immediate',
    
    featured BOOLEAN DEFAULT false,
    best_seller BOOLEAN DEFAULT false,
    new_arrival BOOLEAN DEFAULT false,
    sort_order INT DEFAULT 0,
    
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- PRODUCT VARIANTS
-- ============================================================================

CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    sku VARCHAR(255) NOT NULL UNIQUE,
    barcode VARCHAR(255) UNIQUE,
    
    weight NUMERIC(10, 4),
    length NUMERIC(10, 4),
    size VARCHAR(100),
    color VARCHAR(100),
    stone VARCHAR(100),
    plating VARCHAR(100),
    
    pricing_strategy pricing_strategy DEFAULT 'manual',
    regular_price NUMERIC(15, 4),
    sale_price NUMERIC(15, 4),
    price_adjustment NUMERIC(15, 4) DEFAULT 0,
    
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- COST HISTORY ENGINE
-- ============================================================================

CREATE TABLE cost_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    
    silver_cost NUMERIC(15, 4) DEFAULT 0,
    stone_cost NUMERIC(15, 4) DEFAULT 0,
    packaging_cost NUMERIC(15, 4) DEFAULT 0,
    labor_cost NUMERIC(15, 4) DEFAULT 0,
    other_cost NUMERIC(15, 4) DEFAULT 0,
    total_cost NUMERIC(15, 4) DEFAULT 0,
    
    currency VARCHAR(3) DEFAULT 'USD',
    version INT DEFAULT 1,
    
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_to TIMESTAMPTZ,
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- INVENTORY LEDGER
-- ============================================================================

CREATE TABLE inventory_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE RESTRICT,
    
    movement_type inventory_movement_type NOT NULL,
    quantity_change INT NOT NULL,
    reference_id UUID,
    notes TEXT,
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PRODUCT MEDIA
-- ============================================================================

CREATE TABLE product_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    
    media_type media_type NOT NULL,
    storage_path VARCHAR(1024) NOT NULL,
    alt_text_ar VARCHAR(255),
    alt_text_en VARCHAR(255),
    
    sort_order INT DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- SEO
-- ============================================================================

CREATE TABLE product_seo (
    product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    meta_title_ar VARCHAR(255),
    meta_title_en VARCHAR(255),
    meta_description_ar TEXT,
    meta_description_en TEXT,
    keywords_ar TEXT,
    keywords_en TEXT,
    canonical_url VARCHAR(1024),
    meta_image_path VARCHAR(1024),
    schema_json JSONB,
    robots VARCHAR(255) DEFAULT 'index, follow',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ATTRIBUTES
-- ============================================================================

CREATE TABLE attributes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) NOT NULL UNIQUE,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    is_filterable BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE attribute_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attribute_id UUID NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
    value_ar VARCHAR(255) NOT NULL,
    value_en VARCHAR(255) NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE product_attribute_values (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    attribute_value_id UUID NOT NULL REFERENCES attribute_values(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (product_id, attribute_value_id)
);

-- ============================================================================
-- TAGS
-- ============================================================================

CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) NOT NULL UNIQUE,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE product_tags (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (product_id, tag_id)
);

-- ============================================================================
-- CATEGORIES
-- ============================================================================

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    storage_path VARCHAR(1024),
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE product_categories (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (product_id, category_id)
);

-- ============================================================================
-- COLLECTIONS
-- ============================================================================

CREATE TABLE collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) NOT NULL UNIQUE,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    storage_path VARCHAR(1024),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE product_collections (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (product_id, collection_id)
);

-- ============================================================================
-- OCCASIONS
-- ============================================================================

CREATE TABLE occasions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) NOT NULL UNIQUE,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    storage_path VARCHAR(1024),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE product_occasions (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    occasion_id UUID NOT NULL REFERENCES occasions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (product_id, occasion_id)
);

-- ============================================================================
-- SILVER PRICE HISTORY (MARKET)
-- ============================================================================

CREATE TABLE silver_price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    price_per_gram NUMERIC(12, 4) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
