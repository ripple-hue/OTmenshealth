---
name: development
description: The code the agent writes for the OTMENS site (custom sections and site-wide CSS), built to a senior front-end standard and kept safe.
---

# Skill: Development

You build like a senior front-end engineer at a company with a strong design system: you reuse what exists, write the least code that does the job, and never ship anything that breaks on a phone.

## What you can write

- **`custom` sections**: HTML and CSS for one section. Its CSS is automatically scoped to that section.
- **Site-wide CSS** (`global.css`): one stylesheet added after the brand stylesheet on every page.

The section library spec lists the exact rules. In short: HTML and inline SVG only; no JavaScript, event handlers, forms, iframes or outside resources; links go to site pages, protected pages or #anchors; images come from the library; colours only from the brand variables and palette; fonts only `var(--sans)` and `var(--serif)`.

## Choose the lightest tool

1. A library section, as it is.
2. A library section with a different variant or theme.
3. A library section restyled through site-wide CSS.
4. A `custom` section.

Go down the list only when the idea needs it. Custom code is for what the library genuinely can't do, not for re-building something it already does.

## How to write it

- **Reuse the system.** Use the brand classes (`wrap`, `display`, `title`, `eyebrow` with its dot, `lede`, `kicker`, `btn btn-gold`, `text-link`, `chips`) and variables (`--ink`, `--cream`, `--paper`, `--champagne`, `--honey`, `--bronze`, `--ink-soft`, `--line`, `--gold-grad`, `--r-lg`, `--r-md`, `--shadow`). Never re-create a button or an eyebrow.
- **Semantic HTML.** One `h1` per page (the hero's). Headings in order. Real lists for lists, `<s>` for a struck-out old price.
- **Accessible.** Every `<img>` has a meaningful `alt` (or `alt=""` if decorative). Text contrast stays strong: light text on `ink`, dark text on light bands. Interactive things are real links.
- **Responsive.** Use `clamp()` for big type, CSS grid or flex for layout, and a `@media (max-width: 900px)` rule that stacks any columns. Nothing has a fixed width wider than 375px.
- **Small and scoped.** Name classes after what they are (`.offer`, `.offer-price`), keep custom CSS short, and keep site-wide CSS to deliberate changes, not overrides of everything.
- **Motion.** CSS transitions and one `@keyframes` animation at most per page, always with a `@media (prefers-reduced-motion: reduce)` rule that turns it off.
- **The first section.** The nav floats over the top 90px of the first section of a page, so give a first custom section at least 150px of top padding. Set `dark: true` on a dark custom hero so the nav switches to its dark style.
- **Undo is a version.** Never patch around old code. If a custom section is wrong, replace its `html` and `css` whole.

## When a check fails

Your draft is checked in code. If it comes back with errors, fix exactly what each error names, with the smallest change, and send only the corrective operations. Never weaken the idea to get past a check; find the compliant way to build it.

## Checklist

- No horizontal scroll at 375px, and nothing overlaps or clips at 375px or 1280px.
- Every link resolves and every image is in the library.
- Only brand colours and fonts.
- The page still works and reads correctly if your custom CSS failed to load.
