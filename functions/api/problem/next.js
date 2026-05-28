// Cloudflare Pages Function — GET /api/problem/next?mode=<mode>&user=<uuid>
// Returns a random unsolved problem for the user. If all problems are solved,
// generates a new one via AI and stores it in KV.

import {
  getProblemIndex,
  getProblem,
  getUserSolved,
  saveProblem,
  generateProblemId,
} from '../../lib/kv.js';
import * as seeds from '../../lib/seed-data.js';

// Problem generation runs on Cloudflare AI Gateway (llama-3.3-70b) for reliable
// large JSON output. Chat runs on Moonshot. Keep credentials separate.
const DEFAULT_BASE_URL =
  'https://gateway.ai.cloudflare.com/v1/3d275686d20e190931adbada39b35957/soda/compat';
const PINNED_MODEL = 'workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const MAX_OUTPUT_TOKENS = 32768;

const MODE_CONFIG = {
  bug_hunt: {
    seedArray: seeds.bug_hunt_seeds,
    prompt: (hint) => `Generate a realistic multi-file Python backend codebase simulating a ${hint || 'random small backend'} application. Use 4-5 files. The code should look like something a junior engineer wrote — real logic, not toy examples. Seed exactly 5 bugs spread across different files. Bug types to use: off-by-one errors, missing edge case handling, wrong return values, subtle logic errors, mutable default argument, missing error handling, incorrect boolean conditions, wrong comparison operators. Do not comment where the bugs are. Also generate a unittest test file with at least 8 tests — tests that cover the buggy behavior should fail initially, and pass once the candidate fixes the bugs.\n\nIMPORTANT CONSTRAINTS:\n- Only use these Python stdlib modules: os, sys, io, json, datetime, collections, itertools, functools, re, math, unittest\n- No file I/O, no network calls, no third-party packages\n- Tests must import from generated files using plain top-level imports\n- Each file is a single module — no packages, no subdirectories\n- Return ONLY valid JSON. No markdown, no backticks, no preamble.\n\nSchema:\n{\n  "domain": "...",\n  "files": [{"name": "...", "content": "..."}],\n  "test_file": {"name": "test_solution.py", "content": "..."},\n  "bugs": [{"file": "...", "line_hint": 0, "description": "..."}],\n  "checkpoints": [\n    {"id": 1, "title": "Orientation", "ai_enabled": false, "task": "Run the tests. Read the output carefully. Find and fix bugs #1 and #2 without using the AI assistant."},\n    {"id": 2, "title": "Feature Extension", "ai_enabled": true, "task": "Implement a new feature using existing patterns. Describe the feature concretely tied to the domain."},\n    {"id": 3, "title": "Optimization", "ai_enabled": true, "task": "Fix the remaining bugs and explain each fix in the chat."},\n    {"id": 4, "title": "Edge Cases", "ai_enabled": true, "task": "Add input validation and error handling to the public functions."}\n  ],\n  "stubs": []\n}`,
  },
  feature: {
    seedArray: seeds.feature_seeds,
    prompt: (hint) => `Generate a realistic multi-file Python codebase for a ${hint || 'random small backend or CLI'} application with 4-5 files. The codebase must be fully functional except for exactly 4 stubbed functions marked with TODO comments and raise NotImplementedError. The stubs should be in different files. Surrounding code must provide enough context to understand what needs to be implemented. Also generate a unittest test file with at least 8 tests — stub tests should fail initially (NotImplementedError), and pass once correctly implemented.\n\nIMPORTANT CONSTRAINTS:\n- Only use these Python stdlib modules: os, sys, io, json, datetime, collections, itertools, functools, re, math, unittest\n- No file I/O, no network calls, no third-party packages\n- Tests must import from generated files using plain top-level imports\n- Each file is a single module — no packages, no subdirectories\n- Return ONLY valid JSON. No markdown, no backticks, no preamble.\n\nSchema:\n{\n  "domain": "...",\n  "files": [{"name": "...", "content": "..."}],\n  "test_file": {"name": "test_solution.py", "content": "..."},\n  "stubs": [{"file": "...", "function": "...", "description": "..."}],\n  "checkpoints": [\n    {"id": 1, "title": "Orientation", "ai_enabled": false, "task": "Read the codebase. Run the tests to see what is failing. Write a comment at the top of the main file explaining the architecture in your own words."},\n    {"id": 2, "title": "Core Feature", "ai_enabled": true, "task": "Implement stub #1 and #2."},\n    {"id": 3, "title": "Integration", "ai_enabled": true, "task": "Implement stub #3 and wire up the pieces."},\n    {"id": 4, "title": "Polish", "ai_enabled": true, "task": "Implement stub #4 and add input validation."}\n  ],\n  "bugs": []\n}`,
  },
  debug: {
    seedArray: seeds.debug_seeds,
    prompt: (hint) => `Generate a realistic multi-file Python codebase for a ${hint || 'data processing'} application with exactly 6 files. The codebase must run without raising exceptions on the happy path but contain exactly 5 bugs that produce silently wrong output — wrong aggregations, dropped records, off-by-one time windows, stale results, wrong sort order, incorrect calculations. Each bug must be in a different file. No bug should cause an exception. The bugs must be subtle. Also generate a unittest test file with at least 10 tests. Each failing test must show what value was expected vs what the buggy code produces. Tests should fail with wrong values, NOT exceptions. Include at minimum these bug types: wrong aggregation logic, operator precedence issue without parens, boundary condition using < instead of <=, a function that mutates and returns the wrong variable, a string/type coercion bug that produces wrong comparison results.\n\nIMPORTANT CONSTRAINTS:\n- Only use these Python stdlib modules: os, sys, io, json, datetime, collections, itertools, functools, re, math, unittest\n- No file I/O, no network calls, no third-party packages\n- Tests must import from generated files using plain top-level imports\n- Each file is a single module — no packages, no subdirectories\n- Return ONLY valid JSON. No markdown, no backticks, no preamble.\n\nSchema:\n{\n  "domain": "...",\n  "files": [{"name": "...", "content": "..."}],\n  "test_file": {"name": "test_solution.py", "content": "..."},\n  "bugs": [{"file": "...", "line_hint": 0, "description": "...", "why_subtle": "...", "prevention": "..."}],\n  "checkpoints": [\n    {"id": 1, "title": "Reproduce", "ai_enabled": false, "task": "Run the full test suite. For each failing test, add a comment in the relevant file identifying which function you think is responsible and why. Annotate at least 4 of the 5 bugs before proceeding."},\n    {"id": 2, "title": "Isolate", "ai_enabled": true, "task": "Using the AI as a sounding board, narrow down the exact lines causing bugs #1, #2, and #3. Explain your reasoning in chat for each one."},\n    {"id": 3, "title": "Fix & Verify", "ai_enabled": true, "task": "Patch all 5 bugs. Run tests after each individual fix. All tests must pass."},\n    {"id": 4, "title": "Post-mortem", "ai_enabled": true, "task": "In the chat, explain each bug: root cause, why it was hard to spot, and how you would prevent it in production."}\n  ],\n  "stubs": []\n}`,
  },
};

