# Context: what we are building and why

Read this first. It explains the client, the problem, the brief, the brand and the shape of the solution. For what exists today and what is broken, read `CURRENT_STATE.md`. For what to do next, read `ROADMAP.md`. For why things are the way they are, read `DECISIONS.md`.

## Who is involved

- **The agency.** A digital solutions agency (our side). The person running this project is the agency owner. They are not a developer and they review work through screenshots, screen recordings and the deployed Railway links.
- **The client.** Jacob, owner of **OTMENS**, a U.S. men's telehealth membership business (otmens.com).
- **The goal of this repository.** A two-day proof of concept to win Jacob's business. **The AI agent is the product.** The website in this repo exists only so the agent has something convincing to work on.

## Jacob's problem (from the brief)

His current site was put together by copying his biggest competitors, and he knows it. It feels generic: vague slogans, confusing pricing, too many buttons competing for attention. Every change means waiting on a developer. He doesn't trust AI tools for this, because what they make looks like "AI slop": generic, off-brand and obviously machine-made.

## The brief, verbatim

> **What he wants**
> An AI agent that works like an in-house creative and dev team for his website. It should do what a strong CTO, designer and copywriter would do together, the moment he asks.
>
> - He describes what he wants in plain English, like "run a Black Friday promo" or "the homepage feels weak, make it hit harder," and the agent makes it happen on the site.
> - Every change looks and sounds like OTMENS. It's consistent with the brand, high quality and never generic. Output should look like a top agency made it.
> - It's built for him specifically. It knows his business, his brand and his taste, and it gets better at pleasing him the more he uses it.
> - He can see the changes before anything goes live, compare them to the current site, and undo what he doesn't like.
> - Nothing goes live until he approves it. When he does, the site updates without a developer.
> - It handles campaigns, not just edits. It can create images and copy, and it thinks the way a marketer would: a promo touches every part of the site it should.
>
> **What "good" looks like**
> - A change he asks for appears in a preview within seconds to a minute.
> - He rarely has to correct the brand, tone or quality.
> - When he rejects something and says why, the next attempt is noticeably better, and he can see that it learned.
> - One approval puts the change live.
> - It never breaks the site.
>
> **Things it must never do**
> - Make health claims that would get the business in trouble: guaranteed results, before-and-after body photos, or treatments presented as if no prescription is needed. OTMENS is a regulated telehealth business, and its ads run on platforms with strict health-ad rules.
> - Touch checkout, payments, the member portal, or anything medical.
> - Change the site live without his approval.
>
> **Scope for this first version**
> This is a 2-day proof of concept to win Jacob's business, so the agent is the star. Build just enough of a website, a few pages based on his real brand and offer, for the agent to work on convincingly. Use his real brand from otmens.com rather than inventing a new one.
>
> Higgsfield is available for generating images.

### The agency owner's wider framing

The owner has also described the goal as "a front-end developer tool with full design, copywriting, flow building and development capabilities of a large-scale company CTO." That is the long-term ambition. The current build deliberately does **not** reach it (see `CURRENT_STATE.md`, section "Evaluation"), and nobody should present it as if it does.

## How the owner wants it to work (agreed in conversation)

These were clarified after the brief and override any other reading of it.

1. **Two separate sites.**
   - **Jacob's website**: the public site visitors see.
   - **OT Studio**: a separate agent site that belongs to the agency. Jacob signs in there, sees his website as it currently is, talks to the agent, and sees the agent's changes rendered as a working site next to the current one.
