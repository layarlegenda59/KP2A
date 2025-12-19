#!/usr/bin/env node

/**
 * SIDARSIH Cloudflare Tunnel Monitor
 * Advanced Health Monitoring and Auto-Restart System
 * 
 * Features:
 * - Real-time health monitoring
 * - Automatic restart on failure
 * - Performance metrics collection
 * - Alert system integration
 * - Web dashboard for status
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const { promisify } = require('util');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.tunnel') });

const execAsync = promisify(exec);

// ========================================
// CONFIGURATION
// ========================================
const CONFIG = {
  // Server Configuration
  port: process.env.MONITOR_PORT || 3003,
  host: '0.0.0.0',
  
  // Monitoring Configuration
  healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000,
  maxRestarts: parseInt(process.env.MAX_RESTARTS) || 5,
  restartWindow: parseInt(process.env.RESTART_WINDOW) || 300000, // 5 minutes
  responseTimeout: parseInt(process.env.RESPONSE_TIMEOUT) || 10000,
  
  // Service Endpoints
  endpoints: {
    tunnel: 'http://localhost:8081/metrics',
    frontend: 'http://localhost:8080',
    backend: 'http://localhost:3001',
    whatsapp: 'http://localhost:3001/health'
  },
  
  // External Endpoints
  external: {
    main: 'https://sidarsih.site',
    admin: 'https://admin.sidarsih.site',
    api: 'https://api.sidarsih.site'
  },
  
  // PM2 Configuration
  pm2: {
    tunnelApp: 'sidarsih-cloudflare-tunnel',
    monitorApp: 'sidarsih-tunnel-monitor',
    metricsApp: 'sidarsih-tunnel-metrics'
  },
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  logDir: process.env.LOG_DIR || path.join(__dirname, '..', 'logs')
};

// ========================================
// LOGGING SYSTEM
// ========================================
class Logger {
  constructor(level = 'info') {
    this.level = level;
    this.levels = { error: 0, warn: 1, info: 2, debug: 3 };
    this.colors = {
      error: '\x1b[31m',
      warn: '\x1b[33m',
      info: '\x1b[36m',
      debug: '\x1b[35m',
      reset: '\x1b[0m'
    };
  }

  log(level, message, data = null) {
    if (this.levels[level] <= this.levels[this.level]) {
      const timestamp = new Date().toISOString();
      const color = this.colors[level] || '';
      const reset = this.colors.reset;
      
      let logMessage = `${color}[${timestamp}] [${level.toUpperCase()}] ${message}${reset}`;
      
      if (data) {
        logMessage += `\n${JSON.stringify(data, null, 2)}`;
      }
      
      console.log(logMessage);
      
      // Write to file
      const logFile = path.join(CONFIG.logDir, 'monitor.log');
      const fileMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n`;
      
      fs.appendFileSync(logFile, fileMessage, { flag: 'a' });
    }
  }

  error(message, data) { this.log('error', message, data); }
  warn(message, data) { this.log('warn', message, data); }
  info(message, data) { this.log('info', message, data); }
  debug(message, data) { this.log('debug', message, data); }
}

const logger = new Logger(CONFIG.logLevel);

// ========================================
// HEALTH MONITOR CLASS
// ========================================
class TunnelMonitor {
  constructor() {
    this.restartCount = 0;
    this.restartWindow = [];
    this.lastHealthCheck = null;
    this.healthStatus = {
      tunnel: { status: 'unknown', lastCheck: null, responseTime: null },
      services: {},
      external: {},
      overall: 'unknown'
    };
    
    this.server = null;
    this.monitorInterval = null;
    
    // Bind methods
    this.handleRequest = this.handleRequest.bind(this);
    this.performHealthCheck = this.performHealthCheck.bind(this);
    this.restartTunnel = this.restartTunnel.bind(this);
  }

  // ========================================
  // HTTP SERVER
  // ========================================
  createServer() {
    this.server = http.createServer(this.handleRequest);
    
    this.server.listen(CONFIG.port, CONFIG.host, () => {
      logger.info(`Tunnel Monitor started on http://${CONFIG.host}:${CONFIG.port}`);
    });

    this.server.on('error', (error) => {
      logger.error('Server error:', error);
    });
  }

  handleRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    switch (pathname) {
      case '/health':
        this.handleHealthEndpoint(req, res);
        break;
      case '/status':
        this.handleStatusEndpoint(req, res);
        break;
      case '/restart':
        this.handleRestartEndpoint(req, res);
        break;
      case '/metrics':
        this.handleMetricsEndpoint(req, res);
        break;
      case '/dashboard':
        this.handleDashboardEndpoint(req, res);
        break;
      default:
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }
  }

  handleHealthEndpoint(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: this.healthStatus.overall,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      tunnel: this.healthStatus.tunnel,
      services: this.healthStatus.services,
      external: this.healthStatus.external
    }));
  }

  handleStatusEndpoint(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      monitor: {
        status: 'running',
        uptime: process.uptime(),
        restartCount: this.restartCount,
        lastHealthCheck: this.lastHealthCheck
      },
      health: this.healthStatus,
      config: {
        healthCheckInterval: CONFIG.healthCheckInterval,
        maxRestarts: CONFIG.maxRestarts,
        endpoints: Object.keys(CONFIG.endpoints).length
      }
    }));
  }

  async handleRestartEndpoint(req, res) {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    try {
      logger.info('Manual restart requested via API');
      await this.restartTunnel('manual');
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        message: 'Tunnel restart initiated',
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      logger.error('Manual restart failed:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: false, 
        error: error.message 
      }));
    }
  }

  handleMetricsEndpoint(req, res) {
    const metrics = {
      tunnel_status: this.healthStatus.tunnel.status === 'healthy' ? 1 : 0,
      tunnel_response_time: this.healthStatus.tunnel.responseTime || 0,
      restart_count: this.restartCount,
      uptime_seconds: process.uptime(),
      services_healthy: Object.values(this.healthStatus.services).filter(s => s.status === 'healthy').length,
      services_total: Object.keys(this.healthStatus.services).length
    };

    let prometheusFormat = '';
    for (const [key, value] of Object.entries(metrics)) {
      prometheusFormat += `sidarsih_tunnel_${key} ${value}\n`;
    }

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(prometheusFormat);
  }

  handleDashboardEndpoint(req, res) {
    const html = this.generateDashboardHTML();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }

  // ========================================
  // HEALTH CHECKING
  // ========================================
  async performHealthCheck() {
    logger.debug('Performing health check...');
    this.lastHealthCheck = new Date().toISOString();

    try {
      // Check tunnel status
      await this.checkTunnelHealth();
      
      // Check local services
      await this.checkServicesHealth();
      
      // Check external endpoints
      await this.checkExternalHealth();
      
      // Update overall status
      this.updateOverallStatus();
      
      logger.debug('Health check completed', { status: this.healthStatus.overall });
      
    } catch (error) {
      logger.error('Health check failed:', error);
      this.healthStatus.overall = 'unhealthy';
    }
  }

  async checkTunnelHealth() {
    const startTime = Date.now();
    
    try {
      const response = await this.makeRequest(CONFIG.endpoints.tunnel, { timeout: CONFIG.responseTimeout });
      const responseTime = Date.now() - startTime;
      
      this.healthStatus.tunnel = {
        status: response.statusCode === 200 ? 'healthy' : 'unhealthy',
        lastCheck: new Date().toISOString(),
        responseTime: responseTime,
        statusCode: response.statusCode
      };
      
      if (response.statusCode !== 200) {
        logger.warn(`Tunnel health check failed: HTTP ${response.statusCode}`);
        await this.handleUnhealthyTunnel();
      }
      
    } catch (error) {
      logger.error('Tunnel health check error:', error.message);
      this.healthStatus.tunnel = {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        responseTime: null,
        error: error.message
      };
      
      await this.handleUnhealthyTunnel();
    }
  }

  async checkServicesHealth() {
    const serviceChecks = Object.entries(CONFIG.endpoints).map(async ([name, url]) => {
      if (name === 'tunnel') return; // Already checked
      
      try {
        const startTime = Date.now();
        const response = await this.makeRequest(url, { timeout: 5000 });
        const responseTime = Date.now() - startTime;
        
        this.healthStatus.services[name] = {
          status: response.statusCode < 400 ? 'healthy' : 'unhealthy',
          lastCheck: new Date().toISOString(),
          responseTime: responseTime,
          statusCode: response.statusCode
        };
        
      } catch (error) {
        this.healthStatus.services[name] = {
          status: 'unhealthy',
          lastCheck: new Date().toISOString(),
          responseTime: null,
          error: error.message
        };
      }
    });

    await Promise.all(serviceChecks.filter(Boolean));
  }

  async checkExternalHealth() {
    const externalChecks = Object.entries(CONFIG.external).map(async ([name, url]) => {
      try {
        const startTime = Date.now();
        const response = await this.makeRequest(url, { timeout: 10000 });
        const responseTime = Date.now() - startTime;
        
        this.healthStatus.external[name] = {
          status: response.statusCode < 400 ? 'healthy' : 'unhealthy',
          lastCheck: new Date().toISOString(),
          responseTime: responseTime,
          statusCode: response.statusCode
        };
        
      } catch (error) {
        this.healthStatus.external[name] = {
          status: 'unhealthy',
          lastCheck: new Date().toISOString(),
          responseTime: null,
          error: error.message
        };
      }
    });

    await Promise.all(externalChecks);
  }

  updateOverallStatus() {
    const tunnelHealthy = this.healthStatus.tunnel.status === 'healthy';
    const servicesHealthy = Object.values(this.healthStatus.services).every(s => s.status === 'healthy');
    
    if (tunnelHealthy && servicesHealthy) {
      this.healthStatus.overall = 'healthy';
    } else if (tunnelHealthy) {
      this.healthStatus.overall = 'degraded';
    } else {
      this.healthStatus.overall = 'unhealthy';
    }
  }

  // ========================================
  // FAILURE HANDLING
  // ========================================
  async handleUnhealthyTunnel() {
    const now = Date.now();
    
    // Clean old restart attempts
    this.restartWindow = this.restartWindow.filter(time => now - time < CONFIG.restartWindow);
    
    // Check if we can restart
    if (this.restartWindow.length >= CONFIG.maxRestarts) {
      logger.error(`Maximum restart attempts (${CONFIG.maxRestarts}) reached within ${CONFIG.restartWindow / 1000}s window`);
      return;
    }
    
    logger.warn('Tunnel is unhealthy, attempting restart...');
    await this.restartTunnel('health_check_failure');
  }

  async restartTunnel(reason = 'unknown') {
    try {
      logger.info(`Restarting tunnel (reason: ${reason})`);
      
      // Record restart attempt
      this.restartWindow.push(Date.now());
      this.restartCount++;
      
      // Restart PM2 process
      const { stdout, stderr } = await execAsync(`pm2 restart ${CONFIG.pm2.tunnelApp}`);
      
      if (stderr && !stderr.includes('successfully')) {
        throw new Error(`PM2 restart failed: ${stderr}`);
      }
      
      logger.info('Tunnel restart completed successfully');
      
      // Wait for tunnel to stabilize
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Perform immediate health check
      await this.performHealthCheck();
      
    } catch (error) {
      logger.error('Tunnel restart failed:', error);
      throw error;
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================
  makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const isHttps = url.startsWith('https');
      const client = isHttps ? https : http;
      const timeout = options.timeout || 5000;
      
      const req = client.get(url, { timeout }, (res) => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.setTimeout(timeout, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  generateDashboardHTML() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SIDARSIH Tunnel Monitor</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .status-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .status-healthy { border-left: 4px solid #27ae60; }
        .status-unhealthy { border-left: 4px solid #e74c3c; }
        .status-degraded { border-left: 4px solid #f39c12; }
        .metric { display: flex; justify-content: space-between; margin: 10px 0; }
        .refresh-btn { background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌐 SIDARSIH Tunnel Monitor</h1>
            <p>Real-time monitoring dashboard for Cloudflare Tunnel</p>
            <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>
        </div>
        
        <div class="status-grid">
            <div class="status-card status-${this.healthStatus.overall}">
                <h3>Overall Status</h3>
                <div class="metric">
                    <span>Status:</span>
                    <strong>${this.healthStatus.overall.toUpperCase()}</strong>
                </div>
                <div class="metric">
                    <span>Last Check:</span>
                    <span>${this.lastHealthCheck || 'Never'}</span>
                </div>
                <div class="metric">
                    <span>Restart Count:</span>
                    <span>${this.restartCount}</span>
                </div>
            </div>
            
            <div class="status-card status-${this.healthStatus.tunnel.status}">
                <h3>Tunnel Status</h3>
                <div class="metric">
                    <span>Status:</span>
                    <strong>${this.healthStatus.tunnel.status?.toUpperCase() || 'UNKNOWN'}</strong>
                </div>
                <div class="metric">
                    <span>Response Time:</span>
                    <span>${this.healthStatus.tunnel.responseTime || 'N/A'}ms</span>
                </div>
                <div class="metric">
                    <span>Last Check:</span>
                    <span>${this.healthStatus.tunnel.lastCheck || 'Never'}</span>
                </div>
            </div>
        </div>
        
        <div style="margin-top: 20px; text-align: center; color: #7f8c8d;">
            <p>Monitor uptime: ${Math.floor(process.uptime())} seconds</p>
        </div>
    </div>
    
    <script>
        // Auto-refresh every 30 seconds
        setTimeout(() => location.reload(), 30000);
    </script>
</body>
</html>`;
  }

  // ========================================
  // LIFECYCLE METHODS
  // ========================================
  start() {
    logger.info('Starting Tunnel Monitor...');
    
    // Create HTTP server
    this.createServer();
    
    // Start health monitoring
    this.monitorInterval = setInterval(this.performHealthCheck, CONFIG.healthCheckInterval);
    
    // Perform initial health check
    setTimeout(this.performHealthCheck, 5000);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
    
    logger.info('Tunnel Monitor started successfully');
  }

  stop() {
    logger.info('Stopping Tunnel Monitor...');
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
    
    if (this.server) {
      this.server.close();
    }
    
    logger.info('Tunnel Monitor stopped');
    process.exit(0);
  }
}

// ========================================
// MAIN EXECUTION
// ========================================
if (require.main === module) {
  // Ensure log directory exists
  if (!fs.existsSync(CONFIG.logDir)) {
    fs.mkdirSync(CONFIG.logDir, { recursive: true });
  }
  
  const monitor = new TunnelMonitor();
  monitor.start();
}

module.exports = TunnelMonitor;