-- Fix sender_phone constraint in whatsapp_messages table
-- Allow sender_phone to be nullable for outbound messages from bot

ALTER TABLE whatsapp_messages 
ALTER COLUMN sender_phone DROP NOT NULL;

-- Add default value for sender_phone when it's the bot sending messages
ALTER TABLE whatsapp_messages 
ALTER COLUMN sender_phone SET DEFAULT '6283140573853';

-- Update existing records where sender_phone is null to use bot number
UPDATE whatsapp_messages 
SET sender_phone = '6283140573853' 
WHERE sender_phone IS NULL AND direction = 'outbound';

-- Add check constraint to ensure sender_phone is provided for inbound messages
ALTER TABLE whatsapp_messages 
ADD CONSTRAINT check_sender_phone_inbound 
CHECK (
  (direction = 'inbound' AND sender_phone IS NOT NULL) OR 
  (direction = 'outbound')
);

-- Create index for better performance on sender_phone queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sender_phone 
ON whatsapp_messages(sender_phone);

-- Create index for direction queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_direction 
ON whatsapp_messages(direction);