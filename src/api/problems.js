// Frontend problem bank API
// In production: calls Cloudflare Pages Functions
// In dev (vite only, no wrangler): falls back to loading seed JSON directly

const LOCAL_STORAGE_KEY = 'interviewpad_user_id';
const HISTORY_KEY = 'interviewpad_history';

export function getUserId() {
  let id = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(LOCAL_STORAGE_KEY, id);
  }
  return id;
}

export async function fetchNextProblem(mode, hint = '') {
  const user = getUserId();
  let apiUrl = `/api/problem/next?mode=${encodeURIComponent(mode)}&user=${encodeURIComponent(user)}`;
  if (hint) {
    apiUrl += `&hint=${encodeURIComponent(hint)}`;
  }

  try {
    const resp = await fetch(apiUrl, { method: 'GET' });
    if (resp.ok) {
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      return { problem: data.problem, generated: data.generated };
    }
    // If API returns non-ok, fall through to dev fallback
  } catch (err) {
    // Network error or API not available (dev mode without wrangler)
    console.warn('Problem API unavailable, falling back to seed JSON:', err.message);
  }

  // Dev fallback: load seed JSON directly
  try {
    const resp = await fetch(`/seed/${mode}.json`);
    if (!resp.ok) throw new Error(`Seed file not found: ${mode}.json`);
    const seeds = await resp.json();
    if (!Array.isArray(seeds) || seeds.length === 0) {
      throw new Error('Seed file empty');
    }
    // Try to pick an unsolved one if we have local tracking
    const solvedKey = `interviewpad_solved_${mode}`;
    const solved = new Set(JSON.parse(localStorage.getItem(solvedKey) || '[]'));
    const unsolved = seeds.filter((s) => !solved.has(s.id));
    const pool = unsolved.length > 0 ? unsolved : seeds;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    return { problem: pick, generated: false };
  } catch (err) {
    throw new Error(`Failed to load problem: ${err.message}`);
  }
}

export async function markProblemSolved(mode, problemId, meta = {}) {
  const user = getUserId();

  // Always track locally for dev fallback
  try {
    const solvedKey = `interviewpad_solved_${mode}`;
    const solved = new Set(JSON.parse(localStorage.getItem(solvedKey) || '[]'));
    solved.add(problemId);
    localStorage.setItem(solvedKey, JSON.stringify([...solved]));
  } catch {
    // ignore localStorage errors
  }

  // Append to local history for dev fallback
  try {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history.push({
      mode,
      problemId,
      domain: meta.domain || '',
      totalTime: meta.totalTime || 0,
      checkpointTimes: meta.checkpointTimes || {},
      generated: !!meta.generated,
      completedAt: new Date().toISOString(),
    });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // ignore
  }

  try {
    const resp = await fetch('/api/problem/solved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, problemId, user, meta }),
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      console.warn('Failed to mark problem solved on server:', data.error);
    }
  } catch (err) {
    console.warn('Problem solved API unavailable:', err.message);
  }
}

export async function fetchHistory() {
  const user = getUserId();

  try {
    const resp = await fetch(`/api/problem/history?user=${encodeURIComponent(user)}`, { method: 'GET' });
    if (resp.ok) {
      const data = await resp.json();
      if (data.history) return data.history;
    }
  } catch (err) {
    console.warn('History API unavailable, falling back to localStorage:', err.message);
  }

  // Dev fallback
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]').reverse();
  } catch {
    return [];
  }
}
