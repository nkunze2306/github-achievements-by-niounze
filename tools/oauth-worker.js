// Cloudflare Worker for the dashboard. Two optional jobs:
//   1. Owner login (POST /token, see docs/SETUP-LOGIN.md): exchanges the OAuth code for the GitHub login name.
//      The access token never leaves the worker and is not stored.
//   2. Visitor statistics for the owner (POST /hit from the page, GET /visits for you, see docs/SETUP-VISITS.md).
//      No cookies and no raw IP address: a visitor is a hash of IP + browser + day, so the same person is only recognised within one day.
// Variables: CLIENT_ID, CLIENT_SECRET (secret), ALLOWED_ORIGIN (for example https://YOUR-USER.github.io)
// Visits additionally: a D1 database bound as DB and the secret VISITS_KEY (the password of the /visits page).
const COLS = ['ts', 'visitor', 'path', 'ref', 'refHost', 'utm', 'lang', 'langs', 'country', 'region', 'city', 'postal', 'lat', 'lon', 'tz', 'clientTz', 'continent', 'eu',
  'asn', 'org', 'colo', 'proto', 'tls', 'ua', 'browser', 'os', 'device', 'bot', 'platform', 'screen', 'viewport', 'dpr', 'dark', 'touch', 'cores', 'mem', 'conn', 'loadMs'];
