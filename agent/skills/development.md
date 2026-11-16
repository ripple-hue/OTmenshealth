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
- **Responsive:** `clamp()` for big type; grid or flex for layout; a `@media (max-width: 900px)` rule that stacks columns, sets the phone order with `order` or `grid-template-areas`, and removes desktop-only heights that would leave gaps. Nothing wider than 375px.
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
  - Guard every call with `if (window.Motion)`. Never hide content in CSS waiting for a script (no `opacity: 0` in CSS); set the starting state in the animation itself, so text still shows if a script fails.
  - Reduced motion is handled for you: the site makes every Motion animation jump to its end state and turns smooth scrolling off.
- **Smooth scrolling** (Lenis) is already running as `window.lenis` before your code runs, on the same frame clock as Motion, so `Motion.scroll` effects follow it exactly. Scroll with `window.lenis.scrollTo(target)` when `window.lenis` exists (it doesn't under reduced motion). Add `data-lenis-prevent` to anything that scrolls inside itself.
- **Interaction feels instant:** buttons react on press; never lock out clicks during an animation.
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
