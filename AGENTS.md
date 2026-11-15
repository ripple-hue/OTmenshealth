# Working on this repository

This is a proof of concept for **OTMENS**, a men's telehealth membership: an AI agent ("OT Studio") that edits the client's website from plain-English requests, with preview, approval, versions and undo. The agent is the product; the three-page website is its canvas.

## Read before you change anything

1. `docs/CONTEXT.md`: the client, the brief, the brand, the regulatory limits and the architecture.
2. `docs/CURRENT_STATE.md`: what exists, how it works, what is tested and what is broken.
3. `docs/ROADMAP.md`: prioritised next work with acceptance criteria.
4. `docs/DECISIONS.md`: why things are the way they are.

The agent's own instructions are `agent/SKILL.md` and `brand/brand-guide.md`. Changing either changes how the live agent behaves.

## Rules

- **Pushing to `main` deploys to production** (both Railway services). Until the persistence bug is fixed it also **wipes the Studio's versions, chat and learned rules**. Tell the agency owner before you push, and say that in your summary.
- **Never commit secrets**: not the Studio passcode, not API keys, not personal details. They live in Railway variables.
- **Keep the safety model.** The agent must not gain a way to write code, change brand tokens, edit `/checkout`, `/portal`, `/intake` or clinical content, or approve or push its own work. Any new capability must be checked in `src/guard.js`, not only described in the prompt.
- **Keep the brand.** Use only the tokens in `public/styles.css`. Every new section type needs a renderer in `src/render.js`, styles for desktop and 375 px, an entry in `SPEC` in `src/guard.js` (that text is what the agent reads), and a check that `content/site.json` still validates.
- **Health claims are hard limits.** See "Regulatory and safety boundaries" in `docs/CONTEXT.md`.
- **Don't invent business facts.** Prices, offers, treatments and claims come from `brand/brand-guide.md` or from the client.
- **Spend sparingly.** Image generation credits and API tokens cost the agency money; the owner has asked to keep them low.

## Quick checks

```bash
npm install
```

```bash
node -e "const g=require('./src/guard');const r=g.validate(require('./content/site.json'));console.log(r.ok,r.errors)"
```

Run the Studio locally with `DATA_DIR=./data node studio.js` (port 4100, passcode `otmens` unless `STUDIO_PASSCODE` is set) and the website with `STUDIO_URL=http://localhost:4100 node server.js` (port 4000). Everything except the agent works without an API key.

The owner reviews work visually, so for any user-facing change, take screenshots (desktop and 375 px) and describe what you verified.

## Keep these docs current

When you change behaviour, update `docs/CURRENT_STATE.md` in the same commit (tests run, known issues, configuration). Add to `docs/DECISIONS.md` when you make a choice someone might later question.
