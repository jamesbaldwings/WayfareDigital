// n8n Code node: "Check site" (Mode: Run Once for Each Item)
// Needs NODE_FUNCTION_ALLOW_BUILTIN=https,tls set on the n8n container.
const https = require('https');
const tls = require('tls');

// n8n 2.x Code nodes have no URL global, so addresses are parsed by hand.
function parseUrl(u) {
  const m = /^(https?):\/\/([^/:?#]+)(?::(\d+))?([^?#]*)?(\?[^#]*)?/i.exec(String(u || '').trim());
  if (!m) return null;
  return { protocol: m[1].toLowerCase(), hostname: m[2].toLowerCase(), port: m[3] ? Number(m[3]) : null,
           path: (m[4] || '/') + (m[5] || '') };
}
function resolveRedirect(location, base) {
  if (/^https?:\/\//i.test(location)) return location;           // absolute
  const b = parseUrl(base);
  if (!b) return null;
  const origin = b.protocol + '://' + b.hostname + (b.port ? ':' + b.port : '');
  if (location.startsWith('//')) return b.protocol + ':' + location; // protocol-relative
  if (location.startsWith('/')) return origin + location;            // root-relative
  const dir = b.path.split('?')[0].replace(/[^/]*$/, '');
  return origin + dir + location;                                    // relative
}

const site = $input.item.json;
const TIMEOUT_MS = 15000;

function fetchStatus(url, redirectsLeft = 5) {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = https.get(url, {
      timeout: TIMEOUT_MS,
      headers: { 'User-Agent': 'WayfareMonitor/1.0 (+site health check)' }
    }, (res) => {
      res.resume();
      const ms = Date.now() - start;
      const loc = res.headers.location;
      if (res.statusCode >= 300 && res.statusCode < 400 && loc) {
        if (redirectsLeft === 0) return resolve({ status: res.statusCode, ms, error: 'Too many redirects (possible redirect loop)' });
        const next = resolveRedirect(loc, url);
        if (next && next.startsWith('https://')) {
          return fetchStatus(next, redirectsLeft - 1).then((r) => resolve({ ...r, ms: r.ms + ms }));
        }
      }
      resolve({ status: res.statusCode, ms, error: '' });
    });
    req.on('timeout', () => req.destroy(new Error('Timed out after ' + TIMEOUT_MS / 1000 + 's')));
    req.on('error', (e) => resolve({ status: 0, ms: Date.now() - start, error: e.message }));
  });
}

function certificate(host, port) {
  return new Promise((resolve) => {
    const socket = tls.connect({ host, port, servername: host, rejectUnauthorized: false, timeout: 10000 }, () => {
      const cert = socket.getPeerCertificate();
      const authorized = socket.authorized;
      socket.end();
      if (!cert || !cert.valid_to) return resolve({ days: '', invalid: false });
      const days = Math.floor((new Date(cert.valid_to).getTime() - Date.now()) / 86400000);
      resolve({ days: String(days), invalid: !authorized });
    });
    socket.on('timeout', () => { socket.destroy(); resolve({ days: '', invalid: false }); });
    socket.on('error', () => resolve({ days: '', invalid: false }));
  });
}

const target = parseUrl(site.url);
if (!target || target.protocol !== 'https') {
  return { json: { site_id: String(site.id), site_name: site.site_name, url: site.url, ok: 'false', status_code: '0',
    response_ms: '0', ssl_days_left: '', error: 'Site URL must start with https://', ssl_invalid: 'false' } };
}
const [res, cert] = await Promise.all([
  fetchStatus(site.url),
  certificate(target.hostname, target.port || 443)
]);
// A certificate problem also breaks the page load; report it as an SSL issue, not only as "down".
const ok = res.status >= 200 && res.status < 400 && !res.error;

return {
  json: {
    site_id: String(site.id),
    site_name: site.site_name,
    url: site.url,
    ok: String(ok),
    status_code: String(res.status),
    response_ms: String(res.ms),
    ssl_days_left: cert.days,
    error: (res.error || '').slice(0, 300),
    ssl_invalid: String(cert.invalid)
  }
};
