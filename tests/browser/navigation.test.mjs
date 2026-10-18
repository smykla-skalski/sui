import assert from 'node:assert/strict';
import { after, before, suite, test } from 'node:test';
import { brief, long, settles, startSink, together, visit } from './sink.mjs';

// Behaviour of the shell, the navigation lists, the tabs and the charts that the law audit
// cannot see in one still page: focus handoffs, placement by direction, the phone bars,
// forced colors and what a scrolling pane or a scrolling plot does.

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

suite('navigation', together, () => {
  /**
   * @param {number} width
   * @param {{ rtl?: boolean; forced?: boolean }} [options]
   */
  async function open(width, { rtl = false, forced = false } = {}) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    if (forced) await page.emulateMedia({ forcedColors: 'active' });
    await visit(page, url);
    await page.evaluate(async (rtl) => {
      if (rtl) document.documentElement.dir = 'rtl';
      await document.fonts.ready;
    }, rtl);
    await page.waitForFunction(() => '__suiAudit' in window);
    return page;
  }

  /** The phone shells of the app shell section: the drawer one, then the bottom bar one. */
  const phone = (/** @type {import('playwright-core').Page} */ page, /** @type {number} */ index) =>
    page.locator('#app-shell .phone').nth(index);

  test(
    'a row followed in the phone drawer closes it and hands focus to the menu button',
    long,
    async () => {
      const page = await open(1440);
      try {
        const shell = phone(page, 0);
        await shell.scrollIntoViewIfNeeded();
        await shell.locator('.sui-shell-menu').click();
        const drawer = page.locator('.sui-shell-side:popover-open');
        await drawer.waitFor();
        await drawer.locator('.sui-side-nav-row', { hasText: 'Queue' }).click();
        await page.waitForTimeout(200);
        assert.equal(
          await page.locator('.sui-shell-side:popover-open').count(),
          0,
          'the drawer stayed open'
        );
        assert.ok(
          await shell
            .locator('.sui-shell-menu')
            .evaluate((menu) => document.activeElement === menu),
          'focus did not return to the menu button'
        );
        assert.equal(await shell.locator('.sui-shell-title').textContent(), 'Queue');
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
      const page = await open(1440);
      try {
        const shell = phone(page, 0);
        await shell.scrollIntoViewIfNeeded();
        await shell.locator('.sui-shell-menu').click();
        const drawer = page.locator('.sui-shell-side:popover-open');
        await drawer.waitFor();
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
    const page = await open(1440, { rtl: true });
    try {
      const shell = phone(page, 0);
      await shell.scrollIntoViewIfNeeded();
      await shell.locator('.sui-shell-menu').click();
      await page.locator('.sui-shell-side:popover-open').waitFor();
      const { frame, drawer } = await page.evaluate(() => ({
        frame: document.querySelectorAll('#app-shell .phone')[0].getBoundingClientRect().toJSON(),
        drawer: document
          .querySelector('.sui-shell-side:popover-open')
          ?.getBoundingClientRect()
          .toJSON()
      }));
      assert.ok(drawer, 'the drawer did not open');
      // The frame's 1px border stands between the shell and its box.
      assert.ok(
        Math.abs(drawer.right - (frame.right - 1)) <= 1,
        `drawer ends at ${drawer.right}, shell at ${frame.right}`
      );
      assert.ok(drawer.left >= frame.left, 'the drawer runs past the shell');
    } finally {
      await page.close();
    }
  });

  test(
    'with bottomNav a phone keeps the places in a bottom bar and the drawer holds only the pages',
    long,
    async () => {
      const page = await open(1440);
      try {
        const shell = phone(page, 1);
        await shell.scrollIntoViewIfNeeded();
        const bar = await shell.evaluate((frame) => {
          const rail = frame.querySelector('.sui-shell-places .sui-rail');
          const box = rail?.getBoundingClientRect();
          return rail && box
            ? {
                row: getComputedStyle(rail).flexDirection,
                gap: frame.getBoundingClientRect().bottom - box.bottom,
                tiles: [...rail.querySelectorAll('.sui-rail-tile')].map((tile) =>
                  Math.round(tile.getBoundingClientRect().height)
                )
              }
            : null;
        });
        assert.ok(bar, 'no rail in the bottom bar');
        assert.equal(bar.row, 'row');
        assert.ok(bar.gap <= 1, `the bar stands ${bar.gap}px above the shell's foot`);
        assert.ok(
          bar.tiles.every((height) => height >= 44),
          `tiles are ${bar.tiles.join(', ')}px`
        );
        await shell.locator('.sui-shell-menu').click();
        const drawer = page.locator('.sui-shell-side:popover-open');
        await drawer.waitFor();
        assert.equal(
          await drawer.locator('.sui-rail').count(),
          0,
          'the drawer carries the rail too'
        );
        assert.equal(await drawer.locator('.sui-side-nav').count(), 1);
        assert.ok(
          await shell
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
      const page = await open(1440);
      try {
        const shells = page.locator('#app-shell .sui-shell');
        // The expanded specimen is 980px wide, under the 64rem a fold needs; the collapsed one is 66rem.
        // Every shell draws the control in its markup, and its own width shows it.
        assert.equal(await shells.nth(0).locator('.sui-side-nav-fold:visible').count(), 0);
        const fold = shells.nth(1).locator('.sui-side-nav-fold');
        assert.equal((await fold.textContent())?.trim(), 'Expand');
        await fold.click();
        assert.equal((await fold.textContent())?.trim(), 'Collapse');
        assert.equal(
          await shells.nth(1).locator('.sui-side-nav').getAttribute('data-mode'),
          'full'
        );
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
      try {
        const marks = await page.evaluate(() => {
          const probe = document.body.appendChild(document.createElement('span'));
          probe.style.color = 'Highlight';
          const highlight = getComputedStyle(probe).color;
          probe.remove();
          const tabs = [...document.querySelectorAll('#tabs .sui-tabs')][0];
          const bar = (/** @type {Element} */ tab) =>
            getComputedStyle(tab, '::after').backgroundColor;
          const tile = document.querySelector('#app-shell .sui-rail-tile[aria-current]');
          return {
            highlight,
            current: bar(/** @type {Element} */ (tabs.querySelector('[aria-current="page"]'))),
            others: [...tabs.querySelectorAll('.sui-tabs-tab:not([aria-current])')].map(bar),
            place: tile ? getComputedStyle(tile).backgroundColor : null
          };
        });
        assert.equal(marks.current, marks.highlight);
        assert.ok(
          marks.others.every((color) => color !== marks.highlight),
          'every tab wears the mark'
        );
        assert.equal(marks.place, marks.highlight);
      } finally {
        await page.close();
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
          await visit(page, url);
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
          if (javaScriptEnabled) await visit(page, url);
          else await page.goto(url);
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
      await visit(page, url);
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
        glyphs.forEach((glyph, index) => {
          const ink = /** @type {import('../../src/lib/charts/geometry.ts').Ink} */ (
            faceInk(glyph, semibold)
          );
          const table = [ink.advance, ink.left, ink.right, ink.ascent, ink.descent];
          if (table.some((value, at) => Math.abs(value * 1000 - drawn.inks[index][at]) > 0.01))
            wrong.push(`${glyph}: ${drawn.inks[index].join(' ')}`);
        });
        runs.forEach((run, index) => {
          const advance = /** @type {import('../../src/lib/charts/geometry.ts').Ink} */ (
            faceInk(run, semibold)
          ).advance;
          // Each advance in the table is rounded to a hundredth of a unit.
          if (Math.abs(advance * 1000 - drawn.advances[index]) > 0.005 * run.length)
            wrong.push(`pairs with ${run[0]}: ${drawn.advances[index] - advance * 1000}`);
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

  /** The list-detail section's pairs: two on their own, then beside a rail and a sidebar, then a phone. */
  const pair = (/** @type {import('playwright-core').Page} */ page, /** @type {number} */ index) =>
    page.locator('#list-detail .sui-list-detail').nth(index);

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
      const page = await open(1440);
      try {
        const narrow = pair(page, 3);
        await narrow.scrollIntoViewIfNeeded();
        const place = await narrow.evaluate((box) => {
          box.scrollTop = box.scrollHeight;
          return box.scrollTop;
        });
        await narrow.locator('a[href="#list-detail-run-4174"]').focus();
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
        assert.equal(
          await narrow.locator('.sui-list-detail-list').isVisible(),
          false,
          'the list stayed beside the run'
        );

        // The way back is the stop before the title, so Shift+Tab reaches it.
        await page.keyboard.press('Shift+Tab');
        assert.equal(
          await focused(page),
          '#list-detail-runs',
          'the way back is not before the title'
        );
        await page.keyboard.press('Enter');
        assert.ok(
          await settles(
            page.waitForFunction(
              () => document.activeElement?.getAttribute('href') === '#list-detail-run-4174',
              null,
              brief
            )
          ),
          `the way back left focus on ${await focused(page)}`
        );
        assert.ok(
          Math.abs((await narrow.evaluate((box) => box.scrollTop)) - place) <= 1,
          'the list did not come back to where it was scrolled'
        );
      } finally {
        await page.close();
      }
    }
  );

  test('a wide list-detail keeps its list in place and marks the run it opens', long, async () => {
    const page = await open(1440);
    try {
      const wide = pair(page, 0);
      await wide.scrollIntoViewIfNeeded();
      const list = wide.locator('.sui-list-detail-list');
      // The row stands whole in the scrolled list, so the press scrolls nothing itself.
      await list.evaluate((pane) => (pane.scrollTop = 120));
      await wide.locator('a[href="#list-detail-run-4176"]').click();
      assert.ok(
        await settles(
          page.waitForFunction(() => document.activeElement?.matches('h1, h2, h3, h4'), null, brief)
        ),
        'opening a run left focus on its row'
      );
      assert.equal(await focused(page), 'Deploy web #4176', 'focus is not on the run title');
      assert.equal(await list.evaluate((pane) => pane.scrollTop), 120, 'the list lost its place');
      assert.deepEqual(
        await wide
          .locator('[aria-current="page"]')
          .evaluateAll((rows) => rows.map((row) => row.getAttribute('href'))),
        ['#list-detail-run-4176'],
        'the opened run is not the one current row'
      );
      assert.equal(
        await wide.getByRole('link', { name: 'Runs' }).count(),
        0,
        'the way back shows beside the list'
      );
    } finally {
      await page.close();
    }
  });

  test(
    'a wheel over a bounded list-detail pane scrolls the pane, then the page past its end',
    long,
    async () => {
      const page = await open(1440);
      try {
        const list = pair(page, 0).locator('.sui-list-detail-list');
        await list.scrollIntoViewIfNeeded();
        const box = await list.boundingBox();
        assert.ok(box);
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        const pane = await list.elementHandle();
        await page.mouse.wheel(0, 120);
        assert.ok(
          await settles(page.waitForFunction((pane) => pane && pane.scrollTop > 0, pane, brief)),
          'the wheel did not scroll the list'
        );

        // A new wheel gesture, once the list rests at its end, runs on into the page. The page
        // must travel most of the wheel's way, so a shift of the sink's own layout never passes.
        await page.waitForTimeout(600);
        await list.evaluate((pane) => (pane.scrollTop = pane.scrollHeight));
        const before = await page.evaluate(() => scrollY);
        await page.mouse.wheel(0, 240);
        assert.ok(
          await settles(page.waitForFunction((before) => scrollY > before + 120, before, brief)),
          'the page stopped under the list at its end'
        );
      } finally {
        await page.close();
      }
    }
  );

  test(
    "the detail pane's shells fit their stage at every width, with the wide pane's aside beside it at 1440px",
    long,
    async () => {
      for (const width of [320, 375, 768, 1024, 1280, 1440])
        for (const theme of ['light', 'dark']) {
          const page = await open(width);
          try {
            const found = await page.evaluate((theme) => {
              document.documentElement.dataset.suiTheme = theme;
              const wide = (/** @type {Element} */ box) => box.scrollWidth > box.clientWidth;
              const section = /** @type {HTMLElement} */ (document.getElementById('detail-pane'));
              const scrollers = [...section.querySelectorAll('*')].filter(
                (box) => /auto|scroll/.test(getComputedStyle(box).overflowX) && wide(box)
              );
              const layout = document
                .getElementById('detail-pane-layout')
                ?.closest('.example')
                ?.querySelector('.sui-detail-layout');
              const main = layout
                ?.querySelector('.sui-detail-layout-main')
                ?.getBoundingClientRect();
              const aside = layout
                ?.querySelector('.sui-detail-layout-aside')
                ?.getBoundingClientRect();
              return {
                section: wide(section),
                scrollers: scrollers.map((box) => `${box.tagName} ${box.className}`),
                beside: !!main && !!aside && Math.abs(main.top - aside.top) < 1
              };
            }, theme);
            const at = `at ${width}px in ${theme}`;
            assert.equal(found.section, false, `the section reaches past the page ${at}`);
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
