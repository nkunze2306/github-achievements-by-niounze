// Schnee-Theme: Flocken in drei Tiefenebenen (Parallaxe), Schneehaufen wachsen auf den Kachel-Oberkanten,
// dünne Schneedecke entlang der Kanten, Eiszapfen an den Unterkanten, Funkeln. Am Ende jedes Durchlaufs fegt eine Böe die Haufen weg.
import { mix, rng, ramp, runs, mk, ell, f1, keyTimes, twinkle, wideCards } from './lib.mjs';

export const SNOW_DEFAULTS = { flakes: 60, piles: 2, wind: 40, sparkle: true, icicles: true, tint: '#dff1ff', loop: 60, seed: 5 };

// Flockensprites: Punkt, Kreuz, Stern (Pixelgrößen 1 / 5 / 7)
const FLAKES = {
  dot: [[0, 0]],
  plus: [[2, 0], [2, 1], [2, 3], [2, 4], [0, 2], [1, 2], [3, 2], [4, 2]],
  star: [[3, 0], [3, 1], [3, 2], [3, 4], [3, 5], [3, 6], [0, 3], [1, 3], [2, 3], [4, 3], [5, 3], [6, 3], [1, 1], [5, 5], [5, 1], [1, 5]],
};
function flakeSprite(kind, c) {
  const n = kind === 'dot' ? 1 : kind === 'plus' ? 5 : 7, g = mk(n, n);
  FLAKES[kind].forEach(([x, y]) => { g[y][x] = c; });
  if (kind !== 'dot') g[(n - 1) / 2][(n - 1) / 2] = '#ffffff';
  return `<g id="fl_${kind}"><g transform="translate(${-n / 2} ${-n / 2})">${runs(g)}</g></g>`;
}

// Ein Schneehaufen: 2-3 überlappende gedrungene Kuppeln, innen Dithering-Verlauf, helle Kante oben links, blaue Schatten rechts unten
function pileSprite(id, w, h, tint, R) {
  const g = mk(w, h), rp = ramp(mix(tint, '#8fb4e0', 0.35));
  rp[5] = mix(tint, '#ffffff', 0.5); rp[6] = '#ffffff'; rp[0] = mix(tint, '#2c3f66', 0.7);
  const domes = [[w * 0.5, h, w * 0.5, h * 0.98, 4.4]];
  if (w > 28) domes.push([w * 0.28, h, w * 0.3, h * 0.7, 4.0], [w * 0.74, h, w * 0.28, h * 0.62, 4.2]);
  domes.sort((a, b) => a[3] - b[3]).forEach(([cx, cy, rx, ry, idx]) => ell(g, rp, cx, cy, rx, ry, idx, { clip: (x, y) => y < h }));
  // Glitzerpixel
  for (let k = 0; k < Math.max(2, w / 8); k++) { const x = Math.floor(R() * w), y = Math.floor(h * (0.2 + R() * 0.6)); if (g[y][x]) g[y][x] = '#ffffff'; }
  return `<g id="${id}"><g transform="translate(${-w / 2} ${-h})">${runs(g)}</g></g>`;
}

// Eiszapfen: gestufte Spitze, hellblau mit weißem Glanz links
function icicleSprite(id, w, h) {
  const g = mk(w, h);
  for (let y = 0; y < h; y++) {
    const half = Math.max(0, (w / 2) * (1 - y / h)), cx = w / 2;
    for (let x = 0; x < w; x++) if (Math.abs(x + 0.5 - cx) <= half + 0.01) g[y][x] = x + 0.5 < cx - half * 0.3 ? '#f3fbff' : y > h * 0.7 ? '#7fb6e8' : '#b7defa';
  }
  g[0][0] = g[0][w - 1] = '#7fb6e8';
  return `<g id="${id}"><g transform="translate(${-w / 2} 0)">${runs(g)}</g></g>`;
}

