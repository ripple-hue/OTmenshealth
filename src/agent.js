'use strict';
// The site agent. Claude proposes edits as a list of operations on the section library;
// this file applies them to a copy of the site and runs the hard checks in guard.js.
// The agent can only ever produce a draft. It has no way to approve or publish.

const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const { validate, SPEC, THEME_DOC, GLOBAL_CSS_DOC, images: imageLibrary, LOCKED } = require('./guard');
const images = require('./images');
const store = require('./store');
const designCheck = require('./design-check');

const MODEL = process.env.AGENT_MODEL || 'claude-opus-5-5';
const EFFORT = process.env.AGENT_EFFORT || 'medium';
const MAX_REPAIRS = 2;
const MAX_TURNS = 8; // model calls per request, including image rounds, re-sends and repairs

const file = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');
const clone = (v) => JSON.parse(JSON.stringify(v));

const IMAGE_NOTES = {
  '/img/hero.jpg': 'cyclist climbing a foggy mountain road, dark and moody (hero only)',
  '/img/hormone.jpg': 'gold-capped glass vial on a stone block, slate-blue wall',
  '/img/metabolic.jpg': 'frosted glass bottle on limestone, sage-green wall',
  '/img/longevity.jpg': 'amber supplement bottle with a dish of capsules, clay wall',
  '/img/sexual-health.jpg': 'matte black bottle with tablets on basalt, taupe wall',
};

// The agent's skills, in the order they are given to it. Each is a separate file in agent/skills/
// so it can be improved on its own: copy problems go in copywriting.md, layout problems in design.md, and so on.
const SKILLS = ['copywriting', 'design', 'flow-building', 'development', 'imagery'];
const activeSkills = () => SKILLS.filter((n) => n !== 'imagery' || images.enabled());
const stripFrontmatter = (s) => s.replace(/^---[\s\S]*?---\n/, '');

function systemPrompt() {
  const library = Object.entries(SPEC).map(([type, s]) => `- ${type}: ${s.doc} Required: ${s.req.join(', ')}.`).join('\n');
  const imgs = imageLibrary().filter((i) => i.startsWith('/img/')).map((i) => `- ${i}${IMAGE_NOTES[i] ? ': ' + IMAGE_NOTES[i] : ''}`).join('\n');
  // The imagery skill only matters when image generation is on; otherwise it would invite pictures the checks reject.
  const skills = activeSkills().map((name) => stripFrontmatter(file('agent', 'skills', `${name}.md`))).join('\n\n---\n\n');
  return `${stripFrontmatter(file('agent', 'SKILL.md'))}

---

${skills}

---

${file('brand', 'brand-guide.md')}

---

# How you work in this Studio

Jacob talks to you in a chat next to a live preview of his site. His taste memory and the current site arrive with each message.

The site is a JSON document: \`global\` (announcement bar, nav, navCta, footer, and optional site-wide \`css\`, \`js\`, \`scripts\` and \`smoothScroll\`) and \`pages\`, each a list of sections. Every section has an \`id\`, a \`type\` from the library below, and that type's fields.

Build with library sections where they fit (they are designed and tested) and with \`custom\` sections and site-wide CSS and JavaScript where they don't. The development skill says how; the hard limits say what's off-limits. Code checks both.

## Section library
${library}

${THEME_DOC}

${GLOBAL_CSS_DOC}

Field rules: \`href\` must be an existing page path (optionally with #anchor), a #anchor, or one of ${Object.keys(LOCKED).join(', ')} (link only). \`image\` must come from the image library. Give every new section a unique, descriptive \`id\`.

## Image library
${imgs}

${images.enabled()
  ? `You can also generate new images with the \`generate_images\` tool, at most ${images.MAX_PER_REQUEST} per request (see the imagery skill). Call it before \`respond_to_jacob\`, wait for the result, then use only the images it returns as OK, by their exact /media/... paths. Each image is checked before you get it; a failed one is simply not available. Images made for earlier drafts are listed with each message and can be reused at no cost.`
  : 'Image generation is OFF. Use only the photos above (/img/...). Images from earlier drafts (/media/...) and outside image URLs are rejected. Where no photo fits, use type, colour, gradients and motion. If a change truly needs a new photograph, describe the shot in `needs_from_jacob`.'}

