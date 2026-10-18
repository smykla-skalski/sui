import assert from 'node:assert/strict';
import { after, before, suite, test } from 'node:test';
import { long, startSink, together, visit } from './sink.mjs';

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
});
