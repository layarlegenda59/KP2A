-- Create savings table for member savings data
CREATE TABLE IF NOT EXISTS savings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL DEFAULT 'Simpanan Umum',
    amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    description TEXT,
    transaction_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_savings_member_id ON savings(member_id);
CREATE INDEX IF NOT EXISTS idx_savings_type ON savings(type);
CREATE INDEX IF NOT EXISTS idx_savings_transaction_date ON savings(transaction_date DESC);

-- Add RLS (Row Level Security) policies
ALTER TABLE savings ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read all savings data
CREATE POLICY "Allow authenticated users to read savings" ON savings
    FOR SELECT TO authenticated
    USING (true);

-- Policy for authenticated users to insert savings data
CREATE POLICY "Allow authenticated users to insert savings" ON savings
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Policy for authenticated users to update savings data
CREATE POLICY "Allow authenticated users to update savings" ON savings
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy for authenticated users to delete savings data
CREATE POLICY "Allow authenticated users to delete savings" ON savings
    FOR DELETE TO authenticated
    USING (true);