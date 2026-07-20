-- ============================================================================
-- EXTENSIONS & TYPES
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE product_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE visibility_status AS ENUM ('public', 'hidden', 'password_protected');
CREATE TYPE publishing_status AS ENUM ('immediate', 'scheduled');
CREATE TYPE pricing_strategy AS ENUM ('manual', 'smart');
CREATE TYPE inventory_movement_type AS ENUM (
    'purchase', 'sale', 'return', 'damage', 'adjustment', 
    'transfer', 'manufacturing', 'reservation'
);
CREATE TYPE media_type AS ENUM (
    'image', 'video', '360', 'document', 'certificate', 
    'care_guide', 'packaging_image', 'lifestyle_image'
);
CREATE TYPE audit_action AS ENUM ('INSERT', 'UPDATE', 'DELETE');
CREATE TYPE warehouse_type AS ENUM ('MAIN', 'BRANCH', 'FACTORY', 'SUPPLIER');
