-- =============================================
-- CREATE NOTIFICATIONS TABLE
-- =============================================

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK (type IN ('info', 'success', 'warning', 'error')) DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    action_url TEXT,
    action_label TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can only see their own notifications" ON public.notifications
    FOR ALL USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON public.notifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.notifications TO anon, authenticated;

-- Insert sample notifications for testing
INSERT INTO public.notifications (user_id, title, message, type, action_url, action_label) 
SELECT 
    u.id,
    'Selamat Datang di KP2A Cimahi',
    'Terima kasih telah bergabung dengan sistem KP2A Cimahi. Silakan lengkapi profil Anda.',
    'info',
    '/profile',
    'Lengkapi Profil'
FROM public.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.notifications n 
    WHERE n.user_id = u.id AND n.title = 'Selamat Datang di KP2A Cimahi'
);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Notifications table created successfully!';
    RAISE NOTICE '📬 Sample notifications inserted';
    RAISE NOTICE '🔒 Row Level Security enabled';
END $$;