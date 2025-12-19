# Production Configuration Guide

## Overview
Aplikasi SIDARSIH telah dikonfigurasi untuk mode production dengan optimasi keamanan, performa, dan stabilitas.

## Environment Files

### 1. Main Environment (.env)
- `VITE_NODE_ENV=production`
- `VITE_DISABLE_DEMO_MODE=true`
- Security settings enabled
- Performance optimizations enabled
- HTTPS configuration active

### 2. Backend Environment (whatsapp-backend/.env)
- `NODE_ENV=production`
- Production logging level (info)
- Security headers configured
- Rate limiting enabled
- Performance optimizations active

### 3. Production Local (.env.production.local)
- Backup production configuration
- Contains all production-specific overrides

## Production Features Enabled

### Security
- ✅ Secure cookies enabled
- ✅ SameSite strict policy
- ✅ Debug mode disabled
- ✅ CORS properly configured
- ✅ Rate limiting active
- ✅ Trusted proxy settings

### Performance
- ✅ Compression enabled
- ✅ PWA support enabled
- ✅ Build optimizations (minification, chunking)
- ✅ Memory limits configured
- ✅ Connection pooling optimized

### Monitoring & Logging
- ✅ Production logging level (info)
- ✅ PM2 cluster mode (2 instances)
- ✅ Health monitoring enabled
- ✅ Auto-restart on failures
- ✅ Memory usage monitoring

## Services Configuration

### Frontend (Vite)
- Build optimizations enabled
- Terser minification
- Manual chunking for better caching
- Source maps disabled for production

### Backend (WhatsApp Service)
- Cluster mode with 2 workers
- Production CORS settings
- Enhanced timeout configurations
- Memory limits enforced

### Cloudflare Tunnel
- HTTPS termination
- SSL/TLS encryption
- CDN caching enabled

## Current Status
- ✅ All services running in production mode
- ✅ HTTPS working correctly
- ✅ No console errors or warnings
- ✅ WhatsApp integration functional
- ✅ Database connections stable

## Deployment Commands

### Start Production Services
```bash
# Start backend with PM2
pm2 start ecosystem.config.js --env production

# Build and serve frontend
npm run build
npm run preview

# Start Cloudflare tunnel
./start-tunnel.sh
```

### Monitor Services
```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs sidarsih-whatsapp-backend

# Monitor resources
pm2 monit
```

## Environment Variables Summary

| Variable | Value | Purpose |
|----------|-------|---------|
| NODE_ENV | production | Runtime environment |
| VITE_NODE_ENV | production | Frontend environment |
| VITE_ENABLE_DEBUG | false | Disable debug features |
| VITE_SECURE_COOKIES | true | Enhanced cookie security |
| LOG_LEVEL | info | Production logging |
| COMPRESSION | true | Enable gzip compression |
| RATE_LIMIT_MAX | 100 | API rate limiting |

## Notes
- All existing functionality preserved
- No service disruption during configuration
- Backward compatibility maintained
- Ready for production deployment