// Rosen-Theme (Pixel-Art): dichte Rosen-Cluster in den Ecken der Kacheln (links oben / rechts unten),
// die Blüten liegen aneinander, dahinter schauen wenige Blätter hervor. Farbe wählbar (Hex), optional Silberanteil.
// Reine SMIL-Animation (läuft in <img> auf GitHub).
export const ROSES_DEFAULTS = { color: '#7db8ff', silver: 0.35, density: 1, vine: '#1d4f6e', loop: 40, seed: 11 };

const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => '#' + hx(a).map((x, i) => Math.round(x + (hx(b)[i] - x) * t).toString(16).padStart(2, '0')).join('');
function mulberry(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const SIZES = [34, 44]; // Pixel pro Seite (1:1 dargestellt)

function runs(by) {
  let out = '';
  for (const [c, pts] of by) {
    const rows = new Map(); for (const [x, y] of pts) { if (!rows.has(y)) rows.set(y, []); rows.get(y).push(x); }
    let d = '';
    for (const y of [...rows.keys()].sort((a, b) => a - b)) {
      const xs = rows.get(y).sort((a, b) => a - b);
      for (let i = 0; i < xs.length;) { let j = i; while (j + 1 < xs.length && xs[j + 1] === xs[j] + 1) j++; d += `M${xs[i]} ${y}h${xs[j] - xs[i] + 1}v1h-${xs[j] - xs[i] + 1}z`; i = j + 1; }
    }
    out += `<path fill="${c}" d="${d}"/>`;
  }
  return out;
}

// Pixel-Rose von oben (1:1-Pixel, fein): überlappende Blütenblätter im Goldenen Winkel, je Blatt Farbverlauf mit Dithering,
// dunkle Kontur, Glanzkante oben links, Schatten unten rechts, Spirale im Herz
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
export function rosePixels(base, phase, N) {
  const O = mix(base, '#040a28', 0.88), D1 = mix(base, '#0b1b52', 0.7), D2 = mix(base, '#0b1b52', 0.42), M = mix(base, '#0b1b52', 0.16), B = base, L = mix(base, '#ffffff', 0.5), H = mix(base, '#ffffff', 0.92);
  const ramp = [O, D1, D2, M, B, L, H], K = N >= 40 ? 15 : 12;
  const grid = Array.from({ length: N }, () => Array(N).fill(null)), c = N / 2;
  for (let k = 0; k < K; k++) {
    const t = k / (K - 1), rad = (0.3 - 0.19 * t) * N, d = 0.21 * (1 - t) ** 1.15 * N, a = phase + k * 2.39996, cx = c + Math.cos(a) * d, cy = c + Math.sin(a) * d;
    const baseIdx = 1.6 + t * 3.4;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.hypot(dx, dy);
      if (r > rad) continue;
      const lit = -(dx + dy) / (2 * rad);                                  // +1 oben links, -1 unten rechts
      const cup = (r / rad) ** 2;                                          // Rand dunkler, Mitte heller
      let v = baseIdx + lit * 1.5 - cup * 0.9 + (BAYER[y & 3][x & 3] / 16 - 0.5) * 0.9;
      let col = ramp[Math.max(1, Math.min(5, Math.round(v)))];
      if (r > rad - 1.1) col = O;
      else if (r > rad - 2.3 && lit > 0.35 && k > 1) col = H;
      else if (r > rad - 2.6 && lit < -0.45) col = ramp[Math.max(1, Math.round(baseIdx) - 2)];
      grid[y][x] = col;
    }
  }
  // Herz: kleine Spirale
  const m = Math.floor(N / 2), sp = [[0, 0], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1], [2, -1], [2, 0], [2, 1], [2, 2]];
  sp.slice(0, N >= 40 ? 13 : 9).forEach(([dx, dy]) => { grid[m + dy][m + dx] = O; });
  // Blüte im Raster zentrieren
  let x0 = N, x1 = -1, y0 = N, y1 = -1;
  grid.forEach((row, y) => row.forEach((v, x) => { if (v) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }));
  const sx = Math.round(N / 2 - (x0 + x1 + 1) / 2), sy = Math.round(N / 2 - (y0 + y1 + 1) / 2), by = new Map();
  grid.forEach((row, y) => row.forEach((v, x) => { if (v && x + sx >= 0 && y + sy >= 0) { if (!by.has(v)) by.set(v, []); by.get(v).push([x + sx, y + sy]); } }));
  return runs(by);
}

// Pixel-Blatt (zeigt nach rechts), dunkles Blaugrün mit heller Mittelrippe
const LEAF = ['....OOOO......', '..OOLLLLOOO...', 'OOLLLLLLLLLOO.', 'OLVVVVVVVVVVVO', 'OODDDDDDDDDOO.', '..OODDDDOOO...', '....OOOO......'];
function leafPixels(c) {
  const O = mix(c, '#02091a', 0.75), L = mix(c, '#55b8c4', 0.18), D = mix(c, '#06182c', 0.2), V = mix(c, '#b2f0ec', 0.55);
  const m = { O, L, D, V }, by = new Map();
  LEAF.forEach((row, y) => [...row].forEach((k, x) => { if (m[k]) { if (!by.has(m[k])) by.set(m[k], []); by.get(m[k]).push([x, y]); } }));
  return runs(by);
}

