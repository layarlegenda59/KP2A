-- Auto-sync users from auth.users to public.users
-- This migration creates triggers to automatically sync users between auth and public schemas

-- Function to sync user from auth.users to public.users
CREATE OR REPLACE FUNCTION sync_auth_user_to_public()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update user in public.users table
  INSERT INTO public.users (id, email, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    'anggota', -- default role
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = EXCLUDED.updated_at;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle user deletion
CREATE OR REPLACE FUNCTION handle_auth_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Don't actually delete from public.users, just mark as inactive if needed
  -- This preserves referential integrity for financial_reports
  UPDATE public.users 
  SET updated_at = NOW()
  WHERE id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for auth.users table
DROP TRIGGER IF EXISTS sync_user_on_insert ON auth.users;
DROP TRIGGER IF EXISTS sync_user_on_update ON auth.users;
DROP TRIGGER IF EXISTS sync_user_on_delete ON auth.users;

CREATE TRIGGER sync_user_on_insert
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_auth_user_to_public();

CREATE TRIGGER sync_user_on_update
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_auth_user_to_public();

CREATE TRIGGER sync_user_on_delete
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_auth_user_delete();

-- Sync existing users from auth.users to public.users
INSERT INTO public.users (id, email, role, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  'anggota' as role,
  au.created_at,
  au.updated_at
FROM auth.users au
WHERE au.deleted_at IS NULL
  AND au.email IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = EXCLUDED.updated_at;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION sync_auth_user_to_public() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_auth_user_delete() TO authenticated;