-- Add last_activity column to whatsapp_config table
-- This column tracks the last activity timestamp of WhatsApp client

ALTER TABLE whatsapp_config 
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Update existing records to set default value
UPDATE whatsapp_config 
SET last_activity = updated_at 
WHERE last_activity IS NULL AND updated_at IS NOT NULL;

-- Update existing records without updated_at to current timestamp
UPDATE whatsapp_config 
SET last_activity = now() 
WHERE last_activity IS NULL;

-- Add comment to the column for documentation
COMMENT ON COLUMN whatsapp_config.last_activity IS 'Tracks the last activity timestamp of WhatsApp client';