import assert from 'node:assert/strict';
import { after, before, suite, test } from 'node:test';
import { allSections, atRest, brief, long, settles, startSink, together, visit } from './sink.mjs';

// Behaviour of the shell, the navigation lists, the tabs and the charts that the law audit
// cannot see in one still page: focus handoffs, placement by direction, the phone bars,
// forced colors and what a scrolling pane or a scrolling plot does. The shells and the page
// layouts are whole pages under /layouts, measured at the window's own width.

/** @type {{ close: () => Promise<void> }} */
let server;
/** @type {import('./sink.mjs').SinkBrowser} */
let browser;
let url = '';
/** @type {Promise<{ server: { close: () => Promise<void> }; browser: import('./sink.mjs').SinkBrowser; url: string }> | undefined} */
let mounted;

before(async () => {
  ({ server, browser, url } = await startSink());
});

after(async () => {
  await browser?.close();
  await server?.close();
  const running = await mounted;
  await running?.browser.close();
  await running?.server.close();
});

/** A page where a test can mount a list-detail with its own reactive navigation. */
async function openMounted() {
  mounted ??= startSink({ dev: true });
  const running = await mounted;
  const page = await running.browser.newPage({ viewport: { width: 1280, height: 900 } });
  await visit(page, new URL('layouts/detail-pane/', running.url).href);
  await page.evaluate(async () => {
    const loaded = performance.getEntriesByType('resource').map((entry) => entry.name);
    const find = (/** @type {RegExp} */ pattern) => loaded.find((name) => pattern.test(name));
    const lib = await import(/* @vite-ignore */ find(/\/src\/lib\/index\.ts/) ?? '');
    const { mount, createRawSnippet, flushSync } = await import(
      /* @vite-ignore */ find(/\.vite\/deps\/svelte\.js/) ?? ''
    );
    const { state, get, set } = await import(
      /* @vite-ignore */ find(/\.vite\/deps\/svelte_internal_client\.js/) ?? ''
    );
    Object.assign(window, { lib, mount, createRawSnippet, flushSync, state, get, set });
    document.body.replaceChildren();
  });
  return page;
}