export function snowLayer(W, H, cards, o = {}) {
  o = { ...SNOW_DEFAULTS, ...o };
  const R = rng(o.seed), T = o.loop, kt = (a) => keyTimes(T, a);
  const defs = [], body = [];
  const tint = o.tint;
  defs.push(flakeSprite('dot', tint), flakeSprite('plus', tint), flakeSprite('star', tint));

  // --- Flocken: drei Tiefenebenen. Fallhöhe = Bildhöhe, die Geschwindigkeit bleibt dabei gleich
  const scale = Math.min(3.2, H / 700), n = Math.min(160, Math.round(o.flakes * scale)), wind = o.wind / 100;
  const layers = [
    { id: 'dot', sc: 2, op: 0.55, dur: [26, 38], amp: [4, 9] },
    { id: 'plus', sc: 1.3, op: 0.8, dur: [16, 24], amp: [8, 16] },
    { id: 'star', sc: 1.7, op: 1, dur: [10, 15], amp: [12, 24] },
  ];
  let flakes = '';
  for (let i = 0; i < n; i++) {
    const layer = i % 7 === 0 ? layers[2] : i % 3 ? layers[0] : layers[1];
    const d = R.range(layer.dur[0], layer.dur[1]) * scale, sx = R.range(-40, W + 40), dx = 120 * wind * R.range(0.6, 1.4) - 20, amp = R.range(layer.amp[0], layer.amp[1]), ph = R.range(0, 6.3), st = 8;
    const pts = Array.from({ length: st + 1 }, (_, k) => [sx + (dx * k) / st + amp * Math.sin((k / st) * 9 + ph), -10 + ((H + 30) * k) / st]);
    const spin = layer.id === 'star' ? `<animateTransform attributeName="transform" type="rotate" dur="${R.range(5, 9).toFixed(1)}s" repeatCount="indefinite" values="0 0 0;360 0 0"/>` : '';
    flakes += `<g opacity="${layer.op}"><animateTransform attributeName="transform" type="translate" dur="${d.toFixed(1)}s" begin="-${R.range(0, d).toFixed(1)}s" repeatCount="indefinite" values="${pts.map(([x, y]) => `${f1(x)},${f1(y)}`).join(';')}"/><g transform="scale(${layer.sc})" shape-rendering="${layer.id === 'star' ? 'geometricPrecision' : 'crispEdges'}"><g>${spin}<use href="#fl_${layer.id}"/></g></g></g>`;
  }
  body.push(flakes);

  // --- Schneedecke, Haufen, Eiszapfen auf breiten Kacheln
  let cap = '', piles = '', ice = '', sp = '';
  wideCards(cards).forEach((c, ci) => {
    // dünne Schneedecke: Säulen mit unterschiedlicher Höhe (1-3 px), darunter 1px blauer Schatten
    const x0 = c.x + 14, x1 = c.x + c.w - 14; let d1 = '', d2 = '';
    for (let x = x0; x < x1; x += 2) { const h = 1 + Math.round(1.2 + 1.2 * Math.sin(x * 0.21 + ci) + R() * 0.8); d1 += `M${x} ${c.y - h + 1}h2v${h}h-2z`; d2 += `M${x} ${c.y + 1}h2v1h-2z`; }
    cap += `<path d="${d1}" fill="#ffffff"/><path d="${d2}" fill="${mix(tint, '#7fa6d8', 0.55)}" opacity=".7"/>`;
    // Haufen
    for (let k = 0; k < o.piles; k++) {
      const w = R.int(26, 58), h = R.int(8, 14), id = `pile${ci}_${k}`, x = c.x + c.w * (o.piles === 1 ? 0.5 : 0.18 + (0.64 * (k + R.range(0.1, 0.9))) / o.piles), y = c.y + 0.5;
      defs.push(pileSprite(id, w, h, tint, R));
      const grow = R.range(4, T - 28), gust = T - R.range(10, 14), gd = R.range(0.6, 1.4);
      piles += `<g transform="translate(${f1(x)} ${f1(y)})"><g><animateTransform attributeName="transform" type="scale" dur="${T}s" repeatCount="indefinite" calcMode="spline" keyTimes="${kt([0, grow, grow + 6, gust, gust + 0.1, T])}" keySplines="0 0 1 1;.3 .8 .4 1;0 0 1 1;0 0 1 1;0 0 1 1" values="1 0;1 0;1 1;1 1;1 0;1 0"/><g><animateTransform attributeName="transform" type="translate" dur="${T}s" repeatCount="indefinite" keyTimes="${kt([0, gust, gust + 3, T])}" values="0 0;0 0;${(R.range(120, 260) * (0.4 + wind)).toFixed(0)} ${R.range(-30, -8).toFixed(0)};0 0"/><use href="#${id}"/></g></g></g>`;
      if (o.sparkle) sp += twinkle(T, x + R.range(-w / 3, w / 3), y - h * R.range(0.4, 0.9), grow + 8 + R.range(0, 20), { size: R.int(2, 3) });
    }
    // Eiszapfen
    if (o.icicles) for (let k = 0; k < Math.round(c.w / 55); k++) {
      const w = R.int(3, 5), h = R.int(7, 20), id = `ice${ci}_${k}`, x = c.x + 24 + R() * (c.w - 48);
      defs.push(icicleSprite(id, w, h));
      ice += `<g transform="translate(${f1(x)} ${c.y + c.h - 1})"><use href="#${id}"/></g>`;
      if (o.sparkle && R() < 0.5) sp += twinkle(T, x - 1, c.y + c.h + h * 0.5, R.range(2, T - 4), { size: 2, color: '#e8f6ff' });
    }
  });
  body.push(cap, ice, piles, sp);
  return `<defs>${defs.join('')}</defs><g pointer-events="none" shape-rendering="crispEdges">${body.join('')}</g>`;
}
