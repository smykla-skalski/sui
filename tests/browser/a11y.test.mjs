import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';
import { long, startSink, visit } from './sink.mjs';

// The kitchen sink under the conditions readers bring with them: an accessibility engine's
// WCAG 2.2 rules, a right-to-left page, forced colors, the WCAG 1.4.12 text spacing and text
// at twice its size. Each run asks the page's own law audit as well, so a law that holds in the
// default page must hold here too.

const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js');

/** @type {import('vite').ViteDevServer} */
let server;
/** @type {import('playwright-core').Browser} */
let browser;
let url = '';

before(async () => {
  ({ server, browser, url } = await startSink());
});

after(async () => {
  await browser?.close();
  await server?.close();
});

/**
 * @param {number} width
 * @param {string} theme
 * @param {import('playwright-core').BrowserContextOptions} [options]
 */
async function open(width, theme, options = {}) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, ...options });
  await visit(page, url);
  await page.evaluate(async (name) => {
    document.documentElement.dataset.suiTheme = name;
    await document.fonts.ready;
    // A theme switch eases every colour; a check that reads colours waits for them to land.
    await Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation instanceof CSSTransition)
        .map((animation) => animation.finished.catch(() => undefined))
    );
  }, theme);
  await page.waitForFunction(() => '__suiAudit' in window);
  return page;
}

/** @param {import('playwright-core').Page} page */
const audit = (page) =>
  page.evaluate(async () =>
    /** @type {{ __suiAudit: () => Promise<{ law: string; where: string; detail: string }[]> }} */ (
      /** @type {unknown} */ (window)
    )
      .__suiAudit()
      .then((found) => found.map(({ law, where, detail }) => `${law} ${where}: ${detail}`))
  );

for (const width of [375, 1440])
  for (const theme of ['light', 'dark'])
    test(`axe finds no WCAG 2.2 A or AA violation at ${width}px in ${theme}`, long, async () => {
      const page = await open(width, theme);
      try {
        await page.addScriptTag({ path: axePath });
        const violations = await page.evaluate(async () => {
          const axe = /** @type {any} */ (window).axe;
          const result = await axe.run(document, {
            runOnly: {
              type: 'tag',
              values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
            }
          });
          return result.violations.flatMap((/** @type {any} */ violation) =>
            violation.nodes.map(
              (/** @type {any} */ node) =>
                `${violation.id} ${node.target.join(' ')}: ${violation.help}`
            )
          );
        });
        assert.deepEqual(violations, []);
      } finally {
        await page.close();
      }
    });

for (const width of [375, 1440])
  test(`every law holds in a right-to-left page at ${width}px`, async () => {
    const page = await open(width, 'light');
    try {
      await page.evaluate(() => {
        document.documentElement.dir = 'rtl';
      });
      await page.waitForTimeout(300);
      assert.deepEqual(await audit(page), []);
    } finally {
      await page.close();
    }
  });

test('in a right-to-left page a menu hangs from its trigger’s inline start', async () => {
  const page = await open(1440, 'light');
  try {
    await page.evaluate(() => {
      document.documentElement.dir = 'rtl';
    });
    const trigger = page.locator('main > section [aria-haspopup="menu"]:not(:disabled)').nth(1);
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    await page.waitForTimeout(300);
    const gap = await trigger.evaluate((element) => {
      const layer = document.getElementById(element.getAttribute('popovertarget') ?? '');
      if (!layer) return null;
      for (const animation of layer.getAnimations()) animation.finish();
      return layer.getBoundingClientRect().right - element.getBoundingClientRect().right;
    });
    assert.ok(gap !== null && Math.abs(gap) <= 1, `the menu's right edge is ${gap}px off`);
  } finally {
    await page.close();
  }
});

test('in forced colors every current and selected state differs by more than weight', async () => {
  const page = await open(1440, 'light', { forcedColors: 'active' });
  try {
    const flat = await page.evaluate(() => {
      const props = [
        'outline-style',
        'outline-color',
        'border-block-end-style',
        'border-block-end-color',
        'border-inline-start-style',
        'border-inline-start-color',
        'text-decoration-line',
        'background-color',
        'color'
      ];
      // What forced colors still draw: the element's and its pseudo-elements' lines and system
      // colors, and which marks inside it (a check, a dot) are shown.
      const look = (/** @type {Element} */ element) => {
        const paint = [null, '::before', '::after'].map((pseudo) => {
          const style = getComputedStyle(element, pseudo);
          return props.map((name) => style.getPropertyValue(name)).join('|');
        });
        const marks = [...element.querySelectorAll('svg, [aria-hidden="true"]')]
          .filter((mark) => mark.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }))
          .map((mark) => mark.getAttribute('data-icon') ?? mark.tagName);
        return [...paint, marks.join(',')].join('#');
      };
      const found = [];
      for (const current of document.querySelectorAll(
        "main [aria-current='page'], main [aria-selected='true'], main [aria-pressed='true']"
      )) {
        // A list in a closed layer shows nothing, current or not.
        if (!current.checkVisibility({ checkVisibilityCSS: true })) continue;
        const peer = [
          ...(current.parentElement?.parentElement?.querySelectorAll(current.tagName) ?? [])
        ].find(
          (other) =>
            other !== current &&
            other.className === current.className &&
            !other.matches("[aria-current='page'], [aria-selected='true'], [aria-pressed='true']")
        );
        if (peer && look(peer) === look(current))
          found.push(
            `${current.tagName.toLowerCase()}.${current.className}: “${current.textContent?.trim()}”`
          );
      }
      return found;
    });
    assert.deepEqual(flat, []);
  } finally {
    await page.close();
  }
});

