'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { renderPage, renderLocked } = require('./src/render');

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

// Areas the site agent must never touch. They exist only as placeholders here.
const LOCKED = { '/checkout': 'Checkout', '/portal': 'The member portal', '/intake': 'Medical intake' };

const loadSite = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'site.json'), 'utf8'));

const send = (res, code, type, body) => {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
};

http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname.replace(/\/+$/, '') || '/';
    try {
      const site = loadSite();
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