export function rosesLayer(W, H, cards, o = {}) {
  o = { ...ROSES_DEFAULTS, ...o };
  const R = mulberry(o.seed), rr = (a, b) => a + R() * (b - a), ri = (a, b) => Math.floor(rr(a, b + 1));
  const T = o.loop, Tg = T - 6, fx = (n) => String(Math.round(n * 2) / 2), kt = (a) => a.map((t) => (t / T).toFixed(3)).join(';');
  const palettes = [o.color, mix(o.color, '#ffffff', 0.14), mix('#d3dbe6', o.color, 0.12), mix(o.color, '#2a4a9a', 0.14)];
  const defs = SIZES.map((N, si) => palettes.map((c, i) => `<g id="rs${si}_${i}"><g transform="translate(-${N / 2} -${N / 2})">${rosePixels(c, i * 1.9 + 0.4, N)}</g></g>`).join('')).join('') + `<g id="lf"><g transform="translate(-4 -3.5)">${leafPixels(o.vine)}</g></g>`;
  let leaves = '', roses = '', glints = '';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  cards.forEach((c, ci) => {
    const delay = ci * 0.5;
    // Ecken: links oben (Richtung rechts/unten) und rechts unten (Richtung links/oben)
    [{ ax: c.x - 3, ay: c.y - 3, dx: 1, dy: 1 }, { ax: c.x + c.w + 3, ay: c.y + c.h + 3, dx: -1, dy: -1 }].forEach((k, cn) => {
      const spots = [];
      const big = 22;
      spots.push({ x: k.ax, y: k.ay, r: big, tt: 0 });
      // entlang beider Kanten, Blüten berühren sich
      const arms = Math.max(1, Math.min(5, Math.round(o.density * 3)));
      [[1, 0], [0, 1]].forEach(([ux, uy]) => {
        let prev = big, d = big * 0.75;
        for (let j = 0; j < arms; j++) {
          const r = 17, px = k.ax + k.dx * ux * d, py = k.ay + k.dy * uy * d;
          if (d > 130) break;
          spots.push({ x: px + rr(-1.5, 1.5), y: py + rr(-1.5, 1.5), r, tt: (j + 1) / (arms + 1) });
          d += (prev + r) * 0.66; prev = r;
        }
      });
      // zweite Reihe nach außen/innen: zwei Blüten dicht an der Eckblüte
      spots.push({ x: k.ax - k.dx * big * 0.7, y: k.ay - k.dy * big * 0.7, r: 17, tt: 0.15 });
      spots.forEach((s) => { s.x = clamp(s.x, s.r * 0.5, W - s.r * 0.5); s.y = Math.max(s.y, s.r * 0.6); });
      // wenige Blätter hinter den Blüten, Spitzen schauen heraus (nach außen und entlang der Kanten)
      const lc = ri(2, 3);
      for (let j = 0; j < lc; j++) {
        const host = spots[ri(0, Math.min(spots.length - 1, 4))], ang = Math.atan2(-k.dy, -k.dx) + rr(-1.5, 1.5) + (j % 2 ? 1 : -1) * 0.4, len = host.r * rr(1.25, 1.55);
        const lx = host.x + Math.cos(ang) * len * 0.62, ly = host.y + Math.sin(ang) * len * 0.62, tl = delay + 1 + rr(0, 2.5);
        leaves += `<g transform="translate(${fx(lx)} ${fx(ly)}) rotate(${((ang * 180) / Math.PI).toFixed(0)}) scale(1.6)" opacity="0"><animate attributeName="opacity" dur="${T}s" repeatCount="indefinite" keyTimes="${kt([0, tl, tl + 0.6, Tg + 3, T])}" values="0;0;1;1;0"/><use href="#lf"/></g>`;
      }
      // außen zuerst, innen (groß) zuletzt
      spots.sort((p, q) => q.tt - p.tt);
      spots.forEach((s) => {
        const tg = delay + 2 + (cn ? 0.8 : 0) + (1 - s.tt) * 3 + R() * 0.4, v = R() < o.silver ? 2 : [0, 1, 3][ri(0, 2)], si = s.r > 19 ? 1 : 0;
        roses += `<g transform="translate(${fx(s.x)} ${fx(s.y)})"><g><animateTransform attributeName="transform" type="scale" dur="${T}s" repeatCount="indefinite" calcMode="spline" keyTimes="${kt([0, tg, tg + 1.3, Tg + 1, Tg + 3, T])}" keySplines="0 0 1 1;.2 1.5 .4 1;0 0 1 1;.6 0 1 1;0 0 1 1" values="0;0;1;1;0;0"/><g shape-rendering="crispEdges"><use href="#rs${si}_${v}"/></g></g></g>`;
        if (R() < 0.45) { const tw = tg + 4 + R() * 18; glints += `<g transform="translate(${fx(s.x - s.r * 0.35)} ${fx(s.y - s.r * 0.4)})" opacity="0"><animate attributeName="opacity" dur="${T}s" repeatCount="indefinite" keyTimes="${kt([0, tw, tw + 0.5, tw + 1.3, T])}" values="0;0;1;0;0"/><path fill="#fff" d="M-.5 -3.5h1v3h3v1h-3v3h-1v-3h-3v-1h3z" shape-rendering="crispEdges"/></g>`; }
      });
    });
  });
  return `<defs>${defs}</defs><g pointer-events="none" shape-rendering="crispEdges">${leaves}${roses}${glints}</g>`;
}
