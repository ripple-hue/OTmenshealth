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

// Allowed since 15 November 2026 (the owner removed the no-JavaScript rule): each must pass.
const allowed = {
  'script tag': { html: '<p>Hello there</p><script>console.log(1)</script>' },
  'event handler': { html: '<button onclick="this.classList.toggle(\'open\')">Show the plans</button>' },
  'outside link': { html: '<a href="https://example.com">Read more about bloodwork</a>' },
  'outside image': { html: '<p>Hi there</p><img src="https://example.com/x.jpg" alt="A stone block">' },
  'iframe': { html: '<p>Hi there</p><iframe src="https://example.com/embed" title="Map"></iframe>' },
  'form and inputs': { html: '<form><label>Your goal <select><option>Energy</option></select></label><button>Next</button></form>' },
  'outside url() image': { html: '<p>Hi there</p>', css: 'background: url(https://example.com/x.png);' },
  'one campaign accent in several shades': { html: '<p class="a">Black Friday</p>', css: 'color: #b3202a; .a { background: linear-gradient(#5c0f14, #b3202a); border-color: rgba(179, 32, 42, .4); }' },
  'brand shades, neutrals and hsl': { html: '<p class="a">Hello there</p>', css: 'color: #3a2a12; background: #ffffff; .a { color: hsl(40 60% 70%); border-color: #888; box-shadow: 0 20px 60px rgba(0,0,0,.4); }' },
  'a neutral named colour': { html: '<p class="a">Hello there</p>', css: '.a { color: white; background: black; }' },
  'section js': { html: '<p class="n">0</p>', js: 'section.querySelector(".n").textContent = "Two plans";' },
  'interactive quiz': {
    html: '<div class="q"><p class="q-text">What matters most to you?</p><button data-a="care">A care team</button><button data-a="numbers">Just my numbers</button><p class="q-result"></p></div>',
    js: 'section.querySelectorAll("button").forEach(function (b) { b.addEventListener("click", function () { section.querySelector(".q-result").textContent = b.dataset.a === "care" ? "Gold suits you: a dedicated advisor and concierge care." : "Silver covers your bloodwork."; }); });',
  },
};
for (const [name, sec] of Object.entries(allowed)) {
  const s = applyOps(current, [{ op: 'add_section', page: 'home', after_id: 'home-hero', section: { id: 'ok', type: 'custom', ...sec, html: `<div class="wrap">${sec.html}</div>` } }], current);
  const v = validate(s, current);
  expect(`allows ${name}`, v.ok, v.errors[0] || '');
}
const gl = applyOps(current, [{ op: 'update_global', fields: { scripts: ['https://cdn.jsdelivr.net/npm/some-lib@1.0.0/dist/lib.min.js'], js: 'document.documentElement.classList.add("js-ready");' } }], current);
expect('allows site-wide scripts and global.js', validate(gl, current).ok, validate(gl, current).errors[0] || '');

