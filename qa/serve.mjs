// Tiny static server for QA (independent of the builder's tools/serve.mjs).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8' };

export function createServer(rootIn, port) {
  const root = path.resolve(rootIn);
  const log = [];
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(root, p);
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, buf) => {
      log.push(`${req.method} ${p} ${err ? 404 : 200}`);
      if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('not found'); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(buf);
    });
  });
  const sockets = new Set();
  server.on('connection', (s) => { sockets.add(s); s.on('close', () => sockets.delete(s)); });
  return {
    log,
    start: () => new Promise((r) => server.listen(port, '127.0.0.1', r)),
    stop: () => new Promise((r) => { for (const s of sockets) s.destroy(); server.close(() => r()); }),
  };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  const root = path.resolve(process.argv[2] || '../app'), port = Number(process.argv[3] || 8765);
  const s = createServer(root, port); await s.start(); console.log(`QA server: http://localhost:${port}/ → ${root}`);
}
