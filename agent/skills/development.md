---
name: development
description: The code the agent writes for the OTMENS site (custom sections, site-wide CSS and JavaScript, libraries), built to a senior front-end standard.
---

# Skill: Development

You build like a senior front-end engineer at a company with a strong design system: you reuse what exists, write the least code that does the job, and never ship anything that breaks on a phone or makes the page feel heavy.

## What you can write

- **`custom` sections**: HTML, CSS (automatically scoped to the section) and JavaScript (`js`, run after the page loads, with the section element as `section`).
- **Site-wide CSS** (`global.css`) and **site-wide JavaScript** (`global.js`) on every page.
- **Libraries** (`global.scripts`): up to 6 script URLs, loaded before your JavaScript. Use well-known open-source libraries with a permissive licence (MIT, ISC, Apache), from `https://cdn.jsdelivr.net/npm/<package>@<exact version>/...`. Pin the exact version. **Never GSAP**, whose licence isn't cleared.
- **Smooth scrolling is built in:** Lenis is on every page as `window.lenis` (mouse and trackpad; touch scrolls natively; off for reduced motion). Scroll with `window.lenis.scrollTo(target)` when it exists, fall back to `scrollTo`, and set `global.smoothScroll: false` only if an idea truly needs native scrolling.

The section library spec lists the exact rules. What is still checked: brand colours and fonts in all CSS; nothing touches the footer, legal text or prescription notices; scripts must parse; internal links and library images must exist; and every word on the page, **including the quoted strings in your scripts**, goes through the health-claim and voice checks.

## Choose the lightest tool

1. A library section, as it is.
2. A library section with a different variant or theme.
3. A library section restyled through site-wide CSS.
4. A `custom` section in HTML and CSS.
5. JavaScript, when the idea needs behaviour CSS can't do: real interaction (a quiz, tabs, a slider, a calculator), state, or motion tied to scroll position.
6. A library, when it does something substantial you shouldn't hand-write.

Go down the list only when the idea needs it. CSS beats JavaScript for anything it can do (hover, transitions, simple reveal animations with `@keyframes`, sticky positioning, scroll snapping).

## JavaScript

- **Plain modern JavaScript,** no build step and no frameworks. Keep each section's code self-contained: query inside `section`, never assume another section exists.
- **Content first.** The section must read correctly with JavaScript off: write the real words and links in the HTML and enhance them. Never put the only copy of important text inside a script.
- **No errors, no leaks.** Guard every lookup (`if (!el) return`), and don't add global variables (wrap in a function; `section` is already scoped).
- **Fast.** Don't block the main thread: no scroll handlers that do layout work on every frame. Use `IntersectionObserver` for reveal-on-scroll and `requestAnimationFrame` for anything per-frame.
- **Motion with restraint.** Slow, small and purposeful: a fade and short rise as sections enter, a gentle parallax on one photo. One signature motion moment per page. Always check `matchMedia('(prefers-reduced-motion: reduce)')` and show the final state instead.
- **Accessible interaction.** Real `<button>`s for actions, visible focus states, keyboard support, `aria-expanded` and similar where state changes.
- **Interactive tools stay non-medical.** A "find your plan" quiz may ask about goals and preferences and recommend a plan from the brand guide's facts. It may never ask about symptoms, conditions or medications, recommend a treatment, or send answers anywhere.
- **Previews are sandboxed:** cookies and localStorage may not work there. Don't depend on them.

## How it should feel (adapted from Apple's WWDC talks, via Emil Kowalski's apple-design skill, MIT)

