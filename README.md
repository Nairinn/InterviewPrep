# InterviewPad

AI-assisted coding interview practice that mimics the Meta / Notion / Google CoderPad format. Single Vite + React + Tailwind app — Pyodide runs Python in the browser, and Kimi (`@cf/moonshotai/kimi-k2.6`) on Cloudflare Workers AI (via AI Gateway, OpenAI-compatible) generates dynamic codebases. Cloudflare Pages Function holds the API key server-side.

## Modes

- **Bug Hunt** (blue): 5 seeded bugs across 4-5 files
- **Feature Implementation** (green): 4 stub functions to complete
- **Debugging Challenge** (orange): 5 subtle bugs producing silently wrong output

Each session is 60 minutes with 4 checkpoints. Checkpoint 1 always disables the AI assistant.

---

## Local development

```bash
npm install
cp .env.example .env
# paste your Cloudflare API token (Workers AI scope) into VITE_OPENAI_API_KEY
npm run dev
```

In dev mode with `VITE_OPENAI_API_KEY` set, the browser calls the AI Gateway directly (key is in the bundle — fine for localhost, not for deploys).

**To test the proxy locally** (the same code path used in production):

```bash
# Don't set VITE_OPENAI_API_KEY in .env
npm run pages:dev
# Wrangler will prompt you for OPENAI_API_KEY the first time
```

This runs `wrangler pages dev` in front of Vite, so `/api/chat/completions` is served by your Pages Function and the key lives only in the Wrangler process.

---

## Deploy to Cloudflare Pages

One-time setup:

```bash
npm install -g wrangler   # if you don't have it
wrangler login
wrangler pages project create interviewpad --production-branch main
```

Store your key + Turnstile secret as Cloudflare secrets (they never touch the bundle):

```bash
# Required — the upstream API key
npx wrangler pages secret put OPENAI_API_KEY --project-name interviewpad

# Required for production — blocks curl/script abuse
# Get a sitekey + secret at https://dash.cloudflare.com → Turnstile → Add site
npx wrangler pages secret put TURNSTILE_SECRET --project-name interviewpad

# Recommended — lock to your domain
npx wrangler pages secret put ALLOWED_ORIGIN --project-name interviewpad
# paste e.g. https://interviewpad.pages.dev
```

Add the Turnstile **public** site key to your local `.env` so it's embedded in the build:

```bash
echo "VITE_TURNSTILE_SITE_KEY=<your-public-sitekey>" >> .env
```

Deploy:

```bash
npm run deploy
```

Wrangler builds the Vite app and pushes `dist/` plus `functions/` to Pages. The browser bundle contains **no key** — every chat call hits `/api/chat/completions`, which the Pages Function ([functions/api/chat/completions.js](functions/api/chat/completions.js)) forwards to the AI Gateway using the `OPENAI_API_KEY` secret.

### Security & cost control

The key never reaches the browser — it lives only in the Cloudflare Pages `OPENAI_API_KEY` secret. The proxy in [functions/api/chat/completions.js](functions/api/chat/completions.js) hardens against the obvious abuse paths:

- **Turnstile required** when `TURNSTILE_SECRET` is set — every request must carry a valid one-time human-verification token, blocking curl/script abuse
- **Model pinned** server-side to `@cf/moonshotai/kimi-k2.6` — caller can't switch to a pricier model
- **`max_tokens` capped** at 4096 — bounds cost per request
- **Body capped** at 64 KB and message count at 40 — bounds input cost
- **Per-message length capped** at 30 KB
- **Field allowlist** — only `messages`/`temperature`/`top_p`/`max_tokens` reach upstream
- **Streaming forced off** — server fully controls response size
- **Only POST** — every other method returns 405
- **Optional Origin allowlist** — set `ALLOWED_ORIGIN` secret to e.g. `https://interviewpad.pages.dev` to reject other browsers (defense in depth on top of SOP)

Belt-and-suspenders: also configure the Cloudflare AI Gateway dashboard for the `soda` gateway:

- **Rate limiting** (e.g. 30 requests per minute per IP)
- **Caching** (free hits for repeated prompts)
- **Spend limit** — a hard monthly cap on the gateway itself

Before deploying, double-check:

```bash
# .env must NOT contain VITE_OPENAI_API_KEY at build time
grep VITE_OPENAI_API_KEY .env 2>/dev/null && echo "REMOVE THIS BEFORE DEPLOY" || echo "ok"

# bundle must contain no key
grep -E "sk-[A-Za-z0-9_-]{20,}|Bearer [A-Za-z0-9_-]{20,}" dist/assets/*.js && echo "LEAK" || echo "ok"
```

---

## How it works

- Problem codebase + unittest test file are generated on demand via Kimi (`@cf/moonshotai/kimi-k2.6`)
- Pyodide loads in the browser and runs the tests directly against your edited files
- The AI sidebar gets the currently-open file injected into the system prompt every message
- At session end (or 0:00) a debrief screen calls Kimi for honest feedback on your approach
