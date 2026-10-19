import { describe, register, shown, type Finding } from './audit.js';
import { contrast, deltaE, lab, lightness, over, rgba, type Rgba } from './color.js';

const IGNORED = '[data-audit-ignore], [data-audit-ignore] *';
const INTERACTIVE =
  "a[href], button, input:not([type='hidden']), select, textarea, summary, [role='button'], [role='option'], [role='menuitem'], [role='tab'], [role='switch'], [role='checkbox'], [role='radio'], [role='combobox']";
const TEXT_EXEMPT = 'code, pre, kbd, samp, svg, script, style, [data-audit-ignore]';
const PAINT_EXEMPT = 'svg, script, style, [data-audit-ignore]';

const finding = (law: string, element: Element | null, detail: string): Finding => ({
  law,
  where: element ? describe(element) : 'document',
  detail,
  element: element ?? undefined
});

// A box still growing or fading is measured between its two states, so nothing inside one is
// judged until its motion ends. An animation driven by scrolling, such as an edge fade, is
// not motion: it holds still while the page does.
const audited = (root: Document, selector: string) => {
  const moving = root
    .getAnimations()
    .filter((animation) => animation.timeline instanceof DocumentTimeline)
    .map((animation) => (animation.effect as KeyframeEffect | null)?.target)
    .filter((target): target is Element => target instanceof Element);
  return [...root.querySelectorAll(selector)].filter(
    (element) =>
      !element.matches(IGNORED) &&
      shown(element) &&
      !moving.some((target) => target.contains(element))
  );
};

const round = (value: number, places = 2) => Number(value.toFixed(places));

// Words that are only heard sit in a box clipped to a pixel, and are never drawn.
function heardOnly(element: Element): boolean {
  for (let node: Element | null = element; node; node = node.parentElement) {
    const box = node.getBoundingClientRect();
    if (box.width <= 1 && box.height <= 1 && getComputedStyle(node).overflow !== 'visible')
      return true;
  }
  return false;
}

/** Elements that paint text of their own, with that text. */
function textElements(root: Document, exempt = TEXT_EXEMPT): { element: Element; text: string }[] {
  const found = new Map<Element, string>();
  const walker = root.createTreeWalker(root.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    const text = node.textContent?.trim() ?? '';
    if (!parent || text === '' || parent.closest(exempt) || !shown(parent)) continue;
    found.set(parent, `${found.get(parent) ?? ''} ${text}`.trim());
  }
  return [...found].map(([element, text]) => ({ element, text }));
}

/** What a reader sees as the element's words, with code and computed values counted as one word each. */
function readable(element: Element): string {
  let text = '';
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) text += node.textContent;
    else if (node instanceof Element) {
      if (node.matches('code, kbd, samp, var')) text += ' value ';
      else if (!node.matches('svg, [aria-hidden="true"], .sui-visually-hidden'))
        text += readable(node);
    }
  }
  return text.replace(/\s+/g, ' ').trim();
}

const segmenter = (granularity: 'sentence' | 'word') => new Intl.Segmenter('en', { granularity });
const sentences = (text: string) =>
  [...segmenter('sentence').segment(text)].map((part) => part.segment.trim()).filter(Boolean);
const words = (text: string) =>
  [...segmenter('word').segment(text)].filter((part) => part.isWordLike).length;

/**
 * The color under an element's text: its own ground, then whatever positioned sibling paints
 * beneath it (a segmented thumb, a row's hit layer), then each ancestor in turn.
 */
function paintedGround(element: Element): Rgba {
  const box = element.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  let ground: Rgba = { r: 0, g: 0, b: 0, a: 0 };
  for (let node: Element | null = element; node; node = node.parentElement) {
    ground = over(ground, rgba(getComputedStyle(node).backgroundColor));
    if (ground.a >= 0.999) return ground;
    for (
      let sibling = node.previousElementSibling;
      sibling;
      sibling = sibling.previousElementSibling
    ) {
      const style = getComputedStyle(sibling);
      if (style.position !== 'absolute' && style.position !== 'fixed') continue;
      const r = sibling.getBoundingClientRect();
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
      ground = over(ground, rgba(style.backgroundColor));
      if (ground.a >= 0.999) return ground;
    }
  }
  return over(ground, rgba(getComputedStyle(document.documentElement).backgroundColor || '#fff'));
}

function effectiveOpacity(element: Element): number {
  let opacity = 1;
  for (let node: Element | null = element; node; node = node.parentElement)
    opacity *= Number(getComputedStyle(node).opacity);
  return opacity;
}

const isDisabled = (element: Element) =>
  element.closest(
    ':disabled, [aria-disabled="true"], fieldset:disabled, label:has(:disabled, [aria-disabled="true"])'
  ) !== null || element.parentElement?.matches(':has(> :disabled)') === true;

// ---------------------------------------------------------------------------------------
// Palette laws, measured on the tokens as the active theme resolves them.

function token(name: string): Rgba {
  const probe = document.createElement('span');
  probe.style.color = `var(${name})`;
  document.body.append(probe);
  const color = rgba(getComputedStyle(probe).color);
  probe.remove();
  return color;
}

function between(law: string, label: string, value: number, low: number, high: number): Finding[] {
  return value >= low && value < high
    ? []
    : [finding(law, null, `${label} is ${round(value)}, outside [${low}, ${high})`)];
}

function atLeast(law: string, label: string, value: number, floor: number): Finding[] {
  return value >= floor ? [] : [finding(law, null, `${label} is ${round(value)}, under ${floor}`)];
}

function palette(): Finding[] {
  const t = (name: string) => token(`--sui-${name}`);
  const found: Finding[] = [];
  // Lines and control fills are veils, so each is measured as painted: the ground over the
  // surface, then the ink over the ground.
  const c = (a: string, b: string) => {
    const ground = over(t(b), t('surface-base'));
    return contrast(over(t(a), ground), ground);
  };

  for (const [ink, ground] of [
    ['text-primary', 'surface-base'],
    ['text-primary', 'surface-control'],
    ['text-primary', 'input-bg'],
    ['text-secondary', 'surface-base'],
    ['text-muted', 'surface-base'],
    ['text-muted', 'surface-raised'],
    ['text-muted', 'surface-control'],
    ['text-muted', 'input-bg'],
    ['text-muted', 'canvas'],
    ['brand-action-text', 'surface-base'],
    ['link', 'surface-base'],
    ['brand-action-text', 'brand-action-tint'],
    ['on-brand-action', 'brand-action'],
    ['on-danger', 'danger'],
    ['info', 'surface-base'],
    ['info', 'info-tint'],
    ['success', 'success-tint'],
    ['warning', 'warning-tint'],
    ['danger', 'danger-tint'],
    ['danger', 'surface-base'],
    ['role-ink', 'role-tint'],
    ['unsaved-ink', 'unsaved-surface'],
    ['on-decision-accent', 'decision-accent']
  ])
    found.push(...atLeast('L-5', `${ink} on ${ground}`, c(ink, ground), 4.5));

  for (const ground of ['canvas', 'surface-base', 'surface-control', 'input-bg'])
    found.push(...atLeast('L-6', `focus on ${ground}`, c('focus', ground), 3));
  for (const ground of ['canvas', 'surface-base', 'surface-inset'])
    found.push(...atLeast('L-6', `border-strong on ${ground}`, c('border-strong', ground), 3));

  found.push(
    ...between('L-8', 'border-subtle on surface-base', c('border-subtle', 'surface-base'), 1.2, 2)
  );
  found.push(
    ...between(
      'L-8',
      'border-divider on surface-base',
      c('border-divider', 'surface-base'),
      1.1,
      1.5
    )
  );
  found.push(
    ...between('L-9', 'control-border on control-bg', c('control-border', 'control-bg'), 1.5, 2.25)
  );
  found.push(
    ...between('L-9', 'control-border on input-bg', c('control-border', 'input-bg'), 1.4, 2.25)
  );
  // A changed row restates its fields' baseline (unsaved-field-border), measured below.
  for (const ground of ['canvas', 'surface-base', 'surface-raised', 'surface-control', 'input-bg'])
    found.push(...atLeast('L-9', `field-border on ${ground}`, c('field-border', ground), 3));
  for (const ground of ['unsaved-surface', 'unsaved-control'])
    found.push(
      ...atLeast('L-9', `unsaved-field-border on ${ground}`, c('unsaved-field-border', ground), 3),
      ...between(
        'L-9',
        `unsaved-control-border on ${ground}`,
        c('unsaved-control-border', ground),
        1.5,
        2.25
      )
    );
  // The recess under a field's top edge is darker than the frame it lies under and the ground
  // it lies on. On light, where the frame is a shade too, it stands one hover step past it.
  for (const [recess, frame, grounds] of [
    ['field-recess', 'field-frame', ['canvas', 'surface-base', 'surface-raised', 'input-bg']],
    ['field-recess-hover', 'field-frame-hover', ['canvas', 'surface-base', 'surface-raised']],
    ['unsaved-field-recess', 'unsaved-control-border', ['unsaved-control']],
    ['unsaved-field-recess-hover', 'unsaved-border', ['unsaved-control']]
  ] as const)
    for (const name of grounds) {
      const ground = over(t(name), t('surface-base'));
      const line = over(t(recess), ground);
      const edge = over(t(frame), ground);
      if (lightness(line) >= Math.min(lightness(edge), lightness(ground)))
        found.push(finding('L-9', null, `${recess} on ${name} is no darker than ${frame}`));
      if (lightness(ground) > 50)
        found.push(
          ...between('L-9', `${recess} past ${frame} on ${name}`, deltaE(line, edge), 4.4, 5.4)
        );
    }
  found.push(
    ...between('L-10', 'control-bg on surface-base', c('control-bg', 'surface-base'), 1, 1.5)
  );
  found.push(
    ...between('L-10', 'input-bg on surface-base', c('input-bg', 'surface-base'), 1.05, 1.3)
  );

  const hover = t('interactive-hover-layer');
  const pressed = t('interactive-pressed');
  for (const name of ['canvas', 'surface-base', 'surface-raised', 'surface-inset']) {
    const ground = t(name);
    const light = lightness(ground) > 50;
    const [hoverBand, pressBand] = light
      ? [
          [4.4, 5.4],
          [7.2, 8.3]
        ]
      : [
          [5.3, 6.7],
          [9, 10.5]
        ];
    const hoverStep = deltaE(ground, over(hover, ground));
    const pressStep = deltaE(ground, over(pressed, ground));
    found.push(...between('L-11', `hover step on ${name}`, hoverStep, hoverBand[0], hoverBand[1]));
    found.push(...between('L-11', `press step on ${name}`, pressStep, pressBand[0], pressBand[1]));
  }

  const base = t('surface-base');
  const rowStep = deltaE(base, over(t('row-hover'), base));
  const fieldStep = deltaE(base, over(t('field-hover'), base));
  found.push(
    ...(lightness(base) > 50
      ? between('L-12', 'row hover step on surface-base', rowStep, 2, 3)
      : between('L-12', 'row hover step on surface-base', rowStep, 4.5, 5.5)),
    ...(lightness(base) > 50
      ? between('L-12', 'field hover step on surface-base', fieldStep, 1, 1.5)
      : between('L-12', 'field hover step on surface-base', fieldStep, 2.2, 2.8))
  );

  const [rest, hovered, press] = ['brand-action', 'brand-action-hover', 'brand-action-pressed'].map(
    t
  );
  const up = Math.sign(lightness(hovered) - lightness(rest));
  if (up === 0 || Math.sign(lightness(press) - lightness(hovered)) !== up)
    found.push(finding('L-13', null, 'brand-action rest, hover and press do not move one way'));
  if (deltaE(rest, press) <= deltaE(rest, hovered))
    found.push(finding('L-13', null, 'brand-action press is not further from rest than hover'));
  for (const [label, ground] of [
    ['rest', rest],
    ['hover', hovered],
    ['press', press]
  ] as const)
    found.push(
      ...atLeast('L-13', `on-brand-action on ${label}`, contrast(t('on-brand-action'), ground), 4.5)
    );
  const fill = (theme: string) => {
    const probe = document.createElement('span');
    probe.dataset.suiTheme = theme;
    probe.style.color = 'var(--sui-brand-action)';
    document.body.append(probe);
    const color = rgba(getComputedStyle(probe).color);
    probe.remove();
    return color;
  };
  if (deltaE(fill('light'), fill('dark')) > 1)
    found.push(finding('L-13', null, 'the accent fill is not one color in both themes'));
  const danger = t('danger');
  const dangerHover = t('danger-hover');
  const expected = lightness(base) > 50 ? -1 : 1;
  if (Math.sign(lightness(dangerHover) - lightness(danger)) !== expected)
    found.push(finding('L-13', null, 'danger hover does not deepen on light or brighten on dark'));
  found.push(
    ...atLeast('L-13', 'on-danger on danger-hover', contrast(t('on-danger'), dangerHover), 4.5)
  );

  for (const ink of ['sidebar-text', 'sidebar-text-secondary', 'sidebar-text-muted'])
    found.push(...atLeast('L-85', `${ink} on sidebar-bg`, c(ink, 'sidebar-bg'), 4.5));
  found.push(
    ...atLeast(
      'L-85',
      'sidebar-active-ink on sidebar-active-bg',
      c('sidebar-active-ink', 'sidebar-active-bg'),
      4.5
    )
  );
  found.push(
    ...atLeast('L-85', 'sidebar-focus on sidebar-bg', c('sidebar-focus', 'sidebar-bg'), 3),
    ...atLeast(
      'L-85',
      'sidebar-active-ink against sidebar-text-muted',
      contrast(t('sidebar-active-ink'), t('sidebar-text-muted')),
      3
    )
  );
  const rail = t('sidebar-bg');
  if (deltaE(t('sidebar-active-bg'), rail) < deltaE(t('sidebar-item-pressed'), rail))
    found.push(finding('L-85', null, 'the current row is quieter than a pressed row'));

  for (let index = 1; index <= 5; index++)
    found.push(
      ...atLeast('L-66', `chart-${index} on surface-base`, c(`chart-${index}`, 'surface-base'), 3)
    );

  return found;
}

// ---------------------------------------------------------------------------------------
// Rendered-page laws.

function textContrast(root: Document): Finding[] {
  const found: Finding[] = [];
  for (const { element } of textElements(root, PAINT_EXEMPT)) {
    if (isDisabled(element)) continue;
    const style = getComputedStyle(element);
    const ink = rgba(style.color);
    const ground = paintedGround(element);
    const opacity = effectiveOpacity(element);
    if (opacity < 0.05) continue;
    const painted = over({ ...ink, a: ink.a * opacity }, ground);
    const size = parseFloat(style.fontSize);
    const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
    const ratio = contrast(painted, ground);
    const floor = large ? 3 : 4.5;
    if (ratio < floor)
      found.push(finding('L-5', element, `text contrast ${round(ratio)} under ${floor}`));
  }
  return found;
}

function edgeStrips(root: Document): Finding[] {
  const found: Finding[] = [];
  for (const element of audited(root, 'body *:not(svg *, svg, pre *, code *)')) {
    const style = getComputedStyle(element);
    const start = parseFloat(style.borderInlineStartWidth);
    const end = parseFloat(style.borderInlineEndWidth);
    if (
      start > end &&
      style.borderInlineStartStyle !== 'none' &&
      rgba(style.borderInlineStartColor).a > 0
    )
      found.push(
        finding('L-17', element, `inline-start border ${start}px is wider than the end ${end}px`)
      );
    for (const pseudo of ['::before', '::after']) {
      const decoration = getComputedStyle(element, pseudo);
      if (decoration.content === 'none' || decoration.position !== 'absolute') continue;
      const width = parseFloat(decoration.width);
      const height = parseFloat(decoration.height);
      const painted = rgba(decoration.backgroundColor).a > 0;
      if (
        painted &&
        width > 0 &&
        width <= 3 &&
        height > 8 &&
        parseFloat(decoration.insetInlineStart) === 0
      )
        found.push(
          finding('L-17', element, `${pseudo} paints a ${width}px strip on the inline-start edge`)
        );
    }
  }
  return found;
}

