'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { renderPage, renderLocked, LOCKED } = require('./src/render');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const PORT = process.env.PORT || 4000;

const TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
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

const send = (res, code, type, body) => {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
};

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname.replace(/\/+$/, '') || '/';
    try {
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
