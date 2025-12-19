-- Financial Transactions Migration
-- This migration creates tables for handling financial transactions via QR code scanning

-- Create financial_transactions table
CREATE TABLE IF NOT EXISTS financial_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id VARCHAR(50) UNIQUE NOT NULL,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
    merchant_id VARCHAR(20),
    merchant_name VARCHAR(255),
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    reference VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    payment_method VARCHAR(20) NOT NULL DEFAULT 'qr_code',
    scanned_by VARCHAR(255),
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    gateway_response JSONB,
    receipt_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create member_payments table
CREATE TABLE IF NOT EXISTS member_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id VARCHAR(50) UNIQUE NOT NULL,
    member_id VARCHAR(50) NOT NULL,
    member_name VARCHAR(255) NOT NULL,
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('dues', 'fine', 'contribution', 'other')),
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    payment_method VARCHAR(20) NOT NULL DEFAULT 'qr_code',
    scanned_by VARCHAR(255),
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    gateway_response JSONB,
    receipt_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payment_analytics table for aggregated data
CREATE TABLE IF NOT EXISTS payment_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('day', 'week', 'month', 'year')),
    total_transactions INTEGER NOT NULL DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    successful_transactions INTEGER NOT NULL DEFAULT 0,
    failed_transactions INTEGER NOT NULL DEFAULT 0,
    average_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    payment_types JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date, period_type)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_financial_transactions_transaction_id ON financial_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_status ON financial_transactions(status);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_scanned_at ON financial_transactions(scanned_at);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_amount ON financial_transactions(amount);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_merchant_id ON financial_transactions(merchant_id);

CREATE INDEX IF NOT EXISTS idx_member_payments_transaction_id ON member_payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_member_payments_member_id ON member_payments(member_id);
CREATE INDEX IF NOT EXISTS idx_member_payments_status ON member_payments(status);
CREATE INDEX IF NOT EXISTS idx_member_payments_payment_type ON member_payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_member_payments_scanned_at ON member_payments(scanned_at);

CREATE INDEX IF NOT EXISTS idx_payment_analytics_date ON payment_analytics(date);
CREATE INDEX IF NOT EXISTS idx_payment_analytics_period_type ON payment_analytics(period_type);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_financial_transactions_updated_at 
    BEFORE UPDATE ON financial_transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_member_payments_updated_at 
    BEFORE UPDATE ON member_payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_analytics_updated_at 
    BEFORE UPDATE ON payment_analytics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for financial_transactions
CREATE POLICY "Allow authenticated users to view financial transactions" ON financial_transactions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert financial transactions" ON financial_transactions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update their own transactions" ON financial_transactions
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create RLS policies for member_payments
CREATE POLICY "Allow authenticated users to view member payments" ON member_payments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert member payments" ON member_payments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update member payments" ON member_payments
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create RLS policies for payment_analytics
CREATE POLICY "Allow authenticated users to view payment analytics" ON payment_analytics
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert payment analytics" ON payment_analytics
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update payment analytics" ON payment_analytics
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON financial_transactions TO anon;
GRANT ALL PRIVILEGES ON financial_transactions TO authenticated;

GRANT SELECT ON member_payments TO anon;
GRANT ALL PRIVILEGES ON member_payments TO authenticated;

GRANT SELECT ON payment_analytics TO anon;
GRANT ALL PRIVILEGES ON payment_analytics TO authenticated;

-- Create function to update payment analytics
CREATE OR REPLACE FUNCTION update_payment_analytics()
RETURNS TRIGGER AS $$
DECLARE
    analytics_date DATE;
    period_types TEXT[] := ARRAY['day', 'week', 'month', 'year'];
    period_type TEXT;
    start_date TIMESTAMP WITH TIME ZONE;
    end_date TIMESTAMP WITH TIME ZONE;
    transaction_count INTEGER;
    total_amount DECIMAL(15,2);
    successful_count INTEGER;
    failed_count INTEGER;
    avg_amount DECIMAL(15,2);
    payment_type_stats JSONB;
