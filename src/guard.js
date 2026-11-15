'use strict';
// Hard checks every draft must pass before Jacob can approve it.
// These run in code, after the agent has written a draft, and the agent cannot skip them.

const fs = require('fs');
const path = require('path');
const { renderPage, LOCKED, sectionTypes } = require('./render');
const code = require('./code');

const IMAGES_DIR = path.join(__dirname, '..', 'public', 'img');
const VISUALS = ['checklist', 'plan', 'trend', 'report', 'plate'];

// The section library, as the agent sees it. `req` fields must be present and non-empty.
const THEMES = ['paper', 'cream', 'champagne', 'ink'];
const VARIANTS = { hero: ['photo', 'arch', 'statement'], steps: ['cards', 'staggered'], tracks: ['cards', 'expand'], plansTeaser: ['cards', 'tilted'], cta: ['plain', 'image'] };
const THEMED = ['steps', 'feature', 'tracks', 'plansTeaser', 'faq', 'compare', 'cta', 'statement', 'marquee', 'custom'];
const CODE_LIMITS = { html: 24000, css: 16000, globalCss: 20000 };

// The section library, as the agent sees it. `req` fields must be present and non-empty.
const SPEC = {
  hero: { req: ['headline', 'body', 'cta'], doc: 'Opens the home page. Always dark. variant: photo (full-bleed photo, headline over it, the current look) | arch (headline fills the left, photo in a tall arched frame on the right, optional floating member tag) | statement (no photo, the headline set enormous across the whole width). Fields: eyebrow, headline, body, image, imageAlt (photo and arch need image), cta{label,href}, link{label,href}, chips[string]; arch only: tag: gold|silver, note (short line on a floating pill).' },
  statement: { req: ['headline'], doc: 'One very large typographic line on its own band. The loudest thing in the library after the hero. Fields: eyebrow, headline, body, cta{label,href}, link{label,href}. Default theme ink.' },
  marquee: { req: ['items'], doc: 'A slow scrolling strip of short italic words or phrases, e.g. treatment names. Fields: items[6-12 strings], label. Default theme champagne.' },
  facts: { req: ['items'], doc: 'Row of up to 4 short facts on a dark band. items[{value,label}]. Values must be facts from the brand guide.' },
  steps: { req: ['headline', 'steps'], doc: 'Three numbered steps. variant: cards (three equal centred cards) | staggered (cards step down like a staircase with large italic numerals). Fields: anchor, eyebrow, headline, steps[3 x {title,body,visual: checklist|plan|trend}], cta{label,href}.' },
  feature: { req: ['headline', 'body'], doc: 'Split layout: copy one side, a visual or photo the other. Fields: eyebrow, headline, body, points[string], visual: report OR image+imageAlt (a tall photo), flip: true puts the picture on the left, link{label,href}. Default theme cream.' },
  tracks: { req: ['headline', 'items'], doc: 'Three treatment photos. variant: cards (photo above text) | expand (tall photo panels, text over the photo, the hovered one widens). Fields: eyebrow, headline, aside, items[{code,kicker,title,body,image,imageAlt,href}], link{label,href}.' },
  plansTeaser: { req: ['headline', 'plans'], doc: 'Short membership summary. variant: cards | tilted (the two cards overlap at an angle like physical objects; strongest on theme ink). Fields: eyebrow, headline, body, plans[{tier: silver|gold,name,price,per,note}], cta{label,href}. Default theme cream.' },
  faq: { req: ['headline', 'items'], doc: 'Questions. Fields: eyebrow, headline, items[{q,a}].' },
  cta: { req: ['headline', 'cta'], doc: 'Closing call to action. variant: plain | image (rounded panel with a dimmed photo behind; image optional, defaults to the hero photo). Fields: headline, body, cta{label,href}. Default theme champagne.' },
  promo: { req: ['headline', 'body', 'cta'], doc: 'Campaign band on a dark background. Fields: eyebrow, headline, body, offer (short, e.g. "3 months free"), offerNote, cta{label,href}, terms (plain-language conditions and end date).' },
  pageHeader: { req: ['headline', 'body'], doc: 'Light page header for inner pages. Fields: eyebrow, headline, body, chips[string]. First section of a page.' },
  trackList: { req: ['items'], doc: 'Editorial rows, one per treatment track. items[{anchor,code,kicker,title,body,tags[string],image,imageAlt,visual: report|plate,plateWord,rx:boolean}].' },
  plans: { req: ['headline', 'plans'], doc: 'Full pricing cards. Fields: eyebrow, headline, body, plans[{tier,name,badge,price,per,annual,annualWas,offer,tagline,groups[{label,items[{text,value}]}],cta{label,href}}], footnote.' },
  compare: { req: ['headline', 'columns', 'rows'], doc: 'Comparison table. Fields: eyebrow, headline, columns[string], rows[{label,values[true|false|string]}]. Default theme cream.' },
  custom: {
    req: ['html'],
    doc: [
      'A section you design and code yourself, for anything the library cannot do: a campaign hero, an offer layout, a new kind of band. Can go anywhere, including first on the home page in place of the hero.',
      'Fields: html (the inner markup of the section), css (styles for this section only), theme (optional background), dark: true (dark background and light text; when it opens a page the floating nav turns dark over it), anchor (optional id for #links).',
      'html: plain HTML and inline SVG. No <script>, <style>, <iframe>, forms, video or event handlers (onclick and so on). Links must go to a site page, a protected page or an #anchor. <img src> must be an image from the image library. Use <em> for the one italic gold accent word in a headline, not asterisks.',
      'css: top-level declarations style the section itself; rules inside it are automatically scoped to this section, so write ".offer { ... }" not a page-wide selector. @media and @keyframes work. Colours only from the brand: var(--ink), var(--cream), var(--paper), var(--champagne), var(--honey), var(--bronze), var(--ink-soft), var(--line), var(--gold-grad), or the palette hex values and rgba() of them (rgba(0,0,0,a) is allowed for shadows). Fonts only var(--sans) and var(--serif); set font-family, font-size and font-weight separately, not the font shorthand. No @import, @font-face or outside URLs; url() only for /img/ library images.',
      'Brand classes you can reuse inside it: wrap (centred page width), display (huge light headline), title (section headline), title-xl, eyebrow with <span class="dot"></span> inside, lede (body text), kicker (small spaced capitals), btn btn-gold (the primary gold button), btn btn-line, text-link, chips (row of pill <span>s). The page nav floats over the top 90px of the first section on a page, so a first section needs at least 150px of top padding.',
      'It must work at 375px wide: use clamp() for big type and a @media (max-width: 900px) rule for multi-column layouts. Every visible word is checked by the same health-claim and brand-voice rules as any other section.',
    ].join(' '),
  },
};
const GLOBAL_CSS_DOC = 'Site-wide styling: global.css (set with update_global, e.g. {"op":"update_global","fields":{"css":"..."}}) is a stylesheet added to every page of the site, after the brand stylesheet. Use it to restyle the whole site, for example for a campaign: the announcement bar (.announce), the nav (.nav, .nav-dark), buttons (.btn-gold), bands and section types (.hero, .statement, .promo, .plans, .plan, .band, .theme-ink and so on). Same colour, font and URL rules as custom section CSS. It cannot touch the footer, legal text or prescription notices (.footer, .legal, .rx, .footnote, .promo-terms), and it never reaches checkout, the member portal or intake. Set it to null to remove it.';
const THEME_DOC = `Sections that take a theme (${THEMED.join(', ')}) accept theme: ${THEMES.join(' | ')}. Paper and cream are the quiet light backgrounds, champagne is warm gold, ink is the dark one. Alternating them is how a page gets rhythm and contrast.`;

