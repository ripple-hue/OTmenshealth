'use strict';
// Everything the Studio remembers: versions, the open draft, the chat and Jacob's taste.
// Kept as plain files in DATA_DIR so it survives restarts (mount a volume there in production).

const fs = require('fs');
const path = require('path');

const DATA = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const SEED = path.join(__dirname, '..', 'content', 'site.json');
const STATE = path.join(DATA, 'state.json');
const vFile = (n) => path.join(DATA, `v${n}.json`);

const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const write = (f, v) => {
  fs.writeFileSync(f + '.tmp', JSON.stringify(v, null, 2));
  fs.renameSync(f + '.tmp', f); // never leave a half-written file behind
};

function init(force) {
  fs.mkdirSync(DATA, { recursive: true });
  if (!force && fs.existsSync(STATE)) return;
  for (const f of fs.readdirSync(DATA)) if (/^v\d+\.json$/.test(f)) fs.unlinkSync(path.join(DATA, f));
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

module.exports = { init, state, save, version, addVersion, DATA };
