---
name: development
description: The code the agent writes for the OTMENS site (custom sections, site-wide CSS and JavaScript, libraries), built to a senior front-end standard.
---

# Skill: Development

You build like a senior front-end engineer with a strong design system: reuse what exists, write the least code that does the job, and never ship anything that breaks, overlaps or clips.

## What you can write

- **`custom` sections:** HTML, CSS (automatically scoped to the section) and JavaScript (`js`, runs after the page loads, with the section element as `section`).
- **Site-wide:** `global.css`, `global.js`, and `global.scripts` (up to 6 library URLs, loaded first).
- **Choose the lightest tool:** a library section as it is; then with a variant or theme; then restyled with CSS; then a custom section; then JavaScript only where CSS can't do it; then a library only for something substantial.

## Structure every custom section must follow

- **Text and buttons go inside `<div class="wrap">`**, the page container with side margins (the code rejects a section without it). Full-bleed photos and backgrounds sit outside it.
- **A section that opens a page** needs at least 150px of top padding (the nav floats over it). Set `dark: true` on a dark first section so the nav turns dark.
- **Reuse the brand classes:** `wrap`, `display`, `title`, `eyebrow` (with `<span class="dot"></span>`), `lede`, `kicker`, `btn btn-gold`, `btn btn-line`, `text-link`, `chips`. Use `<em>` for the italic accent word.
- **Semantic HTML:** one `h1` per page (the hero's), headings in order, real lists, `<s>` for an old price, real `<button>`s for actions, meaningful `alt` text.

## CSS

- **Colours:** the brand variables (`--ink`, `--cream`, `--paper`, `--champagne`, `--honey`, `--bronze`, `--ink-soft`, `--line`, `--gold-grad`), any shade of the brand's warm golds and browns, neutrals, and one campaign accent family. Write colours as hex, `rgb()` or `hsl()`.
- **Fonts:** `var(--sans)` and `var(--serif)` only; set `font-family`, `font-size` and `font-weight` separately (no `font` shorthand). No `@import` or `@font-face`.
- **Sizes and spacing come from the fluid scale** (built with the Utopia method), so every page keeps one rhythm and nothing looks arbitrary:
  - Type: `--step-n1` (small print, 13px and up), `--step-0` (body), `--step-1` to `--step-3` (lead text, subheads), `--step-4` to `--step-6` (section titles), `--step-7` and `--step-8` (display). Example: `font-size: var(--step-6)`.
  - Space: `--space-3xs` up to `--space-4xl` for gaps, padding and margins, and `--space-section` for the padding above and below a band.
  - Each step already grows from phone to desktop, so most sections need no font-size media queries. Only the one giant campaign headline may go beyond `--step-8`, with its own `clamp()`.
- **Responsive:** grid or flex for layout; a `@media (max-width: 900px)` rule that stacks columns, sets the phone order with `order` or `grid-template-areas`, and removes desktop-only heights that would leave gaps. Nothing wider than 375px.
- **Readable:** text at least 13px (`0.8125rem`), never pale text on gold or champagne.
- **Animate only `transform` and `opacity`.**
- Never target the footer, `.legal`, `.rx`, `.footnote` or `.promo-terms` (rejected).

## JavaScript and motion

- **Plain modern JavaScript,** no build step. Query inside `section`; guard every lookup (`if (!el) return`); no global variables.
- **The page works without JavaScript:** real words and links are in the HTML; scripts enhance them.
- **Motion library: Motion (MIT).** Load it with `global.scripts: ["https://cdn.jsdelivr.net/npm/motion@14.14.0/dist/motion.js"]`; it is `window.Motion`.
  - Entrance: `Motion.animate(el, {opacity: [0, 1], y: [24, 0]}, {duration: 0.7, ease: [0.22, 1, 0.36, 1]})`.
  - On scroll into view: `Motion.inView(selector, (el) => { … })`.
  - Tied to scroll position (parallax, a growing offer figure): `Motion.scroll(Motion.animate(el, {...}), {target: el})`.
  - Cascades: `Motion.stagger(0.08)`.
  - **Kinetic headlines with Split-type** (ISC licence), for the one or two headlines per page that carry the idea, never every heading. Load `https://cdn.jsdelivr.net/npm/split-type@0.3.4/umd/index.min.js` in `global.scripts` after Motion; it is `window.SplitType`. It keeps the `<em>` accent intact. Recipe:
    `var h = section.querySelector('h1'); if (!h || !window.SplitType || !window.Motion) return; h.setAttribute('aria-label', h.textContent); var s = new SplitType(h, {types: 'words'}); s.words.forEach(function (w) { w.setAttribute('aria-hidden', 'true'); }); Motion.animate(s.words, {opacity: [0, 1], y: ['0.6em', 0]}, {delay: Motion.stagger(0.08), duration: 0.7, ease: [0.22, 1, 0.36, 1]});`
    Split by `words` (letters only for a one-word headline); the aria lines keep it readable for screen readers.
  - Guard every call with `if (window.Motion)`. Never hide content in CSS waiting for a script (no `opacity: 0` in CSS); set the starting state in the animation itself, so text still shows if a script fails.
  - Reduced motion is handled for you: the site makes every Motion animation jump to its end state and turns smooth scrolling off.
- **Shader backgrounds (Paper Shaders, Apache 2.0)** are built in as `window.OTShader`; the site loads it automatically when your code mentions it (don't add it to `global.scripts`). Put an empty `<div class="bg" aria-hidden="true"></div>` first in the section, style it `position:absolute;inset:0` (the section `position:relative;overflow:hidden`, the `.wrap` `position:relative`), then:
  `if (!window.OTShader) return; OTShader.mount(section.querySelector('.bg'), {type: 'grain', shape: 'blob', colors: ['#2a1d12', '#8a6236', '#c9a46a'], back: '#0c0a08', speed: 0.3});`
  - Types: `grain` (grainy, filmic; shapes `blob`, a slow, glowing gold form that suits a campaign hero, plus `corners`, `wave`, `ripple`, `sphere`), `rays` (light shafts from the top; good behind a giant headline), `warp` (marbled, smoky; shapes `checks`, `stripes`, `edge`), `mesh` (smooth flowing blend; the most generic, so only with heavy grain). Options: `colors` (2 to 7, hex/rgb/hsl), `back`, `speed` (0 to 2; keep 0.2 to 0.5), and per type `softness`, `intensity`, `noise`, `distortion`, `swirl`, `density`, `bloom`, `grain`.
  - Colours are checked like CSS: the brand family, neutrals and the one campaign accent.
  - Give the section a solid `background` colour too: that is what shows without WebGL and before it loads. Reduced motion, pausing off screen and the phone pixel budget are handled for you.
- **Smooth scrolling** (Lenis) is already running as `window.lenis` before your code runs, on the same frame clock as Motion, so `Motion.scroll` effects follow it exactly. Scroll with `window.lenis.scrollTo(target)` when `window.lenis` exists (it doesn't under reduced motion). Add `data-lenis-prevent` to anything that scrolls inside itself.
- **Interaction feels instant:** buttons react on press; never lock out clicks during an animation. Custom buttons and links get `:hover`, `:active` and `:focus-visible` styles and a tap area of at least 44px.
- **Never GSAP.** Other libraries only with permissive licences (MIT, ISC, Apache), from `https://cdn.jsdelivr.net/npm/<package>@<exact version>/…`.
- **Quoted strings in scripts are checked like visible text** (health claims, banned words, no "!").
- **Previews are sandboxed:** don't depend on cookies or localStorage.

## When a check fails

Fix exactly what each error names, with the smallest change, and send only the corrective operations. Never drop the idea to pass a check; build it the compliant way.

## Checklist

- Every custom section's text is inside `.wrap`; nothing touches the screen edge at 1280px or 375px.
- No horizontal scroll at 375px; columns stack in a sensible order.
- Internal links resolve; pictures are from the photo library.
- Brand fonts only; colours from the brand family, neutrals and one accent.
- Scripts guard their lookups, respect reduced motion, and use no GSAP.
