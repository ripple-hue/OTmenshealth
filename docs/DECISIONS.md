# Decision log

Why things are the way they are. Newest last. If you want to reverse one of these, raise it with the agency owner first.

1. **The agent edits structured content, not code.** It submits operations on a JSON site document built from a fixed section library. This is what makes "never breaks the site", "always on brand" and "never touches checkout" enforceable in code. Trade-off: limited range, no new components.

2. **Brand tokens are locked.** Colours, the two typefaces and shapes live in `public/styles.css`. The agent controls layout, order, theme and words only.

3. **The demo site copies the OTMENS theme closely.** Jacob should recognise his own brand, then watch the agent change it. A more creative redesign of the base site (arched hero, marquee, staggered steps) was built and then **reverted at the owner's request**: "go back to the original design, the agent is the main build anyway." Those layouts later returned as optional variants the agent can choose.

4. **Two separate sites.** The public website and the OT Studio are separate services. The Studio keeps its own copy of the site and never reads the real otmens.com. (Owner's requirement.)

5. **Approve and push are separate.** Approve creates a stored, numbered version; push makes a version live. Every version is kept and can be viewed, pushed or restored. (Owner's requirement.)

6. **Hosting is GitHub plus Railway**, from the same repo: the website runs `npm start`, the Studio runs `node studio.js`. Pushing to `main` deploys both.

7. **File-based storage in `DATA_DIR`.** Chosen for speed of building a two-day proof of concept. It requires a persistent volume and a single Studio instance.

8. **Campaigns draft immediately.** The first live test asked five questions and drafted nothing. The agent now drafts in the same turn, builds on the existing offer when no terms are given, proposes dates for Jacob to confirm, and asks at most three things.

9. **The agent never invents a discount or price**, and blocks its own draft with a `[NEEDS FROM JACOB: ...]` marker when it needs a fact such as a renewal price.

10. **Agent runs happen in the background with polling.** A single long-held HTTP request was cut off after about 30 seconds in production while the agent was still working.

11. **The agent must be bold when asked.** The owner judged copy-only edits too timid. The library gained hero variants, a statement band, a marquee, staggered steps, expanding photo panels, tilted plan cards, photo features, an image closing panel and four background themes; `agent/SKILL.md` gained "How bold to be" (a large request requires a concept, a different opening, three structural moves and a cut). Based on research into Anthropic's frontend-design skill and the community skills built on it (Impeccable, Taste Skill), adapted to work inside locked brand tokens, because those skills all assume free code and new fonts and colours.

12. **Model: `claude-opus-5-5` at effort `medium`**, with server-side refusal fallbacks and a retry without them if rejected. Both are configurable by environment variable.

13. **Generation spend is kept low.** The owner asked not to use many Higgsfield credits or tokens. Five images were generated in total.
