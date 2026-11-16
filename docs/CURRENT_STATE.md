# Current state

Snapshot as of 15 November 2026, at commit `fd47950` on `main`, deployed to both Railway services the same day. Read `CONTEXT.md` first for what we are building. This file says what exists, how it works, what has been tested, and what is broken or missing.

## Changed on 16 November 2026 (not yet deployed)

- **The agent's instructions were rewritten from scratch (decision 23).** The owner said the agent wasn't meeting his requirements (a New Year draft reused an AI image while generation was off). `agent/SKILL.md` and the four always-on skills were rewritten around his eleven requirements: a campaign changes the whole site; the occasion's name is the hero headline, the largest text on the site; the home page, a landing page, pricing, the nav button and the announcement bar all carry it; agency quality, defined concretely ("What not AI slop means here"); design freedom with fonts locked; real photos only while generation is off (type, colour and motion instead); clean at 375 px; real facts; hard limits first; visible learning; and one priority order (hard limits, then brand facts and taste memory, then core, then skills). Contradictions and duplicated rules between the core, the skills and the Studio rules in `src/agent.js` were removed; the Studio rules now only describe the site document, the library and the reply format. The imagery skill is loaded only when image generation is on (`activeSkills()` in `src/agent.js`). Prompt about 9,100 tokens (was about 14,400). `npm test` passes. Not yet run with the live agent.
- **New drafts are locked to the OTMENS photos while image generation is off** (`photosOnly` in `src/guard.js`, commit `9df9b9a`): only `/img/...` library photos, or pictures already on the live site, are accepted.

## Changed on 15 November 2026 (deployed in `fd47950`)

- **Railway fixed.** The Studio has a volume at `/data` (its log shows "Mounting volume" on start), and the website has `STUDIO_URL`. See known issues 1 and 2 for what is still unproven.

