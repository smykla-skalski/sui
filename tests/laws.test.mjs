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

test('L-24 a title stands 12px above its description, copy lines 8px apart, form notes and a dialog description 20px', () => {
  const gaps = tokenMap(stripComments(palette.slice(0, palette.indexOf(PHONE))));
  const phone = tokenMap(stripComments(palette.slice(palette.indexOf(PHONE))));
  assert.deepEqual(
    {
      copy: pixels(gaps['--sui-row-copy-gap']),
      title: pixels(gaps['--sui-title-copy-gap']),
      field: pixels(gaps['--sui-field-gap']),
      note: pixels(gaps['--sui-leading-note']),
      phoneNote: pixels(phone['--sui-leading-note'])
    },
    { copy: 8, title: 12, field: 12, note: 20, phoneNote: 22 }
  );
  // A control's help and error lines, not a whole state's, form's or dialog's error, nor a
  // setting row's problem, which is a line of the row's copy.
  const dense = globSync('src/lib/components/*.svelte').flatMap((path) =>
    [...stripComments(read(path)).matchAll(/\n {2}([^\n{}]+)\{([^}]*)\}/g)]
      .filter(
        ([, selector, body]) =>
          /-(help|error|hint|problem)\b/.test(selector) &&
          !/error-state|form-error|modal-error|problem-words|setting-problem/.test(selector) &&
          /font:[^;]*--sui-row-copy-leading/.test(body)
      )
      .map(([, selector]) => `${path} ${selector.trim()}`)
  );
  assert.deepEqual(dense, []);
  assert.match(
    stripComments(read('src/lib/components/Modal.svelte')),
    /\.sui-modal-description \{[^}]*font: [^;]*var\(--sui-font-size-body\) \/ var\(--sui-leading-note\)/,
    "a dialog's description is set at the body size and wraps at the note leading"
  );
  assert.match(
    stripComments(read('src/lib/components/Toaster.svelte')),
    /\.sui-toast-description \{[^}]*text-wrap: balance;[^}]*line-height: var\(--sui-leading-note\);/,
    "a toast's description wraps at the note leading in balanced lines"
  );
  assert.match(
    stripComments(read('src/lib/components/Toaster.svelte')),
    /\.acting \.sui-toast-description \{\s*text-wrap: pretty;/,
    "beside an action a toast's balanced reason leaves a gap before it"
  );
  assert.match(
    stripComments(read('src/lib/components/SaveBar.svelte')),
    /\.subtitle \{[^}]*font: [^;]*\/ var\(--sui-leading-note\)/,
    "a save bar's subtitle wraps at the note leading, as a toast's description does"
  );
  assert.match(
    stripComments(read('src/lib/components/Modal.svelte')),
    /\.sui-modal-head \{[^}]*gap: var\(--sui-space-4\);/,
    "a dialog's title stands 16px over its description, a step past a card's 12px (L-58)"
  );
  assert.match(
    stripComments(read('src/lib/components/Modal.svelte')),
    /\.sui-modal-description \{[^}]*color: color-mix\(in srgb, var\(--sui-text-primary\) 20%, var\(--sui-text-secondary\)\);/,
    "a dialog's description leans a fifth of the way toward the primary ink (L-58)"
  );
  assert.match(
    stripComments(read('src/lib/components/SettingRow.svelte')),
    /\.sui-setting-why \+ \.sui-setting-state \{\s*margin-block-start: var\(--sui-space-1\);/,
    "a setting row's status stands a step, 4px, past the description's 8px copy gap"
  );
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

test('L-107 a scroll edge fades over 24px, and over 20px on a phone, and a popover foot over 16px', () => {
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
  const footSheet = stripComments(read('src/lib/internal/scroll-foot.css'));
  const foot = /\.sui-scroll-foot::after \{([^}]*)\}/.exec(footSheet)?.[1];
  assert.ok(foot, 'a scrolling layer draws a foot fade');
  assert.match(foot, /block-size: var\(--sui-space-4\);/, 'a layer foot fades over 16px');
  assert.match(foot, /animation-timeline: scroll\(nearest block\);/);
  assert.match(
    footSheet,
    /@keyframes sui-scroll-foot-list \{\s*from \{\s*--sui-scroll-foot: var\(--sui-space-4\);/,
    'a list inside a layer masks its foot over 16px'
  );
  for (const [path, scroller] of [
    ['src/lib/components/Popover.svelte', "'sui-popover', 'sui-scroll-foot'"],
    ['src/lib/components/Combobox.svelte', 'class="sui-combobox-list sui-scroll-foot-list"'],
    ['src/lib/components/AdditionPicker.svelte', 'class="sui-addition-menu sui-scroll-foot-list"']
  ]) {
    const source = read(path);
    assert.ok(source.includes("import '../internal/scroll-foot.css';"), `${path} takes the fade`);
    assert.ok(source.includes(scroller), `${path} fades the box that scrolls`);
  }
  assert.match(
    stripComments(read('src/lib/components/Select.svelte')),
    /\.sui-select-control:open \.sui-select-option \{[^}]*animation-range: entry 0% entry var\(--sui-space-4\);/,
    "a select's picker fades the option its foot cuts over 16px"
  );
});

test('L-62 a stripe is a 3% veil of the ink, which keeps the place without banding the words', () => {
  assert.equal(
    /\.striped \{\s*--sui-local-stripe: ([^;]*);/.exec(
      stripComments(styles['src/lib/components/DataTable.svelte'])
    )?.[1],
    'color-mix(in srgb, var(--sui-text-primary) 3%, transparent)'
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
  assert.match(
    stripComments(styles['src/lib/components/ErrorState.svelte']),
    /\.over \{[^}]*justify-content: start;/,
    "a failed refresh's retry stands right after its words, not at the line's far end"
  );
  assert.match(
    stripComments(styles['src/lib/components/ErrorState.svelte']),
    /\.sui-error-state-title \{[^}]*color: var\(--sui-text-primary\);/,
    'the mark, edge and wash carry the failure, so its title reads in the primary ink'
  );
  const table = stripComments(styles['src/lib/components/DataTable.svelte']);
  const refusal = stripComments(styles['src/lib/components/FormError.svelte']);
  assert.deepEqual(
    [
      /\.problem-words \{[^}]*color: ([^;]*);/.exec(table)?.[1],
      /\.sui-form-error-message \{[^}]*color: ([^;]*);/.exec(refusal)?.[1],
      /\.sui-form-error-mark \{[^}]*color: ([^;]*);/.exec(refusal)?.[1]
    ],
    ['var(--sui-text-primary)', 'var(--sui-text-primary)', 'var(--sui-danger)'],
    "a table's failed line and a form's refusal say it in the primary ink beside the danger mark"
  );
  assert.deepEqual(
    [
      lengths(/\n {2}\.state \{([^}]*)\}/.exec(table)?.[1], 'padding-block'),
      lengths(
        /\.state \{([^}]*)\}/.exec(
          /@media \(max-width: 47\.9375rem\) \{([\s\S]*?\})\s*\}/.exec(table)?.[1] ?? ''
        )?.[1],
        'padding-block'
      )
    ],
    [[20], [16]],
    'a table with no rows says so with more room than a row above and below its words'
  );
  for (const name of ['Empty', 'Error']) {
    const css = styles[`src/lib/components/${name}State.svelte`];
    assert.match(css, /-state-copy \{[^}]*gap: var\(--sui-title-copy-gap\)/, `${name}State`);
    assert.doesNotMatch(
      css,
      /calc\(var\(--sui-(row|title)-copy-gap\) - var\(--sui-(title|row)-copy-gap\)\)/,
      `${name}State: a step in words stands the title gap under the explanation, apart from it`
    );
  }
});

test('L-13 a dark stop fill brightens under the pointer by a step the eye finds, its words still 4.5:1', () => {
  const values = tokenMap(stripComments(palette));
  const hex = (/** @type {string} */ name) => {
    let at = dark[name] ?? values[name];
    while (at?.startsWith('var(')) at = values[/var\((--[\w-]+)\)/.exec(at)?.[1] ?? ''];
    return [1, 3, 5].map((i) => parseInt(at.slice(i, i + 2), 16));
  };
  const mix = /color-mix\(in srgb, var\(--sui-danger-fill\), var\(--sui-danger\) (\d+)%\)/.exec(
    dark['--sui-danger-fill-hover']
  );
  assert.ok(mix, "the dark stop hover leans its fill toward the theme's danger ink");
  const share = Number(mix[1]) / 100;
  const [rest, words] = [hex('--sui-danger-fill'), hex('--sui-on-danger')];
  const ink = hex('--sui-danger');
  const hover = rest.map((c, i) => c * (1 - share) + ink[i] * share);
  const luminance = (/** @type {number[]} */ rgb) => {
    const [r, g, b] = rgb
      .map((c) => c / 255)
      .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (/** @type {number[]} */ a, /** @type {number[]} */ b) =>
    (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
  assert.ok(
    ratio(hover, rest) >= 1.2,
    `the hover stands ${ratio(hover, rest)}:1 off the rest fill`
  );
  assert.ok(ratio(words, hover) >= 4.5, `the words stand ${ratio(words, hover)}:1 on the hover`);
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
      alertTitle: tier('alert-title'),
      cardTitle: tier('card-title'),
      body: tier('body'),
      control: tier('control')
    },
    { pageTitle: 32, dialogTitle: 20, alertTitle: 18, cardTitle: 17, body: 15, control: 14 }
  );
  const all = { ...sizes, ...tokenMap(stripComments(palette.slice(palette.indexOf(PHONE)))) };
  const small = Object.entries(all).filter(
    ([name, value]) => name.startsWith('--sui-font-size-') && pixels(value) < 11
  );
  assert.deepEqual(small, [], 'no text is smaller than 11px');
  const phone = tokenMap(stripComments(palette.slice(palette.indexOf(PHONE))));
  assert.deepEqual(
    { desktop: tier('note'), phone: phone['--sui-font-size-note'] },
    { desktop: 14, phone: undefined },
    "a form's help reads at its 14px label's size on every screen"
  );
  const notes = [
    ['Field', 'sui-field-help'],
    ['CheckList', 'sui-check-list-help'],
    ['ChoiceCards', 'sui-choice-cards-help'],
    ['DurationInput', 'sui-duration-hint']
  ].map(([name, line]) =>
    [
      ...stripComments(styles[`src/lib/components/${name}.svelte`]).matchAll(
        /([^{}]+)\{([^{}]*)\}/g
      )
    ]
      .filter(([, head]) => head.split(',').some((each) => each.trim() === `.${line}`))
      .flatMap(([, , body]) => [
        ...body.matchAll(
          /(?:font: var\(--sui-weight-\w+\)|font-size:) var\(--sui-font-size-(\w+)\)/g
        )
      ])
      .map(([, size]) => `${line} ${size}`)
      .at(-1)
  );
  assert.deepEqual(notes, [
    'sui-field-help note',
    'sui-check-list-help note',
    'sui-choice-cards-help note',
    'sui-duration-hint note'
  ]);
  assert.match(
    styles['src/lib/components/Field.svelte'],
    /\.sui-field-label\s*\{[^}]*font: var\(--sui-weight-semibold\) var\(--sui-font-size-control\)/
  );
  for (const [name, words] of [
    ['Switch', 'sui-switch-label'],
    ['Checkbox', 'sui-checkbox-label']
  ])
    assert.match(
      styles[`src/lib/components/${name}.svelte`],
      new RegExp(
        `\\.${words}\\s*\\{[^}]*font: var\\(--sui-weight-regular\\) var\\(--sui-font-size-control\\)`
      ),
      `the words beside a ${name} are the option, at the regular weight`
    );
  assert.match(
    styles['src/lib/components/PageHeader.svelte'],
    /font: var\(--sui-weight-bold\) var\(--sui-font-size-page-title\)/
  );
  assert.match(
    styles['src/lib/components/DataTable.svelte'],
    /\n  thead th \{[^}]*font: var\(--sui-weight-semibold\) var\(--sui-font-size-control\)/,
    'a column heading takes control type, a step under the rows it heads'
  );
  assert.doesNotMatch(
    styles['src/lib/components/DataTable.svelte'],
    /\n    thead th \{\s*font-size/,
    'a column heading keeps control type on a phone, where control type does not change'
  );
  assert.match(
    styles['src/lib/components/DataTable.svelte'],
    /\.caption:not\(\.hint\) \{\s*color: var\(--sui-text-primary\);\s*font: var\(--sui-weight-semibold\) var\(--sui-font-size-body\)/,
    "a table's caption names it as a sub-section title does, over its column headings"
  );
  for (const path of ['EmptyState', 'ErrorState'])
    assert.match(
      styles[`src/lib/components/${path}.svelte`],
      /-title \{[^}]*font: var\(--sui-weight-semibold\) var\(--sui-font-size-card-title\)/,
      `an ${path} panel's title stands a tier over the words it heads`
    );
  assert.match(
    styles['src/lib/components/ErrorState.svelte'],
    /\.over :is\(\.sui-error-state-title, \.sui-error-state-mark\) \{\s*font-size: var\(--sui-font-size-title\);/,
    'a failed refresh over a list stays a quiet line'
  );
});

test('L-20 a duration amount reads in the words face with figures of one width', () => {
  assert.doesNotMatch(
    read('src/lib/components/DurationInput.svelte'),
    /<TextInput\b[^>]*\bmono\b/,
    'a duration amount is not mono'
  );
  assert.match(
    styles['src/lib/components/TextInput.svelte'],
    /\.sui-text-input:is\(\[inputmode='decimal'\], \[inputmode='numeric'\], \[type='number'\]\) \{\s*font-variant-numeric: tabular-nums;/,
    'a field that takes a number keeps one width per figure as it is typed'
  );
});

test('L-35 a floating list or a tip arrow stands clear of its focused trigger by one gap, live and in a copy', () => {
  assert.match(read('src/lib/styles.css'), /--sui-floating-gap: 6px;/);
  assert.match(read('src/lib/components/Popover.svelte'), /offset = 6,/);
  // Every copy drawn in the page's flow: Select's own, and each list on an inline Popover.
  const copies = [
    'src/lib/components/Select.svelte',
    ...svelteFiles.filter((path) => /<Popover[^>]*inline=\{preview\}/.test(read(path)))
  ];
  assert.ok(copies.length >= 3, copies.join(', '));
  for (const path of copies)
    assert.match(read(path), /-preview \{[^}]*gap: var\(--sui-floating-gap\);/, path);
  assert.match(
    read('src/lib/components/Select.svelte'),
    /margin-block: var\(--sui-floating-gap\);/
  );
  const tooltip = read('src/lib/components/Tooltip.svelte');
  assert.match(tooltip, /const ARROW = 5;/);
  assert.match(tooltip, /const TIP_GAP = 8;/, "a tip's point clears the ring's 4px reach by 4px");
  assert.match(tooltip, /offset: TIP_GAP \+ ARROW/, 'a live tip stands its arrow past the gap');
  assert.match(
    tooltip,
    /--sui-local-tip-gap: calc\(\s*var\(--sui-focus-ring-offset\) \+ var\(--sui-focus-ring-width\) \+ var\(--sui-space-1\)\s*\);/
  );
  assert.match(
    tooltip,
    /\.preview \{[^}]*margin-block-start: calc\(var\(--sui-local-tip-gap\) \+ var\(--sui-tip-arrow\)\);/,
    'a tip copy stands its arrow past the gap'
  );
});

test('L-55 a specimen name stands a step past a field gap over its specimen, closer than any row of specimens', () => {
  const specimen = styles['src/routes/kit/Specimen.svelte'];
  assert.match(
    specimen,
    /\.specimen \{[^}]*gap: var\(--specimen-caption-gap, var\(--sui-space-4\)\);/
  );
  const widened = svelteFiles
    .filter((path) => path.startsWith('src/routes/sink/'))
    .filter((path) => read(path).includes('--specimen-caption-gap='));
  assert.deepEqual(widened, ['src/routes/sink/overlays.svelte'], 'only live tips widen a name gap');
  assert.match(
    specimen,
    /figcaption \{[^}]*var\(--sui-weight-regular\) var\(--sui-font-size-caption\)/
  );
  const rows = svelteFiles
    .filter((path) => path.startsWith('src/routes/sink/'))
    .flatMap((path) => [...read(path).matchAll(/--specimen-row-gap="var\(--sui-space-(\d+)\)"/g)]);
  assert.ok(rows.length > 0);
  for (const [, step] of rows)
    assert.ok(Number(step) > 4, `a row gap of space-${step} reads as close as a name`);
});

test('L-22 the phone reads one step larger and types at 16px', () => {
  const phone = palette.slice(palette.indexOf(PHONE));
  for (const name of ['--sui-font-size-body', '--sui-leading-body'])
    assert.match(phone, new RegExp(`${name}:`));
  assert.match(phone, /--sui-font-size-page-title:\s*var\(--sui-font-size-page-title-compact\);/);
  assert.equal(pixels(tokenMap(stripComments(palette))['--sui-font-size-page-title-compact']), 24);
  assert.match(phone, /--sui-font-size-input:\s*1rem;/);
  // The mono face reads larger than the words' face at one size, so a typed technical value
  // steps under them where the size is the page's own choice, and joins them where iOS zooms.
  const desktop = tokenMap(stripComments(palette.slice(0, palette.indexOf(PHONE))));
  assert.equal(pixels(desktop['--sui-font-size-input-mono']), 13.5);
  assert.match(phone, /--sui-font-size-input-mono:\s*1rem;/);
  for (const path of [
    'src/lib/components/TextInput.svelte',
    'src/lib/components/Textarea.svelte',
    'src/lib/components/CopyableLinkField.svelte',
    'src/lib/components/PatternEntries.svelte'
  ])
    assert.ok(
      styles[path].includes('var(--sui-font-size-input-mono)'),
      `${path} types its technical value at the mono input size`
    );
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

test("L-38 a phone stacks a check list's options edge to edge, one 44px row each", () => {
  const phone = /@media \(max-width: 47\.9375rem\) \{\s*\.sui-check-list-items \{([^}]*)\}/.exec(
    styles['src/lib/components/CheckList.svelte']
  )?.[1];
  assert.match(phone ?? '', /\bgap: 0;/);
});

test('L-35 a form stacks its fields 20px apart and a dialog 24px, both a step over the 12px inside a field', () => {
  assert.match(
    stripComments(styles['src/lib/components/Modal.svelte']),
    /\.sui-modal-body \{[^}]*gap: var\(--sui-space-6\);/
  );
  for (const page of ['combobox', 'select', 'field'])
    assert.match(
      styles[`src/routes/sink/${page}.svelte`],
      /\.form \{\s*display: grid;\s*gap: var\(--sui-space-5\);/,
      `the ${page} page's form stacks its fields another distance apart`
    );
  const forms = svelteFiles
    .filter((path) => path.startsWith('src/routes/sink/'))
    .flatMap((path) =>
      (read(path).match(/<form class="form"[\s\S]*?<\/form>/g) ?? [])
        .filter((form) => /<Button[^>]*type="submit"/.test(form))
        .map((form) => [path, form])
    );
  assert.ok(forms.length >= 3);
  for (const [path, form] of forms) {
    assert.match(
      form,
      /<Button[^>]*type="submit"[^>]*class="action"/,
      `${path} ends a form on a bare action`
    );
    assert.match(
      styles[path],
      /\.form > :global\(\.action\) \{[^}]*margin-block-start: var\(--sui-space-1\);/,
      `${path} sets its action at the fields' gap`
    );
  }
});

test('L-45 the add tone labels its entry in the primary ink inside its dashed edge', () => {
  assert.match(
    stripComments(styles['src/lib/components/Button.svelte']),
    /\.sui-button\[data-tone='add'\] \{[^}]*border-style: dashed;\s*color: var\(--sui-text-primary\);/
  );
});

test('L-35 a field label and every group name wear one ink at one weight and leading, over a compact "Required"', () => {
  const names = {
    'src/lib/components/Field.svelte': 'sui-field-label',
    'src/lib/components/SearchField.svelte': 'sui-search-field-label',
    'src/lib/components/CheckList.svelte': 'sui-check-list-legend',
    'src/lib/components/ChoiceCards.svelte': 'sui-choice-cards-legend',
    'src/lib/components/SegmentedControl.svelte': 'sui-segmented-caption'
  };
  for (const [path, name] of Object.entries(names)) {
    const rule = new RegExp(`\\n  \\.${name} \\{([^}]*)\\}`).exec(styles[path])?.[1] ?? '';
    assert.match(rule, /\bcolor: var\(--sui-text-primary\);/, `${name} wears another ink`);
    assert.match(
      rule,
      /\bfont: var\(--sui-weight-semibold\) var\(--sui-font-size-control\) \/ var\(--sui-leading-note\)/,
      `${name} is set in another weight, size or leading`
    );
    assert.match(rule, /\btext-wrap: pretty;/, `${name} can leave one word on its last line`);
  }
  for (const [path, name] of [
    ['src/lib/components/Field.svelte', 'sui-field-required'],
    ['src/lib/components/CheckList.svelte', 'sui-check-list-required'],
    ['src/lib/components/ChoiceCards.svelte', 'sui-choice-cards-required']
  ]) {
    const rule = new RegExp(`\\n  \\.${name} \\{([^}]*)\\}`).exec(styles[path])?.[1] ?? '';
    assert.match(rule, /\bcolor: var\(--sui-text-muted\);/, `${name} wears another ink`);
    assert.match(
      rule,
      /\bfont(?:-size)?: (?:var\(--sui-weight-medium\) )?var\(--sui-font-size-caption\)/,
      `${name} is not a caption step under the label it marks`
    );
    assert.match(rule, /var\(--sui-weight-medium\)/, `${name} is set in another weight`);
  }
});

test('L-35 every label and group name stands the field gap over its control', () => {
  for (const [path, rule] of /** @type {[string, RegExp][]} */ ([
    ['src/lib/components/Field.svelte', /\n  \.sui-field \{[^}]*\bgap: var\(--sui-field-gap\);/],
    ['src/lib/components/SearchField.svelte', /\bgap: var\(--sui-field-gap\);/],
    ['src/lib/components/CheckList.svelte', /\bgap: var\(--sui-field-gap\);/],
    [
      'src/lib/components/ChoiceCards.svelte',
      /\n  \.sui-choice-cards \{[^}]*\bgap: var\(--sui-field-gap\);/
    ],
    [
      'src/lib/components/SegmentedControl.svelte',
      /\n  \.sui-segmented \{\s*row-gap: var\(--sui-field-gap\);/
    ]
  ]))
    assert.match(styles[path], rule, `${path} sets its name another gap over its control`);
});

test('L-35 an error under a hint stands a copy gap further from it than the hint from its control', () => {
  for (const [name, pair] of [
    ['Field', '.sui-field-help + .sui-field-error'],
    ['DurationInput', '.sui-duration-hint + .sui-duration-problem']
  ])
    assert.match(
      stripComments(styles[`src/lib/components/${name}.svelte`]),
      new RegExp(
        `${pair.replace(/[.+]/g, (c) => `\\${c}`)} \\{\\s*margin-block-start: var\\(--sui-space-2\\);`
      ),
      name
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
        return size === 'note' ? [`${path} ${selector}: ${weight}`] : [];
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

test('L-49 an off switch track sits in the field well in every theme', () => {
  const tracks = [...stripComments(palette).matchAll(/--sui-switch-track-off:\s*([^;]+);/g)].map(
    ([, value]) => value.trim()
  );
  assert.ok(tracks.length >= 2, 'a light and a dark track');
  assert.deepEqual(new Set(tracks), new Set(['var(--sui-field-well)']));
});

test("L-49 an off switch's thumb draws a button's edge", () => {
  assert.match(
    styles['src/lib/components/Switch.svelte'],
    /input:not\(:checked\) \+ \.sui-switch-track::after\s*\{\s*box-shadow:\s*inset 0 0 0 var\(--sui-stroke\) var\(--sui-control-border\),/
  );
});

test('L-50 a dark segmented track sits in the well an off switch does', () => {
  const tracks = [...stripComments(palette).matchAll(/--sui-segment-track:\s*([^;]+);/g)].map(
    ([, value]) => value.trim()
  );
  assert.equal(tracks.length, 3, 'a light track and two dark ones');
  assert.deepEqual(tracks.slice(1), ['var(--sui-field-well)', 'var(--sui-field-well)']);
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

test('L-53 a chip inside a field takes the field radius less its edge and inset', () => {
  const tokens = read('src/lib/styles.css');
  assert.match(
    tokens,
    /--sui-radius-field-chip: calc\(\s*var\(--sui-radius-control\) - var\(--sui-stroke\) - var\(--sui-field-chip-inset\)\s*\);/
  );
  assert.match(
    read('src/lib/components/CopyButton.svelte'),
    /\.sui-copy-button\.bare,[^{]*\{[^}]*border-radius: var\(--sui-radius-field-chip\);/
  );
  assert.match(
    read('src/lib/components/PatternEntries.svelte'),
    /\.sui-pattern-remove::before,[^{]*\{[^}]*border-radius: var\(--sui-radius-field-chip\);/
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

test("L-68 icon sizes are named tiers that grow with the text and land on whole pixels, 16px beside a control's words", () => {
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

  const smallBesideWords = svelteFiles.flatMap((path) =>
    [...read(path).matchAll(/<Button\b[\s\S]*?<\/Button\s*>/g)].flatMap(([button]) =>
      [...button.matchAll(/<Icon\b[^>]*\bsize="(?!base")[a-z]+"/g)].map(
        ([match]) => `${path}: ${match}`
      )
    )
  );
  assert.deepEqual(smallBesideWords, [], 'a glyph in a button takes the 16px tier of its words');
  assert.match(
    read('src/lib/components/Select.svelte'),
    /<Icon name="chevron-down" size="base" \/>/
  );
  assert.match(
    read('src/lib/components/SearchField.svelte'),
    /<Icon name="search" size="base"/,
    "a search field's magnifier takes the 16px tier of the words beside it"
  );
  for (const [path, name] of [
    ['src/lib/components/Button.svelte', 'button'],
    ['src/lib/components/IconButton.svelte', 'icon-button'],
    ['src/lib/components/InheritControl.svelte', 'inherit'],
    ['src/lib/components/AdditionPicker.svelte', 'addition']
  ]) {
    const spinner =
      new RegExp(`\\.sui-${name}-spinner \\{([^}]*)\\}`).exec(styles[path])?.[1] ?? '';
    assert.deepEqual(
      ['block-size', 'inline-size', 'margin'].map(
        (property) => new RegExp(`(?:^|\\s)${property}: ([^;]*);`).exec(spinner)?.[1]
      ),
      [
        'calc(var(--sui-icon-base) - 2 * var(--sui-stroke))',
        'calc(var(--sui-icon-base) - 2 * var(--sui-stroke))',
        'var(--sui-stroke)'
      ],
      `${path}: the spinner is a 14px ring in the glyph's 16px slot, as light as the glyphs`
    );
    assert.match(
      spinner,
      /solid color-mix\(in srgb, currentColor 55%, transparent\);/,
      `${path}: the spinner's track keeps 55% of its ink, so the ring stays whole on a fill`
    );
  }
});

test('L-11 every floating list lights its row with the accent veils, presses it a step further and rounds it alike', () => {
  for (const path of [
    'src/lib/components/Select.svelte',
    'src/lib/components/Combobox.svelte',
    'src/lib/components/ActionMenu.svelte',
    'src/lib/components/AdditionPicker.svelte'
  ]) {
    const css = stripComments(styles[path]);
    assert.match(css, /background-color: var\(--sui-list-highlight\)/, path);
    assert.match(css, /background-color: var\(--sui-list-pressed\)/, `${path} has no press step`);
    assert.match(
      css,
      /border-radius: var\(--sui-radius-popover-row\)/,
      `${path} rounds its rows apart`
    );
    assert.doesNotMatch(
      css,
      /option[^{]*\{[^}]*background-color: var\(--sui-(row-hover|interactive-hover-layer)\)/,
      path
    );
  }
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

test('L-72 a floating layer on dark stands off its ground by the raised ground and a rim of light, on the control edge, with divider lines inside', () => {
  for (const selector of [
    ":root[data-theme='dark']",
    ':root:not([data-theme], [data-sui-theme])'
  ]) {
    const tokens = tokenMap(stripComments(block(selector)));
    assert.equal(tokens['--sui-popover-border'], 'var(--sui-border-control)', selector);
    assert.equal(tokens['--sui-popover-bg'], 'var(--sui-surface-raised)', selector);
    assert.equal(tokens['--sui-dialog-bg'], 'var(--sui-surface-raised)', selector);
    assert.equal(tokens['--sui-surface-control'], 'var(--sui-surface-base)', selector);
    assert.equal(
      tokens['--sui-toast-border'],
      'color-mix(in srgb, var(--sui-popover-border) 75%, var(--sui-popover-bg))',
      `${selector} a toast's edge leans a quarter of the way to its ground`
    );
    for (const lift of ['--sui-shadow-popover', '--sui-shadow-dialog'])
      assert.match(tokens[lift], /^inset 0 1px 0 rgb\(255 255 255 \/ 6%\),/, `${selector} ${lift}`);
  }
  assert.equal(
    tokenMap(stripComments(block("[data-sui-theme='light']")))['--sui-popover-border'],
    'var(--sui-border-control)'
  );
  assert.match(
    styles['src/lib/components/Toaster.svelte'],
    /border: var\(--sui-stroke\) solid var\(--sui-toast-border, var\(--sui-popover-border\)\);/,
    'a toast falls back to the control edge'
  );
  assert.equal(
    tokenMap(stripComments(block("[data-sui-theme='light']")))['--sui-toast-border'],
    'color-mix(in srgb, var(--sui-popover-border) 75%, var(--sui-popover-bg))',
    "a light toast's edge leans a quarter of the way to its ground too, so it never reads as a field"
  );
  assert.match(
    styles['src/lib/components/Select.svelte'],
    /\.sui-select-heading[^{]*\{[^}]*border-block-start: var\(--sui-stroke\) solid var\(--sui-border-divider\)/
  );
  assert.match(
    styles['src/lib/components/ActionMenu.svelte'],
    /\.sui-action-menu-separator \{[^}]*background-color: var\(--sui-border-divider\)/
  );
  const tip =
    /\.sui-tooltip \{[^}]*\}/.exec(styles['src/lib/components/Tooltip.svelte'])?.[0] ?? '';
  assert.match(
    tip,
    /--sui-local-tip-ground: var\(--sui-text-primary\);/,
    'a tip inverts its ground'
  );
  assert.match(tip, /border: var\(--sui-stroke\) solid var\(--sui-local-tip-ground\);/);
  assert.match(tip, /color: var\(--sui-surface-base\);/, "a tip's words take the base surface");
  assert.match(
    tip,
    /border-radius: var\(--sui-radius-control\);/,
    'a tip takes the control radius'
  );
  assert.match(
    tip,
    /font: var\(--sui-weight-regular\) var\(--sui-font-size-caption\) \/ var\(--sui-leading-compact\)/,
    'a tip is caption type (L-25)'
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

test('L-53 a shadow that lifts a part is two layers in every palette block, and L-54 a popover lifts on a tight one in both themes', () => {
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
      /--sui-(shadow-plate|shadow-popover|shadow-tooltip|shadow-dialog|segment-thumb-shadow):([^;]+);/g
    )
  ].filter(([, , value]) => value.trim() !== 'initial');
  assert.equal(found.length, 13, 'four shadows in each of three palette blocks, and a light tip');
  assert.equal(
    [...palette.matchAll(/--sui-shadow-tooltip: initial;/g)].length,
    2,
    'a dark tip leaves its own lift unset'
  );
  assert.match(
    read('src/lib/components/Tooltip.svelte'),
    /box-shadow: var\(--sui-shadow-tooltip, var\(--sui-shadow-plate\)\);/,
    'a dark tip sits on a plate shadow, not a popover lift'
  );
  const lifts = found.filter(([, name]) => name === 'shadow-popover').map(([, , value]) => value);
  assert.equal(lifts.length, 3, 'a popover lift in each palette block');
  for (const each of lifts)
    for (const [, y, blur] of each.matchAll(/(?:^|,)\s*0 (\d+)px (\d+)px/g))
      assert.ok(Number(y) <= 8 && Number(blur) <= 20, `a popover lifts ${y}px with ${blur}px`);
  const lift = lifts[0];
  const shade = Number(/--sui-shadow-color: rgb\(0 0 0 \/ (\d+)%\)/.exec(palette)?.[1]);
  const contact =
    /^\s*0 1px \d+px (?:color-mix\(in srgb, var\(--sui-shadow-color\) (\d+)%|var\(--sui-shadow-color\))/.exec(
      lift
    );
  assert.ok(contact, 'a light popover opens on a 1px contact line');
  const dark = (shade * Number(contact[1] ?? 100)) / 100;
  assert.ok(dark <= 8, `a light popover's contact line is ${dark}% black`);
  const tip = /** @type {string} */ (found.find(([, name]) => name === 'shadow-tooltip')?.[2]);
  const [tipContact, tipLift] = [
    ...tip.matchAll(/0 (\d+)px (\d+)px color-mix\(in srgb, var\(--sui-shadow-color\) (\d+)%/g)
  ];
  assert.equal(tipContact[1], '1', 'a light tip opens on the popover contact line');
  assert.ok(Number(tipContact[3]) <= Number(contact[1]), 'a light tip contact line is no darker');
  assert.ok(Number(tipLift[1]) <= 8 && Number(tipLift[2]) <= 20, 'a light tip lifts tightly');
  const ambient = Number(
    [...lift.matchAll(/color-mix\(in srgb, var\(--sui-shadow-color\) (\d+)%/g)].at(-1)?.[1]
  );
  assert.ok(Number(tipLift[3]) > ambient, 'a light tip lifts on a firmer layer than a menu');
  const toast = /--sui-shadow-toast:([^;]+);/.exec(palette)?.[1] ?? '';
  const [toastContact, toastLift] = [
    ...toast.matchAll(/0 (\d+)px (\d+)px color-mix\(in srgb, var\(--sui-shadow-color\) (\d+)%/g)
  ];
  assert.equal(toastContact?.[1], '1', 'a light toast opens on the popover contact line');
  assert.ok(
    Number(toastContact[3]) <= Number(contact[1]),
    'a light toast contact line is no darker'
  );
  assert.ok(
    Number(toastLift[1]) <= 3 &&
      Number(toastLift[2]) <= 8 &&
      (shade * Number(toastLift[3])) / 100 <= 6,
    'a light toast lifts on a lighter layer than a menu, 3px down, 8px wide, about 5% black'
  );
  const darkToasts = [...palette.matchAll(/--sui-shadow-toast:([^;]+);/g)].slice(1);
  assert.equal(darkToasts.length, 2, 'a toast lift in each dark block');
  for (const [, each] of darkToasts) {
    assert.match(
      each,
      /inset 0 1px 0 rgb\(255 255 255 \/ 6%\)/,
      'a dark toast keeps its rim of light'
    );
    const [, y, blur, share] =
      [
        ...each.matchAll(/0 (\d+)px (\d+)px color-mix\(in srgb, var\(--sui-shadow-color\) (\d+)%/g)
      ].at(-1) ?? [];
    assert.ok(
      Number(y) <= 4 && Number(blur) <= 12 && (45 * Number(share)) / 100 <= 20,
      'a dark toast lifts as a light one does, at about 20% black'
    );
  }
  assert.match(
    read('src/lib/components/Toaster.svelte'),
    /box-shadow: var\(--sui-shadow-toast, var\(--sui-shadow-popover\)\);/
  );
  assert.deepEqual(
    found.filter(([, , value]) => layers(value) < 2).map(([, name]) => name),
    []
  );
});

test('L-58 a scrim keeps the page behind a dialog legible: 28% light, 48% dark, a 2px blur', () => {
  assert.deepEqual(
    [...palette.matchAll(/--sui-scrim: rgb\(0 0 0 \/ (\d+)%\);/g)].map(([, alpha]) => alpha),
    ['28', '48', '48'],
    'the light scrim, then the dark one in each dark block'
  );
  assert.deepEqual(
    [...palette.matchAll(/--sui-scrim-blur: ([^;]+);/g)].map(([, blur]) => blur),
    ['2px']
  );
});

test('L-58 a dialog drawn in place lifts softly in both themes, the dark one under its rim of light, and L-72 a light dialog wears the subtle edge and a dark one a third of the way to the control edge', () => {
  assert.deepEqual(
    [...palette.matchAll(/--sui-shadow-dialog-in-place:\s*([^;]+);/g)].map(([, lift]) =>
      lift.replace(/\s+/g, ' ')
    ),
    [
      '0 1px 2px color-mix(in srgb, var(--sui-shadow-color) 50%, transparent), 0 4px 12px color-mix(in srgb, var(--sui-shadow-color) 25%, transparent)',
      ...Array(2).fill(
        'inset 0 1px 0 rgb(255 255 255 / 6%), 0 1px 2px color-mix(in srgb, var(--sui-shadow-color) 50%, transparent), 0 4px 12px color-mix(in srgb, var(--sui-shadow-color) 25%, transparent)'
      )
    ],
    'the light block, then each dark block'
  );
  assert.deepEqual(
    [...palette.matchAll(/--sui-dialog-border: ([^;]+);/g)].map(([, edge]) =>
      edge.replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')')
    ),
    [
      'var(--sui-border-subtle)',
      ...Array(2).fill(
        'color-mix(in srgb, var(--sui-border-control) 35%, var(--sui-border-subtle))'
      )
    ],
    'the light block, then each dark block'
  );
  assert.match(
    read('src/lib/components/Modal.svelte'),
    /\.sui-modal\.preview \{[^}]*box-shadow: var\(--sui-shadow-dialog-in-place\);/
  );
});

test("L-58 the band a line parts off sits on a faint tint of the field well, and a refused save's wash wears a form error's edge over it and half that edge under it", () => {
  const modal = read('src/lib/components/Modal.svelte');
  assert.match(
    modal,
    /\.sui-modal-error:has\(> \.sui-modal-error-line\):has\(\+ \.sui-modal-foot\)::before \{\s*border-block-start-color: color-mix\(in srgb, var\(--sui-danger\) 40%, transparent\);/
  );
  assert.match(
    modal,
    /\.sui-modal-error:has\(\+ \.sui-modal-foot\) > \.sui-modal-error-line \{\s*box-shadow: inset 0 calc\(-1 \* var\(--sui-stroke\)\) 0\s*color-mix\(in srgb, var\(--sui-danger\) 20%, transparent\);/
  );
  assert.match(
    modal,
    /\.sui-modal-error \+ \.sui-modal-foot \{\s*--sui-local-button-bg: var\(--sui-dialog-foot-control, var\(--sui-surface-raised\)\);\s*background: var\(--sui-dialog-foot-bg\);/
  );
  assert.deepEqual(
    [
      ...palette.matchAll(
        /--sui-dialog-foot-bg: color-mix\(in srgb, var\(--sui-field-well\) (\d+)%, var\(--sui-dialog-bg\)\);/g
      )
    ].map(([, share]) => share),
    ['55', '65', '65'],
    'the light band, then the dark one in each dark block'
  );
});

test("L-58 a refused save says why on a form error's danger wash, in a form error's words", () => {
  const wash =
    /background: color-mix\(in srgb, var\(--sui-danger-tint\) (\d+)%, var\(--sui-[a-z-]+\)\);/;
  const form = wash.exec(read('src/lib/components/FormError.svelte'));
  const line = /\.sui-modal-error-line \{[^}]*\}/.exec(read('src/lib/components/Modal.svelte'));
  assert.ok(form && line, 'a form error or the dialog error line lost its rule');
  assert.equal(wash.exec(line[0])?.[1], form[1], "the dialog's reason left the form error's wash");
  const words = (/** @type {string} */ rule) =>
    ['color', 'font'].map(
      (property) => new RegExp(`(?:^|\\s)${property}: ([^;]*);`).exec(rule)?.[1]
    );
  assert.deepEqual(
    words(line[0]),
    words(
      /\.sui-form-error-message \{[^}]*\}/.exec(read('src/lib/components/FormError.svelte'))?.[0] ??
        ''
    ),
    "the dialog's reason reads in a form error's ink and type"
  );
  assert.match(
    read('src/lib/components/Modal.svelte'),
    /\.sui-modal-error-mark \{[^}]*color: var\(--sui-danger\);/,
    "the dialog's refusal mark keeps the danger ink"
  );
  const panel = /var\(--sui-danger-tint\) (\d+)%/.exec(
    read('src/lib/components/ErrorState.svelte')
  );
  assert.equal(panel?.[1], form[1], "an error panel left the form error's wash");
  assert.equal(form[1], '65', 'a refusal wash parts itself from the ground it sits on');
});

test("L-9 a control's edge firms one step on hover, the same in every theme, and a light field wears a button's edge", () => {
  const alpha = (/** @type {string} */ name) =>
    [...palette.matchAll(new RegExp(`--sui-${name}: rgb\\(\\d+ \\d+ \\d+ / (\\d+)%\\);`, 'g'))].map(
      ([, value]) => Number(value)
    );
  const [rest, hover] = [alpha('border-control'), alpha('control-border-hover')];
  assert.equal(rest.length, 3, 'the light, dark and system dark blocks');
  assert.deepEqual(
    rest.map((value, index) => hover[index] - value),
    [12, 12, 12]
  );
  const frames = alpha('field-frame');
  assert.equal(frames[0], rest[0], 'a light field and a button share one edge');
  frames.forEach((frame, index) =>
    assert.ok(frame >= rest[index], `a field's ${frame}% frame is lighter than a button's edge`)
  );
  const recesses = [...palette.matchAll(/--sui-field-recess(-hover)?: var\((--sui-[a-z-]+)\);/g)];
  const [still, deeper] = [false, true].map((hovered) =>
    recesses.filter(([, hover]) => Boolean(hover) === hovered).map(([, , token]) => token)
  );
  assert.equal(still.length, 3, 'the light, dark and system dark blocks');
  still.forEach((token, index) =>
    assert.notEqual(deeper[index], token, `the recess deepens on hover with its frame (${token})`)
  );
});

test('L-10 a read-only field frames its value between a keyline and an editable frame', () => {
  const alpha = (/** @type {string} */ name) =>
    [...palette.matchAll(new RegExp(`--sui-${name}: rgb\\(\\d+ \\d+ \\d+ / (\\d+)%\\);`, 'g'))].map(
      ([, value]) => Number(value)
    );
  const [frames, keylines, editable] = [
    alpha('field-readonly-frame'),
    alpha('border-subtle'),
    alpha('field-frame')
  ];
  assert.equal(frames.length, 3, 'the light, dark and system dark blocks');
  frames.forEach((frame, index) => {
    assert.ok(frame > keylines[index], `read-only frame ${frame}% is no firmer than a keyline`);
    assert.ok(
      frame < editable[index],
      `read-only frame ${frame}% is no lighter than a field frame`
    );
  });
  for (const path of [
    'src/lib/components/TextInput.svelte',
    'src/lib/components/Textarea.svelte',
    'src/lib/internal/JoinedField.svelte'
  ])
    assert.match(
      styles[path],
      /background-color: var\(--sui-field-readonly\);\s*border-color: var\(--sui-field-readonly-frame\);/,
      `${path} frames a read-only value with another edge`
    );
});

test('L-10 a disabled field sits in a quieter tint of the well, firmer than a read-only one', () => {
  const share = (/** @type {string} */ name) =>
    [
      ...palette.matchAll(
        new RegExp(`--sui-${name}: color-mix\\(in srgb, var\\(--sui-field-well\\) (\\d+)%`, 'g')
      )
    ].map(([, value]) => Number(value));
  const [off, reads] = [share('field-disabled'), share('field-readonly')];
  assert.equal(off.length, 3, 'the light, dark and system dark blocks');
  off.forEach((value, index) => {
    assert.ok(value < 100, `a disabled field fills the whole well (${value}%)`);
    assert.ok(value > reads[index], `a disabled field is no firmer than a read-only one`);
  });
  for (const path of [
    'src/lib/components/TextInput.svelte',
    'src/lib/components/Textarea.svelte',
    'src/lib/internal/JoinedField.svelte'
  ])
    assert.match(
      styles[path],
      /background-color: var\(--sui-field-disabled\);\s*border-color: transparent;/,
      `${path} fills a disabled field another way`
    );
});

test('L-41 a field keeps its frame and wears one ring 2px off it in every state, as every button does', () => {
  for (const [path, rule] of [
    ['src/lib/components/TextInput.svelte', '.sui-text-input:focus-visible'],
    ['src/lib/components/Textarea.svelte', '.sui-textarea:focus-visible'],
    ['src/lib/components/Select.svelte', '.sui-select-control:focus-visible'],
    [
      'src/lib/internal/JoinedField.svelte',
      '.sui-joined:has(.sui-joined-value :global(:focus-visible))'
    ]
  ]) {
    assert.ok(
      styles[path].includes(
        `${rule} {\n    outline: var(--sui-focus-ring-width) solid var(--sui-focus);\n    outline-offset: var(--sui-focus-ring-offset);\n  }`
      ),
      `${path} stands its ring 2px off its own frame, as a free-standing control does`
    );
    assert.match(
      styles[path],
      /(\[aria-invalid='true'\]|\.invalid)[^{]*focus-visible[^{]*\{\s*outline-color: var\(--sui-focus-danger\);\s*\}/,
      `${path} rings an invalid field in the danger color`
    );
    assert.match(
      styles[path],
      /border-color: var\(--sui-danger-edge\);/,
      `${path} draws its danger edge from --sui-danger-edge`
    );
    assert.match(
      styles[path],
      /--sui-field-recess: var\(--sui-field-danger-recess\);\s*--sui-field-recess-hover: var\(--sui-field-danger-recess-hover\);\s*border-color: var\(--sui-danger-edge\);/,
      `${path} tints an invalid field's recess with its edge's red`
    );
    assert.match(
      styles[path],
      /:not\([^{]*\{\s*--sui-field-recess: var\(--sui-field-recess-focus\);\s*border-color: var\(--sui-field-frame-focus\);\s*border-block-end-color: var\(--sui-field-border-focus\);\s*\}/,
      `${path} leans an editable frame, its baseline and its recess toward the ring on focus`
    );
    assert.doesNotMatch(
      styles[path],
      /border-color: var\(--sui-danger(-hover)?\);/,
      `${path} never draws a pastel danger ink as its edge on dark`
    );
    assert.doesNotMatch(
      styles[path],
      /--sui-focus-ring-edge|outline-width:|border-color: var\(--sui-focus\)/,
      `${path} draws one ring whatever its frame's state`
    );
  }
  for (const name of ['Switch', 'Checkbox', 'ChoiceCards'])
    assert.match(
      styles[`src/lib/components/${name}.svelte`],
      /(\[aria-invalid='true'\]|\.invalid)[^{]*focus-visible[^{]*\{\s*outline-color: var\(--sui-focus-danger\);\s*\}/,
      `a ${name} that says it is invalid rings in its edge's red, as a field does`
    );
  assert.match(
    styles['src/lib/components/ChoiceCards.svelte'],
    /\.sui-choice-card input:focus-visible \{\s*outline: var\(--sui-focus-ring-width\) solid var\(--sui-focus\);\s*outline-offset: var\(--sui-focus-ring-offset\);\s*\}/,
    "every choice card's ring stands 2px off its own edge, as a field's does"
  );
  assert.match(
    styles['src/lib/components/Button.svelte'],
    /\.sui-button:focus-visible \{\s*outline: var\(--sui-focus-ring-width\) solid var\(--sui-focus\);\s*outline-offset: var\(--sui-focus-ring-offset\);\s*\}/,
    "every button's ring stands 2px off its own edge, as a field's does"
  );
  assert.doesNotMatch(
    stripComments(styles['src/lib/components/Button.svelte']),
    /\.sui-button[^{,]*:focus-visible[^{]*\{[^}]*(--sui-focus-ring-edge|--sui-focus-ring-flush|border-color: var\(--sui-focus\))/,
    'no button tone draws a flush ring on its edge'
  );
});

test('L-9 an invalid choice card keeps its empty dot neutral', () => {
  assert.doesNotMatch(
    styles['src/lib/components/ChoiceCards.svelte'],
    /\.invalid[^{}]*\.sui-choice-card-dot \{[^}]*--sui-danger/
  );
});

test('L-55 a choice card takes the field radius, not a surface card radius', () => {
  const cards = styles['src/lib/components/ChoiceCards.svelte'];
  assert.match(cards, /\.sui-choice-card \{[^}]*border-radius: var\(--sui-radius-control\);/);
});

test("L-12 a choice card's dot draws no ground of its own, so it takes the card's", () => {
  const dot = /^\s*\.sui-choice-card-dot \{([^}]*)\}/m.exec(
    styles['src/lib/components/ChoiceCards.svelte']
  );
  assert.ok(dot, 'the dot rule');
  assert.doesNotMatch(dot[1], /background/);
});

test("L-12 a choice card hovers as a field does, not with a control's veil", () => {
  const cards = styles['src/lib/components/ChoiceCards.svelte'];
  assert.match(cards, /background-color: var\(--sui-field-hover\);/);
  assert.doesNotMatch(cards, /--sui-interactive-hover-layer/);
});

test('L-94 a field or group message takes the 16px mark 8px from its words', () => {
  const marks = {
    Field: ['sui-field-error-mark', 'sui-field-error'],
    CheckList: ['sui-check-list-mark', 'sui-check-list-error'],
    ChoiceCards: ['sui-choice-cards-mark', 'sui-choice-cards-error'],
    ColorPicker: ['error-mark', 'error'],
    DurationInput: ['sui-duration-mark', 'sui-duration-problem'],
    SearchField: ['sui-search-field-error-mark', 'sui-search-field-error'],
    Switch: ['sui-switch-mark', 'sui-switch-error']
  };
  for (const [name, [mark, line]] of Object.entries(marks)) {
    const path = `src/lib/components/${name}.svelte`;
    assert.match(
      styles[path],
      new RegExp(`\\.${line} \\{[^}]*column-gap: var\\(--sui-space-2\\)`),
      `${name}'s message mark does not stand 8px from its words, as a button's icon does`
    );
    assert.ok(
      read(path).includes(`<span class="${mark}"><Icon name="alert" size="base" /></span>`),
      `${name}'s message mark is not the 16px glyph`
    );
    assert.ok(
      new RegExp(
        `\\.${mark} \\{[^}]*margin-block: round\\(calc\\(\\(1cap - var\\(--sui-icon-base\\)\\) / 2\\), 1px\\)`
      ).test(styles[path]),
      `${name}'s mark is not centred on the cap as a 16px glyph`
    );
  }
});

test("L-94 a segmented option's and a tab's icon and count stand 8px off, as a button's do", () => {
  const rows = {
    Button: 'sui-button',
    Tabs: 'sui-tabs-tab',
    SegmentedControl: 'sui-segmented-label'
  };
  for (const [name, row] of Object.entries(rows))
    assert.match(
      styles[`src/lib/components/${name}.svelte`],
      new RegExp(`\\n  \\.${row} \\{[^}]*\\n    gap: var\\(--sui-space-2\\);`),
      `${name}'s marks do not stand 8px from its words`
    );
});

test('L-25 a count beside a label is compact type at 600', () => {
  assert.match(
    styles['src/lib/internal/Count.svelte'],
    /font: var\(--sui-weight-semibold\) var\(--sui-font-size-compact\) \//
  );
});

test('L-94 a form error summary and an error state take the 16px mark 8px from their words', () => {
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
  const state = 'src/lib/components/ErrorState.svelte';
  assert.match(read(state), /sui-error-state-mark"><Icon name="alert" size="base" \/>/);
  assert.match(
    styles[state],
    /\.sui-error-state-copy \{[^}]*gap: var\(--sui-title-copy-gap\) var\(--sui-space-2\)/
  );
  assert.match(
    styles[state],
    /\.sui-error-state-copy > p \{\s*grid-column: 1 \/ -1;/,
    'the explanation and step keep the whole width, so the mark never narrows them'
  );
  assert.doesNotMatch(styles[state], /-retry \{\s*margin-inline-start/);
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
  // Every row holds a hidden copy of its words at the current weight in the words' own cell,
  // so the current row's words step up to 500 and turning current never rewraps a label.
  for (const [name, label] of [
    ['SideNav', 'sui-side-nav-label'],
    ['Rail', 'sui-rail-label'],
    ['PageToc', 'sui-page-toc-label']
  ]) {
    const path = `src/lib/components/${name}.svelte`;
    const css = stripComments(styles[path]);
    assert.ok(
      new RegExp(`class=[^>]*${label}[^>]*data-label=\\{[^}]+\\}\\s*><span>`).test(read(path)),
      `${path}: the words stand in a span beside a data-label copy`
    );
    assert.match(
      css,
      new RegExp(
        `\\.${label}::after \\{[^}]*content: attr\\(data-label\\) / '';[^}]*font-weight: var\\(--sui-weight-medium\\);[^}]*visibility: hidden;`
      ),
      path
    );
    assert.match(
      css,
      new RegExp(
        `\\[aria-current[^\\]]*\\] \\.${label} > span \\{\\s*font-weight: var\\(--sui-weight-medium\\);`
      ),
      path
    );
  }
});

test("L-56 a toast's symbol tile mixes the danger ink into the toast's own ground", () => {
  assert.match(
    stripComments(read('src/lib/components/Toaster.svelte')),
    /\.sui-toast-mark \{[^}]*background: color-mix\(\s*in oklch,\s*var\(--sui-danger\) var\(--sui-toast-failure\),\s*var\(--sui-popover-bg\)\s*\);/,
    "the shared danger tint sinks into a dark toast's raised ground"
  );
});

test("L-72 a failed toast's edge carries a quarter of the danger ink", () => {
  const toaster = stripComments(read('src/lib/components/Toaster.svelte'));
  assert.match(toaster, /failed: item\.tone === 'danger'/);
  assert.match(
    toaster,
    /\.failed \{\s*border-color: color-mix\(\s*in oklch,\s*var\(--sui-danger\) var\(--sui-toast-failure-edge\),\s*var\(--sui-toast-border, var\(--sui-popover-border\)\)\s*\);/,
    'a failure in a mixed stack reads as one only by its small tile'
  );
});

test('L-56 L-72 a failed toast takes a larger share of the danger ink on dark', () => {
  const shares = (/** @type {string} */ selector) => {
    const tokens = tokenMap(stripComments(block(selector)));
    return [tokens['--sui-toast-failure'], tokens['--sui-toast-failure-edge']];
  };
  assert.deepEqual(shares("[data-sui-theme='light']"), ['16%', '25%']);
  for (const selector of [":root[data-theme='dark']", ':root:not([data-theme], [data-sui-theme])'])
    assert.deepEqual(
      shares(selector),
      ['24%', '28%'],
      `${selector}: the tile reads dusty grey at a light share, and an edge past 28% reads as a selection`
    );
});

test("L-101 a toast's Dismiss draws its glyph at 18px", () => {
  assert.match(
    stripComments(read('src/lib/components/Toaster.svelte')),
    /\.sui-toast-dismiss \{\s*--sui-icon-base: var\(--sui-icon-md\);/,
    'a 16px close glyph reads weak beside the action and the failure tile'
  );
});

test('L-16 the gold decision edge is one stroke wide', () => {
  assert.equal(
    tokenMap(stripComments(palette))['--sui-decision-border-width'],
    '1px',
    'a 2px gold frame repeats the gold Save and outweighs the title'
  );
});

test("L-16 a busy save bar dims its edge and buttons but keeps its live copy's ink", () => {
  const css = stripComments(read('src/lib/components/SaveBar.svelte'));
  assert.doesNotMatch(
    css,
    /\.busy \.title \{/,
    'a saving bar mutes its title, so the live status reads as disabled'
  );
  assert.match(
    css,
    /\.subtitle \{[^}]*text-wrap: balance;/,
    "a short reason's last line ends on a stray word"
  );
});

test("L-9 a save bar's Discard keeps an edge that holds 3:1 on the neutral ground in both themes", () => {
  assert.match(
    stripComments(read('src/lib/components/SaveBar.svelte')),
    /--sui-control-border: light-dark\(\s*color-mix\(in srgb, var\(--sui-unsaved-border\) 70%, var\(--sui-unsaved-control-border\)\),\s*color-mix\(in srgb, var\(--sui-unsaved-border\) 40%, var\(--sui-unsaved-control-border\)\)\s*\);/,
    "Discard's edge, tuned for the gold plate, sinks into the bar's neutral ground"
  );
});

test("L-16 a save bar's refusal leads with a field error's warning mark", () => {
  const source = read('src/lib/components/SaveBar.svelte');
  assert.match(
    source,
    /\{#if error \|\| reloadable\}\s*<span class="mark"><Icon name=\{reloadable \? 'refresh' : 'alert'\} size="base" \/><\/span>\s*\{\/if\}\s*<p id=\{titleId\} class="title">/,
    'a failed or refused save differs from the subtitle by colour alone'
  );
  const css = stripComments(source);
  assert.match(
    css,
    /\.mark \{[^}]*grid-row: 1 \/ span 2;/,
    "a refusal's mark sits under the title's start, so the title and its reason start apart"
  );
  assert.match(
    css,
    /\.conflict > \.mark \{\s*color: var\(--sui-unsaved-ink\);\s*\}\s*\.conflict > \.subtitle\.error \{\s*color: var\(--sui-text-muted\);\s*font-weight: var\(--sui-weight-regular\);/,
    "a conflict's danger reason competes with the gold Reload, though no work was lost"
  );
});

test("L-24 L-54 a save bar's title wraps at the body leading and the bar lifts as a toast", () => {
  const css = stripComments(read('src/lib/components/SaveBar.svelte'));
  assert.match(
    css,
    /\.title \{[^}]*font: [^;]*\/ var\(--sui-leading-body\)/,
    "a wrapped save bar title presses into one dense block at a row's copy leading"
  );
  assert.match(css, /\.title \{[^}]*text-wrap: balance;/, 'a long title ends on a short line');
  assert.match(
    css,
    /\.sui-save-bar \{[^}]*box-shadow: var\(--sui-shadow-toast, var\(--sui-shadow-popover\)\);/,
    "a plate's close shadow draws a dark band under the bar's gold edge"
  );
});

test("L-16 a decision is framed in the unsaved edge, and a conflict's title names Reload", () => {
  for (const path of ['src/lib/components/SaveBar.svelte', 'src/lib/components/Callout.svelte'])
    assert.match(
      stripComments(read(path)),
      /border: var\(--sui-decision-border-width\) solid var\(--sui-unsaved-border\);/,
      `${path} frames a decision in the bright gold fill, which outshines the gold action`
    );
  const source = read('src/lib/components/SaveBar.svelte');
  assert.match(
    source,
    /reloadable \? conflictTitle : error \? failedTitle : title/,
    'a conflict titled "Save again" offers only Reload'
  );
  assert.match(
    stripComments(source),
    /\.subtitle\.error \{[^}]*font-weight: var\(--sui-weight-medium\);/,
    "a refused save's reason is lighter than a field error"
  );
});