function typeFaces(root: Document): Finding[] {
  const found: Finding[] = [];
  const leadings = new Map<string, number>();
  for (const { element, text } of textElements(root)) {
    const style = getComputedStyle(element);
    const weight = Number(style.fontWeight);
    const mono =
      style.fontFamily.startsWith("'SUI JetBrains Mono'") ||
      style.fontFamily.startsWith('"SUI JetBrains Mono"');
    const [low, high] = mono ? [400, 500] : [400, 700];
    if (weight < low || weight > high)
      found.push(
        finding('L-19', element, `weight ${weight} is outside the face's ${low} to ${high}`)
      );
    if (mono && element.closest('h1, h2, h3, h4, h5, h6, label, legend, button, summary, nav a, p'))
      found.push(
        finding('L-20', element, 'monospace on a heading, label, button, navigation or prose')
      );
    if (mono && /\d/.test(text) && !style.fontVariantNumeric.includes('tabular-nums'))
      found.push(finding('L-20', element, 'a technical value with digits lacks tabular figures'));
    if (!element.closest('svg')) {
      const leading = style.lineHeight;
      if (leading === 'normal')
        found.push(finding('L-21', element, 'line-height is normal, a fractional font metric'));
      else if (
        Math.abs(parseFloat(leading) - Math.round(parseFloat(leading))) > 0.01 &&
        Math.abs(parseFloat(leading) - rowCopyLeading(element, style, leadings)) > 0.01
      )
        found.push(finding('L-21', element, `line-height ${leading} is not a whole pixel`));
    }
  }
  return found;
}

/**
 * The copy leading is the cap height plus the copy gap, so it is fractional by design. A probe
 * forces a style pass, so each face, size and gap is probed once per run.
 */
function rowCopyLeading(element: Element, style: CSSStyleDeclaration, seen: Map<string, number>) {
  const key = `${style.fontFamily}|${style.fontSize}|${style.getPropertyValue('--sui-row-copy-gap')}`;
  const known = seen.get(key);
  if (known !== undefined) return known;
  const probe = document.createElement('span');
  probe.style.lineHeight = 'var(--sui-row-copy-leading)';
  element.append(probe);
  const leading = parseFloat(getComputedStyle(probe).lineHeight);
  probe.remove();
  seen.set(key, leading);
  return leading;
}

const ABBREVIATIONS = /\b(e\.g|i\.e|etc|vs|approx|no|st|dr|mr|mrs|ms|jr|sr|prof|fig)\.$/i;

function copy(root: Document): Finding[] {
  const found: Finding[] = [];
  const blocks = audited(
    root,
    'p, li, label, legend, figcaption, dt, dd, summary, td, th, small, [role="status"], [role="alert"], h1, h2, h3, h4, h5, h6, button, a'
  ).filter((element) => !element.closest(TEXT_EXEMPT));
  for (const element of blocks) {
    if (element.querySelector('p, li, ul, ol, table, div')) continue;
    const text = readable(element);
    if (text === '') continue;
    const parts = sentences(text);
    if (parts.length === 1 && text.endsWith('.') && !ABBREVIATIONS.test(text))
      found.push(finding('L-28', element, `"${text.slice(-40)}" ends with a period`));
    for (const sentence of parts) {
      const count = words(sentence);
      if (count > 25) found.push(finding('L-29', element, `a sentence has ${count} words`));
    }
    if (element.matches('p') && parts.length > 3)
      found.push(finding('L-29', element, `a paragraph has ${parts.length} sentences`));
  }
  for (const { element, text } of textElements(root)) {
    if (/\.\.\./.test(text)) found.push(finding('L-31', element, 'three dots instead of "…"'));
    // Plain words a reader gets at once, not an idiom (L-105).
    const idiom = text.match(/\bin step\b/i)?.[0];
    if (idiom) found.push(finding('L-105', element, `"${idiom}" is an idiom; say what it means`));
    // Facts are parted by a drawn dot, never one typed into the words (L-103); a native
    // option is a string-only place and keeps its typed separator.
    if (text.includes('·') && text.trim() !== '·' && !element.closest('select, option, code, pre'))
      found.push(finding('L-103', element, 'a "·" typed into the words instead of a drawn dot'));
  }
  return found;
}

/** The room on each side of a separator dot, from the token, in pixels. */
function sepSpace(root: Document): number {
  const probe = root.createElement('span');
  probe.style.marginInlineStart = 'var(--sui-sep-space)';
  root.body.append(probe);
  const space = parseFloat(getComputedStyle(probe).marginInlineStart);
  probe.remove();
  return space;
}

/** A dot between facts stands the token's room from each fact and nothing else adds room. */
function separators(root: Document): Finding[] {
  const found: Finding[] = [];
  const space = sepSpace(root);
  const off = (value: string) => Math.abs(parseFloat(value) - space) > 0.5;
  for (const line of audited(root, '.sui-fact-line')) {
    for (const fact of [...line.children].slice(0, -1)) {
      const dot = getComputedStyle(fact, '::after');
      if (!dot.content.includes('·')) continue;
      if (off(dot.marginInlineStart) || off(dot.marginInlineEnd))
        found.push(
          finding(
            'L-103',
            fact,
            `its dot stands ${dot.marginInlineStart} and ${dot.marginInlineEnd} from the facts, not ${space}px`
          )
        );
    }
    // A space typed between two facts adds room beside the dot.
    for (const node of line.childNodes) {
      if (node.nodeType !== Node.TEXT_NODE || node.textContent?.trim()) continue;
      const range = root.createRange();
      range.selectNodeContents(node);
      if (range.getClientRects().length > 0)
        found.push(finding('L-103', line, 'a space between two facts adds room beside the dot'));
    }
  }
  // A dot drawn as its own element stands the same room from its neighbours, with no gap.
  for (const dot of audited(root, '[aria-hidden="true"]')) {
    if (dot.textContent?.trim() !== '·' || dot.children.length > 0) continue;
    const before = dot.previousElementSibling;
    const after = dot.nextElementSibling;
    const own = dot.getBoundingClientRect();
    // The room between two boxes on a line, whichever side each stands on, so a right-to-left
    // line measures the same.
    const gap = (next: Element | null) => {
      if (!next || !shown(next)) return space;
      const box = next.getBoundingClientRect();
      return Math.max(box.left - own.right, own.left - box.right);
    };
    const gaps = [gap(before), gap(after)];
    if (gaps.some((gap) => Math.abs(gap - space) > 0.5))
      found.push(
        finding(
          'L-103',
          dot,
          `it stands ${gaps.map(round).join(' and ')}px from its neighbours, not ${space}px`
        )
      );
  }
  return found;
}

function copyRhythm(root: Document): Finding[] {
  const found: Finding[] = [];
  const trimmed = (element: Element) => getComputedStyle(element).textBoxTrim === 'trim-both';
  for (const first of audited(root, 'body *')) {
    const second = first.nextElementSibling;
    if (!second || !shown(second) || !trimmed(first) || !trimmed(second)) continue;
    if (first.matches(INTERACTIVE) || second.matches(INTERACTIVE)) continue;
    const a = first.getBoundingClientRect();
    const b = second.getBoundingClientRect();
    if (b.top < a.bottom - 0.5 || Math.abs(a.left - b.left) > 1) continue;
    const gap = b.top - a.bottom;
    if (Math.abs(gap - 8) > 0.75 && gap < 16)
      found.push(finding('L-24', second, `title to description gap is ${round(gap)}px, not 8px`));
  }
  return found;
}

/**
 * A page title that wraps reads as one block only while its description stands a copy gap
 * further below it than its own lines stand apart, measured cap to baseline (L-24).
 */
function titleProximity(root: Document): Finding[] {
  const found: Finding[] = [];
  for (const title of audited(root, '.sui-page-header-title')) {
    const description = title.nextElementSibling;
    const face = faceMetrics(getComputedStyle(title));
    const own = inkLines(title);
    const under = description && shown(description) ? inkLines(description) : null;
    if (!face || !own || !under) continue;
    const range = root.createRange();
    range.selectNodeContents(title);
    const tops = [...new Set([...range.getClientRects()].map((line) => Math.round(line.top)))];
    if (tops.length < 2) continue;
    const lineGap = tops[1] - tops[0] - face.cap;
    const gap = under.top - own.bottom;
    if (gap - lineGap < 7)
      found.push(
        finding(
          'L-24',
          description,
          `a wrapped title's lines stand ${round(lineGap)}px apart, and its description only ${round(gap)}px under it`
        )
      );
  }
  return found;
}

/** True when a scrolling or clipping ancestor that fits the viewport hides the overflow. */
function clippedInView(element: Element, width: number): boolean {
  for (let node = element.parentElement; node; node = node.parentElement) {
    if (getComputedStyle(node).overflowX === 'visible') continue;
    return node.getBoundingClientRect().right <= width + 0.5;
  }
  return false;
}

const CARD_CONTENT =
  "button, input:not([type='hidden']), select, textarea, svg, img, progress, meter, [role='switch'], [role='checkbox'], [role='radio']";

/** Surfaces with a frame of their own, whose content stands one inset from every edge (L-33). */
const FRAMED_SURFACES = '.sui-card, .sui-plate, .sui-save-bar, .sui-toast, .sui-callout';

/** A ground a reader sees: an opaque or tinted color, or an image with a stop that shows. */
function paintsGround(look: CSSStyleDeclaration): boolean {
  if (rgba(look.backgroundColor).a > 0) return true;
  const image = look.backgroundImage;
  if (image === 'none') return false;
  const stops = image.match(/rgba?\([^)]*\)/g);
  return /url\(/.test(image) || !stops || stops.some((stop) => rgba(stop).a > 0);
}

const fonts = new Map<string, { cap: number; ascent: number }>();

/**
 * A face's cap height and ascent at its size, as the browser lays its text out: the ascent as
 * canvas reads it, rounded as layout rounds it, and the cap as `1cap`, which every system
 * resolves from the face itself. Canvas reads a glyph's own ink only to a sixty-fourth of an em
 * on Linux.
 */
function faceMetrics(style: CSSStyleDeclaration) {
  const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  let known = fonts.get(font);
  if (!known) {
    const context = document.createElement('canvas').getContext('2d');
    if (!context) return null;
    context.font = font;
    const probe = document.createElement('span');
    probe.style.cssText =
      'block-size: 1cap; display: block; position: absolute; visibility: hidden';
    probe.style.font = font;
    document.body.append(probe);
    known = {
      cap: probe.getBoundingClientRect().height,
      ascent: context.measureText('H').fontBoundingBoxAscent
    };
    probe.remove();
    fonts.set(font, known);
  }
  return known;
}

/**
 * Where an element's words put ink: the cap line of the first line and the baseline of the
 * last, which is what a reader weighs, not the half-leading a line box adds above and below.
 */
