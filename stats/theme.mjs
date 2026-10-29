// Gemeinsame Regeln für theme.json (genutzt von generate.mjs und apply-theme.mjs; die Website spiegelt sie).
// Nur bekannte Schlüssel und Werte kommen durch, alles andere fällt auf den Standard zurück.
// Ältere Formate { overlay } und { theme, autumn: { piles, wind } } werden weiter verstanden.
// Autumn und Butterflies nutzen density/piles/wind; alle anderen Overlays haben eigene Regler in themes/index.mjs
// und stehen unter options.<id>.
import { THEMES } from './themes/index.mjs';

export const OVERLAYS = ['butterflies', 'autumn', ...THEMES.map((t) => t.id)];
export const RINGS = ['classic', 'orbit', 'rank', 'rarity'];

// Wertebereich eines Reglers in gespeicherten Einheiten (scale rechnet nur die Anzeige um)
export const rangeOf = (c) => [c.min / (c.scale || 1), c.max / (c.scale || 1)];

function normalizeOptions(th, raw = {}) {
  const out = Object.fromEntries(th.controls.map((c) => [c.key, th.defaults[c.key]])); // nur einstellbare Werte, loop/seed bleiben intern
  for (const c of th.controls) {
    const v = raw?.[c.key];
    if (c.type === 'range') { const [lo, hi] = rangeOf(c); if (Number.isFinite(+v) && v !== null && v !== '') out[c.key] = Math.min(hi, Math.max(lo, +v)); }
    else if (c.type === 'toggle') { if (typeof v === 'boolean') out[c.key] = v; }
    else if (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)) out[c.key] = v.toLowerCase();
  }
  return out;
}

export function normalizeTheme(j = {}) {
  if (!j || typeof j !== 'object') j = {};
  const list = Array.isArray(j.overlays) ? j.overlays : [j.overlay ?? j.theme ?? 'autumn'];
  const bool = (v, d) => (typeof v === 'boolean' ? v : d);
  const overlays = OVERLAYS.filter((o) => list.includes(o));
  const options = {};
  for (const th of THEMES) if (overlays.includes(th.id)) options[th.id] = normalizeOptions(th, j.options?.[th.id]);
  return {
    overlays,
    ring: RINGS.includes(j.ring) ? j.ring : 'classic',
    density: Math.min(5, Math.max(1, Math.round(Number(j.density) || 3))),
    piles: bool(j.piles, (j.autumn?.piles ?? 2) > 0),
    wind: bool(j.wind, bool(j.autumn?.wind, true)),
    reduceMotion: bool(j.reduceMotion, true),
    ...(Object.keys(options).length ? { options } : {}),
  };
}