- **Instant response.** Anything clickable reacts the moment it is pressed, not on release: for example `.btn:active { transform: scale(.97); transition: transform 100ms ease-out; }`. No artificial delays or debounces on what the visitor does.
- **Never lock out input.** A visitor can click again, go back or change their answer while something is still animating. Start any new animation from where the element is now, never by jumping to where it was going.
- **Spatial consistency.** Things leave the way they came in: a panel that slides in from the right leaves to the right. Menus, pop-overs and expanding panels grow from the button that opened them (`transform-origin` on the trigger), not from the middle of the screen.
- **Motion with weight, not bounce.** Ease out, settle without overshoot. Save a slight bounce for something the visitor physically threw or dragged.
- **Animate only `transform` and `opacity`** for smoothness. Use `requestAnimationFrame` for anything frame by frame, and add `will-change` only where you've measured a problem.
- **Type is size-specific.** In custom CSS, large headlines get tighter letter-spacing (about `-0.02em` to `-0.04em`) and tighter line-height (about `0.95`–`1.1`); body text stays near `0` letter-spacing with comfortable line-height (about `1.5`); small capitals labels get positive letter-spacing. Never one letter-spacing for all sizes. Build hierarchy from size, weight and line-height together, and size spacing in `rem` so it scales with the visitor's text size.
- **Accessibility settings are signals, not off-switches:**
  - `prefers-reduced-motion: reduce`: swap slides, parallax and springs for a short opacity cross-fade or the final state. Keep the feedback, lose the movement.
  - `prefers-reduced-transparency: reduce`: make translucent or blurred surfaces solid.
  - `prefers-contrast: more`: solid backgrounds and a clear border on cards and controls.

## How to write it

- **Reuse the system.** Use the brand classes (`wrap`, `display`, `title`, `eyebrow` with its dot, `lede`, `kicker`, `btn btn-gold`, `text-link`, `chips`) and variables (`--ink`, `--cream`, `--paper`, `--champagne`, `--honey`, `--bronze`, `--ink-soft`, `--line`, `--gold-grad`, `--r-lg`, `--r-md`, `--shadow`). Never re-create a button or an eyebrow.
- **Semantic HTML.** One `h1` per page (the hero's). Headings in order. Real lists for lists, `<s>` for a struck-out old price.
- **Accessible.** Every `<img>` has a meaningful `alt` (or `alt=""` if decorative). Text contrast stays strong: light text on `ink`, dark text on light bands. Interactive things are real links.
- **Responsive.** Use `clamp()` for big type, CSS grid or flex for layout, and a `@media (max-width: 900px)` rule that stacks any columns. Nothing has a fixed width wider than 375px.
- **Set the phone order yourself.** When columns stack, decide the order with `grid-template-areas` or `order` so the key visual lands right after the headline (see the design skill), and remove any desktop-only height, `min-height` or padding that would leave an empty gap.
- **Readable small text.** `font-size` of at least `0.8125rem` (13px) for any text, and no `opacity` below 1 or pale `rgba()` colours on text that sits on gold or champagne.
- **Small and scoped.** Name classes after what they are (`.offer`, `.offer-price`), keep custom CSS short, and keep site-wide CSS to deliberate changes, not overrides of everything.
- **CSS motion.** Prefer CSS transitions and `@keyframes` for simple motion, always with a `@media (prefers-reduced-motion: reduce)` rule that turns it off.
- **The first section.** The nav floats over the top 90px of the first section of a page, so give a first custom section at least 150px of top padding. Set `dark: true` on a dark custom hero so the nav switches to its dark style.
- **Undo is a version.** Never patch around old code. If a custom section is wrong, replace its `html`, `css` and `js` whole.

## When a check fails

Your draft is checked in code. If it comes back with errors, fix exactly what each error names, with the smallest change, and send only the corrective operations. Never weaken the idea to get past a check; find the compliant way to build it.

## Checklist

- No horizontal scroll at 375px, and nothing overlaps or clips at 375px or 1280px.
- At 375px, each custom section reads in the right order (headline, key visual, copy, button) with no large empty gaps.
- Every internal link resolves, and every image is in the library or is a working https:// URL.
- Only brand colours and fonts.
- The page still works and reads correctly if your custom CSS or JavaScript failed to load.
- Scripts guard every lookup, respect reduced motion, and use no GSAP.
