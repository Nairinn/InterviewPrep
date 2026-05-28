// Cloudflare Turnstile token manager.
// Renders an invisible widget once, then exposes getTurnstileToken() which
// resolves with a fresh single-use token each call (Turnstile auto-resets).
//
// Graceful degradation:
//   - If VITE_TURNSTILE_SITE_KEY is not set, getTurnstileToken() returns null.
//   - In that case the Pages Function will also skip Turnstile verification
//     (provided TURNSTILE_SECRET is not set server-side). This lets local dev
//     work without Turnstile setup.

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

let widgetId = null;
let renderPromise = null;
let pending = null; // { resolve, reject }

function ensureScriptReady() {
  // Wait for window.turnstile to appear (the script in index.html loads async)
  return new Promise((resolve, reject) => {
    if (window.turnstile) return resolve();
    let waited = 0;
    const interval = setInterval(() => {
      waited += 100;
      if (window.turnstile) {
        clearInterval(interval);
        resolve();
      } else if (waited >= 8000) {
        clearInterval(interval);
        reject(new Error('Turnstile script failed to load'));
      }
    }, 100);
  });
}

function ensureRendered() {
  if (renderPromise) return renderPromise;
  renderPromise = (async () => {
    await ensureScriptReady();
    // Mount an offscreen container
    let host = document.getElementById('turnstile-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'turnstile-host';
      host.style.position = 'fixed';
      host.style.left = '-9999px';
      host.style.bottom = '0';
      document.body.appendChild(host);
    }
    widgetId = window.turnstile.render(host, {
      sitekey: SITE_KEY,
      size: 'invisible',
      execution: 'execute',
      callback: (token) => {
        const p = pending;
        pending = null;
        if (p) p.resolve(token);
      },
      'error-callback': () => {
        const p = pending;
        pending = null;
        if (p) p.reject(new Error('Turnstile challenge failed'));
      },
      'expired-callback': () => {
        if (widgetId) window.turnstile.reset(widgetId);
      },
    });
  })();
  return renderPromise;
}

/**
 * Returns a fresh single-use Turnstile token, or null if Turnstile is not configured.
 * Each call invokes execute() then reset() so the next call gets a new token.
 */
export async function getTurnstileToken() {
  if (!SITE_KEY) return null;
  try {
    await ensureRendered();
  } catch (err) {
    throw err;
  }
  // Serialize calls — only one outstanding challenge at a time
  if (pending) {
    await new Promise((r) => setTimeout(r, 50));
    return getTurnstileToken();
  }
  return new Promise((resolve, reject) => {
    pending = {
      resolve: (tok) => {
        // Reset to prepare the next token for the next call
        try {
          if (widgetId) window.turnstile.reset(widgetId);
        } catch (_) {}
        resolve(tok);
      },
      reject: (err) => {
        try {
          if (widgetId) window.turnstile.reset(widgetId);
        } catch (_) {}
        reject(err);
      },
    };
    try {
      window.turnstile.execute(widgetId);
    } catch (err) {
      const p = pending;
      pending = null;
      p?.reject(err);
    }
  });
}

export const isTurnstileConfigured = !!SITE_KEY;
