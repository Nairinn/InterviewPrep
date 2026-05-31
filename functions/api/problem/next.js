// Cloudflare Pages Function — GET /api/problem/next?mode=<mode>&user=<uuid>
// Returns a random unsolved problem for the user. If all problems are solved,
// generates a new one via the Cloudflare AI Gateway and stores it in KV.

import {
  getProblemIndex,
  getProblem,
  getUserSolved,
  saveProblem,
  generateProblemId,
} from '../../lib/kv.js';

// Problem generation runs on Cloudflare AI Gateway via user's configured model.
const DEFAULT_BASE_URL =
  'https://gateway.ai.cloudflare.com/v1/3d275686d20e190931adbada39b35957/soda/compat';
// llama-3.3-70b is non-reasoning and reliably produces structured JSON.
// kimi-k2.6 was tried but is a reasoning model with an 8192 output cap and
// burns its budget on hidden thinking before producing the answer.
const PINNED_MODEL = 'workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const MAX_OUTPUT_TOKENS = 8192;

const MODE_CONFIG = {
  bug_hunt: {
    seedPath: '/seed/bug_hunt.json',
    prompt: (hint) => `Generate a realistic multi-file Python backend codebase simulating a ${hint || 'random small backend'} application. Use 4-5 source files. The code should look like something a junior engineer wrote — real logic, not toy examples. Seed 5-6 bugs spread across different files. Bug types: off-by-one errors, missing edge case handling, wrong return values, subtle logic errors, mutable default argument, missing error handling, incorrect boolean conditions, wrong comparison operators.\n\nCRITICAL CODE HYGIENE:\n- NO comments anywhere in the code that reveal a bug exists or hint at the fix. No "# BUG:", "# FIXME:", "# TODO: bug", "# wrong", "# should be", or any phrasing that points the candidate at a problem area. The source must read like normal junior-engineer code.\n- It is fine to have ordinary code comments explaining what a function does, just nothing about the bugs.\n\nALSO INCLUDE these problem-documentation files in the files array:\n- README.md: a project overview formatted like a real internal README. Include sections: short product description, Project Structure (a code-fenced tree of files), Architecture (a small ASCII diagram or bullet list showing how files relate), Conventions (any domain conventions a candidate needs to know — e.g. priority ordering, units, date defaults), and a "Known Issues" list referencing each ticket by ID (e.g. PROJ-401). Do NOT reveal which line/function is buggy.\n- tickets/<TICKET_ID>.md: one markdown file per bug under a tickets/ folder. Each ticket has Status/Priority/Component fields, a Description of the SYMPTOM, optional Steps to reproduce, an Expected behavior block, and an Observed behavior block. NEVER mention the fix, the buggy line, the operator that's wrong, or hint at "off-by-one" / "uses wrong end" / etc. Tickets describe what the user sees, not what to change. Use a coherent prefix (e.g. LIB-401, LIB-402, ...).\n- main.py: A runnable script that exercises the buggy code paths with sectioned print() output, like:\n    print('--- Section A: <name> ---')\n    print('label:', value)\n  Each section should call the functions affected by 1-2 specific bugs so the candidate can diff against expected. End with: if __name__ == '__main__': run()\n- expected_output.txt: The EXACT stdout that main.py would produce IF the bugs were fixed. Trailing newline only — no commentary.\n\nIMPORTANT: The expected_output.txt must match what fixed main.py would print exactly: same section headers, same labels, same numeric formatting (round() where needed for floats so output is stable). Pick demo values that make the buggy vs correct output observably different in stdout.\n\nCRITICAL TEST DESIGN RULE:\n- Every test in the unittest suite MUST fail on the day-0 buggy code.\n- Each test must exercise a code path broken by at least one bug.\n- Do NOT write tests that verify already-working behavior.\n- For boundary bugs, include the exact boundary value in the test data.\n\nGenerate a unittest test_solution.py with 9-10 tests.\n\nCONSTRAINTS:\n- Only use stdlib: os, sys, io, json, datetime, collections, itertools, functools, re, math, unittest\n- No file I/O, no network calls, no third-party packages\n- Plain top-level imports, no packages\n- Return ONLY valid JSON. No markdown, no backticks, no preamble.\n\nSchema:\n{\n  "domain": "...",\n  "files": [{"name": "...", "content": "..."}],\n  "test_file": {"name": "test_solution.py", "content": "..."},\n  "bugs": [{"file": "...", "description": "..."}],\n  "checkpoints": [\n    {"id": 1, "title": "Orientation", "ai_enabled": false, "task": "Read README.md and the tickets in tickets/. Run main.py and diff vs expected_output.txt. Fix the first two tickets. Do NOT use the AI assistant."},\n    {"id": 2, "title": "Diagnose", "ai_enabled": true, "task": "Investigate the next diverging section in main.py and fix it."},\n    {"id": 3, "title": "Remaining Bugs", "ai_enabled": true, "task": "Fix any remaining bugs revealed by main.py and the tests. Explain each fix in chat."},\n    {"id": 4, "title": "Edge Cases", "ai_enabled": true, "task": "Add input validation. Keep all tests green."}\n  ],\n  "stubs": []\n}`,
  },
  feature: {
    seedPath: '/seed/feature.json',
    prompt: (hint) => `Generate a realistic multi-file Python codebase for a ${hint || 'random small backend or CLI'} application with 4-5 source files. The codebase must contain 5-6 stubbed functions marked with TODO comments and raise NotImplementedError. The stubs should be spread across different files. Surrounding code must provide enough context to understand what needs to be implemented. Source files (other than the stub bodies) should be plain working code — model classes, helpers, etc.\n\nALSO INCLUDE these problem-documentation files in the files array:\n- README.md: project overview formatted like an internal README. Sections: short product description, Project Structure (code-fenced tree noting how many stubs live in each file), Architecture (small ASCII diagram or bullets), Conventions (units, date defaults, etc.), and a "Tickets" list referencing each ticket by ID (e.g. PROJ-001 ... PROJ-006).\n- tickets/<TICKET_ID>.md: one markdown file per stub under a tickets/ folder. Each ticket has Status/Priority/Component/File fields, a Background explaining what feature is needed, and Acceptance criteria (signature, return type, edge cases, an example). It's fine for tickets to describe exactly what should be built — these are feature tickets, not bug tickets. Use a coherent prefix (e.g. HABIT-001, HABIT-002, ...).\n- Each stub's docstring/comment block should also briefly reference the ticket ID so candidates can navigate.\n\nThen generate a unittest test_solution.py with 9-10 tests.\n\nCRITICAL TEST DESIGN RULE:\n- Every test in the suite MUST fail on the day-0 stubbed code.\n- Each test must directly OR indirectly call at least one stub. "Indirectly" means it calls a function whose execution path depends on a stub being implemented.\n- Do NOT write tests that verify already-working helpers or model classes — those would pass before any implementation.\n- Spread the stubs so every checkpoint's tests target at least one stub.\n- Checkpoint 1 must require implementing 1-2 foundation stubs (no longer just "read the architecture" — there must be coding).\n\nIMPORTANT CONSTRAINTS:\n- Only use these Python stdlib modules: os, sys, io, json, datetime, collections, itertools, functools, re, math, unittest\n- No file I/O, no network calls, no third-party packages\n- Tests must import from generated source files using plain top-level imports (README.md and tickets/*.md are not imported)\n- Each Python file is a single module — no packages, no subdirectories\n- Return ONLY valid JSON. No markdown, no backticks, no preamble.\n\nSchema:\n{\n  "domain": "...",\n  "files": [{"name": "...", "content": "..."}],\n  "test_file": {"name": "test_solution.py", "content": "..."},\n  "stubs": [{"file": "...", "function": "...", "description": "..."}],\n  "checkpoints": [\n    {"id": 1, "title": "Foundation", "ai_enabled": false, "task": "Read README.md and the foundation tickets. Implement the foundation stubs. Do NOT use the AI assistant."},\n    {"id": 2, "title": "Core Feature", "ai_enabled": true, "task": "Implement the next set of stubs."},\n    {"id": 3, "title": "Integration", "ai_enabled": true, "task": "Implement the integration stub and wire up the pieces."},\n    {"id": 4, "title": "Polish", "ai_enabled": true, "task": "Implement the final stub and add input validation."}\n  ],\n  "bugs": []\n}`,
  },
  debug: {
    seedPath: '/seed/debug.json',
    prompt: (hint) => `Generate a realistic multi-file Python codebase for a ${hint || 'data processing'} application with 5-6 source files. The codebase must run without raising exceptions on the happy path but contain 4-5 bugs producing silently wrong output — wrong aggregations, dropped records, off-by-one time windows, stale results, wrong sort order, incorrect calculations. Each bug in a different file. No bug causes an exception.\n\nCRITICAL CODE HYGIENE:\n- NO comments anywhere in the code that reveal a bug or hint at the fix. No "# BUG:", "# (silent)", "# wrong", "# should be", "# Real bug below", or any phrasing that highlights a problem area. The source must read like normal junior-engineer code.\n- It is fine to have ordinary code comments explaining behavior, just nothing about the bugs.\n\nALSO INCLUDE these problem-documentation files in the files array:\n- README.md: project overview formatted like an internal README. Sections: short product description, Project Structure (code-fenced tree), Architecture (ASCII diagram or bullets showing how files relate), Conventions (units, ordering rules, etc.), and a "Reported Issues" list referencing each ticket by ID (e.g. WX-101 ... WX-104).\n- tickets/<TICKET_ID>.md: one markdown file per bug under a tickets/ folder. Each ticket has Status/Priority/Component/Reporter fields, a Description of the SYMPTOM as a user would see it, optional Steps to reproduce, Expected, Observed. NEVER mention the buggy operator, line number, or fix — describe what the customer sees, not what to change. Use a coherent prefix (e.g. WX-101, WX-102, ...).\n- main.py: A runnable script that exercises the buggy code paths with sectioned print() output, like:\n    print('--- Section A: <name> ---')\n    print('label:', value)\n  Each section should call the functions affected by specific bugs so the candidate can diff against expected. End with: if __name__ == '__main__': run()\n- expected_output.txt: The EXACT stdout main.py would produce IF the bugs were fixed. Trailing newline only — no commentary.\n\nIMPORTANT: expected_output.txt must match what fixed main.py prints exactly: same section headers, same labels, same numeric formatting (use round() in main.py for floats so the output is stable). Pick demo values where the buggy vs correct output is clearly different in stdout.\n\nCRITICAL TEST DESIGN RULE:\n- Every test in the unittest suite MUST fail on the day-0 buggy code with WRONG VALUES (not exceptions).\n- For each test, calculate buggy result vs correct result. They must DIFFER. Reject any test where they coincide by accident.\n- For boundary bugs (< vs <=): test data must include the exact boundary.\n- For integer-division bugs (// instead of /): use values where // truncates a non-integer.\n- For string-comparison bugs: use values where lexical and numeric comparisons disagree (e.g. '9.5' vs '10').\n- For wrong-aggregation bugs: use unequal bucket sizes so average-of-averages diverges from average-of-all.\n\nBug types to include: wrong aggregation logic, operator precedence issue, < vs <= boundary, function that mutates and returns wrong variable, string/type coercion in comparisons.\n\nGenerate a unittest test_solution.py with 9-10 tests.\n\nCONSTRAINTS:\n- Only use stdlib: os, sys, io, json, datetime, collections, itertools, functools, re, math, unittest\n- No file I/O, no network calls, no third-party packages\n- Plain top-level imports, no packages\n- Return ONLY valid JSON. No markdown, no backticks, no preamble.\n\nSchema:\n{\n  "domain": "...",\n  "files": [{"name": "...", "content": "..."}],\n  "test_file": {"name": "test_solution.py", "content": "..."},\n  "bugs": [{"file": "...", "description": "...", "why_subtle": "...", "prevention": "..."}],\n  "checkpoints": [\n    {"id": 1, "title": "Reproduce", "ai_enabled": false, "task": "Read README.md and tickets/. Run main.py and diff vs expected_output.txt. Annotate each diverging section with a hypothesis. Do NOT use the AI assistant."},\n    {"id": 2, "title": "Isolate", "ai_enabled": true, "task": "Investigate the first two diverging sections via chat. Verify hypotheses by reading code."},\n    {"id": 3, "title": "Fix & Verify", "ai_enabled": true, "task": "Patch every bug one at a time. Re-run main.py and the tests after each fix."},\n    {"id": 4, "title": "Post-mortem", "ai_enabled": true, "task": "In the chat: explain each bug — root cause, why it was hard to spot, and how to prevent it in code review."}\n  ],\n  "stubs": []\n}`,
  },
};

