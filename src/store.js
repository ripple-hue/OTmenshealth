'use strict';
// Everything the Studio remembers: versions, the open draft, the chat and Jacob's taste.
// Kept as plain files in DATA_DIR so it survives restarts (mount a volume there in production).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const SEED = path.join(__dirname, '..', 'content', 'site.json');
const STATE = path.join(DATA, 'state.json');
const MEDIA = path.join(DATA, 'media'); // generated images, served at /media/<file>
const MEDIA_INDEX = path.join(MEDIA, 'index.json');
const vFile = (n) => path.join(DATA, `v${n}.json`);

const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const write = (f, v) => {
  fs.writeFileSync(f + '.tmp', JSON.stringify(v, null, 2));
  fs.renameSync(f + '.tmp', f); // never leave a half-written file behind
};

function init(force) {
  fs.mkdirSync(MEDIA, { recursive: true });
  if (!force && fs.existsSync(STATE)) return;
  for (const f of fs.readdirSync(DATA)) if (/^v\d+\.json$/.test(f)) fs.unlinkSync(path.join(DATA, f));
  for (const f of fs.readdirSync(MEDIA)) fs.unlinkSync(path.join(MEDIA, f));
  const now = new Date().toISOString();
  write(vFile(1), read(SEED));
  write(STATE, {
    head: 1,
    live: 1,
    versions: [{ n: 1, summary: 'The site as it is today', createdAt: now, pushedAt: now }],
    draft: null,
    memory: [],
    chat: [],
  });
}

const state = () => read(STATE);
const save = (s) => write(STATE, s);
const version = (n) => read(vFile(n));

function addVersion(s, content, summary) {
  const n = Math.max(...s.versions.map((v) => v.n)) + 1;
  write(vFile(n), content);
  s.versions.push({ n, summary, createdAt: new Date().toISOString(), pushedAt: null });
  s.head = n;
  return n;
}

// Generated images. Files are never edited in place, so a version that uses one keeps working.
const listMedia = () => (fs.existsSync(MEDIA_INDEX) ? read(MEDIA_INDEX) : []);
function saveMedia(buffer, ext, meta) {
  fs.mkdirSync(MEDIA, { recursive: true });
  const file = `gen-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(MEDIA, file), buffer);
  const entry = { path: '/media/' + file, ...meta, at: new Date().toISOString() };
  write(MEDIA_INDEX, [...listMedia(), entry]);
  return entry;
}
const mediaFile = (name) => {
  if (!/^[\w.-]+$/.test(name) || name === 'index.json') return null;
  const f = path.join(MEDIA, name);
  return fs.existsSync(f) ? f : null;
};
const mediaPaths = () => listMedia().map((m) => m.path).filter((p) => mediaFile(p.slice(7)));

module.exports = { init, state, save, version, addVersion, listMedia, saveMedia, mediaFile, mediaPaths, DATA };
