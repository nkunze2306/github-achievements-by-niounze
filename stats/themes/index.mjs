// Register der zusätzlichen Overlay-Themes (Autumn und Butterflies liegen eigenständig in ../autumn.mjs und generate.mjs).
// Theme-Register. Jedes Theme: { id, label, description, defaults, controls, render(W, H, cards, opts) -> SVG-String }
// `controls` beschreibt die Einstellungen für die Website-Kachel (werden dort automatisch zu Reglern, Schaltern und Farbfeldern).
//   range:    { key, label, type: 'range', min, max, step?, unit? }
//   toggle:   { key, label, type: 'toggle' }
//   swatches: { key, label, type: 'swatches', colors: [...] }   (zusätzlich freie Farbwahl)
import { rosesLayer, ROSES_DEFAULTS } from './roses.mjs';
import { snowLayer, SNOW_DEFAULTS } from './snow.mjs';
import { sakuraLayer, SAKURA_DEFAULTS } from './sakura.mjs';
import { rainLayer, RAIN_DEFAULTS } from './rain.mjs';
import { nightLayer, NIGHT_DEFAULTS } from './night.mjs';

export const THEMES = [
  { id: 'roses', label: 'Roses', description: 'Pixel rose clusters in the card corners.', defaults: ROSES_DEFAULTS, render: rosesLayer, controls: [
    { key: 'color', label: 'Rose colour', type: 'swatches', colors: ['#7db8ff', '#d3dbe6', '#ff9ad5', '#c3a6ff', '#ffd98a', '#9fffcf'] },
    { key: 'silver', label: 'Silver share', type: 'range', min: 0, max: 100, step: 5, scale: 100, unit: '%' },
    { key: 'density', label: 'Rose density', type: 'range', min: 40, max: 200, step: 10, scale: 100, unit: '%' },
  ] },
  { id: 'snow', label: 'Snow', description: 'Parallax snowfall, snow piles on card edges, icicles.', defaults: SNOW_DEFAULTS, render: snowLayer, controls: [
    { key: 'flakes', label: 'Snowflakes', type: 'range', min: 0, max: 150, step: 5 },
    { key: 'piles', label: 'Piles per card', type: 'range', min: 0, max: 3 },
    { key: 'wind', label: 'Wind', type: 'range', min: 0, max: 100, step: 5, unit: '%' },
    { key: 'icicles', label: 'Icicles', type: 'toggle' },
    { key: 'sparkle', label: 'Sparkle', type: 'toggle' },
    { key: 'tint', label: 'Snow tint', type: 'swatches', colors: ['#dff1ff', '#ffffff', '#cfe0ff', '#e6dcff', '#ffe2ec'] },
  ] },
  { id: 'sakura', label: 'Sakura', description: 'Cherry blossom branches, drifting petals that settle on the cards.', defaults: SAKURA_DEFAULTS, render: sakuraLayer, controls: [
    { key: 'color', label: 'Blossom colour', type: 'swatches', colors: ['#ff9ac8', '#ffd0e4', '#ffffff', '#c7a6ff', '#ff7aa8', '#9fd8ff'] },
    { key: 'branches', label: 'Branches', type: 'range', min: 0, max: 2 },
    { key: 'blossoms', label: 'Blossom density', type: 'range', min: 20, max: 140, step: 10, unit: '%' },
    { key: 'petals', label: 'Drifting petals', type: 'range', min: 0, max: 60, step: 2 },
    { key: 'landing', label: 'Petals landing per card', type: 'range', min: 0, max: 8 },
    { key: 'sway', label: 'Branch sway', type: 'toggle' },
  ] },
  { id: 'rain', label: 'Rain', description: 'Rain in two depth layers, splashes, puddles, mist, optional lightning.', defaults: RAIN_DEFAULTS, render: rainLayer, controls: [
    { key: 'drops', label: 'Raindrops', type: 'range', min: 10, max: 200, step: 10 },
    { key: 'angle', label: 'Wind angle', type: 'range', min: -30, max: 30, step: 2, unit: '°' },
    { key: 'dim', label: 'Darkening', type: 'range', min: 0, max: 50, step: 2, unit: '%' },
    { key: 'puddles', label: 'Puddles & drips', type: 'toggle' },
    { key: 'splashes', label: 'Splashes', type: 'toggle' },
    { key: 'mist', label: 'Mist', type: 'toggle' },
    { key: 'lightning', label: 'Lightning', type: 'toggle' },
    { key: 'tint', label: 'Rain colour', type: 'swatches', colors: ['#9fc8ff', '#c8d6e6', '#8fe0d8', '#b8b0ff'] },
  ] },
  { id: 'night', label: 'Night', description: 'Dark sky, stars, fireflies and glowing roses.', defaults: NIGHT_DEFAULTS, render: nightLayer, controls: [
    { key: 'dark', label: 'Darkness', type: 'range', min: 0, max: 60, step: 2, unit: '%' },
    { key: 'fireflies', label: 'Fireflies', type: 'range', min: 0, max: 60, step: 2 },
    { key: 'stars', label: 'Stars', type: 'range', min: 0, max: 60, step: 2 },
    { key: 'roses', label: 'Glowing roses', type: 'toggle' },
    { key: 'glow', label: 'Rose glow', type: 'range', min: 0, max: 100, step: 5, unit: '%' },
    { key: 'color', label: 'Glow colour', type: 'swatches', colors: ['#b794ff', '#7db8ff', '#ff9ad5', '#7de0d0', '#ffd98a'] },
  ] },
];
