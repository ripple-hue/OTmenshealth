'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { renderPage, renderLocked, LOCKED } = require('./src/render');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const LENIS = path.join(ROOT, 'node_modules', 'lenis', 'dist', 'lenis.min.js'); // smooth scrolling, MIT licence
const { paperFile } = require('./src/shader');
const PORT = process.env.PORT || 4000;

const TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

// The public website. With STUDIO_URL set it shows whichever version was last pushed live
// from the Studio; without it, it shows the copy bundled in this repo.
const STUDIO_URL = (process.env.STUDIO_URL || '').replace(/\/$/, '');
const bundled = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'site.json'), 'utf8'));
let cache = { at: 0, site: null };

async function loadSite() {
  if (!STUDIO_URL) return bundled();
  if (Date.now() - cache.at < 3000 && cache.site) return cache.site;
  try {
    const res = await fetch(STUDIO_URL + '/api/published', { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error('Studio answered ' + res.status);
    cache = { at: Date.now(), site: (await res.json()).content };
  } catch (err) {
    console.error('Could not reach the Studio, serving the last known version:', err.message);
    cache = { at: Date.now(), site: cache.site || bundled() };
  }
  return cache.site;
}

const send = (res, code, type, body, headers = {}) => {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', ...headers });
  res.end(body);
};

// Images the agent generated live on the Studio's volume. Fetch them from there and keep a small
// in-memory copy; file names are never reused, so a cached copy is always correct.
const mediaCache = new Map();
async function sendMedia(res, name) {
  if (!STUDIO_URL || !/^[\w.-]+$/.test(name)) return send(res, 404, 'text/plain; charset=utf-8', 'Not found');
  let hit = mediaCache.get(name);
  if (!hit) {
    const r = await fetch(`${STUDIO_URL}/media/${name}`, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) return send(res, 404, 'text/plain; charset=utf-8', 'Not found');
    hit = { type: r.headers.get('content-type') || 'application/octet-stream', body: Buffer.from(await r.arrayBuffer()) };
    if (mediaCache.size > 40) mediaCache.delete(mediaCache.keys().next().value);
    mediaCache.set(name, hit);
  }
  send(res, 200, hit.type, hit.body, { 'Cache-Control': 'public, max-age=31536000, immutable' });
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname.replace(/\/+$/, '') || '/';
    try {
      const media = p.match(/^\/media\/([\w.-]+)$/);
      if (media) return await sendMedia(res, media[1]);
      if (p === '/vendor/lenis.min.js') return send(res, 200, TYPES['.js'], fs.readFileSync(LENIS), { 'Cache-Control': 'public, max-age=86400' });
      const paper = paperFile(p);
      if (paper) return send(res, 200, TYPES['.js'], fs.readFileSync(paper), { 'Cache-Control': 'public, max-age=86400', 'Access-Control-Allow-Origin': '*' });
      const site = await loadSite();
      const key = Object.keys(site.pages).find((k) => site.pages[k].path === p);
      if (key) return send(res, 200, 'text/html; charset=utf-8', renderPage(site, key));
      if (LOCKED[p]) return send(res, 200, 'text/html; charset=utf-8', renderLocked(site, LOCKED[p]));

      const file = path.normalize(path.join(PUBLIC, p));
      if (file.startsWith(PUBLIC + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) {
        return send(res, 200, TYPES[path.extname(file)] || 'application/octet-stream', fs.readFileSync(file));
      }
      send(res, 404, 'text/plain; charset=utf-8', 'Not found');
    } catch (err) {
      console.error(err);
      send(res, 500, 'text/plain; charset=utf-8', 'Something went wrong rendering this page.');
    }
  })
  .listen(PORT, () => console.log(`OTMENS demo site on http://localhost:${PORT}`));
