---
name: imagery
description: When and how to make new campaign images for the OTMENS site, written so they look like OTMENS photography and pass the image check.
---

# Skill: Imagery

You art-direct photography for a quiet-luxury health brand. New images exist to make a campaign feel made for its moment, Christmas, New Year, summer, not to decorate. Every image must look like it came from the same shoot as the photos already on the site.

## When to make images

- **Campaigns and large redesigns:** yes. A campaign usually needs one hero image, and at most one or two more (landing page, closing panel). Make the fewest images that carry the idea.
- **Small and medium changes:** no. Use the image library.
- **Reuse first.** Images made for earlier drafts are listed with each message. If one fits, use it instead of making a new one.
- **Never more than the limit per request**, and never a second attempt at an image that failed the check with the same idea.

## What OTMENS photography looks like

- **Products:** matte or frosted bottles and vials with gold caps and a small cream "OT" label, on stone blocks (limestone, travertine, basalt), editorial still life.
- **Light:** warm, low, directional side-light from a window; soft long shadows; calm.
- **Palette:** cream, champagne, honey gold, bronze and deep ink, with muted natural tones (stone, clay, sage, slate). Nothing saturated or neon.
- **People, only when the idea needs them:** a fit man doing endurance sport (cycling, running, rowing, hiking) in moody natural light, small in the frame, fully clothed, seen from behind or at a distance, face not prominent.
- **Seasonal cues stay quiet and grown-up.** Christmas: a sprig of pine or juniper, a linen ribbon, winter window light, frost on stone, a single gold ornament. Not Santa, red-and-green clutter, cartoon snow or gift-wrap chaos. New Year: morning light, a cold clear landscape, a fresh start. Summer: long golden-hour light, sea stone, linen.

## Writing a prompt

Write each prompt as one paragraph a photographer would understand, in this order:

1. **Subject:** "A matte black supplement bottle with a gold cap and a small cream label reading OT, standing on a block of pale travertine".
2. **Setting and seasonal cue:** "beside a single sprig of juniper and a loosely tied natural linen ribbon".
3. **Light:** "warm low winter sunlight from a window on the left, soft long shadows".
4. **Palette and mood:** "cream, champagne and bronze tones, quiet luxury, calm".
5. **Camera:** "editorial still-life photograph, 85mm, shallow depth of field, plenty of empty space on the right for text".
6. **What to leave out:** "no text, no people, no hands, no logos other than the OT label".

**Leave space for type.** A hero image needs calm empty space where the headline will sit. Say where.

**Pick the aspect for where it goes:** 16:9 or 21:9 for a full-width hero or band, 4:5 or 3:4 for a card or a column, 1:1 for a small tile.

## Never ask for

These fail the image check and the brand, and some would break health-ad rules:

- Bodies as the subject: shirtless or partly clothed men, torsos, abs, muscles, physiques, mirrors, scales, measuring tapes, before-and-after anything.
- Needles, syringes, injections, IV bags, blood, pills being swallowed, lab coats, doctors, clinics or hospital settings.
- Readable text, prices, numbers or slogans in the image. Words go in HTML.
- Real or recognisable people, celebrities, or anyone presented as a clinician.
- Stock clichés: men laughing at phones, thumbs up, floating pills, pastel backgrounds.

## Using the images

- Use each OK image by its exact `/media/...` path: an `image` field on a library section, `<img src>` in a custom section, or `url()` in custom CSS.
- Write real `alt` text describing the image, not the offer.
- Crop with CSS (`object-fit: cover`, `object-position`) so the subject stays clear of the headline at 1280px and at 375px.
- If an image failed the check, carry on with the library photos and say in `needs_from_jacob` what shot was missing. Don't block the draft on it.

## Checklist

- Does every new image earn its place? Could a library or earlier image have done it?
- Would it sit next to the existing product photos without looking like a different brand?
- Is there clean space where the headline sits?
- Nothing from "Never ask for".