function inkLines(element: Element): { top: number; bottom: number } | null {
  const words = [...element.childNodes].filter(
    (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
  );
  const face = faceMetrics(getComputedStyle(element));
  if (words.length === 0 || !face) return null;
  const range = document.createRange();
  range.selectNodeContents(words[0]);
  const first = range.getClientRects()[0];
  range.selectNodeContents(words[words.length - 1]);
  const lines = range.getClientRects();
  const last = lines[lines.length - 1];
  if (!first || !last) return null;
  return { top: first.top + face.ascent - face.cap, bottom: last.top + face.ascent };
}

/**
 * A button's ink insets: from its inner top edge to the first line's cap, and from the last
 * line's baseline to its inner bottom edge, against the inset one line has in its tier.
 */
function buttonInsets(
  button: Element
): { top: number; bottom: number; line: number; wrapped: boolean } | null {
  const label = button.querySelector(':scope > .sui-button-label');
  if (!label || !shown(label)) return null;
  const ink = inkLines(label);
  const face = faceMetrics(getComputedStyle(label));
  if (!ink || !face) return null;
  const look = getComputedStyle(button);
  const box = button.getBoundingClientRect();
  const inner = {
    top: box.top + parseFloat(look.borderTopWidth),
    bottom: box.bottom - parseFloat(look.borderBottomWidth)
  };
  const row =
    parseFloat(look.minBlockSize) -
    parseFloat(look.borderTopWidth) -
    parseFloat(look.borderBottomWidth);
  return {
    top: ink.top - inner.top,
    bottom: inner.bottom - ink.bottom,
    line: (row - face.cap) / 2,
    wrapped: ink.bottom - ink.top > face.cap * 1.5
  };
}

/**
 * Where a card's content stops short of each keyline, to the ink a reader sees at rest: words
 * from their cap line to their baseline, controls, framed boxes, painted marks such as a pill
 * or a placeholder's bar, and tinted boxes that keep inside the card's inset, never the ground
 * a row bleeds into the inset on hover or for a state. A control that draws no frame or ground
 * at rest, such as a ghost button or a quiet icon button, shows only its words and glyph, so
 * those are weighed and its box is not. A side counts as reached when the content nearest it
 * hugs its own container there. A line of text ends wherever its words do, so at the end side
 * only solid content (a control, a framed box, a mark) counts, and text is held to not running
 * past.
 */
/**
 * Where a glyph puts ink: its shapes' extent widened by half their stroke, from the svg's user
 * units to the page's pixels, rather than the box it is drawn in, which a glyph rarely fills.
 * An svg that draws words, such as a chart, is read by each part's own ink instead (wordsInk).
 */
function glyphInk(svg: SVGSVGElement): DOMRect {
  if ([...svg.querySelectorAll('text')].some((text) => text.textContent?.trim()))
    return wordsInk(svg);
  const box = svg.getBoundingClientRect();
  const view = svg.viewBox.baseVal;
  let shapes: DOMRect;
  try {
    shapes = svg.getBBox();
  } catch {
    return box;
  }
  if (!view || view.width === 0 || view.height === 0 || shapes.width + shapes.height === 0)
    return box;
  const look = getComputedStyle(svg);
  const half = look.stroke === 'none' ? 0 : (parseFloat(look.strokeWidth) || 0) / 2;
  const scale = { x: box.width / view.width, y: box.height / view.height };
  return new DOMRect(
    box.left + (shapes.x - half - view.x) * scale.x,
    box.top + (shapes.y - half - view.y) * scale.y,
    (shapes.width + 2 * half) * scale.x,
    (shapes.height + 2 * half) * scale.y
  );
}

/**
 * Where an svg that draws words puts ink. A text's own box is its advance and its em, which
 * reach past the glyphs it draws, so each text is read glyph by glyph, each glyph's ink in its
 * face at the place the browser set it, kerning and anchor included; chart text draws every
 * character as its own glyph. Each shape is read by its extent widened by half its stroke.
 * Both are taken through the part's own transform, so a turned axis title or a line stretched
 * across the plot is read as drawn.
 */
function wordsInk(svg: SVGSVGElement): DOMRect {
  const context = document.createElement('canvas').getContext('2d');
  const corners: DOMPoint[] = [];
  // A stroke that keeps its width however its shape is stretched reaches `pad` page pixels
  // past the shape on every side.
  const add = (
    part: SVGGraphicsElement,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    pad = 0
  ) => {
    const ctm = part.getScreenCTM();
    if (!ctm) return;
    for (const [x, y] of [
      [x0, y0],
      [x1, y0],
      [x0, y1],
      [x1, y1]
    ]) {
      const corner = new DOMPoint(x, y).matrixTransform(ctm);
      corners.push(
        new DOMPoint(corner.x - pad, corner.y - pad),
        new DOMPoint(corner.x + pad, corner.y + pad)
      );
    }
  };
  for (const part of svg.querySelectorAll<SVGGraphicsElement>(
    'line, path, circle, ellipse, rect, polyline, polygon, text'
  )) {
    const look = getComputedStyle(part);
    if (look.display === 'none' || look.visibility !== 'visible') continue;
    if (part instanceof SVGTextElement) {
      const words = part.textContent ?? '';
      if (!words.trim() || !context || part.getNumberOfChars() === 0) continue;
      context.font = `${look.fontStyle} ${look.fontWeight} ${look.fontSize} ${look.fontFamily}`;
      let index = 0;
      for (const glyph of words) {
        if (index >= part.getNumberOfChars()) break;
        const ink = context.measureText(glyph);
        if (ink.actualBoundingBoxLeft + ink.actualBoundingBoxRight > 0) {
          const start = part.getStartPositionOfChar(index);
          add(
            part,
            start.x - ink.actualBoundingBoxLeft,
            start.y - ink.actualBoundingBoxAscent,
            start.x + ink.actualBoundingBoxRight,
            start.y + ink.actualBoundingBoxDescent
          );
        }
        index += glyph.length;
      }
      continue;
    }
    const shape = part.getBBox();
    if (shape.width + shape.height === 0) continue;
    const half = look.stroke === 'none' ? 0 : (parseFloat(look.strokeWidth) || 0) / 2;
    if (look.vectorEffect === 'non-scaling-stroke')
      add(part, shape.x, shape.y, shape.x + shape.width, shape.y + shape.height, half);
    else
      add(
        part,
        shape.x - half,
        shape.y - half,
        shape.x + shape.width + half,
        shape.y + shape.height + half
      );
  }
  if (corners.length === 0) return svg.getBoundingClientRect();
  const xs = corners.map((corner) => corner.x);
  const ys = corners.map((corner) => corner.y);
  return new DOMRect(
    Math.min(...xs),
    Math.min(...ys),
    Math.max(...xs) - Math.min(...xs),
    Math.max(...ys) - Math.min(...ys)
  );
}

function cardInsets(card: Element) {
  const style = getComputedStyle(card);
  // A right-to-left card is measured mirrored, so its start is the smaller coordinate as in LTR.
  const rtl = style.direction === 'rtl';
  // A part inside a box that scrolls sideways, because its content is wider than it, is read
  // clipped to the room that box lays its content in: what scrolls past it is out of sight, or
  // passes under the box's own padding. A box with nothing to scroll clips nothing.
  const scrolled = (element: Element) => {
    for (let node = element.parentElement; node && node !== card; node = node.parentElement) {
      const look = getComputedStyle(node);
      if (look.overflowX === 'visible' || node.scrollWidth <= node.clientWidth + 1) continue;
      const edge = node.getBoundingClientRect();
      return {
        left: edge.left + parseFloat(look.borderLeftWidth) + parseFloat(look.paddingLeft),
        right: edge.right - parseFloat(look.borderRightWidth) - parseFloat(look.paddingRight)
      };
    }
    return null;
  };
  const read = (element: Element) => {
    let own =
      element instanceof SVGSVGElement ? glyphInk(element) : element.getBoundingClientRect();
    const view = element === card ? null : scrolled(element);
    if (view && (own.left < view.left || own.right > view.right)) {
      const left = Math.max(own.left, view.left);
      own = new DOMRect(
        left,
        own.top,
        Math.max(0, Math.min(own.right, view.right) - left),
        own.height
      );
    }
    return rtl ? new DOMRect(-own.right, own.top, own.width, own.height) : own;
  };
  const box = read(card);
  const inner = {
    top: box.top + parseFloat(style.borderTopWidth),
    right: box.right - parseFloat(style.borderInlineEndWidth),
    bottom: box.bottom - parseFloat(style.borderBottomWidth),
    left: box.left + parseFloat(style.borderInlineStartWidth)
  };
  const pad = parseFloat(style.paddingInlineStart);
  const within = (own: DOMRect) =>
    own.left >= inner.left + pad - 0.5 &&
    own.right <= inner.right - pad + 0.5 &&
    own.top >= inner.top + pad - 0.5 &&
    own.bottom <= inner.bottom - pad + 0.5;
  let top = Infinity;
  let bottom = -Infinity;
  const start = { edge: Infinity, reached: false };
  const end = { edge: -Infinity, reached: false };
  let text = -Infinity;
  // A head action beside the copy centres on the title's cap band and may reach above and
  // below the title's line into the inset (L-34), so only its end is weighed.
  const actions = card.querySelector(
    ':scope > .sui-card-main > .sui-card-head > .sui-card-actions'
  );
  const copy = actions?.parentElement?.querySelector(':scope > .sui-card-copy');
  const beside =
    actions && copy && actions.getBoundingClientRect().top < copy.getBoundingClientRect().bottom
      ? actions
      : null;
  for (const element of card.querySelectorAll('*')) {
    if (element.parentElement?.closest('svg') || element.closest(IGNORED)) continue;
    if (!element.checkVisibility({ opacityProperty: false, visibilityProperty: true })) continue;
    const own = read(element);
    if (own.width <= 1 || own.height <= 1) continue;
    const look = getComputedStyle(element);
    const ground = paintsGround(look);
    const framed = (['Top', 'Right', 'Bottom', 'Left'] as const).every(
      (side) =>
        parseFloat(look.getPropertyValue(`border-${side.toLowerCase()}-width`)) > 0 &&
        rgba(look.getPropertyValue(`border-${side.toLowerCase()}-color`)).a > 0
    );
    const words = [...element.childNodes].some(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
    );
    const content =
      element.matches(CARD_CONTENT) && !(element.matches('button') && !framed && !ground);
    if (!words && !framed && !ground && !content) continue;
    let holder = element.parentElement ?? card;
    while (holder !== card && /^(inline|contents)$/.test(getComputedStyle(holder).display))
      holder = holder.parentElement ?? card;
    const room = read(holder);
    const space = getComputedStyle(holder);
    const roomLeft =
      room.left + parseFloat(space.borderInlineStartWidth) + parseFloat(space.paddingInlineStart);
    const roomRight =
      room.right - parseFloat(space.borderInlineEndWidth) - parseFloat(space.paddingInlineEnd);
    const mark =
      ground &&
      (element.childElementCount === 0 || look.display.startsWith('inline-') || within(own));
    const solid = framed || mark || content;
    if (!words && !solid) continue;
    // Words are weighed by their ink; a solid part by its box.
    const ink = words && !solid ? inkLines(element) : null;
    if (!beside?.contains(element)) {
      top = Math.min(top, ink?.top ?? own.top);
      bottom = Math.max(bottom, ink?.bottom ?? own.bottom);
    }
    if (own.left < start.edge - 0.5) Object.assign(start, { edge: own.left, reached: false });
    if (Math.abs(own.left - start.edge) <= 0.5 && own.left <= roomLeft + 1) start.reached = true;
    if (!solid) {
      text = Math.max(text, own.right);
      continue;
    }
    if (own.right > end.edge + 0.5) Object.assign(end, { edge: own.right, reached: false });
    if (Math.abs(own.right - end.edge) <= 0.5 && own.right >= roomRight - 1) end.reached = true;
  }
  if (top === Infinity) return null;
  return {
    inset: pad,
    top: top - inner.top,
    end: {
      gap: Math.min(inner.right - end.edge, inner.right - text),
      reached: end.reached && end.edge >= text
    },
    bottom: inner.bottom - bottom,
    start: { gap: start.edge - inner.left, reached: start.reached }
  };
}

const UNFRAMED_HEAD = ".sui-button[data-tone='ghost'], .sui-icon-button:not(.toolbar)";

/**
 * A card's unframed head action beside its copy, a ghost button or a quiet icon button, stands
 * its box, the ground its hover or press shows, as far from the card's end edge as from its
 * top, so that ground sits square in the corner (L-33). A framed control ends on the inset
 * instead. Null when there is no such action beside the copy.
 */
function headActionInsets(card: Element): { top: number; end: number } | null {
  const actions = card.querySelector(
    ':scope > .sui-card-main > .sui-card-head > .sui-card-actions'
  );
  const copy = actions?.parentElement?.querySelector(':scope > .sui-card-copy');
  const last = actions && [...actions.children].filter(shown).at(-1);
  const control = last?.matches(UNFRAMED_HEAD)
    ? last
    : last?.querySelector(`:scope > :is(${UNFRAMED_HEAD})`);
  if (!actions || !control || !shown(control)) return null;
  // Stacked under the copy, the action starts its own line and has no corner to sit in.
  if (copy && actions.getBoundingClientRect().top >= copy.getBoundingClientRect().bottom - 0.5)
    return null;
  const style = getComputedStyle(card);
  const box = card.getBoundingClientRect();
  const own = control.getBoundingClientRect();
  const rtl = style.direction === 'rtl';
  return {
    top: own.top - box.top - parseFloat(style.borderTopWidth),
    end: rtl
      ? own.left - box.left - parseFloat(style.borderLeftWidth)
      : box.right - parseFloat(style.borderRightWidth) - own.right
  };
}

function geometry(root: Document): Finding[] {
  const found: Finding[] = [];

  // Every framed surface stands its content one inset from all four edges, to the ink.
  for (const card of audited(root, FRAMED_SURFACES)) {
    const style = getComputedStyle(card);
    if (card.matches('.sui-card')) {
      if (parseFloat(style.marginBlockStart) !== 0 || parseFloat(style.marginBlockEnd) !== 0)
        found.push(finding('L-33', card, 'a card spaces itself with a margin'));
      if (parseFloat(style.minWidth) !== 0)
        found.push(finding('L-33', card, 'a card sets its own minimum width'));
    }
    const action = card.matches('.sui-card') ? headActionInsets(card) : null;
    if (action && Math.abs(action.top - action.end) > 0.5)
      found.push(
        finding(
          'L-33',
          card,
          `its head action's box stands ${round(action.top)}px from the top and ${round(action.end)}px from the end`
        )
      );
    // The title's cap opens a card at its inset whatever stands beside it, so a framed control
    // at the inset never excuses a title set lower (L-34).
    const words = card.querySelector(
      ':scope > .sui-card-main > .sui-card-head .sui-card-words > span'
    );
    const cap = words && inkLines(words);
    if (cap) {
      const gap = cap.top - card.getBoundingClientRect().top - parseFloat(style.borderTopWidth);
      const pad = parseFloat(style.paddingTop);
      if (Math.abs(gap - pad) > 0.5)
        found.push(
          finding('L-33', card, `its title's cap stands ${round(gap)}px from the top, not ${pad}`)
        );
    }
    const measured = cardInsets(card);
    if (!measured) continue;
    const { inset, top, end, bottom, start } = measured;
    const off = (gap: number) => Math.abs(gap - inset) > 0.5;
    const sideOff = (side: { gap: number; reached: boolean }) =>
      side.reached ? off(side.gap) : side.gap < inset - 0.5;
    if (off(top) || off(bottom) || sideOff(start) || sideOff(end))
      found.push(
        finding(
          'L-33',
          card,
          `content stands ${round(top)} from the top, ${round(end.gap)} from the end, ${round(bottom)} from the bottom and ${round(start.gap)} from the start, not ${inset} all round`
        )
      );
  }

  for (const heading of audited(root, 'h1, h2, h3, h4, h5, h6')) {
    const parent = heading.parentElement;
    // A card's head takes a framed control's height, which starts on the title's cap line (L-34).
    if (!parent || parent.matches('.sui-card-head')) continue;
    const h = heading.getBoundingClientRect();
    const beside = [...parent.children].filter((sibling) => {
      if (sibling === heading || !shown(sibling)) return false;
      const r = sibling.getBoundingClientRect();
      return r.top < h.bottom && r.bottom > h.top;
    });
    if (beside.length === 0) continue;
    const rows = [h, ...beside.map((sibling) => sibling.getBoundingClientRect())];
    const height = Math.max(...rows.map((r) => r.bottom)) - Math.min(...rows.map((r) => r.top));
    if (height > h.height + 0.6)
      found.push(
        finding(
          'L-34',
          heading,
          `what stands beside the heading makes its row ${round(height - h.height)}px taller`
        )
      );
  }

  const tiers = new Set([20, 24, 28, 34, 40, 44]);
  const controls = audited(
    root,
    "button, input:not([type='checkbox'], [type='radio'], [type='hidden'], [type='range']), select, [role='combobox'], a.sui-button"
  );
  for (const control of controls) {
    if (getComputedStyle(control).opacity === '0') continue;
    // A menu row grows with its words (L-48); only its floor is a tier.
    if (control.matches("[role='menuitem'], [role='option']")) continue;
    const { height } = control.getBoundingClientRect();
    if (height === 0 || height > 60) continue;
    // A button whose label wraps grows by its lines; its insets are weighed below.
    if (buttonInsets(control)?.wrapped) continue;
    if (!Number.isInteger(round(height, 3)))
      found.push(finding('L-37', control, `height ${round(height, 3)}px is not a whole pixel`));
    else if (!tiers.has(Math.round(height)))
      found.push(finding('L-37', control, `height ${round(height)}px is not a control tier`));
  }

  for (const button of audited(root, '.sui-button')) {
    const insets = buttonInsets(button);
    if (!insets) continue;
    const { top, bottom, line } = insets;
    if (Math.abs(top - line) > 0.5 || Math.abs(bottom - line) > 0.5)
      found.push(
        finding(
          'L-37',
          button,
          `its words stand ${round(top)}px and ${round(bottom)}px from its edges, not ${round(line)}px as on one line`
        )
      );
  }

  for (const field of audited(
    root,
    "input:not([type='checkbox'], [type='radio'], [type='hidden'], [type='range']), textarea, select"
  )) {
    const style = getComputedStyle(field);
    const top = parseFloat(style.paddingTop) + parseFloat(style.borderTopWidth);
    const bottom = parseFloat(style.paddingBottom) + parseFloat(style.borderBottomWidth);
    if (Math.abs(top - bottom) > 0.01)
      found.push(finding('L-47', field, `top inset ${top}px differs from bottom ${bottom}px`));
  }

  const width = root.documentElement.clientWidth;
  if (root.documentElement.scrollWidth > width + 0.5) {
    const wide = audited(root, 'body *')
      .filter((element) => element.getBoundingClientRect().right > width + 0.5)
      .filter(
        (element) =>
          !element.parentElement ||
          element.parentElement.getBoundingClientRect().right <= width + 0.5
      )
      .filter((element) => !clippedInView(element, width));
    found.push(
      ...(wide.length > 0
        ? wide
            .slice(0, 5)
            .map((element) =>
              finding('L-70', element, 'reaches past the viewport and scrolls the page sideways')
            )
        : [finding('L-70', null, 'the page scrolls sideways')])
    );
  }
  return found;
}

function controls(root: Document): Finding[] {
  const found: Finding[] = [];
  const phone = matchMedia('(max-width: 47.9375rem)').matches;
  const hits: { target: Element; own: DOMRect; hit: DOMRect }[] = [];
  // A target scrolled out of a box that clips it cannot be pressed there, so its own box and
  // its hit area count only where its clipping ancestors show them.
  const clipped = (element: Element, area: DOMRect) => {
    let { left, top, right, bottom } = area;
    for (let node = element.parentElement; node; node = node.parentElement) {
      const look = getComputedStyle(node);
      if (look.display === 'contents') continue;
      if (look.overflowX === 'visible' && look.overflowY === 'visible') continue;
      const edge = node.getBoundingClientRect();
      if (look.overflowX !== 'visible')
        [left, right] = [Math.max(left, edge.left), Math.min(right, edge.right)];
      if (look.overflowY !== 'visible')
        [top, bottom] = [Math.max(top, edge.top), Math.min(bottom, edge.bottom)];
    }
    return new DOMRect(left, top, Math.max(0, right - left), Math.max(0, bottom - top));
  };
  for (const target of audited(root, INTERACTIVE)) {
    if (target.matches("input[type='checkbox'], input[type='radio']")) continue;
    if (getComputedStyle(target).opacity === '0') continue;
    // A press on a field's own label focuses it, so the label is part of the target.
    const hit = (target.matches('input') && target.closest('label')) || target;
    const box = hit.getBoundingClientRect();
    const extensions = ['::before', '::after']
      .map((pseudo) => getComputedStyle(hit, pseudo))
      .filter((pseudo) => pseudo.content !== 'none' && pseudo.position === 'absolute');
    const r = {
      width: Math.max(box.width, ...extensions.map((pseudo) => parseFloat(pseudo.width) || 0)),
      height: Math.max(box.height, ...extensions.map((pseudo) => parseFloat(pseudo.height) || 0))
    };
    // WCAG 2.5.8 spares a link inside a sentence, which shares its line with words of its own;
    // a link alone in a list item or a cell is a target like any other.
    const inline =
      target.matches('a') &&
      [...(target.parentElement?.childNodes ?? [])].some(
        (node) => node !== target && node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
      );
    hits.push({
      target,
      own: clipped(hit, box),
      hit: clipped(
        hit,
        extensions.reduce((area, pseudo) => {
          const left = box.left + parseFloat(pseudo.left);
          const top = box.top + parseFloat(pseudo.top);
          const right = left + parseFloat(pseudo.width);
          const bottom = top + parseFloat(pseudo.height);
          if (![left, top, right, bottom].every(Number.isFinite)) return area;
          const x = Math.min(area.left, left);
          const y = Math.min(area.top, top);
          return new DOMRect(
            x,
            y,
            Math.max(area.right, right) - x,
            Math.max(area.bottom, bottom) - y
          );
        }, box)
      )
    });
    const floor = phone ? 44 : 24;
    if (!inline && (r.width < floor - 0.01 || r.height < floor - 0.01))
      found.push(
        finding(
          'L-38',
          target,
          `target is ${round(r.width)} by ${round(r.height)}px, under ${floor} by ${floor}`
        )
      );
  }

  // Two targets that stand apart must not reach into each other's grown hit area, or a press
  // between them lands on whichever the browser stacks last. A control laid over a bigger one,
  // such as a clear button in a field, overlaps on purpose and is left alone.
  const meet = (a: DOMRect, b: DOMRect) =>
    Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 &&
    Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;
  for (const [index, one] of hits.entries())
    for (const other of hits.slice(index + 1)) {
      if (one.target.contains(other.target) || other.target.contains(one.target)) continue;
      if (meet(one.own, other.own) || !meet(one.hit, other.hit)) continue;
      found.push(finding('L-38', one.target, `its hit area overlaps ${describe(other.target)}'s`));
    }

  const disabledOpacity = parseFloat(
    getComputedStyle(root.documentElement).getPropertyValue('--sui-disabled-opacity')
  );
  for (const control of audited(
    root,
    "button:disabled, button[aria-disabled='true'], input:disabled, select:disabled, textarea:disabled"
  )) {
    const style = getComputedStyle(control);
    const paintsNothing =
      style.appearance === 'none' &&
      rgba(style.backgroundColor).a === 0 &&
      parseFloat(style.borderTopWidth) === 0 &&
      control.matches('input');
    // A menu row dims its name but keeps the reason it gives at full ink.
    if (style.opacity === '0' || paintsNothing || control.matches("[role='menuitem']")) continue;
    // A busy button is the action at work: its fill, edge and spinner keep full strength and
    // only its words dim, so its words carry the dimming; a busy icon button has none.
    const busy = control.matches("[aria-busy='true']:not(:disabled)");
    const dimmed = busy ? control.querySelector('.sui-button-label') : control;
    const opacity = dimmed ? effectiveOpacity(dimmed) : disabledOpacity;
    if (Math.abs(opacity - disabledOpacity) > 0.02)
      found.push(
        finding('L-40', control, `disabled at opacity ${round(opacity)}, not ${disabledOpacity}`)
      );
    if (style.cursor === 'pointer')
      found.push(finding('L-40', control, 'a disabled control keeps the pointer cursor'));
  }

  for (const button of audited(root, 'button, a[href]')) {
    // A button kept hidden in its seat, as a setting row's idle reset is, has words that
    // `innerText` does not report.
    if (!button.checkVisibility({ visibilityProperty: true })) continue;
    if ((button as HTMLElement).innerText.trim() !== '' || !button.querySelector('svg')) continue;
    if (!button.getAttribute('aria-label') && !button.getAttribute('aria-labelledby'))
      found.push(finding('L-44', button, 'an icon-only control has no accessible name'));
    const r = button.getBoundingClientRect();
    if (Math.abs(r.width - r.height) > 0.5)
      found.push(
        finding(
          'L-44',
          button,
          `an icon-only control is ${round(r.width)} by ${round(r.height)}px, not square`
        )
      );
  }

  // Whatever a click presses or flips shows the pointer, so a reader knows before pressing,
  // including the words that label a box or a switch; a disabled one falls back (L-40).
  const pressable =
    'button, [role="button"], a[href], summary, [role="menuitem"], [role="option"], [role="tab"]';
  for (const target of audited(root, `${pressable}, label`)) {
    if (target.matches('label')) {
      const control = (target as HTMLLabelElement).control;
      if (!(control instanceof HTMLInputElement) || !/^(checkbox|radio)$/.test(control.type))
        continue;
      // A chosen radio flips nothing, and a control that cannot run falls back (L-40).
      if ((control.type === 'radio' && control.checked) || isDisabled(control)) continue;
    } else if (isDisabled(target) || target.closest('[inert]')) continue;
    // A help mark answers a mouse by hovering, so it shows the help cursor instead.
    const cursor = target.matches('.sui-help-tip') ? 'help' : 'pointer';
    if (getComputedStyle(target).cursor !== cursor)
      found.push(
        finding('L-100', target, `a click presses it, but it does not show the ${cursor}`)
      );
  }

  // Buttons side by side in one row share one height, so a hover never shows one taller
  // than its neighbour; a text button beside an icon button takes the same tier.
  const buttons = audited(root, 'button, [role="button"]').filter(
    (button) => !button.closest('[role="menu"], [role="listbox"], [role="radiogroup"], nav')
  );
  const boxes = buttons.map((button) => button.getBoundingClientRect());
  // A control whose words wrap, as a chip's do on a phone, is weighed by its first line's
  // band: its height less the lines its words add under the first.
  const bands = buttons.map((button, index) => {
    const runs: DOMRect[] = [];
    const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent?.trim()) continue;
      range.selectNodeContents(node);
      runs.push(...[...range.getClientRects()].filter((run) => run.width > 0));
    }
    // Runs in two faces on one line start a pixel or two apart, so a line is every run that
    // starts above the bottom of the line before it.
    const lines: { top: number; bottom: number }[] = [];
    for (const run of runs.sort((a, b) => a.top - b.top)) {
      const last = lines.at(-1);
      if (last && run.top < last.bottom - 1) last.bottom = Math.max(last.bottom, run.bottom);
      else lines.push({ top: run.top, bottom: run.bottom });
    }
    const added = lines.length > 1 ? (lines.at(-1)?.bottom ?? 0) - lines[0].bottom : 0;
    return boxes[index].height - added;
  });
  for (let one = 0; one < buttons.length; one++)
    for (let two = one + 1; two < buttons.length; two++) {
      const [a, b] = [boxes[one], boxes[two]];
      const [tall, other] = [bands[one], bands[two]];
      const gap = Math.max(b.left - a.right, a.left - b.right);
      const shared = Math.min(a.top + tall, b.top + other) - Math.max(a.top, b.top);
      if (gap < 0 || gap > 24 || shared < Math.min(tall, other) / 2) continue;
      // Specimens side by side are separate rows, however close they stand.
      if (buttons[one].closest('figure') !== buttons[two].closest('figure')) continue;
      if (Math.abs(tall - other) > 0.5)
        found.push(
          finding(
            'L-101',
            buttons[two],
            `beside a ${round(tall)}px button it is ${round(other)}px tall`
          )
        );
    }

  // Words in a small box of their own ground or frame sit on its middle: as much room above
  // the cap line as under the baseline, as a count, a pill or a button's word does. Only a box
  // whose words make one line, with nothing stacked above or under it, is weighed this way.
  for (const box of audited(root, '*')) {
    const own = box.getBoundingClientRect();
    if (own.height > 48 || own.height < 8 || box.closest('svg, .sui-visually-hidden, pre, code'))
      continue;
    if (heardOnly(box)) continue;
    // Lines of code keep one leading so their baselines stay a grid; a box of them is a block.
    if (box.querySelector('pre, code')) continue;
    const look = getComputedStyle(box);
    const framed = (['top', 'right', 'bottom', 'left'] as const).every(
      (side) =>
        parseFloat(look.getPropertyValue(`border-${side}-width`)) > 0 &&
        rgba(look.getPropertyValue(`border-${side}-color`)).a > 0
    );
    if (rgba(look.backgroundColor).a === 0 && !framed) continue;
    const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
    const words: Text[] = [];
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      const parent = node.parentElement;
      if (!node.textContent?.trim() || !parent || parent.closest('.sui-visually-hidden, svg'))
        continue;
      if (parent.checkVisibility({ opacityProperty: false, visibilityProperty: true }))
        words.push(node);
    }
    if (words.length === 0) continue;
    const range = document.createRange();
    const lines = words.flatMap((node) => {
      range.selectNodeContents(node);
      return [...range.getClientRects()].filter((rect) => rect.width > 0);
    });
    if (lines.length === 0 || lines.some((line) => Math.abs(line.top - lines[0].top) > 1)) continue;
    const line = lines[0];
    const stacked = [...box.querySelectorAll('*')].some((part) => {
      if (part.closest('svg') && part.tagName !== 'svg') return false;
      if (!shown(part) || part.closest('.sui-visually-hidden')) return false;
      const r = part.getBoundingClientRect();
      return r.height > 1 && (r.bottom <= line.top + 1 || r.top >= line.bottom - 1);
    });
    if (stacked) continue;
    const ink = inkLines(words[0].parentElement as Element);
    if (!ink) continue;
    const above = ink.top - (own.top + parseFloat(look.borderTopWidth));
    const below = own.bottom - parseFloat(look.borderBottomWidth) - ink.bottom;
    if (Math.abs(above - below) > 0.5)
      found.push(
        finding(
          'L-102',
          box,
          `its words stand ${round(above)}px under the top and ${round(below)}px over the bottom`
        )
      );
  }

  // A field joined to a second part is one control: as tall as a plain field while its value
  // is one line, with the value on its centre line.
  const plain = audited(root, 'input.sui-text-input:not(.bare)')[0];
  const control = plain?.getBoundingClientRect().height ?? 0;
  for (const frame of audited(root, '.sui-joined')) {
    const value = frame.querySelector(
      '.sui-joined-value :is(input:not([type="hidden"]), textarea)'
    );
    if (!value || !control) continue;
    const box = frame.getBoundingClientRect();
    const part = value.getBoundingClientRect();
    if (part.height <= control && Math.abs(box.height - control) > 0.5)
      found.push(
        finding('L-37', frame, `a joined field is ${round(box.height)}px tall, not ${control}px`)
      );
    const off = part.top + part.height / 2 - (box.top + box.height / 2);
    if (Math.abs(off) > 0.5)
      found.push(finding('L-37', frame, `its value sits ${round(off)}px off the field's centre`));
  }
  return found;
}

