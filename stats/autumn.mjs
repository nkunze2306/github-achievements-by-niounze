// Herbst-Theme: Pixel-Blätter fliegen über die Kacheln, landen auf deren Oberkante und bilden Haufen.
// Reine SMIL-Animation (läuft in <img> auf GitHub). Aufruf: autumnLayer(W, H, cards, opts) -> SVG-String
export const AUTUMN_DEFAULTS = { fliers: 10, piles: 2, pileLeaves: 8, loop: 80, wind: true, seed: 23 };

const PALS = [
  ['#e8c53a', '#f29a1f', '#e0562b', '#a82a22'],
  ['#f2d24b', '#f4b02a', '#ee7d1f', '#c2491b'],
  ['#c9b43a', '#e69a28', '#c9602a', '#8f2f1e'],
  ['#b8c04a', '#e3b436', '#d2782a', '#9c3a1c'],
  ['#d6a02e', '#b87b24', '#8a5a1f', '#5e3d17'],
  ['#f0b83a', '#e2662a', '#c0302a', '#7e1a2a'],
];
const KINDS = ['maple', 'oak', 'birch'];
const STEM = '#6b4220', N = 32, PX = 1.05, RIM = '#7a3416';
const BAY = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => '#' + hx(a).map((x, i) => Math.round(x + (hx(b)[i] - x) * t).toString(16).padStart(2, '0')).join('');
const angd = (a, b) => ((a - b + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;

function mulberry(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function inLeaf(kind, u, v) {
  if (kind === 'maple') {
    const dx = u, dy = v + 0.12, rho = Math.hypot(dx, dy), th = Math.atan2(dx, -dy);
    let r = 0.42;
    for (const [a, L] of [[0, 1.0], [0.9, 0.9], [-0.9, 0.9], [1.9, 0.72], [-1.9, 0.72]]) r = Math.max(r, L * Math.max(0, 1 - Math.abs(angd(th, a)) / 0.6) ** 0.65);
    if (rho > 0.4) r += 0.05 * Math.sin(th * 20);
    if (Math.abs(th) > 2.5) r = Math.min(r, 0.3);
    return rho <= r;
  }
  const t = (v + 0.95) / 1.55;
  if (t < 0 || t > 1) return false;
  const w = kind === 'oak'
    ? 0.66 * Math.sin(Math.PI * Math.min(1, t * 1.03)) ** 0.6 * (0.8 + 0.2 * Math.sin(t * Math.PI * 7 + 0.5))
    : 0.6 * Math.sin(Math.PI * t ** 0.7) ** 1.05 + 0.04 * Math.sin(t * 64);
  return Math.abs(u) <= w;
}
const inStem = (u, v, kind) => Math.abs(u) < 0.055 && (kind === 'maple' ? v > 0.3 : v > 0.58) && v < 0.98;

function leafPaths(kind, pal) {
  const cells = new Map();
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = (x + 0.5 - N / 2) / (N / 2), v = (y + 0.5 - N / 2) / (N / 2);
    if (inLeaf(kind, u, v)) cells.set(`${x},${y}`, ['b', u, v, x, y]);
    else if (inStem(u, v, kind)) cells.set(`${x},${y}`, ['s', u, v, x, y]);
  }
  const by = new Map();
  for (const [, [k, u, v, x, y]] of cells) {
    let col;
    if (k === 's') col = STEM;
    else {
      const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const c = cells.get(`${x + dx},${y + dy}`); return !c || c[0] === 's'; });
      const gp = Math.min(1, Math.max(0, (0.62 - v) / 1.5 + 0.1 * Math.sin(u * 5)));
      const idx = gp * (pal.length - 1) + (BAY[y & 3][x & 3] / 16 - 0.5) * 0.9;
      col = pal[Math.max(0, Math.min(pal.length - 1, Math.round(idx)))];
      if (u > 0.05) col = mix(col, '#000000', 0.14);
      let vein = Math.abs(u) < 0.045 && v < 0.55;
      for (const vk of [-0.5, -0.2, 0.1]) { const d = (vk - v) * 0.85; if (v < vk && Math.abs(Math.abs(u) - d) < 0.055 && d < 0.55) vein = true; }
      if (vein) col = mix(col, '#3a1608', 0.34);
      if (edge) col = RIM;
    }
    if (!by.has(col)) by.set(col, new Map());
    const rows = by.get(col); if (!rows.has(y)) rows.set(y, []); rows.get(y).push(x);
  }
  let out = '';
  for (const [col, rows] of by) {
    let d = '';
    for (const y of [...rows.keys()].sort((a, b) => a - b)) {
      const xs = rows.get(y).sort((a, b) => a - b);
      for (let i = 0; i < xs.length;) { let j = i; while (j + 1 < xs.length && xs[j + 1] === xs[j] + 1) j++; d += `M${xs[i]} ${y}h${xs[j] - xs[i] + 1}v1h-${xs[j] - xs[i] + 1}z`; i = j + 1; }
    }
    out += `<path fill="${col}" d="${d}"/>`;
  }
  return out;
}

