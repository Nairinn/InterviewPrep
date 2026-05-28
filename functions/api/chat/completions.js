// Cloudflare Pages Function — POST /api/chat/completions
// Same-origin proxy to the AI Gateway. Holds the API key as a server-side secret,
// pins the model, caps token usage, and validates the request body so a malicious
// caller can't drain the key by switching models or asking for huge completions.
//
// Required env vars (Cloudflare dashboard or `wrangler pages secret put`):
//   OPENAI_API_KEY     — Cloudflare API token with Workers AI scope
//   OPENAI_BASE_URL    — optional override
//   ALLOWED_ORIGIN     — optional, e.g. "https://interviewpad.pages.dev"
//                         when set, requests from other Origins are rejected
//                         (defense in depth — browsers also enforce SOP)
//   TURNSTILE_SECRET   — optional. When set, every request must carry a valid
//                         cf-turnstile-token header (verified with Cloudflare).
//                         Stops curl/script abuse cold.

const DEFAULT_BASE_URL =
  'https://gateway.ai.cloudflare.com/v1/3d275686d20e190931adbada39b35957/soda/compat';

// AI Gateway /compat endpoint is multi-provider — the model must be prefixed
// with the provider slug (workers-ai), then the Workers AI model id (@cf/...).
const PINNED_MODEL = 'workers-ai/@cf/moonshotai/kimi-k2.6';

// Hard server-side limits
const MAX_BODY_BYTES = 64 * 1024;     // 64 KB request body
const MAX_OUTPUT_TOKENS = 8192;        // cap completion length (codebase generation needs ~6-8k)
const MAX_MESSAGES = 40;               // cap chat history length
const MAX_MESSAGE_CHARS = 30000;       // cap per-message size (full file context can be ~10-20k)
const MAX_TEMPERATURE = 1.0;

// Only these fields from the incoming body are forwarded upstream
const ALLOWED_FIELDS = new Set(['messages', 'temperature', 'top_p', 'stream', 'max_tokens', 'response_format']);

export async function onRequestPost({ request, env }) {
  if (!env.OPENAI_API_KEY) {
    return json({ error: 'Server is missing OPENAI_API_KEY' }, 500);
  }

  // Optional Origin allowlist (defense in depth; same-origin browsers send Origin)
  if (env.ALLOWED_ORIGIN) {
    const origin = request.headers.get('Origin');
    if (origin && origin !== env.ALLOWED_ORIGIN) {
      return json({ error: 'Origin not allowed' }, 403);
    }
  }

  // Turnstile verification — single line of defense against curl/script abuse
  if (env.TURNSTILE_SECRET) {
    const token = request.headers.get('cf-turnstile-token');
    if (!token) {
      return json({ error: 'Missing Turnstile token' }, 401);
    }
    const ip = request.headers.get('CF-Connecting-IP') || '';
    const form = new URLSearchParams();
    form.append('secret', env.TURNSTILE_SECRET);
    form.append('response', token);
    if (ip) form.append('remoteip', ip);
    let verify;
    try {
      verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      });
    } catch {
      return json({ error: 'Turnstile verify failed (network)' }, 502);
    }
    const data = await verify.json().catch(() => ({}));
    if (!data.success) {
      return json({ error: 'Turnstile verification failed', codes: data['error-codes'] || [] }, 401);
    }
  }

  // Reject oversized bodies before we even parse
  const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10);
  if (contentLength > MAX_BODY_BYTES) {
    return json({ error: 'Request body too large' }, 413);
  }

  // Read + size-check (defense if Content-Length lied)
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return json({ error: 'Request body too large' }, 413);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return json({ error: 'Body must be a JSON object' }, 400);
  }

  // Validate messages
  if (!Array.isArray(parsed.messages) || parsed.messages.length === 0) {
    return json({ error: 'messages must be a non-empty array' }, 400);
  }
  if (parsed.messages.length > MAX_MESSAGES) {
    return json({ error: `Too many messages (max ${MAX_MESSAGES})` }, 400);
  }
  for (const m of parsed.messages) {
    if (
      !m ||
      typeof m !== 'object' ||
      typeof m.role !== 'string' ||
      !['system', 'user', 'assistant'].includes(m.role) ||
      typeof m.content !== 'string'
    ) {
      return json({ error: 'Each message needs {role, content:string}' }, 400);
    }
    if (m.content.length > MAX_MESSAGE_CHARS) {
      return json({ error: `Message too long (max ${MAX_MESSAGE_CHARS} chars)` }, 400);
    }
  }

  // Build a clean payload — start with only the fields we trust, pin the model.
  // Anything not in ALLOWED_FIELDS (including `model`) is dropped.
  const safe = { model: PINNED_MODEL, messages: parsed.messages };
  if (typeof parsed.temperature === 'number') {
    safe.temperature = Math.min(Math.max(parsed.temperature, 0), MAX_TEMPERATURE);
  }
  if (typeof parsed.top_p === 'number') {
    safe.top_p = Math.min(Math.max(parsed.top_p, 0), 1);
  }
  if (typeof parsed.max_tokens === 'number') {
    safe.max_tokens = Math.min(Math.max(Math.floor(parsed.max_tokens), 1), MAX_OUTPUT_TOKENS);
  } else {
    safe.max_tokens = MAX_OUTPUT_TOKENS;
  }
  // Pass through response_format (e.g. {type:"json_object"}) if provided.
  if (parsed.response_format && typeof parsed.response_format === 'object') {
    safe.response_format = parsed.response_format;
  }
  // Force streaming off so we can fully control response size
  safe.stream = false;

  const baseUrl = env.OPENAI_BASE_URL || DEFAULT_BASE_URL;
  const upstream = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

  let resp;
  try {
    resp = await fetch(upstream, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(safe),
    });
  } catch (err) {
    return json({ error: 'Upstream fetch failed' }, 502);
  }

  // Pass through upstream body + status, but never expose upstream headers
  // (some providers echo auth-adjacent headers back; safer to whitelist).
  const text = await resp.text();
  return new Response(text, {
    status: resp.status,
    headers: { 'Content-Type': resp.headers.get('Content-Type') || 'application/json' },
  });
}

// Block every method other than POST
export async function onRequest({ request }) {
  if (request.method === 'POST') return; // delegate to onRequestPost
  return json({ error: 'Method not allowed' }, 405);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
