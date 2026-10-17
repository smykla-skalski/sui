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
  const c = (a: string, b: string) => contrast(t(a), t(b));

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
  if (deltaE(t('sidebar-active-bg'), rail) <= deltaE(t('sidebar-item-pressed'), rail))
    found.push(finding('L-85', null, 'the current row is not louder than a pressed row'));

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
        Math.abs(parseFloat(leading) - rowCopyLeading(element)) > 0.01
      )
        found.push(finding('L-21', element, `line-height ${leading} is not a whole pixel`));
    }
  }
  return found;
}

/** The copy leading is the cap height plus the copy gap, so it is fractional by design. */
function rowCopyLeading(element: Element): number {
  const probe = document.createElement('span');
  probe.style.lineHeight = 'var(--sui-row-copy-leading)';
  element.append(probe);
  const leading = parseFloat(getComputedStyle(probe).lineHeight);
  probe.remove();
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

function geometry(root: Document): Finding[] {
  const found: Finding[] = [];

  for (const card of audited(root, '.sui-card')) {
    const style = getComputedStyle(card);
    if (parseFloat(style.marginBlockStart) !== 0 || parseFloat(style.marginBlockEnd) !== 0)
      found.push(finding('L-33', card, 'a card spaces itself with a margin'));
    if (parseFloat(style.minWidth) !== 0)
      found.push(finding('L-33', card, 'a card sets its own minimum width'));
  }

  for (const heading of audited(root, 'h1, h2, h3, h4, h5, h6')) {
    const parent = heading.parentElement;
    if (!parent) continue;
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

register(
  palette,
  textContrast,
  edgeStrips,
  typeFaces,
  copy,
  copyRhythm,
  geometry,
  controls,
  accessibility
);
