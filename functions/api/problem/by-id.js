// Cloudflare Pages Function — GET /api/problem/by-id?mode=<mode>&id=<problemId>
// Returns a specific problem by mode + id. Looks in seed JSON first, then KV.
// Used by the History modal to replay a solved problem.

import { getProblem } from '../../lib/kv.js';

const SEED_PATHS = {
  bug_hunt: '/seed/bug_hunt.json',
  feature: '/seed/feature.json',
  debug: '/seed/debug.json',
};

let seedCache = {};

async function fetchSeeds(mode, origin) {
  if (seedCache[mode]) return seedCache[mode];
  const path = SEED_PATHS[mode];
  if (!path) return [];
  try {
    const resp = await fetch(`${origin}${path}`);
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
    const problemId = url.searchParams.get('id');

    if (!mode || !SEED_PATHS[mode]) {
      return json({ error: 'Invalid or missing mode' }, 400);
    }
    if (!problemId) {
      return json({ error: 'Missing id parameter' }, 400);
    }

    // Look in seed bank first
    const origin = `${url.protocol}//${url.host}`;
    const seeds = await fetchSeeds(mode, origin);
    const seedMatch = seeds.find((p) => p.id === problemId);
    if (seedMatch) {
      return json({ problem: seedMatch, source: 'seed' });
    }

    // Then KV
    if (env && env.PROBLEMS) {
      const kvProblem = await getProblem(mode, problemId, env);
      if (kvProblem) {
        return json({ problem: kvProblem, source: 'kv' });
      }
    }

    return json({ error: 'Problem not found' }, 404);
  } catch (err) {
    console.error('[problem/by-id] error:', err.message || err);
    return json({ error: 'Internal server error', detail: err.message || String(err) }, 500);
  }
}

export async function onRequest({ request }) {
  if (request.method === 'GET') return;
  return json({ error: 'Method not allowed' }, 405);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