/** Letters and numbers only, so marks and symbols a reader does not say never decide a match. */
const sayable = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/** The words a control draws, as a browser reads them: a drawn image by its name. */
function drawnLabel(element: Element): string {
  if (element.matches('select, input, textarea')) return '';
  const read = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE)
      return node.parentElement?.checkVisibility({ checkVisibilityCSS: true })
        ? (node.textContent ?? '')
        : '';
    if (!(node instanceof Element) || node.getAttribute('aria-hidden') === 'true') return '';
    if (node.getAttribute('role') === 'img') return ` ${node.getAttribute('aria-label') ?? ''} `;
    if (node.matches('.sui-visually-hidden')) return '';
    return ` ${[...node.childNodes].map(read).join('')} `;
  };
  return read(element);
}

function accessibility(root: Document): Finding[] {
  const found: Finding[] = [];
  for (const svg of audited(root, 'svg')) {
    if (svg.closest('[aria-hidden="true"]')) continue;
    if (
      svg.getAttribute('role') === 'img' &&
      (svg.getAttribute('aria-label') || svg.getAttribute('aria-labelledby'))
    )
      continue;
    found.push(finding('L-67', svg, 'an svg is neither hidden nor a labelled image'));
  }

  for (const element of audited(root, INTERACTIVE)) {
    const label = element.getAttribute('aria-label')?.trim().toLowerCase() ?? '';
    const labelledby = element.getAttribute('aria-labelledby');
    // A voice user says the words they see, so a name given by the author holds the drawn
    // words as one run, read the way a browser reads them (WCAG 2.5.3).
    const authored =
      label ||
      (labelledby ?? '')
        .split(/\s+/)
        .map((id) => root.getElementById(id)?.textContent ?? '')
        .join(' ');
    const drawn = sayable(drawnLabel(element));
    if (authored && drawn && !` ${sayable(authored)} `.includes(` ${drawn} `))
      found.push(
        finding('L-77', element, `the name "${authored}" does not hold the drawn words "${drawn}"`)
      );
    // A select's text is its options, and its visible label is its <label>, not its value.
    const visible = (
      element instanceof HTMLSelectElement ? '' : ((element as HTMLElement).innerText ?? '')
    )
      .trim()
      .toLowerCase();
    const labels = (element as HTMLInputElement).labels;
    const named =
      label !== '' ||
      Boolean(labelledby) ||
      visible !== '' ||
      (labels !== undefined && labels !== null && labels.length > 0) ||
      Boolean(element.getAttribute('title')) ||
      element.closest('label') !== null ||
      element.matches('input[type="hidden"]');
    if (!named) found.push(finding('L-77', element, 'has no accessible name'));
    else if (label !== '' && visible !== '' && !label.includes(visible.split('\n')[0]))
      found.push(
        finding(
          'L-77',
          element,
          `the name "${label}" does not contain the visible label "${visible}"`
        )
      );
  }

  let level = 0;
  for (const heading of audited(root, 'h1, h2, h3, h4, h5, h6')) {
    const next = Number(heading.tagName[1]);
    if (level > 0 && next > level + 1)
      found.push(finding('L-78', heading, `heading level jumps from ${level} to ${next}`));
    level = next;
  }
  if (root.querySelectorAll('main').length !== 1)
    found.push(finding('L-78', null, 'the page does not have exactly one main'));
  if (root.title.trim() === '') found.push(finding('L-78', null, 'the page has no title'));
  if (!root.documentElement.lang) found.push(finding('L-78', null, 'the page has no language'));

  for (const link of audited(root, 'a[href]')) {
    const style = getComputedStyle(link);
    const color = style.color.replace(/\s/g, '');
    if (color === 'rgb(0,0,238)' || color === 'rgb(85,26,139)')
      found.push(finding('L-81', link, 'a link wears the browser default color'));
    const inSentence = link.parentElement?.matches('p, dd, figcaption') && !link.closest('nav');
    if (inSentence && !style.textDecorationLine.includes('underline'))
      found.push(finding('L-81', link, 'a link inside a sentence is not underlined at rest'));
  }

  for (const list of audited(root, 'ul, ol')) {
    if (getComputedStyle(list).listStyleType === 'none' && list.getAttribute('role') !== 'list')
      if (!list.closest('nav') && list.getAttribute('role') === null)
        found.push(finding('L-61', list, 'a list without bullets lacks role="list"'));
  }
  return found;
}

/** How wide the ink a reader sees in a box runs: its lines of text, controls and painted boxes. */
function inkWidth(box: Element): number {
  const spans: DOMRect[] = [];
  const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim() || node.parentElement?.closest(':popover-open')) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    spans.push(...range.getClientRects());
  }
  for (const element of box.querySelectorAll('*')) {
    if (!element.getClientRects().length || element.closest(':popover-open')) continue;
    const look = getComputedStyle(element);
    const painted =
      rgba(look.backgroundColor).a > 0 ||
      parseFloat(look.borderLeftWidth) > 0 ||
      parseFloat(look.borderTopWidth) > 0;
    if (painted || element.matches(CARD_CONTENT)) spans.push(element.getBoundingClientRect());
  }
  if (spans.length === 0) return 0;
  return Math.max(...spans.map((span) => span.right)) - Math.min(...spans.map((span) => span.left));
}

/**
 * The kitchen sink's specimens (L-55): a component stays inside its specimen, and the name and
 * props under it stay inside it too. Where a specimen sizes to its content, a caption line wraps
 * only when the specimen could not grow wider. A stack is for specimens that use their line:
 * ones that each fill under 60% of it and would fit side by side share a row.
 */