export function autumnLayer(W, H, cards, o = {}) {
  o = { ...AUTUMN_DEFAULTS, ...o };
  const R = mulberry(o.seed), rr = (a, b) => a + R() * (b - a), ri = (a, b) => Math.floor(rr(a, b + 1));
  const T = o.loop, f = (n) => String(Math.round(n)), kt = (a) => a.map((t) => (t / T).toFixed(3)).join(';');
  const used = new Set(), sym = (k, ci) => { used.add(`${k}|${ci}`); return `#lf_${KINDS[k]}_${ci}`; };
  const tr = (vals, kts, dur = T, begin = 0) => `<animateTransform attributeName="transform" type="translate" dur="${dur}s" begin="${begin}s" repeatCount="indefinite" keyTimes="${kts}" values="${vals}"/>`;
  const drift = (x0, y0, dx, dy, steps, amp, ph, fq) => Array.from({ length: steps + 1 }, (_, k) => [x0 + (dx * k) / steps + amp * Math.sin((2 * Math.PI * fq * k) / steps + ph), y0 + (dy * k) / steps + amp * 0.35 * Math.sin((4 * Math.PI * fq * k) / steps + ph)]);
  const flyleaf = (use, tumble, rock) => `<g><animateTransform attributeName="transform" type="rotate" dur="${rock.toFixed(1)}s" repeatCount="indefinite" values="-45 0 0;45 0 0;-45 0 0"/><g><animateTransform attributeName="transform" type="scale" dur="${tumble.toFixed(1)}s" repeatCount="indefinite" values="1 1;0.32 1;1 1"/><use href="${use}"/></g></g>`;
  let out = '';

  // Blätter, die quer über das Bild wehen
  for (let i = 0; i < o.fliers; i++) {
    const k = ri(0, 2), ci = ri(0, PALS.length - 1), dur = rr(16, 28);
    const pts = drift(rr(-60, W * 0.8), -30, rr(180, 360), H + 80, 14, rr(18, 40), rr(0, 6.3), rr(1.5, 3)), n = pts.length;
    out += `<g class="mo" shape-rendering="geometricPrecision">${tr(pts.map(([x, y]) => `${f(x)},${f(y)}`).join(';'), pts.map((_, j) => (j / (n - 1)).toFixed(3)).join(';'), dur.toFixed(1), -rr(0, dur).toFixed(1))}${flyleaf(sym(k, ci), rr(1.6, 3), rr(3, 5))}</g>`;
  }

  // Lockerer Blätterteppich entlang der Oberkante breiter Kacheln: flach, mit Lücken, kleine Grüppchen statt Haufen
  const carpet = (c) => {
    const items = [], gap = 180 / Math.max(1, o.pileLeaves); // mittlerer Abstand, pileLeaves = Dichte
    for (let x = c.x + 18 + rr(0, gap); x < c.x + c.w - 18; ) {
      items.push({ x, y: c.y - 1.2 - rr(0, 3.2), rot: rr(-180, 180), k: ri(0, 2), ci: ri(0, PALS.length - 1), s: rr(0.55, 0.8) });
      x += R() < 0.22 ? rr(gap * 1.8, gap * 3.5) : rr(gap * 0.35, gap * 1.1); // ab und zu eine richtige Lücke
    }
    return items;
  };
  const landing = [], still = [];
  const wide = cards.filter((c) => c.w >= 170), step = Math.max(1, Math.ceil(wide.length / (o.maxPiles || 8)));
  if (o.piles > 0) for (const c of wide.filter((_, i) => i % step === 0)) {
    // knapp die Hälfte liegt schon (auch ohne Animation sichtbar), der Rest fällt im Lauf der Schleife dazu
    for (const l of carpet(c)) (R() < 0.45 ? still : landing).push(l);
  }
  landing.forEach((l, i, a) => { l.t = 6 + ((T - 26 - 6) * ((i * 7919) % a.length)) / Math.max(1, a.length - 1) + rr(-1.2, 1.2); });
  const sq = (l) => `scale(${l.s.toFixed(2)} ${(l.s * 0.55).toFixed(2)})`;
  // Grundbestand (auch sichtbar, wenn Animationen aus sind)
  for (const l of still) out += `<g transform="translate(${f(l.x)} ${f(l.y)}) ${sq(l)}" shape-rendering="geometricPrecision"><g transform="rotate(${l.rot.toFixed(0)})"><use href="${sym(l.k, l.ci)}"/></g></g>`;
  landing.sort((a, b) => b.y - a.y);
  for (const l of landing) {
    const fl = rr(8, 11), g = T - 9 + rr(0, 3.5);
    let s = Math.max(0.3, l.t + 10 - fl), ld = s + fl;
    if (ld > g - 1) { ld = g - 1; s = ld - fl; }
    const sx = l.x - rr(120, 240), sy = l.y - rr(170, 270);
    const pts = drift(sx, sy, l.x - sx, l.y - sy - 3, 9, rr(14, 26), rr(0, 6.3), rr(1.5, 2.5)), n = pts.length;
    const ks = [0, ...pts.map((_, i) => (s + (fl * i) / (n - 1)) / T), 1]; ks[1] = Math.max(ks[1], 0.001);
    const vals = [pts[0], ...pts, pts[n - 1]].map(([x, y]) => `${f(x)},${f(y)}`).join(';');
    const use = sym(l.k, l.ci);
    out += `<g class="mo" opacity="0" shape-rendering="geometricPrecision"><animate attributeName="opacity" calcMode="discrete" dur="${T}s" repeatCount="indefinite" keyTimes="${kt([0, s, ld])}" values="0;1;0"/><g>${tr(vals, ks.map((k) => k.toFixed(3)).join(';'))}${flyleaf(use, 2.2, 3.4)}</g></g>`;
    const dx = rr(300, 460), dy = -rr(20, 80), gt = g + rr(0, 1.5);
    const times = [0, ld, gt, gt + 3.2, T], p0 = `${f(l.x)},${f(l.y)}`, p1 = `${f(l.x + dx)},${f(l.y + dy)}`;
    const r0 = l.rot.toFixed(0), r1 = (l.rot + 230).toFixed(0);
    const live = o.wind ? `<g transform="${sq(l)}" shape-rendering="geometricPrecision"><g><animateTransform attributeName="transform" type="rotate" dur="${T}s" repeatCount="indefinite" keyTimes="${kt(times)}" values="${[r0, r0, r0, r1, r1].map((r) => r + ' 0 0').join(';')}"/><use href="${use}"/></g></g>` : `<g transform="${sq(l)} rotate(${r0})"><use href="${use}"/></g>`;
    const op = o.wind ? `<animate attributeName="opacity" dur="${T}s" repeatCount="indefinite" keyTimes="${kt([0, ld, gt + 0.4, gt + 3.0, T])}" values="0;1;1;0;0"/>` : `<animate attributeName="opacity" dur="${T}s" repeatCount="indefinite" keyTimes="${kt([0, ld, T])}" values="0;1;1"/>`;
    out += `<g class="mo" opacity="0">${op}<g>${tr(o.wind ? [p0, p0, p0, p1, p1].join(';') : [p0, p0, p0].join(';'), kt(o.wind ? times : [0, ld, T]))}${live}</g></g>`;
  }

  const defs = [...used].map((u) => { const [k, ci] = u.split('|'); return `<g id="lf_${KINDS[k]}_${ci}"><g transform="scale(${PX}) translate(-12 -12)">${leafPaths(KINDS[k], PALS[ci])}</g></g>`; }).join('');
  return `<defs>${defs}</defs><g pointer-events="none" shape-rendering="crispEdges">${out}</g>`;
}