2. **The Studio holds its own copy of the website's code and content.** It does not connect to his real site to read it. For the demo, that copy is the three-page site in this repo.
3. **Approve and push are separate steps.** Approving a draft stores it as a numbered, permanent version. Pushing a version makes it the live website. Every version stays visible, can be viewed, pushed again or restored.
4. **Hosting is GitHub plus Railway.** Code lives in a GitHub repo; Railway deploys it. No local Mac setup.
5. **The agent is the selling point.** Spend effort on the agent, not on the website. Keep generation credits and tokens low.
6. **Keep the OTMENS theme.** The site must look recognisably like Jacob's brand. Improve layout and clarity, but don't invent a new look. (A more creative site redesign was built and then reverted at the owner's request.)
7. **The agent must make dramatic changes when asked.** Early versions made timid copy edits; the owner rejected that. "Make it hit harder" should produce a visibly different page.
8. **Deliverables for review** are screenshots and screen recordings, ideally put in Google Drive.

## The OTMENS brand

Full detail, including the facts the agent may state, is in `brand/brand-guide.md`. Summary:

- **Business.** A men's health membership: labs, providers, prescriptions and supplements in one membership. Every plan starts with bloodwork reviewed by a licensed provider. U.S.-licensed clinicians, all 50 states.
- **Plans.** Silver at $39.99 a month or $479 a year. Gold at $199 a month or $1,795 a year (was $2,388), with three months free when paid annually. Gold is "most popular".
- **Treatment tracks.** Advanced Diagnostics, Hormone therapy (TRT, enclomiphene), Metabolic (GLP-1, tirzepatide), Peptides (sermorelin), Longevity (NAD+, supplements), Sexual health (tadalafil).
- **Look.** Quiet luxury, like an upscale pharmacy brand. Warm cream backgrounds, near-black text, champagne-gold accents. One dark photo hero on the home page; everything else light.
  - Colours: ink `#17130E`, cream `#F7F1E6`, champagne `#EBDDB8`, honey gold `#D8BC7E`, bronze `#7A5E2C`.
  - Type: light Helvetica Neue headlines. One word or short phrase per headline in italic gold serif ("Own Your *Health.*"). This is the most recognisable brand device.
  - Small labels in spaced gold capitals with a dot. Soft rounded cards, a floating pill nav, gold gradient buttons, metallic Silver and Gold member key tags.
  - Photography: matte bottles with gold caps and an "OT" label on stone blocks in warm side-light; fit men doing endurance sport in moody natural light.
- **Voice.** Calm, direct, adult. Says what it is, what it costs, what happens next. No hype, no exclamation marks, no shame.

**Provenance warning.** The brand was rebuilt from five screenshots and a written description the owner supplied. The real otmens.com was never fetched (it was blocked by the session's network policy at the time). Some content is inferred; see `CURRENT_STATE.md`, "Content that is not verified".

## Regulatory and safety boundaries

OTMENS is a regulated telehealth business whose ads run on platforms with strict health-ad rules. Treat these as hard limits in every piece of work:

- No guaranteed or promised outcomes, no specific physical results in a set time, no "proven", "cure", "risk-free".
- No before-and-after bodies in copy or images. No shirtless or body-focused imagery, no needles.
- Never present prescription treatment as if no prescription or clinician review is needed. Wherever a prescription treatment is named, keep the qualifier: prescription required, a licensed provider decides, not everyone qualifies.
- No false urgency or scarcity, no copy aimed at insecurities, no unsourced competitor comparisons.
- A promotion changes price or adds convenience. It never strengthens a medical claim.
- Never edit checkout, payments, the member portal, medical intake or clinical content.
- Nothing goes live without a human approving and pushing it.

The current compliance check is a phrase list plus instructions. It is **not** a legal or medical review, and it should not be described as one.

## The shape of the solution

The core design idea is **safety through constraint**: the agent edits a structured content document, mostly through a fixed library of designed sections, and code checks every draft before a human can approve it. Since 15 November 2026 it can also write HTML, CSS and JavaScript inside that document (`custom` sections and site-wide CSS and JavaScript) and load open-source libraries, but never server code, never GSAP, and only with brand colours and fonts. Studio previews are sandboxed so its scripts can't approve or push. See decisions 14, 17 and 18 in `DECISIONS.md`. Its instructions are a core file plus four skills: copywriting, design, flow building and development.

```
 Jacob (browser)
      │  plain-English request
      ▼
 ┌──────────────── OT Studio (studio.js) ────────────────┐
 │  chat + side-by-side preview + versions + learned rules │
 │                                                        │
 │  agent.js ──► Claude API (respond_to_jacob tool call)   │
 │     │            returns edit operations               │
 │     ▼                                                  │
 │  applyOps ──► guard.js checks ──► draft (or repair)     │
 │                                                        │
 │  Approve ──► new numbered version (store.js, DATA_DIR)  │
 │  Push    ──► marks a version live                       │
 │  GET /api/published ──► the live version as JSON        │
 └───────────────────────────────┬────────────────────────┘
                                 │ polled every few seconds
                                 ▼
                 Public website (server.js)
                 renders the live version with render.js
```

Why constraint rather than free code generation:

- **"Never breaks the site"** is guaranteed by construction: every section type is pre-designed and every draft is rendered before approval.
- **"Always on brand"** is enforced by locked brand tokens: the agent chooses layout, order, theme and words, never colours or fonts.
- **"Never touches checkout or medical pages"** is enforced in code, not trusted to the model.

The cost of this choice is range. Before 15 November the agent could only be as inventive as the section library was rich. It can now build new visual components in HTML and CSS, and page-to-page flows, but still not scripts, forms or integrations.

## Glossary

| Term | Meaning |
| --- | --- |
| Studio | The agency's agent site (`studio.js`) where Jacob talks to the agent |
| Website / live site | The public OTMENS demo site (`server.js`) |
| Site document | The JSON that describes every page (`content/site.json` is version 1) |
| Section | One block of a page, of a type from the section library |
| Section library | The fixed set of designed section types in `src/render.js`, described to the agent by `SPEC` in `src/guard.js` |
| Variant | A layout option of a section type (e.g. hero `photo`, `arch`, `statement`) |
| Theme | A section's background: `paper`, `cream`, `champagne` or `ink` |
| Operation | One edit the agent submits (`update_section`, `add_page`, ...) |
| Draft | The agent's unapproved changes, previewable, at most one open at a time |
| Version | An approved, stored, numbered copy of the whole site document |
| Head | The newest version |
| Live | The version the public site shows |
| Taste memory / lessons | Rules the agent saved from Jacob's feedback, sent with every request |
| Guard | The code checks in `src/guard.js` that every draft must pass |
| Marker | `[NEEDS FROM JACOB: ...]` placeholder text; a draft containing one cannot be approved |