const DOMAIN_HINTS = [
  'task manager', 'inventory tracker', 'URL shortener', 'event scheduler',
  'blog CMS', 'e-commerce cart', 'payment gateway', 'notification service',
  'user authentication', 'analytics dashboard', 'file storage', 'API rate limiter',
];

let seedCache = {};

async function fetchSeeds(mode, origin) {
  if (seedCache[mode]) return seedCache[mode];
  const config = MODE_CONFIG[mode];
  if (!config || !config.seedPath) return [];
  try {
    const resp = await fetch(`${origin}${config.seedPath}`);
    if (!resp.ok) return [];
    const data = await resp.json();
    const seeds = Array.isArray(data) ? data : [];
    seedCache[mode] = seeds;
    return seeds;
  } catch {
    return [];
  }
}

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get('mode');
    const userId = url.searchParams.get('user');
    const hintParam = url.searchParams.get('hint');

    if (!mode || !MODE_CONFIG[mode]) {
      return json({ error: 'Invalid or missing mode' }, 400);
    }

    const config = MODE_CONFIG[mode];
    const solved = await getUserSolved(userId, env);
    const origin = `${url.protocol}//${url.host}`;
    const hasKvBinding = !!(env && env.PROBLEMS);

    // Build full pool (seeds + KV) and split into unsolved + solved buckets
    const allProblems = [];

    const seedProblems = await fetchSeeds(mode, origin);
    for (const problem of seedProblems) {
      allProblems.push({ source: 'seed', id: problem.id, data: problem });
    }

    let kvIndex = [];
    if (hasKvBinding) {
      kvIndex = await getProblemIndex(mode, env);
      for (const problemId of kvIndex) {
        const data = await getProblem(mode, problemId, env);
        if (data) allProblems.push({ source: 'kv', id: problemId, data });
      }
    }

    const unsolved = allProblems.filter((p) => !solved.has(`${mode}:${p.id}`));

    console.log(
      `[problem/next] mode=${mode} user=${userId || '(none)'} kvBinding=${hasKvBinding} seedCount=${seedProblems.length} kvCount=${kvIndex.length} unsolved=${unsolved.length} total=${allProblems.length}`
    );

    // Happy path: serve an unsolved problem
    if (unsolved.length > 0) {
      const pick = unsolved[Math.floor(Math.random() * unsolved.length)];
      return json({ problem: pick.data, generated: false });
    }

    // Bank exhausted — try to generate a fresh one
    if (env.OPENAI_API_KEY) {
      const hint = hintParam || DOMAIN_HINTS[Math.floor(Math.random() * DOMAIN_HINTS.length)];
      const generated = await generateProblem(mode, hint, env);
      if (generated) {
        const problemId = generateProblemId();
        generated.id = problemId;
        if (hasKvBinding) {
          try {
            await saveProblem(mode, problemId, generated, env);
          } catch (err) {
            console.error('[problem/next] KV save error:', err.message || err);
          }
        }
        return json({ problem: generated, generated: true });
      }
      console.warn('[problem/next] generation returned null — falling back to a repeat');
    } else {
      console.warn('[problem/next] OPENAI_API_KEY missing — cannot generate, falling back to a repeat');
    }

    // Last resort: replay a random problem the user already solved.
    // Much better UX than a hard 502 / 503.
    if (allProblems.length > 0) {
      const pick = allProblems[Math.floor(Math.random() * allProblems.length)];
      return json({ problem: pick.data, generated: false, replay: true });
    }

    // Pool is completely empty (no seeds, no KV) — shouldn't happen in prod
    return json({ error: 'No problems available' }, 503);
  } catch (err) {
    console.error('Unhandled error in /api/problem/next:', err);
    return json({ error: 'Internal server error', detail: err.message || String(err) }, 500);
  }
}

