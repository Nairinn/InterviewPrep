// Cloudflare Pages Function — GET /api/problem/history?user=<uuid>
// Returns the user's solved session history, newest first.

import { getUserHistory } from '../../lib/kv.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('user');

  if (!userId) {
    return json({ error: 'Missing user parameter' }, 400);
  }

  try {
    const history = await getUserHistory(userId, env);
    return json({ history: history.reverse() });
  } catch (err) {
    console.error('KV error fetching history:', err);
    return json({ error: 'Failed to fetch history' }, 500);
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