## Responding

Always answer by calling \`respond_to_jacob\` exactly once. Never answer in plain text.

- \`message\`: what you say to Jacob. Two or three plain sentences, in his language, no jargon about JSON, sections or operations. No lists.
- \`operations\`: the edits, applied in order to the draft. Leave empty if you are only answering a question or need one thing clarified first.
  - {"op":"update_section","page":"home","id":"home-hero","fields":{...}} replaces those top-level fields of the section. To change one item in an array, send the whole array. Set a field to null to remove it.
  - {"op":"add_section","page":"home","after_id":"home-hero","section":{...}} (omit after_id to add at the top).
  - {"op":"remove_section","page":"home","id":"..."}
  - {"op":"move_section","page":"home","id":"...","after_id":"..."} (omit after_id to move to the top).
  - {"op":"update_global","fields":{"announcement":{...}}} replaces those top-level keys of global.
  - {"op":"add_page","key":"black-friday","page":{"path":"/black-friday","title":"...","description":"...","sections":[...]}}
  - {"op":"update_page","key":"...","fields":{"title":"..."}} and {"op":"remove_page","key":"..."}
  - {"op":"revert_section","page":"home","id":"..."} puts a section back to how it is on the current site.
  - {"op":"reset_draft"} throws away the whole open draft and starts again from the current site.
- \`summary\`: one line naming this draft, as it should appear in the version history ("Black Friday: three months free on Gold").
- \`changes\`: each visible change this turn, as {what, why}. Plain words. "why" is the marketing or brand reason.
- \`lessons_learned\`: only when Jacob has just told you a preference, especially when he rejects a draft. Each is one specific, reusable rule in the imperative, about his taste, that would change a future draft. Not a note about this one change.
- \`lessons_applied\`: taste-memory rules you actively followed this turn, quoted as saved.
- \`skills_used\`: which of your skills this turn's changes drew on: ${activeSkills().join(', ')}.
- \`needs_from_jacob\`: at most three things you need him to confirm or supply, one short sentence each. \`declined\`: anything you refused and why.

Prefer drafting to asking. When Jacob rejects a draft, say in one sentence what was wrong, save the lesson and send a new draft; don't defend the old one.

After you respond, code checks the draft. If a check fails you get the errors back; fix them with another \`respond_to_jacob\` call that sends only the corrective operations.`;
}

const TOOL = {
  name: 'respond_to_jacob',
  description: 'Reply to Jacob and, when he asked for a change, submit the edits for his draft. Call exactly once per turn.',
  input_schema: {
    type: 'object',
    properties: {
      message: { type: 'string' },
      operations: { type: 'array', items: { type: 'object' } },
      summary: { type: 'string' },
      changes: { type: 'array', items: { type: 'object', properties: { what: { type: 'string' }, why: { type: 'string' } }, required: ['what', 'why'] } },
      lessons_learned: { type: 'array', items: { type: 'string' } },
      lessons_applied: { type: 'array', items: { type: 'string' } },
      skills_used: { type: 'array', items: { type: 'string', enum: SKILLS } },
      needs_from_jacob: { type: 'array', items: { type: 'string' } },
      declined: { type: 'array', items: { type: 'string' } },
    },
    required: ['message'],
  },
};

