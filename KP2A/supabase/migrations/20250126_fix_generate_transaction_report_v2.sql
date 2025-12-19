-- Fix for generate_transaction_report function v2
-- This fixes the ambiguous column reference issue

DROP FUNCTION IF EXISTS generate_transaction_report(DATE, DATE, VARCHAR, UUID[], UUID[]);

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
    total_transaction_count INTEGER := 0;
    category_data JSON;
    payment_method_data JSON;
    trend_data JSON;
BEGIN
    -- Calculate total income and expenses
    SELECT 
        COALESCE(SUM(CASE WHEN t.transaction_type = 'income' THEN t.amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN t.transaction_type = 'expense' THEN t.amount ELSE 0 END), 0),
        COUNT(*)
    INTO total_income, total_expense, total_transaction_count
    FROM transactions t
    WHERE t.transaction_date BETWEEN start_date AND end_date
        AND t.status = 'approved'
        AND (category_filters IS NULL OR t.category_id = ANY(category_filters))
        AND (payment_method_filters IS NULL OR t.payment_method_id = ANY(payment_method_filters));
    
    -- Category breakdown
    WITH category_stats AS (
        SELECT 
            tc.id as cat_id,
            tc.name as cat_name,
            tc.type as cat_type,
            tc.color_code as cat_color,
            COALESCE(SUM(CASE WHEN t.transaction_type = 'income' THEN t.amount ELSE 0 END), 0) as cat_income,
            COALESCE(SUM(CASE WHEN t.transaction_type = 'expense' THEN t.amount ELSE 0 END), 0) as cat_expense,
            COALESCE(SUM(t.amount), 0) as cat_total,
            COUNT(t.id) as cat_count
        FROM transaction_categories tc
        LEFT JOIN transactions t ON tc.id = t.category_id 
            AND t.transaction_date BETWEEN start_date AND end_date
            AND t.status = 'approved'
            AND (category_filters IS NULL OR t.category_id = ANY(category_filters))
            AND (payment_method_filters IS NULL OR t.payment_method_id = ANY(payment_method_filters))
        WHERE tc.is_active = true
        GROUP BY tc.id, tc.name, tc.type, tc.color_code
        HAVING COUNT(t.id) > 0
    )
    SELECT json_agg(
        json_build_object(
            'category_id', cat_id,
            'category_name', cat_name,
            'category_type', cat_type,
            'color_code', cat_color,
            'income_amount', cat_income,
            'expense_amount', cat_expense,
            'total_amount', cat_total,
            'transaction_count', cat_count
        )
    )
    INTO category_data
    FROM category_stats;
    
    -- Payment method breakdown
    WITH payment_method_stats AS (
        SELECT 
            pm.id as pm_id,
            pm.name as pm_name,
            pm.type as pm_type,
            COALESCE(SUM(CASE WHEN t.transaction_type = 'income' THEN t.amount ELSE 0 END), 0) as pm_income,
            COALESCE(SUM(CASE WHEN t.transaction_type = 'expense' THEN t.amount ELSE 0 END), 0) as pm_expense,
            COALESCE(SUM(t.amount), 0) as pm_total,
            COUNT(t.id) as pm_count
        FROM payment_methods pm
        LEFT JOIN transactions t ON pm.id = t.payment_method_id 
            AND t.transaction_date BETWEEN start_date AND end_date
            AND t.status = 'approved'
            AND (category_filters IS NULL OR t.category_id = ANY(category_filters))
            AND (payment_method_filters IS NULL OR t.payment_method_id = ANY(payment_method_filters))
        WHERE pm.is_active = true
        GROUP BY pm.id, pm.name, pm.type
        HAVING COUNT(t.id) > 0
    )
    SELECT json_agg(
        json_build_object(
            'payment_method_id', pm_id,
            'payment_method_name', pm_name,
            'payment_method_type', pm_type,
            'income_amount', pm_income,
            'expense_amount', pm_expense,
            'total_amount', pm_total,
            'transaction_count', pm_count
        )
    )
    INTO payment_method_data
    FROM payment_method_stats;
    
    -- Trend data (breakdown by period based on report_type)
    WITH trend_periods AS (
        SELECT 
            CASE 
                WHEN report_type = 'tahunan' THEN DATE_TRUNC('month', t.transaction_date)
                WHEN report_type = 'triwulan' THEN DATE_TRUNC('week', t.transaction_date)
                ELSE DATE_TRUNC('day', t.transaction_date)
            END as trend_period,
            SUM(CASE WHEN t.transaction_type = 'income' THEN t.amount ELSE 0 END) as trend_income,
            SUM(CASE WHEN t.transaction_type = 'expense' THEN t.amount ELSE 0 END) as trend_expense,
            COUNT(t.id) as trend_count
        FROM transactions t
        WHERE t.transaction_date BETWEEN start_date AND end_date
            AND t.status = 'approved'
            AND (category_filters IS NULL OR t.category_id = ANY(category_filters))
            AND (payment_method_filters IS NULL OR t.payment_method_id = ANY(payment_method_filters))
        GROUP BY trend_period
        ORDER BY trend_period
    )
    SELECT json_agg(
        json_build_object(
            'period', trend_period,
            'income', trend_income,
            'expense', trend_expense,
            'net', trend_income - trend_expense,
            'transaction_count', trend_count
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
            'transaction_count', total_transaction_count,
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION generate_transaction_report TO authenticated;
GRANT EXECUTE ON FUNCTION generate_transaction_report TO anon;

-- Comment for documentation
COMMENT ON FUNCTION generate_transaction_report IS 'Generate comprehensive financial report data from transactions table with category and payment method breakdowns';