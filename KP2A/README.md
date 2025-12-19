# SIDARSIH - Sistem Aplikasi Dana Forum Air Bersih

A comprehensive financial reporting system for SIDARSIH (Sistem Aplikasi Dana Forum Air Bersih) built with React, TypeScript, TailwindCSS, and Supabase.

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
   - Copy and paste the entire content of `database-setup.sql` file
   - Click "Run" to execute the script
   - Wait for the success message: "✅ SIDARSIH database setup completed successfully!"
   
   **Alternative:** You can also run the migration files individually:
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
- **Email**: admin@sidarsih.com
- **Password**: admin123

### 🛠️ Troubleshooting

**Connection Issues:**
1. Verify your Supabase URL and API key in `.env`
2. Check browser console for detailed error messages
3. Ensure your Supabase project is active

**Database Issues:**
1. **Missing tables error ("Could not find the table 'public.members'"):**
   - Go to your Supabase dashboard → SQL Editor
   - Copy and paste the entire content of `database-setup.sql`
   - Click "Run" to create all required tables
2. **CSV upload errors ("new row violates row-level security policy"):**
   - Go to your Supabase dashboard → SQL Editor
   - Copy and paste the entire content of `fix-rls-policies.sql`
   - Click "Run" to update RLS policies
3. Check that RLS (Row Level Security) policies are enabled
4. Verify your API key has the correct permissions
5. Ensure your Supabase project is active and not paused

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
- **WhatsApp Bot**: Full WhatsApp integration with whatsapp-web.js

### 📱 WhatsApp Bot Setup

The application now includes a fully functional WhatsApp bot powered by whatsapp-web.js:

#### Starting WhatsApp Services

1. **Start the backend server:**
```bash
cd whatsapp-backend
npm install  # First time only
npm start
```
Backend runs on http://localhost:3001

2. **Start the frontend (in separate terminal):**
```bash
npm run dev
```
Frontend runs on http://localhost:5173

#### Using WhatsApp Bot

1. Navigate to `/whatsapp` page in the application
2. Click "Initialize WhatsApp" button
3. Scan the QR code with your WhatsApp mobile app
4. Wait for connection confirmation
5. The bot is now ready to receive and send messages

#### WhatsApp Features

- **QR Code Authentication**: Secure login via QR scanning
- **Session Persistence**: Maintains connection across restarts
- **Message Management**: Send and receive messages
- **Contact Sync**: Automatic contact synchronization
- **Auto-Reply**: Configurable automatic responses
- **Real-time Updates**: Live message updates via Socket.IO
- **Database Integration**: All messages stored in Supabase

#### WhatsApp API Endpoints

- `GET /api/whatsapp/status` - Check connection status
- `POST /api/whatsapp/initialize` - Initialize WhatsApp client
- `GET /api/whatsapp/qr` - Get current QR code
- `POST /api/whatsapp/send` - Send message
- `GET /api/whatsapp/contacts` - Get contacts list
- `GET /api/whatsapp/messages` - Get message history
- `GET /api/whatsapp/settings` - Get bot settings
- `PUT /api/whatsapp/settings` - Update bot settings
- `POST /api/whatsapp/logout` - Logout and clear session

#### Troubleshooting WhatsApp

- **QR Code not showing**: Restart the backend service
- **Connection lost**: Check session files in `whatsapp-backend/.wwebjs_auth/`
- **Messages not sending**: Verify WhatsApp connection status
- **Database errors**: Check Supabase connection and permissions

For more detailed documentation, see `WHATSAPP_MIGRATION_COMPLETE.md` and the individual component files.