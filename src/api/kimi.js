import OpenAI from 'openai';
import { getTurnstileToken, isTurnstileConfigured } from '../utils/turnstile.js';

// In production the browser calls our same-origin Pages Function at /api,
// which forwards to the Cloudflare AI Gateway with the secret key.
// In local dev (npm run dev), set VITE_OPENAI_API_KEY in .env and the SDK
// will call the gateway directly — convenient but the key ends up in the
// bundle, so never `vite build` with that key set.

const directApiKey = import.meta.env.VITE_OPENAI_API_KEY;
const directBaseUrl =
  import.meta.env.VITE_OPENAI_BASE_URL ||
  'https://gateway.ai.cloudflare.com/v1/3d275686d20e190931adbada39b35957/soda/compat';

export const KIMI_MODEL = '@cf/moonshotai/kimi-k2.6';

// Custom fetch that injects a fresh Turnstile token on every /api/* call.
// Only used in proxy mode; dev mode calls the gateway directly with no token.
async function fetchWithTurnstile(url, init = {}) {
  if (!isTurnstileConfigured) return fetch(url, init);
  const token = await getTurnstileToken();
  const headers = new Headers(init.headers || {});
  if (token) headers.set('cf-turnstile-token', token);
  return fetch(url, { ...init, headers });
}

export function getClient() {
  if (directApiKey) {
    // Dev mode: call the gateway directly from the browser.
    return new OpenAI({
      apiKey: directApiKey,
      baseURL: directBaseUrl,
      dangerouslyAllowBrowser: true,
    });
  }
  // Prod mode: same-origin Pages Function (with Turnstile if configured).
  return new OpenAI({
    apiKey: 'proxy', // unused server-side
    baseURL: '/api',
    dangerouslyAllowBrowser: true,
    fetch: fetchWithTurnstile,
  });
}

export async function chat(messages, { temperature = 0.6 } = {}) {
  const client = getClient();
  const res = await client.chat.completions.create({
    model: KIMI_MODEL,
    messages,
    temperature,
  });
  return res.choices?.[0]?.message?.content ?? '';
}
