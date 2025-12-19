# 🚀 PM2 Management Guide - SIDARSIH Application

## 📋 Overview
Aplikasi SIDARSIH sekarang berjalan menggunakan PM2 Process Manager dengan konfigurasi auto-restart setelah VPS/Proxmox reboot.

## 🏃‍♂️ Status Aplikasi Saat Ini

### ✅ Aplikasi yang Berjalan:
- **Frontend (React/Vite)**: http://localhost:5174/
- **Backend (WhatsApp Service)**: http://localhost:3001/
- **Health Check**: http://localhost:3001/health

### 📊 PM2 Status:
```bash
pm2 status
```

## 🔧 Perintah PM2 Penting

### 📈 Monitoring
```bash
# Lihat status semua aplikasi
pm2 status

# Lihat logs real-time semua aplikasi
pm2 logs

# Lihat logs backend saja
pm2 logs sidarsih-backend

# Lihat logs frontend saja
pm2 logs sidarsih-frontend

# Monitor resource usage
pm2 monit
```

### 🔄 Management
```bash
# Restart semua aplikasi
pm2 restart all

# Restart aplikasi tertentu
pm2 restart sidarsih-backend
pm2 restart sidarsih-frontend

# Stop semua aplikasi
pm2 stop all

# Stop aplikasi tertentu
pm2 stop sidarsih-backend

# Start aplikasi yang di-stop
pm2 start sidarsih-backend

# Reload aplikasi (zero-downtime)
pm2 reload all
```

### 🗑️ Cleanup
```bash
# Hapus semua aplikasi dari PM2
pm2 delete all

# Hapus aplikasi tertentu
pm2 delete sidarsih-backend

# Clear logs
pm2 flush
```

## 🔄 Auto-Restart Setelah Reboot

### ✅ Konfigurasi yang Sudah Disetup:
1. **Crontab Entry**: `@reboot /home/dell/KP2A/start-pm2.sh`
2. **Auto-start Script**: `/home/dell/KP2A/start-pm2.sh`
3. **PM2 Configuration**: Tersimpan di `~/.pm2/dump.pm2`

### 🔍 Verifikasi Auto-Start:
```bash
# Lihat crontab entry
crontab -l

# Lihat log auto-start setelah reboot
tail -f /home/dell/KP2A/logs/autostart.log
```

## 🛠️ Manual Start/Restart

### 🚀 Start Aplikasi Manual:
```bash
# Jalankan script auto-start
cd /home/dell/KP2A
./start-pm2.sh
```

### 🔧 Start Individual Apps:
```bash
# Backend saja
pm2 start "npm run dev" --name "sidarsih-backend" --cwd /home/dell/KP2A/whatsapp-backend

# Frontend saja
pm2 start "npm run dev" --name "sidarsih-frontend" --cwd /home/dell/KP2A

# Save konfigurasi
pm2 save
```

## 📁 File Konfigurasi

### 📄 File Penting:
- `ecosystem.config.js` - Konfigurasi PM2 (tidak digunakan karena ESM error)
- `start-pm2.sh` - Script untuk start aplikasi
- `setup-autostart.sh` - Script untuk setup auto-start
- `~/.pm2/dump.pm2` - PM2 saved configuration

### 📝 Log Files:
- `/home/dell/KP2A/logs/autostart.log` - Log auto-start setelah reboot
- `~/.pm2/logs/` - PM2 application logs

## 🚨 Troubleshooting

### ❌ Jika Aplikasi Tidak Start Setelah Reboot:
```bash
# 1. Cek crontab
crontab -l

# 2. Cek log auto-start
cat /home/dell/KP2A/logs/autostart.log

# 3. Manual start
cd /home/dell/KP2A
./start-pm2.sh

# 4. Cek PM2 status
pm2 status
```

### 🔧 Jika PM2 Command Not Found:
```bash
# Install PM2 global
npm install -g pm2

# Atau gunakan npx
npx pm2 status
```

### 🔄 Reset Complete PM2:
```bash
# Stop dan hapus semua
pm2 delete all

# Restart dari awal
./start-pm2.sh
```

## 🌐 URL Akses

- **Frontend**: http://localhost:5174/
- **Backend API**: http://localhost:3001/
- **Health Check**: http://localhost:3001/health

## 📞 Support Commands

```bash
# Cek port yang digunakan
netstat -tlnp | grep :5174
netstat -tlnp | grep :3001

# Cek proses Node.js
ps aux | grep node

# Restart PM2 daemon
pm2 kill
pm2 resurrect
```

---

**📝 Note**: Karena tidak ada akses sudo, auto-restart menggunakan crontab user instead of systemd service. Ini tetap efektif untuk auto-start setelah reboot.