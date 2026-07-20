-- ============================================================================
-- ACCOUNTS DOMAIN: TYPES
-- ============================================================================

CREATE TYPE address_type AS ENUM ('shipping', 'billing', 'both');
CREATE TYPE activity_type AS ENUM ('login', 'page_view', 'add_to_cart', 'purchase', 'review', 'logout');
CREATE TYPE account_status AS ENUM ('active', 'suspended', 'locked', 'pending_verification');
CREATE TYPE wishlist_visibility AS ENUM ('PRIVATE', 'PUBLIC', 'SHARED');
