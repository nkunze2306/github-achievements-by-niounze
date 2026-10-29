// Läuft LOKAL (nicht in der Action): liest die Claude-Code-Protokolle in ~/.claude/projects und speichert
// nur Zahlen (Token pro Tag, Gerät und Modell) in tokens.json. Inhalte der Gespräche werden nie gelesen oder gespeichert.
// Claude Code löscht alte Protokolle automatisch, deshalb wird über die Zeit aufsummiert.
//
// Mehrere Geräte: das Skript auf jedem Gerät mit einem eigenen Namen laufen lassen, die Seite addiert alle.
//
// Nutzung:  node track-tokens.mjs                          (nur tokens.json aktualisieren)
//           node track-tokens.mjs --push                   (zusätzlich committen und pushen)
//           node track-tokens.mjs --push --device laptop   (Gerätename festlegen, sonst: pc-<Kürzel des Rechnernamens>)
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir, hostname } from 'node:os';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.CLAUDE_PROJECTS_DIR || join(homedir(), '.claude', 'projects');
const FILE = process.env.TOKENS_FILE || join(HERE, 'tokens.json');
const TZ = process.env.STATS_TZ || 'Europe/Berlin';
const args = process.argv.slice(2);
const argVal = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
// Standard: kurzes Kürzel statt Rechnername, damit nichts Persönliches im öffentlichen Repo steht
const DEVICE = (argVal('--device') || process.env.CLAUDE_DEVICE || `pc-${createHash('sha1').update(hostname()).digest('hex').slice(0, 4)}`).replace(/[^\w.-]/g, '-');
const PUSH = args.includes('--push');
const dayOf = new Intl.DateTimeFormat('en-CA', { timeZone: TZ });
const git = (...a) => execFileSync('git', a, { cwd: HERE, stdio: 'pipe' }).toString();

// Erst aktuellen Stand holen (andere Geräte pushen in dieselbe Datei)
if (PUSH) git('pull', '--rebase', '--autostash');

const files = [];
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (p.endsWith('.jsonl')) files.push(p);
  }
})(ROOT);

// pro Tag und Modell: i = input, o = output, cw = cache write, cr = cache read, n = Antworten
const scan = {};
const seen = new Set();
for (const f of files) {
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    let o;
    try { o = JSON.parse(line); } catch { continue; }
    const u = o.message?.usage;
    if (o.type !== 'assistant' || !u || !o.timestamp) continue;
    const key = `${o.message.id || ''}:${o.requestId || ''}`; // Streaming schreibt dieselbe Antwort mehrfach
    if (key !== ':') { if (seen.has(key)) continue; seen.add(key); }
    const day = dayOf.format(new Date(o.timestamp));
    const m = (scan[day] ||= {})[o.message.model || 'unknown'] ||= { i: 0, o: 0, cw: 0, cr: 0, n: 0 };
    m.i += u.input_tokens || 0;
    m.o += u.output_tokens || 0;
    m.cw += u.cache_creation_input_tokens || 0;
    m.cr += u.cache_read_input_tokens || 0;
    m.n++;
  }
}

// Bestand lesen; altes Format (Tag -> Modell) dem Gerät dieses Rechners zuordnen
const before = existsSync(FILE) ? readFileSync(FILE, 'utf8') : '';
const hist = before ? JSON.parse(before) : { days: {} };
for (const [day, entry] of Object.entries(hist.days)) {
  if (Object.values(entry).some((v) => typeof v.i === 'number')) hist.days[day] = { [DEVICE]: entry };
}

// Zusammenführen: pro Feld gewinnt der größere Wert (gelöschte Protokolle dürfen nichts abziehen)
for (const [day, models] of Object.entries(scan)) {
  for (const [model, v] of Object.entries(models)) {
    const cur = (((hist.days[day] ||= {})[DEVICE] ||= {})[model] ||= { i: 0, o: 0, cw: 0, cr: 0, n: 0 });
    for (const k of Object.keys(v)) cur[k] = Math.max(cur[k] || 0, v[k]);
  }
}
const out = JSON.stringify({ days: hist.days });
if (out !== before) writeFileSync(FILE, out);

let total = 0;
const devices = new Set();
for (const day of Object.values(hist.days)) for (const [dev, models] of Object.entries(day)) { devices.add(dev); for (const v of Object.values(models)) total += v.i + v.o + v.cw + v.cr; }
console.log(`Gerät "${DEVICE}": ${files.length} Protokolle, ${Object.keys(hist.days).length} Tage; alle Geräte (${[...devices].join(', ')}): ${total.toLocaleString('de-DE')} Token`);

if (PUSH && out !== before) {
  git('add', 'tokens.json');
  git('commit', '-m', `chore: update token usage (${DEVICE})`);
  git('push');
  console.log('gepusht');
}