function specimens(root: Document): Finding[] {
  const found: Finding[] = [];
  for (const specimen of audited(root, 'figure.specimen')) {
    const panel = specimen.querySelector(':scope > .body');
    if (!panel) continue;
    const edge = panel.getBoundingClientRect();
    // Content that scrolls or clips inside its own box has not escaped: only its box counts.
    const held = (element: Element) => {
      for (let node = element.parentElement; node && node !== panel; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.overflowX !== 'visible' || style.overflowY !== 'visible') return true;
      }
      return false;
    };
    // Only ink counts, and only sideways: a link's or summary's hit area may bleed past the
    // specimen unseen, and trimmed text paints its ascenders above its own box by design.
    const outside = (box: DOMRect) =>
      box.width > 1 &&
      box.height > 1 &&
      (box.left < edge.left - 0.5 || box.right > edge.right + 0.5);
    // A stacked stage lends its inset to what a specimen shows (L-66), so a chart's band may
    // span the specimen and exactly that inset on both sides, and nothing reaches further.
    const spansLent = (element: Element) => {
      let shown: Element | null = element;
      while (shown && shown.parentElement !== panel) shown = shown.parentElement;
      const inset = shown
        ? parseFloat(getComputedStyle(shown).getPropertyValue('--sui-local-bleed'))
        : 0;
      const box = element.getBoundingClientRect();
      return (
        inset > 0 &&
        Math.abs(edge.left - inset - box.left) <= 0.5 &&
        Math.abs(edge.right + inset - box.right) <= 0.5
      );
    };
    // A line of text paints only where every box that clips it shows it, as an avatar's
    // letters, spaced wider for reading, stay inside the circle that clips them.
    const shown = (line: DOMRect, element: Element) => {
      let { left, right } = line;
      for (let node = element.parentElement; node && node !== panel; node = node.parentElement) {
        const look = getComputedStyle(node);
        if (look.display === 'contents' || look.overflowX === 'visible') continue;
        const box = node.getBoundingClientRect();
        [left, right] = [Math.max(left, box.left), Math.min(right, box.right)];
      }
      return new DOMRect(left, line.top, Math.max(0, right - left), line.height);
    };
    const escaped = [...panel.querySelectorAll('*')].find((element) => {
      if (element.closest(':popover-open, dialog[open]') || held(element)) return false;
      if (!element.checkVisibility({ opacityProperty: false, visibilityProperty: true }))
        return false;
      const look = getComputedStyle(element);
      if (look.position === 'fixed' || look.clipPath !== 'none') return false;
      if (spansLent(element)) return false;
      const painted =
        rgba(look.backgroundColor).a > 0 ||
        parseFloat(look.borderLeftWidth) > 0 ||
        parseFloat(look.borderTopWidth) > 0;
      if ((painted || element.matches(CARD_CONTENT)) && outside(element.getBoundingClientRect()))
        return true;
      // Text an element clips to its own box paints no further than that box.
      if (look.overflowX !== 'visible') return outside(element.getBoundingClientRect());
      return [...element.childNodes].some((node) => {
        if (node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim()) return false;
        const range = document.createRange();
        range.selectNodeContents(node);
        return [...range.getClientRects()].some((line) => outside(shown(line, element)));
      });
    });
    if (escaped) found.push(finding('L-55', escaped, 'reaches past its specimen'));

    const own = specimen.getBoundingClientRect();
    const holder = specimen.parentElement;
    const room = holder
      ? holder.clientWidth -
        parseFloat(getComputedStyle(holder).paddingLeft) -
        parseFloat(getComputedStyle(holder).paddingRight)
      : own.width;
    const caption = specimen.querySelector(':scope > figcaption');
    if (!caption) continue;
    const grows = holder !== null && getComputedStyle(holder).display.includes('flex');
    for (const part of caption.children) {
      const box = part.getBoundingClientRect();
      if (box.left < own.left - 0.5 || box.right > own.right + 0.5)
        found.push(finding('L-55', part, 'the caption runs past its specimen'));
      const range = document.createRange();
      range.selectNodeContents(part);
      /* A caption's props are boxes of their own, a pixel off its text, so only a step of half
         a line or more starts a new line. */
      const tops = [...range.getClientRects()].map((line) => line.top).sort((a, b) => a - b);
      const half = parseFloat(getComputedStyle(part).lineHeight) / 2;
      const lines = tops.filter(
        (top, index) => index === 0 || top - tops[index - 1] >= half
      ).length;
      if (lines > 1 && grows && own.width < room - 1)
        found.push(finding('L-55', part, 'the caption wraps while its specimen has room to grow'));
    }
  }

  for (const stack of audited(root, ".specimens[data-layout='stack']")) {
    const cells = [...stack.querySelectorAll(':scope > figure.specimen')];
    if (cells.length < 2) continue;
    const sizes = cells.map((cell) => {
      const body = cell.querySelector(':scope > .body');
      const band = cell.querySelector(':scope > figcaption');
      if (!body) return { share: 1, natural: Infinity };
      const space = getComputedStyle(body);
      const pad = parseFloat(space.paddingLeft) + parseFloat(space.paddingRight);
      const ink = inkWidth(body);
      const bandWidth = band
        ? [...band.children].reduce((sum, part) => sum + part.getBoundingClientRect().width, 0) +
          parseFloat(getComputedStyle(band).columnGap || '0') * (band.children.length - 1) +
          parseFloat(getComputedStyle(band).paddingLeft) +
          parseFloat(getComputedStyle(band).paddingRight)
        : 0;
      return { share: ink / (body.clientWidth - pad), natural: Math.max(ink + pad, bandWidth) + 1 };
    });
    const fits = sizes.reduce((sum, size) => sum + size.natural, 0) <= stack.clientWidth;
    if (fits && sizes.every((size) => size.share <= 0.6))
      found.push(
        finding('L-55', stack, 'stacked specimens use under 60% of their line and fit side by side')
      );
  }
  // Specimens on one line hang their captions from one line too, under a dashed rule, so a
  // reader scans the names across without hunting below each specimen.
  const lines = new Map<Element, Map<number, number[]>>();
  for (const caption of audited(root, 'figure.specimen > figcaption')) {
    const row = caption.parentElement?.parentElement;
    if (!row?.matches('.specimens:not([data-layout="stack"])')) continue;
    const top = Math.round(caption.parentElement!.getBoundingClientRect().top);
    const tops = lines.get(row) ?? new Map<number, number[]>();
    tops.set(top, [...(tops.get(top) ?? []), caption.getBoundingClientRect().top]);
    lines.set(row, tops);
    if (getComputedStyle(caption, '::before').borderBlockStartStyle !== 'dashed')
      found.push(finding('L-55', caption, 'a caption has no dashed rule above it'));
  }
  for (const [row, tops] of lines)
    for (const captions of tops.values())
      if (Math.max(...captions) - Math.min(...captions) > 0.5)
        found.push(finding('L-55', row, 'captions on one line do not share one top'));
  return found;
}

/**
 * Rows that wrap (L-90): every new line starts at the row's start edge, so a lone item that an
 * auto margin pushes over never floats away from what it belongs to. A row aligned to its end or
 * centre on purpose keeps every line there, and is left alone.
 */
function wrapping(root: Document): Finding[] {
  const found: Finding[] = [];
  for (const row of audited(root, 'body *')) {
    const style = getComputedStyle(row);
    if (!style.display.endsWith('flex') || style.flexWrap === 'nowrap') continue;
    if (!style.flexDirection.startsWith('row')) continue;
    const rtl = style.direction === 'rtl';
    // `left` and `right` are physical, so the one that is the end depends on the direction.
    if (/center|around|evenly|end/.test(style.justifyContent)) continue;
    if (style.justifyContent.includes(rtl ? 'left' : 'right')) continue;
    const items = [...row.children].filter(
      (child) => shown(child) && !/^(absolute|fixed)$/.test(getComputedStyle(child).position)
    );
    if (items.length < 2) continue;
    const box = row.getBoundingClientRect();
    // A line starts at the inline start, which is the right edge in a right-to-left row.
    const start = rtl
      ? box.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight)
      : box.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
    let bottom = items[0].getBoundingClientRect().bottom;
    for (const item of items.slice(1)) {
      const own = item.getBoundingClientRect();
      if (own.top < bottom - 0.5) {
        bottom = Math.max(bottom, own.bottom);
        continue;
      }
      bottom = own.bottom;
      const edge = rtl ? own.right : own.left;
      if (Math.abs(edge - start) > 1)
        found.push(
          finding(
            'L-90',
            item,
            `a wrapped line starts ${round(Math.abs(edge - start))}px from the row's start`
          )
        );
    }
  }
  return found;
}

/**
 * State plates (L-91): a row's state ground drawn inside its own box. Two neighbouring rows in a
 * state show 4px to 8px of card between their plates.
 */
function plates(root: Document): Finding[] {
  const found: Finding[] = [];
  // A plate is the row's own ground, or a ground its ::before lays inside it.
  const plate = (row: Element): DOMRect | null => {
    const box = row.getBoundingClientRect();
    const own = getComputedStyle(row);
    if (rgba(own.backgroundColor).a > 0) {
      const clipped = own.backgroundClip === 'padding-box';
      const top = box.top + (clipped ? parseFloat(own.borderTopWidth) : 0);
      const bottom = box.bottom - (clipped ? parseFloat(own.borderBottomWidth) : 0);
      return new DOMRect(box.left, top, box.width, bottom - top);
    }
    const look = getComputedStyle(row, '::before');
    if (look.content === 'none' || look.position !== 'absolute') return null;
    if (rgba(look.backgroundColor).a === 0) return null;
    const top = box.top + parseFloat(look.top);
    const bottom = box.bottom - parseFloat(look.bottom);
    return new DOMRect(box.left, top, box.width, bottom - top);
  };
  for (const row of audited(root, 'li')) {
    const next = row.nextElementSibling;
    if (!next || !shown(next)) continue;
    const [above, below] = [plate(row), plate(next)];
    if (!above || !below) continue;
    const gap = below.top - above.bottom;
    if (gap < 3.5 || gap > 8.5)
      found.push(
        finding('L-91', next, `two state plates stand ${round(gap)}px apart, not 4px to 8px`)
      );
  }
  return found;
}

/**
 * A setting row (L-36): its controls never move its copy, they end at the row's end, and its
 * reset, shown or keeping its seat, stands right before them on their first line, or ends the
 * first line of a control that grows, centred on that line within half a pixel (hanging on the
 * first line of a control that wraps), and lends the row no height.
 */
function settingResets(root: Document): Finding[] {
  const found: Finding[] = [];
  for (const row of audited(root, '.sui-setting-row')) {
    const side = row.querySelector(':scope > .sui-setting-value');
    const controls = side?.querySelector(':scope > .sui-setting-control');
    if (!side || !controls) continue;
    const look = getComputedStyle(row);
    const rtl = look.direction === 'rtl';
    const box = row.getBoundingClientRect();
    const end = (rect: DOMRect) =>
      rtl
        ? rect.left - box.left - parseFloat(look.paddingLeft)
        : box.right - parseFloat(look.paddingRight) - rect.right;
    const stacked = row.classList.contains('stacked');
    // The copy stands where it stands with no control beside it: taken out for a moment, the
    // controls and the reset must leave every line of the copy where it was. The copy keeps its
    // width meanwhile, so it keeps its lines and only the controls' height could move it.
    const say = row.querySelector<HTMLElement>(':scope > .sui-setting-say');
    const lines = [...(say?.children ?? [])].filter(shown);
    const at = () => lines.map((line) => line.getBoundingClientRect().top - box.top);
    const placed = at();
    const parts = [...side.children] as HTMLElement[];
    const shows = parts.map((part) => part.style.display);
    const width = say?.style.maxInlineSize ?? '';
    if (say) say.style.maxInlineSize = `${say.getBoundingClientRect().width}px`;
    for (const part of parts) part.style.display = 'none';
    const bare = at();
    parts.forEach((part, index) => (part.style.display = shows[index]));
    if (say) say.style.maxInlineSize = width;
    const moved = Math.max(0, ...placed.map((top, index) => Math.abs(top - bare[index])));
    if (moved > 0.5)
      found.push(finding('L-36', row, `its controls move the copy ${round(moved)}px`));
    const short = end((stacked ? side : controls).getBoundingClientRect());
    if (Math.abs(short) > 0.5)
      found.push(
        finding('L-36', row, `the controls stop ${round(short)}px short of the row's end`)
      );

    const reset = side.querySelector(':scope > .sui-setting-reset button');
    if (!reset) continue;
    const own = reset.getBoundingClientRect();
    const first = [...controls.querySelectorAll(INTERACTIVE)]
      .map((part) => part.getBoundingClientRect())
      .filter((rect) => rect.width > 1 && rect.height > 1)
      .sort((a, b) => a.top - b.top)[0];
    if (!first || own.bottom <= first.top || own.top >= first.bottom) continue;
    const off = (own.top + own.bottom) / 2 - (first.top + Math.min(first.height, own.height) / 2);
    if (Math.abs(off) > 0.55)
      found.push(
        finding('L-36', reset, `the reset sits ${round(off)}px off its control's first line`)
      );
    const reach = controls.getBoundingClientRect();
    const apart = stacked
      ? end(own)
      : rtl
        ? own.left - reach.right - parseFloat(getComputedStyle(side).columnGap)
        : reach.left - own.right - parseFloat(getComputedStyle(side).columnGap);
    if (Math.abs(apart) > 0.5)
      found.push(
        finding(
          'L-36',
          reset,
          stacked
            ? `the reset stops ${round(apart)}px short of the row's end`
            : `the reset stands ${round(apart)}px off its control`
        )
      );
    const band = parseFloat(getComputedStyle(side).minBlockSize) || 0;
    const taller = side.getBoundingClientRect().height - Math.max(reach.height, band);
    if (taller > 0.5)
      found.push(finding('L-36', reset, `the reset makes its row ${round(taller)}px taller`));
  }
  return found;
}

/**
 * A changed setting row lays every hover and press veil of its controls in its own ink (L-16).
 * A veil token the row leaves alone still holds the value it took where it was declared, in
 * the neutral ink, and draws grey on the gold plate.
 */
function unsavedVeils(root: Document): Finding[] {
  const found: Finding[] = [];
  const veils = [
    '--sui-row-hover',
    '--sui-field-hover',
    '--sui-field-recess',
    '--sui-field-recess-hover',
    '--sui-row-pressed',
    '--sui-interactive-hover-layer',
    '--sui-interactive-pressed',
    '--sui-segment-hover',
    '--sui-segment-pressed'
  ];
  for (const row of audited(root, '.sui-setting-row[data-unsaved]')) {
    const own = getComputedStyle(row);
    const around = row.parentElement && getComputedStyle(row.parentElement);
    for (const veil of veils)
      if (around && own.getPropertyValue(veil).trim() === around.getPropertyValue(veil).trim())
        found.push(finding('L-16', row, `${veil} keeps the neutral veil on the changed plate`));
  }
  return found;
}

/**
 * Field recesses (L-9): every field frame a reader types or picks in draws one line under its
 * top edge, an inset shadow a stroke deep with no blur, darker than its frame on the field's own
 * ground in every state. A read-only field sits in the inset well, no place to type, and draws
 * none.
 */
function fieldRecesses(root: Document): Finding[] {
  const found: Finding[] = [];
  const frames =
    '.sui-text-input:not(.bare), .sui-textarea, .sui-select:not(.bare) .sui-select-control, .sui-joined';
  for (const field of audited(root, frames)) {
    const look = getComputedStyle(field);
    const stroke = parseFloat(look.borderTopWidth);
    const line = (look.boxShadow === 'none' ? [] : look.boxShadow.split(/,(?![^(]*\))/))
      .filter((shadow) => shadow.includes('inset'))
      .map((shadow) => {
        const [x, y, blur, spread] = [
          ...shadow.replace(/[a-z-]+\([^)]*\)/g, '').matchAll(/-?[\d.]+px/g)
        ].map(([length]) => parseFloat(length));
        return { color: shadow.match(/[a-z-]+\([^)]*\)/)?.[0], x, y, blur, spread };
      })
      .find(({ x, y, blur, spread }) => x === 0 && y === stroke && blur === 0 && spread === 0);
    const well =
      '.sui-text-input[readonly]:not(.held, [aria-expanded="true"]), .sui-joined.readonly';
    if (field.matches(well)) {
      if (line) found.push(finding('L-9', field, 'a read-only field draws a recess'));
      continue;
    }
    if (!line?.color) {
      found.push(finding('L-9', field, 'a field draws no recess under its top edge'));
      continue;
    }
    const ground = paintedGround(field);
    const frame = rgba(look.getPropertyValue('--sui-field-frame'));
    if (lightness(over(rgba(line.color), ground)) >= lightness(over(frame, ground)))
      found.push(finding('L-9', field, 'its recess is no darker than its frame'));
  }
  return found;
}

/**
 * Where the reader is (L-85): a current navigation row stands apart from a resting peer by its
 * ink, 3:1 from the peer's, so its quiet plate needs no ring or edge, and it draws none. A row
 * whose words may wrap keeps the peer's font, so turning current never rewraps them or changes
 * its height. A current tab, whose words never wrap, carries its bar too, at 3:1 on the ground.
 */
