-- Fix RLS policies for whatsapp_config table
-- Allow authenticated users to read and update whatsapp_config

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read whatsapp_config" ON whatsapp_config;
DROP POLICY IF EXISTS "Allow authenticated users to update whatsapp_config" ON whatsapp_config;
DROP POLICY IF EXISTS "Allow authenticated users to insert whatsapp_config" ON whatsapp_config;

-- Create new policies for whatsapp_config
CREATE POLICY "Allow authenticated users to read whatsapp_config" 
ON whatsapp_config FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to update whatsapp_config" 
ON whatsapp_config FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert whatsapp_config" 
ON whatsapp_config FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Also allow anon users for backward compatibility (if needed)
CREATE POLICY "Allow anon users to read whatsapp_config" 
ON whatsapp_config FOR SELECT 
TO anon 
USING (true);

CREATE POLICY "Allow anon users to update whatsapp_config" 
ON whatsapp_config FOR UPDATE 
TO anon 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow anon users to insert whatsapp_config" 
ON whatsapp_config FOR INSERT 
TO anon 
WITH CHECK (true);