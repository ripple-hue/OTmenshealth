// Exercises the agent-code capability without calling Claude.
// Usage: npm test   (or: node test/agent-code.js [DATA_DIR to store the takeover as a draft for preview])
const path = require('path');
const repo = path.join(__dirname, '..');
if (process.argv[2]) process.env.DATA_DIR = path.resolve(process.argv[2]); // before src/store is loaded
const { applyOps } = require(path.join(repo, 'src/agent'));
const { validate } = require(path.join(repo, 'src/guard'));
const { renderPage } = require(path.join(repo, 'src/render'));
const current = require(path.join(repo, 'content/site.json'));

// A Black Friday takeover of the kind the agent should now produce (test dates, not Jacob's terms).
const heroHtml = `
<div class="wrap bf">
  <p class="eyebrow"><span class="dot"></span>Black Friday · November 27 to 30</p>
  <h1 class="bf-head">Three months <em>free.</em></h1>
  <div class="bf-row">
    <div class="bf-card">
      <p class="kicker">Gold, paid annually</p>
      <p class="bf-price"><s>$2,388</s> <b>$1,795</b></p>
      <p class="bf-note">A dedicated wellness advisor, health coaching and concierge medical care on demand.</p>
    </div>
    <div class="bf-cta">
      <p class="lede">Every plan starts with your bloodwork, reviewed by a licensed provider.</p>
      <p class="actions"><a class="btn btn-gold" href="/membership">Choose Gold</a><a class="text-link" href="/membership#plans">Compare plans</a></p>
    </div>
  </div>
  <img class="bf-img" src="/img/hormone.jpg" alt="A glass vial with a gold cap on a stone block" loading="lazy">
</div>`;
const heroCss = `
padding: 170px 0 80px;
background: radial-gradient(70% 80% at 80% 0%, rgba(216,188,126,.32), transparent 60%), var(--ink);
.bf { position: relative; }
.bf-head { font-weight: 300; font-size: clamp(4rem, 14vw, 13.5rem); line-height: .86; letter-spacing: -.045em; max-width: 9em; }
.bf-head em { display: block; color: var(--honey); padding-left: .6em; }
.bf-row { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-top: 56px; padding-top: 32px; border-top: 1px solid rgba(235,221,184,.25); align-items: end; }
.bf-card { border: 1px solid var(--honey); border-radius: var(--r-lg); padding: 28px; background: rgba(23,19,14,.6); }
.bf-card .kicker { color: var(--champagne); }
.bf-price { margin-top: 14px; font-size: 3.4rem; font-weight: 300; letter-spacing: -.03em; }
.bf-price s { font-size: 1.4rem; opacity: .55; margin-right: 10px; }
.bf-note { margin-top: 10px; color: rgba(247,241,230,.72); }
.bf-cta .lede { margin-bottom: 28px; }
.bf-img { position: absolute; right: 0; top: -40px; width: 300px; border-radius: 999px 999px var(--r-lg) var(--r-lg); opacity: .9; animation: rise 1.2s ease-out both; }
@keyframes rise { from { transform: translateY(24px); opacity: 0; } }
@media (max-width: 900px) { .bf-row { grid-template-columns: 1fr; } .bf-img { display: none; } .bf-head em { padding-left: 0; } }
@media (prefers-reduced-motion: reduce) { .bf-img { animation: none; } }`;
const globalCss = `
.announce { background: var(--ink); color: var(--champagne); letter-spacing: .04em; }
.announce .dot { background: var(--honey); }
.btn-gold { box-shadow: 0 0 0 1px var(--bronze), 0 10px 30px -8px rgba(216,188,126,.8); }
.plan-gold { box-shadow: 0 0 0 2px var(--honey), var(--shadow); }`;

const good = [
  { op: 'update_global', fields: { css: globalCss, announcement: { text: 'Black Friday: three months free on annual Gold, November 27 to 30.', linkLabel: 'See the offer', href: '/membership' } } },
  { op: 'remove_section', page: 'home', id: 'home-hero' },
  { op: 'add_section', page: 'home', section: { id: 'bf-hero', type: 'custom', dark: true, html: heroHtml, css: heroCss } },
];

let fails = 0;
const expect = (name, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); if (!cond) fails++; };

