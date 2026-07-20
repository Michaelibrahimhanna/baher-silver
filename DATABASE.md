# Baher Silver: Database Architecture Documentation

This document serves as the comprehensive schema and architecture manual for the Baher Silver Catalog Domain.

## Core Philosophy
- **Soft Deletes**: Business entities are never physically deleted (managed via `deleted_at`).
- **Multilingual Support**: Key customer-facing strings store both Arabic (`_ar`) and English (`_en`).
- **Extensible**: Strict reliance on UUIDs and separated junctions for maximum future flexibility (e.g., adding CRM, Wholesale).

---

## 1. `brands`
**Purpose**: Represents jewelry manufacturers or internal design lines.
- `id` (UUID): Primary Key.
- `slug` (String): Unique URL identifier.
- `name_ar` / `name_en` (String): Multilingual names.
- `logo_path` (String): Storage bucket path.
**Relationships**: One-to-Many with `products`.

## 2. `materials`
**Purpose**: Primary material composition (e.g., "Silver 925", "Gold 18K").
- `id` (UUID): Primary Key.
- `slug`, `name_ar`, `name_en`.
**Usage**: Allows global filtering by material independently of custom attributes.

## 3. `warehouses`
**Purpose**: Future-ready locations tracking physical stock.
- `code` (String): e.g., "WH-RYD-01".
- `type` (warehouse_type): MAIN, BRANCH, FACTORY, SUPPLIER.
**Usage**: Tracks inventory per location.

## 4. `products`
**Purpose**: The central identity of a catalog item (No pricing or weight here).
- `brand_id`, `material_id`: FK Lookups.
- `slug`, `name_ar`, `name_en`, `description_ar`, `description_en`, `story_ar`, `story_en`.
- `status` (product_status): draft, published, archived.
- `visibility` (visibility_status): public, hidden.
- `publishing_status` (publishing_status): immediate, scheduled.
- `featured`, `best_seller`, `new_arrival` (Booleans): Merchandising flags.
**Usage**: The main parent object returned to the storefront API.

## 5. `product_variants`
**Purpose**: A specific purchasable permutation of a product (Size, Color).
- `product_id` (UUID).
- `sku`, `barcode` (Strings): Unique identifiers for scanning and ERP.
- `weight`, `length`, `size`, `color`, `stone`, `plating`: Physical specifications.
- `pricing_strategy` (pricing_strategy): manual vs smart.
- `regular_price`, `sale_price`, `price_adjustment`: Pricing tiers.
**Usage**: This is what the user actually adds to the cart.

## 6. `cost_history`
**Purpose**: Track manufacturing and labor costs over time.
- `variant_id` (UUID).
- `silver_cost`, `stone_cost`, `packaging_cost`, `labor_cost`, `other_cost`, `total_cost`.
- `effective_from`, `effective_to` (Timestamps): Valid periods.
**Usage**: Hidden from customers. Used by Admin for margin calculations.

## 7. `inventory_ledger`
**Purpose**: Append-only transactional history of stock movements.
- `variant_id`, `warehouse_id`.
- `movement_type` (Enum): purchase, sale, return, etc.
- `quantity_change` (Integer): Positive or negative value.
**Usage**: Prevents race conditions. Actual stock is `SUM(quantity_change)`.

## 8. `product_media`
**Purpose**: Associates images, videos, 3D models with products/variants.
- `media_type` (Enum): image, video, 360, etc.
- `storage_path`: Supabase storage bucket path.
- `is_primary` (Boolean): Defines the thumbnail.

## 9. Taxonomy (Categories & Collections)
- `categories`: Hierarchical tree (`parent_id`) for standard navigation (e.g., Rings -> Engagement).
- `collections`: Curated seasonal groupings with `start_date` / `end_date` for marketing.
- Connected via `product_categories` and `product_collections` pivot tables.

## 10. Metadata (Attributes, Tags, Occasions, SEO)
- `attributes` & `attribute_values`: Powers faceted search (e.g., "Cut" -> "Princess").
- `tags`: Lightweight keywords.
- `occasions`: "Birthday", "Wedding", etc.
- `product_seo`: Dedicated table for meta titles, descriptions, and JSON Schema.

## 11. `audit_logs`
**Purpose**: Irrefutable history of database changes.
- Records `old_values` and `new_values` as JSONB.
- Automatically populated via database triggers on core tables.

---

## Security (RLS)
- All tables have **Row Level Security** enabled.
- **Public**: Has read-only access to published, non-deleted catalog entities.
- **Admin**: Has full CRUD access across all tables via `auth.is_admin()` policy.

---

## Accounts Domain (Sprint 1)

## 12. `profiles`
**Purpose**: Extends `auth.users` to store application-specific user data. Connects Auth to the Business Logic.
- `id` (UUID): PK, references `auth.users(id)`.
- `is_guest` (Boolean): Allows seamless guest checkout which can be converted to registered.
- `display_name`, `email_verified`, `phone_verified`, `last_login_at`, `account_status`, `failed_login_attempts`, `locked_until`, `marketing_consent`, `accepted_terms_at`, `accepted_privacy_at`: Detailed KYC & Auth tracking.

## 13. `addresses`
**Purpose**: Multiple addresses per profile (shipping/billing).
- Includes geo-targeting (`latitude`, `longitude`) and granular delivery details (`building`, `floor`, `apartment`, `landmark`, `delivery_notes`).

## 14. RBAC (Roles & Permissions)
**Purpose**: Defines Admin Dashboard access limits. Profiles support both customers and employees.
- `roles`: Defined roles (Super Admin, Admin, Manager, Sales, Customer Service, Warehouse, Factory, Customer).
- `permissions`: Individual rights.
- `user_roles` & `role_permissions`: Pivot tables.

## 15. `wishlists` & `wishlist_items`
**Purpose**: Users can save products. `created_from` tracks origin (App, Web). `wishlist_items` maps to `variant_id`.

## 16. `customer_preferences` & `notification_settings`
**Purpose**: Tailored shopping experience and CRM triggers.
- Tracks `favorite_categories`, `favorite_materials`, `favorite_occasions` via UUID arrays.
- Includes `whatsapp_updates`, `email_promotions`, etc.

## 17. `customer_activity` & `login_sessions`
**Purpose**: Non-audited analytics for AI integration and BI tools.
- Tracks `device`, `browser`, `platform`, `country`, `logout_at`, `last_activity_at`.
