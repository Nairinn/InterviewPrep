import { chat } from './kimi.js';

const ALLOWED_STDLIB = 'os, sys, io, json, datetime, collections, itertools, functools, re, math, unittest';

const BUG_HUNT_PROMPT = (hint) => `Generate a realistic multi-file Python backend codebase simulating a ${hint || 'random small backend'} application. Use 4-5 files. The code should look like something a junior engineer wrote — real logic, not toy examples. Seed exactly 5 bugs spread across different files. Bug types to use: off-by-one errors, missing edge case handling, wrong return values, subtle logic errors, mutable default argument, missing error handling, incorrect boolean conditions, wrong comparison operators. Do not comment where the bugs are. Also generate a unittest test file with at least 8 tests — tests that cover the buggy behavior should fail initially, and pass once the candidate fixes the bugs.

IMPORTANT CONSTRAINTS:
- Only use these Python stdlib modules: ${ALLOWED_STDLIB}
- No file I/O, no network calls, no third-party packages
- Tests must import from generated files using plain top-level imports
- Each file is a single module — no packages, no subdirectories
- Return ONLY valid JSON. No markdown, no backticks, no preamble.

Schema:
{
  "domain": "...",
  "files": [{"name": "...", "content": "..."}],
  "test_file": {"name": "test_solution.py", "content": "..."},
  "bugs": [{"file": "...", "line_hint": 0, "description": "..."}],
  "checkpoints": [
    {"id": 1, "title": "Orientation", "ai_enabled": false, "task": "Run the tests. Read the output carefully. Find and fix bugs #1 and #2 without using the AI assistant."},
    {"id": 2, "title": "Feature Extension", "ai_enabled": true, "task": "Implement a new feature using existing patterns. Describe the feature concretely tied to the domain."},
    {"id": 3, "title": "Optimization", "ai_enabled": true, "task": "Fix the remaining bugs and explain each fix in the chat."},
    {"id": 4, "title": "Edge Cases", "ai_enabled": true, "task": "Add input validation and error handling to the public functions."}
  ],
  "stubs": []
}`;

const FEATURE_PROMPT = (hint) => `Generate a realistic multi-file Python codebase for a ${hint || 'random small backend or CLI'} application with 4-5 files. The codebase must be fully functional except for exactly 4 stubbed functions marked with TODO comments and raise NotImplementedError. The stubs should be in different files. Surrounding code must provide enough context to understand what needs to be implemented. Also generate a unittest test file with at least 8 tests — stub tests should fail initially (NotImplementedError), and pass once correctly implemented.

IMPORTANT CONSTRAINTS:
- Only use these Python stdlib modules: ${ALLOWED_STDLIB}
- No file I/O, no network calls, no third-party packages
- Tests must import from generated files using plain top-level imports
- Each file is a single module — no packages, no subdirectories
- Return ONLY valid JSON. No markdown, no backticks, no preamble.

Schema:
{
  "domain": "...",
  "files": [{"name": "...", "content": "..."}],
  "test_file": {"name": "test_solution.py", "content": "..."},
  "stubs": [{"file": "...", "function": "...", "description": "..."}],
  "checkpoints": [
    {"id": 1, "title": "Orientation", "ai_enabled": false, "task": "Read the codebase. Run the tests to see what is failing. Write a comment at the top of the main file explaining the architecture in your own words."},
    {"id": 2, "title": "Core Feature", "ai_enabled": true, "task": "Implement stub #1 and #2."},
    {"id": 3, "title": "Integration", "ai_enabled": true, "task": "Implement stub #3 and wire up the pieces."},
    {"id": 4, "title": "Polish", "ai_enabled": true, "task": "Implement stub #4 and add input validation."}
  ],
  "bugs": []
}`;

const DEBUG_PROMPT = (hint) => `Generate a realistic multi-file Python codebase for a ${hint || 'data processing'} application with exactly 6 files. The codebase must run without raising exceptions on the happy path but contain exactly 5 bugs that produce silently wrong output — wrong aggregations, dropped records, off-by-one time windows, stale results, wrong sort order, incorrect calculations. Each bug must be in a different file. No bug should cause an exception. The bugs must be subtle. Also generate a unittest test file with at least 10 tests. Each failing test must show what value was expected vs what the buggy code produces. Tests should fail with wrong values, NOT exceptions. Include at minimum these bug types: wrong aggregation logic, operator precedence issue without parens, boundary condition using < instead of <=, a function that mutates and returns the wrong variable, a string/type coercion bug that produces wrong comparison results.

IMPORTANT CONSTRAINTS:
- Only use these Python stdlib modules: ${ALLOWED_STDLIB}
- No file I/O, no network calls, no third-party packages
- Tests must import from generated files using plain top-level imports
- Each file is a single module — no packages, no subdirectories
- Return ONLY valid JSON. No markdown, no backticks, no preamble.

Schema:
{
  "domain": "...",
  "files": [{"name": "...", "content": "..."}],
  "test_file": {"name": "test_solution.py", "content": "..."},
  "bugs": [{"file": "...", "line_hint": 0, "description": "...", "why_subtle": "...", "prevention": "..."}],
  "checkpoints": [
    {"id": 1, "title": "Reproduce", "ai_enabled": false, "task": "Run the full test suite. For each failing test, add a comment in the relevant file identifying which function you think is responsible and why. Annotate at least 4 of the 5 bugs before proceeding."},
    {"id": 2, "title": "Isolate", "ai_enabled": true, "task": "Using the AI as a sounding board, narrow down the exact lines causing bugs #1, #2, and #3. Explain your reasoning in chat for each one."},
    {"id": 3, "title": "Fix & Verify", "ai_enabled": true, "task": "Patch all 5 bugs. Run tests after each individual fix. All tests must pass."},
    {"id": 4, "title": "Post-mortem", "ai_enabled": true, "task": "In the chat, explain each bug: root cause, why it was hard to spot, and how you would prevent it in production."}
  ],
  "stubs": []
}`;