const KEEP_DAYS = 180;
const str = (v, n = 200) => (typeof v === 'string' ? v.slice(0, n) : '');
const num = (v) => (v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const enc = new TextEncoder();
const digest = (s) => crypto.subtle.digest('SHA-256', enc.encode(s));
const hex = (buf) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');

function agent(ua) {
  const bot = /bot|crawl|spider|slurp|headless|preview|facebookexternalhit|curl|wget|python|node-fetch|go-http|camo|lighthouse/i.test(ua);
  const browser = /edg\//i.test(ua) ? 'Edge' : /opr\/|opera/i.test(ua) ? 'Opera' : /firefox|fxios/i.test(ua) ? 'Firefox' : /samsungbrowser/i.test(ua) ? 'Samsung Internet'
    : /chrome|crios/i.test(ua) ? 'Chrome' : /safari/i.test(ua) ? 'Safari' : 'Other';
  const os = /windows/i.test(ua) ? 'Windows' : /android/i.test(ua) ? 'Android' : /iphone|ipad|ipod/i.test(ua) ? 'iOS' : /mac os x/i.test(ua) ? 'macOS' : /cros/i.test(ua) ? 'ChromeOS' : /linux/i.test(ua) ? 'Linux' : 'Other';
  const device = /ipad|tablet/i.test(ua) ? 'tablet' : /mobi|iphone|android/i.test(ua) ? 'mobile' : 'desktop';
  return { bot: bot ? 1 : 0, browser, os, device };
}

let ready;
const schema = (db) => (ready ||= db.batch([
  db.prepare(`CREATE TABLE IF NOT EXISTS visits (id INTEGER PRIMARY KEY AUTOINCREMENT, ${COLS.join(', ')})`),
  db.prepare('CREATE INDEX IF NOT EXISTS visits_ts ON visits (ts)'),
]));

async function record(req, env, b) {
  await schema(env.DB);
  const cf = req.cf || {}, ua = str(req.headers.get('User-Agent'), 300), ip = req.headers.get('CF-Connecting-IP') || '';
  const now = Date.now(), day = new Date(now).toISOString().slice(0, 10);
  const ref = str(b.ref, 300);
  let refHost = '';
  try { refHost = ref ? new URL(ref).hostname : ''; } catch { /* not a URL */ }
  const row = {
    ts: now, visitor: hex(await digest(`${ip}|${ua}|${day}|${env.VISITS_KEY || ''}`)).slice(0, 12),
    path: str(b.path, 200), ref, refHost, utm: str(b.utm, 200),
    lang: str(b.lang, 20) || str(req.headers.get('Accept-Language')).split(',')[0], langs: str(b.langs, 100),
    country: cf.country || '', region: cf.region || '', city: cf.city || '', postal: cf.postalCode || '', lat: num(cf.latitude), lon: num(cf.longitude),
    tz: cf.timezone || '', clientTz: str(b.clientTz, 60), continent: cf.continent || '', eu: cf.isEUCountry ? 1 : 0,
    asn: cf.asn ?? null, org: cf.asOrganization || '', colo: cf.colo || '', proto: cf.httpProtocol || '', tls: cf.tlsVersion || '',
    ua, ...agent(ua), platform: str(b.platform, 40), screen: str(b.screen, 20), viewport: str(b.viewport, 20), dpr: num(b.dpr),
    dark: b.dark === 1 ? 1 : b.dark === 0 ? 0 : null, touch: num(b.touch), cores: num(b.cores), mem: num(b.mem), conn: str(b.conn, 10), loadMs: num(b.loadMs),
  };
  await env.DB.prepare(`INSERT INTO visits (${COLS.join(', ')}) VALUES (${COLS.map(() => '?').join(', ')})`).bind(...COLS.map((c) => row[c])).run();
  if (Math.random() < 0.02) await env.DB.prepare('DELETE FROM visits WHERE ts < ?').bind(now - KEEP_DAYS * 864e5).run();
}

async function authed(req, env) {
  const h = req.headers.get('Authorization') || '';
  if (!env.VISITS_KEY || !h.startsWith('Basic ')) return false;
  let pass;
  try { pass = atob(h.slice(6)).split(':').slice(1).join(':'); } catch { return false; }
  const [a, b] = await Promise.all([digest(pass), digest(env.VISITS_KEY)]);
  return crypto.subtle.timingSafeEqual(a, b);
}

const table = (title, rows, head = ['', 'Views', 'Visitors']) => `<section><h2>${esc(title)}</h2><table><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>${
  rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${head.length}" class="dim">no data</td></tr>`}</table></section>`;

async function report(env, days) {
  await schema(env.DB);
  const since = Date.now() - days * 864e5, db = env.DB;
  const top = (expr, n = 12) => db.prepare(`SELECT ${expr} AS k, COUNT(*) AS n, COUNT(DISTINCT visitor) AS u FROM visits WHERE bot = 0 AND ts > ? AND ${expr} != '' GROUP BY k ORDER BY n DESC LIMIT ${n}`).bind(since);
  const [totals, perDay, hours, country, city, refs, pages, browser, os, device, lang, org, screen, dark, tz, conn, utm, last] = await db.batch([
    db.prepare('SELECT COUNT(*) AS n, COUNT(DISTINCT visitor) AS u, SUM(bot) AS bots, SUM(ts > ?) AS today, AVG(loadMs) AS load FROM visits WHERE ts > ?').bind(Date.now() - 864e5, since),
    db.prepare("SELECT strftime('%Y-%m-%d', ts / 1000, 'unixepoch') AS k, COUNT(*) AS n, COUNT(DISTINCT visitor) AS u FROM visits WHERE bot = 0 AND ts > ? GROUP BY k ORDER BY k DESC LIMIT 30").bind(since),
    db.prepare("SELECT strftime('%H', ts / 1000, 'unixepoch') AS k, COUNT(*) AS n, COUNT(DISTINCT visitor) AS u FROM visits WHERE bot = 0 AND ts > ? GROUP BY k ORDER BY k").bind(since),
    top("country || CASE WHEN eu = 1 THEN ' (EU)' ELSE '' END"), top("city || ', ' || country"), top("CASE WHEN refHost = '' THEN '(direct)' ELSE refHost END"), top('path'),
    top('browser'), top('os'), top('device'), top('lang'), top("org || ' (AS' || asn || ')'"), top("screen || ' @' || dpr || 'x'"),
    top("CASE dark WHEN 1 THEN 'dark' WHEN 0 THEN 'light' ELSE '' END"), top('clientTz'), top('conn'), top('utm'),
    db.prepare('SELECT * FROM visits WHERE ts > ? ORDER BY ts DESC LIMIT 100').bind(since),
  ]);
  const t = totals.results[0] || {}, rows = (r) => r.results.map((x) => [x.k, x.n, x.u]);
  const when = (ts) => new Date(ts).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', dateStyle: 'short', timeStyle: 'medium' });
  const max = Math.max(1, ...perDay.results.map((x) => x.n));
  const bars = perDay.results.map((x) => `<div class="bar"><span>${esc(x.k)}</span><i style="width:${Math.round((x.n / max) * 100)}%"></i><b>${x.n} / ${x.u}</b></div>`).join('');
  const visits = last.results.map((v) => [when(v.ts), `${v.city}${v.region ? ', ' + v.region : ''} ${v.country}`.trim(), v.org, `${v.browser} / ${v.os} / ${v.device}`, v.path,
    v.refHost || '(direct)', v.lang, `${v.screen} @${v.dpr}x`, v.bot ? 'bot' : '', v.loadMs ? Math.round(v.loadMs) + ' ms' : '', v.visitor]);
  return `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Visits</title>
