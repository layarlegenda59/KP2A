-- WhatsApp Broadcast System Database Schema
-- Created: 2025-01-29
-- Description: Complete database schema for WhatsApp broadcast functionality

-- Create contact_groups table
CREATE TABLE IF NOT EXISTS contact_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    group_id UUID REFERENCES contact_groups(id),
    is_valid BOOLEAN DEFAULT true,
    last_validated TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create broadcasts table
CREATE TABLE IF NOT EXISTS broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'completed', 'failed', 'cancelled')),
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create broadcast_recipients table
CREATE TABLE IF NOT EXISTS broadcast_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broadcast_id UUID REFERENCES broadcasts(id) ON DELETE CASCADE NOT NULL,
    contact_id UUID REFERENCES contacts(id),
    phone VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contact_groups_created_by ON contact_groups(created_by);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_group_id ON contacts(group_id);
CREATE INDEX IF NOT EXISTS idx_contacts_is_valid ON contacts(is_valid);
CREATE INDEX IF NOT EXISTS idx_broadcasts_created_by ON broadcasts(created_by);
CREATE INDEX IF NOT EXISTS idx_broadcasts_status ON broadcasts(status);
CREATE INDEX IF NOT EXISTS idx_broadcasts_created_at ON broadcasts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_broadcast_id ON broadcast_recipients(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_contact_id ON broadcast_recipients(contact_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_status ON broadcast_recipients(status);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_phone ON broadcast_recipients(phone);

-- Enable Row Level Security
ALTER TABLE contact_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_recipients ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for contact_groups
CREATE POLICY "Users can view all contact groups" ON contact_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create contact groups" ON contact_groups FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update their contact groups" ON contact_groups FOR UPDATE TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Users can delete their contact groups" ON contact_groups FOR DELETE TO authenticated USING (created_by = auth.uid());

-- Create RLS policies for contacts
CREATE POLICY "Users can view all contacts" ON contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create contacts" ON contacts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update contacts" ON contacts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete contacts" ON contacts FOR DELETE TO authenticated USING (true);

-- Create RLS policies for broadcasts
CREATE POLICY "Users can view their broadcasts" ON broadcasts FOR SELECT TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Users can create broadcasts" ON broadcasts FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update their broadcasts" ON broadcasts FOR UPDATE TO authenticated USING (created_by = auth.uid());

-- Create RLS policies for broadcast_recipients
CREATE POLICY "Users can view broadcast recipients for their broadcasts" ON broadcast_recipients FOR SELECT TO authenticated 
USING (EXISTS (SELECT 1 FROM broadcasts WHERE broadcasts.id = broadcast_recipients.broadcast_id AND broadcasts.created_by = auth.uid()));
CREATE POLICY "Users can create broadcast recipients for their broadcasts" ON broadcast_recipients FOR INSERT TO authenticated 
WITH CHECK (EXISTS (SELECT 1 FROM broadcasts WHERE broadcasts.id = broadcast_recipients.broadcast_id AND broadcasts.created_by = auth.uid()));
CREATE POLICY "Users can update broadcast recipients for their broadcasts" ON broadcast_recipients FOR UPDATE TO authenticated 
USING (EXISTS (SELECT 1 FROM broadcasts WHERE broadcasts.id = broadcast_recipients.broadcast_id AND broadcasts.created_by = auth.uid()));

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON contact_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON broadcasts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON broadcast_recipients TO authenticated;

-- Grant permissions to anon users for read-only access where needed
GRANT SELECT ON contacts TO anon;
GRANT SELECT ON contact_groups TO anon;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_contact_groups_updated_at BEFORE UPDATE ON contact_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default contact group
INSERT INTO contact_groups (name, description) VALUES 
('Default', 'Default contact group for all contacts')
ON CONFLICT DO NOTHING;

-- Insert sample contacts for testing
INSERT INTO contacts (name, phone, group_id) VALUES 
('Test Contact 1', '628123456789', (SELECT id FROM contact_groups WHERE name = 'Default' LIMIT 1)),
('Test Contact 2', '628987654321', (SELECT id FROM contact_groups WHERE name = 'Default' LIMIT 1))
ON CONFLICT (phone) DO NOTHING;