const IMAGE_TOOL = {
  name: 'generate_images',
  description: 'Generate new campaign photographs for this draft, before calling respond_to_jacob. Each image is generated, then checked against the health-ad rules and scored for quality against the OTMENS house style; only images that pass come back, with a /media/... path to use. A failed image can be retried once with a better prompt that fixes the stated problems. Costs money: make only images the idea needs.',
  input_schema: {
    type: 'object',
    properties: {
      images: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            purpose: { type: 'string', description: 'Where it goes and why, e.g. "Christmas campaign hero, right of the headline".' },
            prompt: { type: 'string', description: 'The full image prompt, written from the imagery skill.' },
            aspect: { type: 'string', enum: images.ASPECTS },
            alt: { type: 'string', description: 'Alt text for the image on the site.' },
            references: {
              type: 'array', maxItems: images.MAX_REFERENCES, items: { type: 'string' },
              description: 'Only when the image shows an OT product: 1 to 3 image-library paths (e.g. "/img/longevity.jpg") whose product the new image must reproduce. Leave out for scenes without the product.',
            },
          },
          required: ['purpose', 'prompt', 'aspect', 'alt'],
        },
      },
    },
    required: ['images'],
  },
};

// Apply the agent's operations to a copy of the draft. Throws a readable message on a bad operation.
function applyOps(base, ops, current) {
  let site = clone(base);
  const page = (k) => {
    if (!site.pages[k]) throw new Error(`There is no page "${k}". Pages: ${Object.keys(site.pages).join(', ')}.`);
    return site.pages[k];
  };
  const index = (pg, id, k) => {
    const i = pg.sections.findIndex((s) => s.id === id);
    if (i < 0) throw new Error(`Page "${k}" has no section "${id}". Sections: ${pg.sections.map((s) => s.id).join(', ')}.`);
    return i;
  };
  const place = (pg, sec, after, k) => pg.sections.splice(after ? index(pg, after, k) + 1 : 0, 0, sec);

  for (const o of ops) {
    if (!o || typeof o !== 'object') throw new Error('Each operation must be an object.');
    switch (o.op) {
      case 'update_section': {
        const pg = page(o.page);
        const sec = pg.sections[index(pg, o.id, o.page)];
        const { id, ...fields } = o.fields || {};
        for (const [k, v] of Object.entries(fields)) v == null ? delete sec[k] : (sec[k] = v); // null removes a field
        break;
      }
      case 'add_section':
        if (!o.section?.id || !o.section?.type) throw new Error('add_section needs a section with an id and a type.');
        place(page(o.page), o.section, o.after_id, o.page);
        break;
      case 'remove_section': {
        const pg = page(o.page);
        pg.sections.splice(index(pg, o.id, o.page), 1);
        break;
      }
      case 'move_section': {
        const pg = page(o.page);
        const [sec] = pg.sections.splice(index(pg, o.id, o.page), 1);
        place(pg, sec, o.after_id, o.page);
        break;
      }
      case 'update_global':
        Object.assign(site.global, o.fields || {});
        break;
      case 'add_page':
        if (!o.key || !/^[a-z0-9-]+$/.test(o.key) || site.pages[o.key]) throw new Error(`add_page needs a new lowercase key. "${o.key}" is invalid or taken.`);
        site.pages[o.key] = o.page;
        break;
      case 'update_page': {
        const { sections, ...fields } = o.fields || {};
        Object.assign(page(o.key), fields);
        break;
      }
      case 'remove_page':
        page(o.key);
        delete site.pages[o.key];
        break;
      case 'revert_section': {
        const pg = page(o.page);
        const orig = current.pages[o.page]?.sections.find((s) => s.id === o.id);
        const i = pg.sections.findIndex((s) => s.id === o.id);
        if (orig && i >= 0) pg.sections[i] = clone(orig);
        else if (i >= 0) pg.sections.splice(i, 1);
        else if (orig) pg.sections.push(clone(orig));
        break;
      }
      case 'reset_draft':
        site = clone(current);
        break;
      default:
        throw new Error(`Unknown operation "${o.op}".`);
    }
  }
  return site;
}

