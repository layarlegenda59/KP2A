const { createClient } = require('@supabase/supabase-js');

// Set environment variables
process.env.VITE_SUPABASE_URL = 'https://pudchoeqhzawgsqkdqeg.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGNob2VxaHphd2dzcWtkcWVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MTE2MTksImV4cCI6MjA3MDE4NzYxOX0.4HSc2lao2BQBQoZAsS9ZG5AY9z5AVsq1rbPRalj67Ho';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function runMigration() {
  try {
    console.log('Testing connection to Supabase...');
    
    // Test connection by querying loans table
    const { data, error } = await supabase
      .from('loans')
      .select('status')
      .limit(1);
    
    if (error) {
      console.error('Connection test failed:', error);
      return;
    }
    
    console.log('Connection successful!');
    console.log('Current constraint allows:', ['aktif', 'lunas', 'pending', 'ditolak']);
    console.log('Need to add: belum_lunas');
    
    console.log('\n=== MANUAL MIGRATION REQUIRED ===');
    console.log('Please run the following SQL in your Supabase SQL Editor:');
    console.log('\n-- Drop existing constraint');
    console.log('ALTER TABLE public.loans DROP CONSTRAINT IF EXISTS loans_status_check;');
    console.log('\n-- Add new constraint with belum_lunas');
    console.log(`ALTER TABLE public.loans ADD CONSTRAINT loans_status_check `);
    console.log(`    CHECK (status IN ('aktif', 'lunas', 'pending', 'ditolak', 'belum_lunas'));`);
    console.log('\n-- Add comment for documentation');
    console.log(`COMMENT ON COLUMN public.loans.status IS 'Status pinjaman: aktif, lunas, pending, ditolak, belum_lunas';`);
    console.log('\n=== END MIGRATION ===\n');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

runMigration();