-- ============================================================================
-- INDEXES
-- ============================================================================

-- Products
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_brand_id ON products(brand_id);
CREATE INDEX idx_products_material_id ON products(material_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_featured ON products(featured);
CREATE INDEX idx_products_deleted_at ON products(deleted_at);

-- Product text search capabilities (using GIN on text fields, adaptable to full-text)
CREATE INDEX idx_products_name_ar ON products USING gin (to_tsvector('arabic', name_ar));
CREATE INDEX idx_products_name_en ON products USING gin (to_tsvector('english', name_en));

-- Variants
CREATE INDEX idx_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_variants_sku ON product_variants(sku);
CREATE INDEX idx_variants_barcode ON product_variants(barcode);
CREATE INDEX idx_variants_deleted_at ON product_variants(deleted_at);

-- Inventory & Cost
CREATE INDEX idx_cost_history_variant_id ON cost_history(variant_id);
CREATE INDEX idx_cost_history_effective_dates ON cost_history(effective_from, effective_to);
CREATE INDEX idx_inventory_ledger_variant_id ON inventory_ledger(variant_id);

-- Pivots / Lookups
CREATE INDEX idx_product_categories_category ON product_categories(category_id);
CREATE INDEX idx_product_collections_collection ON product_collections(collection_id);
CREATE INDEX idx_product_tags_tag ON product_tags(tag_id);
CREATE INDEX idx_product_occasions_occasion ON product_occasions(occasion_id);
CREATE INDEX idx_product_attribute_values_value ON product_attribute_values(attribute_value_id);

-- Categories & Collections
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_collections_slug ON collections(slug);
CREATE INDEX idx_collections_dates ON collections(start_date, end_date);

-- Media & SEO
CREATE INDEX idx_product_media_product_id ON product_media(product_id);
CREATE INDEX idx_product_media_variant_id ON product_media(variant_id);
CREATE INDEX idx_silver_price_recorded_at ON silver_price_history(recorded_at);

-- ============================================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================================

-- 1. Timestamp Updater Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Assign update_updated_at_column triggers
CREATE TRIGGER set_timestamp_warehouses BEFORE UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_timestamp_brands BEFORE UPDATE ON brands FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_timestamp_materials BEFORE UPDATE ON materials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_timestamp_products BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_timestamp_product_seo BEFORE UPDATE ON product_seo FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_timestamp_product_variants BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_timestamp_product_media BEFORE UPDATE ON product_media FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_timestamp_attributes BEFORE UPDATE ON attributes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_timestamp_attribute_values BEFORE UPDATE ON attribute_values FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_timestamp_tags BEFORE UPDATE ON tags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_timestamp_categories BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_timestamp_collections BEFORE UPDATE ON collections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_timestamp_occasions BEFORE UPDATE ON occasions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Audit Log Function
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Safely attempt to fetch auth.uid() in Supabase context
    BEGIN
        v_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;

    IF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, user_id)
        VALUES (TG_TABLE_NAME::VARCHAR, OLD.id, 'DELETE', to_jsonb(OLD), v_user_id);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, user_id)
        VALUES (TG_TABLE_NAME::VARCHAR, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), v_user_id);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_logs (table_name, record_id, action, new_values, user_id)
        VALUES (TG_TABLE_NAME::VARCHAR, NEW.id, 'INSERT', to_jsonb(NEW), v_user_id);
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Assign Audit Triggers to Critical Tables
CREATE TRIGGER audit_products AFTER INSERT OR UPDATE OR DELETE ON products FOR EACH ROW EXECUTE FUNCTION log_audit_event();
CREATE TRIGGER audit_product_variants AFTER INSERT OR UPDATE OR DELETE ON product_variants FOR EACH ROW EXECUTE FUNCTION log_audit_event();
CREATE TRIGGER audit_cost_history AFTER INSERT OR UPDATE OR DELETE ON cost_history FOR EACH ROW EXECUTE FUNCTION log_audit_event();
CREATE TRIGGER audit_categories AFTER INSERT OR UPDATE OR DELETE ON categories FOR EACH ROW EXECUTE FUNCTION log_audit_event();