function userTurn({ message, rejected, draft, current, memory, version, generated = [] }) {
  const mem = memory.length ? memory.map((m) => `- ${m.rule}`).join('\n') : '(nothing saved yet)';
  // Images made in earlier requests stay in the library; list the most recent so they can be reused.
  const gen = generated.slice(-24).map((g) => `- ${g.path} (${g.aspect || '4:5'}): ${g.description} [made for: ${g.purpose}]`).join('\n');
  const open = draft
    ? `There is an open draft Jacob has not approved. Your operations apply to it.\n<open_draft_changes>\n${(draft.changes || []).map((c) => `- ${c.what}`).join('\n')}\n</open_draft_changes>\n<draft_site>\n${JSON.stringify(draft.content)}\n</draft_site>\n<current_site version="${version}">\n${JSON.stringify(current)}\n</current_site>`
    : `There is no open draft. Your operations start a new one from the current site.\n<current_site version="${version}">\n${JSON.stringify(current)}\n</current_site>`;
  return `Today is ${new Date().toISOString().slice(0, 10)}.\n\n<taste_memory>\n${mem}\n</taste_memory>\n\n${gen ? `<generated_images>\nImages made for earlier drafts, also in the image library:\n${gen}\n</generated_images>\n\n` : ''}${open}\n\n<jacob${rejected ? ' rejected_the_draft="true"' : ''}>\n${message}\n</jacob>`;
}

const historyText = (m) => (m.role === 'user' ? m.text : [m.text, m.summary && `(Draft: ${m.summary})`].filter(Boolean).join(' '));