function currentMarks(root: Document): Finding[] {
  const found: Finding[] = [];
  const rows = '.sui-side-nav-row, .sui-rail-tile, .sui-page-toc-link, .sui-tabs-tab';
  // What a row says: the box of its first words a sighted reader sees, past any hidden badge.
  const words = (row: Element): Element => {
    const walker = root.createTreeWalker(row, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const box = node.parentElement;
      if (node.textContent?.trim() && box && shown(box) && !box.closest('[aria-hidden="true"]'))
        return box;
    }
    return row;
  };
  for (const current of audited(root, `:is(${rows})[aria-current]`)) {
    const kind = rows.split(', ').find((selector) => current.matches(selector)) ?? '';
    const peer = [...(current.closest('nav')?.querySelectorAll(kind) ?? [])].find(
      (other) => other.tagName === current.tagName && !other.hasAttribute('aria-current')
    );
    if (current.matches('.sui-tabs-tab')) {
      const bar = getComputedStyle(current, '::after');
      const ground = paintedGround(current);
      const ratio = contrast(over(rgba(bar.backgroundColor), ground), ground);
      if (bar.content === 'none' || ratio < 2.95)
        found.push(finding('L-85', current, `the current tab's bar holds ${round(ratio)}:1`));
    }
    for (const pseudo of ['', '::before', '::after']) {
      const edge = getComputedStyle(current, pseudo || null);
      const drawn = ['top', 'right', 'bottom', 'left'].some(
        (side) =>
          parseFloat(edge.getPropertyValue(`border-${side}-width`)) > 0 &&
          edge.getPropertyValue(`border-${side}-style`) !== 'none'
      );
      if (drawn && (pseudo === '' || edge.content !== 'none'))
        found.push(finding('L-85', current, `the current row draws a ring or edge${pseudo}`));
    }
    if (!peer || !shown(peer)) continue;
    const look = getComputedStyle(words(current));
    const rest = getComputedStyle(words(peer));
    const face = (style: CSSStyleDeclaration) => [
      style.fontWeight,
      style.fontSize,
      style.fontStyle,
      style.letterSpacing,
      style.fontFamily
    ];
    if (!current.matches('.sui-tabs-tab') && face(look).join() !== face(rest).join())
      found.push(
        finding(
          'L-85',
          current,
          `the current words take ${face(look)[0]}, a rest row ${face(rest)[0]}, so they can rewrap`
        )
      );
    const inks = contrast(rgba(look.color), rgba(rest.color));
    if (inks < 2.95)
      found.push(
        finding('L-85', current, `the current ink stands ${round(inks)}:1 from a rest row`)
      );
  }
  return found;
}

/**
 * A changed row (L-16): every edge inside it wears the unsaved family, so no neutral line sits
 * on the gold plate. The tokens are read inside the row, where it has set them.
 */
function changedEdges(root: Document): Finding[] {
  const found: Finding[] = [];
  const tokens = [
    'unsaved-field-border',
    'unsaved-field-border-hover',
    'unsaved-control-border',
    'unsaved-border',
    'unsaved-secondary',
    'unsaved-ink',
    'decision-accent',
    'decision-accent-hover',
    'decision-accent-pressed',
    'focus'
  ];
  for (const row of audited(root, '[data-unsaved]')) {
    const ground = rgba(getComputedStyle(row, '::before').backgroundColor);
    const read = (name: string) => {
      const probe = document.createElement('span');
      probe.style.color = `var(--sui-${name})`;
      row.append(probe);
      const color = rgba(getComputedStyle(probe).color);
      probe.remove();
      return over(color, ground);
    };
    const family = tokens.map(read);
    for (const element of row.querySelectorAll('*')) {
      if (element.closest(':popover-open') || !shown(element)) continue;
      const look = getComputedStyle(element);
      for (const side of ['top', 'right', 'bottom', 'left']) {
        if (parseFloat(look.getPropertyValue(`border-${side}-width`)) === 0) continue;
        const edge = rgba(look.getPropertyValue(`border-${side}-color`));
        if (edge.a === 0) continue;
        const seen = over(edge, ground);
        if (family.every((color) => deltaE(color, seen) > 3)) {
          found.push(finding('L-16', element, 'an edge in a changed row keeps a neutral colour'));
          break;
        }
      }
    }
  }
  return found;
}

/**
 * Controls on a state (L-92): inside a container that wears a warning, a danger or an unsaved
 * decision, no control keeps a neutral edge. Neutral is a Lab chroma under 4 once the edge is
 * laid on the container's ground.
 */
function tonedControls(root: Document): Finding[] {
  const found: Finding[] = [];
  const states =
    ".sui-callout[data-tone='warning'], .sui-callout.decision, .sui-save-bar, .sui-error-state";
  for (const holder of audited(root, states)) {
    const ground = over(
      rgba(getComputedStyle(holder).backgroundColor),
      token('--sui-surface-base')
    );
    for (const control of holder.querySelectorAll('button, a.sui-button, input, select')) {
      if (control.closest(':popover-open') || !shown(control)) continue;
      const look = getComputedStyle(control);
      if (parseFloat(look.borderTopWidth) === 0) continue;
      const edge = rgba(look.borderTopColor);
      if (edge.a === 0) continue;
      const [, a, b] = lab(over(edge, ground));
      if (Math.hypot(a, b) < 4)
        found.push(finding('L-92', control, 'a control on a state keeps a neutral edge'));
    }
  }
  return found;
}

/**
 * A dialog's parts (L-58): the head, the body, the error and the actions stand one inset from
 * every edge and from each other, measured to the ink. A body that scrolls is cut where the
 * actions begin, and a docked inspector parks them at its foot, so neither gap is weighed.
 */
function dialogInsets(root: Document): Finding[] {
  const found: Finding[] = [];
  for (const dialog of audited(root, '.sui-modal')) {
    const head = dialog.querySelector(':scope > .sui-modal-head');
    const title = head?.querySelector('.sui-modal-title');
    const buttons = [...dialog.querySelectorAll(':scope > .sui-modal-foot button')].filter(shown);
    if (!head || !title || buttons.length === 0) continue;
    // A box that scrolls as one, as on a short screen, has no bottom edge in view to weigh.
    if (dialog.scrollHeight > dialog.clientHeight + 1) continue;
    const inset = parseFloat(getComputedStyle(head).paddingInlineStart);
    const look = getComputedStyle(dialog);
    const box = dialog.getBoundingClientRect();
    const rtl = look.direction === 'rtl';
    const band = (parts: Element[]) => {
      const boxes = parts.filter(shown).map((part) => part.getBoundingClientRect());
      return boxes.length === 0
        ? null
        : {
            top: Math.min(...boxes.map((b) => b.top)),
            bottom: Math.max(...boxes.map((b) => b.bottom)),
            end: rtl
              ? Math.min(...boxes.map((b) => b.left))
              : Math.max(...boxes.map((b) => b.right))
          };
    };
    // Titles, descriptions and error words are trimmed to their ink; fields and buttons draw
    // their frames, so a box is what a reader sees.
    const body = dialog.querySelector(':scope > .sui-modal-body');
    // A form that only owns the fields (`display: contents`) is weighed by the fields it holds.
    const laid = (part: Element): Element[] =>
      getComputedStyle(part).display === 'contents' ? [...part.children].flatMap(laid) : [part];
    const inBody = body ? band([...body.children].flatMap(laid)) : null;
    const bands = [
      band([...head.querySelectorAll('.sui-modal-title, .sui-modal-description')]),
      inBody,
      band([...dialog.querySelectorAll(':scope > .sui-modal-error .sui-modal-error-text')]),
      band(buttons)
    ].filter((part) => part !== null);
    const foot = bands[bands.length - 1];
    const cut = body !== null && inBody !== null && body.scrollHeight > body.clientHeight + 1;
    const docked = dialog.matches("[data-size='inspector']:not(.preview)");
    // Each gap is weighed against the band under it, and the last against the bottom edge.
    const gaps = [...bands, null].flatMap((under, at) => {
      const over = bands[at - 1];
      if ((cut && (under === inBody || over === inBody)) || (docked && under === foot)) return [];
      if (!under) return [box.bottom - parseFloat(look.borderBottomWidth) - over.bottom];
      if (!over) return [under.top - box.top - parseFloat(look.borderTopWidth)];
      return [under.top - over.bottom];
    });
    const end = rtl
      ? foot.end - box.left - parseFloat(look.borderLeftWidth)
      : box.right - parseFloat(look.borderRightWidth) - foot.end;
    if ([...gaps, end].some((gap) => Math.abs(gap - inset) > 0.5))
      found.push(
        finding(
          'L-58',
          dialog,
          `its parts stand ${gaps.map(round).join(', ')}px apart from top to bottom and its actions ${round(end)}px from the end, not ${inset}px`
        )
      );
  }
  return found;
}

/**
 * A message's symbol (L-56): a 2rem tile holding an 18px glyph. Copy shorter than the tile
 * centres on it, and longer copy starts at its top.
 */
function symbolTiles(root: Document): Finding[] {
  const found: Finding[] = [];
  const rem = parseFloat(getComputedStyle(root.documentElement).fontSize);
  for (const tile of audited(root, '.sui-callout-icon, .sui-toast-mark')) {
    const box = tile.getBoundingClientRect();
    if (Math.abs(box.width - 2 * rem) > 0.5 || Math.abs(box.height - 2 * rem) > 0.5)
      found.push(finding('L-56', tile, `the symbol's tile is ${round(box.width)}px, not 2rem`));
    const glyph = tile.querySelector('svg')?.getBoundingClientRect();
    if (glyph && Math.abs(glyph.width - 18) > 0.5)
      found.push(finding('L-56', tile, `the symbol draws at ${round(glyph.width)}px, not 18px`));
    // A toast's copy shares a column with the action under it.
    const beside = tile.nextElementSibling;
    const copy = beside?.querySelector(':scope > .sui-toast-copy') ?? beside;
    const lines = copy
      ? [...copy.children].filter(shown).map((line) => line.getBoundingClientRect())
      : [];
    const top = Math.min(...lines.map((line) => line.top));
    // Copy that a narrow message moves under its tile no longer stands beside it.
    if (lines.length === 0 || top >= box.bottom) continue;
    const bottom = Math.max(...lines.map((line) => line.bottom));
    const off =
      bottom - top < box.height ? (top + bottom) / 2 - (box.top + box.bottom) / 2 : top - box.top;
    if (Math.abs(off) > 0.5)
      found.push(finding('L-56', tile, `the copy stands ${round(off)}px off its symbol's tile`));
  }
  return found;
}

/**
 * A callout's actions (L-56) stand at its inline end, centred on its message, and move under
 * the copy, from the copy's start edge, only when the callout cannot hold them beside its
 * measure of copy (`--sui-callout-measure`).
 */
function calloutActions(root: Document): Finding[] {
  const found: Finding[] = [];
  for (const actions of audited(root, '.sui-callout-actions')) {
    const inner = actions.parentElement;
    const message = inner?.querySelector(':scope > .sui-callout-message');
    const copy = message?.querySelector(':scope > .sui-callout-copy');
    if (!inner || !message || !copy || !shown(actions)) continue;
    const own = actions.getBoundingClientRect();
    const said = message.getBoundingClientRect();
    if (own.top < said.bottom - 0.5) {
      const off = (own.top + own.bottom) / 2 - (said.top + said.bottom) / 2;
      if (Math.abs(off) > 0.5)
        found.push(
          finding('L-56', actions, `the actions sit ${round(off)}px off the message's middle`)
        );
      // Beside the message they live inside its band, so they never raise the callout (L-34).
      if (own.height > said.height + 0.5)
        found.push(
          finding(
            'L-34',
            actions,
            `the actions stand ${round(own.height - said.height)}px taller than the message`
          )
        );
      continue;
    }
    const rtl = getComputedStyle(inner).direction === 'rtl';
    const words = copy.getBoundingClientRect();
    const startOff = rtl ? words.right - own.right : own.left - words.left;
    if (Math.abs(startOff) > 0.5)
      found.push(
        finding('L-56', actions, `wrapped actions start ${round(startOff)}px off the copy's edge`)
      );
    // What the actions need on one line, against what the copy's measure leaves beside it.
    const parts = [...actions.children].filter(shown);
    const look = getComputedStyle(actions);
    const need =
      parts.reduce((sum, part) => sum + part.getBoundingClientRect().width, 0) +
      Math.max(0, parts.length - 1) * parseFloat(look.columnGap);
    const probe = document.createElement('div');
    probe.style.cssText = 'position: absolute; inline-size: var(--sui-callout-measure)';
    inner.append(probe);
    const measure = probe.getBoundingClientRect().width;
    probe.remove();
    const room = (rtl ? words.right - said.left : said.right - words.left) - measure;
    if (need + parseFloat(getComputedStyle(inner).columnGap) <= room - 1)
      found.push(
        finding(
          'L-56',
          actions,
          `the actions wrap under the copy while ${round(room)}px beside its measure holds their ${round(need)}px`
        )
      );
  }
  return found;
}

/**
 * Where a box puts ink: from the first to the last edge of a framed or grounded box inside it,
 * or from a line's cap to a line's baseline, whichever reaches further.
 */
function inkBand(box: Element): { top: number; bottom: number } | null {
  let top = Infinity;
  let bottom = -Infinity;
  const range = document.createRange();
  const walker = document.createTreeWalker(box, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node instanceof Element) {
      if (!shown(node)) continue;
      const look = getComputedStyle(node);
      const edged = (side: 'Top' | 'Bottom') =>
        parseFloat(look[`border${side}Width`]) > 0 && rgba(look[`border${side}Color`]).a > 0;
      const ground = paintsGround(look);
      const edges = node.getBoundingClientRect();
      if (ground || edged('Top')) top = Math.min(top, edges.top);
      if (ground || edged('Bottom')) bottom = Math.max(bottom, edges.bottom);
      continue;
    }
    const holder = node.parentElement;
    if (!node.textContent?.trim() || !holder || !shown(holder) || heardOnly(holder)) continue;
    const face = faceMetrics(getComputedStyle(holder));
    range.selectNodeContents(node);
    const lines = [...range.getClientRects()].filter((rect) => rect.width > 0);
    if (!face || lines.length === 0) continue;
    top = Math.min(top, lines[0].top + face.ascent - face.cap);
    bottom = Math.max(bottom, lines[lines.length - 1].top + face.ascent);
  }
  return Number.isFinite(top) && Number.isFinite(bottom) ? { top, bottom } : null;
}

/**
 * Disclosures (L-57): the chevron leads the summary's words, and open content starts at those
 * words, so the summary and what it reveals share one start edge in either direction. The
 * content's first ink stands a copy gap under the summary's box, so the ground a hover paints
 * there never touches it, and its last ink stands as far above the disclosure's foot as the
 * summary's words stand under its top. A disclosure that closes a card leaves that room to
 * the card's inset, which the card's own check holds (L-33).
 */
function disclosures(root: Document): Finding[] {
  const found: Finding[] = [];
  const probe = root.createElement('span');
  probe.style.marginBlockStart = 'var(--sui-row-copy-gap)';
  root.body.append(probe);
  const gap = parseFloat(getComputedStyle(probe).marginBlockStart);
  probe.remove();
  for (const details of audited(root, 'details.sui-disclosure')) {
    const summary = details.querySelector(':scope > summary');
    const chevron = summary?.querySelector(':scope > .sui-disclosure-chevron');
    const words = summary?.querySelector(':scope > .sui-disclosure-label');
    if (!summary || !chevron || !words) continue;
    const rtl = getComputedStyle(details).direction === 'rtl';
    const start = (box: DOMRect) => (rtl ? -box.right : box.left);
    const end = (box: DOMRect) => (rtl ? -box.left : box.right);
    const label = start(words.getBoundingClientRect());
    if (end(chevron.getBoundingClientRect()) > label + 0.5)
      found.push(finding('L-57', details, "the chevron does not lead the summary's words"));
    const body = details.querySelector(':scope > .sui-disclosure-body');
    if (!(details as HTMLDetailsElement).open || !body || !shown(body)) continue;
    const content =
      start(body.getBoundingClientRect()) + parseFloat(getComputedStyle(body).paddingInlineStart);
    if (Math.abs(content - label) > 0.5)
      found.push(
        finding(
          'L-57',
          body,
          `the content starts ${round(content - label)}px off the summary's words`
        )
      );
    const ink = inkBand(body);
    const wordsInk = inkBand(words);
    if (!ink || !wordsInk) continue;
    const under = ink.top - summary.getBoundingClientRect().bottom;
    if (Math.abs(under - gap) > 0.5)
      found.push(
        finding(
          'L-57',
          body,
          `the content's first ink stands ${round(under)}px under the summary's ground, not ${round(gap)}px`
        )
      );
    if (details.matches('.sui-card-body:last-child > :last-child')) continue;
    const above = wordsInk.top - details.getBoundingClientRect().top;
    const below = details.getBoundingClientRect().bottom - ink.bottom;
    if (Math.abs(below - above) > 0.5)
      found.push(
        finding(
          'L-57',
          details,
          `the content's last ink stands ${round(below)}px above the foot, and the summary's words ${round(above)}px under the top`
        )
      );
  }
  return found;
}

/**
 * Painted swatches (L-93): a colour the reader picked holds 3:1 on its ground, or its ring
 * does. The ring is a box shadow on a mark and a border on a swatch.
 */
