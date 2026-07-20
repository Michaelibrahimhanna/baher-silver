-- ============================================================================
-- ACCOUNTS DOMAIN: SCHEMA
-- ============================================================================

-- 1. Profiles
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    display_name VARCHAR(255),
    phone VARCHAR(50),
    avatar_url VARCHAR(1024),
    
    is_guest BOOLEAN DEFAULT false,
    guest_identifier VARCHAR(255),
    
    marketing_consent BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 1.5 Profile Security (Strict Access)
CREATE TABLE profile_security (
    profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    
    account_status account_status DEFAULT 'active',
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMPTZ,
    
    accepted_terms_at TIMESTAMPTZ,
    accepted_privacy_at TIMESTAMPTZ,
    
    last_login_at TIMESTAMPTZ,
    refresh_token_version INT DEFAULT 1,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Addresses
CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type address_type DEFAULT 'shipping',
    
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    
    address_line_1 VARCHAR(255) NOT NULL,
    address_line_2 VARCHAR(255),
    building VARCHAR(100),
    floor VARCHAR(100),
    apartment VARCHAR(100),
    landmark VARCHAR(255),
    delivery_notes TEXT,
    
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(50),
    country VARCHAR(100) NOT NULL,
    
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    
    is_default BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 3. RBAC Roles & Permissions
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) NOT NULL UNIQUE,
    parent_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (profile_id, role_id)
);

-- Seed Roles
INSERT INTO roles (id, slug, name_en, name_ar) VALUES 
(uuid_generate_v4(), 'super_admin', 'Super Admin', 'مدير عام'),
(uuid_generate_v4(), 'admin', 'Admin', 'مسؤول'),
(uuid_generate_v4(), 'manager', 'Manager', 'مدير'),
(uuid_generate_v4(), 'sales', 'Sales', 'مبيعات'),
(uuid_generate_v4(), 'customer_service', 'Customer Service', 'خدمة عملاء'),
(uuid_generate_v4(), 'warehouse', 'Warehouse', 'مستودع'),
(uuid_generate_v4(), 'factory', 'Factory', 'مصنع'),
(uuid_generate_v4(), 'customer', 'Customer', 'عميل');

-- Update Hierarchy (Example: Admin inherits Manager)
UPDATE roles SET parent_role_id = (SELECT id FROM roles WHERE slug = 'manager') WHERE slug = 'admin';
UPDATE roles SET parent_role_id = (SELECT id FROM roles WHERE slug = 'admin') WHERE slug = 'super_admin';

-- 4. Preferences & Settings
CREATE TABLE customer_preferences (
    profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    currency VARCHAR(3) DEFAULT 'USD',
    language VARCHAR(2) DEFAULT 'en',
    ring_size VARCHAR(50),
    bracelet_size VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE profile_favorite_categories (
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (profile_id, category_id)
);

CREATE TABLE profile_favorite_materials (
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    PRIMARY KEY (profile_id, material_id)
);

CREATE TABLE profile_favorite_occasions (
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    occasion_id UUID NOT NULL REFERENCES occasions(id) ON DELETE CASCADE,
    PRIMARY KEY (profile_id, occasion_id)
);

CREATE TABLE notification_settings (
    profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    email_promotions BOOLEAN DEFAULT true,
    sms_promotions BOOLEAN DEFAULT false,
    whatsapp_updates BOOLEAN DEFAULT false,
    order_updates BOOLEAN DEFAULT true,
    restock_alerts BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Wishlist
CREATE TABLE wishlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) DEFAULT 'My Wishlist',
    created_from VARCHAR(255),
    visibility wishlist_visibility DEFAULT 'PRIVATE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE wishlist_items (
    wishlist_id UUID NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (wishlist_id, variant_id)
);

-- 6. Analytics (Table Partitioning)
CREATE TABLE customer_activity (
    id UUID DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    activity_type activity_type NOT NULL,
    entity_id UUID,
    metadata JSONB,
    device VARCHAR(255),
    browser VARCHAR(255),
    platform VARCHAR(255),
    country VARCHAR(100),
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Initial Partition
CREATE TABLE customer_activity_y2026m07 PARTITION OF customer_activity FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE TABLE login_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    device_info VARCHAR(255),
    ip_address INET,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    logout_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true
);
