-- Fix RLS policies for whatsapp_sessions table
-- This migration adds proper RLS policies for WhatsApp session management

-- Drop any existing policies
DROP POLICY IF EXISTS "whatsapp_sessions_select_all" ON whatsapp_sessions;
DROP POLICY IF EXISTS "whatsapp_sessions_insert_all" ON whatsapp_sessions;
DROP POLICY IF EXISTS "whatsapp_sessions_update_all" ON whatsapp_sessions;
DROP POLICY IF EXISTS "whatsapp_sessions_delete_all" ON whatsapp_sessions;

-- Create policies for whatsapp_sessions table
-- Allow all operations for authenticated users and service role
CREATE POLICY "whatsapp_sessions_select_all" ON whatsapp_sessions
  FOR SELECT USING (
    auth.role() = 'authenticated' OR 
    auth.role() = 'anon' OR
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "whatsapp_sessions_insert_all" ON whatsapp_sessions
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' OR 
    auth.role() = 'anon' OR
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "whatsapp_sessions_update_all" ON whatsapp_sessions
  FOR UPDATE USING (
    auth.role() = 'authenticated' OR 
    auth.role() = 'anon' OR
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "whatsapp_sessions_delete_all" ON whatsapp_sessions
  FOR DELETE USING (
    auth.role() = 'authenticated' OR 
    auth.role() = 'anon' OR
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Ensure RLS is enabled
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON whatsapp_sessions TO authenticated, anon;