const site = applyOps(current, good, current);
const r = validate(site, current);
expect('campaign takeover passes every check', r.ok, r.errors.join(' | '));
const html = renderPage(site, 'home');
expect('custom hero rendered and scoped', html.includes('[data-section="bf-hero"]{') && html.includes('Three months <em>free.</em>'));
expect('@keyframes hoisted outside the scope', /@keyframes rise[\s\S]*\[data-section="bf-hero"\]\{/.test(html));
expect('site-wide CSS on every page', renderPage(site, 'treatments').includes('<style id="site-css">'));
expect('nav goes dark over a dark custom hero', html.includes('nav nav-dark') && html.includes('class="has-hero"'));
expect('preview prefixes links inside custom HTML', renderPage(site, 'home', { base: '/view/draft' }).includes('href="/view/draft/membership"'));
expect('the seed site still validates', validate(current).ok);

// Each of these must be blocked, with a readable reason.
const bad = {
  'script tag': { html: '<p>Hi</p><script>alert(1)</script>' },
  'event handler': { html: '<p onclick="steal()">Hi</p>' },
  'javascript: link': { html: '<a href="javascript:alert(1)">Hi</a>' },
  'outside link': { html: '<a href="https://example.com">Hi</a>' },
  'link to missing page': { html: '<a href="/nowhere">Hi</a>' },
  'image not in library': { html: '<p>Hi</p><img src="https://example.com/x.jpg" alt="x">' },
  'iframe': { html: '<p>Hi</p><iframe src="/"></iframe>' },
  'form': { html: '<form><p>Hi</p></form>' },
  'off-brand hex colour': { html: '<p>Hi</p>', css: 'color: #ff0000;' },
  'off-brand rgba colour': { html: '<p>Hi</p>', css: 'background: rgba(0, 120, 255, .5);' },
  'named colour': { html: '<p>Hi</p>', css: '.x { color: red; }' },
  'hsl colour': { html: '<p>Hi</p>', css: 'color: hsl(10 50% 50%);' },
  'non-brand font': { html: '<p>Hi</p>', css: 'font-family: Comic Sans MS;' },
  'font shorthand': { html: '<p>Hi</p>', css: 'font: 12px Arial;' },
  '@import': { html: '<p>Hi</p>', css: '@import url(https://evil.example/x.css);' },
  'outside url()': { html: '<p>Hi</p>', css: 'background: url(https://evil.example/x.png);' },
  'escape the scope': { html: '<p>Hi</p>', css: '} body { display: none; } .x {' },
  'break out of <style>': { html: '<p>Hi</p>', css: '</style><script>alert(1)</script>' },
  'hide the legal text': { html: '<p>Hi</p>', css: '.legal { display: none; }' },
  'off-brand inline style': { html: '<p style="color: #00ff00">Hi</p>' },
  'guaranteed claim in HTML': { html: '<h2>Results <em>guaranteed.</em></h2>' },
  'no prescription in HTML': { html: '<p>Tirzepatide with no prescription needed.</p>' },
  'banned phrase in HTML': { html: '<p>Unlock your potential.</p>' },
  'exclamation in HTML': { html: '<p>Huge sale!</p>' },
  'insecurity in alt text': { html: '<p>Hi</p><img src="/img/hero.jpg" alt="Embarrassed man">' },
};
for (const [name, sec] of Object.entries(bad)) {
  const s = applyOps(current, [{ op: 'add_section', page: 'home', after_id: 'home-hero', section: { id: 'bad', type: 'custom', ...sec } }], current);
  const v = validate(s, current);
  expect(`blocks ${name}`, !v.ok, v.errors[0] || '(no error)');
}
const g = applyOps(current, [{ op: 'update_global', fields: { css: '.footer { display: none }' } }], current);
expect('blocks site-wide CSS hiding the footer', !validate(g, current).ok, validate(g, current).errors[0]);

// Render-time safety even if the checks were skipped
const raw = renderPage(applyOps(current, [{ op: 'add_section', page: 'home', after_id: 'home-hero', section: { id: 'raw', type: 'custom', html: '<p onclick="x()">A</p><script>alert(1)</script><a href="javascript:x()">B</a>', css: '</style><script>alert(2)</script>' } }], current), 'home');
expect('renderer strips scripts and handlers on its own', !/<script>alert|onclick|javascript:/.test(raw));

console.log(fails ? `\n${fails} FAILED` : '\nAll passed');

// Optionally store the takeover as an open draft so the Studio can preview it.
if (process.argv[2]) {
  const store = require(path.join(repo, 'src/store'));
  store.init(true);
  const st = store.state();
  st.draft = { content: site, summary: 'Test: Black Friday takeover (hand-built)', changes: [{ what: 'Campaign hero, site-wide campaign styling', why: 'Test fixture' }], report: r, needs: [], declined: [] };
  store.save(st);
  console.log('Draft written to', process.argv[2]);
}
process.exit(fails ? 1 : 0);
