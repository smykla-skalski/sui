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
    // `publish` is the anchor's write that skips a value already there.
    ...[...sources.matchAll(/(?:setProperty|publish)\(\s*(?:\w+,\s*)?'(--sui-[a-z0-9-]+)'/g)].map(
      (m) => m[1]
    ),
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

  const readNames = new Set(
    [
      ...sources.matchAll(/var\((--sui-[a-z0-9-]+)/g),
      // Script reads a token by its quoted name, as `getPropertyValue('--sui-…')` does.
      ...sources.matchAll(/'(--sui-[a-z0-9-]+)'/g)
    ].map((m) => m[1])
  );
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
    /^--sui-(space|font-size|leading|icon|layer|duration|radius|ease|control-height|tier|chart|focus-ring|primitive|breakpoint)-/;
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

test('L-4 a page with no theme chosen follows the system to the same dark block', () => {
  // The indented copy wraps differently, so values compare with their whitespace folded.
  const folded = (/** @type {Record<string, string>} */ map) =>
    Object.fromEntries(
      Object.entries(map).map(([name, value]) => [
        name,
        value.replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')')
      ])
    );
  const system = tokenMap(block(':root:not([data-theme], [data-sui-theme])'));
  assert.deepEqual(folded(system), folded(dark));
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
    const file = face.match(/url\('\.\/([^'?]+)/)?.[1];
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
  const tokens = tokenMap(stripComments(palette));
  // A leading may name another leading token, such as the phone's step reading its own name.
  const resolve = (/** @type {string} */ value) =>
    tokens[/^var\((--sui-leading-[a-z-]+)\)$/.exec(value)?.[1] ?? ''] ?? value;
  for (const [name, value] of Object.entries(tokens).filter(([name]) =>
    name.startsWith('--sui-leading-')
  ))
    assert.ok(
      resolve(value) === '1' || Number.isInteger(parseFloat(resolve(value)) * 16),
      `${name}: ${value} is not a whole pixel`
    );
});

const PHONE = '@media (max-width: 47.9375rem)';
const pixels = (/** @type {string} */ rem) => parseFloat(rem) * 16;

test('L-24 a title stands 12px above its description, copy lines 8px apart, form notes 20px', () => {
  const gaps = tokenMap(stripComments(palette));
  assert.deepEqual(
    {
      copy: pixels(gaps['--sui-row-copy-gap']),
      title: pixels(gaps['--sui-title-copy-gap']),
      note: pixels(gaps['--sui-leading-note'])
    },
    { copy: 8, title: 12, note: 20 }
  );
  // A control's help and error lines, not a whole state's or form's error, nor a setting row's
  // problem, which is a line of the row's copy.
  const dense = globSync('src/lib/components/*.svelte').flatMap((path) =>
    [...stripComments(read(path)).matchAll(/\n {2}([^\n{}]+)\{([^}]*)\}/g)]
      .filter(
        ([, selector, body]) =>
          /-(help|error|hint|problem)\b/.test(selector) &&
          !/error-state|form-error|problem-words|setting-problem/.test(selector) &&
          /font:[^;]*--sui-row-copy-leading/.test(body)
      )
      .map(([, selector]) => `${path} ${selector.trim()}`)
  );
  assert.deepEqual(dense, []);
});

test('L-66 a chart grid draws 65% of the way to a control edge, and every legend at one size', () => {
  const grids = [...stripComments(palette).matchAll(/--sui-chart-grid:\s*([^;]+);/g)].map((match) =>
    match[1].trim()
  );
  assert.ok(grids.length > 0);
  assert.deepEqual(
    new Set(grids),
    new Set(['color-mix(in srgb, var(--sui-border-subtle) 35%, var(--sui-border-control))'])
  );
  const legends = Object.entries(styles)
    .filter(([path]) => path.includes('/charts/'))
    .flatMap(([path, css]) =>
      [...stripComments(css).matchAll(/^\s*\.legend\s*\{[^}]*?font:\s*([^;]+);/gm)].map(
        ([, font]) => `${path.split('/').pop()}: ${font.replace(/\s+/g, ' ').trim()}`
      )
    );
  assert.ok(legends.length >= 3, legends.join('\n'));
  assert.deepEqual(
    legends.filter((rule) => !rule.includes('var(--sui-font-size-meta) / var(--sui-leading-meta)')),
    []
  );
});

