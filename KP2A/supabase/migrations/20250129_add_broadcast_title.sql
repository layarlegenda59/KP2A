-- Add title column to broadcasts table
-- Created: 2025-01-29
-- Description: Add title field to broadcasts table for better organization

ALTER TABLE broadcasts 
ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT 'Untitled Broadcast';

-- Update existing broadcasts to have a default title
UPDATE broadcasts 
SET title = 'Untitled Broadcast' 
WHERE title IS NULL;