const COMPLIANCE = [
  [/\bguarantee[ds]?\b/i, 'promises a guaranteed result'],
  [/\b100\s?%/i, 'makes an absolute claim'],
  [/\b(clinically |scientifically )?proven\b/i, 'claims proof'],
  [/\bworks for every(one|body)\b/i, 'claims it works for everyone'],
  [/\b(cures?|cured|miracle|risk[- ]free|no side effects)\b/i, 'makes a cure or no-risk claim'],
  [/\bno prescription\b|\bwithout a prescription\b|\bprescription[- ]free\b|\bskip the doctor\b|\bno doctor\b|\binstant approval\b|(?<!not )\beveryone qualifies\b/i, 'presents prescription treatment as if no prescription or review is needed'],
  [/\bbefore[- ](and|&)[- ]after\b/i, 'refers to before-and-after results'],
  [/\b(lose|drop|shed|gain|add|boost)\s+(up to\s+)?\d+\s?(lbs?|pounds|kg|%|inches)\b/i, 'promises a specific physical outcome'],
  [/\bin (just |only )?\d+\s(days?|weeks?|months?)\b/i, 'promises a result in a set time'],
  [/\bFDA[- ]approved\b/i, 'makes an FDA approval claim'],
  [/\bonly \d+ (left|spots|remaining)\b/i, 'uses false scarcity'],
  [/\b(embarrassed|ashamed|tired of being|struggling with)\b/i, 'targets a personal insecurity'],
];

