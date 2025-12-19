-- Fix WhatsApp Bot Database Schema Errors
-- This migration adds missing columns that are causing errors in the WhatsApp Bot functionality

-- 1. Add status column to whatsapp_messages table
ALTER TABLE whatsapp_messages 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending' 
CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed'));

-- 2. Add full_name column to members table (alias for nama_lengkap)
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Update full_name with existing nama_lengkap data
UPDATE members 
SET full_name = nama_lengkap 
WHERE full_name IS NULL;

-- 3. Add whatsapp_verified column to members table
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS whatsapp_verified BOOLEAN DEFAULT FALSE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_members_whatsapp_verified ON members(whatsapp_verified);
CREATE INDEX IF NOT EXISTS idx_members_full_name ON members(full_name);

-- Add comments for documentation
COMMENT ON COLUMN whatsapp_messages.status IS 'Status of the WhatsApp message: pending, sent, delivered, read, failed';
COMMENT ON COLUMN members.full_name IS 'Full name of the member (alias for nama_lengkap for WhatsApp compatibility)';
COMMENT ON COLUMN members.whatsapp_verified IS 'Whether the member has verified their WhatsApp number';