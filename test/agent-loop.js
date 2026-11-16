// Exercises the agent loop in src/agent.js with a scripted stand-in for Claude (no API calls, no cost).
// Covers the failure seen on 15 November 2026: a long campaign reply cut off at the length limit,
// whose edits were lost while the message still claimed a draft.
// Usage: npm test (runs after test/agent-code.js)
const path = require('path');
const fs = require('fs');
const os = require('os');
const repo = path.join(__dirname, '..');
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ot-loop-'));
process.env.ANTHROPIC_API_KEY = 'test-key-not-real';
delete process.env.HF_API_KEY;

// A stand-in for @anthropic-ai/sdk that replays a script of responses and records each request.
let script = [];
const requests = [];
class APIError extends Error {}
class FakeAnthropic {
  constructor() {
    const next = (req) => {
      requests.push(req);
      const res = script.shift();
      if (!res) throw new Error('Script ran out of responses');
      return { finalMessage: async () => ({ usage: { output_tokens: 1 }, ...res }) };
    };
    this.beta = { messages: { stream: next } };
    this.messages = { stream: next };
  }
}
Object.assign(FakeAnthropic, { APIError, BadRequestError: class extends APIError {}, AuthenticationError: class extends APIError {}, RateLimitError: class extends APIError {}, APIConnectionError: class extends APIError {} });
const sdkPath = require.resolve('@anthropic-ai/sdk', { paths: [repo] });
require.cache[sdkPath] = { id: sdkPath, filename: sdkPath, loaded: true, exports: FakeAnthropic };

const agent = require(path.join(repo, 'src/agent'));
const current = require(path.join(repo, 'content/site.json'));

const respond = (input, stop = 'tool_use') => ({ stop_reason: stop, content: [{ type: 'tool_use', id: 'tu_' + Math.random().toString(36).slice(2), name: 'respond_to_jacob', input }] });
const goodOps = [{ op: 'update_global', fields: { announcement: { text: 'Christmas: the first month of Gold is on us.', linkLabel: 'See the offer', href: '/membership' } } }];
const good = { message: 'Drafted the Christmas campaign.', summary: 'Christmas', changes: [{ what: 'Announcement bar', why: 'Campaign' }], operations: goodOps };
const base = { message: 'Run a Christmas campaign', rejected: false, draft: null, current, memory: [], version: 1, history: [] };

let fails = 0;
const expect = (name, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); if (!cond) fails++; };

(async () => {
  // 1. A reply cut off at the length limit is resent, and the second, complete reply is drafted.
  script = [respond({ message: 'Drafted the Christmas campaign.' }, 'max_tokens'), respond(good)];
  requests.length = 0;
  let out = await agent.run(base);
  expect('cut-off reply is resent and then drafted', !!out.site && out.site.global.announcement.text.startsWith('Christmas'), `calls=${requests.length}`);
  expect('the resend asks for a more compact reply', JSON.stringify(requests[1].messages.slice(-1)).includes('cut off'));
  expect('requests stream with room for long replies', requests[0].max_tokens >= 64000);

  // 2. Cut off twice: no draft, and an honest message instead of a claim that a draft exists.
  script = [respond({ message: 'Drafted it.' }, 'max_tokens'), respond({ message: 'Drafted it.' }, 'max_tokens')];
  out = await agent.run(base);
  expect('cut off twice: no draft and an honest message', !out.site && out.failed && /too large/.test(out.message));

  // 3. The edit list arrives as a JSON string: it is read and drafted.
  script = [respond({ ...good, operations: JSON.stringify(goodOps) })];
  out = await agent.run(base);
  expect('operations sent as a JSON string are still applied', !!out.site && out.site.global.announcement.text.startsWith('Christmas'));

  // 4. Changes described but no operations sent: asked once, then drafted.
  script = [respond({ message: 'Drafted it.', changes: [{ what: 'Hero', why: 'x' }] }), respond(good)];
  requests.length = 0;
  out = await agent.run(base);
  expect('described changes without operations: asked again, then drafted', !!out.site && requests.length === 2);

  // 5. A plain answer with no changes is still just an answer (one call, no draft).
  script = [respond({ message: 'Silver is $39.99 a month.' })];
  requests.length = 0;
  out = await agent.run(base);
  expect('a plain answer stays a plain answer', !out.site && out.message.startsWith('Silver') && requests.length === 1);

  // 6. Unreadable operations twice: never claims a draft.
  script = [respond({ message: 'Drafted it.', operations: 'not json' }), respond({ message: 'Drafted it.', operations: 'still not json' })];
  out = await agent.run(base);
  expect('unreadable operations twice: no draft', !out.site);

  // 7. Anti-slop design check (Impeccable): a draft with AI giveaways is sent back once, then the fix is drafted.
  const first = current.pages.home.sections[0].id;
  const slopSection = { id: 'bf-band', type: 'custom', dark: true, html: '<div class="wrap"><h2 class="title">Black <em>Friday.</em></h2><p class="lede">Three months of Gold free when you join annually.</p></div>', css: '.title{background:linear-gradient(90deg,#b8893a,#f3e3c3);-webkit-background-clip:text;background-clip:text;color:transparent}' };
  const slopDraft = { ...good, operations: [{ op: 'add_section', page: 'home', after_id: first, section: slopSection }] };
  const fix = { ...good, operations: [{ op: 'update_section', page: 'home', id: 'bf-band', fields: { css: '.title{color:var(--champagne)}' } }] };
  script = [respond(slopDraft), respond(fix)];
  requests.length = 0;
  out = await agent.run(base);
  const asked = JSON.stringify(requests[1]?.messages.slice(-1) || '');
  expect('design check sends AI giveaways back once', requests.length === 2 && /anti-slop/.test(asked) && /Gradient text/.test(asked), `calls=${requests.length}`);
  expect('the fixed draft is kept and reported as passed', !!out.site && out.design?.ran && out.design.found >= 1 && out.design.remaining === 0, JSON.stringify(out.design));

  // 8. If the design fix itself breaks a hard check, the draft that passed the hard checks still stands.
  const brokenFix = { ...good, operations: [{ op: 'update_section', page: 'home', id: 'bf-band', fields: { html: '<p>no wrap here</p>' } }] };
  script = [respond(slopDraft), respond(brokenFix), respond(brokenFix)];
  out = await agent.run(base);
  expect('a failed design fix falls back to the passing draft', !!out.site && !out.failed && out.site.pages.home.sections.some((s) => s.id === 'bf-band' && s.html.includes('wrap')));

  // 9. A clean draft passes the design check first time, with no extra call.
  script = [respond(good)];
  requests.length = 0;
  out = await agent.run(base);
  expect('a clean draft passes the design check with no extra call', !!out.site && requests.length === 1 && out.design?.ran && out.design.found === 0);

  console.log(fails ? `\n${fails} FAILED` : '\nAll passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