export const MODES = {
  bug_hunt: {
    id: 'bug_hunt',
    label: 'Bug Hunt',
    accent: 'blue',
    tagline: 'Loud bugs in junior-quality code',
    difficulty: 'Medium',
    description:
      "A 4–5 file codebase with 5–6 seeded bugs that make tests fail loudly. Off-by-one errors, wrong operators, mutable defaults — the kind of thing you'd catch reviewing a colleague's PR. Read assertion errors, diff main.py against expected output, fix, verify.",
    bestFor: 'Reading unfamiliar code, applying common-bug pattern recognition.',
    keyTraits: [
      'Tests fail with clear assertion errors pointing at the value',
      'Each bug has a filed ticket describing the symptom (no fix hints)',
      'Run main.py to see broken vs expected output side by side',
    ],
    vsLine: 'Bugs are visible the moment you run anything.',
    prompt: BUG_HUNT_PROMPT,
  },
  feature: {
    id: 'feature',
    label: 'Feature Implementation',
    accent: 'green',
    tagline: 'Build missing pieces in a working codebase',
    difficulty: 'Medium',
    description:
      'A working 4–5 file codebase with 5–6 stub functions raising NotImplementedError. Every stub ships with a feature ticket — signature, return type, edge cases, examples. Implement using the patterns already in the surrounding code.',
    bestFor: 'Reading APIs and writing new code that fits an existing style.',
    keyTraits: [
      'No bugs to find — only missing implementations',
      'Tickets specify exact signatures and acceptance criteria',
      'Tests start failing with NotImplementedError, pass as you fill stubs in',
    ],
    vsLine: 'Nothing to fix — you build the missing parts.',
    prompt: FEATURE_PROMPT,
  },
  debug: {
    id: 'debug',
    label: 'Debugging Challenge',
    accent: 'orange',
    tagline: 'Silent bugs producing wrong results',
    difficulty: 'Hard',
    description:
      "Code runs fine — no exceptions, no crashes. But the numbers, the sort order, the aggregations are subtly wrong. 4–5 silent bugs in different files. You'll diff main.py's output against expected_output.txt to even notice some of them, then trace the data flow back to find the cause.",
    bestFor: 'Tracing data flow, boundary conditions, type coercion, stale state.',
    keyTraits: [
      'Tests fail with wrong values, not exceptions',
      'Includes off-by-one boundaries, integer division, string-vs-numeric comparisons',
      'Tickets describe what users see — never what the code is doing wrong',
    ],
    vsLine: 'The code looks fine. The output is wrong. You have to figure out why.',
    prompt: DEBUG_PROMPT,
  },
};

function extractJSON(text) {
  let cleaned = text.trim();
  // Strip markdown fences
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  // Slice from first { to last }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  // Try strict parse first
  try {
    return JSON.parse(cleaned);
  } catch (_) {}
  // Fallback 1: model truncated mid-output — try to find the last complete object
  // by walking back from the end and balancing braces.
  const balanced = balanceBraces(cleaned);
  if (balanced) {
    try {
      return JSON.parse(balanced);
    } catch (_) {}
  }
  // Fallback 2: Python-style booleans/None leaked in
  const pyFixed = cleaned
    .replace(/\bTrue\b/g, 'true')
    .replace(/\bFalse\b/g, 'false')
    .replace(/\bNone\b/g, 'null');
  try {
    return JSON.parse(pyFixed);
  } catch (_) {}
  throw new Error('Could not parse model output as JSON');
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

export async function generateProblem(modeId, hint) {
  const mode = MODES[modeId];
  if (!mode) throw new Error('Unknown mode: ' + modeId);
  const prompt = mode.prompt(hint);
  const raw = await chat(
    [
      { role: 'system', content: 'You generate strictly valid JSON for a coding interview simulator. Skip extended internal reasoning — go directly to producing the JSON. Output ONLY a single JSON object — no markdown fences, no preamble, no explanation, no text after the closing brace. Use double-quoted strings, true/false/null. Escape newlines inside string values as \\n.' },
      { role: 'user', content: prompt },
    ],
    { temperature: 0.6, max_tokens: 8192 }
  );
  let parsed;
  try {
    parsed = extractJSON(raw);
  } catch (err) {
    // Surface the first chunk of raw output so the user can see what came back
    console.error('Raw model response:', raw);
    const snippet = (raw || '').slice(0, 400).replace(/\s+/g, ' ');
    const e = new Error(
      `Failed to parse JSON from model response. First 400 chars: ${snippet || '(empty response)'}`
    );
    e.raw = raw;
    e.cause = err;
    throw e;
  }
  // Basic validation
  if (!parsed.files || !Array.isArray(parsed.files) || parsed.files.length === 0) {
    throw new Error('Generated payload missing files array.');
  }
  if (!parsed.test_file || !parsed.test_file.content) {
    throw new Error('Generated payload missing test_file.');
  }
  if (!parsed.checkpoints || parsed.checkpoints.length < 4) {
    throw new Error('Generated payload missing checkpoints.');
  }
  return parsed;
}
