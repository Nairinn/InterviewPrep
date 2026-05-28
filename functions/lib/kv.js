// Shared KV helpers for problem bank and user tracking

const MODES = ['bug_hunt', 'feature', 'debug'];

export async function getProblemIndex(mode, env) {
  const key = `problems:${mode}`;
  try {
    const data = await env.PROBLEMS.get(key, { type: 'json' });
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function addProblemToIndex(mode, problemId, env) {
  const index = await getProblemIndex(mode, env);
  if (!index.includes(problemId)) {
    index.push(problemId);
    await env.PROBLEMS.put(`problems:${mode}`, JSON.stringify(index));
  }
}

export async function getProblem(mode, problemId, env) {
  const key = `problem:${mode}:${problemId}`;
  try {
    return await env.PROBLEMS.get(key, { type: 'json' });
  } catch {
    return null;
  }
}

export async function saveProblem(mode, problemId, problemData, env) {
  const key = `problem:${mode}:${problemId}`;
  await env.PROBLEMS.put(key, JSON.stringify(problemData));
  await addProblemToIndex(mode, problemId, env);
}

export async function getUserSolved(userId, env) {
  if (!userId) return new Set();
  const key = `user:${userId}:solved`;
  try {
    const data = await env.PROBLEMS.get(key, { type: 'json' });
    return new Set(Array.isArray(data) ? data : []);
  } catch {
    return new Set();
  }
}

export async function markProblemSolved(userId, mode, problemId, env) {
  if (!userId) return;
  const solved = await getUserSolved(userId, env);
  solved.add(`${mode}:${problemId}`);
  await env.PROBLEMS.put(`user:${userId}:solved`, JSON.stringify([...solved]));
}

export async function getUserHistory(userId, env) {
  if (!userId) return [];
  const key = `user:${userId}:history`;
  try {
    const data = await env.PROBLEMS.get(key, { type: 'json' });
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function appendHistory(userId, entry, env) {
  if (!userId) return;
  const history = await getUserHistory(userId, env);
  history.push(entry);
  await env.PROBLEMS.put(`user:${userId}:history`, JSON.stringify(history));
}

export function generateProblemId() {
  return `gen:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}
