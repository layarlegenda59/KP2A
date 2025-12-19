-- Create system user for broadcast functionality
-- This user will be used when no authenticated user is available

INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'system@broadcast.local',
    '$2a$10$dummy.encrypted.password.hash.for.system.user.only',
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "system", "providers": ["system"]}',
    '{"name": "System Broadcast User", "role": "system"}',
    false,
    'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Ensure the system user exists for broadcast functionality
COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema. Includes system user for broadcast functionality.';