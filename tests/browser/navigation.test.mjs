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
        assert.equal(await shells.nth(0).locator('.sui-side-nav-fold').count(), 0);
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
          await page.locator('.sui-page-toc-link', { hasText: 'Data table' }).first().click();
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
    'a chart band reaches the edges of a card or stage that lends its inset, and stays in a specimen that does not (L-66)',
    long,
    async () => {
      for (const width of [1440, 375]) {
        const page = await open(width);
        try {
          const bands = await page.evaluate(() =>
            [...document.querySelectorAll('#charts .plot-band')].map((band) => {
              const box = band.getBoundingClientRect();
              const card = band.closest('.sui-card');
              // A card lends its inset inside its keyline; a stacked stage inside its frame's.
              const holder = /** @type {Element} */ (card ?? band.closest('.frame'));
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
                lent: card !== null || band.closest('[data-layout="stack"] .specimen') !== null,
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
});
