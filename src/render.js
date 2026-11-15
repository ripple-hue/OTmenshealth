'use strict';
// Section library. Every page is a list of sections from content/site.json,
// and each section type below is the only way content reaches the page.
// `custom` sections and `global.css` carry HTML and CSS the agent wrote; src/code.js sanitises them.

const code = require('./code');

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Headlines mark their one accent word with *asterisks*: "Own Your *Health.*"
const rich = (s) => esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>');

// Previews are served under a prefix (e.g. /view/draft); page links get that prefix, assets do not.
let BASE = '';
const isAsset = (h) => /^\/(img|fonts|media|vendor)\//.test(h) || h === '/styles.css';
const safeHref = (h) => {
  h = String(h || '');
  if (/^(https?:\/\/|mailto:|tel:)/i.test(h)) return esc(h);
  if (!/^(\/|#)/.test(h)) return '#';
  return esc(h.startsWith('/') && BASE && !isAsset(h) ? BASE + h : h);
};

const eyebrow = (t) => (t ? `<p class="eyebrow"><span class="dot"></span>${esc(t)}</p>` : '');

const arrow =
  '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const tick =
  '<svg class="tick" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="8"/><path d="M4.6 8.2l2.2 2.2 4.6-4.8" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const logo = `<svg class="logo" viewBox="0 0 66 26" role="img" aria-label="OT"><path fill-rule="evenodd" d="M13 0h6a13 13 0 0 1 0 26h-6a13 13 0 0 1 0-26zm1 8.5a4.5 4.5 0 0 0 0 9h4a4.5 4.5 0 0 0 0-9z"/><path d="M35 0h31v8.5H55.5V26h-10V8.5H35z"/></svg>`;

const THEMES = ['paper', 'cream', 'champagne', 'ink'];
const theme = (s, def = 'paper') => ` theme-${THEMES.includes(s.theme) ? s.theme : def}`;

const btnPrimary = (c) => (c ? `<a class="btn btn-gold" href="${safeHref(c.href)}">${esc(c.label)}</a>` : '');
const btnInk = (c) =>
  c ? `<a class="btn btn-ink" href="${safeHref(c.href)}"><span>${esc(c.label)}</span><i>${arrow}</i></a>` : '';
const textLink = (c) => (c ? `<a class="text-link" href="${safeHref(c.href)}">${esc(c.label)}</a>` : '');

/* ---------- small built-in visuals ---------- */

const visuals = {
  checklist: () => `
    <div class="mock">
      <ul class="mock-list">
        ${['Choose your plan', 'Your details', 'Payment', 'Schedule your draw'].map((t) => `<li>${tick}<span>${t}</span></li>`).join('')}
      </ul>
      <p class="mock-foot"><b>Done</b><span>Under 5 minutes</span></p>
    </div>`,
  plan: () => `
    <div class="mock">
      <p class="mock-head">Your care team</p>
      <p class="mock-chips"><span>Bloodwork</span><span>Lifestyle</span><span>Goals</span></p>
      <p class="mock-ready"><b>Your plan</b><span>Ready</span></p>
    </div>`,
  trend: () => `
    <div class="mock">
      <p class="mock-head">Vitamin D <span>Sample</span></p>
      <svg class="mock-chart" viewBox="0 0 240 70" preserveAspectRatio="none" aria-hidden="true">
        <rect x="0" y="14" width="240" height="26" rx="4" class="band"/>
        <path d="M14 56 C70 54 110 34 226 24" fill="none" class="line"/>
        <circle cx="14" cy="56" r="4" class="pt-open"/><circle cx="226" cy="24" r="4.5" class="pt"/>
      </svg>
      <p class="mock-foot"><span>Draw 1</span><span>Retest</span></p>
    </div>`,
  report: () => {
    const rows = [
      ['Vitamin D', 'Draw 1', 28],
      ['Vitamin D', 'Retest', 62],
      ['Marker 02', 'In range', 55],
      ['Marker 03', 'Review', 84],
    ];
    return `
    <div class="report" aria-label="Sample results report">
      <p class="report-head"><b>Your results</b><span>Sample report</span></p>
      ${rows
        .map(
          ([n, s, p]) => `
        <div class="report-row">
          <p><b>${n}</b><span>${s}</span></p>
          <div class="range"><i style="left:${p}%"></i></div>
        </div>`
        )
        .join('')}
      <p class="report-foot">${tick}<span>Reviewed by a licensed provider</span></p>
    </div>`;
  },
};

const plate = (word, code) => `
  <div class="plate">
    <span class="plate-code">${esc(code)}</span>
    <p><em>${esc(word)}</em></p>
    <span class="plate-rule"></span>
  </div>`;

const keyTag = (tier, name) => `
  <div class="keytag keytag-${esc(tier)}" aria-hidden="true">
    <span class="keytag-hole"></span>
    <span class="keytag-mark">${logo}</span>
    <span class="keytag-text"><b>OT ${esc(name)}</b><small>Member</small></span>
    <span class="keytag-bars"></span>
  </div>`;

/* ---------- sections ---------- */

const sections = {
  hero: (s) => `
    <section class="hero" data-section="${esc(s.id)}">
      <img class="hero-img" src="${safeHref(s.image)}" alt="${esc(s.imageAlt)}" fetchpriority="high">
      <div class="wrap hero-inner">
        ${eyebrow(s.eyebrow)}
        <h1 class="display">${rich(s.headline)}</h1>
        <div class="hero-foot">
          <div>
            ${s.chips?.length ? `<p class="chips">${s.chips.map((c) => `<span>${esc(c)}</span>`).join('')}</p>` : ''}
            <p class="lede">${esc(s.body)}</p>
          </div>
          <p class="actions">${btnPrimary(s.cta)}${textLink(s.link)}</p>
        </div>
      </div>
    </section>`,

  facts: (s) => `
    <section class="facts" data-section="${esc(s.id)}">
      <div class="wrap facts-grid">
        ${s.items.map((i) => `<p><b>${esc(i.value)}</b><span>${esc(i.label)}</span></p>`).join('')}
      </div>
    </section>`,

  steps: (s) => `
    <section class="band${theme(s)}" id="${esc(s.anchor || s.id)}" data-section="${esc(s.id)}">
      <div class="wrap">
        <header class="head head-center">${eyebrow(s.eyebrow)}<h2 class="title">${rich(s.headline)}</h2></header>
        <ol class="steps${s.variant === 'staggered' ? ' steps-staggered' : ''}">
          ${s.steps
            .map(
              (st, i) => `
            <li class="step">
              <span class="num">0${i + 1}</span>
              <h3>${esc(st.title)}</h3>
              <p>${esc(st.body)}</p>
              ${visuals[st.visual] ? visuals[st.visual]() : ''}
            </li>`
            )
            .join('')}
        </ol>
        <p class="actions actions-center">${btnInk(s.cta)}</p>
      </div>
    </section>`,

  feature: (s) => `
    <section class="band${theme(s, 'cream')}" data-section="${esc(s.id)}">
      <div class="wrap feature${s.flip ? ' feature-flip' : ''}">
        <div class="feature-copy">
          ${eyebrow(s.eyebrow)}
          <h2 class="title">${rich(s.headline)}</h2>
          <p class="lede">${esc(s.body)}</p>
          ${s.points?.length ? `<ul class="points">${s.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
          <p class="actions">${textLink(s.link)}</p>
        </div>
        <div class="feature-visual">${s.image ? `<img class="feature-img" src="${safeHref(s.image)}" alt="${esc(s.imageAlt)}" loading="lazy">` : visuals[s.visual] ? visuals[s.visual]() : ''}</div>
      </div>
    </section>`,

  tracks: (s) => `
    <section class="band${theme(s)}" data-section="${esc(s.id)}">
      <div class="wrap">
        <header class="head head-split">
          <div>${eyebrow(s.eyebrow)}<h2 class="title">${rich(s.headline)}</h2></div>
          <p class="aside">${esc(s.aside)}</p>
        </header>
        <div class="cards${s.variant === 'expand' ? ' cards-expand' : ''}">
          ${s.items
            .map(
              (t) => `
            <a class="card" href="${safeHref(t.href)}">
              <span class="card-img"><img src="${safeHref(t.image)}" alt="${esc(t.imageAlt)}" loading="lazy"><span class="code">${esc(t.code)}</span></span>
              <span class="card-body">
                <span class="kicker">${esc(t.kicker)}</span>
                <span class="card-title">${esc(t.title)}</span>
                <span class="card-text">${esc(t.body)}</span>
              </span>
            </a>`
            )
            .join('')}
        </div>
        <p class="actions actions-center">${textLink(s.link)}</p>
      </div>
    </section>`,

  plansTeaser: (s) => `
    <section class="band${theme(s, 'cream')}" data-section="${esc(s.id)}">
      <div class="wrap teaser">
        <div class="teaser-copy">
          ${eyebrow(s.eyebrow)}
          <h2 class="title">${rich(s.headline)}</h2>
          <p class="lede">${esc(s.body)}</p>
          <p class="actions">${btnInk(s.cta)}</p>
        </div>
        <div class="teaser-plans${s.variant === 'tilted' ? ' teaser-tilted' : ''}">
          ${s.plans
            .map(
              (p) => `
            <div class="mini mini-${esc(p.tier)}">
              ${keyTag(p.tier, p.name)}
              <p class="mini-price"><b>${esc(p.price)}</b><span>${esc(p.per)}</span></p>
              <p class="mini-note">${esc(p.note)}</p>
            </div>`
            )
            .join('')}
        </div>
      </div>
    </section>`,

  faq: (s) => `
    <section class="band${theme(s)}" data-section="${esc(s.id)}">
      <div class="wrap faq">
        <header class="head">${eyebrow(s.eyebrow)}<h2 class="title">${rich(s.headline)}</h2></header>
        <div class="faq-list">
          ${s.items.map((i) => `<details><summary>${esc(i.q)}<i></i></summary><p>${esc(i.a)}</p></details>`).join('')}
        </div>
      </div>
    </section>`,

  cta: (s) => `
    <section class="closing${s.variant === 'image' ? ' closing-image' : theme(s, 'champagne')}" data-section="${esc(s.id)}">
      <div class="wrap closing-inner">
        ${s.variant === 'image' ? `<img class="closing-bg" src="${safeHref(s.image || '/img/hero.jpg')}" alt="" loading="lazy">` : ''}
        <h2 class="title">${rich(s.headline)}</h2>
        <p class="lede">${esc(s.body)}</p>
        <p class="actions actions-center">${btnPrimary(s.cta)}</p>
      </div>
    </section>`,

  statement: (s) => `
    <section class="statement${theme(s, 'ink')}" data-section="${esc(s.id)}">
      <div class="wrap">
        ${eyebrow(s.eyebrow)}
        <h2 class="display">${rich(s.headline)}</h2>
        ${s.body || s.cta ? `<div class="statement-foot">${s.body ? `<p class="lede">${esc(s.body)}</p>` : ''}<p class="actions">${btnPrimary(s.cta)}${textLink(s.link)}</p></div>` : ''}
      </div>
    </section>`,

  marquee: (s) => `
    <section class="marquee${theme(s, 'champagne')}" data-section="${esc(s.id)}" aria-label="${esc(s.label || 'What we offer')}">
      <div class="marquee-track">
        ${[0, 1].map((n) => `<p${n ? ' aria-hidden="true"' : ''}>${(s.items || []).map((i) => `<span>${esc(i)}</span>`).join('')}</p>`).join('')}
      </div>
    </section>`,

  promo: (s) => `
    <section class="promo" data-section="${esc(s.id)}">
      <div class="wrap promo-inner">
        <div>
          ${eyebrow(s.eyebrow)}
          <h2 class="title">${rich(s.headline)}</h2>
          <p class="lede">${esc(s.body)}</p>
        </div>
        <div class="promo-side">
          ${s.offer ? `<p class="promo-offer"><b>${esc(s.offer)}</b>${s.offerNote ? `<span>${esc(s.offerNote)}</span>` : ''}</p>` : ''}
          <p class="actions">${btnPrimary(s.cta)}</p>
          ${s.terms ? `<p class="promo-terms">${esc(s.terms)}</p>` : ''}
        </div>
      </div>
    </section>`,

  pageHeader: (s) => `
    <section class="page-head" data-section="${esc(s.id)}">
      <div class="wrap">
        ${eyebrow(s.eyebrow)}
        <h1 class="title title-xl">${rich(s.headline)}</h1>
        <p class="lede">${esc(s.body)}</p>
        ${s.chips?.length ? `<p class="chips chips-light">${s.chips.map((c) => `<span>${esc(c)}</span>`).join('')}</p>` : ''}
      </div>
    </section>`,

  trackList: (s) => `
    <section class="band band-tight" data-section="${esc(s.id)}">
      <div class="wrap rows">
        ${s.items
          .map(
            (t) => `
          <article class="row" id="${esc(t.anchor)}">
            <div class="row-visual">
              ${
                t.image
                  ? `<img src="${safeHref(t.image)}" alt="${esc(t.imageAlt)}" loading="lazy">`
                  : t.visual === 'report'
                  ? `<div class="row-panel">${visuals.report()}</div>`
                  : plate(t.plateWord || t.title, t.code)
              }
            </div>
            <div class="row-copy">
              <p class="row-meta"><span class="code code-inline">${esc(t.code)}</span><span class="kicker">${esc(t.kicker)}</span></p>
              <h2 class="row-title">${esc(t.title)}</h2>
              <p class="lede">${esc(t.body)}</p>
              <p class="chips chips-light">${(t.tags || []).map((c) => `<span>${esc(c)}</span>`).join('')}</p>
              ${t.rx ? '<p class="rx">Prescription required. A licensed provider decides whether treatment is right for you.</p>' : ''}
            </div>
          </article>`
          )
          .join('')}
      </div>
    </section>`,

  plans: (s) => `
    <section class="page-head page-head-center" data-section="${esc(s.id)}">
      <div class="wrap">
        ${eyebrow(s.eyebrow)}
        <h1 class="title title-xl">${rich(s.headline)}</h1>
        <p class="lede">${esc(s.body)}</p>
        <div class="plans">
          ${s.plans
            .map(
              (p) => `
            <article class="plan plan-${esc(p.tier)}">
              <div class="plan-top">${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ''}${keyTag(p.tier, p.name)}</div>
              <div class="plan-body">
                <p class="kicker">${esc(p.name)}</p>
                <p class="price"><b>${esc(p.price)}</b><span>${esc(p.per)}</span></p>
                <p class="annual">${esc(p.annual)}${p.annualWas ? ` <s>${esc(p.annualWas)}</s>` : ''}</p>
                ${p.offer ? `<p class="offer">${esc(p.offer)}</p>` : ''}
                <p class="plan-tagline">${esc(p.tagline)}</p>
                ${p.groups
                  .map(
                    (g) => `
                  <p class="group-label"><span>${esc(g.label)}</span></p>
                  <ul class="includes">
                    ${g.items.map((i) => `<li>${tick}<span>${esc(i.text)}${i.value ? `<small>${esc(i.value)}</small>` : ''}</span></li>`).join('')}
                  </ul>`
                  )
                  .join('')}
                <p class="plan-cta">${p.tier === 'gold' ? btnPrimary(p.cta) : `<a class="btn btn-line" href="${safeHref(p.cta.href)}">${esc(p.cta.label)}</a>`}</p>
              </div>
            </article>`
            )
            .join('')}
        </div>
        ${s.footnote ? `<p class="footnote">${esc(s.footnote)}</p>` : ''}
      </div>
    </section>`,

  compare: (s) => `
    <section class="band${theme(s, 'cream')}" data-section="${esc(s.id)}">
      <div class="wrap compare">
        <header class="head head-center">${eyebrow(s.eyebrow)}<h2 class="title">${rich(s.headline)}</h2></header>
        <table>
          <thead><tr><th></th>${s.columns.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead>
          <tbody>
            ${s.rows
              .map(
                (r) => `<tr><th scope="row">${esc(r.label)}</th>${r.values
                  .map((v) => `<td>${v === true ? `${tick}<span class="sr">Included</span>` : v === false ? '<span class="dash" aria-label="Not included">–</span>' : esc(v)}</td>`)
                  .join('')}</tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </section>`,
};

// Runs agent JavaScript once the page and its libraries (Lenis, global.scripts) have loaded.
const afterLoad = (js, setup = '') => `<script>document.addEventListener('DOMContentLoaded',function(){${setup}\n${code.cleanJs(js)}\n});</script>`;

// A section the agent designed itself: its own HTML, CSS scoped to this section, and optional JavaScript
// (`js`, which receives the section element as `section`).
sections.custom = (s) => {
  const css = code.scopeCss(s.id, s.css);
  const id = String(s.id).replace(/["\\]/g, '');
  return `
    <section class="custom${s.theme ? theme(s) : ''}${s.dark ? ' custom-dark' : ''}" data-section="${esc(s.id)}"${s.anchor ? ` id="${esc(s.anchor)}"` : ''}>
      ${css ? `<style>${css}</style>` : ''}
      ${code.sanitizeHtml(s.html, (h) => (BASE && !isAsset(h) ? BASE + h : h))}
    </section>${s.js ? afterLoad(s.js, `var section=document.querySelector('[data-section="${id}"]');`) : ''}`;
};

// Smooth scrolling (Lenis, MIT licence) on every page unless global.smoothScroll is false.
// Mouse and trackpad only: touch keeps native scrolling. Off for visitors who ask for reduced motion.
const LENIS_INIT = `<script>document.addEventListener('DOMContentLoaded',function(){if(!window.Lenis||matchMedia('(prefers-reduced-motion: reduce)').matches)return;window.lenis=new Lenis({autoRaf:true,anchors:{offset:-100},allowNestedScroll:true});});</script>`;

// In Studio previews, which run sandboxed, the page reports its scroll position to the Studio and
// follows the other pane when asked (the Studio can't reach into a sandboxed page directly).
const PREVIEW_SYNC = `<script>(function(){var lock=0;function frac(){var d=document.documentElement;return window.scrollY/Math.max(1,d.scrollHeight-window.innerHeight)}window.addEventListener('scroll',function(){if(Date.now()<lock)return;parent.postMessage({ot:'scroll',f:frac()},'*')},{passive:true});window.addEventListener('message',function(e){if(!e.data||e.data.ot!=='scrollto')return;lock=Date.now()+120;var d=document.documentElement,y=e.data.f*(d.scrollHeight-window.innerHeight);if(window.lenis)window.lenis.scrollTo(y,{immediate:true});else window.scrollTo(0,y)})})();</script>`;

const heroPhoto = sections.hero;

const heroCopy = (s) => `
          ${eyebrow(s.eyebrow)}
          <h1 class="display">${rich(s.headline)}</h1>
          <p class="lede">${esc(s.body)}</p>
          <p class="actions">${btnPrimary(s.cta)}${textLink(s.link)}</p>
          ${s.chips?.length ? `<p class="chips">${s.chips.map((c) => `<span>${esc(c)}</span>`).join('')}</p>` : ''}`;

const heroArch = (s) => `
    <section class="hero hero-arch" data-section="${esc(s.id)}">
      <div class="wrap hero-inner">
        <div class="hero-copy">${heroCopy(s)}</div>
        <div class="hero-art">
          <div class="arch"><img src="${safeHref(s.image)}" alt="${esc(s.imageAlt)}" fetchpriority="high"></div>
          ${s.tag === 'gold' || s.tag === 'silver' ? keyTag(s.tag, s.tag === 'gold' ? 'Gold' : 'Silver') : ''}
          ${s.note ? `<p class="hero-note">${tick}<span>${esc(s.note)}</span></p>` : ''}
        </div>
      </div>
    </section>`;

const heroStatement = (s) => `
    <section class="hero hero-statement" data-section="${esc(s.id)}">
      <div class="wrap hero-inner">${heroCopy(s)}</div>
    </section>`;

sections.hero = (s) => (s.variant === 'arch' ? heroArch(s) : s.variant === 'statement' ? heroStatement(s) : heroPhoto(s));

/* ---------- page shell ---------- */

function header(g, overHero) {
  return `
  <a class="announce" href="${safeHref(g.announcement.href)}"><span class="dot"></span>${esc(g.announcement.text)} <u>${esc(g.announcement.linkLabel)}</u></a>
  <header class="nav${overHero ? ' nav-dark' : ''}" data-nav>
    <a class="nav-logo" href="${safeHref('/')}" aria-label="OTMENS home">${logo}</a>
    <nav class="nav-links" aria-label="Main">${g.nav.map((n) => `<a href="${safeHref(n.href)}">${esc(n.label)}</a>`).join('')}</nav>
    <span class="nav-end">
      <a class="nav-login" href="${safeHref('/portal')}">Log in</a>
      <a class="btn btn-gold btn-sm" href="${safeHref(g.navCta.href)}">${esc(g.navCta.label)}</a>
    </span>
  </header>`;
}

function footer(g) {
  return `
  <footer class="footer">
    <div class="wrap footer-inner">
      <div>${logo}<p class="footer-line">${esc(g.footer.line)}</p></div>
      <nav aria-label="Footer">${g.nav.map((n) => `<a href="${safeHref(n.href)}">${esc(n.label)}</a>`).join('')}<a href="${safeHref('/portal')}">Log in</a></nav>
      <p class="legal">${esc(g.footer.legal)}</p>
    </div>
  </footer>`;
}

function highlightScript(ids, scroll) {
  return `<style>.ot-changed{outline:2px solid #D8BC7E;outline-offset:-2px;position:relative}.ot-changed::before{content:"Changed";position:absolute;z-index:30;top:10px;right:10px;background:#D8BC7E;color:#17130E;font:500 11px/1 "Helvetica Neue",Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;padding:7px 10px;border-radius:99px}</style>
<script>(function(){var ids=${JSON.stringify(ids)};var first;ids.forEach(function(id){var el=document.querySelector('[data-section="'+id+'"]');if(el){el.classList.add('ot-changed');first=first||el}});if(${scroll ? 'true' : 'false'}&&first&&first!==document.querySelector('main>section'))setTimeout(function(){first.scrollIntoView({block:'center'})},150)})();</script>`;
}

function renderPage(site, key, opts = {}) {
  BASE = opts.base || '';
  try {
    return renderPageInner(site, key, opts);
  } finally {
    BASE = '';
  }
}

function renderPageInner(site, key, opts) {
  const page = site.pages[key];
  const g = site.global;
  const first = page.sections[0];
  const overHero = first?.type === 'hero' || (first?.type === 'custom' && !!first.dark);
  const siteCss = g.css ? code.cleanGlobalCss(g.css) : '';
  const body = page.sections
    .map((s) => {
      const fn = sections[s.type];
      if (!fn) throw new Error(`Unknown section type "${s.type}" in page "${key}"`);
      return fn(s);
    })
    .join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
<link rel="preload" href="/fonts/instrument-serif-latin-400-italic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/styles.css">
${siteCss ? `<style id="site-css">${siteCss}</style>` : ''}
${g.smoothScroll === false ? '' : '<script src="/vendor/lenis.min.js" defer></script>'}
${(Array.isArray(g.scripts) ? g.scripts : []).map((u) => `<script src="${esc(u)}" defer></script>`).join('\n')}
</head>
<body class="${overHero ? 'has-hero' : ''}">
${header(g, overHero)}
<main>
${body}
</main>
${footer(g)}
<script>
(function(){var n=document.querySelector('[data-nav]');if(!n)return;var f=function(){n.classList.toggle('is-stuck',window.scrollY>40)};f();window.addEventListener('scroll',f,{passive:true})})();
</script>
${g.smoothScroll === false ? '' : LENIS_INIT}
${g.js ? afterLoad(g.js) : ''}
${opts.base ? PREVIEW_SYNC : ''}
${opts.highlight?.length ? highlightScript(opts.highlight, opts.scroll !== false) : ''}
</body>
</html>`;
}

function renderLocked(site, name, opts = {}) {
  BASE = opts.base || '';
  try {
    return renderLockedInner(site, name);
  } finally {
    BASE = '';
  }
}

function renderLockedInner(site, name) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(name)}. OTMENS</title><link rel="stylesheet" href="/styles.css"></head>
<body>${header(site.global, false)}<main><section class="page-head page-head-center"><div class="wrap">${eyebrow('Protected area')}<h1 class="title title-xl">${esc(name)} is <em>off limits.</em></h1><p class="lede">This part of the site is outside the demo. The site agent cannot read or change it.</p><p class="actions actions-center">${textLink({ label: 'Back to the site', href: '/' })}</p></div></section></main>${footer(site.global)}</body></html>`;
}

// Areas the site agent must never touch. They exist only as placeholders.
const LOCKED = { '/checkout': 'Checkout', '/portal': 'The member portal', '/intake': 'Medical intake' };

module.exports = { renderPage, renderLocked, LOCKED, THEMES, sectionTypes: Object.keys(sections) };
