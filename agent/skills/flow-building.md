---
name: flow-building
description: The visitor's path through the OTMENS site, from first visit to choosing a plan, across pages, links, navigation and campaign funnels.
---

# Skill: Flow building

You plan the site the way a growth lead plans a funnel. A page is not finished because it looks good; it is finished when a visitor knows where to go next, and that place moves them closer to membership.

## The OTMENS journey

The path every visitor should be able to walk without thinking:

1. **Understand it**: what OTMENS is, in one screen (home hero).
2. **Trust it**: bloodwork first, licensed providers, how it works.
3. **Find their reason**: the treatment track that fits them (treatments).
4. **Choose a plan**: Silver or Gold, priced plainly (membership).
5. **Act**: the plan's button, which links to the protected checkout. You link to checkout; you never change it.

Every page you touch should sit somewhere on this path and hand the visitor to the next step.

## What you can build

- **Pages and links.** Add pages, set their order of argument, and connect them with buttons, text links and #anchors.
- **Navigation.** The nav (at most five links), the nav button, the announcement bar and the footer links. Put the pages that move people forward in the nav.
- **Campaign funnels.** Announcement bar → campaign hero → landing page → the offer on the plan cards → checkout.
- **Guided choices.** A "Find your plan" or "Where to start" flow, either as an interactive quiz inside one custom section (JavaScript: a few questions, one at a time, then a recommendation with its button) or as linked pages. Interactive is better for a demo; pages are better when each answer deserves its own content. Recommendations come only from facts in the brand guide (what each plan includes, what each treatment area is), never from medical criteria.
- **Interactive helpers.** A price comparison toggle (monthly / annual), a savings calculator using only brand-guide prices, tabs or sliders that shorten a long page.

## What you can't build

- **Anything that collects or stores answers.** There is no server, so a form can't send data anywhere, and personal or health information must never be gathered on the marketing site.
- **Medical questions** (symptoms, conditions, medications, eligibility). They belong to the protected intake.
- **Logins, payment or intake steps.** Those are protected areas.

If Jacob asks for one of these, build the nearest thing you can (for example a quiz about goals that ends at "Become a member") and say plainly what would need a developer.

## Rules

- **One next step per screen.** One primary button, and it goes to the next stage of the journey. Text links are for the side paths.
- **No dead ends.** Every page ends with a call to action that leads somewhere useful. A landing page never ends on an FAQ.
- **No loops.** A button never sends a visitor back to the page they are on, or round in a circle.
- **Match the promise.** The page a button opens must deliver what the button said. "Choose Gold" lands on Gold, not on the top of a general page.
- **Shortest path to a plan.** From any page, the membership page is at most one click away.
- **Campaigns are funnels.** Every campaign surface points to the landing page or the offer, and the offer points to the plan's checkout link.
- **One action, everywhere, during a campaign.** The nav button (`navCta`) is on every screen, so it is part of the campaign: give it the same label and destination as the campaign's primary button ("Choose Gold" → the Gold offer). Use one label for that action across the hero, promo band, landing page and close. Not "Choose Gold" in one place, "See the Gold offer" in another and "Become a member" in the nav.
- **Clean up.** When you remove a page, remove or redirect every link to it.

## Checklist

- Walk it: from the home page, can you reach a plan's checkout link in three clicks or fewer?
- Does every page end with a clear next step?
- Does every button's destination match its label?
- Is anything in the nav that doesn't move people forward?
- During a campaign: do the nav button and every campaign button say the same thing and go to the same place?
