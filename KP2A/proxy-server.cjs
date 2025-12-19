#!/usr/bin/env node

/**
 * Simple HTTP Proxy Server for SIDARSIH
 * Redirects traffic from port 80 to port 8080 (Vite dev server)
 * This solves the 522 error by providing a web server on port 80
 */

const http = require('http');
const httpProxy = require('http-proxy-middleware');
const express = require('express');

const app = express();
const PORT = 8000;
const TARGET_PORT = 8080;
const TARGET_HOST = 'localhost';

console.log('🚀 Starting SIDARSIH Proxy Server...');
console.log(`📡 Proxying port ${PORT} -> ${TARGET_PORT}`);

// Create proxy middleware
const proxy = httpProxy.createProxyMiddleware({
  target: `http://${TARGET_HOST}:${TARGET_PORT}`,
  changeOrigin: true,
  ws: true, // Enable WebSocket proxying
  logLevel: 'info',
  onError: (err, req, res) => {
    console.error('❌ Proxy Error:', err.message);
    res.writeHead(502, {
      'Content-Type': 'text/html'
    });
    res.end(`
      <html>
        <head><title>502 Bad Gateway</title></head>
        <body>
          <h1>502 Bad Gateway</h1>
          <p>The upstream server (port ${TARGET_PORT}) is not responding.</p>
          <p>Please ensure the SIDARSIH application is running on port ${TARGET_PORT}.</p>
          <hr>
          <small>SIDARSIH Proxy Server</small>
        </body>
      </html>
    `);
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`📥 ${req.method} ${req.url} -> ${TARGET_HOST}:${TARGET_PORT}`);
  }
});

// Use proxy for all requests
app.use('/', proxy);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    proxy: `${PORT} -> ${TARGET_PORT}`,
    timestamp: new Date().toISOString()
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Proxy server running on port ${PORT}`);
  console.log(`🔗 Forwarding to http://${TARGET_HOST}:${TARGET_PORT}`);
  console.log(`🌐 Access via: http://sidarsih.site`);
  console.log('');
  console.log('📊 Server Status:');
  console.log(`   - Proxy Port: ${PORT}`);
  console.log(`   - Target Port: ${TARGET_PORT}`);
  console.log(`   - WebSocket: Enabled`);
  console.log(`   - Health Check: http://localhost:${PORT}/health`);
});

// Handle WebSocket upgrade
server.on('upgrade', (request, socket, head) => {
  proxy.upgrade(request, socket, head);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Proxy server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Proxy server closed');
    process.exit(0);
  });
});

// Error handling
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});