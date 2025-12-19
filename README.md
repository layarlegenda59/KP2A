# KP2A Cimahi - Financial Reporting System

A comprehensive financial reporting system for KP2A Cimahi cooperative built with React, TypeScript, TailwindCSS, and Supabase.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Supabase account

### Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Configure Supabase:**
   - Go to your Supabase project: https://pudchoeqhzawgsqkdqeg.supabase.co
   - Navigate to Settings → API
   - Copy your "anon/public" API key
   - Update the `.env` file:

```env
VITE_SUPABASE_URL=https://pudchoeqhzawgsqkdqeg.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
```

3. **Set up database tables:**
   - In your Supabase dashboard, go to SQL Editor
   - Run the migration files in order:
     - `supabase/migrations/20250808003021_precious_flame.sql`
     - `supabase/migrations/20250808003051_icy_wood.sql`

4. **Start the development server:**
```bash
npm run dev
```

### 🔧 Configuration Status

The application will show a status indicator in the header:
- **🟢 Connected**: Supabase is properly configured
- **🟡 Demo Mode**: Running with demo data (Supabase not configured)

### 📝 Demo Credentials

When running in demo mode, use these credentials:
- **Email**: admin@kp2acimahi.com
- **Password**: admin123

### 🛠️ Troubleshooting

**Connection Issues:**
1. Verify your Supabase URL and API key in `.env`
2. Check browser console for detailed error messages
3. Ensure your Supabase project is active

**Database Issues:**
1. Run the migration files in your Supabase SQL Editor
2. Check that RLS (Row Level Security) policies are enabled
3. Verify your API key has the correct permissions

### 🏗️ Project Structure

```
src/
├── components/          # React components
│   ├── Auth/           # Authentication components
│   ├── Dashboard/      # Dashboard components
│   └── Layout/         # Layout components
├── contexts/           # React contexts
├── lib/               # Utilities and configurations
├── types/             # TypeScript type definitions
└── main.tsx           # Application entry point
```

### 🔐 Security Features

- Row Level Security (RLS) enabled on all tables
- Role-based access control (admin, pengurus, anggota)
- Secure authentication with Supabase Auth
- Environment variable protection for sensitive data

### 📊 Features

- **Member Management**: Add, edit, delete member data
- **Dues Tracking**: Monthly mandatory and voluntary contributions
- **Loan Management**: Loan applications and installment tracking
- **Expense Management**: Cooperative expense tracking
- **Financial Reports**: Monthly, quarterly, and annual reports
- **CSV Upload**: Bulk data import functionality
- **SQL Editor**: Advanced database query editor with syntax highlighting
- **WhatsApp Integration**: Ready for chatbot integration

For more detailed documentation, see the individual component files and migration scripts.