export async function onRequest({ request }) {
  if (request.method === 'GET') return;
  return json({ error: 'Method not allowed' }, 405);
}

async function generateProblem(mode, hint, env) {
  const config = MODE_CONFIG[mode];
  const messages = [
    {
      role: 'system',
      content:
        'You generate strictly valid JSON for a coding interview simulator. Skip extended internal reasoning — go directly to producing the JSON. Output ONLY a single JSON object — no markdown fences, no preamble, no explanation, no text after the closing brace. Use double-quoted strings, true/false/null. Escape newlines inside string values as \\n.',
    },
    { role: 'user', content: config.prompt(hint) },
  ];

  const baseUrl = env.OPENAI_BASE_URL || DEFAULT_BASE_URL;
  const normalized = baseUrl.replace(/\/$/, '');
  const upstream = normalized.endsWith('/chat/completions')
    ? normalized
    : `${normalized}/chat/completions`;

  let resp;
  try {
    resp = await fetch(upstream, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: PINNED_MODEL,
        messages,
        temperature: 0.6,
        max_tokens: MAX_OUTPUT_TOKENS,
        stream: false,
      }),
    });
  } catch (err) {
    console.error('Upstream generation failed:', err);
    return null;
  }

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => '');
    console.error(`[generateProblem] upstream ${resp.status}:`, errBody.slice(0, 500));
    return null;
  }

  let upstreamBody;
  try {
    upstreamBody = await resp.json();
  } catch (err) {
    console.error('[generateProblem] could not parse upstream JSON:', err.message);
    return null;
  }

  const finishReason = upstreamBody.choices?.[0]?.finish_reason;
  const content = upstreamBody.choices?.[0]?.message?.content || '';
  console.log(`[generateProblem] finish_reason=${finishReason} content_len=${content.length}`);
  if (!content) {
    console.error('[generateProblem] empty content. Message keys:', Object.keys(upstreamBody.choices?.[0]?.message || {}));
    return null;
  }

  const parsed = extractJSON(content);
  if (!parsed) {
    console.error('[generateProblem] JSON parse failed. First 300 chars of content:', content.slice(0, 300));
    return null;
  }
  // Validate + sanitize before persisting
  const validation = validateProblem(parsed, mode);
  if (!validation.ok) {
    console.warn(`[generateProblem] validation failed (${validation.reason}) — falling back to replay`);
    return null;
  }
  return validation.problem;
}