// Each of these must be blocked, with a readable reason.
const bad = {
  'link to missing page': { html: '<a href="/nowhere">Hi</a>' },
  'missing library image': { html: '<p>Hi</p><img src="/img/nope.jpg" alt="x">' },
  'page-level tag': { html: '<p>Hi</p><base href="https://evil.example/">' },
  'script that does not parse': { html: '<p>Hi there</p>', js: 'function ( {' },
  'script hiding the legal text': { html: '<p>Hi there</p>', js: 'document.querySelector(".legal").remove();' },
  'script hiding the footer': { html: '<p>Hi there</p>', js: 'document.querySelector("footer").style.display = "none";' },
  'claim inside a script': { html: '<p class="x">Hi</p>', js: 'section.querySelector(".x").textContent = "Results guaranteed in 30 days.";' },
  'no prescription inside a <script>': { html: '<p class="x">Hi</p><script>document.querySelector(".x").textContent = "No prescription needed";</script>' },
  'claim in an inline handler': { html: '<button onclick="alert(\'Guaranteed results\')">Go on then</button>' },
  'GSAP in a section': { html: '<p>Hi there</p>', js: 'gsap.to(section, { opacity: 1 });' },
  'two accent colours in one section': { html: '<p>Hi</p>', css: 'color: #b3202a; .x { background: #1e5bb8; }' },
  'a second accent in a <style> block': { html: '<p>Hi</p><style>.x { color: #1e5bb8; }</style>', css: 'color: #b3202a;' },
  'a non-neutral named colour': { html: '<p>Hi</p>', css: '.x { color: red; }' },
  'an unreadable colour notation': { html: '<p>Hi</p>', css: 'color: oklch(0.6 0.2 30);' },
  'non-brand font': { html: '<p>Hi</p>', css: 'font-family: Comic Sans MS;' },
  'font shorthand': { html: '<p>Hi</p>', css: 'font: 12px Arial;' },
  '@import': { html: '<p>Hi</p>', css: '@import url(https://evil.example/x.css);' },
  'a web font': { html: '<p>Hi</p>', css: '@font-face { font-family: X; src: url(https://example.com/x.woff2); }' },
  'escape the scope': { html: '<p>Hi</p>', css: '} body { display: none; } .x {' },
  'break out of <style>': { html: '<p>Hi</p>', css: '</style><script>alert(1)</script>' },
  'hide the legal text': { html: '<p>Hi</p>', css: '.legal { display: none; }' },
  'a second accent in an inline style': { html: '<p style="color: #1e8a3c">Hi</p>', css: 'color: #b3202a;' },
  'guaranteed claim in HTML': { html: '<h2>Results <em>guaranteed.</em></h2>' },
  'no prescription in HTML': { html: '<p>Tirzepatide with no prescription needed.</p>' },
  'banned phrase in HTML': { html: '<p>Unlock your potential.</p>' },
  'exclamation in HTML': { html: '<p>Huge sale!</p>' },
  'insecurity in alt text': { html: '<p>Hi</p><img src="/img/hero.jpg" alt="Embarrassed man">' },
};
for (const [name, sec] of Object.entries(bad)) {
  const s = applyOps(current, [{ op: 'add_section', page: 'home', after_id: 'home-hero', section: { id: 'bad', type: 'custom', ...sec, html: `<div class="wrap">${sec.html}</div>` } }], current);
  const v = validate(s, current);
  expect(`blocks ${name}`, !v.ok, v.errors[0] || '(no error)');
}
const noWrap = applyOps(current, [{ op: 'add_section', page: 'home', after_id: 'home-hero', section: { id: 'edge', type: 'custom', html: '<h2 class="title">Text with no container</h2>' } }], current);
expect('blocks a custom section with no .wrap container', !validate(noWrap, current).ok, validate(noWrap, current).errors[0]);

// Image generation off (photosOnly): only the OTMENS photos in new drafts; pictures already on the site stay allowed.
const withPic = (src, css) => applyOps(current, [{ op: 'add_section', page: 'home', after_id: 'home-hero', section: { id: 'pic', type: 'custom', html: `<div class="wrap"><p>Hi there</p>${src ? `<img src="${src}" alt="x">` : ''}</div>`, ...(css ? { css } : {}) } }], current);
const po = { photosOnly: true };
expect('photos only: a library photo is fine', validate(withPic('/img/hormone.jpg'), current, po).ok, validate(withPic('/img/hormone.jpg'), current, po).errors[0] || '');
expect('photos only: blocks a stored generated image', !validate(withPic('/media/gen-old-slop.png'), current, po).ok, validate(withPic('/media/gen-old-slop.png'), current, po).errors[0]);
expect('photos only: blocks an outside image', !validate(withPic('https://example.com/stock.jpg'), current, po).ok);
expect('photos only: blocks a generated image in CSS', !validate(withPic('', 'background: url(/media/gen-old-slop.png);'), current, po).ok);
const prevWithMedia = applyOps(current, [{ op: 'update_section', page: 'home', id: 'home-hero', fields: { image: '/img/hero.jpg', note: '/media/gen-already-live.webp' } }], current);
expect('photos only: a picture already on the site stays allowed', validate(withPic('/media/gen-already-live.webp'), prevWithMedia, po).errors.every((e) => !/OTMENS photos/.test(e)));

const globalBad = {
  'site-wide CSS hiding the footer': { css: '.footer { display: none }' },
  'site-wide JS hiding the legal text': { js: 'document.querySelectorAll(".legal").forEach(function (e) { e.remove(); });' },
  'GSAP in global.scripts': { scripts: ['https://cdn.jsdelivr.net/npm/gsap@3.15.1/dist/gsap.min.js'] },
  'a plain-http script': { scripts: ['http://example.com/x.js'] },
  'more than six scripts': { scripts: Array.from({ length: 7 }, (_, i) => `https://example.com/${i}.js`) },
};
for (const [name, fields] of Object.entries(globalBad)) {
  const s = applyOps(current, [{ op: 'update_global', fields }], current);
  const v = validate(s, current);
  expect(`blocks ${name}`, !v.ok, v.errors[0] || '(no error)');
}

