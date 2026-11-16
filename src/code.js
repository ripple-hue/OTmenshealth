'use strict';
// Code the agent writes: the HTML and JavaScript of `custom` sections, and the site-wide
// `global.css`, `global.js` and `global.scripts`. Used by both render.js and guard.js.
//
// Since 15 November 2026 (owner's decision) the agent may write JavaScript, forms, iframes and
// load outside resources. What is still checked here:
//   - brand: colours and fonts in CSS (including <style> and inline styles)
//   - protected areas: no CSS or JS aimed at the footer, legal text or prescription notices
//   - health claims and voice: visible text, alt text and the strings inside scripts (guard.js)
//   - correctness: scripts must parse, internal links and library images must exist, the page
//     structure tags (<html>, <head>, <body>, <base>, <meta>) can't be used inside a section
// Agent scripts never run on the protected pages, and Studio previews run them in a sandbox
// so they can't act on the signed-in Studio (see studio.js).

const vm = require('vm');

/* ---------- HTML ---------- */

const SVG_CASE = { lineargradient: 'linearGradient', radialgradient: 'radialGradient', viewbox: 'viewBox', textpath: 'textPath', clippath: 'clipPath', fegaussianblur: 'feGaussianBlur' };
const VOID = new Set(['img', 'br', 'hr', 'input', 'source', 'track', 'wbr', 'col', 'area', 'embed', 'param']);
const RAW = new Set(['script', 'style']); // content passed through untouched
const PAGE_TAGS = new Set(['html', 'head', 'body', 'base', 'meta', 'title']); // would break the page around the section
const TEXT_ATTRS = new Set(['alt', 'title', 'placeholder', 'aria-label', 'value']);

