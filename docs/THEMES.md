# Themes

An overlay is an animation layer that `stats/generate.mjs` inserts before `</svg>` in `stats.svg`. You choose overlays in `theme.json`
(by hand, or with the "Theme & look" bar of the dashboard, owner only). Several overlays can be combined.

```json
{
  "overlays": ["autumn", "snow"],
  "ring": "orbit",
  "density": 3, "piles": true, "wind": true, "reduceMotion": true,
  "options": { "snow": { "flakes": 80, "icicles": true } }
}
```

| Overlay     | Settings |
| ----------- | -------- |
| butterflies | `density` |
| autumn      | `density`, `piles`, `wind` (file `stats/autumn.mjs`) |
| roses       | `options.roses`: `color`, `silver` (0-1), `density` (factor) |
| snow        | `options.snow`: `flakes`, `piles`, `wind`, `icicles`, `sparkle`, `tint` |
| sakura      | `options.sakura`: `color`, `branches`, `blossoms`, `petals`, `landing`, `sway` |
| rain        | `options.rain`: `drops`, `angle`, `dim`, `puddles`, `splashes`, `mist`, `lightning`, `tint` |
| night       | `options.night`: `dark`, `fireflies`, `stars`, `roses`, `glow`, `color` |

`stats/theme.mjs` validates everything (`normalizeTheme`): unknown overlays, values outside the slider ranges and invalid colours fall back to the default.
With `reduceMotion` a media query hides all movement. Autumn leaves the leaves lying, the themes from `stats/themes/` disappear completely.
Internally every theme also has `loop` (seconds per cycle) and `seed` (same seed = same picture); both are not adjustable.

`theme.json` lives next to your generated files (the `output-dir` of the action). Without it the stats card has no overlay.

## Adding a theme

1. `stats/themes/<id>.mjs` with `export function <id>Layer(W, H, cards, opts)` returning an SVG string and `export const <ID>_DEFAULTS`. `cards` are the tiles `{ x, y, w, h }`. Helpers live in `stats/themes/lib.mjs` (RNG, colours, pixel runs, twinkle, dither).
2. Register it in `stats/themes/index.mjs`: `{ id, label, description, defaults, controls, render }`.
   `controls` builds the sliders of the dashboard bar automatically (`range`, `toggle`, `swatches`; `scale`/`unit`/`step` optional) and defines the valid ranges for `theme.mjs`.
3. Pick an icon colour in `site/index.html` (`ACC`) and, if the theme should come before others, the order in `stats/generate.mjs` (`order`) and `ORDER` in `site/index.html`.
4. `cd stats && node preview-themes.mjs <id>` renders `previews/<id>.svg` with demo data.

Rules: SVG/SMIL only (no script, no web fonts), the base state is the "finished" state, deterministic (`rng(seed)`), size budget roughly below 500 KB at demo height.