suite('navigation', together, () => {
  /**
   * @param {number} width
   * @param {{ rtl?: boolean; forced?: boolean }} [options]
   */
  async function open(width, { rtl = false, forced = false } = {}) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    if (forced) await page.emulateMedia({ forcedColors: 'active' });
    await visit(page, allSections(url));
    await page.evaluate(async (rtl) => {
      if (rtl) document.documentElement.dir = 'rtl';
      await document.fonts.ready;
    }, rtl);
    await page.waitForFunction(() => '__suiAudit' in window);
    return page;
  }

  /**
   * Opens one of the layout pages, a whole app page with no sink around it.
   * @param {string} path
   * @param {number} width
   * @param {{ rtl?: boolean; height?: number }} [options]
   */
  async function openLayout(path, width, { rtl = false, height = 900 } = {}) {
    const page = await browser.newPage({ viewport: { width, height } });
    await visit(page, new URL(path, url).href);
    await page.evaluate(async (rtl) => {
      if (rtl) document.documentElement.dir = 'rtl';
      await document.fonts.ready;
    }, rtl);
    // The page stays hidden until its faces arrive, and nothing hidden is a tab stop.
    await page.waitForFunction(() => !document.documentElement.dataset.suiFonts);
    return page;
  }

  /**
   * Opens the phone drawer and waits until the shell has taken it: focus moves in last, once its
   * Tab trap holds and the bars and the content behind it are inert.
   * @param {import('playwright-core').Page} page
   */
  async function openDrawer(page) {
    await page.locator('.sui-shell-menu').click();
    const drawer = page.locator('.sui-shell-side:popover-open');
    await drawer.waitFor();
    await page.waitForFunction(() =>
      document.querySelector('.sui-shell-side:popover-open')?.contains(document.activeElement)
    );
    return drawer;
  }

  test(
    'a row followed in the phone drawer closes it and hands focus to the menu button',
    long,
    async () => {
      const page = await openLayout('layouts/app-shell/', 375);
      try {
        const drawer = await openDrawer(page);
        await drawer.locator('.sui-side-nav-row', { hasText: 'Queue' }).click();
        assert.ok(
          await settles(
            page.waitForFunction(
              () =>
                !document.querySelector('.sui-shell-side:popover-open') &&
                document.activeElement?.matches('.sui-shell-menu'),
              null,
              brief
            )
          ),
          'the drawer stayed open, or focus did not return to the menu button'
        );
        assert.equal(await page.locator('.sui-shell-title').textContent(), 'Queue');
        assert.equal(new URL(page.url()).hash, '#queue', 'the page has no address of its own');
      } finally {
        await page.close();
      }
    }
  );

  // A control folded in a closed disclosure still has client rects in Chrome, and the
  // disclosure's summary is a tab stop of its own.
  test(
    'Tab wraps in the phone drawer past a control folded in a closed details',
    long,
    async () => {
      const page = await openLayout('layouts/app-shell/', 375);
      try {
        const drawer = await openDrawer(page);
        await drawer.evaluate((side) => {
          const more = document.createElement('details');
          more.innerHTML = '<summary>More</summary><a href="#folded">Folded</a>';
          side.append(more);
          more.querySelector('summary')?.focus();
        });
        await page.keyboard.press('Tab');
        const landed = await page.evaluate(() => document.activeElement?.textContent?.trim());
        const first = await drawer.evaluate((side) =>
          side.querySelector('a[href], button')?.textContent?.trim()
        );
        assert.equal(landed, first, 'Tab from the last stop left the drawer');
      } finally {
        await page.close();
      }
    }
  );

  test('the phone drawer opens from the start edge in a right-to-left page', long, async () => {
    const page = await openLayout('layouts/app-shell/', 375, { rtl: true });
    try {
      await openDrawer(page);
      await atRest(page);
      const { end, drawer } = await page.evaluate(() => ({
        end: document.documentElement.clientWidth,
        drawer: document
          .querySelector('.sui-shell-side:popover-open')
          ?.getBoundingClientRect()
          .toJSON()
      }));
      assert.ok(drawer, 'the drawer did not open');
      assert.ok(
        Math.abs(drawer.right - end) <= 1,
        `drawer ends at ${drawer.right}, page at ${end}`
      );
      assert.ok(drawer.left >= 0, 'the drawer runs past the page');
    } finally {
      await page.close();
    }
  });

  test(
    'with bottomNav a phone keeps the places in a bottom bar and the drawer holds only the pages',
    long,
    async () => {
      const page = await openLayout('layouts/app-shell/bottom-nav/', 375);
      try {
        const bar = await page.evaluate(() => {
          const rail = document.querySelector('.sui-shell-places .sui-rail');
          const box = rail?.getBoundingClientRect();
          return rail && box
            ? {
                row: getComputedStyle(rail).flexDirection,
                gap: innerHeight - box.bottom,
                tiles: [...rail.querySelectorAll('.sui-rail-tile')].map((tile) =>
                  Math.round(tile.getBoundingClientRect().height)
                )
              }
            : null;
        });
        assert.ok(bar, 'no rail in the bottom bar');
        assert.equal(bar.row, 'row');
        assert.ok(bar.gap <= 1, `the bar stands ${bar.gap}px above the window's foot`);
        assert.ok(
          bar.tiles.every((height) => height >= 44),
          `tiles are ${bar.tiles.join(', ')}px`
        );
        const drawer = await openDrawer(page);
        assert.equal(
          await drawer.locator('.sui-rail').count(),
          0,
          'the drawer carries the rail too'
        );
        assert.equal(await drawer.locator('.sui-side-nav').count(), 1);
        assert.ok(
          await page
            .locator('.sui-shell-places')
            .evaluate((places) => /** @type {HTMLElement} */ (places).inert),
          'the bottom bar stays live behind the modal drawer'
        );
      } finally {
        await page.close();
      }
    }
  );

  test(
    'the fold control shows only where the shell is wide enough to fold, and names its action',
    long,
    async () => {
      // A 1000px window is under the 64rem a fold needs. The shell draws the control in its
      // markup at every width, and its own width shows it.
      const narrow = await openLayout('layouts/app-shell/', 1000);
      try {
        assert.equal(await narrow.locator('.sui-side-nav-fold:visible').count(), 0);
      } finally {
        await narrow.close();
      }
      const page = await openLayout('layouts/app-shell/', 1440);
      try {
        const fold = page.locator('.sui-side-nav-fold');
        const mode = () => page.locator('.sui-side-nav').getAttribute('data-mode');
        assert.equal((await fold.textContent())?.trim(), 'Collapse');
        await fold.click();
        assert.equal((await fold.textContent())?.trim(), 'Expand');
        assert.equal(await mode(), 'collapsed');
        await fold.click();
        assert.equal((await fold.textContent())?.trim(), 'Collapse');
        assert.equal(await mode(), 'full');
        assert.ok(
          await fold.evaluate((button) => document.activeElement === button),
          'folding lost focus'
        );
      } finally {
        await page.close();
      }
    }
  );

  test(
    'under forced colors the current tab and the current place are marked in Highlight',
    long,
    async () => {
      const page = await open(1440, { forced: true });
      // The rail lives on the app shell page, which marks its own place as current.
      const shell = await openLayout('layouts/app-shell/', 1440);
      try {
        await shell.emulateMedia({ forcedColors: 'active' });
        const highlight = () => {
          const probe = document.body.appendChild(document.createElement('span'));
          probe.style.color = 'Highlight';
          const color = getComputedStyle(probe).color;
          probe.remove();
          return color;
        };
        const marks = await page.evaluate(() => {
          const tabs = [...document.querySelectorAll('#tabs .sui-tabs')][0];
          const bar = (/** @type {Element} */ tab) =>
            getComputedStyle(tab, '::after').backgroundColor;
          return {
            current: bar(/** @type {Element} */ (tabs.querySelector('[aria-current="page"]'))),
            others: [...tabs.querySelectorAll('.sui-tabs-tab:not([aria-current])')].map(bar)
          };
        });
        const place = await shell.evaluate(() => {
          const tile = document.querySelector('.sui-rail-tile[aria-current]');
          return tile ? getComputedStyle(tile).backgroundColor : null;
        });
        const marked = await page.evaluate(highlight);
        assert.equal(marks.current, marked);
        assert.ok(
          marks.others.every((color) => color !== marked),
          'every tab wears the mark'
        );
        assert.equal(place, await shell.evaluate(highlight));
      } finally {
        await page.close();
        await shell.close();
      }
    }
  );

  // The specimen is fixed to the window, so containment on its section, as content-visibility
  // brings, would hold it at the section and show it under the section above.
  test(
    'the skip link specimen waits above the window, wherever the page stands',
    long,
    async () => {
      for (const width of [375, 1440]) {
        const page = await open(width);
        try {
          const link = page.locator('#skip-link .sui-skip-link');
          await page.evaluate(() => {
            const section = /** @type {HTMLElement} */ (document.getElementById('skip-link'));
            scrollBy(0, section.getBoundingClientRect().top - innerHeight / 2);
          });
          const waiting = await link.evaluate((node) => node.getBoundingClientRect().bottom);
          assert.ok(waiting <= 0, `at ${width}px it waits ${waiting}px into the window`);
          await link.focus();
          const shown = await settles(
            page.waitForFunction(
              () => {
                const box = document
                  .querySelector('#skip-link .sui-skip-link')
                  ?.getBoundingClientRect();
                return box && box.top >= 0 && box.top < 40 && box.left < 40;
              },
              null,
              brief
            )
          );
          const box = await link.evaluate((node) => JSON.stringify(node.getBoundingClientRect()));
          assert.ok(shown, `at ${width}px focus never brought it into the window's corner: ${box}`);
        } finally {
          await page.close();
        }
      }
    }
  );

  test('the page index follows sections that scroll inside a pane', long, async () => {
    const page = await open(1440);
    try {
      await page.addStyleTag({
        content: '#page-toc .sections { block-size: 15rem; overflow-y: auto; }'
      });
      // The pane stands well below the viewport's top quarter, so only its own reading line can
      // make "Required checks" current.
      const current = await page.evaluate(async () => {
        const pane = /** @type {HTMLElement} */ (document.querySelector('#page-toc .sections'));
        scrollBy(0, pane.getBoundingClientRect().top - 400);
        const checks = /** @type {HTMLElement} */ (document.getElementById('toc-checks'));
        pane.scrollTop += checks.getBoundingClientRect().top - pane.getBoundingClientRect().top;
        await new Promise((resolve) => setTimeout(resolve, 300));
        return document
          .querySelector('#page-toc .sui-page-toc-link[aria-current="location"]')
          ?.textContent?.trim();
      });
      assert.equal(current, 'Required checks');
    } finally {
      await page.close();
    }
  });

  test(
    "an index entry lands focus on its section's heading, from the phone drawer and under reduced motion",
    long,
    async () => {
      for (const [width, reducedMotion] of /** @type {const} */ ([
        [375, 'no-preference'],
        [1440, 'reduce']
      ])) {
        const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion });
        try {
          await visit(page, allSections(url));
          // The sink's own shell comes first; the app shell section's specimens follow it.
          if (width < 768) await page.locator('.sui-shell-menu').first().click();
          await page.locator('.sui-side-nav-row', { hasText: 'Data table' }).first().click();
          await settles(
            page.waitForFunction(
              () => document.activeElement?.closest('#data-table') !== null,
              null,
              brief
            )
          );
          const landed = await page.evaluate(() => ({
            focus: `${document.activeElement?.tagName} ${document.activeElement?.textContent?.trim()}`,
            open: document.querySelector('.sui-shell-side:popover-open') !== null
          }));
          assert.deepEqual(landed, { focus: 'H2 Data table', open: false }, `at ${width}px`);
        } finally {
          await page.close();
        }
      }
    }
  );

  test("an overview card opens its component's own page, which the index marks", async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    try {
      await visit(page, url);
      await page.getByRole('link', { name: 'Data table', exact: true }).first().click();
      await page.waitForURL(/\/data-table\/$/);
      const shown = await page.evaluate(() => ({
        title: document.querySelector('h1')?.textContent?.trim(),
        sections: document.querySelectorAll('main section.section').length,
        current: document
          .querySelector('.sui-side-nav-row[aria-current="page"]')
          ?.textContent?.trim()
      }));
      assert.deepEqual(shown, { title: 'Data table', sections: 1, current: 'Data table' });
    } finally {
      await page.close();
    }
  });

  test("the sink's index marks the section the reader has scrolled to", long, async () => {
    const page = await open(1440);
    try {
      await page.evaluate(() => document.getElementById('data-table')?.scrollIntoView());
      const marked = () =>
        page.evaluate(() =>
          document
            .querySelector('.sui-shell-side .sui-side-nav-row[aria-current="page"]')
            ?.textContent?.trim()
        );
      await settles(
        page.waitForFunction(
          () =>
            document
              .querySelector('.sui-shell-side .sui-side-nav-row[aria-current="page"]')
              ?.textContent?.trim() === 'Data table',
          null,
          brief
        )
      );
      assert.equal(await marked(), 'Data table');
    } finally {
      await page.close();
    }
  });

  test('a phone changes the theme from the drawer, far down the page', long, async () => {
    const page = await open(375);
    try {
      await page.evaluate(() => scrollTo(0, 6000));
      await page.locator('.sui-shell-menu').first().click();
      const drawer = page.locator('.sui-shell-side:popover-open');
      await drawer.waitFor();
      const wanted =
        (await page.evaluate(() => document.documentElement.dataset.suiTheme)) === 'dark'
          ? 'light'
          : 'dark';
      await drawer.getByRole('radio', { name: wanted === 'dark' ? 'Dark' : 'Light' }).check();
      assert.equal(await page.evaluate(() => document.documentElement.dataset.suiTheme), wanted);
    } finally {
      await page.close();
    }
  });

  test(
    'a chart plot that scrolls is a named keyboard stop, and its table renders only when opened',
    long,
    async () => {
      for (const [width, scrolls] of /** @type {const} */ ([
        [320, true],
        [1440, false]
      ])) {
        const page = await open(width);
        try {
          const chart = page.locator('#charts .narrow .sui-chart');
          const plot = chart.locator('.plot-scroll');
          assert.equal(await plot.getAttribute('tabindex'), scrolls ? '0' : null, `${width}px`);
          if (scrolls) {
            const heading = await chart.locator('.sui-chart-title').getAttribute('id');
            assert.equal(await plot.getAttribute('role'), 'region');
            assert.equal(await plot.getAttribute('aria-labelledby'), heading);
          }
          assert.equal(await chart.locator('table').count(), 0, 'the closed table is in the page');
          await chart.locator('summary').click();
          assert.equal(await chart.locator('table caption').textContent(), 'Items by week');
        } finally {
          await page.close();
        }
      }
    }
  );

  test(
    'every sideways scroller fades only the edges with more past them, mirrored right to left (L-107)',
    long,
    async () => {
      for (const rtl of [false, true]) {
        const page = await open(375, { rtl });
        try {
          const found = await page.evaluate(async () => {
            const frame = () => new Promise(requestAnimationFrame);
            const fades = (/** @type {Element} */ box) => {
              const look = getComputedStyle(box);
              return ['--sui-scroll-edge-start', '--sui-scroll-edge-end'].map((name) =>
                parseFloat(look.getPropertyValue(name))
              );
            };
            const wrong = [];
            let checked = 0;
            // A component's own scroller: it, or one of the two boxes it sits in, wears a
            // `sui-` class, as a chart's plot sits in its band inside the chart.
            for (const box of document.querySelectorAll('[class]')) {
              const look = getComputedStyle(box);
              const owned = [box, box.parentElement, box.parentElement?.parentElement].some(
                (node) => [...(node?.classList ?? [])].some((name) => name.startsWith('sui-'))
              );
              if (!owned || !/auto|scroll/.test(look.overflowX)) continue;
              const max = box.scrollWidth - box.clientWidth;
              if (max < 4) continue;
              checked++;
              const name = `${box.closest('section')?.id} ${box.className}`;
              const sign = look.direction === 'rtl' ? -1 : 1;
              const states = [];
              for (const at of [0, max / 2, max]) {
                box.scrollLeft = sign * at;
                await frame();
                await frame();
                states.push(fades(box).map((width) => width > 0));
              }
              box.scrollLeft = 0;
              if (
                JSON.stringify(states) !==
                JSON.stringify([
                  [false, true],
                  [true, true],
                  [true, false]
                ])
              )
                wrong.push(`${name}: ${JSON.stringify(states)}`);
              if (look.direction === 'rtl' && !look.maskImage.includes('to left'))
                wrong.push(`${name}: the fade does not mirror`);
            }
            return { checked, wrong };
          });
          assert.ok(found.checked > 5, `only ${found.checked} sideways scrollers were found`);
          assert.deepEqual(found.wrong, [], rtl ? 'right to left' : 'left to right');
        } finally {
          await page.close();
        }
      }
    }
  );

  test(
    'a chart band reaches the edges of a stage that lends its inset, and stays in a specimen that does not (L-66)',
    long,
    async () => {
      for (const width of [1440, 375]) {
        const page = await open(width);
        try {
          const bands = await page.evaluate(() =>
            [...document.querySelectorAll('#charts .plot-band')].map((band) => {
              const box = band.getBoundingClientRect();
              const holder = /** @type {Element} */ (band.closest('.frame'));
              const keyline = parseFloat(getComputedStyle(holder).borderLeftWidth);
              const room = holder.getBoundingClientRect();
              // A waiting band is its own placeholder, with no plot inside to pad.
              const plot = band.querySelector('.plot-scroll') ?? band;
              const pad = parseFloat(getComputedStyle(plot).paddingLeft);
              const specimen = band.closest('.specimen')?.getBoundingClientRect();
              const title = /** @type {Element} */ (
                band.closest('.sui-chart')?.querySelector('.sui-chart-title')
              ).getBoundingClientRect();
              return {
                // A stacked stage lends its inset only to a chart that stands straight in the
                // specimen, so a chart in a section keeps the section's edges.
                lent:
                  band
                    .closest('.sui-chart')
                    ?.parentElement?.matches('[data-layout="stack"] > .specimen > .body') === true,
                start: box.left - room.left - keyline,
                end: room.right - keyline - box.right,
                inside:
                  specimen !== undefined &&
                  box.left >= specimen.left - 0.5 &&
                  box.right <= specimen.right + 0.5,
                plotStart: box.left + pad - title.left
              };
            })
          );
          assert.ok(bands.some((band) => band.lent) && bands.some((band) => !band.lent));
          for (const band of bands)
            if (band.lent) {
              assert.ok(
                Math.abs(band.start) < 0.5 && Math.abs(band.end) < 0.5,
                JSON.stringify(band)
              );
              assert.ok(Math.abs(band.plotStart) < 0.5, `the plot keeps the title's edge`);
            } else assert.ok(band.inside, `${width}px: a band leaves its specimen`);
        } finally {
          await page.close();
        }
      }
    }
  );

  test('a chart draws in its server render exactly where it stands once the page runs', async () => {
    for (const width of [375, 1440]) {
      /** Where each chart draws every part of its plot, from the chart's own corner. */
      const read = async (/** @type {boolean} */ javaScriptEnabled) => {
        const page = await browser.newPage({ viewport: { width, height: 900 }, javaScriptEnabled });
        try {
          if (javaScriptEnabled) await visit(page, allSections(url));
          else await page.goto(allSections(url));
          return await page.evaluate(async () => {
            await document.fonts.ready;
            return [...document.querySelectorAll('#charts .sui-chart')].map((chart) => {
              const corner = chart.getBoundingClientRect();
              return [chart, ...chart.querySelectorAll('.plot-band, .plot-band svg :not(title)')]
                .map((part) => {
                  const box = part.getBoundingClientRect();
                  return [box.x - corner.x, box.y - corner.y, box.width, box.height]
                    .map((value) => value.toFixed(2))
                    .join(' ');
                })
                .join(', ');
            });
          });
        } finally {
          await page.close();
        }
      };
      assert.deepEqual(await read(true), await read(false), `${width}px`);
    }
  });

  test('the chart face table holds what Chrome draws, glyph by glyph and pair by pair', async () => {
    const { faceInk } = await import('../../src/lib/charts/geometry.ts');
    const page = await browser.newPage();
    try {
      await visit(page, allSections(url));
      const candidates = [
        [0x20, 0x7e],
        [0xa0, 0x2dc],
        [0x2000, 0x2215],
        [0xfffd, 0xfffd]
      ].flatMap(([from, to]) =>
        Array.from({ length: to - from + 1 }, (_, at) => String.fromCodePoint(from + at))
      );
      for (const semibold of [false, true]) {
        const glyphs = candidates.filter((glyph) => faceInk(glyph, semibold));
        // Each first glyph of a pair stands before and after every glyph, so one run reads
        // every pair the face can kern.
        const runs = glyphs.map((first) => `${first}${glyphs.join(first)}${first}`);
        const drawn = await page.evaluate(
          async ({ glyphs, runs, weight }) => {
            const face = `${weight} 1000px 'SUI Plus Jakarta Sans'`;
            await document.fonts.load(face, glyphs.join(''));
            const context = /** @type {CanvasRenderingContext2D} */ (
              document.createElement('canvas').getContext('2d')
            );
            context.font = face;
            const ns = 'http://www.w3.org/2000/svg';
            const svg = document.createElementNS(ns, 'svg');
            const text = document.createElementNS(ns, 'text');
            // As a chart sets its words: each character its own glyph, every space kept.
            text.setAttribute(
              'style',
              `font: ${face}; font-variant-ligatures: none; white-space: pre`
            );
            svg.append(text);
            document.body.append(svg);
            const advances = runs.map((run) => {
              text.textContent = run;
              return text.getComputedTextLength();
            });
            svg.remove();
            return {
              inks: glyphs.map((glyph) => {
                const ink = context.measureText(glyph);
                return [
                  ink.width,
                  ink.actualBoundingBoxLeft,
                  ink.actualBoundingBoxRight,
                  ink.actualBoundingBoxAscent,
                  ink.actualBoundingBoxDescent
                ];
              }),
              advances
            };
          },
          { glyphs, runs, weight: semibold ? 600 : 400 }
        );
        /** @type {string[]} */
        const wrong = [];
        // Chrome on Linux reports a glyph's ink only in steps of a sixty-fourth of an em and
        // rounds a semibold glyph's advance to a whole unit, so there each glyph is held to
        // those steps.
        const linux = process.platform === 'linux';
        const steps = [linux ? 0.5 : 0.01, ...Array(4).fill(linux ? 1000 / 64 : 0.01)];
        /** @type {Map<string, number>} */
        const drawnAdvance = new Map();
        glyphs.forEach((glyph, index) => {
          drawnAdvance.set(glyph, drawn.inks[index][0]);
          const ink = /** @type {import('../../src/lib/charts/geometry.ts').Ink} */ (
            faceInk(glyph, semibold)
          );
          const table = [ink.advance, ink.left, ink.right, ink.ascent, ink.descent];
          if (table.some((value, at) => Math.abs(value * 1000 - drawn.inks[index][at]) > steps[at]))
            wrong.push(`${glyph}: ${drawn.inks[index].join(' ')}`);
        });
        // A run's kerning is its advance less its glyphs' own, as each is drawn, so it is held
        // exactly wherever a glyph's own advance is rounded.
        /** @param {string} run @param {(glyph: string) => number} own */
        const kerned = (run, own) => [...run].reduce((left, glyph) => left - own(glyph), 0);
        runs.forEach((run, index) => {
          const table = /** @type {import('../../src/lib/charts/geometry.ts').Ink} */ (
            faceInk(run, semibold)
          ).advance;
          const tableKerning =
            table * 1000 + kerned(run, (glyph) => (faceInk(glyph, semibold)?.advance ?? 0) * 1000);
          const drawnKerning =
            drawn.advances[index] + kerned(run, (glyph) => drawnAdvance.get(glyph) ?? 0);
          // Each kerning value in the table is rounded to a hundredth of a unit.
          if (Math.abs(tableKerning - drawnKerning) > 0.005 * run.length)
            wrong.push(`pairs with ${run[0]}: ${drawnKerning - tableKerning}`);
        });
        assert.deepEqual(wrong, [], semibold ? 'semibold' : 'regular');
      }
    } finally {
      await page.close();
    }
  });

  test(
    'a linked card is one tab stop named by its title, rings the card and spares its controls',
    long,
    async () => {
      const page = await open(1440);
      try {
        const peers = page.locator('#card .peers').first();
        await peers.scrollIntoViewIfNeeded();
        const focused = () =>
          page.evaluate(() => {
            const element = document.activeElement;
            return `${element?.tagName.toLowerCase()} ${element?.getAttribute('aria-label') ?? element?.textContent?.trim() ?? ''}`;
          });
        const repositories = peers.getByRole('link', { name: 'Repositories', exact: true });
        assert.equal(await repositories.count(), 1, 'the card link is not named by its title');
        await repositories.focus();
        const stops = [];
        for (let step = 0; step < 4; step++) {
          await page.keyboard.press('Tab');
          stops.push(await focused());
        }
        assert.deepEqual(
          stops.map((stop) => stop.replace(/^a $/, 'a')),
          ['a', 'button Rule actions', 'a', 'button Invite'],
          'Tab does not go link, control, link, control'
        );
        assert.equal(
          await peers.getByRole('link', { name: 'Members', exact: true }).count(),
          1,
          "the third card's link is not named by its title"
        );

        await page.keyboard.press('Shift+Tab');
        const ring = await peers
          .locator('.sui-card')
          .nth(2)
          .evaluate((card) => {
            const look = getComputedStyle(card);
            return `${look.outlineStyle} ${look.outlineWidth} ${look.outlineColor === look.borderTopColor}`;
          });
        assert.equal(ring, 'solid 2px true', 'the focused link does not ring its card');

        const before = await page.evaluate(() => location.hash);
        await peers.getByRole('button', { name: 'Rule actions' }).click();
        assert.ok(
          await settles(
            page.waitForFunction(() => document.querySelector(':popover-open'), null, brief)
          ),
          'the menu inside the card did not open'
        );
        assert.equal(
          await page.evaluate(() => location.hash),
          before,
          'the menu press followed the link'
        );
        await page.keyboard.press('Escape');

        // The words let the pointer through to the link's layer, so a press on them follows it.
        const words = await peers.getByText('3 differ from the saved settings').boundingBox();
        assert.ok(words);
        await page.mouse.click(words.x + words.width / 2, words.y + words.height / 2);
        assert.equal(
          await page.evaluate(() => location.hash),
          '#card',
          'a press on the card did not follow its link'
        );
      } finally {
        await page.close();
      }
    }
  );

  /** What holds focus: a heading's words, or a link's address. */
  const focused = (/** @type {import('playwright-core').Page} */ page) =>
    page.evaluate(() => {
      const active = document.activeElement;
      return active?.matches('a[href]')
        ? active.getAttribute('href')
        : (active?.textContent?.trim() ?? '');
    });

  test(
    'a narrow list-detail opens a run over its list, and its way back lands on the row in place',
    long,
    async () => {
      const page = await openLayout('layouts/list-detail/', 375);
      try {
        const place = await page.evaluate(() => {
          scrollTo(0, document.documentElement.scrollHeight);
          return scrollY;
        });
        const row = page.locator('a[href="/layouts/list-detail/4174/"]');
        await row.focus();
        await page.keyboard.press('Enter');
        assert.ok(
          await settles(
            page.waitForFunction(
              () => document.activeElement?.matches('h1, h2, h3, h4'),
              null,
              brief
            )
          ),
          'opening a run left focus on its row'
        );
        assert.equal(await focused(page), 'Deploy web #4174', 'focus is not on the run title');
        assert.equal(new URL(page.url()).pathname, '/layouts/list-detail/4174/');
        assert.equal(
          await page.locator('.sui-list-detail-list').isVisible(),
          false,
          'the list stayed beside the run'
        );

        // The way back is the stop before the title, so Shift+Tab reaches it.
        await page.keyboard.press('Shift+Tab');
        assert.equal(
          await focused(page),
          '/layouts/list-detail/',
          'the way back is not before the title'
        );
        await page.keyboard.press('Enter');
        assert.ok(
          await settles(
            page.waitForFunction(
              () => document.activeElement?.getAttribute('href') === '/layouts/list-detail/4174/',
              null,
              brief
            )
          ),
          `the way back left focus on ${await focused(page)}`
        );
        assert.ok(
          Math.abs((await page.evaluate(() => scrollY)) - place) <= 1,
          'the page did not come back to where the list was scrolled'
        );
      } finally {
        await page.close();
      }
    }
  );

  test('a wide list-detail keeps its list in place and marks the run it opens', long, async () => {
    // A short window, so the list scrolls in its own pane.
    const page = await openLayout('layouts/list-detail/4182/', 1440, { height: 560 });
    try {
      const pair = page.locator('.sui-list-detail');
      const list = pair.locator('.sui-list-detail-list');
      // The row stands whole in the scrolled list, so the press scrolls nothing itself.
      await list.evaluate((pane) => (pane.scrollTop = 120));
      await pair.locator('a[href="/layouts/list-detail/4176/"]').click();
      assert.ok(
        await settles(
          page.waitForFunction(() => document.activeElement?.matches('h1, h2, h3, h4'), null, brief)
        ),
        'opening a run left focus on its row'
      );
      assert.equal(await focused(page), 'Deploy web #4176', 'focus is not on the run title');
      assert.equal(await list.evaluate((pane) => pane.scrollTop), 120, 'the list lost its place');
      assert.deepEqual(
        await pair
          .locator('[aria-current="page"]')
          .evaluateAll((rows) => rows.map((row) => row.getAttribute('href'))),
        ['/layouts/list-detail/4176/'],
        'the opened run is not the one current row'
      );
      assert.equal(
        await pair.getByRole('link', { name: 'Runs' }).count(),
        0,
        'the way back shows beside the list'
      );
    } finally {
      await page.close();
    }
  });

  test(
    'an unrelated navigation with body focus does not pull focus into a list-detail',
    long,
    async () => {
      const page = await openMounted();
      try {
        await page.evaluate(() => {
          const { lib, mount, createRawSnippet, flushSync, state, get, set } = /** @type {any} */ (
            window
          );
          const current = state('/one/');
          const one = createRawSnippet(() => ({
            render: () => '<h1>One</h1><button id="one-action">One action</button>'
          }));
          const two = createRawSnippet(() => ({
            render: () => '<h1>Two</h1><button id="two-action">Two action</button>'
          }));
          mount(lib.ListDetail, {
            target: document.body,
            props: {
              label: 'Items',
              backHref: '/',
              get current() {
                return get(current);
              },
              get detail() {
                return get(current) === '/one/' ? one : two;
              },
              list: createRawSnippet(() => ({
                render: () => '<a href="/one/">One</a><a href="/two/">Two</a>'
              }))
            }
          });
          flushSync();
          const outside = document.createElement('button');
          document.body.append(outside);
          outside.focus();
          outside.remove();
          Object.assign(window, { currentItem: current });
        });
        assert.equal(await page.evaluate(() => document.activeElement === document.body), true);
        await page.evaluate(() => {
          const { flushSync, set, currentItem } = /** @type {any} */ (window);
          set(currentItem, '/two/');
          flushSync();
        });
        assert.equal(
          await page.evaluate(() => document.activeElement === document.body),
          true,
          'an unrelated current change pulled focus into the pair'
        );
      } finally {
        await page.close();
      }
    }
  );

  test(
    'the detail pane page fits every width, with its aside beside the main column at 1440px',
    long,
    async () => {
      for (const width of [320, 375, 768, 1024, 1280, 1440])
        for (const theme of ['light', 'dark']) {
          const page = await openLayout('layouts/detail-pane/', width);
          try {
            const found = await page.evaluate((theme) => {
              document.documentElement.dataset.suiTheme = theme;
              const wide = (/** @type {Element} */ box) => box.scrollWidth > box.clientWidth;
              const scrollers = [...document.querySelectorAll('main *')].filter(
                (box) => /auto|scroll/.test(getComputedStyle(box).overflowX) && wide(box)
              );
              const main = document
                .querySelector('.sui-detail-layout-main')
                ?.getBoundingClientRect();
              const aside = document
                .querySelector('.sui-detail-layout-aside')
                ?.getBoundingClientRect();
              return {
                page: wide(document.documentElement),
                scrollers: scrollers.map((box) => `${box.tagName} ${box.className}`),
                beside: !!main && !!aside && Math.abs(main.top - aside.top) < 1
              };
            }, theme);
            const at = `at ${width}px in ${theme}`;
            assert.equal(found.page, false, `the page scrolls sideways ${at}`);
            assert.deepEqual(found.scrollers, [], `boxes scroll sideways ${at}`);
            if (width === 1440)
              assert.ok(found.beside, `the aside is not beside the main column ${at}`);
          } finally {
            await page.close();
          }
        }
    }
  );

  test(
    "a card's footer stands beside its copy at the foot while it fits, and under it otherwise",
    long,
    async () => {
      for (const width of [1440, 375]) {
        const page = await open(width);
        try {
          const card = page.locator('#card .sui-card.danger');
          await card.scrollIntoViewIfNeeded();
          const { main, footer, end, foot } = await card.evaluate((box) => {
            const read = (/** @type {string} */ selector) =>
              /** @type {Element} */ (box.querySelector(selector)).getBoundingClientRect().toJSON();
            const style = getComputedStyle(box);
            const own = box.getBoundingClientRect();
            return {
              main: read(':scope > .sui-card-main'),
              footer: read(':scope > .sui-card-footer'),
              end: own.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight),
              foot:
                own.bottom - parseFloat(style.borderBottomWidth) - parseFloat(style.paddingBottom)
            };
          });
          if (width === 1440) {
            assert.ok(footer.left >= main.right, 'the footer is not beside the copy');
            assert.ok(Math.abs(footer.bottom - main.bottom) < 0.5, 'the footer is not at its foot');
            assert.ok(Math.abs(footer.right - end) < 0.5, 'the footer leaves the end inset');
          } else {
            assert.ok(Math.abs(footer.top - main.bottom - 16) < 0.5, 'the footer is not under it');
            assert.ok(Math.abs(footer.left - main.left) < 0.5, 'the footer does not start with it');
          }
          assert.ok(Math.abs(footer.bottom - foot) < 0.5, 'the footer leaves the bottom inset');
        } finally {
          await page.close();
        }
      }
    }
  );

  test(
    'an action beside a head or a message never moves the copy, and a head keeps it beside',
    long,
    async () => {
      for (const width of [1440, 320]) {
        const page = await open(width);
        try {
          const problems = await page.evaluate(async () => {
            const frame = () =>
              new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            // A head never puts its action on a line of its own; a callout may, under 24rem.
            /** @type {[string, string, string[], boolean][]} */
            const kinds = [
              [
                '.sui-card',
                '.sui-card-actions',
                ['.sui-card-title', '.sui-card-note', '.sui-card-body'],
                true
              ],
              [
                '.sui-section',
                ':scope > .sui-section-head .sui-section-seat',
                ['.sui-section-title', '.sui-section-note', ':scope > .sui-section-body'],
                true
              ],
              [
                '.sui-plate',
                ':scope > .sui-plate-head > .sui-plate-status',
                ['.sui-plate-title', ':scope > .sui-plate-body'],
                true
              ],
              [
                '.sui-callout',
                '.sui-callout-actions',
                ['.sui-callout-title', '.sui-callout-text'],
                false
              ]
            ];
            /** @type {string[]} */
            const found = [];
            for (const [kind, seat, parts, beside] of kinds)
              for (const root of document.querySelectorAll(kind)) {
                const action = root.querySelector(seat);
                if (!action || !root.checkVisibility()) continue;
                const title = root.querySelector(parts[0])?.getBoundingClientRect();
                const drawn = [...action.querySelectorAll('*')]
                  .map((part) => part.getBoundingClientRect())
                  .filter((box) => box.width > 1 && box.height > 1);
                if (!title || drawn.length === 0) continue;
                const where = `${root.closest('section.section')?.id} ${kind}`;
                const top = Math.min(...drawn.map((box) => box.top));
                if (top >= title.bottom) {
                  if (beside) found.push(`${where}: the action takes a line of its own`);
                  continue;
                }
                const lines = () =>
                  parts.slice(0, 2).map((part) => {
                    const words = document.createRange();
                    const element = root.querySelector(part);
                    if (!element) return 0;
                    words.selectNodeContents(element);
                    return new Set([...words.getClientRects()].map((line) => Math.round(line.top)))
                      .size;
                  });
                const read = () => {
                  const origin = root.getBoundingClientRect().top;
                  return parts
                    .map((part) => root.querySelector(part)?.getBoundingClientRect().top ?? origin)
                    .map((at) => at - origin)
                    .concat(root.getBoundingClientRect().height);
                };
                const [withLines, withAction] = [lines(), read()];
                const holder = action.parentElement;
                const next = action.nextSibling;
                action.remove();
                await frame();
                const [bareLines, bare] = [lines(), read()];
                holder?.insertBefore(action, next);
                await frame();
                // Lending its width may wrap the copy one more line; only a move of the same lines counts.
                if (withLines.join() !== bareLines.join()) continue;
                const moved = withAction.findIndex((at, index) => Math.abs(at - bare[index]) > 0.5);
                if (moved >= 0)
                  found.push(
                    `${where}: ${parts[moved] ?? 'its height'} moves ${withAction[moved] - bare[moved]}px`
                  );
              }
            return found;
          });
          assert.deepEqual(problems, [], `at ${width}px`);
        } finally {
          await page.close();
        }
      }
    }
  );
});
