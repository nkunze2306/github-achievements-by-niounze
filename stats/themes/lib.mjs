// Gemeinsame Helfer für Theme-Module (reines JS, keine Node-Importe -> läuft auch im Browser der Website).
export const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const mix = (a, b, t) => '#' + hx(a).map((x, i) => Math.round(x + (hx(b)[i] - x) * t).toString(16).padStart(2, '0')).join('');

// Deterministischer Zufall: gleicher seed -> gleiches Bild (stats.svg ändert sich nur, wenn sich etwas ändert)
export function rng(seed) {
  let s = seed >>> 0;
  const r = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  r.range = (a, b) => a + r() * (b - a);
  r.int = (a, b) => Math.floor(a + r() * (b - a + 1));
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  return r;
}

export const f1 = (n) => String(Math.round(n * 2) / 2);
export const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

// 7-stufige Farbrampe aus einer Grundfarbe: [Kontur, dunkel, dunkel2, mittel, Basis, hell, Glanz]
export const ramp = (b) => [mix(b, '#040a28', 0.88), mix(b, '#0b1b52', 0.7), mix(b, '#0b1b52', 0.42), mix(b, '#0b1b52', 0.16), b, mix(b, '#ffffff', 0.5), mix(b, '#ffffff', 0.92)];

// Pixelraster -> zusammengefasste <path>-Läufe pro Farbe
export function runs(grid) {
  const by = new Map();
  grid.forEach((row, y) => row.forEach((c, x) => { if (c) { if (!by.has(c)) by.set(c, []); by.get(c).push([x, y]); } }));
  let out = '';
  for (const [c, pts] of by) {
    const rows = new Map();
    for (const [x, y] of pts) { if (!rows.has(y)) rows.set(y, []); rows.get(y).push(x); }
    let d = '';
    for (const y of [...rows.keys()].sort((a, b) => a - b)) {
      const xs = rows.get(y).sort((a, b) => a - b);
      for (let i = 0; i < xs.length;) { let j = i; while (j + 1 < xs.length && xs[j + 1] === xs[j] + 1) j++; d += `M${xs[i]} ${y}h${xs[j] - xs[i] + 1}v1h-${xs[j] - xs[i] + 1}z`; i = j + 1; }
    }
    out += `<path fill="${c}" d="${d}"/>`;
  }
  return out;
}
export const mk = (w, h) => Array.from({ length: h }, () => Array(w).fill(null));

// Schattierte Ellipse mit dunkler Kontur, Glanzkante oben links, Schatten unten rechts und Dithering
export function ell(g, R, cx, cy, rx, ry, idx, o = {}) {
  const H = g.length, W = g[0].length;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let dx = x + 0.5 - cx, dy = y + 0.5 - cy;
    if (o.rot) { const c = Math.cos(o.rot), s = Math.sin(o.rot); [dx, dy] = [dx * c + dy * s, -dx * s + dy * c]; }
    const r = Math.hypot(dx / rx, dy / ry);
    if (r > 1) continue;
    if (o.clip && !o.clip(x, y)) continue;
    const lit = -(dx / rx + dy / ry) / 2;
    const v = idx + lit * 1.5 - r * r * 0.9 + (BAYER[y & 3][x & 3] / 16 - 0.5) * 0.9;
    let col = R[Math.max(1, Math.min(5, Math.round(v)))];
    const edge = (1 - r) * Math.min(rx, ry);
    if (!o.noOutline && edge < 1.05) col = R[0];
    else if (!o.noHi && edge < 2.3 && lit > 0.35) col = R[6];
    else if (edge < 2.6 && lit < -0.45) col = R[Math.max(1, Math.round(idx) - 2)];
    g[y][x] = col;
  }
}

// Schlüsselzeiten relativ zur Schleifenlänge T
export const keyTimes = (T, a) => a.map((t) => Math.max(0, Math.min(1, t / T)).toFixed(3)).join(';');

// 4-zackiges Funkeln, das zu einer Zeit kurz aufblitzt
export function twinkle(T, x, y, t0, { size = 3, color = '#fff' } = {}) {
  return `<g transform="translate(${f1(x)} ${f1(y)})" opacity="0"><animate attributeName="opacity" dur="${T}s" repeatCount="indefinite" keyTimes="${keyTimes(T, [0, t0, t0 + 0.5, t0 + 1.3, T])}" values="0;0;1;0;0"/><path fill="${color}" d="M-.5 -${size + 0.5}h1v${size}h${size}v1h-${size}v${size}h-1v-${size}h-${size}v-1h${size}z"/></g>`;
}

// Weicher Pfad: n+1 Punkte von (x0,y0) nach (x0+dx, y0+dy) mit Pendeln (amp, freq)
export const drift = (x0, y0, dx, dy, n, amp, ph, fq) => Array.from({ length: n + 1 }, (_, k) => [x0 + (dx * k) / n + amp * Math.sin((2 * Math.PI * fq * k) / n + ph), y0 + (dy * k) / n + amp * 0.35 * Math.sin((4 * Math.PI * fq * k) / n + ph)]);

// Nur breite Kacheln bekommen Dekoration an Oberkante / Ecken
export const wideCards = (cards, min = 170) => cards.filter((c) => c.w >= min);
