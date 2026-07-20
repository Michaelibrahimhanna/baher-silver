-- ============================================================================
-- SECURITY: RLS, ROLES, AND POLICIES
-- ============================================================================

-- 1. Helper Security Functions
CREATE OR REPLACE FUNCTION auth.is_admin() RETURNS BOOLEAN AS $$
BEGIN
  -- Validate against app_metadata for 'admin' role
  RETURN coalesce((current_setting('request.jwt.claims', true)::jsonb)->'app_metadata'->>'role', '') = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Enable RLS on all tables
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_seo ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attribute_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_attribute_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE occasions ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_occasions ENABLE ROW LEVEL SECURITY;
ALTER TABLE silver_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. Grants & Roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- 4. Public Read Policies
CREATE POLICY "Public read active products" ON products FOR SELECT TO public USING (deleted_at IS NULL AND visibility = 'public' AND status = 'published');
CREATE POLICY "Public read active variants" ON product_variants FOR SELECT TO public USING (deleted_at IS NULL AND is_active = true);
CREATE POLICY "Public read active brands" ON brands FOR SELECT TO public USING (deleted_at IS NULL AND is_active = true);
CREATE POLICY "Public read active categories" ON categories FOR SELECT TO public USING (deleted_at IS NULL AND is_active = true);
CREATE POLICY "Public read active collections" ON collections FOR SELECT TO public USING (deleted_at IS NULL AND is_active = true);
CREATE POLICY "Public read product media" ON product_media FOR SELECT TO public USING (deleted_at IS NULL);
CREATE POLICY "Public read tags" ON tags FOR SELECT TO public USING (deleted_at IS NULL);
CREATE POLICY "Public read product_tags" ON product_tags FOR SELECT TO public USING (true);
CREATE POLICY "Public read attributes" ON attributes FOR SELECT TO public USING (deleted_at IS NULL);
CREATE POLICY "Public read attribute_values" ON attribute_values FOR SELECT TO public USING (deleted_at IS NULL);
CREATE POLICY "Public read product_attribute_values" ON product_attribute_values FOR SELECT TO public USING (true);
CREATE POLICY "Public read occasions" ON occasions FOR SELECT TO public USING (deleted_at IS NULL);
CREATE POLICY "Public read product_occasions" ON product_occasions FOR SELECT TO public USING (true);
CREATE POLICY "Public read product_seo" ON product_seo FOR SELECT TO public USING (true);
CREATE POLICY "Public read materials" ON materials FOR SELECT TO public USING (deleted_at IS NULL AND is_active = true);

-- 5. Admin Write Policies (All tables)
DO $$ 
DECLARE 
  t text;
BEGIN
  FOR t IN 
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('
      CREATE POLICY "Admin All Access on %I" ON %I 
      FOR ALL TO authenticated 
      USING (auth.is_admin()) 
      WITH CHECK (auth.is_admin());
    ', t, t);
  END LOOP;
END $$;

-- 6. Storage Policies
INSERT INTO storage.buckets (id, name, public) 
VALUES ('catalog_media', 'catalog_media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read media bucket" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'catalog_media');

CREATE POLICY "Admin write media bucket" ON storage.objects
FOR ALL TO authenticated USING (bucket_id = 'catalog_media' AND auth.is_admin()) WITH CHECK (bucket_id = 'catalog_media' AND auth.is_admin());