const DOMAIN_HINTS = [
  'task manager', 'inventory tracker', 'URL shortener', 'event scheduler',
  'blog CMS', 'e-commerce cart', 'payment gateway', 'notification service',
  'user authentication', 'analytics dashboard', 'file storage', 'API rate limiter',
];

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('mode');
  const userId = url.searchParams.get('user');
  const hintParam = url.searchParams.get('hint');

  if (!mode || !MODE_CONFIG[mode]) {
    return json({ error: 'Invalid or missing mode' }, 400);
  }

  const config = MODE_CONFIG[mode];
  const solved = await getUserSolved(userId, env);

  // Build the pool of available problems: seeds + KV entries
  const available = [];

  // Add seeds
  for (const problem of config.seedArray || []) {
    if (!solved.has(`${mode}:${problem.id}`)) {
      available.push({ source: 'seed', id: problem.id, data: problem });
    }
  }

  // Add KV problems
  const kvIndex = await getProblemIndex(mode, env);
  for (const problemId of kvIndex) {
    if (!solved.has(`${mode}:${problemId}`)) {
      const data = await getProblem(mode, problemId, env);
      if (data) {
        available.push({ source: 'kv', id: problemId, data });
      }
    }
  }

  if (available.length > 0) {
    const pick = available[Math.floor(Math.random() * available.length)];
    return json({ problem: pick.data, generated: false });
  }

  // All problems solved — generate a new one
  const genApiKey = env.CF_AI_API_KEY || env.OPENAI_API_KEY;
  if (!genApiKey) {
    return json({ error: 'No problems available and server cannot generate new ones (missing CF_AI_API_KEY or OPENAI_API_KEY)' }, 503);
  }

  const hint = hintParam || DOMAIN_HINTS[Math.floor(Math.random() * DOMAIN_HINTS.length)];
  const generated = await generateProblem(mode, hint, env);
  if (!generated) {
    return json({ error: 'Failed to generate a new problem' }, 502);
  }

  const problemId = generateProblemId();
  generated.id = problemId;
  try {
    await saveProblem(mode, problemId, generated, env);
  } catch (err) {
    // Non-fatal: we can still return the generated problem even if KV save fails
    console.error('KV save error:', err);
  }
  return json({ problem: generated, generated: true });
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

  const baseUrl = env.CF_AI_BASE_URL || env.OPENAI_BASE_URL || DEFAULT_BASE_URL;
  const upstream = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  const genApiKey = env.CF_AI_API_KEY || env.OPENAI_API_KEY;

  let resp;
  try {
    resp = await fetch(upstream, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${genApiKey}`,
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
    console.error('Upstream generation non-ok status:', resp.status);
    return null;
  }

  let upstreamBody;
  try {
    upstreamBody = await resp.json();
  } catch {
    return null;
  }

  const content = upstreamBody.choices?.[0]?.message?.content || '';
  if (!content) return null;

  return extractJSON(content);
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
