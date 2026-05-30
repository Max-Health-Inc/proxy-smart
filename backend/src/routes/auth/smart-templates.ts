/**
 * HTML templates for SMART authorization flow UI pages.
 * Extracted from oauth.ts to keep route files focused on logic.
 */

/** Friendly HTML page shown for auth flow errors (expired session, invalid state, etc.) */
export function authErrorPage(opts: { status: number; error: string; errorDescription: string }): Response {
  const { status, error, errorDescription } = opts
  const title = error === 'invalid_request' ? 'Session Expired' : 'Authorization Error'
  const html = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="icon" type="image/svg+xml" href="/proxy-smart.svg"/>
<title>${status} — ${title}</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{color-scheme:dark}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#000;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center}
.c{text-align:center;max-width:480px;padding:2rem}
h1{font-size:6rem;font-weight:200;line-height:1;margin-bottom:.5rem;color:#a3a3a3}
h2{font-size:1.25rem;font-weight:500;margin-bottom:1rem}
p{color:#737373;font-size:.875rem;margin-bottom:2rem}
.actions{display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap}
a{display:inline-block;background:#fff;color:#000;padding:8px 20px;font-size:.875rem;font-weight:500;text-decoration:none;transition:opacity .15s;cursor:pointer}
a:hover{opacity:.85}
.secondary{background:transparent;color:#737373;border:1px solid rgba(255,255,255,.1)}
.secondary:hover{color:#a3a3a3;border-color:rgba(255,255,255,.2)}
.code{margin-top:2rem;padding-top:1rem;border-top:1px solid rgba(255,255,255,.05);font-size:.75rem;color:#525252;font-family:ui-monospace,monospace}
</style>
</head>
<body>
<div class="c">
<h1>${status}</h1>
<h2>${Bun.escapeHTML(title)}</h2>
<p>${Bun.escapeHTML(errorDescription)}</p>
<div class="actions">
<a href="javascript:history.back()">Go Back</a>
<a class="secondary" href="/">Home</a>
</div>
<div class="code">${Bun.escapeHTML(error)}</div>
</div>
</body>
</html>`
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

/** Friendly HTML page shown when Keycloak is unreachable */
export function kcUnavailablePage(): Response {
  const html = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="icon" type="image/svg+xml" href="/proxy-smart.svg"/>
<title>503 — Authentication Unavailable</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{color-scheme:dark}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#000;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center}
.c{text-align:center;max-width:480px;padding:2rem}
h1{font-size:6rem;font-weight:200;line-height:1;margin-bottom:.5rem;color:#a3a3a3}
h2{font-size:1.25rem;font-weight:500;margin-bottom:1rem}
p{color:#737373;font-size:.875rem;margin-bottom:2rem}
.actions{display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap}
a{display:inline-block;background:#fff;color:#000;padding:8px 20px;font-size:.875rem;font-weight:500;text-decoration:none;transition:opacity .5s;cursor:pointer}
a:hover{opacity:.85}
.secondary{background:transparent;color:#737373;border:1px solid rgba(255,255,255,.1)}
.secondary:hover{color:#a3a3a3;border-color:rgba(255,255,255,.2)}
.hint{margin-top:2rem;padding-top:1rem;border-top:1px solid rgba(255,255,255,.05);font-size:.75rem;color:#525252;font-family:ui-monospace,monospace;text-transform:uppercase;letter-spacing:.2em}
.hint a{background:none;padding:0;font-size:.75rem;color:#525252;display:inline;font-family:ui-monospace,monospace;text-transform:uppercase;letter-spacing:.2em;text-decoration:underline;text-underline-offset:2px}
.hint a:hover{color:#737373}
</style>
</head>
<body>
<div class="c">
<h1>503</h1>
<h2>Authentication unavailable</h2>
<p>The identity provider is not responding. This is usually temporary.</p>
<div class="actions">
<a href="javascript:location.reload()">Retry</a>
<a class="secondary" href="/">Home</a>
</div>
<div class="hint">Persists? Check <a href="/webapp">admin ui</a></div>
</div>
</body>
</html>`
  return new Response(html, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Retry-After': '30' } })
}
