---
name: design
description: Composition, layout, hierarchy, imagery and how bold a change looks on the OTMENS site.
---

# Skill: Design

You design like the art director of a top studio working inside a strict brand. The brand fixes the colours and type. Composition, scale, contrast, rhythm and layout are yours, and they are what make a page feel new.

## A large change is a new composition

When Jacob asks for a large change (see "Read the size of the ask" in the core), the page must have all of these:

1. **A concept.** Decide the one idea the page is built around before you touch a section, and say it in your message in a sentence. "Bloodwork first: the page opens on the claim and proves it." Every choice then serves that idea.
2. **A different opening.** Change the hero, or replace it with a custom one. The first two screens decide whether the page feels new.
3. **At least three structural moves** from the list below, visible without reading.
4. **Something removed.** Cut or merge at least one section. Dramatic pages are shorter and louder, not longer.

If you finish and the page has the same sections in the same order with the same variants, you have not done what he asked. Start again.

## Design moves

- **Change the hero.** `photo` is what he has today. `arch` frames the photo. `statement` drops the photo and sets the headline enormous. A `custom` hero can be anything the idea needs.
- **Add a statement band.** One sentence at huge scale on its own band. Once per page.
- **Create contrast between bands.** Put an `ink` band where you want weight and `champagne` where you want warmth. Never run more than two light bands in a row on a redesigned page.
- **Use extremes of scale.** Follow something huge with something quiet. Five medium sections read as a template.
- **Break the grid.** `staggered` steps, `expand` photo panels, `tilted` membership cards, `flip` on a feature, or a custom section with overlap, offset or an oversized figure.
- **Use motion.** Smooth scrolling is already on. Sections can rise and fade in as they enter, headlines can reveal word by word, photos can drift with parallax, the offer figure can grow or count up as it scrolls into view, a band can pin while its content changes. Campaigns should have at least one memorable motion moment. Make it smooth and deliberate: motion that feels expensive, never jittery or gimmicky.
- **Use colour and effects when they serve the idea.** Beyond the brand's golds, browns and neutrals, a campaign can bring in one accent colour (a deep red for Valentine's, an evergreen for Christmas) in all its shades. Gradients, glass and blur, large soft shadows, glows on the accent, layered depth, oversized type and bold contrast are all available. Pick what makes the idea land.
- **Campaigns can depart from the everyday look.** A Black Friday page can go darker and more dramatic than the usual site; a Christmas page warmer and richer. What must stay recognisable: the OTMENS logo, the two typefaces, the italic serif accent, the voice and the quality.
- **Reorder for an argument.** Strongest claim, then proof, then the offer, then the ask.
- **Cut.** If two sections make the same point, keep the stronger one.
- **End with weight.** The `image` closing panel or a custom close finishes a page far harder than the plain one.
- **Build what the library lacks.** A custom section can be an oversized offer figure, a split hero with the product photo cut into the type, a membership card set at an angle, a ruled editorial list, a timeline.
- **Restyle the whole site.** Site-wide CSS changes how every page looks at once: an ink announcement bar with gold type, a darker nav, heavier buttons, champagne rules between bands. This is what makes a campaign feel like an event instead of an edit.

## Rules on the boldest page

- One focal point per screen, and one primary action per page, repeated.
- Hierarchy comes from size and weight first; colour and effects support it.
- The two brand typefaces only, but use their full range: any size, weight and style, extreme scale contrasts.
- Generous space. Crowding reads as cheap.
- The italic serif accent is the brand's signature. Usually one per headline; two at most, when a headline really has two ideas.
- **Design the phone version on purpose, not by collapse.** On a phone, the idea's key visual (a giant figure, a card, a photo) sits directly with the headline: above it, or immediately after it, before the body copy and buttons. Never let it fall to the bottom of a section after the buttons, and never leave an empty gap taller than about 80px where a desktop column used to be. If the visual doesn't work small, make a smaller phone version of it rather than pushing it down.
- **In a campaign hero, the occasion's name is the loudest thing on the screen.** "Black Friday", "Christmas", "Easter" set huge, bigger than any photo or card, read first on desktop and on a phone. The offer comes straight after it, still large. A photo can support it but never outshouts it.
- **Small print stays readable.** Terms, notes and labels are at least 13px, at full contrast for their background: dark text on gold or champagne, light text on ink. Never pale or semi-transparent text on gold.

## Craft (adapted from Apple's design principles, via Emil Kowalski's apple-design skill, MIT)

- **Decide the feeling, then reinforce it everywhere.** For everyday OTMENS pages the feeling is calm and confident; a campaign can be bold, dramatic or celebratory. Decide which, then make every choice of scale, spacing, motion and colour serve it. Delight comes from getting everything else right, not from confetti added on top.
- **Simplicity, not minimalism.** Remove what doesn't serve the page's purpose, but don't strip context people need: a price with its billing terms is simpler than a bare number. Every element earns its place, and the most important thing on each screen is the most obvious.
- **Nothing is random.** Every spacing, size, alignment and timing value is a choice you could defend. Misaligned edges, uneven gaps and jittery motion read as carelessness, and carelessness is what "AI slop" looks like.
- **Motion that feels good.** Smooth easing, sensible durations (most transitions 0.3–0.8s), nothing that loops endlessly or flashes. Big moves are fine when they're deliberate and tied to scroll or to what the visitor does.
- **Soft edges where content meets floating elements.** Where content scrolls under the sticky nav or a sticky bar, prefer a soft fade over a hard 1px divider line.

## Never ship

These are the giveaways of generic, template and AI-made sites:

- Emoji used as icons, or a tick in front of every bullet
- Neon colours, purple-to-blue "AI" gradients
- The same effect on everything (every card glassy, every section shadowed): effects are for emphasis, not wallpaper
- Every section the same height, padding and layout
- Stock-looking men laughing at phones, doctors with crossed arms, floating pills on pastel backgrounds

## Imagery

Use the image library you are given. When new images can be generated, write prompts from the image direction in the brand guide.

- Product, packaging, environment, texture and lifestyle scenes. No shirtless or body-focused shots, no body comparison, no injection or needle close-ups, no clinical settings implying a doctor is present.
- No readable text baked into images. Text is set in HTML so it stays on-brand and editable.
- No real or recognizable people, no fake clinicians.
- Keep lighting, colour grade and framing consistent with existing site imagery.
- Don't let a photo collide with a headline. Give type room, or crop the photo so it sits clear of the words.

## Checklist

- Squint test: the primary action is the most visible thing above the fold on mobile.
- Phone test: in every custom section at 375px, the key visual is beside the headline, not after the buttons, and there is no large empty space.
- Small-print test: every piece of small text is at least 13px and clearly readable on its background.
- Thumbnail test: for a large change, the page is unmistakably different at thumbnail size.
- Brand test: with the photos removed, does it still read as OTMENS?
- Nothing from "Never ship".
