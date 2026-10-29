# Themes

A theme is an animated overlay for the stats card (`stats.svg`). It is pure SVG/SMIL, so it also runs inside a README image (no script, no web fonts).
You choose overlays in `theme.json`, either by hand or with the "Theme & look" bar of the dashboard (owner only, see [SETUP-LOGIN.md](SETUP-LOGIN.md)). Several overlays can be combined.

`theme.json` lives next to your generated files (the `output-dir` of the action). Without it the stats card uses the default: autumn.
All values are validated by `stats/theme.mjs` (`normalizeTheme`): unknown overlays, numbers outside the allowed range and invalid colours fall back to the default.

- [Overview](#overview)
- [General settings](#general-settings)
- [Overlays](#overlays): Autumn, Butterflies, Snow, Sakura, Rain, Night
- [Complete example](#complete-example)
- [Adding a theme](#adding-a-theme)

## Overview

| Overlay | Look | Own settings |
| --- | --- | --- |
| `autumn` | falling leaves, leaf piles on the cards | general settings `density`, `piles`, `wind` |
| `butterflies` | pixel butterflies that land on card edges | general setting `density` |
| `snow` | Parallax snowfall, snow piles on card edges, icicles. | `flakes`, `piles`, `wind`, `icicles`, `sparkle`, `tint` |
| `sakura` | Cherry blossom branches above the cards, drifting petals that settle on the cards. | `color`, `branches`, `blossoms`, `petals`, `landing`, `sway` |
| `rain` | Rain in two depth layers, splashes, puddles, mist, optional lightning. | `drops`, `angle`, `dim`, `puddles`, `splashes`, `mist`, `lightning`, `tint` |
| `night` | Dark sky, stars and fireflies. | `dark`, `fireflies`, `stars` |

## General settings

These keys sit at the top level of `theme.json`.

| Setting | What it does | Values | Default |
| --- | --- | --- | --- |
| `overlays` | Which overlays are drawn | list of: `autumn`, `butterflies`, `snow`, `sakura`, `rain`, `night` | `["autumn"]` |
| `ring` | Style of the progress rings on the achievement tiles | `classic` (thick arc), `orbit` (thin track with a planet), `rank` (one segment per level), `rarity` (glow grows with the level) | `classic` |
| `density` | How much happens in Autumn and Butterflies | integer 1 to 5 (Sparse, Light, Normal, Dense, Storm) | `3` |
| `piles` | Autumn: leaves that stay lying on card edges | true / false | `true` |
| `wind` | Autumn: gusts that blow the leaves across | true / false | `true` |
| `reduceMotion` | Hide all movement for visitors who ask their system for reduced motion (Autumn keeps the leaves lying, the other overlays disappear) | true / false | `true` |

`options` holds the settings of the overlays below, one object per overlay id.
Internally every overlay also has `loop` (seconds per cycle) and `seed` (same seed = same picture). Both are fixed and not adjustable.

## Overlays

### Autumn

Falling leaves, some of which stay lying on card edges. No `options`, it uses the general settings `density` (3, 6, 10, 15 or 20 leaves at once), `piles` and `wind`.

### Butterflies

Pixel butterflies fly around, land on card edges, slowly open and close their wings and fly on. No `options`, `density` sets how many (2, 3, 5, 7 or 9).

### Snow

Parallax snowfall, snow piles on card edges, icicles.

<img src="img/stats-snow.svg" alt="Snow theme" width="48%">

Set under `options.snow` in `theme.json`.

| Setting | What it does | Values | Default |
| --- | --- | --- | --- |
| `flakes` | Snowflakes | number: 0 to 150, step 5 | `60` |
| `piles` | Piles per card | number: 0 to 3 | `2` |
| `wind` | Wind | number: 0 to 100, step 5 (%) | `40` |
| `icicles` | Icicles | true / false: on or off | `true` |
| `sparkle` | Sparkle | true / false: on or off | `true` |
| `tint` | Snow tint | colour (#rrggbb): any hex colour, presets: `#dff1ff` `#ffffff` `#cfe0ff` `#e6dcff` `#ffe2ec` | `#dff1ff` |

```json
{
  "overlays": [
    "snow"
  ],
  "options": {
    "snow": {
      "flakes": 60,
      "piles": 2
    }
  }
}
```

### Sakura

Cherry blossom branches above the cards, drifting petals that settle on the cards.

<img src="img/stats-sakura.svg" alt="Sakura theme" width="48%">

Set under `options.sakura` in `theme.json`.

| Setting | What it does | Values | Default |
| --- | --- | --- | --- |
| `color` | Blossom colour | colour (#rrggbb): any hex colour, presets: `#ff9ac8` `#ffd0e4` `#ffffff` `#c7a6ff` `#ff7aa8` `#9fd8ff` | `#ff9ac8` |
| `branches` | Branches | number: 0 to 2 | `2` |
| `blossoms` | Blossom density | number: 20 to 140, step 10 (%) | `70` |
| `petals` | Drifting petals | number: 0 to 60, step 2 | `28` |
| `landing` | Petals landing per card | number: 0 to 8 | `4` |
| `sway` | Branch sway | true / false: on or off | `true` |

```json
{
  "overlays": [
    "sakura"
  ],
  "options": {
    "sakura": {
      "color": "#ff9ac8",
      "branches": 2
    }
  }
}
```

### Rain

Rain in two depth layers, splashes, puddles, mist, optional lightning.

Set under `options.rain` in `theme.json`.

| Setting | What it does | Values | Default |
| --- | --- | --- | --- |
| `drops` | Raindrops | number: 10 to 200, step 10 | `70` |
| `angle` | Wind angle | number: -30 to 30, step 2 (°) | `12` |
| `dim` | Darkening | number: 0 to 50, step 2 (%) | `22` |
| `puddles` | Puddles & drips | true / false: on or off | `true` |
| `splashes` | Splashes | true / false: on or off | `true` |
| `mist` | Mist | true / false: on or off | `true` |
| `lightning` | Lightning | true / false: on or off | `false` |
| `tint` | Rain colour | colour (#rrggbb): any hex colour, presets: `#9fc8ff` `#c8d6e6` `#8fe0d8` `#b8b0ff` | `#9fc8ff` |

```json
{
  "overlays": [
    "rain"
  ],
  "options": {
    "rain": {
      "drops": 70,
      "angle": 12
    }
  }
}
```

### Night

Dark sky, stars and fireflies.

<img src="img/stats-night.svg" alt="Night theme" width="48%">

Set under `options.night` in `theme.json`.

| Setting | What it does | Values | Default |
| --- | --- | --- | --- |
| `dark` | Darkness | number: 0 to 60, step 2 (%) | `28` |
| `fireflies` | Fireflies | number: 0 to 60, step 2 | `28` |
| `stars` | Stars | number: 0 to 60, step 2 | `24` |

```json
{
  "overlays": [
    "night"
  ],
  "options": {
    "night": {
      "dark": 28,
      "fireflies": 28
    }
  }
}
```

The sakura branches hang in a transparent strip above the content, so they never cover a card.

## Complete example

```json
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
```

## Adding a theme

1. `stats/themes/<id>.mjs` with `export function <id>Layer(W, H, cards, opts)` returning an SVG string and `export const <ID>_DEFAULTS`. `cards` are the tiles `{ x, y, w, h }`. Helpers live in `stats/themes/lib.mjs` (RNG, colours, pixel runs, twinkle, dither).
2. Register it in `stats/themes/index.mjs`: `{ id, label, description, defaults, controls, render }`.
   `controls` builds the sliders of the dashboard bar automatically (`range`, `toggle`, `swatches`; `scale`/`unit`/`step` optional) and defines the valid ranges for `theme.mjs`.
3. Pick an icon colour in `site/index.html` (`ACC`) and, if the theme should come before others, the order in `stats/generate.mjs` (`order`) and `ORDER` in `site/index.html`.
4. `cd stats && node preview-themes.mjs <id>` renders `previews/<id>.svg` with demo data.
5. `node tools/make-theme-docs.mjs` rewrites this page from the registry.

Rules: SVG/SMIL only, the base state is the "finished" state, deterministic (`rng(seed)`), size budget roughly below 500 KB at demo height.
