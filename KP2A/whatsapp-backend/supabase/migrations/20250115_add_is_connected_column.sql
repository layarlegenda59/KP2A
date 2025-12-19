-- Add is_connected column to whatsapp_config table
-- This column tracks the connection status of WhatsApp client

ALTER TABLE whatsapp_config 
ADD COLUMN IF NOT EXISTS is_connected BOOLEAN DEFAULT false;

-- Update existing records to set default value
UPDATE whatsapp_config 
SET is_connected = false 
WHERE is_connected IS NULL;

-- Add comment to the column for documentation
COMMENT ON COLUMN whatsapp_config.is_connected IS 'Tracks whether WhatsApp client is currently connected';