const SLOP = [
  [/\b(elevate|unlock|seamless(ly)?|cutting[- ]edge|revolutioni[sz]e\w*|empower\w*|game[- ]chang\w+|next[- ]level|reimagin\w+|transform your|your journey|fast-paced)\b/i, 'uses a generic marketing phrase'],
  [/!/, 'uses an exclamation mark'],
];

const LIMITS = { headline: 70, eyebrow: 40, title: 60 };
const SKIP_KEYS = new Set(['id', 'type', 'href', 'image', 'anchor', 'visual', 'tier', 'path', 'code', 'variant', 'theme', 'tag', 'css']);

// The image library: the photos in public/img plus every image generated and approved by the image check.
const images = () => [
  ...fs.readdirSync(IMAGES_DIR).filter((f) => /\.(jpg|png|webp)$/.test(f)).map((f) => '/img/' + f),
  ...require('./store').mediaPaths(),
];

function walk(node, visit, trail = []) {
  if (Array.isArray(node)) return node.forEach((v, i) => walk(v, visit, trail.concat(i)));
  if (node && typeof node === 'object') return Object.entries(node).forEach(([k, v]) => walk(v, visit, trail.concat(k)));
  visit(node, trail);
}

function texts(content) {
  const out = [];
  walk(content, (v, trail) => {
    const key = [...trail].reverse().find((k) => typeof k === 'string');
    if (typeof v !== 'string' || SKIP_KEYS.has(key)) return;
    // For agent-written HTML, check the words a visitor reads (and alt text), not the markup.
    out.push({ text: key === 'html' ? code.parseHtml(v).text : v, key, trail });
  });
  return out;
}

const where = (trail) => {
  const i = trail.indexOf('sections');
  return trail[0] === 'pages' && i > 0 ? `${trail[1]} page` : trail[0] === 'global' ? 'site-wide ' + trail[1] : trail.join('.');
};

const numbers = (content) => new Set(texts(content).flatMap((t) => (t.text.match(/\$\d[\d,]*(\.\d+)?|\d+\s?%/g) || []).map((n) => n.replace(/,$/, ''))));

