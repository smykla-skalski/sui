import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { after, before, suite, test } from 'node:test';
import { audit as auditPage, long, settles, startSink, together, visit } from './sink.mjs';

// The kitchen sink under the conditions readers bring with them: an accessibility engine's
// WCAG 2.2 rules, a right-to-left page, forced colors, the WCAG 1.4.12 text spacing and text
// at twice its size. Each run asks the page's own law audit as well, so a law that holds in the
// default page must hold here too.

const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js');

/** @type {{ close: () => Promise<void> }} */
let server;
/** @type {import('./sink.mjs').SinkBrowser} */
let browser;
let url = '';

before(async () => {
  ({ server, browser, url } = await startSink());
});

after(async () => {
  await browser?.close();
  await server?.close();
});

suite('accessibility', together, () => {
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
  const audit = async (page) =>
    (await auditPage(page)).map(({ law, where, detail }) => `${law} ${where}: ${detail}`);

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

  // Each shell and page layout is a whole page of its own, so its landmarks, its one main and
  // its bars are measured at the window's width, as an app draws them.
  const layouts = [
    'layouts/app-shell/',
    'layouts/app-shell/bottom-nav/',
    'layouts/list-detail/',
    'layouts/list-detail/4182/',
    'layouts/detail-pane/',
    'layouts/detail-pane/loading/',
    'layouts/detail-pane/missing/',
    'layouts/detail-pane/stale/'
  ];

  for (const width of [375, 768, 1440])
    for (const theme of ['light', 'dark'])
      test(
        `every layout page holds every law and passes axe at ${width}px in ${theme}`,
        long,
        async () => {
          const page = await browser.newPage({ viewport: { width, height: 900 } });
          try {
            /** @type {string[]} */
            const found = [];
            for (const path of layouts) {
              await visit(page, new URL(path, url).href);
              await page.evaluate(async (name) => {
                document.documentElement.dataset.suiTheme = name;
                await document.fonts.ready;
              }, theme);
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
              found.push(
                ...[...violations, ...(await audit(page))].map((line) => `${path} ${line}`)
              );
            }
            assert.deepEqual(found, []);
          } finally {
            await page.close();
          }
        }
      );

  for (const width of [375, 1440])
    test(`every law holds in a right-to-left page at ${width}px`, long, async () => {
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

  test('in a right-to-left page a menu hangs from its trigger’s inline start', long, async () => {
    const page = await open(1440, 'light');
    try {
      await page.evaluate(() => {
        document.documentElement.dir = 'rtl';
      });
      // A menu aligned to its trigger's start, as an end-aligned one hangs from the other edge.
      const trigger = page
        .locator('#action-menu [aria-haspopup="menu"]:not(:disabled)', {
          hasText: 'Release actions'
        })
        .first();
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

  // WCAG 2.2.2: motion that starts on its own and runs past 5 seconds needs a pause control, so
  // a live dot's pulse ends inside that time and runs again only when its data arrives.
  test('a live dot pulses under 5 seconds and again on each update', long, async () => {
    const page = await open(1440, 'light');
    try {
      const pill = page.locator('#pill .sui-pill:has(.live)', { hasText: 'Syncing' });
      await pill.scrollIntoViewIfNeeded();
      // The pulse starts as the page mounts and may be over before the page is read, so its
      // length is read from its style.
      const length = await pill.evaluate((element) => {
        const look = getComputedStyle(
          /** @type {Element} */ (element.querySelector('.live')),
          '::after'
        );
        return parseFloat(look.animationDuration) * 1000 * Number(look.animationIterationCount);
      });
      assert.ok(length > 0 && length < 5000, `the pulse runs ${length}ms`);
      const pulsing = () =>
        pill.evaluate((element) =>
          /** @type {Element} */ (element.querySelector('.live'))
            .getAnimations({ subtree: true })
            .some((running) => running instanceof CSSAnimation)
        );
      const still = await settles(
        page.waitForFunction(
          (element) =>
            !element
              ?.querySelector('.live')
              ?.getAnimations({ subtree: true })
              .some((running) => running instanceof CSSAnimation),
          await pill.elementHandle(),
          { timeout: length + 1000 }
        )
      );
      assert.ok(still, 'the pulse did not end');
      await page.getByRole('button', { name: 'Receive an update' }).click();
      assert.ok(await pulsing(), 'an update did not pulse the dot again');
    } finally {
      await page.close();
    }
  });

  // A named section would be a region landmark, and a pane of them would bury the landmarks a
  // reader jumps between (APG landmark regions).
  // A busy control's spinner is the only drawn sign that it works, so it holds 3:1 on what it
  // turns on (WCAG 1.4.11). The drawn pixels are read, so every fill, veil and opacity counts.
  test('every busy spinner holds 3:1 on what it turns on in both themes', long, async () => {
    for (const theme of ['light', 'dark']) {
      const page = await open(1440, theme, { reducedMotion: 'reduce' });
      try {
        const spinners = page.locator(
          '.sui-button-spinner, .sui-icon-button-spinner, .sui-switch-spinner'
        );
        const low = [];
        for (let index = 0; index < (await spinners.count()); index++) {
          const spinner = spinners.nth(index);
          if (!(await spinner.isVisible())) continue;
          await spinner.scrollIntoViewIfNeeded();
          const shot = await spinner.screenshot();
          const ratio = await page.evaluate(
            async (data) => {
              const image = await createImageBitmap(await (await fetch(data)).blob());
              const context = /** @type {OffscreenCanvasRenderingContext2D} */ (
                new OffscreenCanvas(image.width, image.height).getContext('2d')
              );
              context.drawImage(image, 0, 0);
              const pixels = context.getImageData(0, 0, image.width, image.height).data;
              /** @param {number} at */
              const luminance = (at) => {
                const [r, g, b] = [0, 1, 2].map((channel) => {
                  const value = pixels[at + channel] / 255;
                  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
                });
                return 0.2126 * r + 0.7152 * g + 0.0722 * b;
              };
              // The middle of the ring shows the ground it turns on.
              const ground = luminance(
                (Math.floor(image.height / 2) * image.width + Math.floor(image.width / 2)) * 4
              );
              let best = 1;
              for (let at = 0; at < pixels.length; at += 4) {
                const ink = luminance(at);
                best = Math.max(
                  best,
                  (Math.max(ink, ground) + 0.05) / (Math.min(ink, ground) + 0.05)
                );
              }
              return best;
            },
            `data:image/png;base64,${shot.toString('base64')}`
          );
          if (ratio < 3) {
            const where = await spinner.evaluate(
              (element) =>
                `${element.closest('section[id]')?.id} ${element.closest('[data-tone]')?.getAttribute('data-tone') ?? ''}`
            );
            low.push(`${theme} ${where}: ${ratio.toFixed(2)}`);
          }
        }
        assert.deepEqual(low, []);
      } finally {
        await page.close();
      }
    }
  });

  test('a section is never a landmark region', long, async () => {
    const page = await open(1440, 'light');
    try {
      const sections = await page.locator('.sui-section').count();
      const regions = await page
        .getByRole('region')
        .evaluateAll((found) => found.filter((element) => element.matches('.sui-section')).length);
      assert.ok(sections > 0, 'the kitchen sink shows sections');
      assert.equal(regions, 0);
    } finally {
      await page.close();
    }
  });

  test(
    'in forced colors every current and selected state differs by more than weight',
    long,
    async () => {
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
              .filter((mark) =>
                mark.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
              )
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
                !other.matches(
                  "[aria-current='page'], [aria-selected='true'], [aria-pressed='true']"
                )
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
    }
  );

  test(
    'in forced colors an invalid field draws a different edge from a valid one',
    long,
    async () => {
      const page = await open(1440, 'light', { forcedColors: 'active' });
      try {
        // A checked box and an on switch keep the invalid edge too, so one of each is turned on.
        for (const mark of ['.sui-checkbox-box.invalid', '.sui-switch-track.invalid']) {
          const input = page.locator(`main label:has(${mark}) input:not(:checked):not(:disabled)`);
          if ((await input.count()) > 0) await input.first().check({ force: true });
        }
        // Neither focus nor hover may tell them apart instead of the edge.
        await page.evaluate(() =>
          /** @type {HTMLElement | null} */ (document.activeElement)?.blur()
        );
        await page.mouse.move(0, 0);
        const same = await page.evaluate(() => {
          const frames = [
            ['.sui-text-input:not(.bare)', "[aria-invalid='true']"],
            ['.sui-textarea', "[aria-invalid='true']"],
            ['.sui-select:not(.bare) .sui-select-control', "[aria-invalid='true']"],
            ['.sui-joined', '.invalid'],
            ['.sui-choice-card:not(:has(input:checked))', '.invalid > *'],
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
    }
  );

  test(
    'in forced colors every placeholder, the lit menu item and each diff change keep a mark',
    long,
    async () => {
      const page = await open(1440, 'light', { forcedColors: 'active' });
      try {
        // Forced colors drop every fill, so each of these needs an edge, an outline or a glyph.
        const missing = await page.evaluate(() => {
          const found = [];
          for (const placeholder of [
            'main .sui-skeleton-rows .bar',
            'main tr.placeholder .bar',
            'main .sui-chart-wait'
          ]) {
            const box = document.querySelector(placeholder);
            if (!box || getComputedStyle(box).outlineStyle === 'none')
              found.push(`${placeholder} draws no outline`);
          }
          const lit = document.querySelector('main .sui-action-menu-item.active');
          if (!lit || getComputedStyle(lit).outlineStyle === 'none')
            found.push('the lit menu item draws no outline');
          for (const line of document.querySelectorAll('main .sui-diff-block-scroll .ln')) {
            if (/** @type {HTMLElement} */ (line).dataset.op === ' ') continue;
            const glyph = line.querySelector('.op [aria-hidden="true"]');
            if (!glyph?.textContent?.trim() || !glyph.checkVisibility())
              found.push(`a ${/** @type {HTMLElement} */ (line).dataset.op} line shows no glyph`);
          }
          return found;
        });
        assert.deepEqual(missing, []);
      } finally {
        await page.close();
      }
    }
  );

  // WCAG 1.4.12 and 1.4.4: overrides a reader may apply, and text at twice its size.
  const spacing = `* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
p { margin-block-end: 2em !important; }`;

  for (const [name, css] of [
    ['the WCAG text spacing', spacing],
    ['text at twice its size', 'html { font-size: 200% !important; }']
  ])
    test(
      `with ${name} nothing overlaps and nothing leaves its specimen at 375px`,
      long,
      async () => {
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
      }
    );

  // The audit holds the default leading; this holds a reader's, so a fixed gap that only clears
  // the default line gap fails here.
  test(
    'with the WCAG text spacing a wrapped page title still stands closer to itself than to its description',
    long,
    async () => {
      const page = await open(375, 'light');
      try {
        await page.addStyleTag({ content: spacing });
        await page.waitForTimeout(400);
        assert.deepEqual(
          (await audit(page)).filter((line) => line.includes("a wrapped title's lines")),
          []
        );
      } finally {
        await page.close();
      }
    }
  );

  test('a page header says a new state once, from the same status region', long, async () => {
    const page = await open(1440, 'light');
    try {
      const header = page
        .locator('#page-header .sui-page-header')
        .filter({ has: page.locator('.sui-page-header-status') });
      await header.scrollIntoViewIfNeeded();
      const region = header.locator('[role="status"]');
      assert.equal(await region.count(), 1, 'the state is not in a status region');
      assert.match(await region.innerText(), /3 differ/);
      // A screen reader speaks a polite region once for each batch of changes inside it, and
      // a region put in place with its words is often not spoken at all.
      await region.evaluate((node) => {
        const watch = /** @type {{ statusBatches: number; statusNode: Element }} */ (
          /** @type {unknown} */ (window)
        );
        watch.statusBatches = 0;
        watch.statusNode = node;
        new MutationObserver(() => watch.statusBatches++).observe(node, {
          characterData: true,
          childList: true,
          subtree: true
        });
      });
      await header.getByRole('button', { name: 'Check again' }).click();
      assert.match(await region.innerText(), /Up to date/);
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      );
      const after = await region.evaluate((node) => {
        const watch = /** @type {{ statusBatches: number; statusNode: Element }} */ (
          /** @type {unknown} */ (window)
        );
        return { batches: watch.statusBatches, same: node === watch.statusNode };
      });
      assert.deepEqual(after, { batches: 1, same: true }, 'the new state was not said once');
    } finally {
      await page.close();
    }
  });
});