async function run({ message, rejected, draft, current, memory, version, history, onProgress = () => {} }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    const e = new Error('The agent has no API key yet. Add ANTHROPIC_API_KEY to this service and try again.');
    e.userFacing = true;
    throw e;
  }
  const client = new (Anthropic.default || Anthropic)({ baseURL: process.env.AGENT_BASE_URL || 'https://api.anthropic.com' });

  const messages = [];
  for (const m of history.slice(-8)) {
    const role = m.role === 'user' ? 'user' : 'assistant';
    if (m.role === 'system' || !m.text) continue;
    if (messages.length && messages[messages.length - 1].role === role) messages[messages.length - 1].content += '\n' + historyText(m);
    else if (messages.length || role === 'user') messages.push({ role, content: historyText(m) });
  }
  if (messages.length && messages[messages.length - 1].role === 'user') messages.pop();
  messages.push({ role: 'user', content: userTurn({ message, rejected, draft, current, memory, version, generated: store.listMedia().filter((m) => (m.pipeline || 1) >= images.PIPELINE) }) });

  const base = draft ? draft.content : current;
  let site = base;
  let out = null;
  let report = null;

  const canMakeImages = images.enabled();
  const made = [];
  let imageCalls = 0;
  let attempt = 0;
  let cutOffs = 0; // replies cut off at the length limit
  let nudged = false; // asked once for missing operations
  let design = null; // anti-slop design check result: {ran, found, remaining}
  let designAsked = false; // design findings are sent back at most once
  let passed = null; // the last draft that passed every hard check
  for (let turn = 0; attempt <= MAX_REPAIRS && turn < MAX_TURNS; turn++) {
    let res;
    const request = {
      model: MODEL,
      // A full campaign (custom hero, landing page, HTML, CSS and JavaScript) can be very long.
      // 20,000 was too small: a reply was cut off and its edits lost. Streamed, so a long reply can't time out.
      max_tokens: 64000,
      output_config: { effort: EFFORT },
      system: [{ type: 'text', text: systemPrompt(), cache_control: { type: 'ephemeral' } }],
      tools: canMakeImages ? [TOOL, IMAGE_TOOL] : [TOOL],
      tool_choice: { type: 'auto', disable_parallel_tool_use: true }, // images first, then the answer
      messages,
    };
    onProgress(turn === 0 ? 'Designing the change' : made.length && !out ? 'Building the draft with the new images' : 'Fixing what the checks found');
    try {
      try {
        // If a safety classifier declines the request, let the API retry it on a fallback model.
        res = await client.beta.messages.stream({ ...request, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }).finalMessage();
      } catch (err) {
        if (!(err instanceof (Anthropic.default || Anthropic).BadRequestError)) throw err;
        console.error('Request with fallbacks was rejected, retrying without:', err.message);
        res = await client.messages.stream(request).finalMessage();
      }
    } catch (err) {
      const C = Anthropic.default || Anthropic;
      const e = new Error(
        err instanceof C.AuthenticationError ? 'The API key was rejected. Check ANTHROPIC_API_KEY on this service.'
        : err instanceof C.RateLimitError ? 'The agent is being rate limited. Wait a moment and send that again.'
        : err instanceof C.APIConnectionError ? 'The agent could not reach Claude. Check the connection and try again.'
        : `The agent hit an error from Claude (${err.status || 'unknown'}): ${err.message}`
      );
      e.userFacing = true;
      throw e;
    }

    const toolNames = res.content.filter((b) => b.type === 'tool_use').map((b) => b.name).join(',') || 'none';
    console.log(`[agent] turn ${turn} attempt ${attempt}: stop=${res.stop_reason} output_tokens=${res.usage?.output_tokens} tools=${toolNames}`);
    if (res.stop_reason === 'refusal') return { message: 'I can’t help with that request.', ops: 0 };

    // The reply was cut off at the length limit: its tool call is incomplete, so its edits can't be trusted.
    // Ask for the same change again, more compactly, rather than showing a message with nothing behind it.
    if (res.stop_reason === 'max_tokens') {
      if (cutOffs++ >= 1) return { ...(out || {}), message: 'That change came out too large for me to send in one go, so I haven’t drafted it. Ask for a smaller part first (for example, the home page only) and I’ll build it up from there.', site: null, failed: true, ops: 0 };
      messages.push({ role: 'user', content: 'Your last reply was cut off because it was too long, so none of it was applied. Call respond_to_jacob again with the complete change, more compactly: reuse library sections and brand classes where you can, keep custom CSS and JavaScript short, and don\'t repeat code across sections.' });
      continue;
    }

    // The agent asked for new images: make them, check them, and hand back the ones that passed.
    const imageCall = res.content.find((b) => b.type === 'tool_use' && b.name === IMAGE_TOOL.name);
    if (imageCall) {
      const asked = Array.isArray(imageCall.input?.images) ? imageCall.input.images : [];
      const room = Math.max(0, images.MAX_PER_REQUEST - imageCalls);
      const batch = asked.slice(0, room);
      imageCalls += batch.length;
      const results = canMakeImages && batch.length
        ? await images.createImages(batch, { client, model: MODEL, saveMedia: store.saveMedia, onProgress })
        : [];
      made.push(...results.filter((r) => r.ok));
      const lines = results.map((r) => (r.ok ? `- OK ${r.path} (${r.aspect}, quality ${r.score}/10) for "${r.purpose}". Shows: ${r.description}. Suggested alt: ${r.alt}` : `- FAILED for "${r.purpose}": ${r.reason}`));
      if (asked.length > batch.length) lines.push(`- ${asked.length - batch.length} image(s) not made: the limit is ${images.MAX_PER_REQUEST} new images per request. Use the image library for the rest.`);
      messages.push({ role: 'assistant', content: res.content });
      messages.push({
        role: 'user',
        content: [{
          type: 'tool_result', tool_use_id: imageCall.id,
          content: `${lines.join('\n') || '- No images were made.'}\nUse the OK images by their exact paths (in "image" fields, <img src> or CSS url()). Never use a failed one. If an image the idea depends on failed and the limit allows, you may call generate_images once more with a prompt that fixes the stated problems; otherwise carry on with the library and call respond_to_jacob with the draft.`,
        }],
      });
      continue;
    }

    const call = res.content.find((b) => b.type === 'tool_use' && b.name === TOOL.name);
    if (!call) {
      if (attempt > 0) break; // it stopped trying to fix a failing draft
      const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
      return { message: text || 'I didn’t produce a change. Try rephrasing that.', site: null, ops: 0 };
    }

    const input = call.input || {};
    // Large edit lists sometimes arrive as a JSON string instead of an array. Accept either.
    if (typeof input.operations === 'string') {
      try { input.operations = JSON.parse(input.operations); } catch { /* handled below as unreadable */ }
    }
    const unreadable = input.operations != null && !Array.isArray(input.operations);
    out = out ? { ...out, ...input, changes: input.changes?.length ? input.changes : out.changes, message: out.message } : input;
    out.images = made.map((m) => m.path);
    const ops = Array.isArray(input.operations) ? input.operations : [];
    // It described changes (or sent an edit list we couldn't read) but nothing usable arrived:
    // ask once for the edits rather than telling Jacob a draft exists when it doesn't.
    if (!ops.length && attempt === 0 && (unreadable || input.changes?.length) && !nudged) {
      nudged = true;
      out = null;
      messages.push({ role: 'assistant', content: res.content });
      messages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: call.id, is_error: true, content: unreadable
        ? '`operations` could not be read: it must be an array of operation objects, not a string. Call respond_to_jacob again with the full change and `operations` as an array.'
        : 'You described changes but sent no operations, so nothing was drafted. Call respond_to_jacob again with the full change, including every operation.' }] });
      continue;
    }
    if (!ops.length && attempt === 0) return { ...out, site: null, ops: 0 };

    let errors;
    let applied = true;
    try {
      site = applyOps(site, ops, current);
      report = validate(site, current, { photosOnly: !images.enabled() });
      errors = report.errors;
    } catch (e) {
      errors = [e.message];
      report = null;
      applied = false;
    }
    if (!errors.length) {
      // The draft passes the hard checks. Run the anti-slop design check once; if it finds new giveaways
      // and a repair is left, send them back to be fixed. The check advises, it never blocks a draft.
      const check = designCheck.review(site, current);
      if (!design) design = { ran: check.ran, found: check.issues.length, remaining: check.issues.length };
      else design.remaining = check.issues.length;
      if (check.issues.length && !designAsked && attempt < MAX_REPAIRS) {
        designAsked = true;
        passed = { site, report, ops: ops.length }; // if the design fixes go wrong, this draft still stands
        onProgress('Checking the design for anything generic');
        messages.push({ role: 'assistant', content: res.content });
        messages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: call.id, is_error: true,
          content: `Your draft passes the brand and compliance checks, but the anti-slop design check (Impeccable's rules) found these giveaways of generic, AI-made design that your draft added. Fix each one the designed way, not by deleting the idea, and call respond_to_jacob again with only the operations that fix them.\n- ${designCheck.describe(check.issues).join('\n- ')}` }] });
        attempt++;
        continue;
      }
      return { ...out, site, report, ops: ops.length, repairs: attempt, design };
    }

    messages.push({ role: 'assistant', content: res.content });
    messages.push({
      role: 'user',
      content: [{
        type: 'tool_result', tool_use_id: call.id, is_error: true,
        content: applied
          ? `Your operations were applied, but the draft failed these checks. Call respond_to_jacob again with only the operations that fix them.\n- ${errors.join('\n- ')}`
          : `One of your operations was invalid, so none of that batch was applied. Call respond_to_jacob again with the full corrected list.\n- ${errors.join('\n- ')}`,
      }],
    });
    attempt++;
  }
  // The design fixes didn't come through cleanly: keep the draft that passed the hard checks.
  if (passed) return { ...out, ...passed, repairs: attempt, design };
  return { ...out, message: 'I couldn’t get that change past the brand and compliance checks, so I haven’t drafted it. Tell me what matters most about it and I’ll take another run.', site: null, report, failed: true, ops: 0 };
}

module.exports = { run, applyOps, systemPrompt, MODEL, SKILLS };
