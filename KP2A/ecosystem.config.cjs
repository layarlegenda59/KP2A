module.exports = {
  apps: [
    {
      name: 'sidarsih-frontend',
      script: 'npm',
      args: 'run dev',
      cwd: '/home/dell/KP2A-CIMAHI/KP2A',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 5174
      }
    },
    {
      name: 'sidarsih-mysql-backend',
      script: './src/app.js',
      cwd: '/home/dell/KP2A-CIMAHI/KP2A/mysql-backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3003
      }
    },
    {
      name: 'sidarsih-whatsapp-backend',
      script: './src/app.js',
      cwd: '/home/dell/KP2A-CIMAHI/KP2A/whatsapp-backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        LOG_LEVEL: 'debug'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        LOG_LEVEL: 'info',
        MAX_CONNECTIONS: 100,
        REQUEST_TIMEOUT: 30000,
        KEEP_ALIVE_TIMEOUT: 5000,
        CORS_ORIGIN: 'https://sidarsih.site,https://www.sidarsih.site,https://admin.sidarsih.site',
        TRUST_PROXY: 'true',
        RATE_LIMIT_WINDOW: 900000,
        RATE_LIMIT_MAX: 100,
        COMPRESSION: 'true',
        QR_TIMEOUT: 20000,
        SESSION_TIMEOUT: 300000,
        MAX_RETRY_ATTEMPTS: 3
      },
      // Logging
      log_file: './logs/whatsapp-combined.log',
      out_file: './logs/whatsapp-out.log',
      error_file: './logs/whatsapp-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Performance
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',

      // Health monitoring
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,

      // Environment specific
      node_args: '--max-old-space-size=1024',

      // Auto restart on file changes (development only)
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'sessions'],

      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,

      // Error handling
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ],

  deploy: {
    production: {
      user: 'dell',
      host: 'sidarsih.site',
      ref: 'origin/main',
      repo: 'git@github.com:your-repo/sidarsih.git',
      path: '/home/dell/KP2A-CIMAHI/KP2A',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};