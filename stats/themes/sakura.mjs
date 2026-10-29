// Sakura-Theme: Kirschblütenzweige hängen von oben in das Bild, Blüten gehen nacheinander auf,
// Blütenblätter wehen quer über die Kacheln, einige landen auf den Oberkanten und bleiben bis zur Böe am Schleifenende liegen.
import { mix, rng, ramp, runs, mk, ell, f1, keyTimes, twinkle, drift, wideCards } from './lib.mjs';

export const SAKURA_DEFAULTS = { color: '#ff9ac8', branches: 2, blossoms: 70, petals: 28, landing: 4, sway: true, loop: 50, seed: 8 };

// Fünfblättrige Blüte mit eingekerbten Blütenblättern, gelben Staubgefäßen und dunkleren Adern
function blossomSprite(id, N, base, phase) {
  const g = mk(N, N), r = ramp(base), c = N / 2, pr = N * 0.2, d = N * 0.26;
  for (let k = 0; k < 5; k++) { const a = phase + (k * 2 * Math.PI) / 5; ell(g, r, c + Math.cos(a) * d, c + Math.sin(a) * d, pr, pr, 4.4, { noHi: k > 1 }); }
  for (let k = 0; k < 5; k++) { const a = phase + (k * 2 * Math.PI) / 5 + Math.PI / 5; const x = Math.round(c + Math.cos(a) * (d + pr * 0.9)), y = Math.round(c + Math.sin(a) * (d + pr * 0.9)); if (g[y] && g[y][x]) g[y][x] = null; } // Kerbe zwischen den Blättern
  for (let k = 0; k < 5; k++) { const a = phase + (k * 2 * Math.PI) / 5; for (let t = 0.2; t < 0.8; t += 0.2) { const x = Math.floor(c + Math.cos(a) * d * t * 1.3), y = Math.floor(c + Math.sin(a) * d * t * 1.3); if (g[y] && g[y][x]) g[y][x] = r[2]; } }
  const m = Math.floor(c);
  [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([x, y]) => { g[m + y][m + x] = '#ffd86b'; });
  g[m - 1][m] = '#c98a1c'; g[m + 2][m + 1] = '#c98a1c'; g[m][m - 1] = '#c98a1c';
  return `<g id="${id}"><g transform="translate(${-N / 2} ${-N / 2})">${runs(g)}</g></g>`;
}
// Knospe: kleine geschlossene Kugel
function budSprite(id, base) {
  const g = mk(7, 8), r = ramp(mix(base, '#b02a6a', 0.35));
  ell(g, r, 3.5, 4.2, 3, 3.6, 3.4);
  g[7][3] = '#5a3a1c';
  return `<g id="${id}"><g transform="translate(-3.5 -4)">${runs(g)}</g></g>`;
}
// Einzelnes Blütenblatt mit Kerbe oben
function petalSprite(id, base) {
  const r = ramp(base), rows = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '.XXXXX.', '..XXX..', '...X...'], g = mk(7, 7);
  rows.forEach((row, y) => [...row].forEach((k, x) => { if (k === 'X') g[y][x] = y < 2 ? r[5] : y > 4 ? r[2] : x < 3 ? r[5] : r[4]; }));
  return `<g id="${id}"><g transform="translate(-3.5 -3.5)">${runs(g)}</g></g>`;
}

// Zweig als Polylinie mit Kontur, Körper und Glanzkante; nach hinten dünner
function branchPath(pts, w0) {
  let s = '';
  for (let i = 1; i < pts.length; i++) {
    const w = Math.max(2.2, w0 * (1 - (i - 1) / pts.length));
    const seg = `M${f1(pts[i - 1][0])} ${f1(pts[i - 1][1])}L${f1(pts[i][0])} ${f1(pts[i][1])}`;
    s += `<path d="${seg}" stroke="#241208" stroke-width="${(w + 3).toFixed(1)}" stroke-linecap="round" fill="none"/><path d="${seg}" stroke="#6b4220" stroke-width="${w.toFixed(1)}" stroke-linecap="round" fill="none"/><path d="${seg}" stroke="#a8743a" stroke-width="${Math.max(1, w * 0.28).toFixed(1)}" stroke-linecap="round" fill="none" transform="translate(${-w * 0.2} ${-w * 0.2})"/>`;
  }
  return s;
}