BEGIN
    -- Get the date from the transaction
    IF TG_OP = 'INSERT' THEN
        analytics_date := NEW.scanned_at::DATE;
    ELSIF TG_OP = 'UPDATE' THEN
        analytics_date := NEW.scanned_at::DATE;
    END IF;

    -- Update analytics for each period type
    FOREACH period_type IN ARRAY period_types
    LOOP
        -- Calculate date range based on period type
        CASE period_type
            WHEN 'day' THEN
                start_date := analytics_date::TIMESTAMP WITH TIME ZONE;
                end_date := (analytics_date + INTERVAL '1 day')::TIMESTAMP WITH TIME ZONE;
            WHEN 'week' THEN
                start_date := (analytics_date - EXTRACT(DOW FROM analytics_date)::INTEGER * INTERVAL '1 day')::TIMESTAMP WITH TIME ZONE;
                end_date := start_date + INTERVAL '7 days';
            WHEN 'month' THEN
                start_date := DATE_TRUNC('month', analytics_date::TIMESTAMP WITH TIME ZONE);
                end_date := start_date + INTERVAL '1 month';
            WHEN 'year' THEN
                start_date := DATE_TRUNC('year', analytics_date::TIMESTAMP WITH TIME ZONE);
                end_date := start_date + INTERVAL '1 year';
        END CASE;

        -- Calculate statistics for financial transactions
        SELECT 
            COUNT(*),
            COALESCE(SUM(amount), 0),
            COUNT(*) FILTER (WHERE status = 'completed'),
            COUNT(*) FILTER (WHERE status = 'failed'),
            COALESCE(AVG(amount), 0)
        INTO 
            transaction_count,
            total_amount,
            successful_count,
            failed_count,
            avg_amount
        FROM financial_transactions
        WHERE scanned_at >= start_date AND scanned_at < end_date;

        -- Calculate payment type statistics from member_payments
        SELECT COALESCE(
            jsonb_object_agg(
                payment_type,
                jsonb_build_object(
                    'count', count,
                    'amount', amount
                )
            ),
            '{}'::jsonb
        )
        INTO payment_type_stats
        FROM (
            SELECT 
                payment_type,
                COUNT(*) as count,
                SUM(amount) as amount
            FROM member_payments
            WHERE scanned_at >= start_date AND scanned_at < end_date
            GROUP BY payment_type
        ) pt;

        -- Insert or update analytics record
        INSERT INTO payment_analytics (
            date,
            period_type,
            total_transactions,
            total_amount,
            successful_transactions,
            failed_transactions,
            average_amount,
            payment_types
        ) VALUES (
            analytics_date,
            period_type,
            transaction_count,
            total_amount,
            successful_count,
            failed_count,
            avg_amount,
            payment_type_stats
        )
        ON CONFLICT (date, period_type) DO UPDATE SET
            total_transactions = EXCLUDED.total_transactions,
            total_amount = EXCLUDED.total_amount,
            successful_transactions = EXCLUDED.successful_transactions,
            failed_transactions = EXCLUDED.failed_transactions,
            average_amount = EXCLUDED.average_amount,
            payment_types = EXCLUDED.payment_types,
            updated_at = NOW();
    END LOOP;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update analytics
CREATE TRIGGER update_analytics_on_financial_transaction
    AFTER INSERT OR UPDATE ON financial_transactions
    FOR EACH ROW EXECUTE FUNCTION update_payment_analytics();

CREATE TRIGGER update_analytics_on_member_payment
    AFTER INSERT OR UPDATE ON member_payments
    FOR EACH ROW EXECUTE FUNCTION update_payment_analytics();

