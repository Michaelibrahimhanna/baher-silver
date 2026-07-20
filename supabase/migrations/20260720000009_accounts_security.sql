-- ============================================================================
-- ACCOUNTS DOMAIN: SECURITY & RLS
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_security ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_favorite_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_favorite_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_favorite_occasions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_sessions ENABLE ROW LEVEL SECURITY;

-- Recursive Permission Checker Function
CREATE OR REPLACE FUNCTION auth.has_permission(p_permission_slug VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN;
BEGIN
  -- Note: auth.uid() assumes executed context of a logged-in user
  WITH RECURSIVE role_tree AS (
      SELECT r.id, r.parent_role_id
      FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.profile_id = auth.uid()
      UNION
      SELECT r.id, r.parent_role_id
      FROM roles r
      JOIN role_tree rt ON rt.parent_role_id = r.id
  )
  SELECT EXISTS (
      SELECT 1 
      FROM role_tree rt
      JOIN role_permissions rp ON rt.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE p.slug = p_permission_slug
  ) INTO v_has_permission;

  RETURN coalesce(v_has_permission, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: A user can read/write their own profile (Non-sensitive data)
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Profile Security (Admin Only)
CREATE POLICY "Admin access to profile security" ON profile_security FOR ALL TO authenticated USING (auth.has_permission('manage_security')) WITH CHECK (auth.has_permission('manage_security'));

-- Addresses
CREATE POLICY "Users can manage own addresses" ON addresses FOR ALL TO authenticated USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

-- Preferences and Notifications
CREATE POLICY "Users can manage own preferences" ON customer_preferences FOR ALL TO authenticated USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can manage own notifications" ON notification_settings FOR ALL TO authenticated USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users manage favorite categories" ON profile_favorite_categories FOR ALL TO authenticated USING (auth.uid() = profile_id);
CREATE POLICY "Users manage favorite materials" ON profile_favorite_materials FOR ALL TO authenticated USING (auth.uid() = profile_id);
CREATE POLICY "Users manage favorite occasions" ON profile_favorite_occasions FOR ALL TO authenticated USING (auth.uid() = profile_id);

-- Wishlists (Considering Visibility)
CREATE POLICY "Users manage own wishlists" ON wishlists FOR ALL TO authenticated USING (auth.uid() = profile_id);
CREATE POLICY "Public wishlists are readable" ON wishlists FOR SELECT TO public USING (visibility = 'PUBLIC');

CREATE POLICY "Users manage own wishlist items" ON wishlist_items FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM wishlists WHERE wishlists.id = wishlist_items.wishlist_id AND wishlists.profile_id = auth.uid())
);
CREATE POLICY "Public wishlist items readable" ON wishlist_items FOR SELECT TO public USING (
    EXISTS (SELECT 1 FROM wishlists WHERE wishlists.id = wishlist_items.wishlist_id AND wishlists.visibility = 'PUBLIC')
);

-- Analytics
CREATE POLICY "Users read own activity" ON customer_activity FOR SELECT TO authenticated USING (auth.uid() = profile_id);
CREATE POLICY "Users read own sessions" ON login_sessions FOR SELECT TO authenticated USING (auth.uid() = profile_id);

-- RBAC Roles & Permissions
CREATE POLICY "Authenticated read roles" ON roles FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "Authenticated read permissions" ON permissions FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "Authenticated read role_permissions" ON role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read own user_roles" ON user_roles FOR SELECT TO authenticated USING (auth.uid() = profile_id);

-- Admins can do anything on general tables
DO $$ 
DECLARE 
  t text;
  accounts_tables text[] := ARRAY[
    'profiles', 'addresses', 'roles', 'permissions', 'role_permissions', 'user_roles', 
    'customer_preferences', 'profile_favorite_categories', 'profile_favorite_materials', 'profile_favorite_occasions',
    'notification_settings', 'wishlists', 'wishlist_items', 
    'customer_activity', 'login_sessions'
  ];
BEGIN
  FOREACH t IN ARRAY accounts_tables
  LOOP
    EXECUTE format('
      CREATE POLICY "Admin All Access on %I" ON %I 
      FOR ALL TO authenticated 
      USING (auth.is_admin() OR auth.has_permission(''manage_accounts'')) 
      WITH CHECK (auth.is_admin() OR auth.has_permission(''manage_accounts''));
    ', t, t);
  END LOOP;
END $$;
