/**
 * HTML templates for SMART authorization flow UI pages.
 * Extracted from oauth.ts to keep route files focused on logic.
 */

/** Minimal patient picker HTML page served during standalone SMART launch */
export function patientPickerPage(sessionKey: string, code: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Select Patient — Proxy Smart</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh;padding:2rem;display:flex;align-items:flex-start;justify-content:center}
.container{background:#1e293b;border-radius:1rem;padding:2rem;max-width:640px;width:100%;border:1px solid #334155}
h1{font-size:1.25rem;margin-bottom:.5rem;color:#f8fafc}
.subtitle{color:#94a3b8;margin-bottom:1.5rem;font-size:.875rem}
.search-box{display:flex;gap:.5rem;margin-bottom:1rem}
input[type="text"]{flex:1;padding:.625rem 1rem;border-radius:.5rem;border:1px solid #475569;background:#0f172a;color:#e2e8f0;font-size:.875rem;outline:none}
input[type="text"]:focus{border-color:#3b82f6}
button{padding:.625rem 1rem;border-radius:.5rem;border:none;font-size:.875rem;font-weight:500;cursor:pointer;transition:background .15s}
.btn-search{background:#3b82f6;color:#fff}.btn-search:hover{background:#2563eb}
.btn-select{background:#10b981;color:#fff;width:100%;margin-top:.5rem}.btn-select:hover{background:#059669}
.btn-select:disabled{background:#475569;cursor:not-allowed}
.results{max-height:400px;overflow-y:auto;margin-top:.5rem}
.patient-row{padding:.75rem 1rem;border:1px solid #334155;border-radius:.5rem;margin-bottom:.5rem;cursor:pointer;transition:background .15s}
.patient-row:hover,.patient-row.selected{background:#334155;border-color:#3b82f6}
.patient-row .name{font-weight:500;color:#f8fafc}
.patient-row .meta{font-size:.8rem;color:#94a3b8;margin-top:.25rem}
.loading,.error,.empty{text-align:center;padding:2rem;color:#94a3b8;font-size:.875rem}
.error{color:#f87171}
</style></head><body>
<div class="container">
<h1>Select Patient</h1>
<p class="subtitle">This application is requesting patient context. Search and select the patient whose data you want to access.</p>
<div class="search-box">
  <input type="text" id="search" placeholder="Search by name or MRN..." autocomplete="off">
  <button class="btn-search" onclick="searchPatients()">Search</button>
</div>
<div id="results" class="results"><div class="empty">Enter a search term to find patients</div></div>
<form id="selectForm" method="POST" action="/auth/patient-select">
  <input type="hidden" name="session" value="${sessionKey}">
  <input type="hidden" name="code" value="${code}">
  <input type="hidden" name="patient" id="selectedPatient" value="">
  <button type="submit" class="btn-select" id="submitBtn" disabled>Select Patient</button>
</form>
</div>
<script>
let selected = null;
const baseUrl = location.origin;

async function searchPatients() {
  const q = document.getElementById('search').value.trim();
  if (!q) return;
  const results = document.getElementById('results');
  results.innerHTML = '<div class="loading">Searching...</div>';
  try {
    const resp = await fetch(baseUrl + '/fhir/proxy-smart-backend/default/R4/Patient?name=' + encodeURIComponent(q) + '&_count=20', {
      headers: { 'Accept': 'application/fhir+json' }
    });
    if (!resp.ok) throw new Error('Search failed: ' + resp.status);
    const bundle = await resp.json();
    const entries = bundle.entry || [];
    if (entries.length === 0) {
      results.innerHTML = '<div class="empty">No patients found</div>';
      return;
    }
    results.innerHTML = entries.map(e => {
      const p = e.resource;
      const name = (p.name && p.name[0]) ? [p.name[0].given?.join(' '), p.name[0].family].filter(Boolean).join(' ') : 'Unknown';
      const dob = p.birthDate || '';
      const gender = p.gender || '';
      const mrn = p.identifier?.find(i => i.type?.coding?.[0]?.code === 'MR')?.value || p.id;
      return '<div class="patient-row" data-id="'+p.id+'" onclick="selectPatient(this, \\''+p.id+'\\')">' +
        '<div class="name">'+name+'</div>' +
        '<div class="meta">ID: '+p.id+(dob ? ' • DOB: '+dob : '')+(gender ? ' • '+gender : '')+'</div></div>';
    }).join('');
  } catch(err) {
    results.innerHTML = '<div class="error">'+err.message+'</div>';
  }
}

function selectPatient(el, id) {
  document.querySelectorAll('.patient-row').forEach(r => r.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('selectedPatient').value = id;
  document.getElementById('submitBtn').disabled = false;
  selected = id;
}

document.getElementById('search').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); searchPatients(); } });
</script>
</body></html>`
}

/** Friendly HTML page shown when Keycloak is unreachable */
export function kcUnavailablePage(): Response {
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Authentication Unavailable — Proxy Smart</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:1rem}
.card{background:#1e293b;border-radius:1rem;padding:2.5rem;max-width:480px;width:100%;text-align:center;border:1px solid #334155}
.icon{font-size:3rem;margin-bottom:1rem}
h1{font-size:1.5rem;margin-bottom:.75rem;color:#f8fafc}
p{color:#94a3b8;line-height:1.6;margin-bottom:1.5rem}
.actions{display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap}
a,button{display:inline-flex;align-items:center;gap:.5rem;padding:.625rem 1.25rem;border-radius:.5rem;font-size:.875rem;font-weight:500;text-decoration:none;cursor:pointer;border:none;transition:background .15s}
.retry{background:#3b82f6;color:#fff}.retry:hover{background:#2563eb}
.home{background:#334155;color:#e2e8f0}.home:hover{background:#475569}
.hint{margin-top:1.5rem;padding-top:1rem;border-top:1px solid #334155;font-size:.8rem;color:#64748b}
</style></head><body>
<div class="card">
<div class="icon">🔒</div>
<h1>Authentication Temporarily Unavailable</h1>
<p>The authentication service is not responding. This is usually temporary — the service may be restarting or undergoing maintenance.</p>
<div class="actions">
<a class="retry" href="javascript:location.reload()">↻ Try Again</a>
<a class="home" href="/">← Back to Home</a>
</div>
<div class="hint">If the problem persists, administrators can check the Keycloak configuration in the <a href="/webapp" style="color:#60a5fa">Admin UI</a>.</div>
</div></body></html>`
  return new Response(html, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Retry-After': '30' } })
}