function swatches(root: Document): Finding[] {
  const found: Finding[] = [];
  const marks = audited(
    root,
    '[style*="--sui-color-picker-value"], [style*="--sui-color-picker-swatch"]'
  ).filter((element) => element.matches('.mark, .swatch'));
  for (const mark of marks) {
    const look = getComputedStyle(mark);
    const ground = paintedGround(mark.parentElement ?? mark);
    const fill = over(rgba(look.backgroundColor), ground);
    if (contrast(fill, ground) >= 2.95) continue;
    const ring = mark.matches('.swatch')
      ? look.borderTopColor
      : (look.boxShadow.match(/^(?:[a-z-]+\([^)]*\)|#[0-9a-f]+|[a-z]+)/i)?.[0] ?? 'transparent');
    if (contrast(over(rgba(ring), ground), ground) < 2.95)
      found.push(finding('L-93', mark, 'a swatch and its ring both fall under 3:1 on the ground'));
  }
  return found;
}

/**
 * Icons beside text that wraps (L-94): a menu item's or option's leading icon centres on the
 * first line of its text, never on the middle of a block of two or more lines.
 */
/** The first line of words a reader sees in `row`, outside `skip`, and its cap band's middle. */
function firstLine(row: Element, skip?: Element): { line: DOMRect; capMiddle: number } | null {
  const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const box = node.parentElement;
    if (!node.textContent?.trim() || !box || skip?.contains(node)) continue;
    if (box.closest('.sui-visually-hidden, [aria-hidden="true"]') || !shown(box)) continue;
    if (heardOnly(box)) continue;
    range.selectNodeContents(node);
    const line = [...range.getClientRects()].find((rect) => rect.width > 0);
    if (!line) continue;
    const face = faceMetrics(getComputedStyle(box));
    return face ? { line, capMiddle: line.top + face.ascent - face.cap / 2 } : null;
  }
  return null;
}

function leadingIcons(root: Document): Finding[] {
  const found: Finding[] = [];
  // A message's symbol stands in a tile that L-56 places against the whole copy.
  const tiles = '.sui-callout-icon, .sui-toast-mark';
  for (const icon of audited(root, 'svg.tier')) {
    const glyph = icon.getBoundingClientRect();
    if (glyph.width === 0 || icon.closest(tiles)) continue;
    // The icon's own box is a wrapper that holds nothing else; the words are outside it.
    const parent = icon.parentElement;
    const holder =
      parent && parent.childElementCount === 1 && !parent.textContent?.trim() ? parent : icon;
    const row = holder.parentElement;
    if (!row || row.closest('.sui-visually-hidden')) continue;
    const first = firstLine(row, holder);
    // Only a mark that stands beside its words on their first line: one stacked over them, or
    // beside a control rather than words, is not weighed here.
    if (!first || first.line.bottom < glyph.top || first.line.top > glyph.bottom) continue;
    const off = (glyph.top + glyph.bottom) / 2 - first.capMiddle;
    // A mark on whole pixels lands within half a pixel of any middle.
    if (Math.abs(off) > 0.55)
      found.push(
        finding('L-94', icon, `the icon sits ${round(off)}px off the middle of its words' cap`)
      );
  }
  return found;
}

/**
 * Whole pixels (L-95): no box is born with a fractional height. A box counts when its own
 * height is fractional while every box it holds is whole, so a fraction is reported where it
 * starts and not again in everything it pushes down. Moving and inline boxes are left out.
 */
function wholePixels(root: Document): Finding[] {
  const found: Finding[] = [];
  const fractional = (value: number) => Math.abs(value - Math.round(value)) > 0.02;
  const counts = (element: Element) => {
    const look = getComputedStyle(element);
    return (
      !/^(inline|contents)$/.test(look.display) &&
      look.transform === 'none' &&
      look.animationName === 'none' &&
      !/^(absolute|fixed)$/.test(look.position)
    );
  };
  // SVG content is drawn in user units, not laid out in boxes: a text's box is its glyphs' own
  // extent and is fractional by nature, so only the svg element itself is measured.
  for (const element of audited(root, 'main *:not(svg *)')) {
    if (!counts(element)) continue;
    const height = element.getBoundingClientRect().height;
    if (!fractional(height)) continue;
    const born = [...element.children].every(
      (child) =>
        !counts(child) || !shown(child) || !fractional(child.getBoundingClientRect().height)
    );
    if (born)
      found.push(finding('L-95', element, `a ${round(height)}px box starts off the pixel grid`));
  }

  // A whole box can still be centred into an odd remainder. Only an edge shows it, so each
  // border, outline or ground drawn off the grid names the box where the half pixel enters.
  const top = (element: Element) => element.getBoundingClientRect().top + scrollY;
  const still = (element: Element) => {
    for (let node: Element | null = element; node; node = node.parentElement) {
      const look = getComputedStyle(node);
      if (!counts(node) && look.display !== 'inline' && look.display !== 'contents') return false;
      if (/^(fixed|sticky)$/.test(look.position)) return false;
      if ([look.translate, look.scale, look.rotate].some((value) => value !== 'none')) return false;
    }
    return true;
  };
  const edged = (element: Element) => {
    const look = getComputedStyle(element);
    const border = (['Top', 'Bottom'] as const).some(
      (side) => parseFloat(look[`border${side}Width`]) > 0 && rgba(look[`border${side}Color`]).a > 0
    );
    const outline = look.outlineStyle !== 'none' && parseFloat(look.outlineWidth) > 0;
    return border || outline || rgba(look.backgroundColor).a > 0;
  };
  const named = new Set<Element>();
  for (const element of audited(root, 'main *:not(svg, svg *)')) {
    if (!fractional(top(element)) || !edged(element) || !still(element)) continue;
    let born = element;
    while (
      born.parentElement &&
      born.parentElement.closest('main') &&
      fractional(top(born.parentElement))
    )
      born = born.parentElement;
    if (named.has(born)) continue;
    named.add(born);
    found.push(finding('L-95', born, 'a box is centred half a pixel off the grid'));
  }
  return found;
}

/**
 * How far past its border box an element paints a ring: an outline beyond its offset, or a
 * hard box-shadow ring (no offset, no blur). A soft elevation shadow may fade under a clip.
 */
export function ringReach(look: CSSStyleDeclaration): number {
  let reach =
    look.outlineStyle !== 'none'
      ? parseFloat(look.outlineOffset) + parseFloat(look.outlineWidth)
      : 0;
  for (const shadow of look.boxShadow === 'none' ? [] : look.boxShadow.split(/,(?![^(]*\))/)) {
    if (shadow.includes('inset')) continue;
    const [x = 0, y = 0, blur = 0, spread = 0] = [
      ...shadow.replace(/[a-z-]+\([^)]*\)/g, '').matchAll(/-?[\d.]+px/g)
    ].map(([length]) => parseFloat(length));
    if (x === 0 && y === 0 && blur === 0) reach = Math.max(reach, spread);
  }
  return reach;
}

/** The sides of a ring that the nearest clipping ancestor cuts while the box itself shows. */
export function cutSides(element: Element, reach: number): string[] {
  const box = element.getBoundingClientRect();
  for (
    let node = element.parentElement;
    node && node !== document.body;
    node = node.parentElement
  ) {
    const look = getComputedStyle(node);
    const paint = /paint|content|strict/.test(look.contain);
    const clipsX = paint || look.overflowX !== 'visible';
    const clipsY = paint || look.overflowY !== 'visible';
    if (!clipsX && !clipsY) continue;
    const edge = node.getBoundingClientRect();
    const top = edge.top + parseFloat(look.borderTopWidth);
    const bottom = edge.bottom - parseFloat(look.borderBottomWidth);
    const left = edge.left + parseFloat(look.borderLeftWidth);
    const right = edge.right - parseFloat(look.borderRightWidth);
    const slack = 0.5;
    return [
      clipsY && box.top >= top - slack && box.top - reach < top - slack && 'top',
      clipsY && box.bottom <= bottom + slack && box.bottom + reach > bottom + slack && 'bottom',
      clipsX && box.left >= left - slack && box.left - reach < left - slack && 'left',
      clipsX && box.right <= right + slack && box.right + reach > right + slack && 'right'
    ].filter((side): side is string => Boolean(side));
  }
  return [];
}

/**
 * Code lines (L-65): every line of a code or diff block is one height. A diff block's first
 * and last lines meet its edges, so their tones run to them; a code block keeps one even air
 * above its first line and under its last, and its copy control centres on the first line.
 */
function codeLines(root: Document): Finding[] {
  const found: Finding[] = [];
  // The copy row: a quiet-tier control with 8px above and below it.
  const probe = root.createElement('div');
  probe.style.blockSize = 'calc(var(--sui-tier-quiet) + 2 * var(--sui-space-2))';
  root.body.append(probe);
  const row = probe.getBoundingClientRect().height;
  probe.remove();
  for (const block of audited(root, '.sui-code-block, .sui-diff-block')) {
    const lines = [...block.querySelectorAll('code > *')].filter(shown);
    const scroller = lines[0]?.closest('pre');
    if (!scroller) continue;
    const heights = new Set(lines.map((line) => round(line.getBoundingClientRect().height)));
    if (heights.size > 1)
      found.push(finding('L-65', block, `its lines are ${[...heights].join(', ')}px tall`));
    const edge = scroller.getBoundingClientRect();
    const first = lines[0].getBoundingClientRect();
    const gaps = [
      first.top - edge.top - scroller.clientTop,
      edge.bottom -
        lines.at(-1)!.getBoundingClientRect().bottom -
        parseFloat(getComputedStyle(scroller).borderBottomWidth)
    ];
    const code = block.matches('.sui-code-block');
    const air = code ? (row - first.height) / 2 : 0;
    if (gaps.some((gap) => Math.abs(gap - air) > 0.5))
      found.push(
        finding(
          'L-65',
          block,
          `${gaps.map((gap) => round(gap)).join(' and ')}px of ground around its lines, not ${round(air)}px`
        )
      );
    const copy = block.querySelector(':scope > .sui-code-block-copy .sui-copy-button');
    if (!code || !copy || block.matches('.labelled')) continue;
    const box = copy.getBoundingClientRect();
    const off = (box.top + box.bottom) / 2 - (first.top + first.bottom) / 2;
    if (Math.abs(off) > 0.5)
      found.push(
        finding('L-65', block, `its copy control sits ${round(off)}px off its first line`)
      );
  }
  return found;
}

/**
 * A press never selects words (L-42): every control a reader presses, text links aside, sets
 * `user-select: none`, so a double press or a press that drags never highlights its label.
 */
function pressSelection(root: Document): Finding[] {
  const found: Finding[] = [];
  const pressable =
    "button, select, summary, [role='menuitem'], [role='option'], [role='tab'], label:has(input:is([type='checkbox'], [type='radio'])), a[href]";
  const textLinks = '.sui-link, .sui-back-link, .sui-skip-link, .sui-breadcrumb a, p a';
  for (const control of audited(root, `main :is(${pressable})`)) {
    if (control.matches(textLinks) || !(control as HTMLElement).innerText?.trim()) continue;
    const look = getComputedStyle(control);
    if ((look.userSelect || look.webkitUserSelect) !== 'none')
      found.push(finding('L-42', control, 'a press can select its words'));
  }
  return found;
}

/**
 * What a chart draws (L-5, L-66): its words hold 4.5:1 on the plot's ground, and every mark that
 * carries data holds 3:1 there, unless the mark also prints its value (`data-labelled`). Grid
 * lines are a backdrop and are spared.
 */
function chartInk(root: Document): Finding[] {
  const found: Finding[] = [];
  for (const svg of audited(root, 'svg:has(text, path, circle, rect, line)')) {
    if (!svg.closest('.sui-chart')) continue;
    const ground = paintedGround(svg);
    for (const text of svg.querySelectorAll('text')) {
      if (!shown(text) || !text.textContent?.trim()) continue;
      const ratio = contrast(over(rgba(getComputedStyle(text).fill), ground), ground);
      if (ratio < 4.5)
        found.push(finding('L-5', text, `chart text contrast ${round(ratio)} under 4.5`));
    }
    for (const mark of svg.querySelectorAll('path, circle, rect, line, polyline')) {
      if (!shown(mark) || mark.matches('.grid, [data-labelled], [data-labelled] *')) continue;
      // A marker may wear a ring of the ground around its fill, so the stronger of the two
      // paints is the one that shows the mark.
      const look = getComputedStyle(mark);
      const paints = [
        look.stroke !== 'none' && parseFloat(look.strokeWidth) > 0 ? look.stroke : 'none',
        look.fill
      ].filter((paint) => paint !== 'none' && rgba(paint).a > 0);
      if (paints.length === 0) continue;
      const ratio = Math.max(...paints.map((paint) => contrast(over(rgba(paint), ground), ground)));
      if (ratio < 3)
        found.push(finding('L-66', mark, `a data mark holds ${round(ratio)}:1, under 3`));
    }
  }
  return found;
}

/**
 * A chart's plot is laid out to its ink (L-66): its first ink starts on the band's inner edges
 * and its last ends on the edges of the box it fills, the band's full width or, for a matrix,
 * its last column, each within a pixel.
 */
function chartEdges(root: Document): Finding[] {
  const found: Finding[] = [];
  for (const svg of audited(root, '.sui-chart .plot-scroll > svg')) {
    const room = svg.parentElement as HTMLElement;
    if (room.scrollLeft !== 0) continue;
    const look = getComputedStyle(room);
    const edge = room.getBoundingClientRect();
    const box = svg.getBoundingClientRect();
    const ink = wordsInk(svg as SVGSVGElement);
    const gaps = {
      start: ink.left - edge.left - parseFloat(look.borderLeftWidth) - parseFloat(look.paddingLeft),
      top: ink.top - edge.top - parseFloat(look.borderTopWidth) - parseFloat(look.paddingTop),
      end: box.right - ink.right,
      bottom: box.bottom - ink.bottom
    };
    const off = Object.entries(gaps).filter(([, gap]) => Math.abs(gap) > 1);
    if (off.length)
      found.push(
        finding(
          'L-66',
          svg,
          `its ink stands ${off.map(([side, gap]) => `${round(gap)}px from the ${side}`).join(', ')} of its band`
        )
      );
  }
  return found;
}

/**
 * Rings in full (L-96): an outline or a ring shadow at rest is never cut by a clipping box.
 * Focus rings are walked by keyboard in the browser suite, through the same two helpers.
 */
function rings(root: Document): Finding[] {
  const found: Finding[] = [];
  for (const element of audited(root, 'main *')) {
    const reach = ringReach(getComputedStyle(element));
    if (reach <= 0) continue;
    const cut = cutSides(element, reach);
    if (cut.length)
      found.push(finding('L-96', element, `a ${reach}px ring is cut at its ${cut.join(' and ')}`));
  }
  return found;
}

// A "Load more" row is the last row of the list before it: its button controls that list, and
// the hairline the list draws stands as far under the last row's words as the row's own content
// stands under the hairline.
function loadMoreRows(root: Document): Finding[] {
  const found: Finding[] = [];
  for (const row of audited(root, '.sui-load-more')) {
    const list = row.previousElementSibling;
    const button = row.querySelector(':scope > button');
    if (!list?.matches('ul, ol') || (button && button.getAttribute('aria-controls') !== list.id)) {
      found.push(finding('L-63', row, 'it does not follow the list its button loads into'));
      continue;
    }
    const hairline = getComputedStyle(list, '::after');
    if (hairline.content === 'none' || rgba(hairline.backgroundColor).a === 0) {
      found.push(finding('L-63', row, 'the list draws no hairline over it'));
      continue;
    }
    // A pill or a chip at the row's side is ink too, and the lowest ink is the last (L-33).
    const words = [...list.querySelectorAll(':scope > li:last-child *')].flatMap((element) =>
      rgba(getComputedStyle(element).backgroundColor).a > 0
        ? element.getBoundingClientRect().bottom
        : (inkLines(element)?.bottom ?? [])
    );
    const note = row.querySelector('.sui-load-more-text');
    const tops = [button?.getBoundingClientRect().top, note && inkLines(note)?.top].filter(
      (top): top is number => typeof top === 'number'
    );
    if (words.length === 0 || tops.length === 0) continue;
    const line = list.getBoundingClientRect().bottom;
    const above = line - parseFloat(hairline.blockSize) - Math.max(...words);
    const below = Math.min(...tops) - line;
    if (Math.abs(above - below) > 0.5)
      found.push(
        finding(
          'L-63',
          row,
          `the hairline stands ${round(above)}px under the last row's words and ${round(below)}px over this row`
        )
      );
  }
  return found;
}

