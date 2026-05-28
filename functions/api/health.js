export async function onRequestGet() {
  try {
    // Test if we can import seeds without crashing
    const seeds = await import('../../lib/seed-data.js');
    return new Response(
      JSON.stringify({
        ok: true,
        seedKeys: Object.keys(seeds),
        bugHuntCount: seeds.bug_hunt_seeds?.length || 0,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message || String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
