'use strict';
// Code the agent writes: the HTML of `custom` sections and the site-wide `global.css`.
// Two jobs, used by both render.js and guard.js:
//   1. check(): list every rule a piece of agent code breaks, so the draft is sent back for repair.
//   2. sanitizeHtml() / scopeCss(): make the output safe at render time even if a check were skipped.
// The agent never writes JavaScript or server code, and nothing here can reach the protected pages.

/* ---------- HTML ---------- */

const SVG_TAGS = ['svg', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon', 'g', 'defs', 'lineargradient', 'radialgradient', 'stop', 'text', 'tspan'];
const TAGS = new Set([
  'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img', 'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'strong', 'b', 'em', 'i', 'small', 's', 'sup', 'sub', 'mark', 'time', 'br', 'hr', 'figure', 'figcaption',
  'blockquote', 'section', 'article', 'header', 'footer', 'aside', 'nav', 'details', 'summary',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'caption', ...SVG_TAGS,
]);
const VOID = new Set(['img', 'br', 'hr']);
const DROP_WITH_CONTENT = new Set(['script', 'style', 'iframe', 'object', 'embed', 'template', 'noscript', 'textarea', 'select']);
const ATTRS = new Set([
  'class', 'id', 'href', 'src', 'alt', 'title', 'loading', 'width', 'height', 'role', 'style', 'datetime', 'open', 'colspan', 'rowspan', 'scope',
  // SVG
  'viewbox', 'd', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'stroke-dashoffset', 'fill-opacity',
  'stroke-opacity', 'opacity', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'fx', 'fy', 'points', 'transform', 'offset',
  'stop-color', 'stop-opacity', 'gradientunits', 'gradienttransform', 'preserveaspectratio', 'xmlns', 'text-anchor', 'font-size', 'letter-spacing',
]);
const okAttr = (n) => ATTRS.has(n) || /^aria-[a-z-]+$/.test(n) || /^data-[a-z0-9-]+$/.test(n);

const escAttr = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const decode = (s) => String(s).replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (_, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' }[e]));

// Walks the markup once. Reports problems and returns safe HTML, the visible text, and every link and image.
function parseHtml(html, { mapHref = (h) => h } = {}) {
  const src = String(html || '');
  const problems = [];
  const hrefs = [];
  const images = [];
  const text = [];
  let out = '';
  let skipUntil = null;
  let last = 0;
  const re = /<!--[\s\S]*?(?:-->|$)|<!\[CDATA\[[\s\S]*?(?:\]\]>|$)|<![^>]*>|<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  let m;
  const textChunk = (t) => {
    if (skipUntil) return;
    out += t.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    text.push(decode(t));
  };
  while ((m = re.exec(src))) {
    textChunk(src.slice(last, m.index));
    last = re.lastIndex;
    if (!m[2]) { if (!m[0].startsWith('<!--')) problems.push('uses a doctype or CDATA block'); continue; }
    const closing = m[1] === '/';
    const tag = m[2].toLowerCase();
    if (skipUntil) { if (closing && tag === skipUntil) skipUntil = null; continue; }
    if (DROP_WITH_CONTENT.has(tag)) {
      problems.push(`uses a <${tag}> tag, which is not allowed`);
      if (!closing && !/\/\s*$/.test(m[3])) skipUntil = tag;
      continue;
    }
    if (!TAGS.has(tag)) { problems.push(`uses a <${tag}> tag, which is not allowed`); continue; }
    const realTag = SVG_TAGS.includes(tag) ? m[2] : tag; // keep camelCase such as linearGradient
    if (closing) { if (!VOID.has(tag)) out += `</${realTag}>`; continue; }

    let attrs = '';
    const ar = /([^\s=\/"'>]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+))?/g;
    let a;
    while ((a = ar.exec(m[3]))) {
      const name = a[1].toLowerCase();
      let value = a[2] == null ? '' : a[2].replace(/^["']|["']$/g, '');
      value = decode(value);
      if (/^on/.test(name)) { problems.push(`uses an event handler (${name}), and scripts are not allowed`); continue; }
      if (!okAttr(name)) { problems.push(`uses an attribute "${name}" that is not allowed`); continue; }
      if (name === 'href') {
        if (!/^(\/|#)/.test(value.trim())) { problems.push(`links to "${value}", but links must be a site page, a protected page or an #anchor`); continue; }
        hrefs.push(value.trim());
        value = mapHref(value.trim());
      }
      if (name === 'src') {
        if (tag !== 'img') { problems.push('uses src outside an <img>'); continue; }
        images.push(value.trim());
        if (!/^\/(img|media)\/[\w.-]+$/.test(value.trim())) continue;
      }
      if (name === 'style') {
        const cssProblems = checkCss(value, { inline: true });
        if (cssProblems.length) { problems.push(...cssProblems.map((p) => 'an inline style ' + p)); continue; }
      }
      if (name === 'alt') text.push(value);
      if (/javascript:|data:|vbscript:/i.test(value)) { problems.push(`puts "${value.slice(0, 40)}" in an attribute`); continue; }
      attrs += ` ${a[1]}="${escAttr(value)}"`;
    }
    if (tag === 'img' && !/\ssrc=/.test(attrs)) { problems.push('has an <img> without a library image'); continue; }
    if (tag === 'a' && !/\shref=/.test(attrs)) attrs += ' href="#"';
    out += `<${realTag}${attrs}>`;
  }
  textChunk(src.slice(last));
  return { html: out, problems: [...new Set(problems)], hrefs, images, text: text.join(' ').replace(/\s+/g, ' ').trim() };
}

const sanitizeHtml = (html, mapHref) => parseHtml(html, { mapHref }).html;

/* ---------- CSS ---------- */

// The palette from brand/brand-guide.md, plus the tints already used in public/styles.css.
const PALETTE = {
  '17130e': 'ink', 'f7f1e6': 'cream', 'ebddb8': 'champagne', 'd8bc7e': 'honey', '7a5e2c': 'bronze', 'fdfbf7': 'paper',
  'f0e2bc': 'gold tint', 'f3e8cb': 'gold tint', 'f0e4c4': 'gold tint', 'f8f0dc': 'gold tint', '221d16': 'ink tint', '2e281f': 'ink tint',
};
const hexToRgb = (h) => [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',');
const RGB_OK = new Set([...Object.keys(PALETTE).map(hexToRgb), '0,0,0', '255,255,255']);
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
  if (/</.test(raw)) p.push('contains "<", which is not allowed in CSS');
  if (/@import|@font-face|@namespace|@charset/i.test(s)) p.push('imports files or fonts, which is not allowed');
  if (/expression\s*\(|javascript:|behavior\s*:|-moz-binding/i.test(s)) p.push('contains script-like CSS');
  for (const u of s.matchAll(/url\(\s*["']?([^"')]*)["']?\s*\)/gi)) {
    if (!/^\/(img|media)\/[\w.-]+$/.test(u[1].trim())) p.push(`loads "${u[1]}", but only images from the image library (/img/... or /media/...) are allowed`);
  }
  for (const h of s.matchAll(/#([0-9a-f]{3,8})\b/gi)) {
    let hex = h[1].toLowerCase();
    if (hex.length === 3 || hex.length === 4) hex = hex.slice(0, 3).split('').map((c) => c + c).join('');
    if (hex.length === 8) hex = hex.slice(0, 6);
    if (!PALETTE[hex]) p.push(`uses the colour #${h[1]}, which is not a brand colour`);
  }
  for (const r of s.matchAll(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/gi)) {
    if (!RGB_OK.has(`${r[1]},${r[2]},${r[3]}`)) p.push(`uses the colour rgb(${r[1]}, ${r[2]}, ${r[3]}), which is not a brand colour`);
  }
  if (/\b(hsla?|hwb|lab|lch|oklab|oklch|color)\(/i.test(s)) p.push('uses a colour function other than the brand variables, hex or rgba');
  for (const d of s.matchAll(/(^|[;{\s])((?:background|background-color|color|border(?:-[a-z]+)*|outline(?:-color)?|fill|stroke|box-shadow|text-shadow|stop-color|caret-color|accent-color|text-decoration(?:-color)?|column-rule(?:-color)?)\s*:\s*)([^;{}]*)/gi)) {
    const named = d[3].match(NAMED_RE);
    if (named) p.push(`uses the named colour "${named[2]}", which is not a brand colour`);
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

module.exports = { parseHtml, sanitizeHtml, checkCss, scopeCss, cleanGlobalCss };
