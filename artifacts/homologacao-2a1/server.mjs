import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(root, '../..');
const currentSW = fs.readFileSync(path.join(repo, 'public/sw.js'), 'utf8');
const oldSW = currentSW
  .replace('// Only explicitly owned, retired app-shell caches may be deleted.\n', '')
  .replace(/const RETIRED_APP_SHELL_CACHES = .*;\r?\n/, '')
  .replace('key !== CACHE_NAME && RETIRED_APP_SHELL_CACHES.has(key)', 'key !== CACHE_NAME');
let revision = 'old';
let mediaUnavailable = false;
const requests = [];
const events = [];
const fixtures = new Map();
const fixtureDir = path.join(root, 'fixtures');
fs.mkdirSync(fixtureDir, { recursive: true });
for (const name of fs.readdirSync(fixtureDir)) {
  if (!/^[a-zA-Z0-9]+\.(png|webm)$/.test(name)) continue;
  fixtures.set('/media/' + name, { bytes: fs.readFileSync(path.join(fixtureDir, name)), type: name.endsWith('.png') ? 'image/png' : 'video/webm' });
}
const persist = () => fs.writeFileSync(path.join(root, 'evidence.json'), JSON.stringify({ revision, requests, events }, null, 2));
const vite = await createServer({
  configFile: false, root, cacheDir: path.join(root, '.vite'),
  server: { middlewareMode: true, fs: { allow: [repo] }, hmr: false, watch: { ignored: ['**/chrome-profile-gate/**'] } },
  appType: 'custom', optimizeDeps: { noDiscovery: true },
});
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:5198');
  const send = (status, type, body, headers = {}) => { res.writeHead(status, { 'Content-Type': type, ...headers }); res.end(body); };
  if (url.pathname === '/sw.js') return send(200, 'application/javascript', revision === 'old' ? oldSW : currentSW, { 'Cache-Control': 'no-store' });
  if (url.pathname === '/api/events' && req.method === 'POST') {
    let body = ''; for await (const chunk of req) body += chunk;
    events.push(JSON.parse(body)); persist(); return send(200, 'application/json', '{}');
  }
  if (url.pathname === '/api/new-sw' && req.method === 'POST') { revision = 'new'; return send(200, 'application/json', '{}'); }
  if (url.pathname === '/api/media-off' && req.method === 'POST') { mediaUnavailable = true; return send(200, 'application/json', '{}'); }
  if (url.pathname === '/api/media-on' && req.method === 'POST') { mediaUnavailable = false; return send(200, 'application/json', '{}'); }
  if (url.pathname === '/api/evidence') return send(200, 'application/json', JSON.stringify({ revision, requests, events }));
  if (url.pathname.startsWith('/media/')) {
    if (req.method === 'POST') {
      const name = url.pathname.slice('/media/'.length);
      if (!/^[a-zA-Z0-9]+\.(png|webm)$/.test(name)) return send(400, 'text/plain', 'Invalid fixture name');
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      fixtures.set(url.pathname, { bytes: Buffer.concat(chunks), type: req.headers['content-type'] });
      fs.writeFileSync(path.join(fixtureDir, name), Buffer.concat(chunks));
      return send(200, 'application/json', '{}');
    }
    const fixture = fixtures.get(url.pathname);
    const entry = { at: new Date().toISOString(), path: url.pathname, method: req.method,
      range: req.headers.range || null, ifNoneMatch: req.headers['if-none-match'] || null };
    requests.push(entry);
    if (!fixture || mediaUnavailable) { entry.status = 503; entry.bodyBytes = 0; persist(); return send(503, 'text/plain', ''); }
    const etag = `"fixture-${url.pathname.split('/').pop()}-${fixture.bytes.length}"`;
    const headers = { ETag: etag, 'Cache-Control': 'private, max-age=0', 'Accept-Ranges': 'bytes' };
    let status = 200, data = fixture.bytes;
    if (req.headers['if-none-match'] === etag) { status = 304; data = Buffer.alloc(0); }
    else if (req.headers.range) {
      const match = /bytes=(\d+)-(\d*)/.exec(req.headers.range);
      if (match) {
        const start = Number(match[1]), end = Math.min(Number(match[2] || (data.length - 1)), data.length - 1);
        headers['Content-Range'] = `bytes ${start}-${end}/${data.length}`;
        data = data.subarray(start, end + 1); status = 206;
      }
    }
    entry.status = status; entry.bodyBytes = data.length;
    res.on('finish', persist);
    return send(status, fixture.type, data, { ...headers, 'Content-Length': data.length });
  }
  if (url.pathname === '/' || url.pathname === '/tv') {
    const html = await vite.transformIndexHtml(url.pathname, fs.readFileSync(path.join(root, 'index.html'), 'utf8'));
    return send(200, 'text/html', html, { 'Cache-Control': 'no-store' });
  }
  if (url.pathname.startsWith('/icons/') || url.pathname === '/favicon.png' || url.pathname.endsWith('.webmanifest')) {
    const file = path.join(repo, 'public', url.pathname);
    if (fs.existsSync(file)) return send(200, file.endsWith('.png') ? 'image/png' : 'application/manifest+json', fs.readFileSync(file));
  }
  vite.middlewares(req, res, () => send(404, 'text/plain', 'Not found'));
});
server.listen(5198, '127.0.0.1', () => console.log('Homologacao isolada: http://127.0.0.1:5198'));
