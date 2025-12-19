-- Bank Withdrawal Categories Migration
-- Migration: 20250128_bank_withdrawal_categories.sql
-- This migration enhances the transaction system with bank withdrawal categories and automatic classification

-- Enhance existing transaction_categories table with bank withdrawal specific fields
ALTER TABLE transaction_categories 
ADD COLUMN IF NOT EXISTS withdrawal_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS auto_classification_rules JSONB,
ADD COLUMN IF NOT EXISTS validation_rules JSONB;

-- Create index for withdrawal type
CREATE INDEX IF NOT EXISTS idx_transaction_categories_withdrawal_type 
ON transaction_categories(withdrawal_type);

-- Create bank_withdrawal_patterns table for classification rules
CREATE TABLE IF NOT EXISTS bank_withdrawal_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_name VARCHAR(100) NOT NULL,
    description_pattern VARCHAR(500),
    amount_range_min DECIMAL(15,2),
    amount_range_max DECIMAL(15,2),
    frequency_pattern VARCHAR(50) CHECK (frequency_pattern IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'irregular')),
    category_id UUID REFERENCES transaction_categories(id) ON DELETE CASCADE,
    confidence_score INTEGER DEFAULT 80 CHECK (confidence_score >= 0 AND confidence_score <= 100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create classification_logs table for tracking automatic classifications
CREATE TABLE IF NOT EXISTS classification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    suggested_category_id UUID REFERENCES transaction_categories(id),
    confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
    classification_method VARCHAR(50) NOT NULL,
    manual_override BOOLEAN DEFAULT false,
    override_reason TEXT,
    classified_by UUID REFERENCES auth.users(id),
    classification_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add bank-specific fields to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS bank_account VARCHAR(50),
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bank_withdrawal_patterns_category ON bank_withdrawal_patterns(category_id);
CREATE INDEX IF NOT EXISTS idx_bank_withdrawal_patterns_active ON bank_withdrawal_patterns(is_active);
CREATE INDEX IF NOT EXISTS idx_bank_withdrawal_patterns_amount_range ON bank_withdrawal_patterns(amount_range_min, amount_range_max);

CREATE INDEX IF NOT EXISTS idx_classification_logs_transaction ON classification_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_classification_logs_confidence ON classification_logs(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_classification_logs_method ON classification_logs(classification_method);
CREATE INDEX IF NOT EXISTS idx_classification_logs_date ON classification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_classification_logs_override ON classification_logs(manual_override);

CREATE INDEX IF NOT EXISTS idx_transactions_bank_account ON transactions(bank_account);
CREATE INDEX IF NOT EXISTS idx_transactions_metadata ON transactions USING GIN(metadata);

-- Enable RLS on new tables
ALTER TABLE bank_withdrawal_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE classification_logs ENABLE ROW LEVEL SECURITY;

-- Policies for bank_withdrawal_patterns
CREATE POLICY "Everyone can view active patterns" ON bank_withdrawal_patterns
    FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated users can manage patterns" ON bank_withdrawal_patterns
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Policies for classification_logs
CREATE POLICY "Users can view their classification logs" ON classification_logs
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert classification logs" ON classification_logs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Grant permissions
GRANT SELECT ON bank_withdrawal_patterns TO anon;
GRANT ALL PRIVILEGES ON bank_withdrawal_patterns TO authenticated;
GRANT SELECT ON classification_logs TO anon;
GRANT ALL PRIVILEGES ON classification_logs TO authenticated;

-- Update existing categories with withdrawal types
UPDATE transaction_categories 
SET withdrawal_type = 'operational' 
WHERE name IN ('Operasional', 'Administrasi', 'Transportasi');

UPDATE transaction_categories 
SET withdrawal_type = 'social' 
WHERE name IN ('Kegiatan Sosial', 'Konsumsi');

UPDATE transaction_categories 
SET withdrawal_type = 'maintenance' 
WHERE name = 'Pemeliharaan';

-- Insert bank withdrawal specific categories (only if they don't exist)
INSERT INTO transaction_categories (name, type, withdrawal_type, color_code, description, auto_classification_rules, validation_rules) 
SELECT 'Penarikan Operasional', 'expense', 'operational', '#1e40af', 'Penarikan untuk kebutuhan operasional harian', 
       '{"amount_range": {"min": 100000, "max": 5000000}, "keywords": ["operasional", "operational", "ops"], "frequency": "daily"}',
       '{"max_daily_amount": 10000000, "requires_approval": false, "approval_threshold": 5000000}'
WHERE NOT EXISTS (SELECT 1 FROM transaction_categories WHERE name = 'Penarikan Operasional');

INSERT INTO transaction_categories (name, type, withdrawal_type, color_code, description, auto_classification_rules, validation_rules) 
SELECT 'Penarikan Gaji Karyawan', 'expense', 'payroll', '#059669', 'Penarikan untuk pembayaran gaji karyawan',
       '{"amount_range": {"min": 1000000, "max": 50000000}, "keywords": ["gaji", "salary", "payroll"], "frequency": "monthly"}',
       '{"max_monthly_amount": 100000000, "requires_approval": true, "approval_threshold": 1000000}'
WHERE NOT EXISTS (SELECT 1 FROM transaction_categories WHERE name = 'Penarikan Gaji Karyawan');

INSERT INTO transaction_categories (name, type, withdrawal_type, color_code, description, auto_classification_rules, validation_rules) 
SELECT 'Penarikan Investasi', 'expense', 'investment', '#7c3aed', 'Penarikan untuk keperluan investasi dan pengembangan',
       '{"amount_range": {"min": 5000000, "max": 100000000}, "keywords": ["investasi", "investment", "pengembangan"], "frequency": "irregular"}',
       '{"max_transaction_amount": 200000000, "requires_approval": true, "approval_threshold": 5000000}'
WHERE NOT EXISTS (SELECT 1 FROM transaction_categories WHERE name = 'Penarikan Investasi');

INSERT INTO transaction_categories (name, type, withdrawal_type, color_code, description, auto_classification_rules, validation_rules) 
SELECT 'Penarikan Darurat', 'expense', 'emergency', '#ef4444', 'Penarikan untuk keperluan darurat dan mendesak',
       '{"amount_range": {"min": 500000, "max": 20000000}, "keywords": ["darurat", "emergency", "urgent"], "frequency": "irregular"}',
       '{"max_transaction_amount": 50000000, "requires_approval": true, "approval_threshold": 1000000}'
WHERE NOT EXISTS (SELECT 1 FROM transaction_categories WHERE name = 'Penarikan Darurat');

INSERT INTO transaction_categories (name, type, withdrawal_type, color_code, description, auto_classification_rules, validation_rules) 
SELECT 'Penarikan Rutin Bulanan', 'expense', 'routine', '#f59e0b', 'Penarikan rutin untuk keperluan bulanan tetap',
       '{"amount_range": {"min": 1000000, "max": 10000000}, "keywords": ["rutin", "routine", "bulanan"], "frequency": "monthly"}',
       '{"max_monthly_amount": 50000000, "requires_approval": false, "approval_threshold": 10000000}'
WHERE NOT EXISTS (SELECT 1 FROM transaction_categories WHERE name = 'Penarikan Rutin Bulanan');

-- Insert bank withdrawal patterns
INSERT INTO bank_withdrawal_patterns (pattern_name, description_pattern, amount_range_min, amount_range_max, frequency_pattern, category_id, confidence_score) 
SELECT 
    'Operational Pattern', 
    'operasional|operational|ops', 
    100000, 
    5000000, 
    'daily', 
    id, 
    85
FROM transaction_categories WHERE name = 'Penarikan Operasional';

INSERT INTO bank_withdrawal_patterns (pattern_name, description_pattern, amount_range_min, amount_range_max, frequency_pattern, category_id, confidence_score) 
SELECT 
    'Payroll Pattern', 
    'gaji|salary|payroll', 
    1000000, 
    50000000, 
    'monthly', 
    id, 
    90
FROM transaction_categories WHERE name = 'Penarikan Gaji Karyawan';

INSERT INTO bank_withdrawal_patterns (pattern_name, description_pattern, amount_range_min, amount_range_max, frequency_pattern, category_id, confidence_score) 
SELECT 
    'Emergency Pattern', 
    'darurat|emergency|urgent', 
    500000, 
    20000000, 
    'irregular', 
    id, 
    80
FROM transaction_categories WHERE name = 'Penarikan Darurat';

INSERT INTO bank_withdrawal_patterns (pattern_name, description_pattern, amount_range_min, amount_range_max, frequency_pattern, category_id, confidence_score) 
SELECT 
    'Investment Pattern', 
    'investasi|investment|pengembangan', 
    5000000, 
    100000000, 
    'irregular', 
    id, 
    85
FROM transaction_categories WHERE name = 'Penarikan Investasi';

INSERT INTO bank_withdrawal_patterns (pattern_name, description_pattern, amount_range_min, amount_range_max, frequency_pattern, category_id, confidence_score) 
SELECT 
    'Routine Pattern', 
    'rutin|routine|bulanan', 
    1000000, 
    10000000, 
    'monthly', 
    id, 
    80
FROM transaction_categories WHERE name = 'Penarikan Rutin Bulanan';

-- Add comments for documentation
COMMENT ON TABLE bank_withdrawal_patterns IS 'Patterns for automatic classification of bank withdrawal transactions';
COMMENT ON TABLE classification_logs IS 'Logs of automatic transaction classifications and manual overrides';
COMMENT ON COLUMN transaction_categories.withdrawal_type IS 'Type of bank withdrawal (operational, payroll, investment, emergency, routine)';
COMMENT ON COLUMN transaction_categories.auto_classification_rules IS 'JSON rules for automatic transaction classification';
COMMENT ON COLUMN transaction_categories.validation_rules IS 'JSON rules for transaction validation and approval requirements';