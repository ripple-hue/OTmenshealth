'use strict';
// The site agent. Claude proposes edits as a list of operations on the section library;
// this file applies them to a copy of the site and runs the hard checks in guard.js.
// The agent can only ever produce a draft. It has no way to approve or publish.

const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const { validate, SPEC, images, LOCKED } = require('./guard');

const MODEL = process.env.AGENT_MODEL || 'claude-opus-5-5';
const EFFORT = process.env.AGENT_EFFORT || 'medium';
const MAX_REPAIRS = 2;

const file = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');
const clone = (v) => JSON.parse(JSON.stringify(v));

const IMAGE_NOTES = {
  '/img/hero.jpg': 'cyclist climbing a foggy mountain road, dark and moody (hero only)',
  '/img/hormone.jpg': 'gold-capped glass vial on a stone block, slate-blue wall',
  '/img/metabolic.jpg': 'frosted glass bottle on limestone, sage-green wall',
  '/img/longevity.jpg': 'amber supplement bottle with a dish of capsules, clay wall',
  '/img/sexual-health.jpg': 'matte black bottle with tablets on basalt, taupe wall',
};

function systemPrompt() {
  const library = Object.entries(SPEC).map(([type, s]) => `- ${type}: ${s.doc} Required: ${s.req.join(', ')}.`).join('\n');
  const imgs = images().map((i) => `- ${i}${IMAGE_NOTES[i] ? ': ' + IMAGE_NOTES[i] : ''}`).join('\n');
  return `${file('agent', 'SKILL.md').replace(/^---[\s\S]*?---\n/, '')}

---

${file('brand', 'brand-guide.md')}

---

# How you work in this Studio

Jacob talks to you in a chat next to a preview of his site. The brand guide is above. His taste memory and the current site arrive with each message.

The site is a JSON document: \`global\` (announcement bar, nav, navCta, footer) and \`pages\`, each a list of sections. Every section has an \`id\`, a \`type\` from the library below, and that type's fields. You cannot write HTML, CSS or code, and you cannot change colours or fonts. You design by choosing, ordering and writing sections.

## Section library
${library}

Field rules: \`href\` must be an existing page path (optionally with #anchor), a #anchor, or one of ${Object.keys(LOCKED).join(', ')} (link only). \`image\` must come from the image library. Give every new section a unique, descriptive \`id\`.

## Image library
${imgs}

You cannot generate new images in this version. Use the library. If a change really needs a new image, say so in \`needs_from_jacob\` and describe the shot.

## Responding

Always answer by calling \`respond_to_jacob\` exactly once. Never answer in plain text.

- \`message\`: what you say to Jacob. Two or three plain sentences, in his language, no jargon about JSON, sections or operations. No lists.
- \`operations\`: the edits, applied in order to the draft. Leave empty if you are only answering a question or need one thing clarified first.
  - {"op":"update_section","page":"home","id":"home-hero","fields":{...}} replaces those top-level fields of the section. To change one item in an array, send the whole array.
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
- \`needs_from_jacob\`: facts, terms or assets you need. \`declined\`: anything you refused and why.

When Jacob rejects a draft: say in one sentence what you understood was wrong, save the lesson, and produce a new draft that fixes it. Do not defend the old one.

After you respond, your draft is checked by code for health claims, generic phrases, broken links and whether every page still renders. If a check fails you get the errors back and must fix them with another \`respond_to_jacob\` call that sends only the corrective operations.`;
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
      needs_from_jacob: { type: 'array', items: { type: 'string' } },
      declined: { type: 'array', items: { type: 'string' } },
    },
    required: ['message'],
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
        Object.assign(sec, fields);
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

function userTurn({ message, rejected, draft, current, memory, version }) {
  const mem = memory.length ? memory.map((m) => `- ${m.rule}`).join('\n') : '(nothing saved yet)';
  const open = draft
    ? `There is an open draft Jacob has not approved. Your operations apply to it.\n<open_draft_changes>\n${(draft.changes || []).map((c) => `- ${c.what}`).join('\n')}\n</open_draft_changes>\n<draft_site>\n${JSON.stringify(draft.content)}\n</draft_site>\n<current_site version="${version}">\n${JSON.stringify(current)}\n</current_site>`
    : `There is no open draft. Your operations start a new one from the current site.\n<current_site version="${version}">\n${JSON.stringify(current)}\n</current_site>`;
  return `<taste_memory>\n${mem}\n</taste_memory>\n\n${open}\n\n<jacob${rejected ? ' rejected_the_draft="true"' : ''}>\n${message}\n</jacob>`;
}

const historyText = (m) => (m.role === 'user' ? m.text : [m.text, m.summary && `(Draft: ${m.summary})`].filter(Boolean).join(' '));

async function run({ message, rejected, draft, current, memory, version, history }) {
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
  messages.push({ role: 'user', content: userTurn({ message, rejected, draft, current, memory, version }) });

  const base = draft ? draft.content : current;
  let site = base;
  let out = null;
  let report = null;

  for (let attempt = 0; attempt <= MAX_REPAIRS; attempt++) {
    let res;
    try {
      res = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: EFFORT },
        system: [{ type: 'text', text: systemPrompt(), cache_control: { type: 'ephemeral' } }],
        tools: [TOOL],
        messages,
      });
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

    if (res.stop_reason === 'refusal') return { message: 'I can’t help with that request.', ops: 0 };
    const call = res.content.find((b) => b.type === 'tool_use' && b.name === TOOL.name);
    if (!call) {
      if (attempt > 0) break; // it stopped trying to fix a failing draft
      const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
      return { message: text || 'I didn’t produce a change. Try rephrasing that.', site: null, ops: 0 };
    }

    const input = call.input || {};
    out = out ? { ...out, ...input, changes: input.changes?.length ? input.changes : out.changes, message: out.message } : input;
    const ops = Array.isArray(input.operations) ? input.operations : [];
    if (!ops.length && attempt === 0) return { ...out, site: null, ops: 0 };

    let errors;
    let applied = true;
    try {
      site = applyOps(site, ops, current);
      report = validate(site, current);
      errors = report.errors;
    } catch (e) {
      errors = [e.message];
      report = null;
      applied = false;
    }
    if (!errors.length) return { ...out, site, report, ops: ops.length, repairs: attempt };

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
  }
  return { ...out, message: 'I couldn’t get that change past the brand and compliance checks, so I haven’t drafted it. Tell me what matters most about it and I’ll take another run.', site: null, report, failed: true, ops: 0 };
}

module.exports = { run, applyOps, systemPrompt, MODEL };
