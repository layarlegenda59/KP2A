#!/bin/bash

# Script untuk setup auto-start aplikasi SIDARSIH setelah reboot
# Menggunakan crontab karena tidak ada akses sudo

echo "🔧 Setting up auto-start for SIDARSIH applications..."

# Backup crontab yang ada
echo "💾 Backing up existing crontab..."
crontab -l > /home/dell/KP2A/crontab-backup.txt 2>/dev/null || echo "No existing crontab found"

# Buat entry crontab baru
CRON_ENTRY="@reboot /home/dell/KP2A/start-pm2.sh >> /home/dell/KP2A/logs/autostart.log 2>&1"

# Cek apakah entry sudah ada
if crontab -l 2>/dev/null | grep -q "start-pm2.sh"; then
    echo "⚠️ Auto-start entry already exists in crontab"
else
    # Tambahkan entry ke crontab
    echo "➕ Adding auto-start entry to crontab..."
    (crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -
    echo "✅ Auto-start entry added successfully!"
fi

# Tampilkan crontab saat ini
echo ""
echo "📋 Current crontab entries:"
crontab -l

echo ""
echo "✅ Auto-start setup completed!"
echo ""
echo "📝 What happens after reboot:"
echo "  1. System akan otomatis menjalankan start-pm2.sh"
echo "  2. Script akan memulai PM2 dan kedua aplikasi"
echo "  3. Log auto-start tersimpan di /home/dell/KP2A/logs/autostart.log"
echo ""
echo "🔍 Untuk melihat log auto-start:"
echo "  tail -f /home/dell/KP2A/logs/autostart.log"
echo ""
echo "🗑️ Untuk menghapus auto-start:"
echo "  crontab -e  # lalu hapus baris yang mengandung start-pm2.sh"
echo ""