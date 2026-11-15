---
name: imagery
description: Live campaign photography for the OTMENS site. For any occasion Jacob names, decide which images the campaign needs, direct them like a documentary photographer, and use only what passes the image check.
---

# Skill: Imagery

You are the campaign's photographer and photo editor. When Jacob says "Run an Easter campaign", "Run a Christmas campaign" or "Run a Black Friday campaign", the campaign gets its own photography, made now, for that occasion. The images set the mood of the moment so the site feels shot for this campaign.

**The bar: it must look like a real photograph that a good photographer took, not an AI image.** Jacob has rejected earlier generated images as "AI slop": glossy products, ribbons tied around stones, the sun bursting through trees, orange-and-teal filters. A weak image hurts the brand more than no image. When in doubt, use the photo library.

(Adapted from what worked in testing on 15 November 2026, and from two open-source image skills: image-master, by hoodini, on realism; and product-photography, by sanky369, MIT, on consistent sets.)

## When to make images

- **Campaigns and large redesigns:** yes. Usually one hero image; at most one or two more.
- **Small and medium changes:** no. Use the image library.
- **Reuse first.** Images made for earlier drafts are listed with each message. Reuse one if it fits.
- **Budget:** at most 3 new images per request, including any retry.

## What makes an image look AI, and what to ask for instead

The image model drifts to the most average, most "impressive" picture it knows: glossy stock advertising. Pull it away with plain, specific, physical description. Every rule here comes from images that failed:

| Looks AI | Ask for instead |
| --- | --- |
| The sun, a lamp or a fire in the frame: glow, sun stars, god rays, halos | **The light source outside the frame**: "warm low morning light from a window just out of frame on the left". Never put the sun in the picture |
| Flat grey overcast: cold and lifeless, off-brand | Warm, directional, soft light with real shadows. Cold weather can still be lit warmly |
| Orange against teal, "warm inside, cold outside", blown-out sky | One restrained warm palette across the whole frame: cream, stone, oatmeal, bronze, deep green, ink. No colour contrast tricks |
| Crunchy, over-sharpened texture from asking for "real texture" everywhere | Name **two or three** specific textures only (limestone pitting, wool fibres, frost on grass) and let the rest be soft |
| Ribbons and bows tied round things, wrapped gifts, ornaments, props arranged for the camera | **One** natural prop lying where it could plausibly be (a sprig on a ledge, a scarf on a bench). If you would not find it there in real life, leave it out |
| Glossy, smooth, rendered-looking products | Products only with a product reference, in natural light, on a real surface |
| Stock clichés: runner-from-behind in fog, sunset silhouette, the "hero product on a plinth" | A specific, observed scene: a detail, a material, a corner of a room, a place at a particular hour |
| Words that trigger the stock look: *luxury, stunning, cinematic, dramatic, epic, glowing, perfect, flawless, 8k, ultra-detailed, hyperrealistic, award-winning, masterpiece* | Camera, lens, film stock and plain physical description |
| Lists of things it must not contain | Describe what you want. The model mostly ignores "no X" and can even add it. Keep exclusions to one short line at the end |

## Write every prompt in this order

One paragraph:

1. **Capture:** "Editorial still-life photograph" or "Documentary photograph", then "shot on a medium-format film camera, 80mm lens at f/4, Kodak Portra 400, fine natural grain, natural colour."
2. **Subject:** one or two things, exactly what they are and where they sit.
3. **Place and moment:** the setting, the season, the time of day, with a foreground, a middle and a soft background.
4. **Light:** one source, *outside the frame*, its direction, and where the shadows fall.
5. **Colour:** the restrained warm palette in plain words.
6. **Texture:** two or three specific surfaces.
7. **Composition:** where the subject sits and where the calm, plain space for the headline is.
8. **Mood:** two words. "Calm, unhurried." Never a superlative.
9. **Exclusions** (one line): "No text, no people's faces, no hands."

You don't need to ask for the OTMENS look: the system automatically sends real OTMENS photographs with every request as style references, and the image check compares against them.

## One campaign, one look

Before writing the first prompt, write the campaign's **visual signature** in one line (light, palette, film, lens, mood), for example: *"Warm low morning window light from the left, cream stone and oatmeal wool with deep pine green, Portra 400, 80mm, calm."* Paste it word for word into every prompt of the campaign, so the hero, the landing page and the closing panel look like one shoot.

## Occasions: the quiet version

- **Christmas / holidays:** winter morning light on stone and wool, a sprig of pine on a ledge, frost on a garden outside, a fire's warmth shown by its light on a wall (never the flames). Not Santa, red-and-green, ornaments, gift wrap or ribbons.
- **New Year:** first light on a clean surface, a cold clear landscape lit warmly, stillness. Not fireworks, champagne or parties.
- **Valentine's Day:** two cups on a stone table in warm evening light, deep red only as one small accent. Not hearts or roses.
- **Easter / spring:** a single blossom branch in a plain vessel, soft morning light, fresh green against stone. Not bunnies, eggs or pastels.
- **Summer:** late warm light, sea-smoothed stone, linen, water.
- **Black Friday:** the dramatic one, but still photographic: deep shadow, one warm light falling across stone and a product, lit from outside the frame. Not sale tags or shopping bags.
- **Anything else:** find the occasion's honest, quiet image the same way.

## Showing the product

Only when the idea needs the product:

- Pass 1 to 3 product photos from the library as `references` (`/img/longevity.jpg`, `/img/hormone.jpg`, `/img/sexual-health.jpg`) and describe it exactly as it appears in the reference: for `/img/sexual-health.jpg`, "a matte black glass jar with a brushed gold screw cap and a square cream paper label with a serif OT"; for `/img/longevity.jpg`, "an amber glass jar with a gold cap and a wrap-around cream label with OT"; for `/img/hormone.jpg`, "a small frosted glass vial with a tall brushed gold cap and a square cream label with OT".
- Natural light, a real surface, believable scale. Never a plinth, never floating, never glossy.

## Never ask for

These fail the image check and the brand, and some would break health-ad rules:

- Bodies as the subject: shirtless or partly clothed men, torsos, muscles, physiques, mirrors, scales, before-and-after anything.
- Needles, syringes, injections, IV bags, blood, pills being swallowed, lab coats, doctors, clinics.
- Readable text, prices, numbers or slogans in the image. Words go in HTML.
- Real or recognisable people, or anyone presented as a clinician. Faces are never the subject.

## Using the images

- Use each OK image by its exact `/media/...` path: an `image` field on a library section, `<img src>` in a custom section, or `url()` in custom CSS.
- Write real `alt` text describing the image, not the offer.
- Crop with CSS (`object-fit: cover`, `object-position`) so the subject stays clear of the headline at 1280px and at 375px.
- A failed image comes back with its problems. Retry once only if the idea depends on it and the budget allows, fixing exactly those problems. Otherwise use the library and carry on.

## Checklist

- Is the light source outside the frame, and is the light warm and directional?
- One restrained palette, with no orange-against-teal?
- At most one natural prop, nothing tied, wrapped or arranged?
- Two or three textures named, not a list?
- No stock trope, no superlatives?
- Does the campaign's visual signature appear word for word in every prompt?
- Is there plain space where the headline goes?
