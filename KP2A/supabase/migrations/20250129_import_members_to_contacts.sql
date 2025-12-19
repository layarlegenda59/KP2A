-- Import Members to Broadcast Contacts Migration
-- Created: 2025-01-29
-- Description: Import all active members from members table to contacts table for broadcast system

-- Function to clean and validate phone numbers
CREATE OR REPLACE FUNCTION clean_phone_number(phone_input TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Return NULL if input is NULL or empty
    IF phone_input IS NULL OR TRIM(phone_input) = '' THEN
        RETURN NULL;
    END IF;
    
    -- Remove all non-digit characters
    phone_input := REGEXP_REPLACE(phone_input, '[^0-9]', '', 'g');
    
    -- Return NULL if no digits found
    IF LENGTH(phone_input) = 0 THEN
        RETURN NULL;
    END IF;
    
    -- Handle Indonesian phone numbers
    -- Convert 08xx to 628xx (Indonesian mobile format)
    IF phone_input LIKE '08%' THEN
        phone_input := '62' || SUBSTRING(phone_input FROM 2);
    END IF;
    
    -- Add 62 prefix if number starts with 8 and doesn't have country code
    IF phone_input LIKE '8%' AND LENGTH(phone_input) >= 10 THEN
        phone_input := '62' || phone_input;
    END IF;
    
    -- Validate Indonesian mobile numbers (should be 62 + 8xx + 8-9 more digits)
    IF phone_input ~ '^628[0-9]{8,9}$' THEN
        RETURN phone_input;
    END IF;
    
    -- Validate other international numbers (should be reasonable length)
    IF LENGTH(phone_input) >= 10 AND LENGTH(phone_input) <= 15 THEN
        RETURN phone_input;
    END IF;
    
    -- Return NULL for invalid numbers
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Get default contact group ID
DO $$
DECLARE
    default_group_id UUID;
BEGIN
    -- Get or create default group
    SELECT id INTO default_group_id 
    FROM contact_groups 
    WHERE name = 'Default' 
    LIMIT 1;
    
    -- If no default group exists, create one
    IF default_group_id IS NULL THEN
        INSERT INTO contact_groups (name, description) 
        VALUES ('Default', 'Default contact group for all contacts')
        RETURNING id INTO default_group_id;
    END IF;
    
    -- Import active members to contacts table
    INSERT INTO contacts (name, phone, group_id, is_valid, last_validated, created_at, updated_at)
    SELECT 
        m.nama_lengkap as name,
        clean_phone_number(m.no_hp) as phone,
        default_group_id as group_id,
        true as is_valid,
        NOW() as last_validated,
        NOW() as created_at,
        NOW() as updated_at
    FROM members m
    WHERE 
        m.status_keanggotaan = 'aktif'
        AND m.nama_lengkap IS NOT NULL 
        AND TRIM(m.nama_lengkap) != ''
        AND clean_phone_number(m.no_hp) IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM contacts c 
            WHERE c.phone = clean_phone_number(m.no_hp)
        );
    
    -- Log the results
    RAISE NOTICE 'Migration completed. Imported % contacts from active members.', 
        (SELECT COUNT(*) FROM contacts WHERE created_at >= NOW() - INTERVAL '1 minute');
END $$;

-- Drop the helper function after use
DROP FUNCTION IF EXISTS clean_phone_number(TEXT);

-- Create index for better performance on phone lookups
CREATE INDEX IF NOT EXISTS idx_contacts_phone_lookup ON contacts(phone) WHERE phone IS NOT NULL;

-- Update statistics
ANALYZE contacts;