-- Create function to get transaction summary
CREATE OR REPLACE FUNCTION get_transaction_summary(
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
    total_transactions BIGINT,
    total_amount DECIMAL(15,2),
    successful_transactions BIGINT,
    failed_transactions BIGINT,
    pending_transactions BIGINT,
    average_amount DECIMAL(15,2),
    top_payment_types JSONB
) AS $$
BEGIN
    -- Set default date range if not provided
    IF start_date IS NULL THEN
        start_date := DATE_TRUNC('month', NOW());
    END IF;
    
    IF end_date IS NULL THEN
        end_date := NOW();
    END IF;

    RETURN QUERY
    WITH transaction_stats AS (
        SELECT 
            COUNT(*) as total_count,
            COALESCE(SUM(ft.amount), 0) as total_amt,
            COUNT(*) FILTER (WHERE ft.status = 'completed') as successful_count,
            COUNT(*) FILTER (WHERE ft.status = 'failed') as failed_count,
            COUNT(*) FILTER (WHERE ft.status = 'pending') as pending_count,
            COALESCE(AVG(ft.amount), 0) as avg_amt
        FROM financial_transactions ft
        WHERE ft.scanned_at >= start_date AND ft.scanned_at <= end_date
    ),
    payment_type_stats AS (
        SELECT 
            jsonb_agg(
                jsonb_build_object(
                    'type', mp.payment_type,
                    'count', COUNT(*),
                    'amount', SUM(mp.amount)
                )
                ORDER BY SUM(mp.amount) DESC
            ) as top_types
        FROM member_payments mp
        WHERE mp.scanned_at >= start_date AND mp.scanned_at <= end_date
        GROUP BY mp.payment_type
        LIMIT 5
    )
    SELECT 
        ts.total_count,
        ts.total_amt,
        ts.successful_count,
        ts.failed_count,
        ts.pending_count,
        ts.avg_amt,
        COALESCE(pts.top_types, '[]'::jsonb)
    FROM transaction_stats ts
    CROSS JOIN payment_type_stats pts;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate transaction data
CREATE OR REPLACE FUNCTION validate_transaction_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate amount
    IF NEW.amount <= 0 THEN
        RAISE EXCEPTION 'Transaction amount must be positive';
    END IF;

    -- Validate currency
    IF NEW.currency NOT IN ('IDR', 'USD', 'EUR') THEN
        RAISE EXCEPTION 'Unsupported currency: %', NEW.currency;
    END IF;

    -- Validate transaction ID format
    IF NEW.transaction_id !~ '^[A-Za-z0-9\-_]{10,50}$' THEN
        RAISE EXCEPTION 'Invalid transaction ID format';
    END IF;

    -- Set default values
    IF NEW.scanned_at IS NULL THEN
        NEW.scanned_at := NOW();
    END IF;

    IF NEW.metadata IS NULL THEN
        NEW.metadata := '{}'::jsonb;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create validation triggers
CREATE TRIGGER validate_financial_transaction_data
    BEFORE INSERT OR UPDATE ON financial_transactions
    FOR EACH ROW EXECUTE FUNCTION validate_transaction_data();

CREATE TRIGGER validate_member_payment_data
    BEFORE INSERT OR UPDATE ON member_payments
    FOR EACH ROW EXECUTE FUNCTION validate_transaction_data();

-- Insert sample data for testing (optional)
-- Uncomment the following lines to insert sample data

/*
INSERT INTO financial_transactions (
    transaction_id,
    amount,
    currency,
    merchant_id,
    merchant_name,
    description,
    status,
    scanned_by
) VALUES 
    ('TXN_001_' || EXTRACT(EPOCH FROM NOW()), 50000, 'IDR', 'MERCHANT_001', 'KP2A Cimahi Store', 'Test payment transaction', 'completed', 'admin@kp2a.com'),
    ('TXN_002_' || EXTRACT(EPOCH FROM NOW()), 75000, 'IDR', 'MERCHANT_002', 'KP2A Cimahi Cafe', 'Test payment transaction 2', 'pending', 'admin@kp2a.com');

INSERT INTO member_payments (
    transaction_id,
    member_id,
    member_name,
    payment_type,
    amount,
    description,
    status,
    scanned_by
) VALUES 
    ('MP_001_' || EXTRACT(EPOCH FROM NOW()), 'MEMBER_001', 'John Doe', 'dues', 100000, 'Monthly membership dues', 'completed', 'admin@kp2a.com'),
    ('MP_002_' || EXTRACT(EPOCH FROM NOW()), 'MEMBER_002', 'Jane Smith', 'contribution', 250000, 'Special contribution', 'completed', 'admin@kp2a.com');
*/

