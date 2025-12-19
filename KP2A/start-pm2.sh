#!/bin/bash

# Script untuk menjalankan aplikasi SIDARSIH dengan PM2
# Gunakan script ini untuk restart aplikasi setelah reboot

echo "🚀 Starting SIDARSIH Applications with PM2..."

# Pastikan PM2 tersedia
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 not found. Installing PM2..."
    npm install -g pm2
fi

# Pindah ke direktori aplikasi
cd /home/dell/KP2A

# Hentikan semua proses PM2 yang ada (jika ada)
echo "🛑 Stopping existing PM2 processes..."
pm2 delete all 2>/dev/null || true

# Mulai aplikasi backend
echo "🔧 Starting Backend (WhatsApp Service)..."
pm2 start "npm run dev" --name "sidarsih-backend" --cwd /home/dell/KP2A/whatsapp-backend

# Mulai aplikasi frontend
echo "🖥️ Starting Frontend (React/Vite)..."
pm2 start "npm run dev" --name "sidarsih-frontend" --cwd /home/dell/KP2A

# Save konfigurasi PM2
echo "💾 Saving PM2 configuration..."
pm2 save

# Tampilkan status
echo "📊 PM2 Status:"
pm2 status

echo ""
echo "✅ SIDARSIH Applications started successfully!"
echo "🌐 Frontend: http://localhost:5174/"
echo "🔧 Backend: http://localhost:3001/"
echo "🏥 Health Check: http://localhost:3001/health"
echo ""
echo "📋 PM2 Commands:"
echo "  pm2 status          - Lihat status aplikasi"
echo "  pm2 logs            - Lihat logs semua aplikasi"
echo "  pm2 logs backend    - Lihat logs backend saja"
echo "  pm2 logs frontend   - Lihat logs frontend saja"
echo "  pm2 restart all     - Restart semua aplikasi"
echo "  pm2 stop all        - Stop semua aplikasi"
echo "  pm2 delete all      - Hapus semua aplikasi dari PM2"
echo ""