import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { contrast, deltaE2000, over } from '../src/routes/audit/color.ts';

// Reference pairs from Sharma, Wu and Dalal (2005), the published CIEDE2000 test data.
/** @type {[[number, number, number], [number, number, number], number][]} */
const pairs = [
  [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
  [[50, 3.1571, -77.2803], [50, 0, -82.7485], 2.8615],
  [[50, 0, 0], [50, -1, 2], 2.3669],
  [[50, 2.5, 0], [73, 25, -18], 27.1492],
  [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644],
  [[22.7233, 20.0904, -46.694], [23.0331, 14.973, -42.5619], 2.0373]
];

test('CIEDE2000 matches the published reference pairs', () => {
  for (const [first, second, expected] of pairs)
    assert.ok(
      Math.abs(deltaE2000(first, second) - expected) < 1e-4,
      `${first} vs ${second}: ${deltaE2000(first, second)} != ${expected}`
    );
});

const palette = readFileSync('src/lib/styles.css', 'utf8');
const blocks = {
  light: palette.slice(palette.indexOf(':root,'), palette.indexOf(":root[data-theme='dark']")),
  dark: palette.slice(palette.indexOf(":root[data-theme='dark']"), palette.indexOf('@media'))
};
/** @param {string} block @param {string} name */
const token = (block, name) => {
  const found = block.match(new RegExp(`--sui-${name}:\\s*([^;]+);`));
  assert.ok(found, `--sui-${name} is declared`);
  return found[1].trim();
};
/** @param {string} value */
const parse = (value) => {
  const hex = value.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return { r: (n >> 16) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255, a: 1 };
  }
  const veil = value.match(/^rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)%\)$/);
  assert.ok(veil, `${value} is a hex or a veil`);
  const [, r, g, b, a] = veil.map(Number);
  return { r: r / 255, g: g / 255, b: b / 255, a: a / 100 };
};

// OKLCH with its lightness clamped, as `oklch(from … clamp(floor, l, ceiling) c h)` computes it;
// a colour the clamp takes out of sRGB is clipped per channel, as a browser paints it.
/** @param {{ r: number; g: number; b: number }} color @param {number} floor @param {number} ceiling */
function clampLightness({ r, g, b }, floor, ceiling) {
  const lin = (/** @type {number} */ c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  const [R, G, B] = [r, g, b].map(lin);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = Math.min(
    ceiling,
    Math.max(floor, 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s)
  );
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const [l3, m3, s3] = [
    (L + 0.3963377774 * a + 0.2158037573 * bb) ** 3,
    (L - 0.1055613458 * a - 0.0638541728 * bb) ** 3,
    (L - 0.0894841775 * a - 1.291485548 * bb) ** 3
  ];
  const gamma = (/** @type {number} */ v) => {
    const c = Math.min(1, Math.max(0, v));
    return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  };
  return {
    r: gamma(4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3),
    g: gamma(-1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3),
    b: gamma(-0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3),
    a: 1
  };
}

test('L-93 a swatch ring holds 3:1 for every colour on every ground and under its hover', () => {
  const grounds = {
    light: ['canvas', 'surface', 'inset'],
    dark: ['canvas', 'surface', 'inset', 'raised']
  };
  const steps = 16;
  for (const theme of /** @type {const} */ (['light', 'dark'])) {
    const block = blocks[theme];
    const floor = Number(token(block, 'swatch-edge-floor'));
    const ceiling = Number(token(block, 'swatch-edge-ceiling'));
    const hover = parse(token(block, 'interactive-hover-layer'));
    const bases = grounds[theme].map((name) => parse(token(palette, `primitive-${theme}-${name}`)));
    const all = [...bases, ...bases.map((ground) => over(hover, ground))];
    let worst = { ratio: Infinity, color: '' };
    for (let r = 0; r <= steps; r++)
      for (let g = 0; g <= steps; g++)
        for (let b = 0; b <= steps; b++) {
          const color = { r: r / steps, g: g / steps, b: b / steps, a: 1 };
          const ring = clampLightness(color, floor, ceiling);
          for (const ground of all) {
            if (contrast(color, ground) >= 3) continue;
            const ratio = contrast(ring, ground);
            if (ratio < worst.ratio)
              worst = { ratio, color: `rgb(${r}/${steps} ${g}/${steps} ${b}/${steps})` };
          }
        }
    assert.ok(
      worst.ratio >= 3,
      `${theme}: the ring of ${worst.color} holds ${worst.ratio.toFixed(2)}:1`
    );
  }
});
