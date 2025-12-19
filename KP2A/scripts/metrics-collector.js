#!/usr/bin/env node

/**
 * SIDARSIH Tunnel Metrics Collector
 * Performance and System Metrics Collection Service
 * 
 * Features:
 * - System performance metrics
 * - Tunnel performance tracking
 * - Resource usage monitoring
 * - Historical data collection
 * - Prometheus-compatible output
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.tunnel') });

const execAsync = promisify(exec);

// ========================================
// CONFIGURATION
// ========================================
const CONFIG = {
  port: process.env.METRICS_PORT || 3004,
  host: '0.0.0.0',
  collectionInterval: parseInt(process.env.COLLECTION_INTERVAL) || 60000,
  retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
  logLevel: process.env.LOG_LEVEL || 'warn',
  logDir: process.env.LOG_DIR || path.join(__dirname, '..', 'logs'),
  
  endpoints: {
    tunnel: 'http://localhost:8081/metrics',
    monitor: 'http://localhost:3003/health'
  }
};

// ========================================
// LOGGING
// ========================================
class Logger {
  constructor(level = 'info') {
    this.level = level;
    this.levels = { error: 0, warn: 1, info: 2, debug: 3 };
  }

  log(level, message, data = null) {
    if (this.levels[level] <= this.levels[this.level]) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
      
      if (data) {
        console.log(JSON.stringify(data, null, 2));
      }
    }
  }

  error(message, data) { this.log('error', message, data); }
  warn(message, data) { this.log('warn', message, data); }
  info(message, data) { this.log('info', message, data); }
  debug(message, data) { this.log('debug', message, data); }
}

const logger = new Logger(CONFIG.logLevel);

// ========================================
// METRICS COLLECTOR CLASS
// ========================================
class MetricsCollector {
  constructor() {
    this.metrics = {
      system: {},
      tunnel: {},
      network: {},
      performance: {},
      historical: []
    };
    
    this.server = null;
    this.collectionInterval = null;
    this.startTime = Date.now();
    
    // Bind methods
    this.handleRequest = this.handleRequest.bind(this);
    this.collectMetrics = this.collectMetrics.bind(this);
  }

  // ========================================
  // HTTP SERVER
  // ========================================
  createServer() {
    this.server = http.createServer(this.handleRequest);
    
    this.server.listen(CONFIG.port, CONFIG.host, () => {
      logger.info(`Metrics Collector started on http://${CONFIG.host}:${CONFIG.port}`);
    });

    this.server.on('error', (error) => {
      logger.error('Metrics server error:', error);
    });
  }

  handleRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    switch (pathname) {
      case '/metrics':
        this.handleMetricsEndpoint(req, res);
        break;
      case '/prometheus':
        this.handlePrometheusEndpoint(req, res);
        break;
      case '/health':
        this.handleHealthEndpoint(req, res);
        break;
      case '/dashboard':
        this.handleDashboardEndpoint(req, res);
        break;
      default:
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }
  }

  handleMetricsEndpoint(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      metrics: this.metrics
    }, null, 2));
  }

  handlePrometheusEndpoint(req, res) {
    const prometheusMetrics = this.formatPrometheusMetrics();
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(prometheusMetrics);
  }

  handleHealthEndpoint(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      uptime: Date.now() - this.startTime,
      lastCollection: this.metrics.system.timestamp || null
    }));
  }

  handleDashboardEndpoint(req, res) {
    const html = this.generateDashboardHTML();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }

  // ========================================
  // METRICS COLLECTION
  // ========================================
  async collectMetrics() {
    try {
      logger.debug('Collecting metrics...');
      
      const timestamp = new Date().toISOString();
      
      // Collect system metrics
      await this.collectSystemMetrics();
      
      // Collect tunnel metrics
      await this.collectTunnelMetrics();
      
      // Collect network metrics
      await this.collectNetworkMetrics();
      
      // Collect performance metrics
      await this.collectPerformanceMetrics();
      
      // Store historical data
      this.storeHistoricalData(timestamp);
      
      // Cleanup old data
      this.cleanupHistoricalData();
      
      logger.debug('Metrics collection completed');
      
    } catch (error) {
      logger.error('Metrics collection failed:', error);
    }
  }

  async collectSystemMetrics() {
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    
    this.metrics.system = {
      timestamp: new Date().toISOString(),
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      uptime: os.uptime(),
      
      // CPU metrics
      cpu: {
        count: cpus.length,
        model: cpus[0]?.model || 'unknown',
        loadAverage: {
          '1min': loadAvg[0],
          '5min': loadAvg[1],
          '15min': loadAvg[2]
        }
      },
      
      // Memory metrics
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        usagePercent: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2)
      },
      
      // Process metrics
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    };
  }

  async collectTunnelMetrics() {
    try {
      // Get tunnel metrics from cloudflared
      const tunnelResponse = await this.makeRequest(CONFIG.endpoints.tunnel);
      
      if (tunnelResponse.statusCode === 200) {
        this.metrics.tunnel = {
          status: 'healthy',
          responseTime: tunnelResponse.responseTime,
          lastCheck: new Date().toISOString()
        };
      } else {
        this.metrics.tunnel = {
          status: 'unhealthy',
          statusCode: tunnelResponse.statusCode,
          lastCheck: new Date().toISOString()
        };
      }
      
      // Get PM2 process information
      try {
        const { stdout } = await execAsync('pm2 jlist');
        const pm2Processes = JSON.parse(stdout);
        
        const tunnelProcess = pm2Processes.find(p => p.name === 'sidarsih-cloudflare-tunnel');
        if (tunnelProcess) {
          this.metrics.tunnel.pm2 = {
            status: tunnelProcess.pm2_env.status,
            restarts: tunnelProcess.pm2_env.restart_time,
            uptime: tunnelProcess.pm2_env.pm_uptime,
            memory: tunnelProcess.monit.memory,
            cpu: tunnelProcess.monit.cpu
          };
        }
      } catch (error) {
        logger.warn('Failed to get PM2 metrics:', error.message);
      }
      
    } catch (error) {
      this.metrics.tunnel = {
        status: 'error',
        error: error.message,
        lastCheck: new Date().toISOString()
      };
    }
  }

  async collectNetworkMetrics() {
    try {
      // Get network interface statistics
      const interfaces = os.networkInterfaces();
      
      this.metrics.network = {
        interfaces: {},
        connections: await this.getNetworkConnections()
      };
      
      for (const [name, addrs] of Object.entries(interfaces)) {
        if (addrs) {
          this.metrics.network.interfaces[name] = addrs.map(addr => ({
            address: addr.address,
            family: addr.family,
            internal: addr.internal
          }));
        }
      }
      
    } catch (error) {
      logger.warn('Failed to collect network metrics:', error.message);
      this.metrics.network = { error: error.message };
    }
  }

  async collectPerformanceMetrics() {
    try {
      // Test endpoint response times
      const endpoints = [
        { name: 'tunnel_metrics', url: CONFIG.endpoints.tunnel },
        { name: 'monitor_health', url: CONFIG.endpoints.monitor },
        { name: 'local_frontend', url: 'http://localhost:8080' },
        { name: 'local_backend', url: 'http://localhost:3001' }
      ];
      
      this.metrics.performance = {
        timestamp: new Date().toISOString(),
        endpoints: {}
      };
      
      for (const endpoint of endpoints) {
        try {
          const startTime = Date.now();
          const response = await this.makeRequest(endpoint.url, { timeout: 5000 });
          const responseTime = Date.now() - startTime;
          
          this.metrics.performance.endpoints[endpoint.name] = {
            responseTime,
            statusCode: response.statusCode,
            status: response.statusCode < 400 ? 'healthy' : 'unhealthy'
          };
        } catch (error) {
          this.metrics.performance.endpoints[endpoint.name] = {
            responseTime: null,
            status: 'error',
            error: error.message
          };
        }
      }
      
    } catch (error) {
      logger.warn('Failed to collect performance metrics:', error.message);
    }
  }

  async getNetworkConnections() {
    try {
      const { stdout } = await execAsync('netstat -tn 2>/dev/null | grep ESTABLISHED | wc -l');
      return {
        established: parseInt(stdout.trim()) || 0
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  storeHistoricalData(timestamp) {
    const dataPoint = {
      timestamp,
      system: {
        cpu: this.metrics.system.cpu?.loadAverage['1min'],
        memory: this.metrics.system.memory?.usagePercent
      },
      tunnel: {
        status: this.metrics.tunnel.status,
        responseTime: this.metrics.tunnel.responseTime
      },
      performance: this.metrics.performance.endpoints
    };
    
    this.metrics.historical.push(dataPoint);
  }

  cleanupHistoricalData() {
    const cutoff = Date.now() - CONFIG.retentionPeriod;
    this.metrics.historical = this.metrics.historical.filter(
      point => new Date(point.timestamp).getTime() > cutoff
    );
  }

  // ========================================
  // UTILITY METHODS
  // ========================================
  makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const isHttps = url.startsWith('https');
      const client = isHttps ? https : http;
      const timeout = options.timeout || 5000;
      
      const req = client.get(url, { timeout }, (res) => {
        const responseTime = Date.now() - startTime;
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          responseTime
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

  formatPrometheusMetrics() {
    let output = '';
    
    // System metrics
    if (this.metrics.system.cpu) {
      output += `sidarsih_system_cpu_load_1min ${this.metrics.system.cpu.loadAverage['1min']}\n`;
      output += `sidarsih_system_cpu_load_5min ${this.metrics.system.cpu.loadAverage['5min']}\n`;
      output += `sidarsih_system_cpu_load_15min ${this.metrics.system.cpu.loadAverage['15min']}\n`;
    }
    
    if (this.metrics.system.memory) {
      output += `sidarsih_system_memory_total ${this.metrics.system.memory.total}\n`;
      output += `sidarsih_system_memory_free ${this.metrics.system.memory.free}\n`;
      output += `sidarsih_system_memory_used ${this.metrics.system.memory.used}\n`;
      output += `sidarsih_system_memory_usage_percent ${this.metrics.system.memory.usagePercent}\n`;
    }
    
    // Tunnel metrics
    if (this.metrics.tunnel.status) {
      output += `sidarsih_tunnel_status ${this.metrics.tunnel.status === 'healthy' ? 1 : 0}\n`;
    }
    
    if (this.metrics.tunnel.responseTime) {
      output += `sidarsih_tunnel_response_time_ms ${this.metrics.tunnel.responseTime}\n`;
    }
    
    // Performance metrics
    if (this.metrics.performance.endpoints) {
      for (const [name, data] of Object.entries(this.metrics.performance.endpoints)) {
        if (data.responseTime) {
          output += `sidarsih_endpoint_response_time_ms{endpoint="${name}"} ${data.responseTime}\n`;
        }
        output += `sidarsih_endpoint_status{endpoint="${name}"} ${data.status === 'healthy' ? 1 : 0}\n`;
      }
    }
    
    // Uptime
    output += `sidarsih_metrics_uptime_seconds ${Math.floor((Date.now() - this.startTime) / 1000)}\n`;
    
    return output;
  }

  generateDashboardHTML() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SIDARSIH Metrics Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: #34495e; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-value { font-size: 2em; font-weight: bold; color: #2c3e50; }
        .metric-label { color: #7f8c8d; margin-bottom: 10px; }
        .status-healthy { color: #27ae60; }
        .status-unhealthy { color: #e74c3c; }
        .refresh-btn { background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 SIDARSIH Metrics Dashboard</h1>
            <p>Real-time system and tunnel performance metrics</p>
            <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>
        </div>
        
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-label">System Memory Usage</div>
                <div class="metric-value">${this.metrics.system.memory?.usagePercent || 'N/A'}%</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-label">CPU Load (1min)</div>
                <div class="metric-value">${this.metrics.system.cpu?.loadAverage['1min']?.toFixed(2) || 'N/A'}</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-label">Tunnel Status</div>
                <div class="metric-value status-${this.metrics.tunnel.status || 'unknown'}">
                    ${(this.metrics.tunnel.status || 'UNKNOWN').toUpperCase()}
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-label">Tunnel Response Time</div>
                <div class="metric-value">${this.metrics.tunnel.responseTime || 'N/A'}ms</div>
            </div>
        </div>
        
        <div style="margin-top: 20px; text-align: center; color: #7f8c8d;">
            <p>Collector uptime: ${Math.floor((Date.now() - this.startTime) / 1000)} seconds</p>
            <p>Last updated: ${new Date().toLocaleString()}</p>
        </div>
    </div>
    
    <script>
        // Auto-refresh every 60 seconds
        setTimeout(() => location.reload(), 60000);
    </script>
</body>
</html>`;
  }

  // ========================================
  // LIFECYCLE METHODS
  // ========================================
  start() {
    logger.info('Starting Metrics Collector...');
    
    // Create HTTP server
    this.createServer();
    
    // Start metrics collection
    this.collectionInterval = setInterval(this.collectMetrics, CONFIG.collectionInterval);
    
    // Perform initial collection
    setTimeout(this.collectMetrics, 2000);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
    
    logger.info('Metrics Collector started successfully');
  }

  stop() {
    logger.info('Stopping Metrics Collector...');
    
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
    }
    
    if (this.server) {
      this.server.close();
    }
    
    logger.info('Metrics Collector stopped');
    process.exit(0);
  }
}

// ========================================
// MAIN EXECUTION
// ========================================
if (require.main === module) {
  const collector = new MetricsCollector();
  collector.start();
}

module.exports = MetricsCollector;