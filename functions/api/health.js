export async function onRequestGet({ request }) {
  try {
    const url = new URL(request.url);
    const origin = `${url.protocol}//${url.host}`;
    
    // Test fetching seeds via HTTP (same approach as next.js)
    const resp = await fetch(`${origin}/seed/bug_hunt.json`);
    if (!resp.ok) {
      return new Response(
        JSON.stringify({ ok: false, error: `Static file fetch failed: ${resp.status}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const seeds = await resp.json();
    return new Response(
      JSON.stringify({
        ok: true,
        bugHuntCount: Array.isArray(seeds) ? seeds.length : 'not-array',
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
