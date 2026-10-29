// Rendert jedes Theme mit Demo-Daten nach previews/<id>.svg (zum schnellen Ansehen im Browser).
// Aufruf: node preview-themes.mjs [id ...]
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { THEMES } from './themes/index.mjs';
const only = process.argv.slice(2);
mkdirSync('previews', { recursive: true });
for (const t of THEMES.filter((x) => !only.length || only.includes(x.id))) {
  const cfg = `previews/.${t.id}.json`;
  writeFileSync(cfg, JSON.stringify({ overlays: [t.id] }));
  execFileSync('node', ['generate.mjs', '--demo'], { stdio: 'ignore', env: { ...process.env, STATS_THEME: cfg, STATS_OUT: `previews/${t.id}.svg`, STATS_JSON: 'previews/.stats.json' } });
  rmSync(cfg);
  console.log(`previews/${t.id}.svg`);
}
rmSync('previews/.stats.json', { force: true });