<style>body{font:14px system-ui,sans-serif;background:#0d1117;color:#e6edf3;margin:0;padding:20px;max-width:1200px;margin:auto}h1{font-size:20px}h2{font-size:13px;color:#8b949e;text-transform:uppercase;letter-spacing:.06em;margin:0 0 6px}
section{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px;margin:0 0 12px;overflow:auto}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px}
table{border-collapse:collapse;width:100%;font-size:13px}td,th{text-align:left;padding:3px 8px 3px 0;white-space:nowrap}th{color:#8b949e;font-weight:500}.dim{color:#8b949e}
.big{display:flex;gap:24px;flex-wrap:wrap}.big div{font-size:12px;color:#8b949e}.big b{display:block;font-size:26px;color:#e6edf3}
.bar{display:flex;align-items:center;gap:8px;font-size:12px;margin:2px 0}.bar span{width:80px;color:#8b949e}.bar i{height:10px;background:#58a6ff;border-radius:2px;display:block}.bar b{font-weight:500}a{color:#58a6ff}</style>
<h1>Visits, last ${days} days <span class="dim">(your own visits are not counted; bots are only counted in the total)</span></h1>
<p class="dim">Ranges: <a href="?days=7">7</a> · <a href="?days=30">30</a> · <a href="?days=90">90</a> · <a href="?days=180">180</a> days · <a href="visits.json?days=${days}">JSON</a></p>
<section class="big"><div><b>${t.n || 0}</b>views</div><div><b>${t.u || 0}</b>visitors (per day)</div><div><b>${t.today || 0}</b>last 24 h</div><div><b>${t.bots || 0}</b>bots</div><div><b>${t.load ? Math.round(t.load) + ' ms' : '-'}</b>avg load</div></section>
<section><h2>Per day (views / visitors)</h2>${bars || '<span class="dim">no data</span>'}</section>
<div class="grid">${table('Countries', rows(country))}${table('Cities', rows(city))}${table('Referrers', rows(refs))}${table('Pages', rows(pages))}${table('Campaigns (utm)', rows(utm))}
${table('Browsers', rows(browser))}${table('Systems', rows(os))}${table('Devices', rows(device))}${table('Languages', rows(lang))}${table('Network / provider', rows(org))}
${table('Screens', rows(screen))}${table('Colour scheme', rows(dark))}${table('Time zone of the browser', rows(tz))}${table('Connection', rows(conn))}${table('Hour of day (UTC)', rows(hours))}</div>
${table('Latest visits (Europe/Berlin)', visits, ['Time', 'Place', 'Provider', 'Browser / system / device', 'Page', 'Referrer', 'Language', 'Screen', '', 'Load', 'Visitor'])}`;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), path = url.pathname;
    const cors = { 'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' };
    const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    if (req.method === 'GET' && (path === '/visits' || path === '/visits.json')) {
      if (!env.DB || !(await authed(req, env))) {
        return new Response('Authentication required', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="visits", charset="UTF-8"', 'Cache-Control': 'no-store' } });
      }
      const days = Math.min(KEEP_DAYS, Math.max(1, Number(url.searchParams.get('days')) || 30));
      const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };
      if (path === '/visits.json') {
        await schema(env.DB);
        const { results } = await env.DB.prepare('SELECT * FROM visits WHERE ts > ? ORDER BY ts DESC LIMIT 2000').bind(Date.now() - days * 864e5).all();
        return new Response(JSON.stringify(results), { headers: { ...headers, 'Content-Type': 'application/json' } });
      }
      return new Response(await report(env, days), { headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (req.method === 'POST' && path === '/hit') {
      if (!env.DB || req.headers.get('Origin') !== env.ALLOWED_ORIGIN) return new Response(null, { status: 204, headers: cors });
      let b;
      try { b = JSON.parse((await req.text()).slice(0, 4000)); } catch { return reply({ error: 'bad request' }, 400); }
      if (!b || typeof b !== 'object') return reply({ error: 'bad request' }, 400);
      try { await record(req, env, b); } catch { /* statistics must never break the page */ }
      return new Response(null, { status: 204, headers: cors });
    }

    if (req.method !== 'POST' || path !== '/token') return reply({ error: 'not found' }, 404);
    if (req.headers.get('Origin') !== env.ALLOWED_ORIGIN) return reply({ error: 'forbidden' }, 403);
    let code;
    try { ({ code } = await req.json()); } catch { return reply({ error: 'bad request' }, 400); }
    if (typeof code !== 'string' || !/^[\w-]{8,64}$/.test(code)) return reply({ error: 'bad code' }, 400);
    const t = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'stats-login' },
      body: JSON.stringify({ client_id: env.CLIENT_ID, client_secret: env.CLIENT_SECRET, code }),
    }).then((r) => r.json()).catch(() => ({}));
    if (!t.access_token) return reply({ error: 'token exchange failed' }, 401);
    const u = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${t.access_token}`, 'User-Agent': 'stats-login', Accept: 'application/vnd.github+json' } }).then((r) => r.json()).catch(() => ({}));
    return u.login ? reply({ login: u.login }) : reply({ error: 'no user' }, 401);
  },
};
