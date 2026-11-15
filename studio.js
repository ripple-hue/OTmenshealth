'use strict';
// OT Studio: the separate agent site. It holds its own copy of Jacob's website, lets him
// talk to the agent, previews drafts next to the current site, and stores every version.
// Only a person clicking Approve, then Push, can change what is live.

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { renderPage, renderLocked, LOCKED } = require('./src/render');
const { validate, diff } = require('./src/guard');
const store = require('./src/store');
const agent = require('./src/agent');
const images = require('./src/images');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const PORT = process.env.PORT || 4100;
const PASSCODE = process.env.STUDIO_PASSCODE || 'otmens';
const TOKEN = crypto.createHash('sha256').update('ot-studio:' + PASSCODE).digest('hex');
const LIVE_SITE_URL = (process.env.LIVE_SITE_URL || '').replace(/\/$/, '');
const TYPES = { '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

store.init();
let busy = false;
let progress = ''; // what the agent is doing right now, shown under "Working on it"

const send = (res, code, type, body, headers = {}) => {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', ...headers });
  res.end(body);
};
const json = (res, code, body) => send(res, code, 'application/json; charset=utf-8', JSON.stringify(body));
const html = (res, body) => send(res, 200, 'text/html; charset=utf-8', body);
const authed = (req) => (req.headers.cookie || '').split(/;\s*/).includes('ot_studio=' + TOKEN);
const readBody = (req) =>
  new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 1e6) reject(new Error('Too large')); });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { reject(new Error('Bad JSON')); } });
  });

function publicState() {
  const s = store.state();
  const head = store.version(s.head);
  const d = s.draft ? diff(head, s.draft.content) : null;
  const source = s.draft ? s.draft.content : head;
  return {
    head: s.head,
    live: s.live,
    versions: [...s.versions].reverse(),
    pages: Object.entries(source.pages).map(([key, p]) => ({ key, path: p.path, title: p.title, isNew: !head.pages[key] })),
    livePages: Object.values(store.version(s.live).pages).map((p) => p.path),
    draft: s.draft && { summary: s.draft.summary, changes: s.draft.changes, report: s.draft.report, diff: d, needs: s.draft.needs, declined: s.draft.declined },
    memory: s.memory,
    chat: s.chat,
    hasKey: !!process.env.ANTHROPIC_API_KEY,
    liveSiteUrl: LIVE_SITE_URL,
    model: agent.MODEL,
    imagesEnabled: images.enabled(),
    busy,
    progress: busy ? progress : '',
  };
}

const note = (s, text) => s.chat.push({ role: 'system', text, at: new Date().toISOString() });

async function runAgent(message, rejected) {
  let s = store.state();
  const current = store.version(s.head);
  let out;
  try {
    out = await agent.run({ message, rejected, draft: s.draft, current, memory: s.memory, version: s.head, history: s.chat.slice(0, -1), onProgress: (t) => { progress = t; } });
  } catch (e) {
    if (!e.userFacing) console.error(e);
    s = store.state();
    s.chat.push({ role: 'agent', text: e.userFacing ? e.message : 'Something went wrong on my side and no change was made. Try that again.', error: true, at: new Date().toISOString() });
    return store.save(s);
  }

  s = store.state();
  const learned = (out.lessons_learned || []).filter((r) => typeof r === 'string' && r.trim()).map((rule) => ({ id: crypto.randomUUID(), rule: rule.trim(), at: new Date().toISOString(), from: message.slice(0, 140) }));
  s.memory.push(...learned);
  let drafted = false;
  if (out.site && diff(current, out.site).any) {
    const reset = (out.operations || []).some((o) => o.op === 'reset_draft');
    s.draft = {
      content: out.site,
      summary: out.summary || s.draft?.summary || 'Untitled change',
      changes: [...(reset || !s.draft ? [] : s.draft.changes || []), ...(out.changes || [])],
      report: out.report,
      needs: out.needs_from_jacob || [],
      declined: out.declined || [],
    };
    drafted = true;
  } else if (out.site && s.draft) {
    s.draft = null; // the agent reverted everything
  }
  s.chat.push({
    role: 'agent', text: out.message, at: new Date().toISOString(),
    drafted, summary: drafted ? s.draft.summary : null, changes: out.changes || [],
    learned: learned.map((l) => l.rule), applied: out.lessons_applied || [],
    skills: (out.skills_used || []).filter((x) => agent.SKILLS.includes(x)),
    images: out.images || [],
    needs: out.needs_from_jacob || [], declined: out.declined || [], failed: !!out.failed,
  });
  store.save(s);
}

