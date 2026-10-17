import assert from 'node:assert/strict';
import { existsSync, globSync, readFileSync } from 'node:fs';
import test from 'node:test';

// The source half of docs/laws.md. Each test names the law it holds; the rendered half runs
// in the kitchen sink and in tests/browser/kitchen-sink.test.mjs.

const read = (/** @type {string} */ path) => readFileSync(path, 'utf8');
const PALETTE = 'src/lib/styles.css';
const palette = read(PALETTE);
const svelteFiles = globSync('src/**/*.svelte');
const scriptFiles = globSync('src/**/*.ts').filter((path) => !path.endsWith('.d.ts'));

const stripComments = (/** @type {string} */ css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const styleOf = (/** @type {string} */ source) =>
  [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
    .map((m) => stripComments(m[1]))
    .join('\n');
const styles = Object.fromEntries(svelteFiles.map((path) => [path, styleOf(read(path))]));
const declarations = (/** @type {string} */ css) =>
  [...css.matchAll(/(?:^|[;{\s])(-{0,2}[a-z][a-z0-9-]*)\s*:\s*([^;{}]+);/g)].map(
    ([, property, value]) => ({
      property,
      value: value.trim()
    })
  );

/**
 * @param {(declaration: { property: string; value: string }, path: string) => string | null} check
 */
function violations(check) {
  /** @type {string[]} */
  const found = [];
  for (const [path, css] of Object.entries(styles))
    for (const declaration of declarations(css)) {
      const problem = check(declaration, path);
      if (problem)
        found.push(`${path}: ${declaration.property}: ${declaration.value} (${problem})`);
    }
  return found;
}

function block(/** @type {string} */ selector) {
  const start = palette.indexOf(selector);
  assert.notEqual(start, -1, `${selector} is missing from the palette`);
  let depth = 0;
  for (let index = palette.indexOf('{', start); index < palette.length; index++) {
    if (palette[index] === '{') depth++;
    if (palette[index] === '}' && --depth === 0)
      return palette.slice(palette.indexOf('{', start) + 1, index);
  }
  throw new Error(`${selector} never closes`);
}

const tokenMap = (/** @type {string} */ css) =>
  Object.fromEntries(
    [...css.matchAll(/(--sui-[a-z0-9-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [
      name,
      value.trim()
    ])
  );
const light = tokenMap(block("[data-sui-theme='light']"));
const dark = tokenMap(block("[data-sui-theme='dark']"));
const declared = new Set(Object.keys(tokenMap(stripComments(palette))));

test('L-1 the palette is the only place a colour is written', () => {
  const literal =
    /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\((?!\s*from\b)|\bcolor\(\s*srgb|\b(?:white|black|red|blue|green|gray|grey|silver|orange|yellow|purple|pink)\b/i;
  assert.deepEqual(
    violations(({ value }) => (literal.test(value) ? 'colour literal' : null)),
    []
  );
});

test('L-2 every token read is declared and every declared token is read', () => {
  const sources = [...svelteFiles, ...scriptFiles].map(read).join('\n');
  const local = new Set([
    ...[...sources.matchAll(/@property\s+(--sui-[a-z0-9-]+)/g)].map((m) => m[1]),
    ...[...sources.matchAll(/style:(--sui-[a-z0-9-]+)/g)].map((m) => m[1]),
    ...[...sources.matchAll(/setProperty\(\s*'(--sui-[a-z0-9-]+)'/g)].map((m) => m[1]),
    ...[
      ...Object.values(styles)
        .join('\n')
        .matchAll(/(--sui-[a-z0-9-]+)\s*:/g)
    ].map((m) => m[1])
  ]);
  const unresolved = [
    ...new Set([...sources.matchAll(/var\((--sui-[a-z0-9-]+)\)/g)].map((m) => m[1]))
  ].filter((name) => !declared.has(name) && !local.has(name));
  assert.deepEqual(unresolved, [], 'tokens read without a declaration');

  const readNames = new Set([...sources.matchAll(/var\((--sui-[a-z0-9-]+)/g)].map((m) => m[1]));
  const tokens = tokenMap(stripComments(palette));
  const queue = [...readNames];
  while (queue.length > 0) {
    const name = /** @type {string} */ (queue.pop());
    for (const [, inner] of (tokens[name] ?? '').matchAll(/var\((--sui-[a-z0-9-]+)/g))
      if (!readNames.has(inner)) {
        readNames.add(inner);
        queue.push(inner);
      }
  }
  const scales =
    /^--sui-(space|font-size|leading|icon|layer|duration|radius|rhythm|ease|control-height|tier|chart|focus-ring|primitive)-/;
  const unread = [...declared].filter((name) => !readNames.has(name) && !scales.test(name));
  assert.deepEqual(unread, [], 'tokens declared but never read');
});

test('L-3 components read semantic tokens, never primitives', () => {
  const offenders = [...svelteFiles, ...scriptFiles].filter((path) =>
    read(path).includes('--sui-primitive-')
  );
  assert.deepEqual(offenders, []);
});

test('L-4 a derived token is restated in every palette block', () => {
  const changed = new Set(
    Object.keys(dark).filter((name) => light[name] !== undefined && light[name] !== dark[name])
  );
  /** @type {(name: string, seen?: Set<string>) => string[]} */
  const reads = (name, seen = new Set()) => {
    if (seen.has(name)) return [];
    seen.add(name);
    return [...(light[name] ?? '').matchAll(/var\((--sui-[a-z0-9-]+)/g)].flatMap(([, inner]) => [
      inner,
      ...reads(inner, seen)
    ]);
  };
  const stale = Object.keys(light).filter(
    (name) => !(name in dark) && reads(name).some((inner) => changed.has(inner))
  );
  assert.deepEqual(stale, []);
});

test('L-18 two families with the faces and weights Smyklot ships', () => {
  const faces = [...palette.matchAll(/@font-face\s*{([^}]*)}/g)].map((m) => m[1]);
  assert.equal(faces.length, 4);
  for (const face of faces) {
    assert.match(face, /font-display:\s*swap/);
    const family = face.match(/font-family:\s*'([^']+)'/)?.[1];
    const weight = face.match(/font-weight:\s*([^;]+);/)?.[1].trim();
    assert.ok(
      (family === 'SUI Plus Jakarta Sans' && weight === '400 700') ||
        (family === 'SUI JetBrains Mono' && weight === '400 500'),
      `${family} at ${weight}`
    );
    const file = face.match(/url\('\.\/([^']+)'\)/)?.[1];
    assert.ok(file && existsSync(`src/lib/${file}`), `${file} exists`);
  }
});

test('L-21 sizes and leading come from the scale and land on whole pixels', () => {
  const leading = /var\(--sui-(leading-[a-z]+|row-copy-leading)\)/;
  assert.deepEqual(
    violations(({ property, value }) => {
      if (property === 'line-height' && !leading.test(value) && value !== 'inherit')
        return 'leading off the scale';
      if (property === 'font' && value !== 'inherit' && !/\/\s*var\(/.test(value))
        return 'font without its leading';
      if (property === 'font-size' && !/^var\(--sui-font-size-[a-z-]+\)$|^inherit$/.test(value))
        return 'size off the scale';
      return null;
    }),
    []
  );
  for (const [name, value] of Object.entries(tokenMap(stripComments(palette))).filter(([name]) =>
    name.startsWith('--sui-leading-')
  ))
    assert.ok(
      value === '1' || Number.isInteger(parseFloat(value) * 16),
      `${name}: ${value} is not a whole pixel`
    );
});

test('L-22 the phone reads one step larger and types at 16px', () => {
  const phone = palette.slice(palette.indexOf('@media (max-width: 47.9375rem)'));
  for (const name of ['--sui-font-size-body', '--sui-leading-body', '--sui-font-size-page-title'])
    assert.match(phone, new RegExp(`${name}:`));
  assert.match(phone, /--sui-font-size-input:\s*1rem;/);
  const entry = /<textarea\b|<input\b(?![^>]*type="(?:checkbox|radio|hidden|range|color)")/;
  const typed = svelteFiles
    .filter((path) => entry.test(read(path)) && !styles[path].includes('--sui-font-size-input'))
    .filter((path) => /\bfont\s*:/.test(styles[path]));
  assert.deepEqual(typed, [], 'a field the reader types in reads --sui-font-size-input');
});

test('L-32 spacing comes from the scale', () => {
  const spacing = /^(padding|margin|gap|row-gap|column-gap)(-|$)|^inset/;
  const allowed = /^(?:0|auto|1px|2px|-1px|-2px)$/;
  assert.deepEqual(
    violations(({ property, value }) => {
      if (!spacing.test(property)) return null;
      const literals = value
        .replace(/var\([^()]*(\([^()]*\))*[^()]*\)/g, '')
        .match(/-?\d*\.?\d+(px|rem|em)\b/g)
        ?.filter((part) => !allowed.test(part));
      return literals?.length ? `literal ${literals.join(', ')}` : null;
    }),
    []
  );
});

test('L-40 a disabled control draws at the disabled opacity', () => {
  /** @type {string[]} */
  const found = [];
  for (const [path, css] of Object.entries(styles))
    for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g))
      if (/disabled/.test(selector))
        for (const { property, value } of declarations(`{${body}`))
          if (property === 'opacity' && /^0?\.\d+$/.test(value))
            found.push(`${path}: ${selector.trim()} { opacity: ${value} }`);
  assert.deepEqual(found, []);
});

test('L-43 a mark is as wide as what it says', () => {
  for (const name of ['Button', 'Chip', 'Pill', 'StatusPill', 'Link', 'Switch']) {
    const path = `src/lib/components/${name}.svelte`;
    if (existsSync(path)) assert.match(styles[path], /(inline-size|width):\s*fit-content/, path);
  }
});

test('L-46 no component styles another component through :global', () => {
  const offenders = Object.entries(styles).flatMap(([path, css]) =>
    [...css.matchAll(/:global\(([^)]*)\)/g)]
      .filter(([, inner]) => inner.includes('.sui-'))
      .map(([match]) => `${path}: ${match}`)
  );
  assert.deepEqual(offenders, []);
});

test('L-53 radii come from the radius tokens', () => {
  assert.deepEqual(
    violations(({ property, value }) =>
      /^border(-[a-z-]+)?-radius$/.test(property) &&
      !/^(var\(--sui-(radius|r)-[a-z]+\)|50%|0|inherit)$/.test(value)
        ? 'radius off the scale'
        : null
    ),
    []
  );
});

test('L-68 icon sizes are named px tiers', () => {
  for (const [name, value] of Object.entries(tokenMap(stripComments(palette))).filter(([name]) =>
    name.startsWith('--sui-icon-')
  ))
    assert.match(value, /^\d+px$/, name);
  const literal = svelteFiles.flatMap((path) =>
    [...read(path).matchAll(/<Icon\b[^>]*\bsize=\{(\d+)\}/g)]
      .filter(([, size]) => Number(size) <= 18)
      .map(([match]) => `${path}: ${match}`)
  );
  assert.deepEqual(literal, []);
});

test('L-72 stacking order comes from the layer tokens', () => {
  assert.deepEqual(
    violations(({ property, value }) =>
      property === 'z-index' && !/^var\(--sui-layer-[a-z-]+\)$|^[0-3]$|^auto$/.test(value)
        ? 'layer off the scale'
        : null
    ),
    []
  );
});

test('L-73 every duration and easing reads a token', () => {
  const literalTime = /(?<![\w-])(?!0s\b|0\.01ms\b)\d*\.?\d+m?s\b/;
  const literalEase = /\b(?:ease|ease-in|ease-out|ease-in-out|linear|cubic-bezier\(|steps\()/;
  assert.deepEqual(
    violations(({ property, value }) => {
      if (!/^(transition|animation)(-duration|-timing-function|-delay)?$/.test(property))
        return null;
      const bare = value.replace(/var\([^)]*\)/g, '');
      if (literalTime.test(bare)) return 'literal duration';
      if (literalEase.test(bare.replace(/allow-discrete/g, ''))) return 'literal easing';
      return null;
    }),
    []
  );
});

test('L-75 every moving component has a reduced-motion fallback', () => {
  const offenders = Object.entries(styles)
    .filter(([, css]) => /\b(transition|animation)\s*:\s*(?!none)/.test(css))
    .filter(([, css]) => !/prefers-reduced-motion:\s*reduce/.test(css))
    .map(([path]) => path);
  assert.deepEqual(offenders, []);
});

test('L-82 components use Svelte 5 runes', () => {
  /** @type {[RegExp, string][]} */
  const legacy = [
    [/\son:[a-z]+[=|]/, 'on: directive'],
    [/\bexport let\b/, 'export let'],
    [/\$\$(props|restProps|slots)\b/, '$$props'],
    [/<slot\b/, '<slot>'],
    [/^\s*\$:/m, '$: statement'],
    [/from 'svelte\/store'/, 'svelte/store']
  ];
  const offenders = svelteFiles.flatMap((path) =>
    legacy.filter(([pattern]) => pattern.test(read(path))).map(([, name]) => `${path}: ${name}`)
  );
  assert.deepEqual(offenders, []);
});

test('L-83 every exported component has a contract and a kitchen sink section', () => {
  const index = read('src/lib/index.ts');
  const exported = [
    ...index.matchAll(/export \{ default as (\w+)(?:, [^}]*)? \} from '\.\/([^']+\.svelte)'/g)
  ];
  assert.ok(exported.length > 0);
  const sink = globSync('src/routes/sink/*.svelte').map(read).join('\n');
  for (const [, name, file] of exported) {
    assert.match(read(`src/lib/${file}`), /@component\n/, `${name} has an @component contract`);
    assert.match(sink, new RegExp(`\\b${name}\\b`), `${name} appears in the kitchen sink`);
  }
});

test('L-84 no nested :has() and no control characters', () => {
  const nested = Object.entries(styles)
    .filter(([, css]) => /:has\([^)]*:has\(/.test(css))
    .map(([path]) => path);
  assert.deepEqual(nested, []);
  const control = [...svelteFiles, ...scriptFiles, PALETTE].filter((path) =>
    // eslint-disable-next-line no-control-regex
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(read(path))
  );
  assert.deepEqual(control, []);
});
