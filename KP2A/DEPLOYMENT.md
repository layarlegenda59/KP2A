# 🚀 Panduan Deployment KP2A Cimahi ke Vercel

## Prasyarat

1. **Akun Vercel** - Daftar di [vercel.com](https://vercel.com)
2. **Akun GitHub** - Repository harus di-push ke GitHub
3. **Supabase Project** - Database sudah setup dan berjalan

## Langkah-langkah Deployment

### 1. Persiapan Repository

```bash
# Pastikan semua perubahan sudah di-commit
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### 2. Setup di Vercel

1. **Login ke Vercel**
   - Kunjungi [vercel.com](https://vercel.com)
   - Login dengan akun GitHub Anda

2. **Import Project**
   - Klik "New Project"
   - Pilih repository "KP2A Cimahi" dari GitHub
   - Klik "Import"

3. **Configure Project**
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)

### 3. Environment Variables

**PENTING**: Tambahkan environment variables berikut di Vercel:

1. Buka **Project Settings** → **Environment Variables**
2. Tambahkan variabel berikut:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**Cara mendapatkan credentials Supabase:**
1. Login ke [supabase.com](https://supabase.com)
2. Buka project Anda
3. Pergi ke **Settings** → **API**
4. Copy **Project URL** dan **anon/public key**

### 4. Deploy

1. Klik **"Deploy"** di Vercel
2. Tunggu proses build selesai (±2-3 menit)
3. Aplikasi akan tersedia di URL yang diberikan Vercel

## Konfigurasi Domain (Opsional)

### Custom Domain
1. Buka **Project Settings** → **Domains**
2. Tambahkan domain custom Anda
3. Update DNS records sesuai instruksi Vercel

### Subdomain Vercel
Secara default, aplikasi akan tersedia di:
```
https://kp2a-cimahi.vercel.app
```

## Troubleshooting

### Build Errors
- Pastikan `npm run build` berjalan tanpa error di local
- Periksa environment variables sudah benar
- Lihat build logs di Vercel dashboard

### Database Connection Issues
- Verifikasi Supabase URL dan API key
- Pastikan RLS policies sudah dikonfigurasi
- Test koneksi database di local terlebih dahulu

### Performance Issues
- Aktifkan Vercel Analytics untuk monitoring
- Gunakan Vercel Edge Functions jika diperlukan
- Optimize images dan assets

## Monitoring & Maintenance

### Auto-Deploy
- Setiap push ke branch `main` akan trigger auto-deploy
- Monitor deployment status di Vercel dashboard

### Logs & Analytics
- **Function Logs**: Lihat runtime errors
- **Analytics**: Monitor performance dan usage
- **Speed Insights**: Optimize loading speed

## Security Checklist

✅ Environment variables tidak di-commit ke repository  
✅ Supabase RLS policies sudah aktif  
✅ API keys menggunakan anon/public key (bukan service key)  
✅ CORS sudah dikonfigurasi di Supabase  
✅ Authentication flow sudah ditest  

## Support

Jika mengalami masalah deployment:
1. Periksa [Vercel Documentation](https://vercel.com/docs)
2. Lihat build logs untuk error details
3. Test aplikasi di local environment
4. Verifikasi Supabase configuration

---

**Status**: ✅ Ready for Production Deployment  
**Last Updated**: January 2025  
**Framework**: React + Vite + TypeScript + Tailwind CSS + Supabase