const api = {
  // Starts the agent and returns at once. The browser polls /api/state until `busy` clears,
  // so a slow answer never depends on one long-held connection.
  chat(body) {
    const message = String(body.message || '').trim().slice(0, 4000);
    if (!message) return { error: 'Type a message first.' };
    if (busy) return { error: 'The agent is still working on the last request.' };
    busy = true;
    progress = 'Reading your request';
    const s = store.state();
    s.chat.push({ role: 'user', text: message, rejected: !!body.rejected, at: new Date().toISOString() });
    store.save(s);
    runAgent(message, !!body.rejected)
      .catch((e) => console.error(e))
      .finally(() => { busy = false; });
    return {};
  },

  approve() {
    const s = store.state();
    if (!s.draft) return { error: 'There is no draft to approve.' };
    const report = validate(s.draft.content, store.version(s.head)); // re-check at the moment of approval
    if (!report.ok) return { error: 'This draft no longer passes the checks: ' + report.errors[0] };
    if (report.markers.length) return { error: 'This draft still has a placeholder that needs your input: ' + report.markers[0] };
    const n = store.addVersion(s, s.draft.content, s.draft.summary);
    s.draft = null;
    note(s, `Version ${n} approved and saved. It is not live yet.`);
    store.save(s);
    return {};
  },

  discard() {
    const s = store.state();
    if (s.draft) { s.draft = null; note(s, 'Draft discarded. Nothing changed.'); store.save(s); }
    return {};
  },

  push(body) {
    const s = store.state();
    const n = Number(body.n) || s.head;
    const v = s.versions.find((x) => x.n === n);
    if (!v) return { error: 'That version does not exist.' };
    const report = validate(store.version(n));
    if (!report.ok) return { error: 'That version does not pass the checks and cannot go live.' };
    s.live = n;
    v.pushedAt = new Date().toISOString();
    note(s, `Version ${n} is now live.`);
    store.save(s);
    return {};
  },

  restore(body) {
    const s = store.state();
    const v = s.versions.find((x) => x.n === Number(body.n));
    if (!v) return { error: 'That version does not exist.' };
    const n = store.addVersion(s, store.version(v.n), `Restored version ${v.n}: ${v.summary}`);
    s.draft = null;
    note(s, `Version ${v.n} restored as version ${n}. It is not live yet.`);
    store.save(s);
    return {};
  },

  forget(body) {
    const s = store.state();
    s.memory = s.memory.filter((m) => m.id !== body.id);
    store.save(s);
    return {};
  },

  reset() {
    store.init(true);
    return {};
  },
};

function view(res, which, rest, query) {
  const s = store.state();
  let content, highlight;
  if (which === 'draft') {
    const head = store.version(s.head);
    content = s.draft ? s.draft.content : head;
    if (s.draft && query.get('hl') !== '0') {
      const d = diff(head, content);
      highlight = (key) => d.pages[key] || [];
    }
  } else if (which === 'live') content = store.version(s.live);
  else if (which === 'head') content = store.version(s.head);
  else if (/^v\d+$/.test(which) && s.versions.find((v) => v.n === Number(which.slice(1)))) content = store.version(Number(which.slice(1)));
  else return send(res, 404, 'text/plain; charset=utf-8', 'Not found');

  const p = '/' + rest.replace(/\/+$/, '');
  const base = '/view/' + which;
  const key = Object.keys(content.pages).find((k) => content.pages[k].path === p);
  if (key) return html(res, renderPage(content, key, { base, highlight: highlight ? highlight(key) : [], scroll: query.get('scroll') !== '0' }));
  if (LOCKED[p]) return html(res, renderLocked(content, LOCKED[p], { base }));
  send(res, 404, 'text/html; charset=utf-8', '<body style="font:16px Helvetica,Arial,sans-serif;padding:48px;color:#17130E;background:#F7F1E6">This page does not exist in this version.</body>');
}