/**
 * Returns { ok: boolean, reason?, problem? }.
 * Three layers:
 *  1. Structural — files array, test_file, 4 checkpoints. Hard reject.
 *  2. Required-file — main.py + expected_output.txt for bug_hunt/debug. Hard reject.
 *  3. Comment hygiene — strip lines from .py source that reveal bugs.
 *     If after stripping the line still mentions a bug, hard reject (defensive).
 */
function validateProblem(problem, mode) {
  // Layer 1: structural
  if (!problem || typeof problem !== 'object') return { ok: false, reason: 'not-an-object' };
  if (!Array.isArray(problem.files) || problem.files.length === 0)
    return { ok: false, reason: 'no-files-array' };
  for (const f of problem.files) {
    if (!f || typeof f.name !== 'string' || typeof f.content !== 'string')
      return { ok: false, reason: 'malformed-file-entry' };
  }
  if (!problem.test_file || typeof problem.test_file.name !== 'string' || typeof problem.test_file.content !== 'string')
    return { ok: false, reason: 'missing-test_file' };
  if (!Array.isArray(problem.checkpoints) || problem.checkpoints.length < 4)
    return { ok: false, reason: 'need-4-checkpoints' };

  // Layer 2: required documentation + demo files.
  const fileNames = new Set(problem.files.map((f) => f.name));

  // README.md is required for ALL modes — it's the candidate's landing page.
  if (!fileNames.has('README.md')) return { ok: false, reason: 'missing-README.md' };
  const readme = problem.files.find((f) => f.name === 'README.md');
  if (!readme.content || readme.content.trim().length < 80)
    return { ok: false, reason: 'README-too-short' };

  // At least one ticket file (tickets/*.md) is required so candidates have
  // structured per-issue context.
  const ticketFiles = problem.files.filter(
    (f) => f.name.startsWith('tickets/') && f.name.endsWith('.md')
  );
  if (ticketFiles.length < 2) return { ok: false, reason: 'too-few-tickets' };
  for (const tf of ticketFiles) {
    if (!tf.content || tf.content.trim().length < 40)
      return { ok: false, reason: `ticket-too-short:${tf.name}` };
  }

  // bug_hunt + debug must also ship a runnable demo with expected stdout.
  if (mode === 'bug_hunt' || mode === 'debug') {
    if (!fileNames.has('main.py')) return { ok: false, reason: 'missing-main.py' };
    if (!fileNames.has('expected_output.txt'))
      return { ok: false, reason: 'missing-expected_output.txt' };
    const expected = problem.files.find((f) => f.name === 'expected_output.txt');
    if (!expected.content || expected.content.trim().length < 5)
      return { ok: false, reason: 'expected_output-empty' };
  }

  // Layer 3: comment hygiene on Python source. Strip bug-revealing comments;
  // hard-reject if the model put bug-pointers in code (not just comments).
  // We scan only .py files; expected_output.txt and test_solution.py are skipped
  // because tests legitimately document what's being verified.
  const revealComment = /^\s*#.*\b(BUG|FIXME|HACK|XXX|wrong|should be|off[-\s]?by[-\s]?one|silent bug|missing return|never increments|always returns|mutable default)\b/i;
  // No word boundary — catches XXX_FIXME, FIXME123 etc. Case-sensitive uppercase
  // is unlikely to appear in legitimate identifiers (debug_log, bug_count are lower-case).
  const revealCodeNonComment = /(BUG|FIXME|XXX)/;

  for (const f of problem.files) {
    if (!f.name.endsWith('.py')) continue;
    if (f.name === 'test_solution.py') continue;
    const cleaned = [];
    let stripped = 0;
    for (const line of f.content.split('\n')) {
      if (revealComment.test(line)) {
        stripped++;
        continue; // drop the offending comment
      }
      // Non-comment code containing BUG/FIXME tokens is too risky — reject the whole gen
      const codeOnly = line.replace(/#.*$/, '');
      if (revealCodeNonComment.test(codeOnly)) {
        return { ok: false, reason: `non-comment-reveal-in-${f.name}` };
      }
      cleaned.push(line);
    }
    if (stripped > 0) {
      console.log(`[generateProblem] stripped ${stripped} bug-revealing comment(s) from ${f.name}`);
      f.content = cleaned.join('\n');
    }
  }

  return { ok: true, problem };
}

function extractJSON(text) {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  try {
    return JSON.parse(cleaned);
  } catch (_) {}
  const balanced = balanceBraces(cleaned);
  if (balanced) {
    try {
      return JSON.parse(balanced);
    } catch (_) {}
  }
  const pyFixed = cleaned
    .replace(/\bTrue\b/g, 'true')
    .replace(/\bFalse\b/g, 'false')
    .replace(/\bNone\b/g, 'null');
  try {
    return JSON.parse(pyFixed);
  } catch (_) {}
  return null;
}

function balanceBraces(s) {
  let depth = 0;
  let inString = false;
  let escape = false;
  let lastValidEnd = -1;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === '\\') {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) lastValidEnd = i;
    }
  }
  if (lastValidEnd > 0) return s.slice(0, lastValidEnd + 1);
  return null;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
