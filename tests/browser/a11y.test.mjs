import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { after, before, suite, test } from 'node:test';
import {
  allSections,
  audit as auditPage,
  long,
  openMount,
  startSink,
  together,
  visit
} from './sink.mjs';

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
    await visit(page, allSections(url));
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

  /**
   * Waits two frames, so what the components measure in script after a change to the page, in
   * resize observers and frame callbacks, has been measured again.
   * @param {import('playwright-core').Page} page
   */
  const settled = (page) =>
    page.evaluate(
      () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
    );

  /** @param {import('playwright-core').Page} page */
  const audit = async (page) =>
    (await auditPage(page)).map(({ law, where, detail }) => `${law} ${where}: ${detail}`);

  /** @param {import('playwright-core').Page} page @returns {Promise<string[]>} */
  const axe = async (page) => {
    await page.addScriptTag({ path: axePath });
    return page.evaluate(async () => {
      const result = await /** @type {any} */ (window).axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }
      });
      return result.violations.flatMap((/** @type {any} */ violation) =>
        violation.nodes.map(
          (/** @type {any} */ node) => `${violation.id} ${node.target.join(' ')}: ${violation.help}`
        )
      );
    });
  };

  // One theme is enough for axe: the other changes only colours, and the law audit's L-5 holds
  // every text's contrast in both themes at these widths. The same page is then turned right to
  // left, and every law must hold there too.
  for (const width of [375, 1440])
    test(
      `axe finds no WCAG 2.2 A or AA violation, and every law holds right to left, at ${width}px`,
      long,
      async () => {
        const page = await open(width, 'light');
        try {
          assert.deepEqual(await axe(page), []);
          await page.evaluate(() => {
            document.documentElement.dir = 'rtl';
          });
          await settled(page);
          assert.deepEqual(await audit(page), []);
        } finally {
          await page.close();
        }
      }
    );

  // 2560px stands in for an ultra-wide screen, or a laptop zoomed out to 50%.
  test('every law holds on an ultra-wide screen, or a laptop zoomed out to 50%', long, async () => {
    const page = await open(2560, 'light');
    try {
      assert.deepEqual(await audit(page), []);
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

  // Each page is visited once per width: axe and the audit read it in light, then the audit
  // reads its colours again in dark.
  for (const width of [375, 768, 1440])
    test(`every layout page holds every law and passes axe at ${width}px`, long, async () => {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      try {
        /** @type {string[]} */
        const found = [];
        for (const path of layouts) {
          await visit(page, new URL(path, url).href);
          for (const theme of ['light', 'dark']) {
            await page.evaluate(async (name) => {
              document.documentElement.dataset.suiTheme = name;
              await document.fonts.ready;
            }, theme);
            const lines = [...(theme === 'light' ? await axe(page) : []), ...(await audit(page))];
            found.push(...lines.map((line) => `${path} ${theme} ${line}`));
          }
        }
        assert.deepEqual(found, []);
      } finally {
        await page.close();
      }
    });

  // WCAG 2.2.2: motion that starts on its own and runs past 5 seconds needs a pause control, so
  // a live dot's pulse ends inside that time. When it runs again is held on a clock in words.
  test('a live dot pulses under 5 seconds and then holds still', long, async () => {
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
      // The pulse is ended rather than waited for: its length above is what a reader waits,
      // and `finish` throws on an endless animation.
      const still = await pill.evaluate((element) => {
        const dot = /** @type {Element} */ (element.querySelector('.live'));
        for (const running of dot.getAnimations({ subtree: true })) running.finish();
        return !dot
          .getAnimations({ subtree: true })
          .some((running) => running instanceof CSSAnimation);
      });
      assert.ok(still, 'the pulse did not end');
    } finally {
      await page.close();
    }
  });

  // A named section would be a region landmark, and a pane of them would bury the landmarks a
  // reader jumps between (APG landmark regions).
  // A busy control's spinner is the only drawn sign that it works, so it holds 3:1 on what it
  // turns on (WCAG 1.4.11). The drawn pixels are read, so every fill, veil and opacity counts.
  test('every busy spinner holds 3:1 on what it turns on in both themes', long, async () => {
    const page = await open(1440, 'light', { reducedMotion: 'reduce' });
    try {
      const low = [];
      for (const theme of ['light', 'dark']) {
        await page.evaluate(async (name) => {
          document.documentElement.dataset.suiTheme = name;
          await Promise.all(
            document
              .getAnimations()
              .filter((animation) => animation instanceof CSSTransition)
              .map((animation) => animation.finished.catch(() => undefined))
          );
        }, theme);
        const spinners = page.locator(
          '.sui-button-spinner, .sui-icon-button-spinner, .sui-switch-spinner'
        );
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
      }
      assert.deepEqual(low, []);
    } finally {
      await page.close();
    }
  });

  suite('mounted alone', { concurrency: 1 }, () => {
    /** @type {import('playwright-core').Page | undefined} */
    let shared;
    const mounted = async () =>
      (shared ??= await openMount(browser, url, { viewport: { width: 1440, height: 900 } }));
    after(async () => {
      await shared?.close();
    });

    test(
      'a line chart leaves its legend to a screen reader only while each line ends named apart',
      long,
      async () => {
        const page = await mounted();
        const legends = await page.evaluate(() => {
          const { lib, mount, unmount, flushSync } = /** @type {any} */ (window);
          const line = (/** @type {string} */ id, /** @type {number[]} */ ys) => ({
            id,
            label: id,
            points: ys.map((y, x) => ({ x, y }))
          });
          /** @param {number[][]} ends */
          const legend = (ends) => {
            const host = document.body.appendChild(document.createElement('div'));
            const chart = mount(lib.LineChart, {
              target: host,
              props: {
                title: 'Builds',
                description: 'Builds a day',
                series: ends.map((ys, index) => line(`Line ${index + 1}`, ys))
              }
            });
            flushSync();
            const list = /** @type {Element} */ (host.querySelector('ul.legend'));
            const box = list.getBoundingClientRect();
            const look = getComputedStyle(list);
            const found = {
              drawn: box.width > 1 && box.height > 1,
              read: list.children.length === ends.length && look.display !== 'none'
            };
            unmount(chart);
            host.remove();
            return found;
          };
          return {
            apart: legend([
              [0, 10],
              [0, 90]
            ]),
            together: legend([
              [0, 50],
              [10, 50]
            ])
          };
        });
        assert.deepEqual(legends, {
          apart: { drawn: false, read: true },
          together: { drawn: true, read: true }
        });
      }
    );

    test(
      "a tick in a face outside the chart's table is laid out with the tabular figures it draws",
      long,
      async () => {
        const page = await mounted();
        // A yen sign is outside SUI's face, so the whole tick is measured in the face that draws
        // it; its ones are tabular there, wider than the proportional ones a canvas draws.
        const starts = await page.evaluate(async () => {
          const { lib, mount, unmount, flushSync } = /** @type {any} */ (window);
          /** @param {((value: number) => string) | undefined} formatY */
          const start = async (formatY) => {
            const host = document.body.appendChild(document.createElement('div'));
            host.style.inlineSize = '40rem';
            const chart = mount(lib.LineChart, {
              target: host,
              props: {
                title: 'Spend',
                description: 'Spend a day',
                ...(formatY && { formatY }),
                series: [{ id: 'a', label: 'A', points: [0, 400, 1100].map((y, x) => ({ x, y })) }]
              }
            });
            flushSync();
            await document.fonts.ready;
            await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
            const ticks = host.querySelectorAll('svg.plot text.tick[text-anchor="end"]');
            const left = Math.min(...[...ticks].map((tick) => tick.getBoundingClientRect().left));
            unmount(chart);
            host.remove();
            return left;
          };
          return {
            face: await start(undefined),
            outside: await start((value) => `${value.toLocaleString('en').replace(/\d/g, '1')}円`)
          };
        });
        assert.ok(
          Math.abs(starts.outside - starts.face) <= 0.5,
          `the widest tick starts at ${starts.outside}px, not at ${starts.face}px`
        );
      }
    );

    test(
      'a cut label and a code block that scrolls stay tab stops in a row that skips off the screen',
      long,
      async () => {
        const page = await mounted();
        const found = await page.evaluate(async () => {
          const { lib, mount, unmount } = /** @type {any} */ (window);
          const far = document.body.appendChild(document.createElement('div'));
          far.style.cssText =
            'content-visibility: auto; inline-size: 6rem; margin-block-start: 300vh';
          const parts = [
            mount(lib.ClippedLabel, {
              target: far,
              props: { text: 'a label far wider than its row' }
            }),
            mount(lib.CodeBlock, {
              target: far,
              props: { code: 'npm install a-package-wider-than-its-row' }
            })
          ];
          await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
          const label = /** @type {HTMLElement} */ (far.querySelector('.sui-clipped-label'));
          const result = {
            skipped: !label.checkVisibility({ contentVisibilityAuto: true }),
            label: label.getAttribute('tabindex'),
            code: far.querySelector('pre')?.getAttribute('role')
          };
          for (const part of parts) unmount(part);
          far.remove();
          return result;
        });
        assert.deepEqual(found, { skipped: true, label: '0', code: 'region' });
      }
    );

    test(
      "a bare code block's copy control centres on its file name's row, or on the first line",
      long,
      async () => {
        const page = await mounted();
        const found = await page.evaluate(async () => {
          const { lib, mount, unmount } = /** @type {any} */ (window);
          const host = document.body.appendChild(document.createElement('div'));
          const centre = (/** @type {Element} */ box) => {
            const rect = box.getBoundingClientRect();
            return rect.top + rect.height / 2;
          };
          const measure = (/** @type {Record<string, unknown>} */ props) => {
            const part = mount(lib.CodeBlock, { target: host, props: { code: 'a\nb', ...props } });
            const block = /** @type {HTMLElement} */ (host.lastElementChild);
            const control = /** @type {HTMLElement} */ (block.querySelector('button'));
            const row = block.querySelector('figcaption');
            const pre = /** @type {HTMLElement} */ (block.querySelector('pre'));
            const style = getComputedStyle(pre);
            const line =
              pre.getBoundingClientRect().top +
              parseFloat(style.paddingTop) +
              parseFloat(style.lineHeight) / 2;
            const result = {
              off: Math.round(centre(control) - (row ? centre(row) : line)),
              room: parseFloat(style.paddingTop)
            };
            unmount(part);
            return result;
          };
          const result = {
            labelled: measure({ bare: true, label: 'app.yaml' }),
            framed: measure({ label: 'app.yaml' }),
            bare: measure({ bare: true })
          };
          host.remove();
          return result;
        });
        assert.equal(found.labelled.off, 0, "the control leaves its file name's row");
        assert.equal(found.bare.off, 0, 'the control leaves the first line');
        assert.equal(
          found.labelled.room,
          found.framed.room,
          'the code under a bare file name loses its room'
        );
      }
    );
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

  // A page with no theme chosen follows the system to the same dark block, as L-4 holds in
  // tests/laws.test.mjs, so the two themes a page sets cover it.
  test(
    'L-114 with more contrast every line holds 3:1 on every ground in both themes',
    long,
    async () => {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 900 },
        contrast: 'more'
      });
      try {
        await visit(page, allSections(url));
        /** @type {string[]} */
        const weak = [];
        for (const theme of ['light', 'dark'])
          weak.push(
            ...(await page.evaluate((name) => {
              document.documentElement.dataset.suiTheme = name;
              const context = /** @type {CanvasRenderingContext2D} */ (
                Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext(
                  '2d',
                  { willReadFrequently: true }
                )
              );
              const look = getComputedStyle(document.documentElement);
              /** @param {string} token @param {string} [under] */
              const paint = (token, under) => {
                context.clearRect(0, 0, 1, 1);
                for (const layer of [under, token].filter(Boolean)) {
                  context.fillStyle = look.getPropertyValue(`--sui-${layer}`).trim();
                  context.fillRect(0, 0, 1, 1);
                }
                return [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)].map((v) => v / 255);
              };
              const lum = (/** @type {number[]} */ rgb) =>
                rgb
                  .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
                  .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
              const ratio = (/** @type {number[]} */ a, /** @type {number[]} */ b) => {
                const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
                return (x + 0.05) / (y + 0.05);
              };
              const found = [];
              for (const ground of ['canvas', 'surface-base', 'surface-raised', 'surface-inset'])
                for (const line of [
                  'border-subtle',
                  'border-divider',
                  'border-band',
                  'control-border',
                  'control-border-hover',
                  'field-frame',
                  'popover-border',
                  'sidebar-border'
                ]) {
                  const value = ratio(paint(line, ground), paint(ground));
                  if (value < 3) found.push(`${line} on ${ground}: ${value.toFixed(2)}`);
                }
              return found.map((line) => `${name}: ${line}`);
            }, theme))
          );
        assert.deepEqual(weak, []);
      } finally {
        await page.close();
      }
    }
  );

  // One forced-colors page for its three reads; the one that checks boxes runs last.
  suite('in forced colors', { ...long, concurrency: 1 }, () => {
    /** @type {import('playwright-core').Page} */
    let page;
    before(async () => {
      page = await open(1440, 'light', { forcedColors: 'active' });
    });
    after(() => page?.close());

    test(
      'in forced colors every current and selected state differs by more than weight',
      long,
      async () => {
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
      }
    );

    test(
      'in forced colors every placeholder, the lit menu item and each diff change keep a mark',
      long,
      async () => {
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
      }
    );

    test(
      'in forced colors an invalid field draws a different edge from a valid one',
      long,
      async () => {
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
      }
    );
  });

  // WCAG 1.4.12 and 1.4.4: overrides a reader may apply, and text at twice its size.
  const spacing = `* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
p { margin-block-end: 2em !important; }`;

  /**
   * Pseudo-localizes every word on the page: each letter takes an accent, half of them from
   * Latin Extended so that face loads too, and each word grows by 40%, about what a translation
   * from English adds to a short string. Words the components measure in script are measured
   * again as their boxes grow.
   * @param {import('playwright-core').Page} page
   */
  const translate = (page) =>
    page.evaluate(async () => {
      const accents = Object.fromEntries(
        [...'aåeēiïoőuūcčsšzžnñyý'.matchAll(/(.)(.)/g)].flatMap(([, plain, marked]) => [
          [plain, marked],
          [plain.toUpperCase(), marked.toUpperCase()]
        ])
      );
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (
          node.parentElement?.closest('code, pre, script, style, svg, [popover]:not(:popover-open)')
        )
          continue;
        node.nodeValue = (node.nodeValue ?? '').replace(/\p{L}+/gu, (word) => {
          const longer = word + word.slice(0, Math.ceil(word.length * 0.4));
          return [...longer].map((letter) => accents[letter] ?? letter).join('');
        });
      }
      await document.fonts.ready;
    });

  /** @type {[string, (page: import('playwright-core').Page) => Promise<unknown>][]} */
  const changes = [
    ['the WCAG text spacing', (page) => page.addStyleTag({ content: spacing })],
    [
      'text at twice its size',
      (page) => page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
    ],
    ['pseudo-localized words', translate]
  ];

  for (const [name, change] of changes)
    test(
      `with ${name} nothing overlaps and nothing leaves its specimen at 375px`,
      long,
      async () => {
        const page = await open(375, 'light');
        try {
          await change(page);
          await settled(page);
          // The audit holds the default leading; the spacing run holds a reader's too, so a
          // fixed gap that only clears the default line gap fails a wrapped title.
          const found = (await audit(page)).filter(
            (line) =>
              /^L-(55|70) /.test(line) ||
              (change === changes[0][1] && line.includes("a wrapped title's lines"))
          );
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
      await header.getByRole('button', { name: 'Check Again' }).click();
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
