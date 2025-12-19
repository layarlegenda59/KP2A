const http = require('http');
const httpProxy = require('http-proxy');

const proxy = httpProxy.createProxyServer({
  target: 'http://localhost:5175',
  changeOrigin: true,
  ws: true
});

const server = http.createServer((req, res) => {
  proxy.web(req, res, (err) => {
    console.error('Proxy error:', err);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Bad Gateway');
  });
});

server.on('upgrade', (req, socket, head) => {
  proxy.ws(req, socket, head);
});

const PORT = 8080;
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
  console.log(`Forwarding to http://localhost:5175`);
});

proxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err);
  if (res && !res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Bad Gateway');
  }
});