- **The agent can write code.** A new `custom` section type holds the agent's own HTML and section-scoped CSS, and can replace the home hero. A site-wide `global.css` lets it restyle every page. Both are sanitised by `src/code.js` and checked by `src/guard.js` (see "The checks"). Campaigns are now instructed to be takeovers: custom campaign hero, site-wide styling, offer on the plan cards, a landing page.
- **The agent has four skills.** `agent/skills/copywriting.md`, `design.md`, `flow-building.md` and `development.md`, loaded after the core `agent/SKILL.md`. Each reply lists the skills it used, shown as tags in the Studio chat.
- **The agent generates campaign images (added later on 15 November; see the commit that follows `fd47950`).** New tool `generate_images` (in `src/agent.js`): the agent writes prompts from the new imagery skill (`agent/skills/imagery.md`), and `src/images.js` sends each one to Higgsfield (model `marketing-studio/image/flare`, 2k, quality high; optionally with 1 to 3 product photos from the library as references, so OT products look like the real ones), has Claude review the result, and saves passing images to `DATA_DIR/media/` with an index. The review checks the hard rules (no bodies, needles, readable text or real people) and scores quality 1 to 10 against a real OTMENS photo (`/img/longevity.jpg`) and against any product reference; below 7 fails (`HF_MIN_IMAGE_SCORE`), enforced in code. Failed images come back to the agent with their problems, and it may retry once within the per-request limit. The agent then uses them by `/media/...` path like any library image. At most 3 new images per request (`HF_MAX_IMAGES_PER_REQUEST`). The Studio serves `/media/*` publicly; the website proxies `/media/*` from the Studio and caches it in memory. Generated images join the image library for later drafts. The Studio shows live progress ("Generating image 1 of 2") and thumbnails of new images in the chat, with an "Images" skill tag. Tested with five real images on 15 November. The first, with the SOUL model, passed the original rule-only check but the owner judged it "really bad": a 3D-mockup look, a generic tub with a sticker label, and implausible props. That led to the switch to Flare, product references, quality scoring and the rewritten skill. With Flare: two images rejected at 6/10 (fairly: contradictory light, AI-looking frost, a floating branch, an empty-plinth stock look), then, with simpler prompts, a Christmas product shot passed at 7/10 and matches the real product. An Easter mood scene was rejected at 6/10. About 25 s to generate and 15 s to review each. Not yet tested inside a full agent request.
- **The agent can write JavaScript, forms and iframes, and load libraries (decision 17).** Custom sections take a `js` field (runs after the page loads, with `section` set); the site takes `global.js`, `global.scripts` (up to 6 https:// library URLs, loaded deferred in the head) and outside links and images. Still checked in code: brand colours and fonts in all CSS (including `<style>` blocks and inline styles); no CSS or JS aimed at the footer, legal text or prescription notices; scripts must parse; quoted strings in scripts go through the health-claim and voice checks; no GSAP; `<html>`, `<head>`, `<body>`, `<base>`, `<meta>` can't be used inside a section; internal links and library images must exist. **Studio previews are sandboxed** (`Content-Security-Policy: sandbox`, plus sandboxed iframes), so agent scripts can't use the signed-in Studio; the compare view's scroll sync now works by messages; static assets send `Access-Control-Allow-Origin: *` so sandboxed previews can load fonts. The API refuses POSTs that aren't JSON from the Studio's own origin (403). Tested: `npm test` (58 checks: 10 newly allowed cases, 32 blocked cases, rendering and the protected pages); in real headless Chrome, a sandboxed preview, both opened directly and in a sandboxed frame, loads its styles, fonts, images, Lenis and the agent's scripts; a POST from a sandboxed origin or without JSON returns 403. Not tested in a real browser: the scroll sync between compare panes, and an interactive quiz being clicked.
- **While image generation is off, new drafts may use only the OTMENS photos (`/img/...`).** A live New Year draft reused a stone-stairs image Higgsfield had made before the switch-off. `validate(..., { photosOnly })` (on when `HF_IMAGES` is not `on`, used for agent drafts and at approval) now rejects `/media/...` images and outside image URLs, in HTML, image fields and CSS `url()`, unless the picture is already in the current version. Pushing older versions is unaffected. Tested in `npm test`.
- **Design rules relaxed (decision 22).** Colours: any shade of the brand's warm family, neutrals, and one campaign accent family across the site (code-checked in `src/code.js` `accentHues` and `src/guard.js`). Headlines up to 100 characters with two accent words. Design skill: effects allowed when they serve the idea, motion encouraged, campaigns can go darker or bolder. Development skill: Motion (`motion@14.14.0`, MIT) is the recommended animation library. Fonts unchanged. Tests updated (one accent allowed; a second accent in CSS, a `<style>` block or an inline style is blocked). Not yet run with the live agent.
- **Image generation is switched OFF (15 November, owner's call before recording the demo video).** The generated images still looked too AI. `src/images.js` now only generates when the Studio variable `HF_IMAGES=on` is set (the `HF_API_KEY` stays in Railway); without it the agent is told it can't make images and uses the photo library. To turn it back on: set `HF_IMAGES=on` on the Studio service.
- **Campaign heroes lead with the occasion.** The core skill and design skill now require the occasion's name ("Black Friday") as the hero headline in huge display type, the offer straight under it; a live Black Friday draft had shown it only in a small eyebrow.
- **The page container's margins are locked** in `public/styles.css` (`.custom .wrap` with `!important`): a live campaign hero had overridden its own `.wrap` width and its text ran to the screen edge. Verified in headless Chrome with a section that tries to remove them.
- **Images reworked against "AI slop" (decision 20).** Style references (two OTMENS photos) on every image; imagery skill rewritten; the check names AI tells and judges the saved file; pass mark 6, calibrated on seven images; older images not reused. Also: Higgsfield submit retries once on timeout with the same idempotency key, and downloads allow 180 s with one retry (this Mac's link to the CDN measured about 177 KB/s and dropped once; Railway is far faster). Tested: bake-off of three models, calibration of the check on seven images, two images written to the new rules (both 6/10, photographic). Not yet tested inside a live campaign request. About 16 Higgsfield images used in total from the $5 balance.
- **Custom sections must use the page container (`.wrap`).** A live Christmas hero had its text clipped at the screen edge because it had no container; the guard now rejects a custom section with text and no `.wrap`, and the development skill says so.
- **OT Studio restyled in neutral black and white (decision 21),** including the login page; the preview "Changed" outline is muted blue.
- **Fixed: a long campaign reply could be lost (15 November, after a live Christmas run).** The agent said it had drafted a Christmas campaign and two new images were made, but no draft was saved. The likely cause: the reply hit the 20,000-token output limit (or sent its edit list as text), and the loop treated a reply without usable edits as "just a message". Now: replies are streamed with `max_tokens` 64,000; a reply cut off at the limit is resent once, more compactly, then fails honestly; an edit list sent as a JSON string is parsed; a reply that lists changes but sends no edits is asked once for them; every model turn logs its stop reason and output tokens (`[agent] turn ...` in the Studio log). Also, while the agent is working, approve, discard, push, restore and reset are refused (409) and their buttons greyed out: in the same incident the open draft was discarded and versions restored and pushed mid-run. Tested with `test/agent-loop.js` (part of `npm test`), which replays scripted model replies: no API cost. Not yet seen with a live campaign.
- **Design and development skills gained about ten craft rules** adapted from Emil Kowalski's apple-design skill (decision 19): press feedback, interruptible motion, spatial consistency, size-specific type, reduced-motion/transparency/contrast handling, "simplicity, not minimalism", calm motion. Agent prompt is now about 14,400 tokens. Not yet run with the live agent.
- **Smooth scrolling with Lenis (decision 18).** On every page except the protected ones, from `/vendor/lenis.min.js` (the `lenis` npm package, MIT), as `window.lenis`. Mouse and trackpad only, off for reduced motion, `global.smoothScroll: false` turns it off.
- **Compare any two versions (Studio).** The "Side by side" view is now "Compare": two drop-downs pick any of the live site, the open draft or any saved version for each side, with a swap button. The right side outlines in gold every section that differs from the left (`/view/<which>/<page>?vs=<live|draft|head|N>`). The Versions panel has a "Compare" button per version that opens it against the draft (or the newest version). Defaults are unchanged: live site on the left, draft on the right. Tested locally with three versions and a draft.
- **Temporary campaign rule.** At the owner's request, `agent/SKILL.md` (Campaigns, step 3) has a rule marked TEMPORARY: a campaign takes over the whole home page, with an offer band straight after the hero, at least three more campaign-styled sections, one recurring visual device, and the offer interrupting the scroll at least every second screen. Remove or soften it when the owner says. Superseded on 16 November: the rewrite made the whole-home-page campaign permanent (decision 23).
- **Skills tuned after the live test.** Design and development now require a deliberate phone layout (the key visual stays with the headline, no empty gaps) and readable small print (13px or more, full contrast). Flow building requires the nav button to match the campaign's one action. Copywriting keeps Gold's "Most popular" badge during campaigns. Not yet re-run with the live agent.
- **Tested with the real agent.** "Run a Black Friday sale" produced a full takeover that passed every check and went live as version 2 (see "What has been tested"). Version 2 survived a Studio redeploy.

## In one paragraph

A working, deployed proof of concept. The OT Studio lets a user ask a Claude-powered agent for website changes in plain English. The agent returns structured edits that are applied to a copy of the site, checked in code, and previewed side by side with the live site. Approving stores a numbered version; pushing makes it live; any version can be restored. The live agent has produced campaigns (Black Friday, Christmas, New Year) and a bold homepage redesign in 28 to 56 seconds each, all passing every check. Two promises in the brief do not work in production: **image generation** (not built) and **learning that persists** (the Studio's data is wiped on every redeploy).

## Where everything lives

| Thing | Location |
| --- | --- |
| Code | GitHub `ripple-hue/OTmenshealth`, branch `main` (the only branch) |
| Hosting | Railway project `joyful-reverence`, environment `production` |
| Public website | Railway service **OTmenshealth**, `https://otmenshealth-production.up.railway.app`, start command `npm start` (`node server.js`) |
| Studio | Railway service **Studio**, `https://studio-production-d079c543.up.railway.app`, custom start command `node studio.js` |
| Studio data | Railway volume `studio-volume` (500 MB), attached to the Studio service at `/data`; Studio variable `DATA_DIR=/data`. Added 15 November 2026 |
| Website to Studio link | Railway variable `STUDIO_URL=https://studio-production-d079c543.up.railway.app` on the OTmenshealth service. Added 15 November 2026 |
| Studio passcode | Railway variable `STUDIO_PASSCODE` on the Studio service. Ask the agency owner. Never commit it. |
| Claude API key | Railway variable `ANTHROPIC_API_KEY` on the Studio service, supplied by the agency owner |
| Image generation | Higgsfield account (connected to Claude sessions as an MCP server). Free plan, about 1.45 credits left |

**Pushing to `main` redeploys both Railway services automatically.** Until 15 November 2026 every redeploy wiped the Studio's data, because the project had no volume. A volume is now attached at `/data`, so data should survive redeploys; see known issue 1 for what has been verified.

The Railway CLI and the GitHub CLI (`gh`, signed in as `ripple-hue`) are installed on the agency owner's Mac, and the working copy at `~/Downloads/OTmenshealth` is a git checkout of this repo, linked to `joyful-reverence` / `production` (`railway status`). Service IDs: Studio `6da9d776-e8f8-48e0-9f5d-22ef53618b33`, OTmenshealth `2200a970-c941-4c25-9d7b-472fef04c5b2`. CLI 5.74 quirks: `railway volume` takes `--service <ID>` before the subcommand (`railway volume --service <ID> add --mount-path /data`), and `railway volume list` without `--service` only shows the linked service's volumes. Reading volume files and `railway ssh` need SSH keys, which are not set up.

Railway is on a trial (about $5 of credit, 29 days, as of 14 November).

## Repository map

```
server.js            Public website. Renders the live version.
studio.js            OT Studio: login, API, previews, background agent runs.
studio/index.html    The Studio UI (single file, vanilla JS, polls the API).
src/render.js        Section library: one render function per section type (including `custom`), page shell, site-wide CSS, preview prefixes.
src/code.js          Agent-written code: HTML sanitiser, CSS checks (palette, fonts, URLs), CSS scoping for custom sections.
src/guard.js         SPEC (section docs the agent sees), themes, variants, validate(), diff().
src/agent.js         System prompt assembly (core + four skills + brand guide + library), the Claude call, edit operations, repair loop.
src/store.js         File-based store: state.json plus v1.json, v2.json, ... and media/ (generated images and their index) in DATA_DIR.
src/images.js        Image generation: Higgsfield API client, Claude image review, download and save.
agent/SKILL.md       The agent's core instructions: brand, hard limits, size of the ask, campaigns, self-review, learning.
agent/skills/        The five skills: copywriting.md, design.md, flow-building.md, development.md, imagery.md.
brand/brand-guide.md OTMENS facts, look, voice, image direction, promotion rules.
content/site.json    Version 1 of the site (the seed). Three pages.
test/agent-code.js   `npm test`: a good campaign takeover and 26 bad drafts through applyOps, validate and render. No API key needed.
public/styles.css    Brand tokens and all styling, including variants and themes.
public/img/          Five generated photos. public/fonts/ Self-hosted Instrument Serif and Inter Tight.
README.md            Short run guide (partly out of date on the section library).
docs/                These documents.
```

Dependencies: Node 20 or later, three npm packages: `@anthropic-ai/sdk`; `sharp` (converts generated images to WebP; it ships prebuilt native binaries); `lenis` (smooth scrolling, MIT; its browser file is served from `node_modules`). No framework, no build step, no database.

## How it works

### The site document

```json
{
  "global": {
    "announcement": { "text": "...", "linkLabel": "...", "href": "/membership" },
    "nav": [{ "label": "...", "href": "..." }],
    "navCta": { "label": "...", "href": "..." },
    "footer": { "line": "...", "legal": "..." }
  },
  "pages": {
    "home": { "path": "/", "title": "...", "description": "...", "sections": [ { "id": "home-hero", "type": "hero", ... } ] },
    "treatments": { "path": "/treatments", ... },
    "membership": { "path": "/membership", ... }
  }
}
```

Headlines mark their one accent word with asterisks: `"Own Your *Health.*"` renders the bracketed part in italic gold serif.

### The section library (16 types) and agent code

`custom` (the 16th type) is a section the agent codes itself: fields `html`, `css`, optional `theme`, `dark` (dark background; when it opens a page the nav turns dark) and `anchor`. It can go anywhere, including first on the home page instead of the hero. Its CSS is wrapped in `[data-section="<id>"]{ ... }` using native CSS nesting, with `@keyframes` lifted to the top level. `global.css` is a stylesheet the agent sets with `update_global`; it is added to every page after `styles.css`, but not to the protected placeholder pages.


| Type | Variants | Takes a theme | Notes |
| --- | --- | --- | --- |
| `hero` | `photo` (default), `arch`, `statement` | no (always dark) | Home page, first section only. `arch` takes `tag` (gold/silver) and `note` |
| `statement` | | yes (default ink) | One huge line on its own band |
| `marquee` | | yes (default champagne) | Scrolling italic words |
| `facts` | | no (dark) | Up to four facts |
| `steps` | `cards`, `staggered` | yes | Three steps with built-in visuals `checklist`, `plan`, `trend` |
| `feature` | `flip: true` | yes (default cream) | Copy plus `visual: report` or a photo (`image`) |
| `tracks` | `cards`, `expand` | yes | Three treatment photo cards |
| `plansTeaser` | `cards`, `tilted` | yes (default cream) | Membership summary with key tags |
| `faq` | | yes | |
| `cta` | `plain`, `image` | yes (default champagne) | Closing call to action |
| `promo` | | no (dark) | Campaign band with offer and terms |
| `pageHeader` | | no | Inner-page header |
| `trackList` | | no | Editorial rows, one per treatment track |
| `plans` | | no | Full pricing cards |
| `compare` | | yes (default cream) | Comparison table |
| `custom` | | yes (optional) | The agent's own HTML and CSS. See above |

Themes: `paper`, `cream`, `champagne`, `ink`. The authoritative descriptions the agent reads are in `SPEC` in `src/guard.js`. Visuals available: `checklist`, `plan`, `trend`, `report`, `plate`. Images available: the five files in `public/img/` (the agent sees one-line descriptions of each in `src/agent.js`).

### One agent request, end to end

1. The browser posts to `/api/chat`. The Studio records the message, sets an in-memory `busy` flag, starts `runAgent` in the background and returns at once.
2. The browser polls `/api/state` every 1.5 seconds until `busy` clears. (A single long-held request was cut off after about 30 seconds in production, so this was changed.)
3. `src/agent.js` builds the system prompt from `agent/SKILL.md`, the four skills in `agent/skills/` (in the order copywriting, design, flow building, development), `brand/brand-guide.md`, the Studio rules, the section library, the site-wide CSS rules and the image library: about 9,000 tokens, cached. The user turn contains today's date, the taste memory, the open draft and the current version as full JSON, and the message. The last 8 chat messages go in as history.
4. Claude is called with model `claude-opus-5-5` (env `AGENT_MODEL`), effort `medium` (env `AGENT_EFFORT`), `max_tokens` 20000 (raised from 16000 for custom code; kept under the SDK's limit for non-streaming requests), one tool `respond_to_jacob`, the system prompt marked for prompt caching, and server-side refusal fallbacks (`betas: ['server-side-fallback-2026-07-01']`, `fallbacks: 'default'`). If that request is rejected with a 400, it retries once without fallbacks.
5. The tool call returns `message`, `operations`, `summary`, `changes[{what, why}]`, `lessons_learned`, `lessons_applied`, `skills_used`, `needs_from_jacob`, `declined`.
6. `applyOps` applies the operations to a copy of the draft (or of the head version): `update_section` (a `null` field removes it), `add_section`, `remove_section`, `move_section`, `update_global`, `add_page`, `update_page`, `remove_page`, `revert_section`, `reset_draft`.
7. `validate()` runs the checks. If anything fails, the errors go back to Claude as a tool error and it gets up to two repair attempts. If it still fails, no draft is made and the user is told.
8. On success the draft, its change list and the check report are stored, lessons are appended to taste memory, and the agent's message is added to the chat.

### The checks in `src/guard.js`

Every draft, and every version at approve and push time, must pass all of:

1. **Built from the section library.** Known types, required fields, unique ids, valid variants and themes, a home page, valid page paths, at most five nav links, hero only first on home.
2. **Checkout, portal and medical pages untouched.** No page may live under `/checkout`, `/portal` or `/intake`. These exist only as locked placeholder pages; the agent may link to them.
3. **Code is safe and on brand** (for `custom` sections and `global.css`). HTML: an allowlist of tags and attributes; no `<script>`, `<style>`, `<iframe>`, forms, media or event handlers; links only to site pages, protected pages or anchors; `<img>` only from the library. CSS: no `<`, `@import`, `@font-face`, outside `url()` or script-like CSS; colours only the brand palette (hex or `rgba()` of it, plus black and white rgba for shadows), no named or `hsl()` colours; fonts only the brand families, no `font` shorthand; no selectors for the footer, legal text or prescription notices; balanced braces; size limits. The renderer also sanitises on its own, so unchecked code still cannot run scripts.
4. **Every link and image resolves.** Internal links (including those inside custom HTML) must hit an existing page, an anchor, or a locked page. Images must be in `public/img/`.
5. **Health-claim rules.** Also applied to the visible text and alt text of custom HTML. A regex list: guaranteed results, absolute and "proven" claims, cures, "no prescription" framing, before-and-after, specific physical outcomes, results in a set time, FDA claims, false scarcity, insecurity targeting.
6. **Brand voice and layout limits.** Banned generic phrases ("elevate", "unlock", "seamless" and others), no exclamation marks, length limits on headlines, eyebrows and titles, at most one accent word per headline. Custom HTML text gets the phrase and punctuation checks but not the length limits.
7. **Every page renders.**

Two further signals are shown to the user without blocking: **new figures** (prices or percentages not on the current site) and **markers** (`[NEEDS FROM JACOB: ...]`). A draft with a marker cannot be approved.

### Versions and data

`src/store.js` keeps everything as JSON files in `DATA_DIR` (default `./data`, gitignored):

- `state.json`: `head`, `live`, `versions[{n, summary, createdAt, pushedAt}]`, `draft` (or null), `memory[{id, rule, at, from}]`, `chat[]`.
- `v1.json`, `v2.json`, ...: full site documents. Version 1 is seeded from `content/site.json` on first start.

Writes are atomic (temp file then rename). There is no database, no locking beyond the single `busy` flag, and the design assumes one Studio instance.

### Studio HTTP routes

| Route | Auth | Purpose |
| --- | --- | --- |
| `POST /login` | none | Passcode form; sets an `ot_studio` cookie |
| `GET /` | yes | Studio UI |
| `GET /api/state` | yes | Everything the UI needs |
| `POST /api/chat` | yes | Start an agent run (`{message, rejected}`) |
| `POST /api/approve`, `/discard`, `/push` (`{n}`), `/restore` (`{n}`), `/forget` (`{id}`), `/reset` | yes | Version and memory actions. `reset` wipes everything back to version 1 |
| `GET /view/{live,draft,head,vN}/<page path>` | yes | Renders a version. `?vs=<live\|draft\|head\|N>` outlines sections that differ from that version (the draft defaults to comparing with the head). `?hl=0` turns off change highlighting, `?scroll=0` stops auto-scroll to the first change |
| `GET /api/published` | **none** | The live version as JSON, for the public website |
| `GET /media/<file>` | **none** | A generated image from `DATA_DIR/media`, for previews and the website (which proxies it) |
| static files under `public/` | none | CSS, fonts, images |

### The public website

`server.js` renders the version the Studio marks live. With `STUDIO_URL` set, it fetches `/api/published`, caches it for 3 seconds, and falls back to the last copy it fetched, or to `content/site.json` if it never reached the Studio. Without `STUDIO_URL`, it always serves `content/site.json`.

### Configuration

Studio service: `ANTHROPIC_API_KEY` (required for the agent), `STUDIO_PASSCODE` (default `otmens`), `DATA_DIR` (point at a mounted volume), `LIVE_SITE_URL` (for the "Live site" link), `AGENT_MODEL`, `AGENT_EFFORT`, `AGENT_BASE_URL`, `PORT`. Images: `HF_API_KEY` (Higgsfield API key; without it the agent is told it cannot make images), optional `HF_IMAGE_MODEL` (default `marketing-studio/image/flare`), `HF_IMAGE_RESOLUTION` (default `2k`), `HF_IMAGE_QUALITY` (default `high`), `HF_MAX_IMAGES_PER_REQUEST` (default 3, retries included), `HF_MIN_IMAGE_SCORE` (default 7), `STUDIO_PUBLIC_URL` (defaults to Railway's public domain; used to give Higgsfield public URLs for reference images). Reference images under `/img/` are fetched from `LIVE_SITE_URL`.

Website service: `STUDIO_URL`, `PORT`.

### Running locally

```bash
npm install
```

```bash
ANTHROPIC_API_KEY=... DATA_DIR=./data node studio.js
```

```bash
STUDIO_URL=http://localhost:4100 node server.js
```

Studio on `http://localhost:4100` (passcode `otmens` unless set), website on `http://localhost:4000`. Without an API key everything except the agent works, and the agent replies with a clear "no API key" message.

To test without calling Claude, require `src/agent.js` and call `applyOps(current, operations, current)`, then `validate(result, current)` from `src/guard.js`, and write a `draft` into `state.json` via `src/store.js`. This is how the approve, push and undo flow was first tested.

## What has been tested, with results

All live tests ran against the deployed Railway Studio with the real agent unless marked local.

| Test | Result |
| --- | --- |
| Clean clone, `npm ci`, both apps start | Pass (local) |
| Wrong passcode rejected; API returns 401 when signed out | Pass (local) |
| Draft never appears on the public site; approved-but-not-pushed never appears; push shows it, including a new page; restore v1 plus push undoes it | Pass (local, both servers) |
| Hand-written bad draft (guaranteed results, "no prescription", "Unlock", "!", fake image, dead link, page at `/checkout`, unknown section type) | Blocked on all ten counts (local) |
| Unknown variant and theme | Blocked (local) |
| "Run a Black Friday sale" | 56 s. Used the existing Gold offer, dates 27 to 30 November, touched announcement bar, homepage, pricing, FAQs, new `/black-friday` page. All checks pass |
| "Run a Christmas sale. 20% off annual Silver for new members, December 15 to 26." | 51 s. Calculated $383.20, flagged it as a new figure, blocked its own draft with a marker for the renewal price. After "It renews at $479" (19 s) the marker cleared |
| "Run a New Year sale" | 51 s. Used the standing Gold offer and refused to add an end date because that would be false urgency |
| "The homepage feels weak, make it hit harder" (before the design upgrade) | 31 to 35 s. Copy-only edits; the owner judged this too timid |
| Rejection: "Too wordy. Keep the hero headline as Own Your Health and cut the body copy in half." | 28 s. Hero body cut from 15 words to 6; three rules saved to taste memory. Shown in the screen recording |
| Approve, push live, undo by pushing v1 | Pass on Railway in the screen recording |
| "The homepage feels weak, make it hit harder" (after the design upgrade, commit `ce90c06`) | 54 s. Full redesign around "bloodwork first": type-only hero, staircase steps, dark statement band, expanding photo panels, tilted plan cards, image closing panel; FAQ removed. All checks pass. It also replaced the "Own Your Health." tagline |
| Every new variant and theme renders at 1280 px and 375 px with no horizontal scroll | Pass (local, hand-built composition) |
| Agent code: a hand-built Black Friday takeover (custom dark hero replacing the hero, site-wide CSS for the announcement bar, buttons and Gold card) passes every check; the custom CSS is scoped; `@keyframes` are lifted out; the site CSS reaches every page but not `/checkout`; the nav turns dark over the custom hero; preview links are prefixed | Pass (local, 15 Nov) |
| Agent code: 26 unsafe or off-brand drafts are each blocked with a readable reason (script, event handler, `javascript:` and outside links, dead link, outside image, iframe, form, off-palette hex and rgba, named and hsl colours, non-brand font, font shorthand, `@import`, outside `url()`, brace escape, `</style>` breakout, hiding `.legal`, off-brand inline style, "guaranteed", "no prescription", "Unlock", "!", insecurity in alt text, site CSS hiding the footer); the renderer strips scripts and handlers on its own | Pass (local, 15 Nov). Run with `npm test` (`test/agent-code.js`, then `test/agent-loop.js` for the agent loop); `node test/agent-code.js ./data` also stores the takeover as an open draft so a local Studio can preview it |
| The takeover at 1280 px and 375 px: renders, no horizontal scroll | Pass (local, 15 Nov). The hand-built hero's photo overlaps the headline at 1280 px, a flaw in the test design, not the capability |
| The system prompt assembles with the core, four skills (no frontmatter), brand guide, `custom` spec and site-CSS rules | Pass (local, 15 Nov). About 9,000 tokens |
| Skill tags render above an agent reply in the Studio chat | Pass (local, with a stand-in chat message); also seen live |
| "Run a Black Friday sale" with the new capability (live agent, 15 Nov), then approve and push as version 2 | Pass. A takeover: custom ink hero ("Three months of Gold, *free.*" with a giant italic 3), site-wide CSS (ink announcement bar), a Black Friday nav link, a promo band, offer and "Black Friday" badge on the Gold card, a `/black-friday` page (custom offer with a tilted gold key-tag card, a champagne statement "A better price. The same *care.*", a custom numbered "What Gold includes" list, an ink terms FAQ, an image close), a terms FAQ entry. Used the existing offer, no invented figures, all checks pass, skill tags Copy, Design, Flow, Code. Reply listed the dates for Jacob to confirm. Run time not recorded |
| The live campaign on the public site at 1280 px and 375 px (home, `/black-friday`, `/membership`) | Pass: no horizontal scroll, nothing overflowing. Weaknesses: on phones the home hero's giant 3 drops below the button and leaves a large empty gap; the "for the year" note on the gold card is hard to read; the nav button still says "Become a member" while the campaign buttons say "Choose Gold" / "See the Gold offer"; the "Black Friday" badge replaced "Most popular" on Gold; on phones the nav links (including Black Friday) are hidden, as they always were below 900 px |
| Redeploy the Studio with version 2 live | Pass: version 2 still live afterwards, campaign intact, public site unchanged |

Not yet tested at all: requests other than a campaign with the new capability (a redesign, a flow such as "Find your plan"); a rejection-and-retry cycle with the skills; a request the agent must refuse (for example "say results are guaranteed" or "edit the checkout") against the live agent; several rejections in a row; long chats; two people using the Studio at once; the Studio UI on a phone; cost per request.

Artefacts from these tests (screenshots, a 2 min 16 s screen recording) were delivered in the agency owner's chat. They are not in this repo, and uploading them to Google Drive failed (see known issues).

## Known issues, most serious first

1. **Fixed and verified (15 November 2026): Studio data loss on redeploy.** Cause: `DATA_DIR=/data` was set, but the project had no volume, so `/data` was inside the container and wiped on every deploy. A 500 MB volume is now attached to the Studio at `/data`. Verified: version 2 was live, the Studio was redeployed, and it came back with version 2 still live and the campaign intact.
2. **Fixed and verified (15 November 2026): public website following the Studio.** Cause: `STUDIO_URL` was never set on the website service, so the public site always served the bundled `content/site.json`. Verified: pushing version 2 put the Black Friday campaign on the public URL, including the new `/black-friday` page.
3. **Image generation: built and tested image by image, not yet tested in a full agent request.** Uses the Higgsfield API (a separate prepaid dollar balance, not the higgsfield.ai website plan; $5 added 15 November 2026, five test images used). The key is the Studio variable `HF_API_KEY` (one combined `id:secret` value). Higgsfield returns 5 MB PNGs; `src/images.js` converts each to WebP (quality 82, at most 2400 px on the long side) with `sharp` before saving: the test image went from 5.2 MB to 186 KB with no visible loss. If `sharp` fails to load, the original is saved and an error is logged. The image check is a model review, not a guarantee, and it rejects often (3 of 4 Flare images), which spends the per-request budget. Mood scenes without a product have not passed yet. Generated images are never deleted except by "Reset the demo". If `HF_IMAGE_MODEL` is set back to SOUL (`higgsfield-ai/soul/standard`), it only accepts `720p`/`1080p`, despite its published spec.
4. **The bold redesign replaced Jacob's tagline** ("Own Your Health."). Undecided whether to lock it.
5. **Health-claim checking is a phrase list.** It catches obvious wording but misses rephrasing (for example "drop two sizes"). It is not a legal review.
6. **Authentication is minimal.** One shared passcode; the cookie is a hash of the passcode (no expiry rotation, no logout); any signed-in user can `reset` everything; no rate limiting.
7. **Single instance only.** The `busy` flag is in memory and the store is JSON files, so two Studio replicas or two simultaneous users would conflict.
8. **Cost and latency grow with the site.** The whole current site and the whole draft go into every request as JSON. Cost per request has never been measured.
9. **Campaigns do not schedule or end themselves.** The end date is only written into the copy; ending a campaign means restoring and pushing an earlier version by hand.
10. **Studio UI polish.** The status bar above the preview wraps to three rows; a long "what changed" list pushes the agent's message off screen.
11. **README.md is out of date** on the section library (it predates variants and themes).
12. **The Hormone treatment photo** reads slightly like a perfume bottle.
13. **Google Drive uploads from Claude sessions fail above about 3 MB per call**, so the recording (6 to 10 MB) and the screenshot zip (4 MB) were never uploaded.
14. **Custom sections can look wrong without failing a check.** The checks catch unsafe and off-brand code, not bad composition: overlapping elements, poor contrast within the palette, weak layouts at one width. Preview and approval are the safeguard.
15. **Custom CSS relies on native CSS nesting** (Chrome 120+, Safari 17.2+, Firefox 117+, all from 2023 onward). On older browsers a custom section shows unstyled, though still readable.
16. **Site-wide CSS can still hide content** other than the footer, legal text and prescription notices (for example a whole section with `display: none`). Only those three areas are protected in code.
17. **A campaign's custom hero replaces Jacob's "Own Your Health." hero** for the campaign's duration. Restoring the previous version brings it back.
18. **Script-built text is only partly checked.** The health-claim and voice checks read the quoted strings in agent scripts, but text a script assembles at run time (joined pieces, data) can slip past. Review interactive pieces in the preview.
19. **The Claude desktop app's built-in browser pane can't show Studio previews** since they became sandboxed: it blocks every request from a sandboxed page (`net::ERR_BLOCKED_BY_CLIENT`), so the panes are blank or unstyled there. Real Chrome renders them correctly (tested headless). Use a normal browser to review the Studio, and headless Chrome or a test harness for automated checks.
20. **Studio previews can't use cookies or localStorage** (sandboxed). Agent scripts that depend on them work on the live site but not in the preview.

## Content that is not verified

The brand was rebuilt from screenshots. Confirm these with Jacob before anything is shown as fact:

- Three of the six treatment tracks (Peptide Therapy, NAD+ and Supplements, Sexual Health) were named from the treatment chips in a screenshot, not from his site.
- "Plus everything in Silver" under Gold is an assumption; his Gold bloodwork details were cut off.
- The sample results card uses placeholder marker names ("Marker 02", "Marker 03").
- Campaign dates, the Christmas discount and its renewal price were test inputs, not Jacob's terms.
- The five images were generated; none are Jacob's photography.
- His real site platform (Shopify, Webflow, WordPress or custom) is unknown.

## Evaluation against the ask

**Against the written brief (two-day proof of concept): roughly 75 to 80 percent delivered.** This is a judgement, not a measurement.

| Brief item | Status |
| --- | --- |
| Plain English becomes a change | Delivered |
| Preview within a minute | Delivered, just (28 to 56 s) |
| Compare with the current site | Delivered |
| Nothing live without approval; site updates without a developer | Delivered |
| Undo | Delivered |
| Never breaks the site | Delivered |
| Never touches checkout or medical | Delivered for the demo; untested against a real site |
| No risky health claims | Partial (phrase list plus instructions) |
| Looks and sounds like OTMENS | Mostly; brand from screenshots, tagline replaced in the redesign |
| Learns from rejection, visibly | Built; production storage fixed and verified 15 Nov. A rejection cycle has not been re-run since |
| Campaigns touch every relevant surface | Delivered |
| Campaigns create images | Built 15 Nov; one real image generated and passed the check; not yet seen in a full campaign |
| Rarely needs correcting | Unproven |

**Against the owner's wider framing ("front-end developer tool with full design, copywriting, flow building and development capabilities of a large-scale company CTO"): roughly 25 percent before 15 November; an estimated 40 percent after the code and skills work, if the live agent uses it well (untested).** The agent can now build new visual components in HTML and CSS, restyle the whole site, and plan page-to-page flows. It still cannot write JavaScript, build forms, quizzes that store answers or integrations, change design tokens, or make architecture, analytics, performance or platform decisions. It works only on the three-page demo copy.

An accurate description of what exists: **a safe, on-brand site and campaign builder with a strong copywriter, an art director who can code the front end in HTML and CSS, and a flow planner inside it.**