const LOGIN = (bad) => `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OT Studio</title><link rel="stylesheet" href="/styles.css">
<body style="background:#17130E;color:#F7F1E6;display:grid;place-items:center;min-height:100vh"><form method="post" action="/login" style="width:min(360px,90vw);text-align:center">
<p class="eyebrow" style="justify-content:center;color:#EBDDB8"><span class="dot"></span>OT Studio</p><h1 class="title" style="font-size:2.6rem;margin-bottom:28px">Your site, <em style="color:#EBDDB8">on call.</em></h1>
<input name="passcode" type="password" placeholder="Passcode" autofocus style="width:100%;padding:16px 20px;border-radius:99px;border:1px solid rgba(247,241,230,.3);background:transparent;color:inherit;font:inherit;text-align:center">
${bad ? '<p style="margin-top:12px;color:#D8BC7E;font-size:.9rem">That passcode is not right.</p>' : ''}
<button class="btn btn-gold" style="margin-top:16px;width:100%;border:0;cursor:pointer;font-family:inherit">Open the Studio</button></form></body>`;

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname;
    try {
      // Public: static assets, and the live version for Jacob's website to pull.
      const file = path.normalize(path.join(PUBLIC, p));
      if (p !== '/' && file.startsWith(PUBLIC + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) {
        return send(res, 200, TYPES[path.extname(file)] || 'application/octet-stream', fs.readFileSync(file), { 'Cache-Control': 'public, max-age=300' });
      }
      if (p === '/favicon.ico') return send(res, 204, 'image/x-icon', '');
      // Generated images are public so the website can show them. Names are random and never reused.
      const media = p.match(/^\/media\/([\w.-]+)$/);
      if (media) {
        const f = store.mediaFile(media[1]);
        if (!f) return send(res, 404, 'text/plain; charset=utf-8', 'Not found');
        return send(res, 200, TYPES[path.extname(f)] || 'application/octet-stream', fs.readFileSync(f), { 'Cache-Control': 'public, max-age=31536000, immutable' });
      }
      if (p === '/api/published') {
        const s = store.state();
        return json(res, 200, { version: s.live, content: store.version(s.live) });
      }

      if (p === '/login' && req.method === 'POST') {
        let raw = '';
        for await (const c of req) raw += c;
        const ok = new URLSearchParams(raw).get('passcode') === PASSCODE;
        if (!ok) return html(res, LOGIN(true));
        res.writeHead(302, { Location: '/', 'Set-Cookie': `ot_studio=${TOKEN}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000` });
        return res.end();
      }
      if (!authed(req)) return p.startsWith('/api/') ? json(res, 401, { error: 'Sign in again.' }) : html(res, LOGIN(false));

      if (p === '/') return html(res, fs.readFileSync(path.join(ROOT, 'studio', 'index.html'), 'utf8'));
      if (p === '/api/state') return json(res, 200, publicState());
      if (p.startsWith('/api/') && req.method === 'POST') {
        const fn = api[p.slice(5)];
        if (!fn) return json(res, 404, { error: 'Unknown action.' });
        const result = await fn(await readBody(req));
        return json(res, result.error ? 400 : 200, { ...result, state: publicState() });
      }
      const m = p.match(/^\/view\/([a-z0-9]+)(\/.*)?$/);
      if (m) return view(res, m[1], (m[2] || '/').slice(1), url.searchParams);
      send(res, 404, 'text/plain; charset=utf-8', 'Not found');
    } catch (err) {
      console.error(err);
      p.startsWith('/api/') ? json(res, 500, { error: 'Something went wrong. Nothing was changed.' }) : send(res, 500, 'text/plain; charset=utf-8', 'Something went wrong.');
    }
  })
  .listen(PORT, () => console.log(`OT Studio on http://localhost:${PORT}`));
