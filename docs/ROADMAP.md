# Roadmap

Ordered by priority. Each task says why it matters, what done looks like, and where to work. Read `CONTEXT.md` and `CURRENT_STATE.md` first.

## P0: before the demo to Jacob

### 1. Make Studio data survive redeploys

**Status (15 November 2026):** volume `studio-volume` attached to the Studio at `/data`. Remaining: the end-to-end check below.

- **Why.** Every push to `main` wipes versions, drafts, chat and learned rules, and resets the live site to version 1. The "it learns" claim fails in front of the client.
- **Done when.** After a redeploy, `/api/state` shows the same versions, live version and memory as before.
- **Where.** Railway, Studio service: a volume attached to that service, mounted at `/data`, and `DATA_DIR=/data`. No code change should be needed; `src/store.js` already writes to `DATA_DIR`. Needs someone with Railway access (the agency owner).

### 2. Verify the public site follows the Studio

**Status (15 November 2026):** `STUDIO_URL` set on the website service; the website is confirmed fetching from the Studio. Remaining: push a non-1 version and see it on the public URL.

- **Why.** Pushing a version must change the public URL. This has only been verified locally.
- **Done when.** Push a version with a visible change, and `https://otmenshealth-production.up.railway.app` shows it within a few seconds; push version 1 and it reverts.
- **Where.** Railway, website service: `STUDIO_URL` set to the Studio's `https://` address with no trailing slash. Logic in `server.js`.

### 3. Decide on images

- **Why.** The brief says campaigns create images. Today they cannot.
- **Options.** (a) Top up Higgsfield and build task 6, or (b) say clearly in the pitch that image generation is phase two.
- **Done when.** The owner has chosen, and the pitch matches the product.

### 4. Lock the "Own Your Health." tagline

- **Why.** The bold redesign replaced it. It is Jacob's brand line.
- **Done when.** The agent keeps the home hero headline unless Jacob explicitly asks to change it. Prefer a brand-guide rule plus a guard check that warns (not blocks) when the hero headline changes.
- **Where.** `brand/brand-guide.md`, `agent/SKILL.md`, optionally `src/guard.js`.

### 5. Rehearse the demo script against the live Studio

- **Why.** Only one long rejection cycle has been tested in production, and no refusal.
- **Done when.** These run cleanly in one session, timed: a redesign request; a campaign with terms; a rejection with a reason, then a second attempt that visibly applies the lesson; a forbidden request ("say results are guaranteed", "change the checkout price") that the agent declines; approve, push, undo.

## P1: closes gaps in the brief

### 6. Generate campaign images with Higgsfield

- **Why.** Brief requirement.
- **Approach.** Add an agent capability to request an image with a prompt built from the image direction in `brand/brand-guide.md`. Generate server-side, review with a check (no people's bodies, no text in image, no needles, on-palette), store the file under `DATA_DIR`, and add it to the image library for that draft. Must never produce before-and-after or body-focused images. The Higgsfield API, not the MCP server, is needed for a deployed app; its credentials go in Railway variables.
- **Done when.** "Run a Black Friday sale" produces a draft with a new on-brand campaign image, inside the one-minute budget or with a clear progress state.

### 7. Harden the health-claim check

- **Why.** The phrase list misses rewording.
- **Approach.** Keep the regex as a fast first pass, and add a second model call that reviews all changed copy against the rules in `CONTEXT.md` and returns violations with quotes. Treat its findings as blocking. Write a small fixed test set of compliant and non-compliant lines and keep it passing.
- **Where.** `src/guard.js`, `src/agent.js`.

### 8. Measure cost and quality

- **Why.** Cost per request is unknown; "rarely needs correcting" is unproven.
- **Approach.** Log `usage` from every Claude response (input, cached, output tokens) to `DATA_DIR`. Build a set of 15 to 20 representative requests and score outputs against a short rubric (on brand, bold enough when asked, compliant, correct facts). Try `AGENT_EFFORT=low` and `high` on the same set.
- **Done when.** There is a cost-per-request figure and a pass rate to quote.

### 9. Scheduled campaigns

- **Why.** A campaign should start and end on its dates without someone remembering.
- **Approach.** Let a version carry `startAt` and `endAt`; push and revert automatically at those times, with the revert target recorded when it is scheduled. Show the schedule in the Versions panel.

## P2: product quality

10. **Studio UI polish.** Collapse the check list in the status bar into one line with a details popover; cap the change list in chat with "show all". Test the Studio at phone width.
11. **Proper authentication.** Individual accounts or at least a random session token with expiry and a logout; restrict `reset` to an admin; add rate limiting on `/api/chat`.
12. **Smaller requests.** Send only the pages relevant to the request, or a compact outline plus the sections being edited, instead of the whole site twice.
13. **More section types.** Testimonials (with real quotes only, marked otherwise), a comparison against "doing it yourself", a press strip, a clinician section (needs real data), an image gallery. The library is what limits how inventive the agent can be.
14. **Update README.md** to match the current section library and point to `docs/`.

## P3: towards the wider vision

These are what separate the current editor from "a front-end developer tool with CTO-level capability". Each is substantial.

15. **Connect to Jacob's real site.** Find out his platform. Then either export versions to it (for example as a theme or CMS content) or replace it with this renderer. The Studio keeps its own copy as the source of truth, as agreed.
16. **A reviewed component layer.** *Partly done 15 November 2026: the agent writes checked `custom` sections per draft. Not done: promoting a good custom section into the reusable library.* Let the agent propose a new section type as code, rendered in a sandbox, checked visually and by a human, then added to the library. This keeps the "never breaks" guarantee while widening range.
17. **Flows and forms.** Lead capture, quizzes and multi-step journeys that stop at the protected areas (intake, checkout) without editing them.
18. **Analytics and experiments.** Page metrics per version, and A/B tests between two approved versions.
19. **Multi-user and audit.** Roles (owner, marketer, reviewer), comments on drafts, and an audit log of who approved and pushed what.
