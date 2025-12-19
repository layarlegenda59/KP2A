-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for members table
CREATE POLICY "Allow authenticated users to view members" ON public.members
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert members" ON public.members
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update members" ON public.members
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete members" ON public.members
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create RLS policies for dues table
CREATE POLICY "Allow authenticated users to view dues" ON public.dues
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert dues" ON public.dues
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update dues" ON public.dues
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete dues" ON public.dues
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create RLS policies for loans table
CREATE POLICY "Allow authenticated users to view loans" ON public.loans
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert loans" ON public.loans
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update loans" ON public.loans
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete loans" ON public.loans
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create RLS policies for loan_payments table
CREATE POLICY "Allow authenticated users to view loan_payments" ON public.loan_payments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert loan_payments" ON public.loan_payments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update loan_payments" ON public.loan_payments
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete loan_payments" ON public.loan_payments
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create RLS policies for expenses table
CREATE POLICY "Allow authenticated users to view expenses" ON public.expenses
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert expenses" ON public.expenses
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update expenses" ON public.expenses
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete expenses" ON public.expenses
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create RLS policies for users table
CREATE POLICY "Allow users to view their own data" ON public.users
    FOR SELECT USING (auth.uid() = id OR auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert users" ON public.users
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow users to update their own data" ON public.users
    FOR UPDATE USING (auth.uid() = id OR auth.role() = 'authenticated');

-- Create WhatsApp bot configuration tables
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'inactive',
    welcome_message TEXT NOT NULL DEFAULT 'Selamat datang di KP2A Cimahi!',
    phone_number TEXT,
    auto_reply BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on WhatsApp tables
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for WhatsApp tables
CREATE POLICY "Allow authenticated users to manage whatsapp_templates" ON public.whatsapp_templates
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage whatsapp_config" ON public.whatsapp_config
    FOR ALL USING (auth.role() = 'authenticated');

-- Create triggers for WhatsApp tables
CREATE TRIGGER update_whatsapp_templates_updated_at BEFORE UPDATE ON public.whatsapp_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_config_updated_at BEFORE UPDATE ON public.whatsapp_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default WhatsApp configuration
INSERT INTO public.whatsapp_config (status, welcome_message, auto_reply) 
VALUES ('inactive', 'Selamat datang di KP2A Cimahi! Silakan ketik "help" untuk melihat menu yang tersedia.', false)
ON CONFLICT DO NOTHING;

-- Insert sample WhatsApp templates
INSERT INTO public.whatsapp_templates (name, content) VALUES 
('welcome', 'Selamat datang di KP2A Cimahi! Silakan ketik "help" untuk melihat menu yang tersedia.'),
('help', 'Menu yang tersedia:\n1. info - Informasi organisasi\n2. saldo - Cek saldo iuran\n3. pinjaman - Info pinjaman\n4. kontak - Hubungi admin'),
('info', 'KP2A Cimahi adalah organisasi yang melayani kebutuhan finansial anggota dengan berbagai produk simpan pinjam.'),
('kontak', 'Untuk informasi lebih lanjut, hubungi admin di nomor: 0812-3456-7890')
ON CONFLICT DO NOTHING;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Create a function to handle user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, role)
    VALUES (NEW.id, NEW.email, 'anggota');
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();