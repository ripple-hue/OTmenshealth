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

## How far to push

Before writing any operations, set three levels from 1 to 10 for this request (for example "boldness 9, motion 7, density 3"). They are for you; Jacob doesn't need to see the numbers.

- **Boldness:** how far the layout departs from the current page. A price tweak is 2; a new section is 5; a campaign is 8 to 10 (broken grids, overlap, giant type, asymmetric splits).
- **Motion:** 2 is fades only; 5 adds staggered reveals; 8 and up adds one scroll-driven moment (pinning, parallax, a growing figure).
- **Density:** low means few words and big space (statements, campaigns); high means more information per screen (comparisons, pricing detail).

Then build to those levels. Settling on 5 for everything is how pages end up looking like templates.

## A large change

When the ask is large, the page needs: a stated idea; a different opening (new hero or custom hero); at least three visible structural moves (new layouts, reordered sections, a statement band, a custom section, broken grid); and something cut. If the page has the same sections in the same order, start again.

- **Never plainer than the live page.** Compare your opening screen with the current one. If yours has less depth (no photo, no texture, flat black with text), it reads as a downgrade however good the words are. Bring richness: the photo re-graded, a shader texture, layered type, overlap.
- **Keep the strongest asset.** If the live hero has a strong photograph, keep it by default and transform it (darken, re-crop, wash it with the accent, put the new headline over it). Drop it only when it fights the idea.
- **Commit to the accent.** If you bring in an accent colour, give it at least one large surface: a band, a block, the offer figure. A hairline and a strikethrough in the accent read as timid.
- **Say each fact once.** If the announcement bar carries the dates, the hero doesn't repeat them; one line of terms near the offer, not three restatements. Small grey filler paragraphs beside a headline are the first thing to cut.

## Type

- **Only the two brand typefaces:** the light sans (`var(--sans)`) for almost everything and the italic serif (`var(--serif)`) for the accent word. Use their full range of size and weight.
- **The italic serif accent** is the brand's signature: usually one per headline, two at most.
- **One scale.** Use the fluid type and space steps (see the development skill) and skip steps for contrast: a `--step-8` headline over `--step-1` text reads as designed; five neighbouring sizes read as a template.
- **Display sizes are big.** Campaign and hero headlines sit at `--step-7` or `--step-8`; the occasion's name in a campaign hero should go larger, close to the full width of the page (about 13–14vw), and may overlap the photo or the next band. Tighten letter-spacing on large type, but not so much that letters touch; leave body text at normal spacing.
- **Small print stays readable:** at least 13px, at full contrast.

## Colour

- **The brand family:** ink, cream, paper, champagne, honey gold, bronze, and any lighter or darker shade of these warm golds and browns.
- **Neutrals:** black, white and greys.
- **One accent per campaign:** one extra colour family (a deep red for Black Friday or Valentine's, an evergreen for Christmas) in as many shades as you like. Never two accents; the code rejects it.
- **Gradients** are fine within these colours. Text keeps strong contrast against whatever sits behind it.

## Effects and motion

- **Effects when they serve the idea:** gradients, glass and blur, large soft shadows, glows on the accent, layered depth, overlap. Use them for emphasis on a few elements, not as wallpaper on everything.
- **Show offers, don't just state them.** Jacob prefers offers made visual and captivating. Give each campaign one visual moment that makes the saving felt: the price counting down from the old price to the new one as it scrolls into view, a bar shrinking to the new share of the old price, or old and new prices side by side at very different sizes. It plays once, eased over about 1.5s, and then stays on the final price. One such moment per page, not on every price; the real numbers are always in the HTML, so the final price shows without JavaScript.
- **Shader backgrounds** (see the development skill) give a band living texture: grain, light rays, smoke. At most one per page, slow, mostly dark, in the brand golds and browns with the accent as a trace. Text over it needs a dark scrim (a gradient on the `.wrap` side) so it stays at full contrast; check the brightest part of the shader, not the average. Never a purple, blue or rainbow blend, never as wallpaper behind every band, and never instead of a better layout: a shader behind a flat composition is still a flat composition.
- **Motion is expected, especially in campaigns.** Sections fade and rise in as they arrive; headlines can reveal word by word; a photo can drift with parallax; an offer figure can grow or count up as it scrolls into view; a band can pin while its content changes. Every campaign has at least one memorable motion moment. Motion is smooth and deliberate (0.3–0.8s, eased), never jittery, never endlessly looping or flashing. Smooth scrolling is already on.

## Phones (375px)

- Design the phone version on purpose. In each section, the key visual sits with the headline (above it or straight after), before body copy and buttons.
- No empty gaps where a desktop column used to be.
- Huge headlines still fit: `clamp()` with a phone-sized minimum, no word wider than the screen.
- Buttons and links are easy to tap: at least 44px tall with space between them; the primary action is visible on the first screen.

## Usability

- **Every button and link reacts:** a clear hover state, a pressed state (a slight `scale(0.97)` or darker fill), and a visible keyboard focus ring (`:focus-visible`, an outline in gold or the accent). Never remove the focus outline without replacing it.
- **Text contrast:** body text at least 4.5:1 against its background, large headlines at least 3:1, including text over photos and gradients.
- **Nothing important on hover only:** phones have no hover.

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

- Did you set boldness, motion and density, and does the page actually reach them?
- Is the opening screen richer than the live one, not plainer? Is each fact said once?
- Does the page have one idea, and is it visible at thumbnail size?
- For a campaign: is the occasion the biggest text on the site, and does the campaign carry down the whole home page?
- One focal point per screen? Strong contrast between bands?
- Only the brand fonts, the brand family, neutrals and at most one accent?
- At least one deliberate motion moment, nothing gimmicky?
- Does it work at 375px, with nothing clipped or touching the edges?
