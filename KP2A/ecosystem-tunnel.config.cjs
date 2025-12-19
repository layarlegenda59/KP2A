/**
 * PM2 Ecosystem Configuration for SIDARSIH Cloudflare Tunnel
 * Optimized for Proxmox Server Environment
 * 
 * Features:
 * - Automatic restart on failure
 * - Memory monitoring and restart
 * - Comprehensive logging
 * - Health monitoring
 * - Process isolation
 */

const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env.tunnel') });

// Ensure required directories exist
const ensureDirectories = () => {
  const dirs = [
    './logs',
    './pids',
    './scripts'
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

ensureDirectories();

module.exports = {
  apps: [
    {
      // ========================================
      // MAIN TUNNEL SERVICE
      // ========================================
      name: 'sidarsih-cloudflare-tunnel',
      script: '/home/dell/bin/cloudflared',
      args: [
        'tunnel',
        '--config', '/home/dell/KP2A-CIMAHI/KP2A/cloudflared-config-proxmox.yml',
        'run'
      ],
      cwd: '/home/dell/KP2A-CIMAHI/KP2A',
      instances: 1,
      exec_mode: 'fork',
      
      // Environment Variables
      env: {
        NODE_ENV: 'production',
        TUNNEL_TOKEN: process.env.TUNNEL_TOKEN || '',
        LOG_LEVEL: 'info',
        TUNNEL_ID: 'e4cee886-4f46-4676-a344-7ea2cb86e4eb',
        DOMAIN: 'sidarsih.site'
      },
      
      // Logging Configuration
      log_file: './logs/tunnel-combined.log',
      out_file: './logs/tunnel-out.log',
      error_file: './logs/tunnel-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      log_type: 'json',
      
      // Performance & Reliability
      max_memory_restart: '512M',
      restart_delay: 5000,
      max_restarts: 15,
      min_uptime: '30s',
      
      // Monitoring
      watch: false,
      ignore_watch: ['node_modules', 'logs', '*.log', 'pids'],
      
      // Process Management
      kill_timeout: 5000,
      listen_timeout: 8000,
      
      // Auto-restart settings
      autorestart: true,
      exp_backoff_restart_delay: 100,
      
      // Health monitoring
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true
    },
    
    {
      // ========================================
      // TUNNEL HEALTH MONITOR SERVICE
      // ========================================
      name: 'sidarsih-tunnel-monitor',
      script: './scripts/tunnel-monitor.js',
      cwd: '/home/dell/KP2A-CIMAHI/KP2A',
      instances: 1,
      exec_mode: 'fork',
      
      // Environment
      env: {
        NODE_ENV: 'production',
        MONITOR_PORT: '3003',
        HEALTH_CHECK_INTERVAL: '30000',
        LOG_LEVEL: 'info'
      },
      
      // Logging
      log_file: './logs/monitor-combined.log',
      out_file: './logs/monitor-out.log',
      error_file: './logs/monitor-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Performance
      max_memory_restart: '256M',
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Monitoring
      watch: false,
      autorestart: true,
      
      // Dependency - start after tunnel
      wait_ready: true,
      listen_timeout: 5000
    },
    
    {
      // ========================================
      // METRICS COLLECTION SERVICE
      // ========================================
      name: 'sidarsih-tunnel-metrics',
      script: './scripts/metrics-collector.js',
      cwd: '/home/dell/KP2A-CIMAHI/KP2A',
      instances: 1,
      exec_mode: 'fork',
      
      // Environment
      env: {
        NODE_ENV: 'production',
        METRICS_PORT: '3004',
        COLLECTION_INTERVAL: '60000',
        LOG_LEVEL: 'warn'
      },
      
      // Logging
      log_file: './logs/metrics-combined.log',
      out_file: './logs/metrics-out.log',
      error_file: './logs/metrics-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Performance
      max_memory_restart: '128M',
      restart_delay: 2000,
      max_restarts: 5,
      min_uptime: '10s',
      
      // Monitoring
      watch: false,
      autorestart: true
    }
  ],
  
  // ========================================
  // DEPLOYMENT CONFIGURATION
  // ========================================
  deploy: {
    production: {
      user: 'dell',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'git@github.com:sidarsih/tunnel-config.git',
      path: '/home/dell/KP2A-CIMAHI/KP2A',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem-tunnel.config.js --env production',
      'pre-setup': '',
      'ssh_options': 'ForwardAgent=yes'
    }
  },
  
  // ========================================
  // GLOBAL PM2 SETTINGS
  // ========================================
  pmx: {
    enabled: true,
    network: true,
    ports: true,
    
    // Custom metrics
    custom_probes: [
      {
        name: 'Tunnel Status',
        probe: function() {
          const http = require('http');
          return new Promise((resolve) => {
            const req = http.get('http://localhost:8081/metrics', (res) => {
              resolve(res.statusCode === 200 ? 1 : 0);
            });
            req.on('error', () => resolve(0));
            req.setTimeout(5000, () => {
              req.destroy();
              resolve(0);
            });
          });
        }
      },
      {
        name: 'Active Connections',
        probe: function() {
          // Custom logic to count active connections
          return Math.floor(Math.random() * 100); // Placeholder
        }
      }
    ],
    
    // Actions
    actions: [
      {
        action_name: 'restart-tunnel',
        action_type: 'exec',
        action: function(reply) {
          const pm2 = require('pm2');
          pm2.restart('sidarsih-cloudflare-tunnel', (err) => {
            if (err) {
              return reply({ success: false, error: err.message });
            }
            reply({ success: true, message: 'Tunnel restarted successfully' });
          });
        }
      },
      {
        action_name: 'check-health',
        action_type: 'exec',
        action: function(reply) {
          const http = require('http');
          const req = http.get('http://localhost:3003/health', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              reply({ success: true, health: JSON.parse(data) });
            });
          });
          req.on('error', (err) => {
            reply({ success: false, error: err.message });
          });
        }
      }
    ]
  }
};