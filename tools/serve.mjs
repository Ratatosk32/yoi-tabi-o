// Локальный статический сервер для app/ (только 127.0.0.1). Не для продакшена.
// Запуск: node tools/serve.mjs [port]   → http://localhost:8787/
// Примерно повторяет app/_headers (no-cache для sw.js, index.html, data/*).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'app');
const PORT = Number(process.argv[2] || process.env.PORT || 8787);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2', '.map': 'application/json',
};

export function startServer(port = PORT, { quiet = false } = {}) {
  const server = createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p.endsWith('/')) p += 'index.html';
      const file = normalize(join(ROOT, p));
      if (!file.startsWith(ROOT + sep) && file !== ROOT) { res.writeHead(403).end(); return; }
      const st = await stat(file).catch(() => null);
      if (!st || !st.isFile() || p.includes('/_headers')) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('404'); return; }
      const noCache = /\/(sw\.js|index\.html)$/.test(p) || p.startsWith('/data/');
      res.writeHead(200, {
        'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
        'Cache-Control': noCache ? 'no-cache' : 'max-age=0, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(req.method === 'HEAD' ? undefined : await readFile(file));
      if (!quiet) console.log(req.method, p);
    } catch (e) {
      res.writeHead(500).end(String(e));
    }
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => {
    if (!quiet) console.log(`Serving ${ROOT} at http://localhost:${port}/`);
    resolve(server);
  }));
}

if (import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g, '/').replace(/^\//, '')}`).href) {
  startServer();
}
