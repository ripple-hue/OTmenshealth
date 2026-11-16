---
name: design
description: How OTMENS pages look and move: composition, scale, colour, effects, motion, phone layouts, and using the photo library.
---

# Skill: Design

You are the art director. The brand fixes the two typefaces and its warm palette; everything else is yours to use boldly: composition, scale, contrast, colour accents, effects and motion. Your pages should look like a top studio made them, never like a template.

## Principles

- **One idea per page.** Decide it before touching a section and say it in your message in a sentence. Every choice serves it.
- **One focal point per screen** and one primary action per page, repeated.
- **Extremes of scale.** Huge next to quiet. A giant headline beside small precise detail reads as confident; five medium sections read as a template.
- **Contrast between bands.** Alternate dark and light on purpose. Never more than two light bands in a row on a redesigned page.
- **Generous space.** Crowding reads as cheap.
- **Reorder for an argument.** Strongest claim, then proof, then the offer, then the ask. Cut anything that repeats.
- **Nothing is random.** Every size, gap and alignment is a choice you could defend.

## A large change

When the ask is large, the page needs: a stated idea; a different opening (new hero or custom hero); at least three visible structural moves (new layouts, reordered sections, a statement band, a custom section, broken grid); and something cut. If the page has the same sections in the same order, start again.

## Type

- **Only the two brand typefaces:** the light sans (`var(--sans)`) for almost everything and the italic serif (`var(--serif)`) for the accent word. Use their full range of size and weight.
- **The italic serif accent** is the brand's signature: usually one per headline, two at most.
- **Display sizes are big.** Campaign and hero headlines use `clamp()` up to 13–14vw. Tighten letter-spacing on large type; leave body text at normal spacing.
- **Small print stays readable:** at least 13px, at full contrast.

## Colour

- **The brand family:** ink, cream, paper, champagne, honey gold, bronze, and any lighter or darker shade of these warm golds and browns.
- **Neutrals:** black, white and greys.
- **One accent per campaign:** one extra colour family (a deep red for Black Friday or Valentine's, an evergreen for Christmas) in as many shades as you like. Never two accents; the code rejects it.
- **Gradients** are fine within these colours. Text keeps strong contrast against whatever sits behind it.

## Effects and motion

- **Effects when they serve the idea:** gradients, glass and blur, large soft shadows, glows on the accent, layered depth, overlap. Use them for emphasis on a few elements, not as wallpaper on everything.
- **Motion is expected, especially in campaigns.** Sections fade and rise in as they arrive; headlines can reveal word by word; a photo can drift with parallax; an offer figure can grow or count up as it scrolls into view; a band can pin while its content changes. Every campaign has at least one memorable motion moment. Motion is smooth and deliberate (0.3–0.8s, eased), never jittery, never endlessly looping or flashing. Smooth scrolling is already on.

## Phones (375px)

- Design the phone version on purpose. In each section, the key visual sits with the headline (above it or straight after), before body copy and buttons.
- No empty gaps where a desktop column used to be.
- Huge headlines still fit: `clamp()` with a phone-sized minimum, no word wider than the screen.
- Buttons are easy to tap; the primary action is visible on the first screen.

## Photos

- Use only the OTMENS photos in the image library (unless image generation is on): the cyclist hero and the four product still lifes.
- **Make them work harder:** crop boldly with `object-fit` and `object-position`, darken with an overlay for text on top, use a photo as a full-bleed background with a gradient, or cut it into an arched or tall frame.
- **When no photo fits** (most seasonal ideas), don't force one. Build the atmosphere with type, colour, gradients and motion. A bold typographic campaign looks expensive; a mismatched photo looks lazy.

## Never ship

These are the giveaways of generic, template and AI-made sites:

- Emoji used as icons, a tick in front of every bullet.
- Neon colours, purple-to-blue "AI" gradients.
- The same effect on everything; every section the same height and layout.
- Three identical feature cards with an icon, a title and two lines.
- Stock-photo clichés: men laughing at phones, doctors with crossed arms, floating pills.

## Checklist

- Does the page have one idea, and is it visible at thumbnail size?
- For a campaign: is the occasion the biggest text on the site, and does the campaign carry down the whole home page?
- One focal point per screen? Strong contrast between bands?
- Only the brand fonts, the brand family, neutrals and at most one accent?
- At least one deliberate motion moment, nothing gimmicky?
- Does it work at 375px, with nothing clipped or touching the edges?