const escAttr = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const decode = (s) => String(s).replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (_, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' }[e]));
const internal = (v) => /^\/(?!\/)/.test(v); // a site path, not //cdn.example.com

// Walks the markup once. Reports problems and returns the HTML (internal links prefixed for previews),
// the visible text, every internal link and image, and the code inside it (scripts, styles, handlers).
function parseHtml(html, { mapHref = (h) => h } = {}) {
  const src = String(html || '');
  const problems = [];
  const hrefs = [];
  const images = [];
  const text = [];
  const scripts = [];
  const styles = [];
  let out = '';
  let last = 0;
  const re = /<!--[\s\S]*?(?:-->|$)|<!\[CDATA\[[\s\S]*?(?:\]\]>|$)|<![^>]*>|<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  let m;
  while ((m = re.exec(src))) {
    const between = src.slice(last, m.index);
    out += between.replace(/</g, '&lt;');
    text.push(decode(between));
    last = re.lastIndex;
    if (!m[2]) { out += m[0].startsWith('<!--') ? '' : m[0]; continue; }
    const closing = m[1] === '/';
    const tag = m[2].toLowerCase();
    if (PAGE_TAGS.has(tag)) { problems.push(`uses a <${tag}> tag, which belongs to the page around the section and would break it`); continue; }
    if (closing) { if (!VOID.has(tag)) out += `</${m[2]}>`; continue; }

    let attrs = '';
    const ar = /([^\s=\/"'>]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+))?/g;
    let a;
    let isExternalScript = false;
    while ((a = ar.exec(m[3]))) {
      const name = a[1].toLowerCase();
      let value = a[2] == null ? null : decode(a[2].replace(/^["']|["']$/g, ''));
      if (value == null) { attrs += ` ${SVG_CASE[name] || a[1]}`; continue; }
      if (/^on/.test(name)) scripts.push(value);
      if (name === 'style') {
        styles.push(value); // counted for the site-wide accent check
        const cssProblems = checkCss(value, { inline: true });
        if (cssProblems.length) problems.push(...cssProblems.map((p) => 'an inline style ' + p));
      }
      if ((name === 'href' || name === 'action') && internal(value.trim())) {
        if (name === 'href') hrefs.push(value.trim());
        value = mapHref(value.trim());
      }
      if (name === 'src' || name === 'poster') {
        if (tag === 'script') isExternalScript = true;
        else if (value.trim() && tag !== 'iframe') images.push(value.trim()); // every picture source, checked in guard.js
      }
      if (TEXT_ATTRS.has(name)) text.push(value);
      attrs += ` ${SVG_CASE[name] || a[1]}="${escAttr(value)}"`;
    }
    out += `<${m[2]}${attrs}>`;

    if (RAW.has(tag)) {
      // Take everything up to the matching closing tag as-is.
      const end = src.toLowerCase().indexOf(`</${tag}`, re.lastIndex);
      const stop = end < 0 ? src.length : end;
      const body = src.slice(re.lastIndex, stop);
      if (tag === 'script' && !isExternalScript) scripts.push(body);
      if (tag === 'style') {
        styles.push(body);
        problems.push(...checkCss(body).map((p) => 'a <style> block ' + p));
      }
      out += body + `</${tag}>`;
      const close = end < 0 ? src.length : src.indexOf('>', end) + 1;
      re.lastIndex = close || src.length;
      last = re.lastIndex;
    }
  }
  const rest = src.slice(last);
  out += rest.replace(/</g, '&lt;');
  text.push(decode(rest));
  for (const s of scripts) problems.push(...checkJs(s).map((p) => 'a script ' + p));
  return { html: out, problems: [...new Set(problems)], hrefs, images, scripts, styles, text: text.join(' ').replace(/\s+/g, ' ').trim() };
}

const sanitizeHtml = (html, mapHref) => parseHtml(html, { mapHref }).html;

/* ---------- JavaScript ---------- */

// Agent scripts may do anything except touch the protected notices, and they must at least parse.
// The words inside their strings are checked for health claims and voice by guard.js.
const PROTECTED_IN_JS = /['"`][^'"`]*(\.legal|\.rx\b|\.footnote|\.promo-terms|\.footer|\bfooter\b)[^'"`]*['"`]|getElementsByTagName\(\s*['"`]footer|querySelector(All)?\(\s*['"`]footer/i;

// `wrapped`: the code runs inside a function (section `js` and `global.js` are wrapped in a
// DOMContentLoaded handler by render.js), so an early `return` is legal and must parse.
function checkJs(code, wrapped = false) {
  const p = [];
  const s = String(code || '');
  if (!s.trim()) return p;
  if (PROTECTED_IN_JS.test(s)) p.push('touches the footer, legal text or prescription notices, which must stay as they are');
  if (/<\/script/i.test(s)) p.push('contains "</script", which would end the script early');
  try { new vm.Script(wrapped ? `(function(section){\n${s}\n})` : s); } catch (e) {
    // Modules (import/export) can't be parsed as a classic script; that is allowed.
    if (!/import|export/.test(e.message)) p.push(`does not parse: ${e.message}`);
  }
  return [...new Set(p)];
}

// The quoted strings inside a script, which may end up as visible text.
// Every literal is consumed in order (short ones too), so quotes never pair up across two strings.
const jsStrings = (code) => [...String(code || '').matchAll(/"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)]
  .map((m) => (m[1] ?? m[2] ?? m[3] ?? '').replace(/<[^>]*>/g, ' ').trim())
  .filter((s) => s.length >= 3);

/* ---------- CSS ---------- */

// Colour freedom (owner's decision, 15 November 2026: "give it more freedom"). Allowed:
//   - any shade or tint of the brand's warm family (the palette's ink, bronze, honey, champagne and cream
//     all sit at hues of about 35–45°; anything from 20° to 60° counts as the brand family),
//   - any neutral (black, white, greys, near-black, near-white),
//   - ONE campaign accent hue family (e.g. a deep red for Valentine's, an evergreen for Christmas),
//     counted across the whole site in guard.js with accentHues().
const BRAND_HUES = [20, 60];
function hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}
// 'neutral', 'brand' or an accent hue in degrees.
function classify([h, s, l]) {
  if (s < 0.12 || l < 0.06 || l > 0.97) return 'neutral';
  if (h >= BRAND_HUES[0] && h <= BRAND_HUES[1]) return 'brand';
  return Math.round(h);
}
// Every colour written in a piece of CSS, as [hue, saturation, lightness].
function cssColours(s) {
  const out = [];
  for (const h of s.matchAll(/#([0-9a-f]{3,8})\b/gi)) {
    let hex = h[1].toLowerCase();
    if (![3, 4, 6, 8].includes(hex.length)) continue;
    if (hex.length <= 4) hex = hex.slice(0, 3).split('').map((c) => c + c).join('');
    out.push(hsl(parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)));
  }
  for (const r of s.matchAll(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/gi)) out.push(hsl(+r[1], +r[2], +r[3]));
  for (const c of s.matchAll(/hsla?\(\s*(-?[\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/gi)) out.push([((+c[1] % 360) + 360) % 360, +c[2] / 100, +c[3] / 100]);
  return out;
}
const accentHues = (css) => cssColours(stripCss(css)).map(classify).filter((x) => typeof x === 'number');
const hueGap = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
const NEUTRAL_NAMES = /^(black|white|gray|grey|silver|gainsboro|whitesmoke|snow|ghostwhite|dimgray|dimgrey|darkgray|darkgrey|lightgray|lightgrey)$/i;
const FONTS = new Set(['var(--sans)', 'var(--serif)', 'inherit', 'initial', 'helvetica neue', 'inter tight', 'instrument serif', 'helvetica', 'arial', 'sans-serif', 'georgia', 'serif']);
const NAMED = 'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen'.split(' ');
const NAMED_RE = new RegExp(`(^|[\\s,(:])(${NAMED.join('|')})(?=[\\s,);!]|$)`, 'i');
// Classes that carry legal or clinical wording. Agent CSS may not restyle or hide them.
const PROTECTED_SELECTORS = /\.(legal|rx|footnote|promo-terms|footer)\b|(^|[\s,>+~{}])footer\b/i;

const stripCss = (css) => String(css || '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""');

function braceBalance(css) {
  let depth = 0;
  for (const ch of stripCss(css)) {
    if (ch === '{') depth++;
    if (ch === '}' && --depth < 0) return false;
  }
  return depth === 0;
}

function checkCss(css, { inline = false } = {}) {
  const raw = String(css || '');
  const s = stripCss(raw);
  const p = [];
  if (/</.test(raw)) p.push('contains "<", which would break the page');
  // Brand rules, not technical ones: imported stylesheets and web fonts can't be checked for colours and fonts.
  if (/@import/i.test(s)) p.push('uses @import. Paste the CSS in instead, so the brand check can read it');
  if (/@font-face/i.test(s)) p.push('loads a font. Only the two brand fonts are allowed');
  // Colours themselves are free within the brand family, neutrals and one accent (checked site-wide in
  // guard.js). Here only the notations that can't be read are refused.
  if (/\b(hwb|lab|lch|oklab|oklch|color)\(/i.test(s)) p.push('uses a colour notation the brand check can\'t read. Write colours as hex, rgb() or hsl()');
  for (const d of s.matchAll(/(^|[;{\s])((?:background|background-color|color|border(?:-[a-z]+)*|outline(?:-color)?|fill|stroke|box-shadow|text-shadow|stop-color|caret-color|accent-color|text-decoration(?:-color)?|column-rule(?:-color)?)\s*:\s*)([^;{}]*)/gi)) {
    const named = d[3].match(NAMED_RE);
    if (named && !NEUTRAL_NAMES.test(named[2])) p.push(`uses the named colour "${named[2]}". Write colours as hex, rgb() or hsl() so the brand check can read them`);
  }
  if (/(^|[;{\s])font\s*:/i.test(s)) p.push('uses the "font" shorthand. Set font-family, font-size and font-weight separately');
  for (const f of s.matchAll(/font-family\s*:\s*([^;{}]*)/gi)) {
    const bad = f[1].split(',').map((x) => x.trim().replace(/^["']|["']$/g, '').replace(/\s*!important$/i, '').toLowerCase()).filter((x) => x && !FONTS.has(x));
    if (bad.length) p.push(`uses the font "${bad[0]}". Only var(--sans) and var(--serif) are brand fonts`);
  }
  if (!inline && PROTECTED_SELECTORS.test(s)) p.push('targets the footer, legal or prescription notices, which must stay as they are');
  if (!inline && !braceBalance(raw)) p.push('has unbalanced braces');
  return [...new Set(p)];
}

// Wraps a section's CSS so it only reaches that section. Uses native CSS nesting; @keyframes move to the top level.
function scopeCss(id, css) {
  const raw = String(css || '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/</g, '');
  if (!raw.trim() || !braceBalance(raw)) return '';
  const hoisted = [];
  let body = '';
  let i = 0;
  while (i < raw.length) {
    const at = raw.slice(i).match(/^\s*@(-webkit-)?keyframes\b[^{]*\{/i);
    if (at) {
      let depth = 0, j = i + at[0].length - 1;
      for (; j < raw.length; j++) { if (raw[j] === '{') depth++; if (raw[j] === '}' && --depth === 0) break; }
      hoisted.push(raw.slice(i, j + 1).trim());
      i = j + 1;
      continue;
    }
    // copy one top-level chunk (a declaration or a whole rule)
    let depth = 0, j = i;
    for (; j < raw.length; j++) {
      if (raw[j] === '{') depth++;
      if (raw[j] === '}') { depth--; if (depth === 0) { j++; break; } }
      if (raw[j] === ';' && depth === 0) { j++; break; }
    }
    body += raw.slice(i, j);
    i = j;
  }
  return `${hoisted.join('\n')}\n[data-section="${String(id).replace(/["\\]/g, '')}"]{${body}}`;
}

const cleanGlobalCss = (css) => (braceBalance(css) ? String(css || '').replace(/</g, '') : '');

// Agent JavaScript goes inside <script> tags; this keeps a stray "</script" from ending one early.
const cleanJs = (js) => String(js || '').replace(/<\/script/gi, '<\\/script');

module.exports = { parseHtml, sanitizeHtml, checkCss, checkJs, jsStrings, scopeCss, cleanGlobalCss, cleanJs, accentHues, hueGap };
