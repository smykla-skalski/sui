import { describe, register, shown, type Finding } from './audit.js';
import { contrast, deltaE, lightness, over, rgba, type Rgba } from './color.js';

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

const audited = (root: Document, selector: string) =>
  [...root.querySelectorAll(selector)].filter(
    (element) => !element.matches(IGNORED) && shown(element)
  );

const round = (value: number, places = 2) => Number(value.toFixed(places));

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
  element.closest(':disabled, [aria-disabled="true"], fieldset:disabled, label:has(:disabled)') !==
    null || element.parentElement?.matches(':has(> :disabled)') === true;

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
  for (const ground of [
    'canvas',
    'surface-base',
    'surface-raised',
    'surface-control',
    'input-bg',
    'unsaved-surface',
    'unsaved-control'
  ])
    found.push(...atLeast('L-9', `field-border on ${ground}`, c('field-border', ground), 3));
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
  found.push(
    ...(lightness(base) > 50
      ? between('L-12', 'row hover step on surface-base', rowStep, 2, 3)
      : between('L-12', 'row hover step on surface-base', rowStep, 4.5, 5.5))
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
    ...atLeast('L-85', 'sidebar-focus on sidebar-bg', c('sidebar-focus', 'sidebar-bg'), 3)
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
  for (const element of audited(root, 'body *:not(svg *, svg, nav *, pre *, code *)')) {
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
    if (/\S·|·\S/.test(text))
      found.push(finding('L-27', element, 'a "·" separator without a space on each side'));
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

/**
 * Where a card's content stops short of each keyline. Content is what a reader sees: words,
 * controls, framed boxes, painted marks such as a pill or a skeleton bar, and tinted boxes that
 * keep inside the card's inset, never the ground a row bleeds into the inset on hover or for a
 * state. A side counts as reached when the content nearest it hugs
 * its own container there. A line of text ends wherever its words do, so at the end side only
 * solid content (a control, a framed box, a mark) counts, and text is held to not running past.
 */
function cardInsets(card: Element) {
  const box = card.getBoundingClientRect();
  const style = getComputedStyle(card);
  const inner = {
    top: box.top + parseFloat(style.borderTopWidth),
    right: box.right - parseFloat(style.borderRightWidth),
    bottom: box.bottom - parseFloat(style.borderBottomWidth),
    left: box.left + parseFloat(style.borderLeftWidth)
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
  for (const element of card.querySelectorAll('*')) {
    if (element.parentElement?.closest('svg') || element.closest(IGNORED)) continue;
    if (!element.checkVisibility({ opacityProperty: false, visibilityProperty: true })) continue;
    const own = element.getBoundingClientRect();
    if (own.width <= 1 || own.height <= 1) continue;
    const look = getComputedStyle(element);
    const ground = rgba(look.backgroundColor).a > 0 || look.backgroundImage !== 'none';
    const framed = (['Top', 'Right', 'Bottom', 'Left'] as const).every(
      (side) =>
        parseFloat(look.getPropertyValue(`border-${side.toLowerCase()}-width`)) > 0 &&
        rgba(look.getPropertyValue(`border-${side.toLowerCase()}-color`)).a > 0
    );
    const words = [...element.childNodes].some(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
    );
    if (!words && !framed && !ground && !element.matches(CARD_CONTENT)) continue;
    let holder = element.parentElement ?? card;
    while (holder !== card && /^(inline|contents)$/.test(getComputedStyle(holder).display))
      holder = holder.parentElement ?? card;
    const room = holder.getBoundingClientRect();
    const space = getComputedStyle(holder);
    const roomLeft = room.left + parseFloat(space.borderLeftWidth) + parseFloat(space.paddingLeft);
    const roomRight =
      room.right - parseFloat(space.borderRightWidth) - parseFloat(space.paddingRight);
    const mark =
      ground &&
      (element.childElementCount === 0 || look.display.startsWith('inline-') || within(own));
    const solid = framed || mark || element.matches(CARD_CONTENT);
    if (!words && !solid) continue;
    top = Math.min(top, own.top);
    bottom = Math.max(bottom, own.bottom);
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

function geometry(root: Document): Finding[] {
  const found: Finding[] = [];

  for (const card of audited(root, '.sui-card')) {
    const style = getComputedStyle(card);
    if (parseFloat(style.marginBlockStart) !== 0 || parseFloat(style.marginBlockEnd) !== 0)
      found.push(finding('L-33', card, 'a card spaces itself with a margin'));
    if (parseFloat(style.minWidth) !== 0)
      found.push(finding('L-33', card, 'a card sets its own minimum width'));
    const measured = cardInsets(card);
    if (!measured) continue;
    const { inset, top, end, bottom, start } = measured;
    const off = (gap: number) => Math.abs(gap - inset) > 1;
    const sideOff = (side: { gap: number; reached: boolean }) =>
      side.reached ? off(side.gap) : side.gap < inset - 1;
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
    // A card's head takes its control's height so the control keeps the card's inset (L-33).
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
    if (!Number.isInteger(round(height, 3)))
      found.push(finding('L-37', control, `height ${round(height, 3)}px is not a whole pixel`));
    else if (!tiers.has(Math.round(height)))
      found.push(finding('L-37', control, `height ${round(height)}px is not a control tier`));
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
    const inline =
      target.matches('a') && target.parentElement?.matches('p, li, dd, figcaption, span');
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
    const opacity = effectiveOpacity(control);
    if (Math.abs(opacity - disabledOpacity) > 0.02)
      found.push(
        finding('L-40', control, `disabled at opacity ${round(opacity)}, not ${disabledOpacity}`)
      );
    if (style.cursor === 'pointer')
      found.push(finding('L-40', control, 'a disabled control keeps the pointer cursor'));
  }

  for (const button of audited(root, 'button, a[href]')) {
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
  return found;
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
    const escaped = [...panel.querySelectorAll('*')].find((element) => {
      if (element.closest(':popover-open, dialog[open]') || held(element)) return false;
      if (!element.checkVisibility({ opacityProperty: false, visibilityProperty: true }))
        return false;
      const look = getComputedStyle(element);
      if (look.position === 'fixed' || look.clipPath !== 'none') return false;
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
        return [...range.getClientRects()].some(outside);
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
      const lines = new Set([...range.getClientRects()].map((line) => Math.round(line.top))).size;
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
    if (/center|around|evenly|end|right/.test(style.justifyContent)) continue;
    const items = [...row.children].filter(
      (child) => shown(child) && !/^(absolute|fixed)$/.test(getComputedStyle(child).position)
    );
    if (items.length < 2) continue;
    const box = row.getBoundingClientRect();
    const start = box.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
    let bottom = items[0].getBoundingClientRect().bottom;
    for (const item of items.slice(1)) {
      const own = item.getBoundingClientRect();
      if (own.top < bottom - 0.5) {
        bottom = Math.max(bottom, own.bottom);
        continue;
      }
      bottom = own.bottom;
      if (Math.abs(own.left - start) > 1)
        found.push(
          finding(
            'L-90',
            item,
            `a wrapped line starts ${round(own.left - start)}px from the row's start`
          )
        );
    }
  }
  return found;
}

register(
  palette,
  textContrast,
  edgeStrips,
  typeFaces,
  copy,
  copyRhythm,
  geometry,
  controls,
  accessibility,
  specimens,
  wrapping
);
