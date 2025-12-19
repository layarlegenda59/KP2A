-- Enhanced Reports Integration Migration
-- This migration creates the enhanced reports functionality with transaction integration

-- First, enhance the financial_reports table with new columns
ALTER TABLE financial_reports ADD COLUMN IF NOT EXISTS report_data JSONB;
ALTER TABLE financial_reports ADD COLUMN IF NOT EXISTS data_source VARCHAR(50) DEFAULT 'legacy';
ALTER TABLE financial_reports ADD COLUMN IF NOT EXISTS transaction_count INTEGER DEFAULT 0;
ALTER TABLE financial_reports ADD COLUMN IF NOT EXISTS category_breakdown JSONB;
ALTER TABLE financial_reports ADD COLUMN IF NOT EXISTS payment_method_breakdown JSONB;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_financial_reports_data_source ON financial_reports(data_source);
CREATE INDEX IF NOT EXISTS idx_financial_reports_report_data ON financial_reports USING GIN(report_data);
CREATE INDEX IF NOT EXISTS idx_transactions_date_type ON transactions(transaction_date, transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_status_date ON transactions(status, transaction_date);
CREATE INDEX IF NOT EXISTS idx_financial_reports_periode ON financial_reports(periode_start, periode_end);
CREATE INDEX IF NOT EXISTS idx_financial_reports_type ON financial_reports(tipe_laporan);

-- Create view for report analytics
CREATE OR REPLACE VIEW report_analytics AS
SELECT 
    DATE_TRUNC('month', t.transaction_date) as month,
    t.transaction_type,
    tc.name as category_name,
    pm.name as payment_method_name,
    SUM(t.amount) as total_amount,
    COUNT(t.id) as transaction_count,
    AVG(t.amount) as average_amount
FROM transactions t
JOIN transaction_categories tc ON t.category_id = tc.id
JOIN payment_methods pm ON t.payment_method_id = pm.id
WHERE t.status = 'approved'
GROUP BY DATE_TRUNC('month', t.transaction_date), t.transaction_type, tc.name, pm.name;

-- Function to generate comprehensive report data from transactions
CREATE OR REPLACE FUNCTION generate_transaction_report(
    start_date DATE,
    end_date DATE,
    report_type VARCHAR(20) DEFAULT 'bulanan',
    category_filters UUID[] DEFAULT NULL,
    payment_method_filters UUID[] DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    total_income DECIMAL(15,2) := 0;
    total_expense DECIMAL(15,2) := 0;
    transaction_count INTEGER := 0;
    category_data JSON;
    payment_method_data JSON;
    trend_data JSON;
BEGIN
    -- Calculate total income and expenses
    SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0),
        COUNT(*)
    INTO total_income, total_expense, transaction_count
    FROM transactions t
    WHERE t.transaction_date BETWEEN start_date AND end_date
        AND t.status = 'approved'
        AND (category_filters IS NULL OR t.category_id = ANY(category_filters))
        AND (payment_method_filters IS NULL OR t.payment_method_id = ANY(payment_method_filters));
    
    -- Category breakdown
    SELECT json_agg(
        json_build_object(
            'category_id', tc.id,
            'category_name', tc.name,
            'category_type', tc.type,
            'color_code', tc.color_code,
            'income_amount', COALESCE(SUM(CASE WHEN t.transaction_type = 'income' THEN t.amount ELSE 0 END), 0),
            'expense_amount', COALESCE(SUM(CASE WHEN t.transaction_type = 'expense' THEN t.amount ELSE 0 END), 0),
            'total_amount', COALESCE(SUM(t.amount), 0),
            'transaction_count', COUNT(t.id)
        )
    )
    INTO category_data
    FROM transaction_categories tc
    LEFT JOIN transactions t ON tc.id = t.category_id 
        AND t.transaction_date BETWEEN start_date AND end_date
        AND t.status = 'approved'
        AND (category_filters IS NULL OR t.category_id = ANY(category_filters))
        AND (payment_method_filters IS NULL OR t.payment_method_id = ANY(payment_method_filters))
    WHERE tc.is_active = true
    GROUP BY tc.id, tc.name, tc.type, tc.color_code
    HAVING COUNT(t.id) > 0;
    
    -- Payment method breakdown
    SELECT json_agg(
        json_build_object(
            'payment_method_id', pm.id,
            'payment_method_name', pm.name,
            'payment_method_type', pm.type,
            'income_amount', COALESCE(SUM(CASE WHEN t.transaction_type = 'income' THEN t.amount ELSE 0 END), 0),
            'expense_amount', COALESCE(SUM(CASE WHEN t.transaction_type = 'expense' THEN t.amount ELSE 0 END), 0),
            'total_amount', COALESCE(SUM(t.amount), 0),
            'transaction_count', COUNT(t.id)
        )
    )
    INTO payment_method_data
    FROM payment_methods pm
    LEFT JOIN transactions t ON pm.id = t.payment_method_id 
        AND t.transaction_date BETWEEN start_date AND end_date
        AND t.status = 'approved'
        AND (category_filters IS NULL OR t.category_id = ANY(category_filters))
        AND (payment_method_filters IS NULL OR t.payment_method_id = ANY(payment_method_filters))
    WHERE pm.is_active = true
    GROUP BY pm.id, pm.name, pm.type
    HAVING COUNT(t.id) > 0;
    
    -- Trend data (breakdown by period based on report_type)
    WITH trend_periods AS (
        SELECT 
            CASE 
                WHEN report_type = 'tahunan' THEN DATE_TRUNC('month', t.transaction_date)
                WHEN report_type = 'triwulan' THEN DATE_TRUNC('week', t.transaction_date)
                ELSE DATE_TRUNC('day', t.transaction_date)
            END as period,
            SUM(CASE WHEN t.transaction_type = 'income' THEN t.amount ELSE 0 END) as period_income,
            SUM(CASE WHEN t.transaction_type = 'expense' THEN t.amount ELSE 0 END) as period_expense,
            COUNT(t.id) as period_count
        FROM transactions t
        WHERE t.transaction_date BETWEEN start_date AND end_date
            AND t.status = 'approved'
            AND (category_filters IS NULL OR t.category_id = ANY(category_filters))
            AND (payment_method_filters IS NULL OR t.payment_method_id = ANY(payment_method_filters))
        GROUP BY period
        ORDER BY period
    )
    SELECT json_agg(
        json_build_object(
            'period', period,
            'income', period_income,
            'expense', period_expense,
            'net', period_income - period_expense,
            'transaction_count', period_count
        )
    )
    INTO trend_data
    FROM trend_periods;
    
    -- Build final result
    result := json_build_object(
        'summary', json_build_object(
            'total_pemasukan', total_income,
            'total_pengeluaran', total_expense,
            'saldo_akhir', total_income - total_expense,
            'transaction_count', transaction_count,
            'periode_start', start_date,
            'periode_end', end_date,
            'report_type', report_type
        ),
        'category_breakdown', COALESCE(category_data, '[]'::json),
        'payment_method_breakdown', COALESCE(payment_method_data, '[]'::json),
        'trend_data', COALESCE(trend_data, '[]'::json),
        'generated_at', NOW(),
        'data_source', 'transactions_table'
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies for enhanced financial_reports
DROP POLICY IF EXISTS "financial_reports_enhanced_select" ON financial_reports;
CREATE POLICY "financial_reports_enhanced_select" ON financial_reports
    FOR SELECT USING (
        auth.role() = 'authenticated' OR 
        auth.role() = 'anon'
    );

DROP POLICY IF EXISTS "financial_reports_enhanced_insert" ON financial_reports;
CREATE POLICY "financial_reports_enhanced_insert" ON financial_reports
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
    );

DROP POLICY IF EXISTS "financial_reports_enhanced_update" ON financial_reports;
CREATE POLICY "financial_reports_enhanced_update" ON financial_reports
    FOR UPDATE USING (
        auth.role() = 'authenticated'
    );

-- Grant permissions
GRANT SELECT ON report_analytics TO authenticated;
GRANT SELECT ON report_analytics TO anon;
GRANT EXECUTE ON FUNCTION generate_transaction_report TO authenticated;
GRANT EXECUTE ON FUNCTION generate_transaction_report TO anon;

-- Grant permissions on enhanced financial_reports table
GRANT SELECT, INSERT, UPDATE ON financial_reports TO authenticated;
GRANT SELECT ON financial_reports TO anon;

-- Comment for documentation
COMMENT ON FUNCTION generate_transaction_report IS 'Generate comprehensive financial report data from transactions table with category and payment method breakdowns';
COMMENT ON VIEW report_analytics IS 'Aggregated view of transaction analytics by month, category, and payment method';