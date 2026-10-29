// Regenerates the example images in docs/img from DEMO data (no token, no real data).
//   node tools/make-docs-images.mjs
// Needs Chrome or Edge for the screenshots (set CHROME=/path/to/chrome if it is not found).
import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const IMG = join(ROOT, 'docs/img');
const WORK = join(tmpdir(), 'ach-docs-demo');
const CHROME = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => p && existsSync(p));
if (!CHROME) { console.error('No Chrome/Edge found. Set CHROME=/path/to/chrome'); process.exit(1); }

rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });
mkdirSync(IMG, { recursive: true });

// 1. demo data + files, one run per theme for the stats card
const run = (dir, env = {}) => {
  mkdirSync(dir, { recursive: true });
  const r = spawnSync(process.execPath, [join(ROOT, 'run.mjs'), '--demo', '--out', dir], { stdio: 'inherit', env: { ...process.env, COMPONENTS: 'stats,achievements,dashboard,road', STATS_SEED: '7', ...env } });
  if (r.status !== 0) process.exit(r.status || 1);
};
const base = join(WORK, 'site');
run(base);
for (const theme of ['autumn', 'butterflies', 'rain', 'snow', 'sakura', 'night']) {
  const dir = join(WORK, theme);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'theme.json'), JSON.stringify({ overlays: [theme] }));
  run(dir);
  copyFileSync(join(dir, 'stats.svg'), join(IMG, `stats-${theme}.svg`));
}
copyFileSync(join(base, 'stats.svg'), join(IMG, 'stats-demo.svg'));
copyFileSync(join(base, 'achievements.svg'), join(IMG, 'achievements-demo.svg'));
copyFileSync(join(base, 'achievements-closest.svg'), join(IMG, 'achievements-closest-demo.svg'));

// 2. a small page that mounts one view of the achievements UI, for the screenshots
const state = { completed: JSON.parse(readFileSync(join(base, 'road.json'), 'utf8')).stations.slice(0, 4).map((s, i) => ({ id: s.id, proof: 'demo', date: `2027-01-${10 + i}` })) };
writeFileSync(join(base, 'shot.html'), `<!doctype html><meta charset="utf-8"><body style="margin:0;padding:18px;background:#0b0b0b;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#e6e6e6"><div id="r" style="max-width:1180px;margin:0 auto"></div>
<script>
const v = location.hash.slice(1) || 'highlights';
Promise.all(['achievements.json','road.json'].map((f) => fetch(f).then((r) => r.json()))).then(([j, road]) => {
  road.gate = 10; // the demo account has few levels, open the road for the picture
  const s = document.createElement('script'); s.src = 'achievements-ui.js';
  s.onload = () => { AchUI.mount(document.getElementById('r'), j, { view: v, road, roadState: ${JSON.stringify(state)} }); if (v === 'road') { const n = document.querySelectorAll('.ach-rnode'); n[n.length - 1] && n[n.length - 1].dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); } document.title = 'ready'; };
  document.head.appendChild(s);
});
</script>`);

// 3. serve the folder and take the screenshots
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const f = join(base, decodeURIComponent(new URL(req.url, 'http://x').pathname.replace(/^\//, '') || 'index.html'));
  if (!existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(readFileSync(f));
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const port = server.address().port;
const shot = (page, out, w, h) => new Promise((done) => {
  // own temporary profile, otherwise Chrome attaches to your running browser; the timeout stops a hanging run
  const child = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', `--user-data-dir=${join(WORK, 'chrome-profile')}`, '--hide-scrollbars', '--force-device-scale-factor=1', `--window-size=${w},${h}`, '--virtual-time-budget=9000', `--screenshot=${join(IMG, out)}`, `http://127.0.0.1:${port}/${page}`], { stdio: 'ignore' });
  const stop = setTimeout(() => child.kill('SIGKILL'), 60000);
  child.on('exit', () => { clearTimeout(stop); console.log(existsSync(join(IMG, out)) ? `docs/img/${out}` : `FAILED ${out}`); done(); });
});
// the "Theme & look" bar is owner-only: the wrapper page marks this browser as owner, loads the dashboard in a frame and opens the bar
writeFileSync(join(base, 'settings.html'), `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#0b0b0b">
<iframe id="f" style="border:0;width:1280px;height:600px"></iframe>
<script>
try { localStorage.setItem('tlOwner', '1'); } catch {}
const f = document.getElementById('f');
f.onload = () => setTimeout(() => { const b = f.contentDocument.getElementById('tlOpen'); if (b) b.click(); }, 1500);
f.src = 'index.html';
</script>`);
const only = process.env.ONLY; // ONLY=settings renders just the settings picture
if (!only || only === 'settings') await shot('settings.html', 'dashboard-settings.png', 1280, 600);
if (!only) {
  await shot('shot.html#highlights', 'achievements-highlights.png', 1220, 460);
  await shot('shot.html#all', 'achievements-all.png', 1220, 1500);
  await shot('shot.html#tree', 'achievements-tree.png', 1220, 820);
  await shot('shot.html#road', 'master-road.png', 1220, 1350);
  await shot('index.html', 'dashboard.png', 1280, 2150);
}
server.close();