test('L-107 a scroll edge fades over 24px, and over 20px on a phone', () => {
  const sheet = stripComments(read('src/lib/internal/scroll-edge.css'));
  const space = tokenMap(stripComments(palette));
  const fades = [...sheet.matchAll(/--sui-local-edge-fade:\s*var\((--sui-space-\d+)\)/g)].map(
    ([, token]) => pixels(space[token])
  );
  assert.deepEqual(fades, [24, 20]);
  assert.match(
    sheet,
    /@media \(max-width: 29\.9375rem\) \{\s*\.sui-scroll-edge \{\s*--sui-local-edge-fade/
  );
});

test('L-64 a placeholder light stops by the 10 seconds a skeleton waits to turn slow, and a waiting chart draws its grid', () => {
  const wait = /\.sui-chart-wait\s*\{[^}]*\}/.exec(
    stripComments(styles['src/lib/charts/ChartFrame.svelte'])
  )?.[0];
  assert.deepEqual(
    [...(wait ?? '').matchAll(/var\(--sui-local-wait-line\) 0 (\d+)%/g)].map(([, at]) => at),
    ['25', '50', '75']
  );
  assert.match(wait ?? '', /--sui-local-wait-line:\s*linear-gradient\(var\(--sui-chart-grid\)/);
  const tokens = tokenMap(stripComments(palette));
  const patience = /patience = ([\d_]+)/.exec(read('src/lib/components/Skeleton.svelte'))?.[1];
  assert.equal(
    Number(tokens['--sui-placeholder-runs']) * parseFloat(tokens['--sui-duration-shimmer']),
    Number(patience?.replaceAll('_', ''))
  );
  for (const path of ['src/lib/components/DataTable.svelte', 'src/lib/charts/ChartFrame.svelte']) {
    const sheens = [
      ...stripComments(styles[path]).matchAll(/animation:\s*sui-[\w-]+-sheen\b[^;]*/g)
    ].map(([rule]) => rule.replace(/\s+/g, ' '));
    assert.ok(sheens.length > 0, path);
    for (const rule of sheens) assert.match(rule, /var\(--sui-placeholder-runs\) both$/, path);
  }
});

test('L-59 a state panel pads 28px by 24px, 20px on a phone, its action a step under its words', () => {
  const space = tokenMap(stripComments(palette));
  const lengths = (/** @type {string | undefined} */ rule, /** @type {string} */ property) =>
    [
      ...(new RegExp(`\\b${property}:([^;]*)`).exec(rule ?? '')?.[1] ?? '').matchAll(
        /var\((--sui-space-\d+)\)/g
      )
    ].map(([, token]) => pixels(space[token]));
  for (const name of ['empty', 'error']) {
    const path = `src/lib/components/${name[0].toUpperCase()}${name.slice(1)}State.svelte`;
    const css = stripComments(styles[path]);
    const panel = new RegExp(`\\.sui-${name}-state \\{([^}]*)\\}`);
    const rest = panel.exec(css)?.[1];
    const phone = panel.exec(
      /@media \(max-width: 47\.9375rem\) \{([\s\S]*?\})\s*\}/.exec(css)?.[1] ?? ''
    )?.[1];
    assert.deepEqual(
      { padding: lengths(rest, 'padding'), gap: lengths(rest, 'gap') },
      { padding: [28, 24], gap: [20] },
      path
    );
    assert.deepEqual(
      { padding: lengths(phone, 'padding'), gap: lengths(phone, 'gap') },
      { padding: [20], gap: [16] },
      `${path} on a phone`
    );
  }
});

test('L-5 the quiet inks stay easy to read on the dark canvas, under the current row', () => {
  const values = tokenMap(stripComments(palette));
  const resolve = (/** @type {string} */ value) => {
    let at = value;
    while (at?.startsWith('var(')) at = values[/var\((--[\w-]+)\)/.exec(at)?.[1] ?? ''];
    return at;
  };
  const luminance = (/** @type {string} */ hex) => {
    const [r, g, b] = [1, 3, 5]
      .map((at) => parseInt(hex.slice(at, at + 2), 16) / 255)
      .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (/** @type {string} */ a, /** @type {string} */ b) => {
    const [high, low] = [luminance(resolve(a)), luminance(resolve(b))].sort((x, y) => y - x);
    return (high + 0.05) / (low + 0.05);
  };
  const canvas = dark['--sui-canvas'];
  assert.ok(ratio(dark['--sui-text-muted'], canvas) >= 8, 'dark muted ink under 8:1');
  assert.ok(ratio(dark['--sui-text-secondary'], canvas) >= 10, 'dark secondary ink under 10:1');
  assert.ok(
    ratio(dark['--sui-text-current'], dark['--sui-text-muted']) >= 2,
    'the current row stands under 2:1 from the rest rows'
  );
});

test('L-25 the type tiers keep the sizes the law names', () => {
  const sizes = tokenMap(stripComments(palette.slice(0, palette.indexOf(PHONE))));
  const tier = (/** @type {string} */ name) => pixels(sizes[`--sui-font-size-${name}`]);
  assert.deepEqual(
    {
      pageTitle: tier('page-title'),
      dialogTitle: tier('dialog-title'),
      cardTitle: tier('card-title'),
      body: tier('body'),
      control: tier('control')
    },
    { pageTitle: 32, dialogTitle: 20, cardTitle: 17, body: 15, control: 14 }
  );
  const all = { ...sizes, ...tokenMap(stripComments(palette.slice(palette.indexOf(PHONE)))) };
  const small = Object.entries(all).filter(
    ([name, value]) => name.startsWith('--sui-font-size-') && pixels(value) < 11
  );
  assert.deepEqual(small, [], 'no text is smaller than 11px');
  assert.match(
    styles['src/lib/components/Field.svelte'],
    /\.sui-field-label\s*\{[^}]*font: var\(--sui-weight-semibold\) var\(--sui-font-size-control\)/
  );
  assert.match(
    styles['src/lib/components/PageHeader.svelte'],
    /font: var\(--sui-weight-bold\) var\(--sui-font-size-page-title\)/
  );
  assert.match(
    styles['src/lib/components/DataTable.svelte'],
    /\n  thead th \{[^}]*font: var\(--sui-weight-semibold\) var\(--sui-font-size-compact\)/,
    'a column heading stands no step under the rows it heads'
  );
  assert.match(
    styles['src/lib/components/DataTable.svelte'],
    /@media \(max-width: 47\.9375rem\) \{[^@]*\n    thead th \{\s*font-size: var\(--sui-font-size-control\);/,
    'a column heading on a phone keeps the compact size under rows that read larger'
  );
  for (const path of ['EmptyState', 'ErrorState'])
    assert.match(
      styles[`src/lib/components/${path}.svelte`],
      /-title \{[^}]*font: var\(--sui-weight-semibold\) var\(--sui-font-size-card-title\)/,
      `an ${path} panel's title stands a tier over the words it heads`
    );
  assert.match(
    styles['src/lib/components/ErrorState.svelte'],
    /\.over \.sui-error-state-title \{\s*font-size: var\(--sui-font-size-title\);/,
    'a failed refresh over a list stays a quiet line'
  );
});

test('L-22 the phone reads one step larger and types at 16px', () => {
  const phone = palette.slice(palette.indexOf(PHONE));
  for (const name of ['--sui-font-size-body', '--sui-leading-body'])
    assert.match(phone, new RegExp(`${name}:`));
  assert.match(phone, /--sui-font-size-page-title:\s*var\(--sui-font-size-page-title-compact\);/);
  assert.equal(pixels(tokenMap(stripComments(palette))['--sui-font-size-page-title-compact']), 24);
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

test('L-35 a field label and every group name wear one ink at one weight, over a compact "Required"', () => {
  const names = {
    'src/lib/components/Field.svelte': 'sui-field-label',
    'src/lib/components/CheckList.svelte': 'sui-check-list-legend',
    'src/lib/components/ChoiceCards.svelte': 'sui-choice-cards-legend',
    'src/lib/components/SegmentedControl.svelte': 'sui-segmented-caption'
  };
  for (const [path, name] of Object.entries(names)) {
    const rule = new RegExp(`\\n  \\.${name} \\{([^}]*)\\}`).exec(styles[path])?.[1] ?? '';
    assert.match(rule, /\bcolor: var\(--sui-text-primary\);/, `${name} wears another ink`);
    assert.match(
      rule,
      /\bfont: var\(--sui-weight-semibold\) var\(--sui-font-size-control\)/,
      `${name} is set in another weight or size`
    );
  }
  const required = /\n  \.sui-field-required \{([^}]*)\}/.exec(
    styles['src/lib/components/Field.svelte']
  )?.[1];
  assert.match(
    required ?? '',
    /\bfont: var\(--sui-weight-medium\) var\(--sui-font-size-compact\)/,
    '"Required" stands no step under the label it marks'
  );
});

test('L-35 every error line is set at 500, a step over its hint', () => {
  const lines = Object.entries(styles).flatMap(([path, css]) => {
    const rules = [...stripComments(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(
      ([, head, body]) => ({ selectors: head.split(',').map((each) => each.trim()), body })
    );
    // A line's ink and its type can come from different rules, such as a font it shares with
    // the hint beside it, so each danger ink is followed to the last font set on its words.
    return rules
      .filter(({ body }) => /(?:^|[\s;])color: var\(--sui-danger\);/.test(body))
      .flatMap(({ selectors }) => selectors)
      .flatMap((selector) => {
        const words = [`${selector} > span`, selector]
          .map((target) => rules.filter(({ selectors }) => selectors.includes(target)))
          .find((targeting) => targeting.some(({ body }) => /\bfont(-weight)?:/.test(body)));
        let size, weight;
        for (const { body } of words ?? []) {
          const font = /\bfont: var\(--sui-weight-(\w+)\) var\(--sui-font-size-(\w+)\)/.exec(body);
          if (font) [, weight, size] = font;
          weight = /\bfont-weight: var\(--sui-weight-(\w+)\)/.exec(body)?.[1] ?? weight;
        }
        return size === 'meta' ? [`${path} ${selector}: ${weight}`] : [];
      });
  });
  assert.ok(
    lines.length >= 10,
    `only ${lines.length} error lines found, so nothing here is proved`
  );
  assert.deepEqual(
    lines.filter((line) => !line.endsWith(': medium')),
    []
  );
});

test('L-40 a disabled control draws at the disabled opacity, 0.6', () => {
  /** @type {string[]} */
  const found = [];
  for (const [path, css] of Object.entries(styles))
    for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g))
      if (/disabled/.test(selector))
        for (const { property, value } of declarations(`{${body}`))
          if (property === 'opacity' && /^0?\.\d+$/.test(value))
            found.push(`${path}: ${selector.trim()} { opacity: ${value} }`);
  assert.deepEqual(found, []);
  assert.equal(tokenMap(stripComments(palette))['--sui-disabled-opacity'], '0.6');
});

test('L-43 a mark is as wide as what it says', () => {
  for (const name of ['Button', 'Chip', 'Pill', 'StatusPill', 'Link', 'Switch']) {
    const path = `src/lib/components/${name}.svelte`;
    if (existsSync(path))
      assert.match(
        styles[path],
        /(inline-size|width):\s*(fit-content|var\(--sui-local-button-span, fit-content\))/,
        path
      );
  }
});

test('L-46 no component styles another component through :global', () => {
  // Asking whether a part is there, inside :has(), lays out the asker's own box and paints no
  // part of the other component, so only the rest of a selector is weighed.
  const asking = /:has\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\)/g;
  const offenders = Object.entries(styles).flatMap(([path, css]) =>
    [...css.replace(asking, '').matchAll(/:global\(([^)]*)\)/g)]
      .filter(([, inner]) => inner.includes('.sui-'))
      .map(([match]) => `${path}: ${match}`)
  );
  assert.deepEqual(offenders, []);
});

test('L-53 radii come from the radius tokens', () => {
  assert.deepEqual(
    violations(({ property, value }) =>
      /^border(-[a-z-]+)?-radius$/.test(property) &&
      !/^(var\(--sui-(radius|r)-[a-z-]+\)|50%|0|inherit)$/.test(value)
        ? 'radius off the scale'
        : null
    ),
    []
  );
});

test('L-53 edges are a stroke token wide', () => {
  assert.deepEqual(
    violations(({ property, value }) => {
      const bare = value.replace(/var\([^()]*(\([^()]*\))*[^()]*\)/g, 'var()');
      const edge =
        /^(border|outline|column-rule)(-(block|inline|top|right|bottom|left)(-(start|end))?)?(-width)?$/.test(
          property
        ) && /(?<![\w.-])[1-9]\d*(\.\d+)?px\b/.test(bare);
      const ring = property === 'box-shadow' && /\b0 0 0 [1-9]\d*(\.\d+)?px\b/.test(bare);
      return edge || ring ? 'literal edge width' : null;
    }),
    []
  );
});

test('a side that differs from its opposite is written along the reading direction', () => {
  assert.deepEqual(
    violations(({ property, value }) => {
      if (/^(left|right)$|-(left|right)(-|$)/.test(property) && !/radius/.test(property))
        return 'physical side';
      if (!/^(padding|margin|inset|border-(width|style|color))$/.test(property)) return null;
      const parts = value.match(/(?:[a-z-]+\((?:[^()]|\([^()]*\))*\)|[^\s()]+)/g) ?? [];
      return parts.length === 4 && parts[1] !== parts[3] ? 'right differs from left' : null;
    }),
    []
  );
});

test('L-68 icon sizes are named tiers that grow with the text and land on whole pixels', () => {
  for (const [name, value] of Object.entries(tokenMap(stripComments(palette))).filter(([name]) =>
    name.startsWith('--sui-icon-')
  )) {
    const rem = value.match(/^round\(([\d.]+)rem, 1px\)$/)?.[1];
    assert.ok(rem && Number.isInteger(parseFloat(rem) * 16), `${name}: ${value}`);
  }
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
      property === 'z-index' && !/^var\(--sui-layer-[a-z-]+\)$|^auto$/.test(value)
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

test('L-104 hover and press change grounds, inks and edges at once', () => {
  // A part that travels fades its fill with its travel; nothing else fades a state's paint.
  const travels = new Set([
    'src/lib/components/Switch.svelte .sui-switch-track',
    'src/lib/components/SegmentedControl.svelte .ready .sui-segmented-thumb'
  ]);
  const painted =
    /^(background(-color)?|color|border(-[a-z]+)?-color|outline-color|fill|stroke|text-decoration-[a-z]+|--sui-[a-z-]+-layer)$/;
  /** @type {string[]} */
  const found = [];
  for (const [path, css] of Object.entries(styles))
    for (const match of stripComments(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selector = match[1].trim().replace(/\s+/g, ' ');
      const transition = match[2].match(/(?:^|;)\s*transition\s*:\s*([^;]+)/)?.[1];
      if (!transition || travels.has(`${path} ${selector}`)) continue;
      const fading = transition
        .split(',')
        .map((item) => item.trim().split(/\s+/)[0])
        .filter((name) => painted.test(name));
      if (fading.length) found.push(`${path} ${selector}: ${fading.join(', ')}`);
    }
  assert.deepEqual(found, []);
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
  const items = [
    'Semantics',
    'Content',
    'States',
    'Keyboard',
    'Pointer and touch',
    'Focus',
    'Responsive',
    'Accessibility',
    'Localization',
    'Performance',
    'Analytics',
    'Failure'
  ];
  for (const [, name, file] of exported) {
    const source = read(`src/lib/${file}`);
    assert.match(source, /@component\n/, `${name} has an @component contract`);
    const contract = source.slice(
      source.indexOf('@component'),
      source.indexOf('-->', source.indexOf('@component'))
    );
    const missing = items.filter((item) => !new RegExp(`^- ${item}:`, 'm').test(contract));
    assert.deepEqual(missing, [], `${name}'s contract leaves out these items`);
    assert.match(sink, new RegExp(`\\b${name}\\b`), `${name} appears in the kitchen sink`);
  }
});

test('L-98 hover paint sits behind a pointer that can hover', () => {
  /** Drops every block opened by `opener`, so whatever is left stands outside them. */
  const without = (/** @type {string} */ css, /** @type {RegExp} */ opener) => {
    let rest = css;
    for (let match = opener.exec(rest); match; match = opener.exec(rest)) {
      let depth = 0;
      let end = rest.indexOf('{', match.index);
      for (; end < rest.length; end++) {
        if (rest[end] === '{') depth++;
        if (rest[end] === '}' && --depth === 0) break;
      }
      rest = rest.slice(0, match.index) + rest.slice(end + 1);
    }
    return rest;
  };
  const bare = Object.entries(styles)
    .filter(([path]) => path.startsWith('src/lib/'))
    .filter(([, css]) => /:hover/.test(without(stripComments(css), /@media\s*\(hover:\s*hover\)/)))
    .map(([path]) => path);
  assert.deepEqual(bare, []);
});

test('L-99 the layout changes only at the palette breakpoints', () => {
  const tokens = tokenMap(stripComments(palette));
  const phone = tokens['--sui-breakpoint-phone'];
  const wide = tokens['--sui-breakpoint-wide'];
  // A min-width query starts where the max-width one ends, a sixteenth of a rem on.
  const page = new Set([phone, wide, `${parseFloat(phone) + 0.0625}rem`]);
  // A container query may also use a component's own width, which the palette names too.
  const own = new Set([
    ...page,
    ...Object.entries(tokens)
      .filter(([name]) => name.startsWith('--sui-breakpoint-'))
      .map(([, value]) => value)
  ]);
  const found = [];
  for (const [path, css] of Object.entries(styles))
    if (path.startsWith('src/lib/'))
      for (const [query, rule] of stripComments(css).matchAll(/@(media|container)[^{]+/g))
        for (const [, length] of query.matchAll(/(?:min|max)-width:\s*([\d.]+rem)/g))
          if (!(rule === 'media' ? page : own).has(length)) found.push(`${path}: ${query.trim()}`);
  assert.deepEqual(found, []);
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

test('K9 every built-in word reads through word(), so setWords can replace it', () => {
  // Words a reader sees, as against key names an event carries.
  const sentence =
    /(['`])(?!(?:Home|End|Escape|Tab|Enter|Delete|Backspace)\1)[A-Z][a-z]+(?: [A-Za-z]+)*[.…]?\1/;
  const found = [];
  for (const path of svelteFiles.filter((file) => file.startsWith('src/lib/'))) {
    const source = read(path);
    const props = /\n {2}let \{\n([\s\S]*?)\n {2}\}:/.exec(source)?.[1] ?? '';
    // Two values side by side in a default are joined in its own language unless a mark joins them.
    for (const [join] of props.matchAll(/\$\{\w+\} +[^\w\s$]?\$\{\w+\}/g))
      found.push(`${path}: ${join} joins values with a space`);
    for (const [, name, value] of props.matchAll(/^ {4}(\w+) = ([\s\S]+?)(?=,?\n {4}\S|,?$)/gm)) {
      if (value.startsWith('word(') || value.includes('word(')) continue;
      const literal = /^(['`])(.*)\1$/.exec(value.trim())?.[2];
      const words = literal !== undefined && /[A-Z ·…]/.test(literal);
      const spoken = /^[({]/.test(value) && /['`][^'`]*[A-Za-z][^'`]*['`]/.test(value);
      // A default that names a local constant or function carries that one's words.
      const named = /^[A-Za-z_]\w*$/.exec(value.trim())?.[0];
      const body = named
        ? new RegExp(
            `(?:const ${named}\\s*(?::[^=]*)?=[^;]*;|function ${named}\\b[\\s\\S]*?\\n {2}\\})`
          ).exec(source)?.[0]
        : undefined;
      if (words || spoken || (body !== undefined && sentence.test(body)))
        found.push(`${path}: ${name}`);
    }
  }
  // Words joined into markup, such as an accessible name built from a label, read through a
  // function prop too, so a language can put them in its own order.
  for (const path of svelteFiles.filter((file) => file.startsWith('src/lib/'))) {
    const markup = read(path)
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g, '')
      .replace(/\{[#/:@][^{}]*\}/g, '');
    for (const [, template] of markup.matchAll(/`([^`]*)`/g))
      if (template.includes('${') && !/^[\w-]*$/.test(template.replace(/\$\{[^}]*\}/g, '')))
        found.push(`${path}: \`${template}\``);
    // Marks and words between expressions, in a quoted attribute or in text, join words in one
    // language's order and punctuation; they read through `mark()` or a function word instead.
    const plumbing =
      /^(class|style|id|for|href|d|viewBox|points|transform|name|aria-(describedby|labelledby|controls))$/;
    for (const [, name, value] of markup.matchAll(/\s([\w:-]+)="([^"]*\{[^"]*)"/g))
      if (
        !plumbing.test(name) &&
        !/^(class|style):/.test(name) &&
        value.replace(/\{[^{}]*\}/g, '').trim()
      )
        found.push(`${path}: ${name}="${value}"`);
    // A literal space, no-break space or lone mark between words sets one language's joins too.
    for (const [join] of markup.matchAll(/\{\s*(['"`])\s*\1\s*\}|&nbsp;|>\s*[,.:;]\s*</g))
      found.push(`${path}: ${join}`);
    for (const [, text] of markup.matchAll(/>([^<>]*\{[^<>]*)</g))
      if (!/^\s*\{[#/:@]/.test(text) && /[^\s]/.test(text.replace(/\{[^{}]*\}|&nbsp;/g, '')))
        found.push(`${path}: ${text.trim()}`);
    // A name built from content gains a space on each side of a hidden box, so a box that opens
    // with a mark never joins words exactly; the name is composed in script instead.
    const raw = read(path).replace(
      /<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g,
      ''
    );
    for (const [join] of raw.matchAll(/<VisuallyHidden\b[^>]*>\s*\{\s*(?:mark|joiner)\([^)]*\)\}/g))
      found.push(`${path}: ${join.replace(/\s+/g, ' ')}`);
    // A space mark alone between a block or a tag and an element is a text node of its own, and
    // after a server render Chrome drops it from the name; it goes inside the next element.
    for (const [join] of raw.matchAll(
      /(?:\{[#:][^{}]*\}|>)\s*\{\s*(?:mark|joiner)\(\s*'space'\s*\)\}\s*</g
    ))
      found.push(`${path}: a lone space mark: ${join.replace(/\s+/g, ' ')}`);
  }
  for (const path of [...svelteFiles, ...scriptFiles].filter((file) => file.startsWith('src/lib/')))
    for (const [join] of read(path).matchAll(/textContent[^;]*?\.join\(\s*' '\s*\)/g))
      found.push(`${path}: words joined with a space: ${join.replace(/\s+/g, ' ')}`);
  for (const path of [...svelteFiles, ...scriptFiles].filter((file) => file.startsWith('src/lib/')))
    // A list format joins with the locale's punctuation, which no mark replaces.
    if (/new Intl\.ListFormat\b/.test(read(path)))
      found.push(`${path}: a list joined by Intl.ListFormat`);
  for (const path of scriptFiles.filter(
    (file) => file.startsWith('src/lib/') && !file.endsWith('words.ts')
  ))
    if (sentence.test(read(path).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')))
      found.push(`${path}: a word outside word()`);
  assert.deepEqual(found, []);
});

test('L-118 the page covers the screen and its chrome wears each scheme canvas', () => {
  const app = read('src/app.html');
  assert.match(app, /<meta name="viewport" content="[^"]*viewport-fit=cover/);
  for (const scheme of ['light', 'dark']) {
    const canvas = palette.match(
      new RegExp(`--sui-primitive-${scheme}-canvas:\\s*(#[0-9a-f]{6})`, 'i')
    );
    assert.ok(canvas, `the ${scheme} canvas is a hex`);
    assert.ok(
      app.includes(
        `<meta name="theme-color" content="${canvas[1]}" media="(prefers-color-scheme: ${scheme})" />`
      ),
      `the ${scheme} theme-color is ${canvas[1]}`
    );
  }
});

test('L-53 a shadow that lifts a part is two layers in every palette block', () => {
  /** @param {string} value */
  const layers = (value) => {
    let depth = 0;
    let count = 1;
    for (const char of value) {
      if (char === '(') depth++;
      else if (char === ')') depth--;
      else if (char === ',' && depth === 0) count++;
    }
    return count;
  };
  const found = [
    ...palette.matchAll(
      /--sui-(shadow-plate|shadow-popover|shadow-dialog|segment-thumb-shadow):([^;]+);/g
    )
  ];
  assert.equal(found.length, 12, 'four shadows in each of three palette blocks');
  assert.deepEqual(
    found.filter(([, , value]) => layers(value) < 2).map(([, name]) => name),
    []
  );
});

test('L-94 a form error summary, which reads at body size, takes the 16px mark 8px from its words and a 16px inset', () => {
  const path = 'src/lib/components/FormError.svelte';
  assert.match(read(path), /sui-form-error-mark"><Icon name="alert" size="base" \/>/);
  assert.match(styles[path], /\.sui-form-error-message \{[^}]*column-gap: var\(--sui-space-2\)/);
  assert.match(
    styles[path],
    /\.sui-form-error \{[^}]*padding: var\(--sui-space-4\);/,
    'a 12px inset crowds body-size words and their 16px mark'
  );
  assert.match(
    styles[path],
    /\.sui-form-error-list \{[^}]*padding-inline-start: calc\(var\(--sui-icon-base\) \+ var\(--sui-space-2\)\)/,
    'the summary links leave the line its mark and gap take'
  );
});

test('L-39 a stop-quiet edge stays the danger hue on a dark ground', () => {
  assert.equal(light['--sui-stop-quiet-edge-mix'], '45%');
  assert.equal(dark['--sui-stop-quiet-edge-mix'], '60%', 'a dark ground turns a 45% edge pink');
  assert.match(
    styles['src/lib/components/Button.svelte'],
    /\[data-tone='stop-quiet'\] \{\s*border-color: color-mix\(\s*in srgb,\s*var\(--sui-danger\) var\(--sui-stop-quiet-edge-mix\),\s*var\(--sui-control-border\)\s*\);/
  );
});

test('L-85 the current row stands on a plate a light theme does not wash out', () => {
  const plate = (/** @type {string} */ share) =>
    `color-mix(in srgb, var(--sui-brand-action) ${share}, var(--sui-sidebar-bg))`;
  assert.equal(light['--sui-sidebar-active-bg'], plate('18%'), 'a 12% plate reads as hover');
  assert.equal(dark['--sui-sidebar-active-bg'], plate('24%'));
});
