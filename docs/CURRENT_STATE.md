# Current state

Snapshot as of 15 November 2026, at commit `ce90c06` on `main`. Read `CONTEXT.md` first for what we are building. This file says what exists, how it works, what has been tested, and what is broken or missing.

## In one paragraph

A working, deployed proof of concept. The OT Studio lets a user ask a Claude-powered agent for website changes in plain English. The agent returns structured edits that are applied to a copy of the site, checked in code, and previewed side by side with the live site. Approving stores a numbered version; pushing makes it live; any version can be restored. The live agent has produced campaigns (Black Friday, Christmas, New Year) and a bold homepage redesign in 28 to 56 seconds each, all passing every check. Two promises in the brief do not work in production: **image generation** (not built) and **learning that persists** (the Studio's data is wiped on every redeploy).

## Where everything lives

| Thing | Location |
| --- | --- |
| Code | GitHub `ripple-hue/OTmenshealth`, branch `main` (the only branch) |
| Hosting | Railway project `joyful-reverence`, environment `production` |
| Public website | Railway service **OTmenshealth**, `https://otmenshealth-production.up.railway.app`, start command `npm start` (`node server.js`) |
| Studio | Railway service **Studio**, `https://studio-production-d079c543.up.railway.app`, custom start command `node studio.js` |
| Studio passcode | Railway variable `STUDIO_PASSCODE` on the Studio service. Ask the agency owner. Never commit it. |
| Claude API key | Railway variable `ANTHROPIC_API_KEY` on the Studio service, supplied by the agency owner |
| Image generation | Higgsfield account (connected to Claude sessions as an MCP server). Free plan, about 1.45 credits left |

**Pushing to `main` redeploys both Railway services automatically.** Because of the persistence bug below, every redeploy currently wipes the Studio's versions, chat, drafts and learned rules, and resets the live site to version 1.

Railway is on a trial (about $5 of credit, 29 days, as of 14 November).

## Repository map

```
server.js            Public website. Renders the live version.
studio.js            OT Studio: login, API, previews, background agent runs.
studio/index.html    The Studio UI (single file, vanilla JS, polls the API).
src/render.js        Section library: one render function per section type, page shell, preview prefixes.
src/guard.js         SPEC (section docs the agent sees), themes, variants, validate(), diff().
src/agent.js         System prompt assembly, the Claude call, edit operations, repair loop.
src/store.js         File-based store: state.json plus v1.json, v2.json, ... in DATA_DIR.
agent/SKILL.md       The agent's instructions: limits, banned patterns, how bold to be, campaigns, learning.
brand/brand-guide.md OTMENS facts, look, voice, image direction, promotion rules.
content/site.json    Version 1 of the site (the seed). Three pages.
public/styles.css    Brand tokens and all styling, including variants and themes.
public/img/          Five generated photos. public/fonts/ Self-hosted Instrument Serif and Inter Tight.
README.md            Short run guide (partly out of date on the section library).
docs/                These documents.
```

Dependencies: Node 20 or later, one npm package (`@anthropic-ai/sdk`). No framework, no build step, no database.

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

### The section library (15 types)

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

Themes: `paper`, `cream`, `champagne`, `ink`. The authoritative descriptions the agent reads are in `SPEC` in `src/guard.js`. Visuals available: `checklist`, `plan`, `trend`, `report`, `plate`. Images available: the five files in `public/img/` (the agent sees one-line descriptions of each in `src/agent.js`).

### One agent request, end to end

1. The browser posts to `/api/chat`. The Studio records the message, sets an in-memory `busy` flag, starts `runAgent` in the background and returns at once.
2. The browser polls `/api/state` every 1.5 seconds until `busy` clears. (A single long-held request was cut off after about 30 seconds in production, so this was changed.)
3. `src/agent.js` builds the system prompt from `agent/SKILL.md`, `brand/brand-guide.md`, the Studio rules, the section library and the image library. The user turn contains today's date, the taste memory, the open draft and the current version as full JSON, and the message. The last 8 chat messages go in as history.
4. Claude is called with model `claude-opus-5-5` (env `AGENT_MODEL`), effort `medium` (env `AGENT_EFFORT`), `max_tokens` 16000, one tool `respond_to_jacob`, the system prompt marked for prompt caching, and server-side refusal fallbacks (`betas: ['server-side-fallback-2026-07-01']`, `fallbacks: 'default'`). If that request is rejected with a 400, it retries once without fallbacks.
5. The tool call returns `message`, `operations`, `summary`, `changes[{what, why}]`, `lessons_learned`, `lessons_applied`, `needs_from_jacob`, `declined`.
6. `applyOps` applies the operations to a copy of the draft (or of the head version): `update_section` (a `null` field removes it), `add_section`, `remove_section`, `move_section`, `update_global`, `add_page`, `update_page`, `remove_page`, `revert_section`, `reset_draft`.
7. `validate()` runs the checks. If anything fails, the errors go back to Claude as a tool error and it gets up to two repair attempts. If it still fails, no draft is made and the user is told.
8. On success the draft, its change list and the check report are stored, lessons are appended to taste memory, and the agent's message is added to the chat.

### The checks in `src/guard.js`

Every draft, and every version at approve and push time, must pass all of:

1. **Built from the section library.** Known types, required fields, unique ids, valid variants and themes, a home page, valid page paths, at most five nav links, hero only first on home.
2. **Checkout, portal and medical pages untouched.** No page may live under `/checkout`, `/portal` or `/intake`. These exist only as locked placeholder pages; the agent may link to them.
3. **Every link and image resolves.** Internal links must hit an existing page, an anchor, or a locked page. Images must be in `public/img/`.
4. **Health-claim rules.** A regex list: guaranteed results, absolute and "proven" claims, cures, "no prescription" framing, before-and-after, specific physical outcomes, results in a set time, FDA claims, false scarcity, insecurity targeting.
5. **Brand voice and layout limits.** Banned generic phrases ("elevate", "unlock", "seamless" and others), no exclamation marks, length limits on headlines, eyebrows and titles, at most one accent word per headline.
6. **Every page renders.**

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
| `GET /view/{live,draft,head,vN}/<page path>` | yes | Renders a version. `?hl=0` turns off change highlighting, `?scroll=0` stops auto-scroll to the first change |
| `GET /api/published` | **none** | The live version as JSON, for the public website |
| static files under `public/` | none | CSS, fonts, images |

### The public website

`server.js` renders the version the Studio marks live. With `STUDIO_URL` set, it fetches `/api/published`, caches it for 3 seconds, and falls back to the last copy it fetched, or to `content/site.json` if it never reached the Studio. Without `STUDIO_URL`, it always serves `content/site.json`.

### Configuration

Studio service: `ANTHROPIC_API_KEY` (required for the agent), `STUDIO_PASSCODE` (default `otmens`), `DATA_DIR` (point at a mounted volume), `LIVE_SITE_URL` (for the "Live site" link), `AGENT_MODEL`, `AGENT_EFFORT`, `AGENT_BASE_URL`, `PORT`.

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

Not yet tested at all: a request the agent must refuse (for example "say results are guaranteed" or "edit the checkout") against the live agent; several rejections in a row; long chats; two people using the Studio at once; the Studio UI on a phone; cost per request.

Artefacts from these tests (screenshots, a 2 min 16 s screen recording) were delivered in the agency owner's chat. They are not in this repo, and uploading them to Google Drive failed (see known issues).

## Known issues, most serious first

1. **The Studio loses all data on every redeploy.** Seen after every push to `main`: versions, drafts, chat and learned rules disappear, and the live site resets to version 1. The Railway volume is either not attached to the Studio service, not mounted at `/data`, or `DATA_DIR` is not `/data`. Not yet diagnosed; needs someone with Railway access. Until fixed, "it gets better the more he uses it" is false in production.
2. **The public website reading from the Studio is unverified on Railway.** It works locally. On Railway it depends on `STUDIO_URL` being set on the website service, which was requested but never confirmed. A version other than 1 has never been checked on the public URL while live.
3. **No image generation.** The brief requires campaigns to create images. The agent can only reuse five photos. Higgsfield is not wired into the app, the account is out of credits, and its best model (`gpt_image_2_6`) needs a paid plan. `nano_banana_2` and `z_image` worked on the free plan.
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
| Learns from rejection, visibly | Built; broken in production by issue 1 |
| Campaigns touch every relevant surface | Delivered |
| Campaigns create images | Not delivered |
| Rarely needs correcting | Unproven |

**Against the owner's wider framing ("front-end developer tool with full design, copywriting, flow building and development capabilities of a large-scale company CTO"): roughly 25 percent.** The agent cannot write code, build components, forms, funnels or integrations, change design tokens, or make architecture, analytics, performance or platform decisions. It works only on the three-page demo copy. Copywriting is its strongest capability; design is composition within a fixed kit.

An accurate description of what exists: **a safe, on-brand site and campaign editor with a strong copywriter and a constrained art director inside it.**
