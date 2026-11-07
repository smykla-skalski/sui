import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { apca, contrast, deltaE2000, lab, over } from '../src/routes/audit/color.ts';

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

// Text, ground and Lc, the sign dropped. The first eight are APCA-W3 0.1.9's published values in
// both polarities, a near-black pair among them. The last three fall under its 0.0005 luminance
// step or its 0.1 clip, so they read 0.
/** @type {[string, string, number][]} */
const lightness = [
  ['#888', '#fff', 63.056469930209424],
  ['#fff', '#888', 68.54146436644962],
  ['#000', '#aaa', 58.146262578561334],
  ['#aaa', '#000', 56.24113336839742],
  ['#123', '#def', 91.66830811481631],
  ['#def', '#123', 93.06770049484275],
  ['#123', '#444', 8.32326136957393],
  ['#444', '#123', 7.526878460278154],
  ['#444', '#454545', 0],
  ['#444', '#555', 0],
  ['#000', '#111', 0]
];

test('APCA matches the published reference values in both polarities', () => {
  const rgba = (/** @type {string} */ hex) => {
    const [r, g, b] = (
      hex.length === 4
        ? [...hex.slice(1)].map((digit) => digit + digit)
        : (hex.slice(1).match(/../g) ?? [])
    ).map((pair) => parseInt(pair, 16) / 255);
    return { r, g, b, a: 1 };
  };
  for (const [text, ground, expected] of lightness)
    assert.ok(
      Math.abs(apca(rgba(text), rgba(ground)) - expected) < 1e-9,
      `${text} on ${ground}: ${apca(rgba(text), rgba(ground))}, not ${expected}`
    );
});

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

// Machado, Oliveira and Fernandes (2009) at full severity, on linear sRGB: the series as a reader
// with no green cones (deutan), no red cones (protan) or no blue cones (tritan) sees them.
const DICHROMACY = {
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881]
  ],
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998]
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039]
  ]
};

test('L-66 the series colours stay apart for a reader with deutan, protan or tritan colour blindness', () => {
  /** @param {number} c */
  const linear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  /** @param {number} c */
  const encode = (c) => {
    const v = Math.min(1, Math.max(0, c));
    return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  };
  /** @param {{ r: number; g: number; b: number }} color @param {number[][]} matrix */
  const seen = ({ r, g, b }, matrix) => {
    const l = [r, g, b].map(linear);
    const [red, green, blue] = matrix.map((row) =>
      encode(row[0] * l[0] + row[1] * l[1] + row[2] * l[2])
    );
    return { r: red, g: green, b: blue, a: 1 };
  };
  /** @type {string[]} */
  const close = [];
  for (const [theme, block] of Object.entries(blocks)) {
    const series = [1, 2, 3, 4, 5].map((n) => parse(token(block, `chart-${n}`)));
    for (const [kind, matrix] of Object.entries(DICHROMACY)) {
      const views = series.map((color) => lab(seen(color, matrix)));
      for (let i = 0; i < views.length; i++)
        for (let j = i + 1; j < views.length; j++) {
          const apart = deltaE2000(views[i], views[j]);
          if (apart < 10)
            close.push(
              `${theme} chart-${i + 1} and chart-${j + 1} under ${kind}: ${apart.toFixed(1)}`
            );
        }
    }
  }
  assert.deepEqual(close, []);
});
