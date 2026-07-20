-- ============================================================================
-- ACCOUNTS DOMAIN: INDEXES & TRIGGERS
-- ============================================================================

-- Indexes
CREATE INDEX idx_profiles_deleted_at ON profiles(deleted_at);
CREATE INDEX idx_addresses_profile_id ON addresses(profile_id);
CREATE INDEX idx_addresses_deleted_at ON addresses(deleted_at);
CREATE INDEX idx_user_roles_profile_id ON user_roles(profile_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_wishlists_profile_id ON wishlists(profile_id);
CREATE INDEX idx_wishlists_deleted_at ON wishlists(deleted_at);
CREATE INDEX idx_wishlist_items_variant_id ON wishlist_items(variant_id);
CREATE INDEX idx_wishlist_items_wishlist_id ON wishlist_items(wishlist_id);
CREATE INDEX idx_customer_activity_profile_id ON customer_activity(profile_id);
CREATE INDEX idx_login_sessions_profile_id ON login_sessions(profile_id);

-- Updated_at Triggers
CREATE TRIGGER set_timestamp_profiles BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_timestamp_profile_security BEFORE UPDATE ON profile_security FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_timestamp_addresses BEFORE UPDATE ON addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_timestamp_roles BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_timestamp_permissions BEFORE UPDATE ON permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_timestamp_customer_preferences BEFORE UPDATE ON customer_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_timestamp_notification_settings BEFORE UPDATE ON notification_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_timestamp_wishlists BEFORE UPDATE ON wishlists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit Triggers (Omitting customer_activity and login_sessions intentionally)
CREATE TRIGGER audit_profiles AFTER INSERT OR UPDATE OR DELETE ON profiles FOR EACH ROW EXECUTE FUNCTION log_audit_event();
CREATE TRIGGER audit_profile_security AFTER INSERT OR UPDATE OR DELETE ON profile_security FOR EACH ROW EXECUTE FUNCTION log_audit_event();
CREATE TRIGGER audit_addresses AFTER INSERT OR UPDATE OR DELETE ON addresses FOR EACH ROW EXECUTE FUNCTION log_audit_event();
CREATE TRIGGER audit_roles AFTER INSERT OR UPDATE OR DELETE ON roles FOR EACH ROW EXECUTE FUNCTION log_audit_event();
CREATE TRIGGER audit_permissions AFTER INSERT OR UPDATE OR DELETE ON permissions FOR EACH ROW EXECUTE FUNCTION log_audit_event();
CREATE TRIGGER audit_user_roles AFTER INSERT OR UPDATE OR DELETE ON user_roles FOR EACH ROW EXECUTE FUNCTION log_audit_event();
CREATE TRIGGER audit_role_permissions AFTER INSERT OR UPDATE OR DELETE ON role_permissions FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Supabase Auth Trigger for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
    customer_role_id UUID;
BEGIN
    INSERT INTO public.profiles (id, first_name, last_name, is_guest, guest_identifier)
    VALUES (
        new.id, 
        new.raw_user_meta_data->>'first_name', 
        new.raw_user_meta_data->>'last_name',
        coalesce((new.raw_user_meta_data->>'is_guest')::boolean, false),
        new.raw_user_meta_data->>'guest_identifier'
    );
    
    INSERT INTO public.profile_security (profile_id) VALUES (new.id);
    INSERT INTO public.customer_preferences (profile_id) VALUES (new.id);
    INSERT INTO public.notification_settings (profile_id) VALUES (new.id);
    
    SELECT id INTO customer_role_id FROM public.roles WHERE slug = 'customer' LIMIT 1;
    IF customer_role_id IS NOT NULL THEN
        INSERT INTO public.user_roles (profile_id, role_id) VALUES (new.id, customer_role_id);
    END IF;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
