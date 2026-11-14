# OTMENS demo site

Three pages for the site agent to work on: Home (`/`), Treatments (`/treatments`) and Membership (`/membership`).

    node server.js        # http://localhost:4000

- `content/site.json` holds every word, price, image and section on the site.
- `src/render.js` is the section library that turns that file into pages.
- `public/styles.css` holds the locked brand tokens (colours, type, shapes).
- `/checkout`, `/portal` and `/intake` are placeholders for the areas the agent must never touch.

No dependencies are needed to run it. Fonts are self-hosted in `public/fonts`.