-- Create view for transaction reporting
CREATE OR REPLACE VIEW transaction_report AS
SELECT 
    ft.id,
    ft.transaction_id,
    ft.amount,
    ft.currency,
    ft.merchant_name,
    ft.description,
    ft.status,
    ft.payment_method,
    ft.scanned_by,
    ft.scanned_at,
    ft.processed_at,
    'financial' as transaction_type,
    NULL as member_id,
    NULL as member_name,
    NULL as payment_type
FROM financial_transactions ft

UNION ALL

SELECT 
    mp.id,
    mp.transaction_id,
    mp.amount,
    mp.currency,
    mp.member_name as merchant_name,
    mp.description,
    mp.status,
    mp.payment_method,
    mp.scanned_by,
    mp.scanned_at,
    mp.processed_at,
    'member_payment' as transaction_type,
    mp.member_id,
    mp.member_name,
    mp.payment_type
FROM member_payments mp

ORDER BY scanned_at DESC;

-- Grant permissions on the view
GRANT SELECT ON transaction_report TO anon;
GRANT SELECT ON transaction_report TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE financial_transactions IS 'Stores financial transactions processed via QR code scanning';
COMMENT ON TABLE member_payments IS 'Stores member-specific payments processed via QR code scanning';
COMMENT ON TABLE payment_analytics IS 'Stores aggregated payment analytics data for reporting';
COMMENT ON VIEW transaction_report IS 'Unified view of all transactions for reporting purposes';

COMMENT ON COLUMN financial_transactions.transaction_id IS 'Unique identifier for the transaction';
COMMENT ON COLUMN financial_transactions.amount IS 'Transaction amount in the specified currency';
COMMENT ON COLUMN financial_transactions.currency IS 'Currency code (ISO 4217)';
COMMENT ON COLUMN financial_transactions.status IS 'Transaction status: pending, completed, failed, cancelled';
COMMENT ON COLUMN financial_transactions.gateway_response IS 'Response from payment gateway in JSON format';
COMMENT ON COLUMN financial_transactions.metadata IS 'Additional transaction metadata in JSON format';

COMMENT ON COLUMN member_payments.member_id IS 'ID of the member making the payment';
COMMENT ON COLUMN member_payments.payment_type IS 'Type of payment: dues, fine, contribution, other';

-- Create notification function for real-time updates
CREATE OR REPLACE FUNCTION notify_transaction_update()
RETURNS TRIGGER AS $$
DECLARE
    notification_data JSONB;
BEGIN
    -- Prepare notification data
    notification_data := jsonb_build_object(
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'transaction_id', COALESCE(NEW.transaction_id, OLD.transaction_id),
        'status', COALESCE(NEW.status, OLD.status),
        'amount', COALESCE(NEW.amount, OLD.amount),
        'timestamp', NOW()
    );

    -- Send notification
    PERFORM pg_notify('transaction_updates', notification_data::text);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create notification triggers
CREATE TRIGGER notify_financial_transaction_update
    AFTER INSERT OR UPDATE OR DELETE ON financial_transactions
    FOR EACH ROW EXECUTE FUNCTION notify_transaction_update();

CREATE TRIGGER notify_member_payment_update
    AFTER INSERT OR UPDATE OR DELETE ON member_payments
    FOR EACH ROW EXECUTE FUNCTION notify_transaction_update();