test('in forced colors an invalid field draws a different edge from a valid one', async () => {
  const page = await open(1440, 'light', { forcedColors: 'active' });
  try {
    // A checked box and an on switch keep the invalid edge too, so one of each is turned on.
    for (const mark of ['.sui-checkbox-box.invalid', '.sui-switch-track.invalid']) {
      const input = page.locator(`main label:has(${mark}) input:not(:checked):not(:disabled)`);
      if ((await input.count()) > 0) await input.first().check({ force: true });
    }
    // Neither focus nor hover may tell them apart instead of the edge.
    await page.evaluate(() => /** @type {HTMLElement | null} */ (document.activeElement)?.blur());
    await page.mouse.move(0, 0);
    const same = await page.evaluate(() => {
      const frames = [
        ['.sui-text-input:not(.bare)', "[aria-invalid='true']"],
        ['.sui-textarea', "[aria-invalid='true']"],
        ['.sui-select:not(.bare) .sui-select-control', "[aria-invalid='true']"],
        ['.sui-joined', '.invalid'],
        ['.sui-choice-cards-grid', '.invalid'],
        ['.sui-checkbox input:checked + .sui-checkbox-box', '.invalid'],
        ['.sui-switch-row input:checked + .sui-switch-track', '.invalid']
      ];
      const edge = (/** @type {Element} */ element) => {
        const style = getComputedStyle(element);
        return ['border-top', 'outline']
          .flatMap((side) => ['width', 'style', 'color'].map((part) => `${side}-${part}`))
          .map((name) => style.getPropertyValue(name))
          .join('|');
      };
      return frames.flatMap(([frame, invalid]) => {
        const shown = [...document.querySelectorAll(`main ${frame}`)].filter(
          (element) =>
            element.checkVisibility({ checkVisibilityCSS: true }) &&
            !element.matches(':disabled, [readonly], .disabled, .readonly')
        );
        const wrong = shown.find((element) => element.matches(invalid));
        const right = shown.find((element) => !element.matches(invalid));
        if (!wrong || !right) return [`${frame}: no ${wrong ? 'valid' : 'invalid'} specimen`];
        return edge(wrong) === edge(right) ? [`${frame}${invalid}`] : [];
      });
    });
    assert.deepEqual(same, []);
  } finally {
    await page.close();
  }
});

// WCAG 1.4.12 and 1.4.4: overrides a reader may apply, and text at twice its size.
const spacing = `* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
p { margin-block-end: 2em !important; }`;

for (const [name, css] of [
  ['the WCAG text spacing', spacing],
  ['text at twice its size', 'html { font-size: 200% !important; }']
])
  test(`with ${name} nothing overlaps and nothing leaves its specimen at 375px`, async () => {
    const page = await open(375, 'light');
    try {
      await page.addStyleTag({ content: css });
      await page.waitForTimeout(400);
      const found = (await audit(page)).filter((line) => /^L-(55|70) /.test(line));
      const overlaps = await page.evaluate(() => {
        const leaves = [...document.querySelectorAll('main .specimen *')].filter(
          (element) =>
            element.children.length === 0 &&
            element.textContent?.trim() &&
            element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) &&
            !element.closest('[popover], [aria-hidden="true"]') &&
            // A chart's words are drawn in SVG text; the rest of an SVG holds no words to read.
            (!element.closest('svg') || element.matches('svg text, svg text *'))
        );
        // What a reader sees of each text: every line of it, each clipped by every frame that
        // scrolls or clips it, so a long line scrolled out of view is not counted where it
        // cannot be seen, and words that wrap after another's end are not counted as under it.
        const seen = (/** @type {Element} */ element) =>
          [...element.getClientRects()].map((line) => {
            let box = line;
            for (let frame = element.parentElement; frame; frame = frame.parentElement) {
              const look = getComputedStyle(frame);
              if (look.overflowX === 'visible' && look.overflowY === 'visible') continue;
              const edge = frame.getBoundingClientRect();
              box = new DOMRect(
                Math.max(box.left, edge.left),
                Math.max(box.top, edge.top),
                Math.max(0, Math.min(box.right, edge.right) - Math.max(box.left, edge.left)),
                Math.max(0, Math.min(box.bottom, edge.bottom) - Math.max(box.top, edge.top))
              );
            }
            return box;
          });
        const meet = (/** @type {DOMRect} */ ra, /** @type {DOMRect} */ rb) =>
          Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left) > 2 &&
          Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top) > 2;
        const boxes = leaves.map((element) => [element, seen(element)]);
        const crossed = [];
        for (let one = 0; one < boxes.length; one++)
          for (let two = one + 1; two < boxes.length; two++) {
            const [a, la] = /** @type {[Element, DOMRect[]]} */ (boxes[one]);
            const [b, lb] = /** @type {[Element, DOMRect[]]} */ (boxes[two]);
            if (a.closest('.specimen') !== b.closest('.specimen')) continue;
            if (la.some((ra) => lb.some((rb) => meet(ra, rb))))
              crossed.push(`“${a.textContent?.trim()}” over “${b.textContent?.trim()}”`);
          }
        return crossed;
      });
      assert.deepEqual([...found, ...overlaps], []);
    } finally {
      await page.close();
    }
  });
