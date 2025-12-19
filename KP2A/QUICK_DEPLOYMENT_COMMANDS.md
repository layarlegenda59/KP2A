# 🚀 Quick Deployment Commands - KP2A ke VPS

Urutan perintah singkat untuk menjalankan aplikasi KP2A setelah git clone ke VPS.

## 📋 Persiapan Awal (One-time Setup)

```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install PM2 dan tools
sudo npm install -g pm2 serve

# 4. Install Nginx
sudo apt install nginx -y
```

## 📥 Clone dan Setup Aplikasi

```bash
# 1. Clone repository
git clone https://github.com/your-username/KP2A.git
cd KP2A

# 2. Install dependencies
npm install
cd whatsapp-backend && npm install && cd ..

# 3. Setup environment files
cp .env.example .env
cp whatsapp-backend/.env.example whatsapp-backend/.env
```

## ⚙️ Konfigurasi Environment

### Edit file `.env` (root directory):
```bash
nano .env
```
```env
VITE_SUPABASE_URL=https://pudchoeqhzawgsqkdqeg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGNob2VxaHphd2dzcWtkcWVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MTE2MTksImV4cCI6MjA3MDE4NzYxOX0.4HSc2lao2BQBQoZAsS9ZG5AY9z5AVsq1rbPRalj67Ho
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGNob2VxaHphd2dzcWtkcWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDYxMTYxOSwiZXhwIjoyMDcwMTg3NjE5fQ.pFNesihgCvVyatpl8QwzR0SgjY6BtrYKoB4V328b_x0
VITE_API_URL=https://your-domain.com/api
VITE_FRONTEND_URL=https://your-domain.com
```

### Edit file `whatsapp-backend/.env`:
```bash
nano whatsapp-backend/.env
```
```env
SUPABASE_URL=https://pudchoeqhzawgsqkdqeg.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGNob2VxaHphd2dzcWtkcWVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MTE2MTksImV4cCI6MjA3MDE4NzYxOX0.4HSc2lao2BQBQoZAsS9ZG5AY9z5AVsq1rbPRalj67Ho
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGNob2VxaHphd2dzcWtkcWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDYxMTYxOSwiZXhwIjoyMDcwMTg3NjE5fQ.pFNesihgCvVyatpl8QwzR0SgjY6BtrYKoB4V328b_x0
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
```

## 🏗️ Build dan Deploy

```bash
# 1. Build frontend
npm run build

# 2. Buat folder logs
mkdir -p logs

# 3. Start dengan PM2
pm2 start ecosystem.config.js

# 4. Save PM2 configuration
pm2 save
pm2 startup
```

## 🌐 Setup Nginx

```bash
# 1. Buat konfigurasi Nginx
sudo nano /etc/nginx/sites-available/kp2a
```

**Isi konfigurasi:**
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

```bash
# 2. Enable site
sudo ln -s /etc/nginx/sites-available/kp2a /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## 🔒 Setup SSL (Optional)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Generate SSL
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## 📊 Monitoring Commands

```bash
# Check status
pm2 status

# View logs
pm2 logs

# Restart aplikasi
pm2 restart all

# Update aplikasi
git pull origin main
npm run build
pm2 reload all
```

## 🔧 Troubleshooting

```bash
# Check ports
sudo lsof -i :3001
sudo lsof -i :5173

# Check logs
pm2 logs kp2a-backend
pm2 logs kp2a-frontend

# Restart services
pm2 restart all
sudo systemctl restart nginx
```

---

## 📝 Complete Command Sequence

**Copy-paste ready commands:**

```bash
# === PERSIAPAN ===
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2 serve
sudo apt install nginx -y

# === CLONE & SETUP ===
git clone https://github.com/your-username/KP2A.git
cd KP2A
npm install
cd whatsapp-backend && npm install && cd ..

# === ENVIRONMENT ===
cp .env.example .env
cp whatsapp-backend/.env.example whatsapp-backend/.env
# Edit kedua file .env dengan kredensial Supabase

# === BUILD & DEPLOY ===
npm run build
mkdir -p logs
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# === NGINX ===
sudo nano /etc/nginx/sites-available/kp2a
# Paste konfigurasi nginx
sudo ln -s /etc/nginx/sites-available/kp2a /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# === SSL (Optional) ===
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

**🎉 Aplikasi siap diakses di: https://your-domain.com**