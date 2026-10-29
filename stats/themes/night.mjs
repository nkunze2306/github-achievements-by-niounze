// Nacht-Theme: abgedunkeltes Bild, Sterne am Rand, Glühwürmchen (frei schwebend und auf den Kachelkanten sitzend),
// optional leuchtende Pixel-Rosen in den Ecken mit pulsierendem Schein.
import { mix, rng, f1, keyTimes, twinkle, wideCards } from './lib.mjs';
import { rosePixels } from './roses.mjs';

export const NIGHT_DEFAULTS = { dark: 28, fireflies: 28, stars: 24, roses: true, color: '#b794ff', glow: 60, loop: 40, seed: 17 };

export function nightLayer(W, H, cards, o = {}) {
  o = { ...NIGHT_DEFAULTS, ...o };
  const R = rng(o.seed), T = o.loop, kt = (a) => keyTimes(T, a);
  const defs = [], g = [], pre = [];
  const glowA = (o.glow / 100).toFixed(2);
  defs.push(`<radialGradient id="nFly"><stop offset="0" stop-color="#fff3a8" stop-opacity=".95"/><stop offset=".4" stop-color="#ffe27a" stop-opacity=".35"/><stop offset="1" stop-color="#ffe27a" stop-opacity="0"/></radialGradient>`,
    `<radialGradient id="nRose"><stop offset="0" stop-color="${o.color}" stop-opacity="${glowA}"/><stop offset="1" stop-color="${o.color}" stop-opacity="0"/></radialGradient>`);
  if (o.dark > 0) pre.push(`<rect width="${W}" height="${H}" fill="#02030c" opacity="${(o.dark / 100).toFixed(2)}"/>`);

  // --- Sterne: nur im Kopfbereich und in den Spalten ganz am Rand, flimmern mit unterschiedlichem Takt
  let stars = '';
  for (let i = 0; i < o.stars; i++) {
    const x = R() < 0.7 ? R.range(110, W - 10) : R.range(0, W), y = R() < 0.8 ? R.range(2, 62) : R.range(2, Math.min(H, 700)), per = R.range(2.5, 6), t0 = R.range(0, per), big = R() < 0.25;
    stars += `<g transform="translate(${f1(x)} ${f1(y)})"><g><animate attributeName="opacity" dur="${per.toFixed(1)}s" begin="-${t0.toFixed(1)}s" repeatCount="indefinite" values=".15;1;.15"/>${big ? '<path fill="#fff" d="M-.5 -3h1v2h2v1h-2v2h-1v-2h-2v-1h2z"/>' : '<rect x="-.5" y="-.5" width="1.5" height="1.5" fill="#dfe9ff"/>'}</g></g>`;
  }
  g.push(stars);

  // --- Leuchtende Rosen in den Ecken breiter Kacheln (BR-Ecke), je 3 Blüten
  if (o.roses) {
    const sizes = [34, 26];
    sizes.forEach((N, i) => defs.push(`<g id="nr${i}"><g transform="translate(${-N / 2} ${-N / 2})">${rosePixels(o.color, 0.4 + i, N)}</g></g>`));
    wideCards(cards).slice(0, 14).forEach((c, ci) => {
      const ax = c.x + c.w + 2, ay = c.y + c.h + 2, spots = [[ax, ay, 0], [ax - 24, ay + 3, 1], [ax + 1, ay - 24, 1]];
      const per = R.range(4, 7);
      g.push(`<circle cx="${f1(ax - 8)}" cy="${f1(ay - 8)}" r="40" fill="url(#nRose)"><animate attributeName="r" dur="${per.toFixed(1)}s" begin="-${R.range(0, per).toFixed(1)}s" repeatCount="indefinite" values="34;46;34"/></circle>`);
      spots.forEach(([x, y, s], k) => {
        const tg = 1 + ci * 0.4 + k * 0.5;
        g.push(`<g transform="translate(${f1(x)} ${f1(y)})"><g><animateTransform attributeName="transform" type="scale" dur="${T}s" repeatCount="indefinite" calcMode="spline" keyTimes="${kt([0, tg, tg + 1.3, T - 4, T - 1, T])}" keySplines="0 0 1 1;.2 1.5 .4 1;0 0 1 1;.6 0 1 1;0 0 1 1" values="0;0;1;1;0;0"/><use href="#nr${s}"/></g></g>`);
      });
      if (ci % 2 === 0) g.push(twinkle(T, ax - 10, ay - 12, R.range(3, T - 4), { size: 3, color: mix(o.color, '#ffffff', 0.8) }));
    });
  }

  // --- Glühwürmchen: schweben in Schleifen, blinken; einige sitzen auf Oberkanten und pulsieren ruhig
  let fl = '';
  const nF = Math.min(80, Math.round(o.fireflies * Math.min(3, H / 700)));
  for (let i = 0; i < nF; i++) {
    const x = R.range(0, W), y = R.range(20, Math.min(H, 500 * Math.min(3, H / 700))), d = R.range(6, 13), r = R.range(8, 14);
    const pts = [[x, y], [x + R.range(-40, 40), y - R.range(15, 45)], [x + R.range(-30, 30), y + R.range(0, 20)], [x, y]];
    fl += `<g><animateTransform attributeName="transform" type="translate" dur="${d.toFixed(1)}s" begin="-${R.range(0, d).toFixed(1)}s" repeatCount="indefinite" values="${pts.map(([a, b]) => `${f1(a)},${f1(b)}`).join(';')}"/><circle r="${r.toFixed(0)}" fill="url(#nFly)"><animate attributeName="opacity" dur="${R.range(1.8, 4).toFixed(1)}s" begin="-${R.range(0, 3).toFixed(1)}s" repeatCount="indefinite" values=".1;1;.1"/></circle><rect x="-1" y="-1" width="2" height="2" fill="#fffbe0"/></g>`;
  }
  g.push(fl);
  wideCards(cards).forEach((c) => {
    const n = R() < 0.6 ? 1 : 2;
    for (let k = 0; k < n; k++) { const x = c.x + R.range(30, c.w - 30), per = R.range(2.5, 4.5); g.push(`<g transform="translate(${f1(x)} ${c.y - 2})"><circle r="12" fill="url(#nFly)"><animate attributeName="opacity" dur="${per.toFixed(1)}s" begin="-${R.range(0, per).toFixed(1)}s" repeatCount="indefinite" values=".25;1;.25"/></circle><rect x="-1.5" y="-2" width="3" height="2" fill="#fffbe0"/><rect x="-2.5" y="0" width="5" height="1.5" fill="#5a6a22"/></g>`); }
  });
  return `<defs>${defs.join('')}</defs>${pre.join('')}<g pointer-events="none" shape-rendering="crispEdges">${g.join('')}</g>`;
}
