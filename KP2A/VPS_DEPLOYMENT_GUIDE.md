# 🚀 Panduan Deployment KP2A ke VPS

Panduan lengkap untuk menjalankan aplikasi KP2A (Sistem Aplikasi Dana Forum Air Bersih) di VPS setelah git clone.

## 📋 Prerequisites

### Sistem Requirements
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **RAM**: Minimum 2GB (Recommended 4GB+)
- **Storage**: Minimum 10GB free space
- **Network**: Port 80, 443, 3001, 5173 terbuka

### Software Requirements
- Node.js 18+ dan npm
- Git
- PM2 (Process Manager)
- Nginx (untuk reverse proxy)
- SSL Certificate (optional tapi recommended)

---

## 🛠️ Step 1: Persiapan Server

### 1.1 Update System
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### 1.2 Install Node.js dan npm
```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 1.3 Install PM2 Global
```bash
sudo npm install -g pm2
```

### 1.4 Install Git (jika belum ada)
```bash
sudo apt install git -y
```

---

## 📥 Step 2: Clone Repository

```bash
# Clone repository
git clone https://github.com/your-username/KP2A.git
cd KP2A

# Verify struktur folder
ls -la
```

---

## 🔧 Step 3: Install Dependencies

### 3.1 Install Frontend Dependencies
```bash
# Di root directory
npm install
```

### 3.2 Install Backend Dependencies
```bash
# Masuk ke folder backend
cd whatsapp-backend
npm install
cd ..
```

---

## ⚙️ Step 4: Konfigurasi Environment Variables

### 4.1 Setup Frontend Environment
```bash
# Buat file .env di root directory
cp .env.example .env

# Edit file .env
nano .env
```

**Isi file `.env` untuk frontend:**
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Production Configuration
VITE_API_URL=https://your-domain.com/api
VITE_FRONTEND_URL=https://your-domain.com
```

### 4.2 Setup Backend Environment
```bash
# Masuk ke folder backend
cd whatsapp-backend

# Buat file .env
cp .env.example .env

# Edit file .env
nano .env
```

**Isi file `whatsapp-backend/.env`:**
```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Server Configuration
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-domain.com

# WhatsApp Configuration
WHATSAPP_SESSION_PATH=./sessions
WHATSAPP_AUTO_RESTART=true

# Security
JWT_SECRET=your-super-secret-jwt-key
CORS_ORIGIN=https://your-domain.com
```

---

## 🗄️ Step 5: Database Setup

### 5.1 Supabase Migrations (jika ada)
```bash
# Jika menggunakan Supabase CLI
npx supabase db push

# Atau jalankan migrations manual di Supabase Dashboard
```

### 5.2 Seed Data (optional)
```bash
# Jika ada script seeding
npm run seed
```

---

## 🏗️ Step 6: Build Aplikasi

### 6.1 Build Frontend
```bash
# Di root directory
npm run build

# Verify build folder
ls -la dist/
```

---

## 🚀 Step 7: Setup PM2 Process Manager

### 7.1 Buat PM2 Ecosystem File
```bash
# Di root directory
nano ecosystem.config.js
```

**Isi file `ecosystem.config.js`:**
```javascript
module.exports = {
  apps: [
    {
      name: 'kp2a-backend',
      script: './whatsapp-backend/src/app.js',
      cwd: './whatsapp-backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'kp2a-frontend',
      script: 'npx',
      args: 'serve -s dist -l 5173',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true,
      autorestart: true
    }
  ]
};
```

### 7.2 Install serve untuk Frontend
```bash
npm install -g serve
```

### 7.3 Buat Folder Logs
```bash
mkdir -p logs
```

---

## 🎯 Step 8: Jalankan Aplikasi

### 8.1 Start dengan PM2
```bash
# Start semua aplikasi
pm2 start ecosystem.config.js

# Verify status
pm2 status
pm2 logs
```

### 8.2 Setup PM2 Startup
```bash
# Generate startup script
pm2 startup

# Save current process list
pm2 save
```

---

## 🌐 Step 9: Setup Nginx Reverse Proxy

### 9.1 Install Nginx
```bash
sudo apt install nginx -y
```

### 9.2 Konfigurasi Nginx
```bash
sudo nano /etc/nginx/sites-available/kp2a
```

**Isi konfigurasi Nginx:**
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO untuk WhatsApp
    location /socket.io/ {
        proxy_pass http://localhost:3001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 9.3 Enable Site
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/kp2a /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## 🔒 Step 10: Setup SSL (Optional tapi Recommended)

### 10.1 Install Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 10.2 Generate SSL Certificate
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

---

## 📊 Step 11: Monitoring dan Maintenance

### 11.1 PM2 Monitoring Commands
```bash
# Status aplikasi
pm2 status

# Logs real-time
pm2 logs

# Restart aplikasi
pm2 restart all

# Stop aplikasi
pm2 stop all

# Reload aplikasi (zero-downtime)
pm2 reload all
```

### 11.2 System Monitoring
```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
top

# Check network connections
netstat -tulpn | grep :3001
netstat -tulpn | grep :5173
```

---

## 🔧 Troubleshooting

### Common Issues dan Solutions

#### 1. Port sudah digunakan
```bash
# Check port usage
sudo lsof -i :3001
sudo lsof -i :5173

# Kill process jika perlu
sudo kill -9 <PID>
```

#### 2. Permission Issues
```bash
# Fix ownership
sudo chown -R $USER:$USER /path/to/KP2A

# Fix permissions
chmod -R 755 /path/to/KP2A
```

#### 3. Environment Variables tidak terbaca
```bash
# Check environment
pm2 env 0  # untuk app pertama

# Restart dengan environment baru
pm2 restart ecosystem.config.js --update-env
```

#### 4. Supabase Connection Issues
```bash
# Test connection
curl -H "apikey: YOUR_ANON_KEY" https://your-project.supabase.co/rest/v1/

# Check logs
pm2 logs kp2a-backend
```

#### 5. WhatsApp Session Issues
```bash
# Clear sessions
rm -rf whatsapp-backend/sessions/*

# Restart backend
pm2 restart kp2a-backend
```

---

## 🔄 Update Deployment

### Untuk update aplikasi:
```bash
# Pull latest changes
git pull origin main

# Install new dependencies (jika ada)
npm install
cd whatsapp-backend && npm install && cd ..

# Rebuild frontend
npm run build

# Restart aplikasi
pm2 reload all
```

---

## 📝 Quick Commands Summary

```bash
# Clone dan setup
git clone https://github.com/your-username/KP2A.git
cd KP2A
npm install
cd whatsapp-backend && npm install && cd ..

# Configure environment
cp .env.example .env
cp whatsapp-backend/.env.example whatsapp-backend/.env
# Edit kedua file .env

# Build dan start
npm run build
pm2 start ecosystem.config.js
pm2 save

# Setup nginx dan SSL
sudo nginx -t && sudo systemctl restart nginx
sudo certbot --nginx -d your-domain.com
```

---

## 📞 Support

Jika mengalami masalah:
1. Check logs: `pm2 logs`
2. Check status: `pm2 status`
3. Check system resources: `htop` atau `top`
4. Check network: `netstat -tulpn`

---

**🎉 Selamat! Aplikasi KP2A sudah berjalan di VPS Anda!**

Akses aplikasi di: `https://your-domain.com`