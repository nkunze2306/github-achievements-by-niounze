// Regen-Theme: Tropfen in zwei Tiefenebenen, Spritzer auf den Kachel-Oberkanten, Pfützen mit Wellenringen an den Unterkanten,
// hängende Tropfen unter den Kacheln, optional Nebel und Gewitterblitze.
import { mix, rng, f1, keyTimes } from './lib.mjs';

export const RAIN_DEFAULTS = { drops: 70, angle: 12, puddles: true, splashes: true, mist: true, lightning: false, tint: '#9fc8ff', dim: 22, loop: 40, seed: 14 };

export function rainLayer(W, H, cards, o = {}) {
  o = { ...RAIN_DEFAULTS, ...o };
  const R = rng(o.seed), T = o.loop, kt = (a) => keyTimes(T, a);
  const tint = o.tint, hi = mix(tint, '#ffffff', 0.6), lo = mix(tint, '#2a4a8a', 0.4);
  const defs = [], g = [], pre = [];
  const scale = Math.min(3, H / 700), n = Math.min(260, Math.round(o.drops * scale)), tilt = Math.tan((o.angle * Math.PI) / 180);

  // Abdunkelung (als Regenstimmung); sitzt über den Kacheln, deshalb nur schwach
  if (o.dim > 0) pre.push(`<rect width="${W}" height="${H}" fill="#06142c" opacity="${(o.dim / 100).toFixed(2)}"/>`);

  // --- Tropfen: ferne (kurz, blass, langsam) und nahe (länger, heller, schnell)
  let drops = '';
  for (let i = 0; i < n; i++) {
    const near = i % 3 === 0, len = near ? R.range(9, 14) : R.range(4, 7), dur = (near ? R.range(0.7, 1.0) : R.range(1.1, 1.6)) * Math.min(2.4, H / 520), x = R.range(-80, W + 80), dx = -tilt * (H + 30);
    drops += `<g opacity="${near ? 0.85 : 0.45}"><animateTransform attributeName="transform" type="translate" dur="${dur.toFixed(2)}s" begin="-${R.range(0, dur).toFixed(2)}s" repeatCount="indefinite" values="${f1(x)},-20;${f1(x + dx)},${H + 10}"/><path d="M0 0L${(-tilt * len).toFixed(1)} ${len.toFixed(1)}" stroke="${near ? hi : tint}" stroke-width="${near ? 1.6 : 1.1}" stroke-linecap="round" shape-rendering="geometricPrecision"/></g>`;
  }
  g.push(drops);

  const wide = cards.filter((c) => c.w >= 170);
  // --- Spritzer auf den Oberkanten: kurzer Bogen aus 5 Pixeln, der aufspringt und verblasst
  if (o.splashes) wide.forEach((c) => {
    for (let k = 0; k < Math.round(c.w / 80); k++) {
      const x = c.x + R.range(20, c.w - 20), per = R.range(0.9, 1.7), t0 = R.range(0, per);
      g.push(`<g transform="translate(${f1(x)} ${c.y - 1})" opacity="0"><animate attributeName="opacity" dur="${per.toFixed(2)}s" begin="-${t0.toFixed(2)}s" repeatCount="indefinite" keyTimes="0;.05;.5;1" values="0;1;.4;0"/><animateTransform attributeName="transform" type="scale" dur="${per.toFixed(2)}s" begin="-${t0.toFixed(2)}s" repeatCount="indefinite" values="0.6 0.6;1.2 1.2" additive="sum"/><path fill="${hi}" d="M-3 0h1v-1h1v-1h2v1h1v1h1v1h-7zM-5 -1h1v1h-1zM4 -1h1v1h-1z"/></g>`);
    }
  });

  // --- Pfützen an den Unterkanten (Spiegelung + Wellenringe) und hängende Tropfen
  wide.forEach((c, ci) => {
    if (o.puddles) {
      const x = c.x + R.range(40, c.w - 40), y = c.y + c.h + 4, rx = R.range(18, 34);
      g.push(`<ellipse cx="${f1(x)}" cy="${y}" rx="${rx.toFixed(0)}" ry="3.2" fill="${lo}" fill-opacity=".55" stroke="${tint}" stroke-opacity=".55"/><ellipse cx="${f1(x - rx * 0.3)}" cy="${y - 0.6}" rx="${(rx * 0.35).toFixed(0)}" ry="0.9" fill="#fff" fill-opacity=".45"/>`);
      for (let r = 0; r < 2; r++) { const d = 1.8 + r * 0.9; g.push(`<ellipse cx="${f1(x + R.range(-rx / 3, rx / 3))}" cy="${y}" rx="2" ry=".7" fill="none" stroke="#fff"><animate attributeName="rx" dur="${d}s" begin="-${R.range(0, d).toFixed(1)}s" repeatCount="indefinite" values="2;${(rx * 0.7).toFixed(0)}"/><animate attributeName="ry" dur="${d}s" begin="-${R.range(0, d).toFixed(1)}s" repeatCount="indefinite" values=".7;3"/><animate attributeName="opacity" dur="${d}s" begin="-${R.range(0, d).toFixed(1)}s" repeatCount="indefinite" values=".9;0"/></ellipse>`); }
    }
    // Tropfen wächst unter der Kante, löst sich und fällt
    const dx = c.x + R.range(30, c.w - 30), per = R.range(5, 9), t0 = R.range(0, per);
    g.push(`<g transform="translate(${f1(dx)} ${c.y + c.h})"><g><animateTransform attributeName="transform" type="translate" dur="${per.toFixed(1)}s" begin="-${t0.toFixed(1)}s" repeatCount="indefinite" keyTimes="0;.6;1" values="0 0;0 0;0 22"/><ellipse rx="2" ry="3" cy="3" fill="${tint}" stroke="${lo}"><animate attributeName="ry" dur="${per.toFixed(1)}s" begin="-${t0.toFixed(1)}s" repeatCount="indefinite" keyTimes="0;.6;1" values=".5;3.2;3.4"/><animate attributeName="opacity" dur="${per.toFixed(1)}s" begin="-${t0.toFixed(1)}s" repeatCount="indefinite" keyTimes="0;.9;1" values="1;1;0"/></ellipse><circle cx="-.7" cy="2" r=".7" fill="#fff"/></g></g>`);
  });

  // --- Nebel: heller Verlauf von unten
  if (o.mist) {
    defs.push(`<linearGradient id="rainMist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${tint}" stop-opacity="0"/><stop offset="1" stop-color="${tint}" stop-opacity=".22"/></linearGradient>`);
    g.push(`<rect y="${Math.max(0, H - 260)}" width="${W}" height="260" fill="url(#rainMist)"/>`);
  }
  // --- Gewitter: zwei schnelle Blitze kurz vor Schleifenende
  if (o.lightning) {
    const t = T - 9, bx = R.range(120, W - 120);
    const bolt = (x) => { let d = `M${f1(x)} 0`, px = x; for (let y = 24; y < 230; y += 24) { px += R.range(-18, 18); d += `L${f1(px)} ${y}`; } return d; };
    g.push(`<rect width="${W}" height="${H}" fill="#e8f2ff" opacity="0"><animate attributeName="opacity" dur="${T}s" repeatCount="indefinite" keyTimes="${kt([0, t, t + 0.05, t + 0.15, t + 0.3, t + 0.38, t + 0.9, T])}" values="0;0;.55;.1;.4;0;0;0"/></rect>`);
    g.push(`<path d="${bolt(bx)}" fill="none" stroke="#fff" stroke-width="3" opacity="0" stroke-linejoin="miter"><animate attributeName="opacity" dur="${T}s" repeatCount="indefinite" keyTimes="${kt([0, t, t + 0.05, t + 0.4, T])}" values="0;0;1;0;0"/></path>`);
  }
  return `<defs>${defs.join('')}</defs>${pre.join('')}<g pointer-events="none">${g.join('')}</g>`;
}