// What the renderer puts on the page
const withJs = applyOps(current, [
  { op: 'update_global', fields: { scripts: ['https://cdn.example.com/lib@1.0.0/lib.js'], js: 'window.__site = 1;' } },
  { op: 'add_section', page: 'home', after_id: 'home-hero', section: { id: 'quiz', type: 'custom', html: '<div class="wrap"><p class="x">Hi</p></div>', js: 'section.dataset.ready = "1";' } },
], current);
const page = renderPage(withJs, 'home');
expect('section js runs after load with `section` set', page.includes(`var section=document.querySelector('[data-section="quiz"]');`) && page.includes('section.dataset.ready'));
expect('global.scripts load in the head, deferred', /<script src="https:\/\/cdn\.example\.com\/lib@1\.0\.0\/lib\.js" defer><\/script>[\s\S]*<\/head>/.test(page) && page.indexOf('lib.js') < page.indexOf('</head>'));
expect('motion starts before any agent code (Lenis exists when section js runs)', page.indexOf('new Lenis(') < page.indexOf('</head>') && page.indexOf('new Lenis(') < page.indexOf('section.dataset.ready'));
expect('Lenis runs on the Motion frame loop when Motion is loaded', page.includes('M.frame.update(') && page.includes('autoRaf:!sync'));
expect('reduced motion makes Motion animations jump to the end', page.includes('MotionGlobalConfig.skipAnimations=true'));
{
  const early = applyOps(current, [{ op: 'add_section', page: 'home', after_id: 'home-hero', section: { id: 'early', type: 'custom', html: '<div class="wrap"><p>Hi there</p></div>', js: 'var el = section.querySelector(".x"); if (!el) return; el.hidden = false;' } }], current);
  const r = validate(early, current);
  expect('an early `return` in section js is allowed (it runs inside a function)', !r.errors.some((e) => /parse/.test(e)), r.errors.join(' | '));
}
expect('global.js is on the page', page.includes('window.__site = 1;'));
expect('Lenis smooth scrolling is on by default', page.includes('/vendor/lenis.min.js') && page.includes('new Lenis('));
const noSmooth = renderPage(applyOps(current, [{ op: 'update_global', fields: { smoothScroll: false } }], current), 'home');
expect('smoothScroll: false turns Lenis off', !noSmooth.includes('lenis.min.js') && !noSmooth.includes('new Lenis(') && noSmooth.includes('skipAnimations'));
expect('preview scroll sync only in Studio previews', !page.includes("ot:'scroll'") && renderPage(withJs, 'home', { base: '/view/draft' }).includes("ot:'scroll'"));
const { renderLocked } = require(path.join(repo, 'src/render'));
const locked = renderLocked(withJs, 'Checkout');
expect('protected pages get none of the agent code', !locked.includes('window.__site') && !locked.includes('cdn.example.com') && !locked.includes('lenis'));
{
  // Shader backgrounds: the helper loads only when agent code uses it; its colours obey the palette.
  const shader = (colors) => applyOps(current, [{ op: 'update_global', fields: { js: `if (window.OTShader) OTShader.mount(document.body, {colors: ${JSON.stringify(colors)}});` } }], current);
  expect('the shader helper loads only when agent code uses OTShader', renderPage(shader(['#8a6236']), 'home').includes('/vendor/ot-shader.js') && !page.includes('ot-shader.js'));
  expect('shader colours in scripts count toward the one accent', !validate(shader(['#7a1414', '#1d4d8a']), current).ok);
  expect('brand shader colours with one accent pass', validate(shader(['#7a1414', '#8a6236', '#0c0a08']), current).ok);
  const { paperFile } = require(path.join(repo, 'src/shader'));
  expect('Paper Shaders files are served, and nothing outside them', !!paperFile('/vendor/paper/shaders/grain-gradient.js') && !paperFile('/vendor/paper/../package.json') && !paperFile('/vendor/paper/shaders/../../index.d.ts'));
}
expect('a stray </script in agent js cannot end the tag early', renderPage(applyOps(current, [{ op: 'update_global', fields: { js: 'var s = "</script><b>x</b>";' } }], current), 'home').includes('<\\/script><b>x</b>'));

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