/** A top or bottom edge a reader sees as a line: a hairline wide, in a colour that shows. */
const hairline = (width: string, color: string) =>
  parseFloat(width) > 0 && parseFloat(width) <= 1.5 && rgba(color).a > 0;

/**
 * Sections (L-108): a section draws no frame, ground or shadow, its title is never uppercase,
 * and nothing in its head draws a line. The actions are left out: a button keeps its own frame.
 */
function sectionHeads(root: Document): Finding[] {
  const found: Finding[] = [];
  const edged = (look: CSSStyleDeclaration) =>
    (['Top', 'Right', 'Bottom', 'Left'] as const).some(
      (side) => parseFloat(look[`border${side}Width`]) > 0 && rgba(look[`border${side}Color`]).a > 0
    );
  const lined = (element: Element) => {
    const look = getComputedStyle(element);
    if (
      hairline(look.borderTopWidth, look.borderTopColor) ||
      hairline(look.borderBottomWidth, look.borderBottomColor) ||
      look.boxShadow !== 'none'
    )
      return true;
    return ['::before', '::after'].some((pseudo) => {
      const drawn = getComputedStyle(element, pseudo);
      return (
        drawn.content !== 'none' &&
        drawn.content !== 'normal' &&
        (paintsGround(drawn) || edged(drawn))
      );
    });
  };
  for (const section of audited(root, '.sui-section')) {
    const look = getComputedStyle(section);
    if (paintsGround(look) || edged(look) || look.boxShadow !== 'none')
      found.push(finding('L-108', section, 'a section draws a frame, a ground or a shadow'));
    const head = section.querySelector(':scope > .sui-section-head');
    const title = head?.querySelector('.sui-section-title');
    if (!head || !title) continue;
    const words = title.querySelector('.sui-section-words') ?? title;
    const text = words.textContent ?? '';
    // Typed capitals count as well as a transform; a lone acronym of three letters does not.
    const shouted =
      [title, words].some((part) => getComputedStyle(part).textTransform !== 'none') ||
      (!/\p{Ll}/u.test(text) && (text.match(/\p{Lu}/gu)?.length ?? 0) > 3);
    if (shouted) found.push(finding('L-108', title, 'a section title is not sentence case'));
    const line = [head, ...head.querySelectorAll('*')].find(
      (part) => !part.closest('.sui-section-actions') && lined(part)
    );
    if (line) found.push(finding('L-108', line, 'a section head draws a line'));
  }
  return found;
}

/**
 * One line per boundary (L-109): two parallel rules that share a stretch never stand within
 * 8px of each other. A rule is a top or bottom border of a box with no side borders, as a
 * frame's edge is not a rule, or a hairline `::before` or `::after`, at least half as wide as
 * its container. Rules on fixed or sticky chrome move against the page, so they are left out,
 * and so are rules a scrolling or clipping box hides, which no reader sees beside another.
 */
function boundaryLines(root: Document): Finding[] {
  const found: Finding[] = [];
  const rules: { element: Element; top: number; left: number; right: number }[] = [];
  const pinned = (element: Element) => {
    for (let node: Element | null = element; node; node = node.parentElement)
      if (/^(fixed|sticky)$/.test(getComputedStyle(node).position)) return true;
    return false;
  };
  const clipped = (element: Element, top: number) => {
    for (let node = element.parentElement; node; node = node.parentElement)
      if (/auto|scroll|hidden|clip/.test(getComputedStyle(node).overflowY)) {
        const box = node.getBoundingClientRect();
        if (top < box.top || top > box.bottom) return true;
      }
    return false;
  };
  for (const element of audited(root, 'body *:not(svg, svg *)')) {
    const look = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    if (box.width <= 1) continue;
    const room = element.parentElement?.getBoundingClientRect().width ?? box.width;
    const sided =
      hairline(look.borderLeftWidth, look.borderLeftColor) ||
      hairline(look.borderRightWidth, look.borderRightColor);
    if (!sided && box.width >= room / 2 - 0.5) {
      if (hairline(look.borderTopWidth, look.borderTopColor))
        rules.push({ element, top: box.top, left: box.left, right: box.right });
      if (hairline(look.borderBottomWidth, look.borderBottomColor))
        rules.push({
          element,
          top: box.bottom - parseFloat(look.borderBottomWidth),
          left: box.left,
          right: box.right
        });
    }
    if (look.position === 'static') continue;
    for (const pseudo of ['::before', '::after']) {
      const drawn = getComputedStyle(element, pseudo);
      if (drawn.content === 'none' || drawn.content === 'normal' || drawn.position !== 'absolute')
        continue;
      const height = parseFloat(drawn.height);
      const width = parseFloat(drawn.width);
      const left = box.left + parseFloat(drawn.left);
      const top = box.top + parseFloat(drawn.top);
      if (!(height > 0 && height <= 1.5) || rgba(drawn.backgroundColor).a === 0) continue;
      if (![width, left, top].every(Number.isFinite) || width < box.width / 2 - 0.5) continue;
      rules.push({ element, top, left, right: left + width });
    }
  }
  const page = rules
    .filter((rule) => !pinned(rule.element) && !clipped(rule.element, rule.top))
    .sort((one, other) => one.top - other.top);
  for (const [index, one] of page.entries())
    for (const other of page.slice(index + 1)) {
      const gap = other.top - one.top;
      if (gap > 8) break;
      if (Math.min(one.right, other.right) - Math.max(one.left, other.left) <= 0.5) continue;
      found.push(
        finding(
          'L-109',
          other.element,
          `a line stands ${round(gap)}px from a parallel one on ${describe(one.element)}`
        )
      );
    }
  return found;
}

/**
 * Hanging rows (L-61): a row that reaches past its list on both sides, so its words keep the
 * heading's edge while its hover or state ground runs the row padding past it, has that room.
 * No clipping ancestor cuts the ground at either side, or the hover shows whole on one side and
 * cut on the other, and a scrolling ancestor would scroll sideways for it.
 */
function rowGrounds(root: Document): Finding[] {
  const found: Finding[] = [];
  for (const row of audited(root, 'main *')) {
    const look = getComputedStyle(row);
    if (parseFloat(look.marginInlineStart) >= 0 || parseFloat(look.marginInlineEnd) >= 0) continue;
    const box = row.getBoundingClientRect();
    for (let node = row.parentElement; node && node !== root.body; node = node.parentElement) {
      const holder = getComputedStyle(node);
      if (!/paint|content|strict/.test(holder.contain) && holder.overflowX === 'visible') continue;
      const edge = node.getBoundingClientRect();
      const left = edge.left + parseFloat(holder.borderLeftWidth);
      const right = edge.right - parseFloat(holder.borderRightWidth);
      const sides: [string, number][] = [
        ['left', left - box.left],
        ['right', box.right - right]
      ];
      const cut = sides
        .filter(([, past]) => past > 0.5)
        .map(([side, past]) => `${round(past)}px at its ${side}`);
      if (cut.length)
        found.push(
          finding('L-61', row, `its ground is cut ${cut.join(' and ')} by ${describe(node)}`)
        );
      break;
    }
  }
  return found;
}

/**
 * Detail panes (L-110): the aside follows the main column in the DOM and on the page, under it
 * when the columns stack and at its inline end when they stand side by side.
 */
function detailPanes(root: Document): Finding[] {
  const found: Finding[] = [];
  for (const layout of audited(root, '.sui-detail-layout')) {
    const columns = ':scope > .sui-detail-layout-columns > ';
    const main = layout.querySelector(`${columns}.sui-detail-layout-main`);
    const aside = layout.querySelector(`${columns}.sui-detail-layout-aside`);
    if (!main || !aside || !shown(aside)) continue;
    if (!(main.compareDocumentPosition(aside) & Node.DOCUMENT_POSITION_FOLLOWING))
      found.push(finding('L-110', aside, 'the aside comes before the main column in the DOM'));
    const first = main.getBoundingClientRect();
    const then = aside.getBoundingClientRect();
    const stacked = Math.min(first.right, then.right) - Math.max(first.left, then.left) > 0.5;
    const rtl = getComputedStyle(layout).direction === 'rtl';
    if (stacked && then.top < first.bottom - 0.5)
      found.push(
        finding(
          'L-110',
          aside,
          `the stacked aside starts ${round(first.bottom - then.top)}px above the main column's foot`
        )
      );
    else if (!stacked && (rtl ? then.right > first.left + 0.5 : then.left < first.right - 0.5))
      found.push(finding('L-110', aside, 'the aside stands before the main column'));
  }
  return found;
}

const FRAMES = '.sui-card, .sui-plate';

/** A box drawn by a visible edge on all four sides. */
function framedBox(element: Element): boolean {
  const look = getComputedStyle(element);
  return (['top', 'right', 'bottom', 'left'] as const).every(
    (side) =>
      parseFloat(look.getPropertyValue(`border-${side}-width`)) > 0 &&
      rgba(look.getPropertyValue(`border-${side}-color`)).a > 0
  );
}

/**
 * Framed surfaces never nest (L-55): no card, plate, code or diff block or table that draws a
 * frame of its own sits inside a card or a plate, and a state never stands inside one (L-59),
 * because it belongs in the place of what it replaces. Only a drawn frame counts, so a bare
 * code block and an error over content, which is a row, pass.
 */
function nestedFrames(root: Document): Finding[] {
  const found: Finding[] = [];
  const surfaces = '.sui-card, .sui-plate, .sui-code-block, .sui-diff-block, .sui-data-table';
  const states = '.sui-empty-state, .sui-error-state';
  for (const inner of audited(root, `:is(${FRAMES}) :is(${surfaces}, ${states})`)) {
    const frame = inner.parentElement?.closest(FRAMES);
    if (!frame || !framedBox(inner)) continue;
    const holder = frame.matches('.sui-card') ? 'card' : 'plate';
    found.push(
      inner.matches(states)
        ? finding('L-59', inner, `a state stands in a ${holder}, not in the place it fills`)
        : finding('L-55', inner, `a framed surface stands inside a ${holder}`)
    );
  }
  return found;
}

/**
 * Cards are earned (L-55): a card links to its page, is the danger zone, stands among its card
 * peers, or is the one box on a bare page, whose nearest ground holds nothing but it. The kitchen
 * sink's stage is a viewport around specimens, not a page, so a card alone on it is a finding
 * even with no caption beside it; a specimen shows a bare page by drawing that page's own ground.
 */
function earnedCards(root: Document): Finding[] {
  const found: Finding[] = [];
  const words = (element: Element) =>
    (element as HTMLElement).innerText.replace(/\s+/g, ' ').trim();
  for (const card of audited(root, '.sui-card')) {
    const box = card.parentElement;
    if (!box || card.matches('.linked, .danger')) continue;
    // A card wrapped alone, as in a list item, is weighed by the wrapper among its siblings.
    let item: Element = box;
    while (item.parentElement && [...item.parentElement.children].filter(shown).length === 1)
      item = item.parentElement;
    const peers = [...(item.parentElement?.children ?? [])].some(
      (sibling) =>
        sibling !== item &&
        shown(sibling) &&
        (sibling.matches('.sui-card-box') || sibling.querySelector(':scope > .sui-card-box'))
    );
    if (peers) continue;
    let page = box.parentElement;
    while (page && !paintsGround(getComputedStyle(page))) page = page.parentElement;
    if (page && !page.matches(':has(> .specimens)') && words(page) === words(box)) continue;
    found.push(
      finding('L-55', card, 'a lone card that neither links nor is the danger zone or a bare page')
    );
  }
  return found;
}

/** Settings stand in a section, never in a card or a plate (L-55). */
function framedSettings(root: Document): Finding[] {
  return audited(root, `:is(${FRAMES}) .sui-setting-list`).map((list) =>
    finding('L-55', list, 'a settings group stands inside a card or a plate, not in a section')
  );
}

/** What a disclosure reveals sits straight in it, never in a card (L-57). */
function disclosedCards(root: Document): Finding[] {
  return audited(root, '.sui-disclosure .sui-card').map((card) =>
    finding('L-57', card, 'a card stands inside a disclosure')
  );
}

/**
 * A card's head action never moves its copy (L-34): it stays beside the copy at every width,
 * the head is exactly as tall as the copy, so the title, its note and the body stand where they
 * stand with no action, and the action centres on the cap band of the title's first line.
 */
function cardHeads(root: Document): Finding[] {
  const found: Finding[] = [];
  for (const head of audited(root, '.sui-card-head:has(> .sui-card-actions)')) {
    const actions = head.querySelector(':scope > .sui-card-actions');
    const copy = head.querySelector(':scope > .sui-card-copy');
    const words = copy?.querySelector('.sui-card-words > span');
    if (!actions || !copy || !words) continue;
    const band = actions.getBoundingClientRect();
    const text = copy.getBoundingClientRect();
    if (band.top >= text.bottom - 0.5) {
      found.push(finding('L-34', head, 'its action takes a line of its own under the copy'));
      continue;
    }
    const taller = head.getBoundingClientRect().height - text.height;
    if (taller > 0.5)
      found.push(
        finding('L-34', head, `its action makes the head ${round(taller)}px taller than its copy`)
      );
    // The title's first line is a box snapped to the pixel around its cap band, and the action
    // takes the band's even parity, so the two centres meet within half a pixel.
    const cap = faceMetrics(getComputedStyle(words))?.cap;
    const control = [...actions.children].find(shown);
    if (!cap || !control) continue;
    const own = control.getBoundingClientRect();
    const line = words.getBoundingClientRect().top + Math.ceil(cap) / 2;
    const off = (own.top + own.bottom) / 2 - line;
    if (Math.abs(off) > 0.5)
      found.push(finding('L-34', control, `it sits ${round(off)}px off the title's cap band`));
  }
  return found;
}

/**
 * A timeline (L-113): the times, and the words after them, each start on one edge down the
 * whole list, and an avatar, a pill or an action beside the words centres on the cap band of
 * their first line.
 */
function timelines(root: Document): Finding[] {
  const found: Finding[] = [];
  for (const list of audited(root, '.sui-timeline')) {
    for (const [part, name] of [
      ['.sui-timeline-time', 'time'],
      ['.sui-timeline-body', 'event'] // A stacked event lays its body out as contents, with no box.
    ]) {
      const boxes = [...list.querySelectorAll(`:scope > li > ${part}`)].filter(
        (box) => box.getBoundingClientRect().width > 0
      );
      const starts = boxes.map((box) => {
        const edges = box.getBoundingClientRect();
        return getComputedStyle(box).direction === 'rtl' ? edges.right : edges.left;
      });
      const astray = starts.findIndex((start) => Math.abs(start - starts[0]) > 0.5);
      if (astray > 0)
        found.push(
          finding(
            'L-113',
            boxes[astray],
            `the ${name} starts ${round(Math.abs(starts[astray] - starts[0]))}px off the first one's edge`
          )
        );
    }
    for (const event of list.querySelectorAll(':scope > li')) {
      const words = event.querySelector(':scope > .sui-timeline-body > .sui-timeline-words');
      const first = words && firstLine(words);
      if (!first) continue;
      const marks = event.querySelectorAll(
        ':scope > .sui-timeline-body > .sui-timeline-face > *, :scope > .sui-timeline-side > *'
      );
      for (const mark of marks) {
        const box = mark.getBoundingClientRect();
        // A mark dropped under the words, as on a narrow list, is not beside them.
        if (box.height === 0 || first.line.bottom < box.top || first.line.top > box.bottom)
          continue;
        const off = (box.top + box.bottom) / 2 - first.capMiddle;
        if (Math.abs(off) > 0.55)
          found.push(
            finding('L-113', mark, `it sits ${round(off)}px off the middle of the words' first cap`)
          );
      }
    }
  }
  return found;
}

register(
  separators,
  palette,
  textContrast,
  edgeStrips,
  typeFaces,
  copy,
  copyRhythm,
  titleProximity,
  geometry,
  controls,
  accessibility,
  specimens,
  wrapping,
  plates,
  settingResets,
  unsavedVeils,
  fieldRecesses,
  currentMarks,
  changedEdges,
  tonedControls,
  dialogInsets,
  symbolTiles,
  calloutActions,
  disclosures,
  swatches,
  leadingIcons,
  wholePixels,
  rings,
  codeLines,
  chartInk,
  chartEdges,
  pressSelection,
  loadMoreRows,
  sectionHeads,
  boundaryLines,
  detailPanes,
  rowGrounds,
  nestedFrames,
  earnedCards,
  framedSettings,
  disclosedCards,
  cardHeads,
  timelines
);
