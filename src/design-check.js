// Anti-slop design check: runs Impeccable's detector (github.com/pbakaus/impeccable, Apache-2.0) on a draft.
// Impeccable's rules are fixed checks, with no AI and no API cost, for the visual giveaways of AI-made
// pages: purple/cyan "AI" palettes, gradient text, glowing shadows, coloured side stripes on cards,
// icon tiles stacked over headings, buzzwords, tiny text, low contrast, bounce easing and more.
//
// It renders every page of the draft and of the live site, scans both, and reports only what the draft
// added, so things already on Jacob's approved site are never charged to the agent. Rules that contradict
// the OTMENS brand itself are switched off (see BRAND_RULES). If the detector can't run, the check is
// skipped (logged) rather than blocking the agent.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { renderPage } = require('./render');

const ROOT = path.join(__dirname, '..');
const CLI = path.join(ROOT, 'node_modules', 'impeccable', 'cli', 'bin', 'cli.js');

// Rules that would flag the brand Jacob already owns, or that the static scan gets wrong here.
const BRAND_RULES = new Set([
  'overused-font', // Instrument Serif is the brand's accent face
  'cream-palette', // cream and paper are brand colours
  'hero-eyebrow-chip', // the dotted eyebrow above a headline is a brand device
  'kicker-above-heading', // same device
  'cramped-padding', // the static scan can't see .wrap's margins; the guard enforces .wrap instead
  'design-system-font', 'design-system-color', 'design-system-radius', 'design-system-font-size', // no DESIGN.md here
]);

const enabled = () => process.env.DESIGN_CHECK !== 'off' && fs.existsSync(CLI);

// Agent CSS is scoped with nesting ([data-section="id"]{ .card{…} }), which the static scanner can't read.
// For the scan only, flattenBlocks rewrites it as plain prefixed rules. What visitors get is unchanged.
function matchBrace(s, open) {
  let depth = 0;
  for (let j = open; j < s.length; j++) {
    if (s[j] === '{') depth++;
    else if (s[j] === '}' && --depth === 0) return j;
  }
  return -1;
}

// Turns the body of a scoped block into flat rules under `prefix`.
function unnest(body, prefix) {
  let out = '', decls = '', i = 0;
  while (i < body.length) {
    const brace = body.indexOf('{', i);
    const semi = body.indexOf(';', i);
    if (brace === -1 || (semi !== -1 && semi < brace)) { // a plain declaration
      const end = semi === -1 ? body.length : semi + 1;
      decls += body.slice(i, end);
      i = end;
      continue;
    }
    const head = body.slice(i, brace).trim();
    const close = matchBrace(body, brace);
    if (close === -1) break;
    const inner = body.slice(brace + 1, close);
    if (/^@(media|supports|container)/i.test(head)) out += `${head}{${unnest(inner, prefix)}}`;
    else if (/^@/.test(head)) out += `${head}{${inner}}`;
    else {
      const sel = head.split(',').map((x) => (x.includes('&') ? x.replace(/&/g, prefix) : `${prefix} ${x.trim()}`)).join(',');
      out += `${sel}{${inner}}`;
    }
    i = close + 1;
  }
  return (decls.trim() ? `${prefix}{${decls}}` : '') + out;
}

function flattenBlocks(css) {
  let out = '', i = 0;
  const re = /\[data-section="[^"]+"\]\{/g;
  let m;
  while ((m = re.exec(css))) {
    const open = m.index + m[0].length - 1;
    const close = matchBrace(css, open);
    if (close === -1) break;
    out += css.slice(i, m.index) + unnest(css.slice(open + 1, close), m[0].slice(0, -1));
    i = close + 1;
    re.lastIndex = i;
  }
  return out + css.slice(i);
}

function scanHtml(html) {
  return html
    .replace(/href="\/styles\.css"/, 'href="styles.css"')
    .replace(/<style([^>]*)>([\s\S]*?)<\/style>/g, (m, attrs, css) => `<style${attrs}>${flattenBlocks(css)}</style>`);
}

// Scans every page of a site; returns findings as {rule, name, description, page, snippet, advisory}.
function scan(site) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'otscan-'));
  try {
    fs.copyFileSync(path.join(ROOT, 'public', 'styles.css'), path.join(dir, 'styles.css'));
    for (const key of Object.keys(site.pages || {})) {
      fs.writeFileSync(path.join(dir, `${key.replace(/[^a-z0-9-]/gi, '_')}.html`), scanHtml(renderPage(site, key)));
    }
    const r = spawnSync(process.execPath, [CLI, 'detect', '--json', '--no-config', '.'], { cwd: dir, encoding: 'utf8', timeout: 30000, maxBuffer: 20 * 1024 * 1024 });
    if (r.error || ![0, 2].includes(r.status)) throw new Error(r.error?.message || `exit ${r.status}: ${String(r.stderr).slice(0, 300)}`);
    return JSON.parse(r.stdout || '[]').map((f) => ({
      rule: f.antipattern, name: f.name, description: f.description,
      page: path.basename(f.file || '', '.html'), snippet: String(f.snippet || '').slice(0, 160),
      advisory: !!f.advisory || f.severity === 'advisory',
    }));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// What the draft adds compared with the live site: primary findings only, brand rules excluded.
function review(draftSite, liveSite) {
  if (!enabled()) return { ran: false, issues: [] };
  try {
    const keep = (f) => !f.advisory && !BRAND_RULES.has(f.rule);
    // A finding already on the live site anywhere is not the draft's doing (findings don't name their
    // section, and a new dark band can make an existing element match again), so it isn't charged.
    const live = new Set(scan(liveSite).filter(keep).map((f) => `${f.rule}|${f.snippet}`));
    const issues = new Map(); // one entry per distinct problem, with how often it occurs
    for (const f of scan(draftSite).filter(keep)) {
      const k = `${f.rule}|${f.snippet}`;
      if (live.has(k)) continue;
      const pk = `${f.page}|${k}`;
      if (issues.has(pk)) issues.get(pk).count++;
      else issues.set(pk, { ...f, count: 1 });
    }
    return { ran: true, issues: [...issues.values()] };
  } catch (e) {
    console.error('[design-check] skipped:', e.message);
    return { ran: false, issues: [] };
  }
}

const describe = (issues) => issues.map((f) => `[${f.page} page] ${f.name}${f.count > 1 ? ` (${f.count} times)` : ''}: ${f.snippet}. ${String(f.description || '').split('. ').slice(0, 2).join('. ')}`);

module.exports = { review, scan, describe, flattenBlocks, enabled, BRAND_RULES };
