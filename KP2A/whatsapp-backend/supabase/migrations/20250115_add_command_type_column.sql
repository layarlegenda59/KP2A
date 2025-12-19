-- Add command_type column to whatsapp_analytics table
-- This column tracks the type of command that was executed

ALTER TABLE whatsapp_analytics 
ADD COLUMN IF NOT EXISTS command_type VARCHAR(50);

-- Update existing records to set default value for command_type
UPDATE whatsapp_analytics 
SET command_type = 'unknown' 
WHERE command_type IS NULL;

-- Add comment to the column for documentation
COMMENT ON COLUMN whatsapp_analytics.command_type IS 'Type of WhatsApp command that was executed (e.g., help, status, saldo, pinjaman, riwayat)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_analytics_command_type 
ON whatsapp_analytics(command_type);

-- Create index for analytics_date + command_type combination
CREATE INDEX IF NOT EXISTS idx_whatsapp_analytics_date_command 
ON whatsapp_analytics(analytics_date, command_type);