function validate(content, prev) {
  const errors = [];
  const checks = [];
  const add = (name, list) => {
    checks.push({ name, ok: list.length === 0, detail: list.slice(0, 4).join(' ') });
    errors.push(...list);
  };

  // 1. Structure and the section library
  const s = [];
  const g = content.global || {};
  if (!g.announcement?.text || !g.navCta?.label || !Array.isArray(g.nav) || !g.footer?.legal) s.push('The site-wide header, announcement or footer is incomplete.');
  if ((g.nav || []).length > 5) s.push('The navigation has more than five links.');
  const pages = content.pages || {};
  if (!pages.home || pages.home.path !== '/') s.push('The home page is missing.');
  const ids = new Set();
  const paths = new Set();
  for (const [key, page] of Object.entries(pages)) {
    if (!/^\/[a-z0-9-]*$/.test(page.path || '')) s.push(`Page "${key}" has an invalid address.`);
    if (paths.has(page.path)) s.push(`Two pages share the address ${page.path}.`);
    paths.add(page.path);
    if (!page.title || !page.description) s.push(`Page "${key}" needs a title and description.`);
    if (!Array.isArray(page.sections) || !page.sections.length) s.push(`Page "${key}" has no sections.`);
    for (const sec of page.sections || []) {
      const spec = SPEC[sec.type];
      if (!spec || !sectionTypes.includes(sec.type)) { s.push(`"${sec.type}" is not a section in the library.`); continue; }
      if (!sec.id || ids.has(sec.id)) s.push(`Section id "${sec.id}" is missing or used twice.`);
      ids.add(sec.id);
      for (const f of spec.req) {
        const v = sec[f];
        if (v == null || v === '' || (Array.isArray(v) && !v.length)) s.push(`Section "${sec.id}" (${sec.type}) is missing "${f}".`);
      }
      if (sec.type === 'hero' && (key !== 'home' || page.sections[0] !== sec)) s.push('The hero can only open the home page.');
      if (sec.type === 'hero' && sec.variant !== 'statement' && !sec.image) s.push(`Section "${sec.id}" needs an image for this hero variant.`);
      if (sec.variant != null && !(VARIANTS[sec.type] || []).includes(sec.variant)) s.push(`Section "${sec.id}" (${sec.type}) has no variant "${sec.variant}". Options: ${(VARIANTS[sec.type] || ['none']).join(', ')}.`);
      if (sec.theme != null && (!THEMED.includes(sec.type) || !THEMES.includes(sec.theme))) s.push(`Section "${sec.id}" (${sec.type}) cannot take theme "${sec.theme}".`);
    }
  }
  add('Built from the section library', s);

  // 2. Protected areas
  const p = [];
  for (const page of Object.values(pages)) {
    if (Object.keys(LOCKED).some((l) => (page.path || '').startsWith(l))) p.push(`${page.path} is a protected area and cannot be a page the agent edits.`);
  }
  add('Checkout, portal and medical pages untouched', p);

  // 3. Code the agent wrote: no scripts, nothing outside the site, brand colours and fonts only
  const k = [];
  const customLinks = [];
  for (const [key, page] of Object.entries(pages)) {
    for (const sec of page.sections || []) {
      if (sec.type !== 'custom') continue;
      if (typeof sec.html !== 'string' || (sec.css != null && typeof sec.css !== 'string')) { k.push(`Section "${sec.id}" needs html (and css, if any) as text.`); continue; }
      if (sec.html.length > CODE_LIMITS.html) k.push(`The HTML of section "${sec.id}" is too long (${sec.html.length} characters, limit ${CODE_LIMITS.html}).`);
      if ((sec.css || '').length > CODE_LIMITS.css) k.push(`The CSS of section "${sec.id}" is too long (${sec.css.length} characters, limit ${CODE_LIMITS.css}).`);
      const parsed = code.parseHtml(sec.html);
      k.push(...parsed.problems.map((x) => `The HTML of section "${sec.id}" on the ${key} page ${x}.`));
      if (sec.css) k.push(...code.checkCss(sec.css).map((x) => `The CSS of section "${sec.id}" on the ${key} page ${x}.`));
      if (!parsed.text) k.push(`Section "${sec.id}" on the ${key} page has no visible text.`);
      customLinks.push(...parsed.hrefs.map((h) => ['href', h]), ...parsed.images.map((i) => ['image', i]));
    }
  }
  if (g.css != null) {
    if (typeof g.css !== 'string') k.push('The site-wide CSS must be text.');
    else {
      if (g.css.length > CODE_LIMITS.globalCss) k.push(`The site-wide CSS is too long (${g.css.length} characters, limit ${CODE_LIMITS.globalCss}).`);
      k.push(...code.checkCss(g.css).map((x) => `The site-wide CSS ${x}.`));
    }
  }
  add('Code is safe and on brand', k);

  // 4. Links and images resolve
  const l = [];
  const okImages = images();
  const checkLink = (key, v) => {
    if (key === 'href') {
      const base = String(v).split(/[?#]/)[0];
      const ok = String(v).startsWith('#') || paths.has(base || '/') || Object.keys(LOCKED).includes(base);
      if (!ok) l.push(`Link "${v}" goes nowhere.`);
    }
    if (key === 'image' && !okImages.includes(v)) l.push(`Image "${v}" is not in the image library.`);
    if (key === 'visual' && !VISUALS.includes(v)) l.push(`Visual "${v}" does not exist.`);
  };
  walk(content, (v, trail) => checkLink(trail[trail.length - 1], v));
  customLinks.forEach(([key, v]) => checkLink(key, v));
  add('Every link and image resolves', l);

  // 5. Health-claim compliance (including the visible words of custom sections)
  const c = [];
  const b = [];
  for (const t of texts(content)) {
    for (const [re, why] of COMPLIANCE) {
      const m = t.text.match(re);
      if (m) c.push(`"${m[0]}" on the ${where(t.trail)} ${why}.`);
    }
    for (const [re, why] of SLOP) {
      const m = t.text.match(re);
      if (m) b.push(`"${m[0]}" on the ${where(t.trail)} ${why}.`);
    }
    if (LIMITS[t.key] && t.text.length > LIMITS[t.key]) b.push(`A ${t.key} on the ${where(t.trail)} is too long (${t.text.length} characters, limit ${LIMITS[t.key]}).`);
    if (t.key === 'headline' && (t.text.match(/\*/g) || []).length > 2) b.push(`A headline on the ${where(t.trail)} has more than one accent word.`);
    if (/\*/.test(t.text) && t.key !== 'headline') b.push(`Accent asterisks appear outside a headline on the ${where(t.trail)}.`);
  }
  add('Health-claim rules', c);
  add('Brand voice and layout limits', b);

  // 6. The site still renders
  const r = [];
  if (!s.length) {
    for (const key of Object.keys(pages)) {
      try {
        const html = renderPage(content, key);
        if (!html.includes('</html>') || html.length < 2000) r.push(`Page "${key}" rendered empty.`);
      } catch (e) {
        r.push(`Page "${key}" failed to render: ${e.message}`);
      }
    }
  } else r.push('Not rendered because the structure check failed.');
  add('Every page renders', r);

  // Not errors, but Jacob should see them
  const before = prev ? numbers(prev) : new Set();
  const newNumbers = [...numbers(content)].filter((n) => !before.has(n));
  const markers = texts(content).filter((t) => /\[NEEDS FROM JACOB/i.test(t.text)).map((t) => t.text);

  return { ok: errors.length === 0, errors, checks, newNumbers, markers };
}

// Which sections differ between two versions, per page.
function diff(a, b) {
  const out = { pages: {}, global: JSON.stringify(a.global) !== JSON.stringify(b.global), newPages: [], removedPages: [] };
  for (const [key, page] of Object.entries(b.pages)) {
    const old = a.pages[key];
    if (!old) { out.newPages.push(key); out.pages[key] = page.sections.map((s) => s.id); continue; }
    const oldById = Object.fromEntries(old.sections.map((s) => [s.id, JSON.stringify(s)]));
    const changed = page.sections.filter((s) => oldById[s.id] !== JSON.stringify(s)).map((s) => s.id);
    const reordered = old.sections.map((s) => s.id).filter((id) => page.sections.some((s) => s.id === id)).join() !== page.sections.map((s) => s.id).filter((id) => oldById[id]).join();
    const removed = old.sections.some((s) => !page.sections.find((n) => n.id === s.id));
    if (changed.length || reordered || removed) out.pages[key] = changed;
  }
  out.removedPages = Object.keys(a.pages).filter((k) => !b.pages[k]);
  out.any = out.global || out.newPages.length > 0 || out.removedPages.length > 0 || Object.keys(out.pages).length > 0;
  return out;
}

module.exports = { validate, diff, SPEC, THEME_DOC, GLOBAL_CSS_DOC, images, LOCKED };
