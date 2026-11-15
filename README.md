# OTMENS site agent

Full context for anyone (or any agent) picking this up: start with `AGENTS.md`, then `docs/CONTEXT.md`, `docs/CURRENT_STATE.md`, `docs/ROADMAP.md` and `docs/DECISIONS.md`.

Two apps in one repo.

**The public website** (`node server.js`): three pages, Home, Treatments and Membership.

**OT Studio** (`node studio.js`): the separate agent site. It keeps its own copy of the website. Jacob talks to the agent there, sees each draft next to the current site, approves it, and pushes it live. Every approved change is stored as a numbered version that can be viewed, pushed or restored.

## Run locally

    npm install
    ANTHROPIC_API_KEY=... node studio.js      # http://localhost:4100, passcode "otmens"
    STUDIO_URL=http://localhost:4100 node server.js   # http://localhost:4000

## Settings

Studio service:

| Variable | What it does |
| --- | --- |
| `ANTHROPIC_API_KEY` | Lets the agent run. Required. |
| `STUDIO_PASSCODE` | Passcode for the Studio. Defaults to `otmens`. |
| `DATA_DIR` | Where versions, drafts and taste memory are stored. Point it at a mounted volume. |
| `LIVE_SITE_URL` | Address of the public website, for the "Live site" link. |
| `AGENT_MODEL`, `AGENT_EFFORT` | Default `claude-opus-5-5` and `medium`. |

Website service: `STUDIO_URL`, the address of the Studio. The website then shows whichever version was last pushed live. Without it, it shows `content/site.json`.

## How it stays safe

- The agent edits a JSON document through a fixed section library (`src/render.js`, described to the agent by `SPEC` in `src/guard.js`): 15 section types, layout variants and four background themes. It cannot write HTML, CSS or code.
- `src/guard.js` checks every draft in code: section library only, protected areas untouched, every link and image resolves, health-claim rules, brand voice limits, every page renders. A failing draft is sent back to the agent and never reaches Jacob as approvable.
- Only the Approve and Push buttons change what is stored or live. The agent has no access to either.
- `/checkout`, `/portal` and `/intake` are placeholders the agent cannot create, edit or remove.

## Where things live

- `agent/SKILL.md` and `brand/brand-guide.md`: the agent's instructions and the OTMENS brand guide.
- `src/agent.js`: the Claude call, the edit operations and the repair loop.
- `src/store.js`: versions, draft, chat and taste memory.
- `studio/index.html`: the Studio screen.