export function sakuraLayer(W, H, cards, o = {}) {
  o = { ...SAKURA_DEFAULTS, ...o };
  const R = rng(o.seed), T = o.loop, kt = (a) => keyTimes(T, a);
  const defs = [], g = [];
  const light = mix(o.color, '#ffffff', 0.45);
  const sizes = [13, 17, 21];
  sizes.forEach((N, i) => { defs.push(blossomSprite(`sb${i}`, N, o.color, 0.3 + i), blossomSprite(`sl${i}`, N, light, 1.1 + i)); });
  defs.push(budSprite('sbud', o.color), petalSprite('sp0', o.color), petalSprite('sp1', light));

  // --- Zweige (links oben, rechts oben); Blüten sitzen entlang der Äste und Zweiglein
  const defsB = [
    { pts: [[-12, 70], [40, 66], [95, 71], [150, 64], [200, 68]], twigs: [[1, 16, -50], [2, 18, 40], [3, 18, -45], [4, 16, 40]], w: 7, origin: [-12, 70] },
    { pts: [[W + 12, 68], [W - 40, 72], [W - 95, 66], [W - 150, 70]], twigs: [[1, 16, 40], [2, 18, -50], [3, 16, 40]], w: 7, origin: [W + 12, 68] },
  ].slice(0, o.branches);
  defsB.forEach((b, bi) => {
    let wood = branchPath(b.pts, b.w), blooms = '';
    const pts = b.pts.slice(), anchors = [];
    b.twigs.forEach(([i, len, ang]) => {
      const [x, y] = pts[i], a = (ang * Math.PI) / 180, tip = [x + Math.sin(a) * len * 0.9, y - Math.cos(a) * len * 0.7 + (len > 0 ? len * 0.5 : 0)];
      const mid = [(x + tip[0]) / 2 + R.range(-4, 4), (y + tip[1]) / 2 + R.range(-3, 3)];
      wood += branchPath([[x, y], mid, tip], 4.6);
      anchors.push(tip, mid);
    });
    pts.forEach((p) => anchors.push(p));
    const want = Math.round((anchors.length * 3 * o.blossoms) / 100);
    for (let k = 0; k < want; k++) {
      const [ax, ay] = anchors[k % anchors.length], x = ax + R.range(-14, 14), y = ay + R.range(-10, 16), tg = 1.5 + bi * 0.8 + (k / want) * 7 + R.range(0, 0.6);
      const si = R() < 0.25 ? 2 : R() < 0.55 ? 1 : 0, id = R() < 0.3 ? `sl${si}` : `sb${si}`;
      const bud = R() < 0.14;
      blooms += `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${R.int(0, 359)})"><g><animateTransform attributeName="transform" type="scale" dur="${T}s" repeatCount="indefinite" calcMode="spline" keyTimes="${kt([0, tg, tg + 1.4, T - 5, T - 1, T])}" keySplines="0 0 1 1;.2 1.5 .4 1;0 0 1 1;.6 0 1 1;0 0 1 1" values="0;0;1;1;0;0"/><g shape-rendering="geometricPrecision"><use href="#${bud ? 'sbud' : id}"/></g></g></g>`;
      if (R() < 0.16) blooms += twinkle(T, x + R.range(-4, 4), y - 6, tg + 5 + R.range(0, 20), { size: 2, color: '#fff3f8' });
    }
    const sway = o.sway ? `<animateTransform attributeName="transform" type="rotate" dur="${R.range(7, 10).toFixed(1)}s" repeatCount="indefinite" values="-0.8 ${b.origin[0]} ${b.origin[1]};0.8 ${b.origin[0]} ${b.origin[1]};-0.8 ${b.origin[0]} ${b.origin[1]}"/>` : '';
    g.push(`<g>${sway}${wood}${blooms}</g>`);
  });

  // --- Blütenblätter im Wind
  let fly = '';
  const nP = Math.min(90, Math.round((o.petals * Math.min(3, H / 700))));
  for (let i = 0; i < nP; i++) {
    const d = R.range(10, 20) * Math.min(3, H / 700), sx = R.range(-40, W), dx = R.range(90, 220), pts = drift(sx, -12, dx, H + 24, 14, R.range(18, 44), R.range(0, 6.3), R.range(1.2, 2.6));
    fly += `<g><animateTransform attributeName="transform" type="translate" dur="${d.toFixed(1)}s" begin="-${R.range(0, d).toFixed(1)}s" repeatCount="indefinite" values="${pts.map(([x, y]) => `${f1(x)},${f1(y)}`).join(';')}"/><g><animateTransform attributeName="transform" type="rotate" dur="${R.range(2, 4.5).toFixed(1)}s" repeatCount="indefinite" values="-70 0 0;70 0 0;-70 0 0"/><g><animateTransform attributeName="transform" type="scale" dur="${R.range(1.6, 3).toFixed(1)}s" repeatCount="indefinite" values="1 1;1 .35;1 1"/><g transform="scale(${R.range(1.2, 1.9).toFixed(2)})" shape-rendering="geometricPrecision"><use href="#sp${i % 2}"/></g></g></g></g>`;
  }
  g.push(fly);

  // --- Landende Blütenblätter auf den Oberkanten: fliegen an, bleiben liegen, werden am Ende von einer Böe fortgetragen
  let land = '';
  wideCards(cards).forEach((c) => {
    for (let k = 0; k < o.landing; k++) {
      const tx = c.x + R.range(24, c.w - 24), ty = c.y - R.range(0.5, 3), fl = R.range(7, 11), ld = R.range(6 + fl, T - 20), s = ld - fl, gust = T - R.range(7, 10) + R.range(0, 2), rot = R.int(-40, 40) + (R() < 0.5 ? 180 : 0);
      const sx = tx - R.range(100, 220), sy = ty - R.range(150, 260), pts = drift(sx, sy, tx - sx, ty - sy, 9, R.range(12, 24), R.range(0, 6.3), R.range(1.5, 2.2)), n = pts.length;
      const ks = [0, ...pts.map((_, i) => s + (fl * i) / (n - 1)), T].map((t) => t), vals = [pts[0], ...pts, pts[n - 1]].map(([x, y]) => `${f1(x)},${f1(y)}`).join(';');
      const id = `sp${k % 2}`;
      land += `<g opacity="0"><animate attributeName="opacity" calcMode="discrete" dur="${T}s" repeatCount="indefinite" keyTimes="${kt([0, s, ld])}" values="0;1;0"/><g><animateTransform attributeName="transform" type="translate" dur="${T}s" repeatCount="indefinite" keyTimes="${ks.map((t) => Math.min(1, t / T).toFixed(3)).join(';')}" values="${vals}"/><g><animateTransform attributeName="transform" type="rotate" dur="2.6s" repeatCount="indefinite" values="-60 0 0;60 0 0;-60 0 0"/><g transform="scale(1.7)" shape-rendering="geometricPrecision"><use href="#${id}"/></g></g></g></g>`;
      const dxg = R.range(260, 420), gt = gust + R.range(0, 1.2);
      land += `<g opacity="0"><animate attributeName="opacity" dur="${T}s" repeatCount="indefinite" keyTimes="${kt([0, ld, gt + 0.3, gt + 2.8, T])}" values="0;1;1;0;0"/><g><animateTransform attributeName="transform" type="translate" dur="${T}s" repeatCount="indefinite" keyTimes="${kt([0, ld, gt, gt + 3, T])}" values="${[`${f1(tx)},${f1(ty)}`, `${f1(tx)},${f1(ty)}`, `${f1(tx)},${f1(ty)}`, `${f1(tx + dxg)},${f1(ty - R.range(20, 70))}`, `${f1(tx + dxg)},${f1(ty - 50)}`].join(';')}"/><g transform="scale(1.7 ${(1.7 * 0.45).toFixed(2)}) rotate(${rot})" shape-rendering="geometricPrecision"><use href="#${id}"/></g></g></g>`;
    }
  });
  g.push(land);
  return `<defs>${defs.join('')}</defs><g pointer-events="none" shape-rendering="crispEdges">${g.join('')}</g>`;
}
