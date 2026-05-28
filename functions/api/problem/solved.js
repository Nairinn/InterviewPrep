// Cloudflare Pages Function — POST /api/problem/solved
// Marks a problem as solved for a user and appends session metadata to history.
// Body: { mode: string, problemId: string, user: string, meta?: { domain, totalTime, checkpointTimes, generated } }

import { markProblemSolved, appendHistory } from '../../lib/kv.js';

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { mode, problemId, user, meta } = body || {};
  if (!mode || !problemId || !user) {
    return json({ error: 'Missing mode, problemId, or user' }, 400);
  }

  try {
    await markProblemSolved(user, mode, problemId, env);
    if (meta && typeof meta === 'object') {
      await appendHistory(user, {
        mode,
        problemId,
        domain: meta.domain || '',
        totalTime: meta.totalTime || 0,
        checkpointTimes: meta.checkpointTimes || {},
        generated: !!meta.generated,
        completedAt: new Date().toISOString(),
      }, env);
    }
    return json({ ok: true });
  } catch (err) {
    console.error('KV error marking solved:', err);
    return json({ error: 'Failed to mark problem as solved' }, 500);
  }
}

export async function onRequest({ request }) {
  if (request.method === 'POST') return;
  return json({ error: 'Method not allowed' }, 405);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
