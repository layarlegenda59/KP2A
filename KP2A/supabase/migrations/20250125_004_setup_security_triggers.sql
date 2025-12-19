-- Enhanced Expenses Module Migration - Step 4: Setup Security and Triggers
-- Migration: 004_setup_security_triggers.sql

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON transaction_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view approved transactions" ON transactions;
DROP POLICY IF EXISTS "Authenticated users can insert transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can delete transactions" ON transactions;
DROP POLICY IF EXISTS "Everyone can view active categories" ON transaction_categories;
DROP POLICY IF EXISTS "Everyone can view active payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Admins can manage categories" ON transaction_categories;
DROP POLICY IF EXISTS "Admins can manage payment methods" ON payment_methods;

-- Create RLS Policies for transactions
CREATE POLICY "Users can view approved transactions" ON transactions
    FOR SELECT USING (
        status = 'approved' 
        OR auth.uid() = created_by 
        OR (auth.jwt() ->> 'role') = 'admin'
        OR (auth.jwt() ->> 'role') = 'treasurer'
    );

CREATE POLICY "Authenticated users can insert transactions" ON transactions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own transactions" ON transactions
    FOR UPDATE USING (
        auth.uid() = created_by 
        OR (auth.jwt() ->> 'role') = 'admin'
        OR (auth.jwt() ->> 'role') = 'treasurer'
    );

CREATE POLICY "Admins can delete transactions" ON transactions
    FOR DELETE USING ((auth.jwt() ->> 'role') = 'admin');

-- RLS Policies for categories and payment methods
CREATE POLICY "Everyone can view active categories" ON transaction_categories
    FOR SELECT USING (is_active = true);

CREATE POLICY "Everyone can view active payment methods" ON payment_methods
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage categories" ON transaction_categories
    FOR ALL USING ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "Admins can manage payment methods" ON payment_methods
    FOR ALL USING ((auth.jwt() ->> 'role') = 'admin');

-- Grant permissions to roles
GRANT SELECT ON transaction_categories TO anon, authenticated;
GRANT SELECT ON payment_methods TO anon, authenticated;
GRANT ALL ON transactions TO authenticated;
GRANT ALL ON transaction_categories TO authenticated;
GRANT ALL ON payment_methods TO authenticated;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Enhanced Expenses Module database migration completed successfully';
    RAISE NOTICE 'Created tables: transactions, transaction_categories, payment_methods';
    RAISE NOTICE 'Applied RLS policies and granted permissions';
END $$;