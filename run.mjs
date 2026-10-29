// Runs the components you selected, in the right order. Used by action.yml, also works locally:
//   COMPONENTS=stats,achievements,dashboard,road STATS_TOKEN=... STATS_LOGIN=you node run.mjs --out out
//   node run.mjs --demo --out out        (sample data, no token)
//
// Components:
//   achievements  achievements.svg, achievements-all.svg, achievements-closest.svg, achievements.json, achievements.html
//   stats         stats.svg + stats.json (the stats card, shows the achievements highlights too when achievements.json exists)
//   dashboard     index.html + font: the interactive website (stats, achievements, tree, Master Road, theme bar)
//   road          seeds road.json + road-state.json (Master Road) once, never overwrites your progress
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const DEMO = process.argv.includes('--demo'); // sample data, no token needed
const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : def; };
const OUT = arg('out', process.env.ACH_OUT || '.');
const ORDER = ['achievements', 'stats', 'dashboard', 'road'];
const asked = (process.env.COMPONENTS || 'stats,achievements').split(/[\s,]+/).map((c) => c.trim().toLowerCase()).filter(Boolean);
const unknown = asked.filter((c) => !ORDER.includes(c));
if (unknown.length) { console.error(`Unknown component(s): ${unknown.join(', ')}. Choose from: ${ORDER.join(', ')}`); process.exit(1); }
const wanted = ORDER.filter((c) => asked.includes(c));
if (!wanted.length) { console.error('No components selected'); process.exit(1); }
mkdirSync(OUT, { recursive: true });
process.env.LINES_CACHE = process.env.LINES_CACHE || join(OUT, 'lines-cache.json'); // answers of the line filter, see lines.mjs
console.log(`Components: ${wanted.join(', ')} -> ${OUT}`);

const node = (script, args = [], env = {}) => {
  const r = spawnSync(process.execPath, [join(HERE, script), ...args], { stdio: 'inherit', env: { ...process.env, ...env } });
  if (r.status !== 0) { console.error(`${script} failed (exit ${r.status})`); process.exit(r.status || 1); }
};

for (const c of wanted) {
  console.log(`\n== ${c}`);
  if (c === 'achievements') node('achievements.mjs', ['--out', OUT, ...(DEMO ? ['--demo'] : [])]);
  if (c === 'stats') node('stats/generate.mjs', DEMO ? ['--demo'] : [], { STATS_DIR: OUT });
  if (c === 'dashboard') {
    // The page is copied on every run so it stays up to date. The optional owner login (OAuth) is filled in from the environment.
    let html = readFileSync(join(HERE, 'site/index.html'), 'utf8');
    const auth = { clientId: process.env.DASHBOARD_AUTH_CLIENT_ID || '', worker: process.env.DASHBOARD_AUTH_WORKER || '' };
    const before = html;
    html = html.replace(/const AUTH = \{[^}]*\};/, () => `const AUTH = ${JSON.stringify(auth)};`);
    if (html === before && (auth.clientId || auth.worker)) console.warn('dashboard: AUTH line not found in site/index.html');
    writeFileSync(join(OUT, 'index.html'), html);
    mkdirSync(join(OUT, 'assets'), { recursive: true });
    copyFileSync(join(HERE, 'stats/assets/space-grotesk.woff2'), join(OUT, 'assets/space-grotesk.woff2'));
    // the theme bar of the page imports the validation and the theme registry next to index.html
    copyFileSync(join(HERE, 'stats/theme.mjs'), join(OUT, 'theme.mjs'));
    mkdirSync(join(OUT, 'themes'), { recursive: true });
    for (const f of readdirSync(join(HERE, 'stats/themes'))) if (f.endsWith('.mjs')) copyFileSync(join(HERE, 'stats/themes', f), join(OUT, 'themes', f));
    for (const f of ['stats.json', 'achievements.json']) if (!existsSync(join(OUT, f))) console.warn(`dashboard: ${f} is missing, enable the matching component (${f.startsWith('stats') ? 'stats' : 'achievements'})`);
    console.log('wrote index.html, assets/space-grotesk.woff2, theme.mjs, themes/');
  }
  if (c === 'road') {
    if (!existsSync(join(OUT, 'road.json'))) { copyFileSync(join(HERE, 'site/road.default.json'), join(OUT, 'road.json')); console.log('seeded road.json'); }
    if (!existsSync(join(OUT, 'road-state.json'))) { writeFileSync(join(OUT, 'road-state.json'), '{\n  "completed": []\n}\n'); console.log('seeded road-state.json'); }
    if (!wanted.includes('dashboard')) console.warn('road: the Master Road is shown by the dashboard component');
  }
}
console.log('\nDone.');
