// Writes docs/THEMES.md from the real theme registry (stats/themes/index.mjs), so the settings in the docs can never drift from the code.
//   node tools/make-theme-docs.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { THEMES } from '../stats/themes/index.mjs';
import { rangeOf } from '../stats/theme.mjs';

const OUT = fileURLToPath(new URL('../docs/THEMES.md', import.meta.url));
const IMG = { night: 'stats-night.svg', sakura: 'stats-sakura.svg', snow: 'stats-snow.svg' };

const kind = (c) => (c.type === 'range' ? 'number' : c.type === 'toggle' ? 'true / false' : 'colour (#rrggbb)');
const range = (c) => {
  if (c.type === 'range') { const [lo, hi] = rangeOf(c); return `${lo} to ${hi}${c.step ? `, step ${c.step / (c.scale || 1)}` : ''}${c.unit ? ` (${c.unit})` : ''}`; }
  if (c.type === 'toggle') return 'on or off';
  return `any hex colour, presets: ${c.colors.map((x) => `\`${x}\``).join(' ')}`;
};
const val = (v) => (typeof v === 'string' ? `\`${v}\`` : `\`${v}\``);
const table = (rows) => ['| Setting | What it does | Values | Default |', '| --- | --- | --- | --- |', ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');

const themeSection = (t) => {
  const rows = t.controls.map((c) => [`\`${c.key}\``, c.label, `${kind(c)}: ${range(c)}`, val(t.defaults[c.key])]);
  const ex = JSON.stringify({ overlays: [t.id], options: { [t.id]: Object.fromEntries(t.controls.slice(0, 2).map((c) => [c.key, t.defaults[c.key]])) } }, null, 2);
  return `### ${t.label}

${t.description}${IMG[t.id] ? `\n\n<img src="img/${IMG[t.id]}" alt="${t.label} theme" width="48%">` : ''}

Set under \`options.${t.id}\` in \`theme.json\`.

${table(rows)}

\`\`\`json
${ex}
\`\`\`
`;
};

const md = `# Themes

A theme is an animated overlay for the stats card (\`stats.svg\`). It is pure SVG/SMIL, so it also runs inside a README image (no script, no web fonts).
You choose overlays in \`theme.json\`, either by hand or with the "Theme & look" bar of the dashboard (owner only, see [SETUP-LOGIN.md](SETUP-LOGIN.md)). Several overlays can be combined.

\`theme.json\` lives next to your generated files (the \`output-dir\` of the action). Without it the stats card uses the default: autumn.
All values are validated by \`stats/theme.mjs\` (\`normalizeTheme\`): unknown overlays, numbers outside the allowed range and invalid colours fall back to the default.

- [Overview](#overview)
- [General settings](#general-settings)
- [Overlays](#overlays): ${['Autumn', 'Butterflies', ...THEMES.map((t) => t.label)].join(', ')}
- [Complete example](#complete-example)
- [Adding a theme](#adding-a-theme)

## Overview

| Overlay | Look | Own settings |
| --- | --- | --- |
| \`autumn\` | falling leaves, leaf piles on the cards | general settings \`density\`, \`piles\`, \`wind\` |
| \`butterflies\` | pixel butterflies that land on card edges | general setting \`density\` |
${THEMES.map((t) => `| \`${t.id}\` | ${t.description} | ${t.controls.map((c) => `\`${c.key}\``).join(', ')} |`).join('\n')}

## General settings

These keys sit at the top level of \`theme.json\`.

${table([
  ['`overlays`', 'Which overlays are drawn', `list of: \`autumn\`, \`butterflies\`, ${THEMES.map((t) => `\`${t.id}\``).join(', ')}`, '`["autumn"]`'],
  ['`ring`', 'Style of the progress rings on the achievement tiles', '`classic` (thick arc), `orbit` (thin track with a planet), `rank` (one segment per level), `rarity` (glow grows with the level)', '`classic`'],
  ['`density`', 'How much happens in Autumn and Butterflies', 'integer 1 to 5 (Sparse, Light, Normal, Dense, Storm)', '`3`'],
  ['`piles`', 'Autumn: leaves that stay lying on card edges', 'true / false', '`true`'],
  ['`wind`', 'Autumn: gusts that blow the leaves across', 'true / false', '`true`'],
  ['`reduceMotion`', 'Hide all movement for visitors who ask their system for reduced motion (Autumn keeps the leaves lying, the other overlays disappear)', 'true / false', '`true`'],
])}

\`options\` holds the settings of the overlays below, one object per overlay id.
Internally every overlay also has \`loop\` (seconds per cycle) and \`seed\` (same seed = same picture). Both are fixed and not adjustable.

## Overlays

### Autumn

Falling leaves, some of which stay lying on card edges. No \`options\`, it uses the general settings \`density\` (3, 6, 10, 15 or 20 leaves at once), \`piles\` and \`wind\`.

### Butterflies

Pixel butterflies fly around, land on card edges, slowly open and close their wings and fly on. No \`options\`, \`density\` sets how many (2, 3, 5, 7 or 9).

${THEMES.map(themeSection).join('\n')}
The sakura branches hang in a transparent strip above the content, so they never cover a card.

## Complete example

\`\`\`json
{
  "overlays": ["autumn", "rain"],
  "ring": "orbit",
  "density": 3,
  "piles": true,
  "wind": false,
  "reduceMotion": true,
  "options": {
    "rain": { "drops": 20, "angle": 0, "dim": 4, "puddles": false, "splashes": true, "mist": true, "lightning": false, "tint": "#9fc8ff" }
  }
}
\`\`\`

## Adding a theme

1. \`stats/themes/<id>.mjs\` with \`export function <id>Layer(W, H, cards, opts)\` returning an SVG string and \`export const <ID>_DEFAULTS\`. \`cards\` are the tiles \`{ x, y, w, h }\`. Helpers live in \`stats/themes/lib.mjs\` (RNG, colours, pixel runs, twinkle, dither).
2. Register it in \`stats/themes/index.mjs\`: \`{ id, label, description, defaults, controls, render }\`.
   \`controls\` builds the sliders of the dashboard bar automatically (\`range\`, \`toggle\`, \`swatches\`; \`scale\`/\`unit\`/\`step\` optional) and defines the valid ranges for \`theme.mjs\`.
3. Pick an icon colour in \`site/index.html\` (\`ACC\`) and, if the theme should come before others, the order in \`stats/generate.mjs\` (\`order\`) and \`ORDER\` in \`site/index.html\`.
4. \`cd stats && node preview-themes.mjs <id>\` renders \`previews/<id>.svg\` with demo data.
5. \`node tools/make-theme-docs.mjs\` rewrites this page from the registry.

Rules: SVG/SMIL only, the base state is the "finished" state, deterministic (\`rng(seed)\`), size budget roughly below 500 KB at demo height.
`;
writeFileSync(OUT, md);
console.log(`wrote ${OUT}`);
