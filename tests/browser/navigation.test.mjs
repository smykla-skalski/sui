import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, suite, test } from 'node:test';
import {
  allSections,
  atRest,
  audit,
  brief,
  long,
  openMount,
  settles,
  startSink,
  together,
  visit
} from './sink.mjs';

// Behaviour of the shell, the navigation lists, the tabs and the charts that the law audit
// cannot see in one still page: focus handoffs, placement by direction, the phone bars,
// forced colors and what a scrolling pane or a scrolling plot does. The shells and the page
// layouts are whole pages under /layouts, measured at the window's own width.

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

/** @typedef {import('playwright-core').Page} Page */

/**
 * One page that the tests of a suite share, since loading the whole sink costs more than most of
 * its checks. It opens on the first test that asks for it, so a run that filters or skips every
 * test of the suite opens none.
 * @param {() => Promise<Page>} opener
 */
function shared(opener) {
  /** @type {Promise<Page> | undefined} */
  let opened;
  after(async () => void (await (await opened)?.close()));
  return () => (opened ??= opener());
}

/**
 * Sets the window's width and waits two frames, so what a resize observer or a container query
 * moves has landed.
 * @param {Page} page
 * @param {number} width
 */
async function resize(page, width) {
  await page.setViewportSize({ width, height: 900 });
  await page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
  );
}

suite('navigation', together, () => {
  /** @param {number} width */
  async function open(width) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await visit(page, allSections(url));
    await page.evaluate(() => document.fonts.ready);
    return page;
  }

  /**
   * Opens one of the layout pages, a whole app page with no sink around it.
   * @param {string} path
   * @param {number} width
   * @param {{ height?: number }} [options]
   */
  async function openLayout(path, width, { height = 900 } = {}) {
    const page = await browser.newPage({ viewport: { width, height } });
    await visit(page, new URL(path, url).href);
    await page.evaluate(() => document.fonts.ready);
    // The page stays hidden until its faces arrive, and nothing hidden is a tab stop.
    await page.waitForFunction(() => !document.documentElement.dataset.suiFonts);
    return page;
  }

  /**
   * Opens the phone drawer and waits until the shell has taken it: focus moves in last, once its
   * Tab trap holds and the bars and the content behind it are inert.
   * @param {Page} page
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

  /** @param {Page} page */
  const highlight = (page) =>
    page.evaluate(() => {
      const probe = document.body.appendChild(document.createElement('span'));
      probe.style.color = 'Highlight';
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    });

  // Each test leaves the page as it found it, or comes after every test its change would upset.
  suite('one app shell page at each width', { concurrency: 1 }, () => {
    const shell = shared(() => openLayout('layouts/app-shell/', 1440));

    test('under forced colors the current place is marked in Highlight', long, async () => {
      const page = await shell();
      await page.emulateMedia({ forcedColors: 'active' });
      try {
        const place = await page.evaluate(() => {
          const tile = document.querySelector('.sui-rail-tile[aria-current]');
          return tile ? getComputedStyle(tile).backgroundColor : null;
        });
        assert.equal(place, await highlight(page));
      } finally {
        await page.emulateMedia({ forcedColors: null });
      }
    });

    test(
      'the fold control shows only where the shell is wide enough to fold, and names its action',
      long,
      async () => {
        const page = await shell();
        // A 1000px window is under the 64rem a fold needs. The shell draws the control in its
        // markup at every width, and its own width shows it.
        await resize(page, 1000);
        assert.equal(await page.locator('.sui-side-nav-fold:visible').count(), 0);
        await resize(page, 1440);
        const fold = page.locator('.sui-side-nav-fold');
        const mode = () => page.locator('.sui-side-nav').getAttribute('data-mode');
        assert.equal((await fold.textContent())?.trim(), 'Collapse Navigation');
        await fold.click();
        assert.equal((await fold.textContent())?.trim(), 'Expand Navigation');
        assert.equal(await mode(), 'collapsed');
        await fold.click();
        assert.equal((await fold.textContent())?.trim(), 'Collapse Navigation');
        assert.equal(await mode(), 'full');
        assert.ok(
          await fold.evaluate((button) => document.activeElement === button),
          'folding lost focus'
        );
      }
    );

    test(
      'a row followed in the phone drawer closes it and hands focus to the menu button',
      long,
      async () => {
        const page = await shell();
        await resize(page, 375);
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
      }
    );

    // A control folded in a closed disclosure still has client rects in Chrome, and the
    // disclosure's summary is a tab stop of its own.
    test(
      'Tab wraps in the phone drawer past a control folded in a closed details',
      long,
      async () => {
        const page = await shell();
        await resize(page, 375);
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
        // The first stop is a rail tile, whose tip shows on focus and takes the first Escape.
        await page.keyboard.press('Escape');
        assert.ok(await drawer.isVisible(), 'the Escape that closed the tip closed the drawer');
        await page.keyboard.press('Escape');
        await drawer.waitFor({ state: 'detached' });
      }
    );

    // It reloads the page, and the test after it sets up the page it needs itself.
    test(
      'the rail places are links, and the place one opens stays current through a reload',
      long,
      async () => {
        const page = await shell();
        await resize(page, 1440);
        const personal = page.locator('.sui-rail').getByRole('link', { name: 'Personal' });
        await personal.click();
        await page.waitForURL((address) => address.searchParams.get('place') === 'personal', brief);
        assert.equal(await personal.getAttribute('aria-current'), 'page');
        await visit(page, page.url());
        assert.equal(await personal.getAttribute('aria-current'), 'page');
      }
    );

    test('the phone drawer opens from the start edge in a right-to-left page', long, async () => {
      const page = await shell();
      await resize(page, 375);
      await page.evaluate(() => (document.documentElement.dir = 'rtl'));
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
    });
  });

  test('a phone row keeps its side beside a short name, however wide the side', long, async () => {
    const page = await openLayout('layouts/app-shell/', 375);
    try {
      const dropped = await page.evaluate(() =>
        [...document.querySelectorAll('.sui-object-row')]
          .filter((row) => {
            const main = /** @type {Element} */ (row.querySelector('.sui-object-row-main'));
            const side = row.querySelector('.sui-object-row-side');
            return side && side.getBoundingClientRect().top >= main.getBoundingClientRect().bottom;
          })
          .map((row) => row.textContent?.trim())
      );
      assert.deepEqual(dropped, [], 'a short row dropped its side');
    } finally {
      await page.close();
    }
  });

  test('the phone bar’s title waits while the page’s h1 shows under it, then fades in as the h1 passes under the bar', async () => {
    const page = await openLayout('layouts/app-shell/', 375, { height: 400 });
    try {
      const read = () =>
        page.evaluate(() => {
          const title = /** @type {Element} */ (document.querySelector('.sui-shell-title'));
          const heading = /** @type {Element} */ (document.querySelector('.sui-shell-pane h1'));
          const bar = /** @type {Element} */ (title.closest('.sui-shell-bar'));
          const edge = bar.getBoundingClientRect().bottom;
          const box = heading.getBoundingClientRect();
          return {
            opacity: Number(getComputedStyle(title).opacity),
            below: box.top >= edge,
            under: box.bottom <= edge,
            top: box.top - edge
          };
        });
      const shown = await read();
      assert.equal(shown.opacity, 0, 'the bar names the page while its h1 shows');
      assert.ok(shown.below);
      // A scroll timeline moves its animation on the next frame.
      const scroll = (/** @type {number} */ to) =>
        page.evaluate(async (to) => {
          scrollTo(0, to);
          await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
        }, to);
      await scroll(shown.top + 9);
      const halfway = await read();
      assert.ok(halfway.opacity > 0 && halfway.opacity < 1, `${halfway.opacity} halfway`);
      await scroll(shown.top + 200);
      const passed = await read();
      assert.ok(passed.under);
      assert.equal(passed.opacity, 1, 'the bar names the page once its h1 has passed under it');
      assert.ok(
        await page.locator('.sui-shell-title').evaluate((title) => title.checkVisibility()),
        'the title stays in the accessibility tree'
      );
    } finally {
      await page.close();
    }
  });

  test('inside the shell the page header’s rule takes the sidebar’s line ink', async () => {
    const page = await openLayout('layouts/app-shell/', 1440);
    try {
      const [band, edge] = await page.evaluate(() => [
        getComputedStyle(/** @type {Element} */ (document.querySelector('.sui-page-header')))
          .borderBottomColor,
        getComputedStyle(/** @type {Element} */ (document.querySelector('.sui-shell-pages')))
          .borderRightColor
      ]);
      assert.equal(band, edge);
      // The ink is translucent, so both rules must also paint over one ground to meet as one.
      const pixel = async (/** @type {number} */ x, /** @type {number} */ y) => {
        const shot = await page.screenshot({ clip: { x, y, width: 1, height: 1 } });
        return page.evaluate(
          async (data) => {
            const image = await createImageBitmap(await (await fetch(data)).blob());
            const context = new OffscreenCanvas(1, 1).getContext('2d');
            context?.drawImage(image, 0, 0);
            return [...(context?.getImageData(0, 0, 1, 1).data ?? [])].slice(0, 3).join();
          },
          `data:image/png;base64,${shot.toString('base64')}`
        );
      };
      for (const theme of ['light', 'dark']) {
        await page.evaluate((theme) => (document.documentElement.dataset.theme = theme), theme);
        const { foot, side } = await page.evaluate(() => {
          const header = /** @type {Element} */ (
            document.querySelector('.sui-page-header')
          ).getBoundingClientRect();
          const pages = /** @type {Element} */ (
            document.querySelector('.sui-shell-pages')
          ).getBoundingClientRect();
          return {
            foot: { x: header.left + 40, y: header.bottom - 1 },
            side: { x: pages.right - 1, y: header.bottom + 40 }
          };
        });
        assert.equal(
          await pixel(foot.x, foot.y),
          await pixel(side.x, side.y),
          `${theme}: the header's foot and the sidebar's edge paint two inks`
        );
      }
    } finally {
      await page.evaluate(() => delete document.documentElement.dataset.theme);
      await page.close();
    }
  });

  test("the shell demo lays its list to the header band's gutter on a 1440px pane", async () => {
    const page = await openLayout('layouts/app-shell/', 1440);
    try {
      const [list, header] = await page.evaluate(() =>
        ['main .sui-object-list', 'main .sui-page-header'].map(
          (name) =>
            /** @type {Element} */ (document.querySelector(name)).getBoundingClientRect().right
        )
      );
      assert.ok(
        Math.abs(header - 24 - list) <= 0.5,
        `the list ends at ${list}, the band at ${header}`
      );
    } finally {
      await page.close();
    }
  });

  test('a rail tile stands 8px in from each side of its 80px column, its words given 63px', async () => {
    const page = await openLayout('layouts/app-shell/', 1440);
    try {
      const found = await page.evaluate(() => {
        const rail = /** @type {Element} */ (
          document.querySelector('.sui-rail')
        ).getBoundingClientRect();
        const tile = /** @type {Element} */ (
          document.querySelector('.sui-rail-list .sui-rail-tile')
        );
        const box = tile.getBoundingClientRect();
        const look = getComputedStyle(tile);
        return [
          box.left - rail.left,
          rail.right - 1 - box.right,
          box.width - parseFloat(look.paddingInlineStart) - parseFloat(look.paddingInlineEnd)
        ];
      });
      assert.deepEqual(
        found,
        [8, 8, 63],
        "the tile, past the column's 1px edge, and its words' room"
      );
    } finally {
      await page.close();
    }
  });

  test('the side nav kicker and the page header eyebrow share one cap line', async () => {
    const page = await openLayout('layouts/app-shell/', 1440);
    try {
      // The box tops alone met while the capitals stood a pixel apart, so the type is held too.
      const [nav, header] = await page.evaluate(() =>
        ['.sui-side-nav-kicker', '.sui-page-header-eyebrow'].map((name) => {
          const element = /** @type {Element} */ (document.querySelector(name));
          const look = getComputedStyle(element);
          return {
            top: element.getBoundingClientRect().top,
            type: [look.fontSize, look.fontWeight, look.letterSpacing, look.lineHeight].join(' ')
          };
        })
      );
      assert.ok(
        Math.abs(nav.top - header.top) <= 0.5,
        `the kicker stands at ${nav.top}, the eyebrow at ${header.top}`
      );
      assert.equal(nav.type, header.type, 'the kicker is set apart from the eyebrow');
    } finally {
      await page.close();
    }
  });

  test('a nav row rests in an ink 2:1 from the current one, over its headings on light, and hover and focus take the primary ink', async () => {
    const page = await openLayout('layouts/app-shell/', 1440);
    try {
      for (const theme of ['light', 'dark']) {
        const inks = await page.evaluate((theme) => {
          document.documentElement.dataset.theme = theme;
          const nav = /** @type {Element} */ (document.querySelector('.sui-side-nav'));
          const rgb = (/** @type {string} */ color) => {
            // A mixed ink computes as color(srgb r g b) in shares of 1, a plain one as rgb() in bytes.
            const scale = color.startsWith('color(') ? 255 : 1;
            const [r, g, b] = (color.match(/[\d.]+/g) ?? []).map((part) => Number(part) * scale);
            const lin = (/** @type {number} */ c) =>
              (c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
            return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
          };
          const ratio = (/** @type {string} */ a, /** @type {string} */ b) => {
            const [x, y] = [rgb(a), rgb(b)].sort((p, q) => q - p);
            return (x + 0.05) / (y + 0.05);
          };
          const ink = (/** @type {string} */ token) => {
            const probe = document.createElement('i');
            probe.style.color = `var(${token})`;
            nav.append(probe);
            const color = getComputedStyle(probe).color;
            probe.remove();
            return color;
          };
          const color = (/** @type {string} */ selector) =>
            getComputedStyle(/** @type {Element} */ (nav.querySelector(selector))).color;
          const rest = color('.sui-side-nav-row:not([aria-current])');
          const ground = ink('--sui-sidebar-bg');
          const row = /** @type {HTMLElement} */ (
            nav.querySelector('.sui-side-nav-row:not([aria-current])')
          );
          row.focus({ focusVisible: true });
          const focused = getComputedStyle(row).color;
          row.blur();
          return {
            current: ratio(color('.sui-side-nav-row[aria-current]'), rest),
            rows: ratio(rest, ground),
            headings: ratio(color('.sui-side-nav-group'), ground),
            focused,
            primary: ink('--sui-sidebar-text')
          };
        }, theme);
        assert.ok(
          inks.current >= 2,
          `${theme}: the current ink is ${inks.current.toFixed(2)}:1 from rest`
        );
        if (theme === 'light')
          assert.ok(
            inks.rows > inks.headings,
            'light: a rest row reads no stronger than its heading'
          );
        assert.equal(inks.focused, inks.primary, `${theme}: a focused row keeps its rest ink`);
      }
      await page.evaluate(() => delete document.documentElement.dataset.theme);
      const row = page.locator('.sui-side-nav-row:not([aria-current])').first();
      await row.hover();
      const hovered = await row.evaluate((row) => {
        const probe = document.createElement('i');
        probe.style.color = 'var(--sui-sidebar-text)';
        row.append(probe);
        const primary = getComputedStyle(probe).color;
        probe.remove();
        return [getComputedStyle(row).color, primary];
      });
      assert.equal(hovered[0], hovered[1], 'a hovered row keeps a quieter ink than the primary');
    } finally {
      await page.close();
    }
  });

  test(
    'the nav answers the pointer on a row’s hover ground, pressed a step past it and short of the current plate',
    long,
    async () => {
      const page = await openLayout('layouts/app-shell/', 1440);
      try {
        for (const theme of ['light', 'dark']) {
          const ground = await page.evaluate((theme) => {
            document.documentElement.dataset.theme = theme;
            const rail = /** @type {Element} */ (document.querySelector('.sui-rail'));
            const canvas = document.createElement('canvas');
            const context = /** @type {CanvasRenderingContext2D} */ (
              canvas.getContext('2d', { willReadFrequently: true })
            );
            // Each ground is drawn over the sidebar's, as the nav and the rows beside it stand on it.
            const paint = (/** @type {string} */ token) => {
              const probe = document.createElement('i');
              probe.style.color = `var(${token})`;
              rail.append(probe);
              const color = getComputedStyle(probe).color;
              probe.style.color = 'var(--sui-sidebar-bg)';
              const base = getComputedStyle(probe).color;
              probe.remove();
              context.fillStyle = base;
              context.fillRect(0, 0, 1, 1);
              context.fillStyle = color;
              context.fillRect(0, 0, 1, 1);
              const [r, g, b] = [...context.getImageData(0, 0, 1, 1).data].map(
                (value) => value / 255
              );
              const linear = (/** @type {number} */ c) =>
                c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
              const [lr, lg, lb] = [r, g, b].map(linear);
              const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
              const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
              const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
              return {
                rgb: [r, g, b].map((c) => Math.round(c * 255)).join(),
                lightness: 0.2104542553 * l + 0.793617785 * m - 0.0040720453 * s
              };
            };
            return {
              hover: paint('--sui-sidebar-item-hover'),
              row: paint('--sui-row-hover'),
              pressed: paint('--sui-sidebar-item-pressed'),
              plate: paint('--sui-sidebar-active-bg'),
              rest: paint('--sui-sidebar-bg')
            };
          }, theme);
          // The opaque mix and a row's see-through one round apart by a unit at most.
          const apart = Math.max(
            ...ground.hover.rgb
              .split(',')
              .map((c, at) => Math.abs(+c - +ground.row.rgb.split(',')[at]))
          );
          assert.ok(apart <= 1, `${theme}: the nav hovers on another grey than a row`);
          // On light a step is darker, on dark lighter: each one moves at least 0.015 in OKLab.
          const steps = [ground.rest, ground.hover, ground.pressed, ground.plate].map(
            (step) => (theme === 'light' ? -1 : 1) * step.lightness
          );
          for (let at = 1; at < steps.length; at++)
            assert.ok(
              steps[at] - steps[at - 1] >= 0.015,
              `${theme}: step ${at} of rest, hover, pressed and plate moves ${(steps[at] - steps[at - 1]).toFixed(3)}`
            );
        }
        await page.evaluate(() => delete document.documentElement.dataset.theme);
        const tile = page.locator('.sui-rail-tile:has(.sui-rail-badge)').first();
        await tile.hover();
        const badge = await tile.evaluate((tile) => {
          const badge = /** @type {HTMLElement} */ (tile.querySelector('.sui-rail-badge'));
          return {
            halo: getComputedStyle(badge).boxShadow.split(/\)\s/)[0] + ')',
            ground: getComputedStyle(tile).backgroundColor,
            top: badge.getBoundingClientRect().top - 2 - tile.getBoundingClientRect().top,
            end: tile.getBoundingClientRect().right - badge.getBoundingClientRect().right - 2,
            // How far the count reaches over the glyph's own box from its end.
            over:
              /** @type {Element} */ (
                tile.querySelector('.sui-rail-glyph svg')
              ).getBoundingClientRect().right - badge.getBoundingClientRect().left
          };
        });
        assert.equal(
          badge.halo,
          badge.ground,
          'the badge’s halo shows the sidebar through a hovered tile'
        );
        assert.ok(badge.top >= 0, `the badge’s halo reaches ${-badge.top}px past the tile’s top`);
        assert.ok(badge.end >= 0, `the badge’s halo reaches ${-badge.end}px past the tile’s end`);
        assert.ok(
          badge.over <= 4,
          `the count covers ${badge.over}px of its glyph, more than a corner`
        );
      } finally {
        await page.close();
      }
    }
  );

  test('a bottom bar’s count rides its glyph’s corner, as the rail’s does, its halo inside the tile', async () => {
    for (const width of [390, 320]) {
      const page = await openLayout('layouts/app-shell/bottom-nav/', width);
      try {
        const badge = await page.evaluate(() => {
          const tile = /** @type {Element} */ (
            document.querySelector('.sui-shell-places .sui-rail-tile:has(.sui-rail-badge)')
          );
          const box = tile.getBoundingClientRect();
          const count = /** @type {Element} */ (
            tile.querySelector('.sui-rail-badge')
          ).getBoundingClientRect();
          const glyph = /** @type {Element} */ (
            tile.querySelector('.sui-rail-glyph svg')
          ).getBoundingClientRect();
          return [
            glyph.right - count.left > 0 && glyph.right - count.left <= 4,
            count.top < glyph.top,
            count.left - 2 >= box.left && count.right + 2 <= box.right
          ];
        });
        assert.deepEqual(
          badge,
          [true, true, true],
          `at ${width}px: over the corner, above the glyph, inside the tile`
        );
      } finally {
        await page.close();
      }
    }
  });

  test(
    'with bottomNav a phone keeps the places in a bottom bar, its tiles 8px in as the rail’s, and the drawer holds only the pages',
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
                ),
                room: (() => {
                  const tiles = [...rail.querySelectorAll('.sui-rail-tile')].map((tile) =>
                    tile.getBoundingClientRect()
                  );
                  const rule = parseFloat(getComputedStyle(rail).borderBlockStartWidth);
                  return [
                    tiles[0].left - box.left,
                    tiles[0].top - box.top - rule,
                    box.right - tiles[tiles.length - 1].right,
                    box.bottom - tiles[0].bottom
                  ].map(Math.round);
                })()
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
        assert.deepEqual(bar.room, [8, 8, 8, 8], 'the tiles stand 8px in, as the rail’s do');
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

  test('L-118 the shell keeps its bar, pane, drawer, skip link, toasts and worker status inside the safe area, toasts standing on the status, and so does the error page', async () => {
    // A phone upright, with its notch and home indicator, and on its side, notch at the start,
    // narrow enough that the error page's centred column meets the insets.
    for (const [width, height, insets] of /** @type {const} */ ([
      [390, 844, { top: 47, right: 0, bottom: 34, left: 0 }],
      [812, 375, { top: 0, right: 44, bottom: 21, left: 44 }]
    ])) {
      const page = await browser.newPage({ viewport: { width, height }, hasTouch: true });
      try {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets });
        await visit(page, new URL('layouts/app-shell/', url).href);
        await page.waitForFunction(() => !document.documentElement.dataset.suiFonts);
        const safe = {
          top: insets.top,
          left: insets.left,
          right: width - insets.right,
          bottom: height - insets.bottom
        };
        /** @type {string[]} */
        const out = [];
        const inside = async (/** @type {import('playwright-core').Locator} */ part, name = '') => {
          const box = await part.boundingBox();
          if (!box) return out.push(`${name}: no box`);
          if (
            box.y < safe.top - 0.5 ||
            box.x < safe.left - 0.5 ||
            box.x + box.width > safe.right + 0.5 ||
            box.y + box.height > safe.bottom + 0.5
          )
            out.push(
              `${name} at ${Math.round(box.x)},${Math.round(box.y)} ${box.width}x${box.height}`
            );
        };
        const skip = page.locator('.sui-skip-link');
        // A long label meets the width cap, which must keep clear of the inset on either side.
        await skip.evaluate((link) => (link.textContent = 'Skip to the main content '.repeat(8)));
        await page.keyboard.press('Tab');
        await skip.evaluate((link) => Promise.all(link.getAnimations().map((run) => run.finished)));
        await inside(skip, 'skip link');
        await skip.evaluate((link) => /** @type {HTMLElement} */ (link).blur());
        await skip.evaluate((link) => Promise.all(link.getAnimations().map((run) => run.finished)));
        // At rest the link waits wholly above the screen, its notch room too.
        const rest = await skip.boundingBox();
        if (!rest || rest.y + rest.height > 0)
          out.push(`the resting skip link reaches ${rest && rest.y + rest.height}px down`);
        await inside(page.locator('.sui-shell-menu'), 'menu button');
        // The pane runs on past the foot of the screen, so only its sides are measured.
        const pane = await page.locator('.sui-shell-pane').boundingBox();
        if (!pane || pane.x < safe.left - 0.5 || pane.x + pane.width > safe.right + 0.5)
          out.push(`pane across ${pane?.x}-${pane && pane.x + pane.width}`);
        const drawer = await openDrawer(page);
        await inside(drawer.locator('.sui-shell-pages'), 'drawer pages');
        // A lasting worker status and a toast meet at the foot of a narrow screen, so the toast
        // stands on the status, and on a phone a short toast still spans the screen.
        await visit(page, new URL('toaster/', url).href);
        await page.evaluate(() => dispatchEvent(new Event('offline')));
        await page.getByRole('button', { name: 'Save Settings' }).first().click();
        const status = page.locator('.sui-service-worker-status:popover-open');
        const toast = page.locator('.sui-toaster:popover-open .sui-toast');
        for (const part of [status, toast])
          await part.evaluate((node) =>
            Promise.all(node.getAnimations().map((run) => run.finished))
          );
        await inside(status, 'worker status');
        await inside(toast, 'toast');
        const [low, high] = [await status.boundingBox(), await toast.boundingBox()];
        if (!low || !high || high.y + high.height > low.y - 7.5)
          out.push(`toast foot ${high && high.y + high.height} over status top ${low?.y}`);
        if (width < 768 && Math.abs((high?.width ?? 0) - (low?.width ?? 0)) > 0.5)
          out.push(`a short toast is ${high?.width}px wide beside a ${low?.width}px status`);
        // The error page stands outside the shell, so it keeps its own words clear of the insets.
        await page.evaluate(() => {
          const link = Object.assign(document.createElement('a'), { href: '../no-such-page/' });
          document.body.append(link);
          link.click();
        });
        const lost = page.getByRole('heading', { level: 1, name: 'Page Not Found' });
        await lost.waitFor(brief);
        await inside(lost, 'error page title');
        await inside(page.locator('.sui-error-state'), 'error page panel');
        assert.deepEqual(out, [], `${width}x${height}`);
      } finally {
        await page.close();
      }
    }
  });

  test("a detail pane's property placeholders span the height its properties take", async () => {
    // From the first ink to the last: the rows' box less the room they hand back above their
    // first bar and under their last, and the list's own box, which starts and ends at its ink.
    const span = async (/** @type {string} */ path) => {
      const page = await openLayout(path, 1440);
      try {
        return await page.evaluate(() => {
          const aside = document.querySelector('.sui-detail-layout-aside');
          const facts = aside?.querySelector('.sui-fact-list');
          if (facts) return facts.getBoundingClientRect().height;
          const rows = /** @type {Element} */ (aside?.querySelector('.sui-skeleton-rows'));
          const { marginTop, marginBottom } = getComputedStyle(rows);
          return (
            rows.getBoundingClientRect().height + parseFloat(marginTop) + parseFloat(marginBottom)
          );
        });
      } finally {
        await page.close();
      }
    };
    const loaded = await span('layouts/detail-pane/');
    const loading = await span('layouts/detail-pane/loading/');
    assert.ok(
      Math.abs(loaded - loading) <= 2,
      `the properties span ${loaded}px where their placeholders spanned ${loading}px`
    );
  });

  test("a property row with a face keeps its neighbours' pitch and holds a name that wraps", async () => {
    const page = await openLayout('layouts/detail-pane/', 1440);
    try {
      const heights = () =>
        page.evaluate(() =>
          [...document.querySelectorAll('.sui-detail-layout-aside .sui-fact-list-fact')]
            .slice(0, 3)
            .map((row) => row.getBoundingClientRect().height)
        );
      // The first row takes no room above it, so the plain row to match is the second.
      const [, plain, face] = await heights();
      assert.equal(face, plain, 'the row with a face stands off the pitch of its neighbours');
      // The name's lines stay inside the value, so a long name grows its row rather than
      // running over the hairline into the next fact.
      const spill = await page.evaluate(() => {
        const name = /** @type {Element} */ (
          document.querySelector('.sui-detail-layout-aside .sui-identity-name')
        );
        name.textContent = 'Bartholomew Alexander Smykla-Konstantynopolitański';
        const value = /** @type {Element} */ (name.closest('.sui-fact-list-value'));
        return name.getBoundingClientRect().bottom - value.getBoundingClientRect().bottom;
      });
      assert.ok(spill <= 0.5, `a wrapped name runs ${spill}px past its value`);
    } finally {
      await page.close();
    }
  });

  test('a layout preview starts as a phone on a phone and as a desktop on a desktop', async () => {
    for (const [width, start] of /** @type {const} */ ([
      [390, 'phone'],
      [1440, 'desktop']
    ])) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      try {
        await visit(page, new URL('detail-pane/', url).href);
        // The control is radios, or a select where they do not fit.
        const chosen = () =>
          page.evaluate(() => {
            const preview = document.querySelector('.preview');
            const radio = /** @type {HTMLInputElement | null | undefined} */ (
              preview?.querySelector('input[type="radio"]:checked')
            );
            const menu = /** @type {HTMLSelectElement | null | undefined} */ (
              preview?.querySelector('select')
            );
            return radio?.value ?? menu?.value;
          });
        // It starts as a desktop until the page has mounted, which the audit hook marks: the
        // root mounts last, after the preview has picked its width.
        await page.waitForFunction(() => '__suiAudit' in window, null, brief);
        assert.equal(await chosen(), start, `at ${width}px`);
      } finally {
        await page.close();
      }
    }
  });

  test("an overview card opens its component's own page, which the index marks, and L-59 a wrong address leads back", async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    try {
      await visit(page, url);
      await page.getByRole('link', { name: 'Data Table', exact: true }).first().click();
      await page.waitForURL(/\/data-table\/$/);
      const shown = await page.evaluate(() => ({
        title: document.querySelector('h1')?.textContent?.trim(),
        sections: document.querySelectorAll('main section.section').length,
        current: document
          .querySelector('.sui-side-nav-row[aria-current="page"]')
          ?.textContent?.trim()
      }));
      assert.deepEqual(shown, { title: 'Data Table', sections: 1, current: 'Data Table' });

      // The router takes the link, as it takes any in-app link, so its load fails as a missing page.
      await page.evaluate(() => {
        const link = Object.assign(document.createElement('a'), { href: '../no-such-component/' });
        document.body.append(link);
        link.click();
      });
      await page.getByRole('heading', { level: 1, name: 'Page Not Found' }).waitFor(brief);
      const overview = page.getByRole('link', { name: 'Open the Overview' });
      assert.equal(new URL((await overview.getAttribute('href')) ?? '', page.url()).href, url);
    } finally {
      await page.close();
    }
  });

  // Each test sets its own width and leaves the page as it found it, or comes after every test
  // its change would upset.
  suite('one sink page at each width', { concurrency: 1 }, () => {
    const sink = shared(() => open(1440));

    // The specimen is fixed to the window, so containment on its section, as content-visibility
    // brings, would hold it at the section and show it under the section above.
    test(
      'the skip link specimen waits above the window, wherever the page stands',
      long,
      async () => {
        const page = await sink();
        for (const width of [375, 1440]) {
          await resize(page, width);
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
          await link.blur();
        }
      }
    );

    test("the sink's index marks the section the reader has scrolled to", long, async () => {
      const page = await sink();
      await resize(page, 1440);
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
              ?.textContent?.trim() === 'Data Table',
          null,
          brief
        )
      );
      assert.equal(await marked(), 'Data Table');
    });

    test('under forced colors the current tab is marked in Highlight', long, async () => {
      const page = await sink();
      await resize(page, 1440);
      await page.emulateMedia({ forcedColors: 'active' });
      try {
        const marks = await page.evaluate(() => {
          const tabs = [...document.querySelectorAll('#tabs .sui-tabs')][0];
          const bar = (/** @type {Element} */ tab) =>
            getComputedStyle(tab, '::after').backgroundColor;
          return {
            current: bar(/** @type {Element} */ (tabs.querySelector('[aria-current="page"]'))),
            others: [...tabs.querySelectorAll('.sui-tabs-tab:not([aria-current])')].map(bar)
          };
        });
        const marked = await highlight(page);
        assert.equal(marks.current, marked);
        assert.ok(
          marks.others.every((color) => color !== marked),
          'every tab wears the mark'
        );
      } finally {
        await page.emulateMedia({ forcedColors: null });
      }
    });

    test(
      "a card's footer stands beside its copy at the foot while it fits, and under it otherwise",
      long,
      async () => {
        const page = await sink();
        for (const width of [1440, 375]) {
          await resize(page, width);
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
        }
        // A 26rem card cannot hold its button beside 16rem of copy, even on a wide page.
        await resize(page, 1440);
        const [copy, button] = await page
          .locator('#card .bare:not(.flush) .sui-card')
          .evaluate((box) =>
            [':scope > .sui-card-main', ':scope > .sui-card-footer'].map((selector) =>
              /** @type {Element} */ (box.querySelector(selector)).getBoundingClientRect().toJSON()
            )
          );
        assert.ok(button.top >= copy.bottom, "the bare page's button stands beside its copy");
      }
    );

    test(
      "a card head's select stays drawn at the quiet tier on a phone, and a press beside it opens it",
      long,
      async () => {
        const page = await sink();
        await resize(page, 390);
        const select = page.locator('#card .sui-card-actions select').first();
        await select.scrollIntoViewIfNeeded();
        const { frame, card } = await select.evaluate((element) => {
          const opened = /** @type {Window & { opened?: number }} */ (window);
          opened.opened = 0;
          // A native picker cannot be read from the page, so the press is counted instead.
          /** @type {HTMLSelectElement} */ (element).showPicker = () =>
            void (opened.opened = (opened.opened ?? 0) + 1);
          return {
            frame: element.getBoundingClientRect().toJSON(),
            card: /** @type {Element} */ (element.closest('.sui-card')).getBoundingClientRect()
          };
        });
        assert.equal(Math.round(frame.height), 28, 'the select is not drawn at the quiet 28px');
        assert.ok(
          frame.top - card.top >= 4,
          `it stands ${frame.top - card.top}px under the keyline`
        );
        await page.mouse.click(frame.left + frame.width / 2, frame.top - 4);
        assert.deepEqual(
          await page.evaluate(() => [
            document.activeElement?.tagName,
            /** @type {Window & { opened?: number }} */ (window).opened
          ]),
          ['SELECT', 1],
          'a press 4px over the frame does not open the select'
        );
        await page.keyboard.press('Escape');

        const bare = await browser.newPage({ viewport: { width: 390, height: 900 } });
        await bare.addInitScript(() => {
          delete (/** @type {any} */ (HTMLSelectElement.prototype).showPicker);
        });
        await visit(bare, new URL('card/', url).href);
        const { height, into } = await bare
          .locator('.sui-card-actions select')
          .first()
          .evaluate((element) => {
            // No sink card holds a select alone, so one stands in for the Members card's button.
            const box = /** @type {Element} */ (element.closest('.sui-select')).cloneNode(true);
            const actions = [...document.querySelectorAll('.sui-card-actions')].find((part) =>
              part.closest('.sui-card')?.textContent?.includes('Members')
            );
            actions?.replaceChildren(box);
            const note = actions?.closest('.sui-card-head')?.querySelector('.sui-card-note');
            const drawn = /** @type {Element} */ (actions?.querySelector('select'));
            const overlaps =
              note && note.getBoundingClientRect().right > drawn.getBoundingClientRect().left;
            return {
              height: element.getBoundingClientRect().height,
              into: overlaps
                ? drawn.getBoundingClientRect().bottom - note.getBoundingClientRect().top
                : 0
            };
          });
        // At 700px the Usage track fits, so its hidden 44px select must lend the head no height.
        await bare.setViewportSize({ width: 700, height: 900 });
        // A scroll timeline takes the new room on the next frame, and the form follows it.
        await bare.evaluate(
          () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
        );
        const { off, short } = await bare.evaluate(() => {
          const head = [...document.querySelectorAll('#card .sui-card-head')].find((part) =>
            part.querySelector('.sui-card-actions .sui-segmented-track:not(.sui-segmented-ruler)')
          );
          const track = /** @type {Element} */ (
            head?.querySelector('.sui-segmented-track:not(.sui-segmented-ruler)')
          );
          const title = /** @type {Element} */ (head?.querySelector('.sui-card-title'));
          const note = /** @type {Element} */ (head?.querySelector('.sui-card-note'));
          const middle = (/** @type {DOMRect} */ box) => box.top + box.height / 2;
          return {
            off: track.checkVisibility({ visibilityProperty: true })
              ? middle(track.getBoundingClientRect()) - middle(title.getBoundingClientRect())
              : NaN,
            // The hidden select draws nothing beside the note, so the note runs to the actions'
            // end or its measure, whichever comes first.
            short:
              Math.min(
                parseFloat(getComputedStyle(note).maxInlineSize),
                /** @type {Element} */ (
                  head?.querySelector('.sui-card-actions')
                ).getBoundingClientRect().right - note.getBoundingClientRect().left
              ) - note.getBoundingClientRect().width
          };
        });
        // A fine pointer on a wide screen needs no 44px, so the select keeps the head's seat.
        await bare.setViewportSize({ width: 1100, height: 900 });
        const wide = await bare.evaluate(() => {
          const actions = [...document.querySelectorAll('.sui-card-actions')].find((part) =>
            part.closest('.sui-card')?.textContent?.includes('Members')
          );
          return actions?.querySelector('select')?.getBoundingClientRect().height;
        });
        await bare.close();
        assert.equal(wide, 28, "without showPicker a fine pointer's select leaves its 28px seat");
        assert.ok(Math.abs(off) <= 0.5, `the fitting track stands ${off}px off its title's middle`);
        assert.ok(
          short <= 0.5,
          `beside a fitting track the note stops ${short}px short of its head`
        );
        assert.equal(Math.round(height), 44, 'without showPicker the select is not 44px');
        assert.ok(into <= 0.5, `the 44px select reaches ${into}px into its note`);
      }
    );

    // 700px is a fine pointer under the phone breakpoint, where controls step to 44px and the
    // track still fits beside the title: a width the law audit does not run at.
    test(
      "a card's track stays drawn at 28px with 44px targets, its note under it, and a title with no action takes the head",
      long,
      async () => {
        const page = await sink();
        await resize(page, 700);
        const { tracks, problems } = await page.evaluate(() => {
          const shown = (/** @type {Element} */ element) =>
            element.checkVisibility({ visibilityProperty: true });
          const found = [];
          let tracks = 0;
          for (const head of document.querySelectorAll('#card .sui-card-head')) {
            const title = /** @type {Element} */ (head.querySelector('.sui-card-title'));
            const note = head.querySelector('.sui-card-note');
            const track = head.querySelector(
              '.sui-card-actions .sui-segmented-track:not(.sui-segmented-ruler)'
            );
            const name = title.textContent;
            if (!head.querySelector('.sui-card-actions')) {
              const room = head.getBoundingClientRect().width - title.getBoundingClientRect().width;
              if (room > 0.5) found.push(`${name} leaves ${room}px`);
            } else if (note && track && shown(track)) {
              tracks += 1;
              // A point outside the window hits nothing.
              track.scrollIntoView({ block: 'center' });
              const box = track.getBoundingClientRect();
              if (Math.round(box.height) !== 28) found.push(`${name}: a ${box.height}px track`);
              if (note.getBoundingClientRect().right <= box.left)
                found.push(`${name}: its note stands beside the track`);
              if (box.bottom - note.getBoundingClientRect().top > 0.5)
                found.push(`${name}: the track reaches into its note`);
              const option = /** @type {Element} */ (track.querySelector('.sui-segmented-option'));
              const middle = option.getBoundingClientRect();
              const hit = document.elementFromPoint(middle.left + middle.width / 2, box.top - 4);
              if (!hit || !option.contains(hit))
                found.push(`${name}: 4px over the track is no target`);
            }
          }
          return { tracks, problems: found };
        });
        assert.ok(tracks > 0, 'no card head draws a segmented track at 700px');
        assert.deepEqual(problems, []);
      }
    );

    // A card's head action is the law audit's to check (L-34), at every width it runs.
    test(
      'an action beside a head or a message never moves the copy, and a head keeps it beside',
      long,
      async () => {
        const page = await sink();
        for (const width of [1440, 320]) {
          await resize(page, width);
          const problems = await page.evaluate(async () => {
            const frame = () =>
              new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            // A head never puts its action on a line of its own; a callout may, under 24rem.
            /** @type {[string, string, string[], boolean][]} */
            const kinds = [
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
            /** @param {Element} root @param {string[]} parts */
            const lines = (root, parts) =>
              parts.slice(0, 2).map((part) => {
                const words = document.createRange();
                const element = root.querySelector(part);
                if (!element) return 0;
                words.selectNodeContents(element);
                return new Set([...words.getClientRects()].map((line) => Math.round(line.top)))
                  .size;
              });
            /** @param {Element} root @param {string[]} parts */
            const read = (root, parts) => {
              const origin = root.getBoundingClientRect().top;
              return parts
                .map((part) => root.querySelector(part)?.getBoundingClientRect().top ?? origin)
                .map((at) => at - origin)
                .concat(root.getBoundingClientRect().height);
            };
            /** @type {string[]} */
            const found = [];
            const ink = /** @type {CanvasRenderingContext2D} */ (
              document.createElement('canvas').getContext('2d')
            );
            /** @param {Element} element @param {string} text */
            const wide = (element, text) => {
              const style = getComputedStyle(element);
              ink.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
              return ink.measureText(text).width;
            };
            /** @param {Element} element */
            const longest = (element) =>
              Math.max(
                ...(element.textContent?.trim().split(/\s+/) ?? []).map((word) =>
                  wide(element, word)
                )
              );
            // A plate's state stands under its title when its longest word cannot stand beside
            // the title's share: 60% of the head, or the title's longest word, or its one line.
            /** @param {Element} root */
            const crowded = (root) => {
              const head = /** @type {HTMLElement} */ (root.querySelector('.sui-plate-head'));
              const title = /** @type {Element} */ (head.querySelector('.sui-plate-title'));
              const words = /** @type {Element} */ (head.querySelector('.sui-plate-words'));
              const glyph = head.querySelector('.sui-plate-said > svg');
              const style = getComputedStyle(head);
              const gap = parseFloat(style.columnGap);
              const room =
                head.clientWidth -
                parseFloat(style.paddingInlineStart) -
                parseFloat(style.paddingInlineEnd);
              const share = Math.max(
                longest(title),
                Math.min(wide(title, title.textContent?.trim() ?? ''), room * 0.6 - gap / 2)
              );
              const lead = glyph
                ? glyph.getBoundingClientRect().width +
                  parseFloat(
                    getComputedStyle(/** @type {Element} */ (glyph.parentElement)).columnGap
                  )
                : 0;
              return share + gap + lead + longest(words) > room - 0.5;
            };
            const seats = [];
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
                  if (beside && !(kind === '.sui-plate' && crowded(root)))
                    found.push(`${where}: the action takes a line of its own`);
                  continue;
                }
                // A plate's state that needs more lines than its title wraps under it, as copy.
                if (kind === '.sui-plate') {
                  const [named, said] = lines(root, ['.sui-plate-title', '.sui-plate-words']);
                  if (said > named) continue;
                }
                seats.push({
                  root,
                  parts,
                  where,
                  action,
                  holder: action.parentElement,
                  next: action.nextSibling,
                  withLines: lines(root, parts),
                  withAction: read(root, parts)
                });
              }
            // Every action leaves at once, so the page lays out twice, not twice per action.
            for (const { action } of seats) action.remove();
            await frame();
            for (const { root, parts, where, withLines, withAction } of seats) {
              // Lending its width may wrap the copy one more line; only a move of the same lines
              // counts.
              if (withLines.join() !== lines(root, parts).join()) continue;
              const bare = read(root, parts);
              const moved = withAction.findIndex((at, index) => Math.abs(at - bare[index]) > 0.5);
              if (moved >= 0)
                found.push(
                  `${where}: ${parts[moved] ?? 'its height'} moves ${withAction[moved] - bare[moved]}px`
                );
            }
            // Backwards, so an action whose next sibling also left goes back before it.
            for (const { holder, action, next } of seats.reverse())
              holder?.insertBefore(action, next);
            await frame();
            return found;
          });
          assert.deepEqual(problems, [], `at ${width}px`);
        }
      }
    );

    test(
      "a plate's state keeps one line while it fits in 40% of the head, its title in 60% unless the state's longest word needs it, and neither breaks a word",
      long,
      async () => {
        const page = await sink();
        for (const width of [1440, 390, 320]) {
          await resize(page, width);
          const problems = await page.evaluate(() => {
            const ink = /** @type {CanvasRenderingContext2D} */ (
              document.createElement('canvas').getContext('2d')
            );
            /** @param {Element | null} element */
            const lines = (element) => {
              if (!element) return 0;
              const words = document.createRange();
              words.selectNodeContents(element);
              return new Set([...words.getClientRects()].map((line) => Math.round(line.top))).size;
            };
            /** @param {Element} element @param {string} [text] */
            const wide = (element, text = element.textContent?.trim() ?? '') => {
              const style = getComputedStyle(element);
              ink.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
              return ink.measureText(text).width;
            };
            /** @param {Element} element */
            const broken = (element) => {
              const text = /** @type {Text} */ (
                document.createTreeWalker(element, NodeFilter.SHOW_TEXT).nextNode()
              );
              return [...text.data.matchAll(/\S+/g)].filter((word) => {
                const span = document.createRange();
                span.setStart(text, word.index);
                span.setEnd(text, word.index + word[0].length);
                return (
                  new Set([...span.getClientRects()].map((line) => Math.round(line.top))).size > 1
                );
              });
            };
            return [...document.querySelectorAll('.sui-plate-status')].flatMap((status) => {
              const head = /** @type {HTMLElement} */ (status.parentElement);
              const title = /** @type {HTMLElement} */ (head.querySelector('.sui-plate-title'));
              const words = status.querySelector('.sui-plate-words') ?? status;
              if (status.getBoundingClientRect().top >= title.getBoundingClientRect().bottom)
                return [];
              const style = getComputedStyle(head);
              const room =
                head.clientWidth -
                parseFloat(style.paddingInlineStart) -
                parseFloat(style.paddingInlineEnd);
              /** @param {number} part */
              const share = (part) => room * part - parseFloat(style.columnGap) / 2;
              const glyph = status.querySelector('svg');
              const said = /** @type {Element} */ (words.parentElement);
              const lead = glyph
                ? glyph.getBoundingClientRect().width + parseFloat(getComputedStyle(said).columnGap)
                : 0;
              const longest = Math.max(
                ...(words.textContent?.trim().split(/\s+/) ?? []).map((word) => wide(words, word))
              );
              /** @type {[Element, number, number][]} */
              const parts = [
                [
                  title,
                  0,
                  Math.min(share(0.6), room - parseFloat(style.columnGap) - lead - longest)
                ],
                [words, lead, share(0.4)]
              ];
              return parts.flatMap(([part, before, most]) => {
                const need = wide(part) + before;
                return [
                  ...(lines(part) > 1 && need < most - 0.5
                    ? [`${part.textContent?.trim()}: ${lines(part)} lines, ${need}px of ${most}px`]
                    : []),
                  ...broken(part).map((word) => `${part.textContent?.trim()}: breaks ${word[0]}`)
                ];
              });
            });
          });
          assert.deepEqual(problems, [], `at ${width}px`);
        }
      }
    );

    test(
      "a plate's empty state keeps its status region, out of the head, for the first words",
      long,
      async () => {
        const page = await openMount(browser, url);
        try {
          const seen = await page.evaluate(() => {
            const { lib, mount, flushSync, state, get, set } = /** @type {any} */ (window);
            const said = state('');
            const target = document.createElement('div');
            // Under 12rem a state stands under the title, so an empty one in the flow would too.
            target.style.inlineSize = '11rem';
            document.body.append(target);
            mount(lib.Plate, {
              target,
              props: {
                title: 'Sync Status',
                level: 3,
                get state() {
                  return get(said);
                }
              }
            });
            flushSync();
            const head = /** @type {Element} */ (target.querySelector('.sui-plate-head'));
            const region = head.querySelector('[role="status"]');
            const tall = (/** @type {Element} */ part) => part.getBoundingClientRect().height;
            const grows = tall(head) - tall(/** @type {Element} */ (head.firstElementChild));
            set(said, 'Up to date');
            flushSync();
            return {
              region: Boolean(region),
              grows,
              kept: head.querySelector('[role="status"]') === region,
              words: region?.textContent?.trim()
            };
          });
          assert.ok(seen.region, 'an empty state drops its status region');
          assert.ok(seen.grows <= 0.5, `an empty state grows the head by ${seen.grows}px`);
          assert.ok(seen.kept, 'the first words arrive in a new region rather than the one kept');
          assert.equal(seen.words, 'Up to date');
        } finally {
          await page.close();
        }
      }
    );

    test("a plate's new state fades in for the duration its own subtree sets", long, async () => {
      const page = await openMount(browser, url);
      try {
        const seen = await page.evaluate(async () => {
          const { lib, mount, flushSync, state, get, set } = /** @type {any} */ (window);
          const said = state('Behind');
          const target = document.createElement('div');
          target.style.setProperty('--sui-duration-fast', '480ms');
          document.body.append(target);
          mount(lib.Plate, {
            target,
            props: {
              title: 'Sync Status',
              level: 3,
              get state() {
                return get(said);
              }
            }
          });
          flushSync();
          set(said, 'Up to date');
          flushSync();
          // Svelte holds the fade behind an empty animation for one frame before it plays.
          await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
          const arrived = /** @type {Element} */ (target.querySelector('.sui-plate-said'));
          return arrived.getAnimations()[0]?.effect?.getTiming().duration;
        });
        assert.equal(seen, 480);
      } finally {
        await page.close();
      }
    });

    test(
      "a plate's new state fades in on a change, and not under reduced motion",
      long,
      async () => {
        const page = await sink();
        const sync = page.locator('.sui-plate').getByRole('button', { name: 'Sync Now' }).first();
        const undo = page
          .locator('.sui-plate')
          .getByRole('button', { name: 'Undo the Sync' })
          .first();
        for (const reducedMotion of /** @type {const} */ (['no-preference', 'reduce'])) {
          await page.emulateMedia({ reducedMotion });
          await page.evaluate(() => {
            const status = document.querySelectorAll('.sui-plate-status');
            const fades = () =>
              document
                .getAnimations()
                .filter((run) =>
                  [...status].some((part) =>
                    part.contains(/** @type {KeyframeEffect} */ (run.effect).target)
                  )
                )
                .map((run) => Number(run.effect?.getTiming().duration));
            // @ts-expect-error a probe for this test only
            window.plateFades = { seen: [] };
            // Twenty frames outlast the 160ms fade; counted by frame, so a still pass stops too.
            let frames = 0;
            const watch = () => {
              // @ts-expect-error a probe for this test only
              window.plateFades.seen.push(...fades());
              if (++frames < 20) requestAnimationFrame(watch);
            };
            requestAnimationFrame(watch);
          });
          await sync.click();
          await page.waitForTimeout(400);
          // @ts-expect-error a probe for this test only
          const { seen } = await page.evaluate(() => window.plateFades);
          await undo.click();
          // The undo's own fade ends before the next pass watches.
          await page.waitForTimeout(300);
          const longest = Math.max(0, ...seen);
          if (reducedMotion === 'reduce')
            assert.equal(longest, 0, 'reduced motion keeps a change still');
          else assert.equal(longest, 160, 'a change fades in over --sui-duration-fast');
        }
        await page.emulateMedia({ reducedMotion: 'no-preference' });
      }
    );

    test(
      'a live callout an edit brings settles in from above, and not under reduced motion',
      long,
      async () => {
        const page = await sink();
        const shorten = page.getByRole('button', { name: 'Shorten to 2 Days' });
        for (const reducedMotion of /** @type {const} */ (['no-preference', 'reduce'])) {
          await page.emulateMedia({ reducedMotion });
          await shorten.click();
          const runs = await page.locator('.sui-callout:has(+ [role="alert"])').evaluate((node) =>
            node
              .getAnimations()
              .map(
                (run) =>
                  `${/** @type {CSSTransition} */ (run).transitionProperty} ${run.effect?.getTiming().duration}`
              )
              .sort()
          );
          await page.getByRole('button', { name: 'Keep the Token' }).click();
          assert.deepEqual(
            runs,
            reducedMotion === 'reduce' ? [] : ['opacity 160', 'translate 160'],
            reducedMotion
          );
        }
        await page.emulateMedia({ reducedMotion: 'no-preference' });
      }
    );

    test(
      'every sideways scroller fades only the edges with more past them, 20px on a phone and code lines 24px, mirrored right to left (L-107)',
      long,
      async () => {
        const page = await sink();
        await resize(page, 375);
        const check = () =>
          page.evaluate(async () => {
            const frame = () => new Promise(requestAnimationFrame);
            const fades = (/** @type {Element} */ box) => {
              const look = getComputedStyle(box);
              return ['--sui-scroll-edge-start', '--sui-scroll-edge-end'].map((name) =>
                parseFloat(look.getPropertyValue(name))
              );
            };
            // The empty room a box keeps after its content (L-107), which no end fade covers.
            const trail = (/** @type {Element} */ box) => {
              const probe = document.createElement('div');
              probe.style.cssText =
                'position: absolute; inline-size: var(--sui-local-edge-trail, 0px)';
              box.append(probe);
              const width = probe.getBoundingClientRect().width;
              probe.remove();
              return width;
            };
            // A component's own scroller: it, or one of the two boxes it sits in, wears a
            // `sui-` class, as a chart's plot sits in its band inside the chart. Its content,
            // not only its trailing room, runs past its edge.
            const boxes = [...document.querySelectorAll('[class]')].filter((box) => {
              const owned = [box, box.parentElement, box.parentElement?.parentElement].some(
                (node) => [...(node?.classList ?? [])].some((name) => name.startsWith('sui-'))
              );
              return (
                owned &&
                /auto|scroll/.test(getComputedStyle(box).overflowX) &&
                box.scrollWidth - box.clientWidth - trail(box) >= 4
              );
            });
            const rooms = boxes.map(trail);
            /** @type {number[][][]} */
            const states = boxes.map(() => []);
            // Each scroller's fade follows only its own scroll, so all of them move at once.
            // The middle is halfway along the content, short of the trailing room.
            for (const share of [0, 0.5, 1]) {
              for (const [at, box] of boxes.entries()) {
                const sign = getComputedStyle(box).direction === 'rtl' ? -1 : 1;
                const range = box.scrollWidth - box.clientWidth;
                box.scrollLeft = sign * (share === 1 ? range : share * (range - rooms[at]));
              }
              await frame();
              await frame();
              boxes.forEach((box, at) => states[at].push(fades(box)));
            }
            const wrong = [];
            for (const [at, box] of boxes.entries()) {
              box.scrollLeft = 0;
              const look = getComputedStyle(box);
              const name = `${box.closest('section')?.id} ${box.className}`;
              const shown = states[at].map((widths) => widths.map((width) => width > 0));
              if (
                JSON.stringify(shown) !==
                JSON.stringify([
                  [false, true],
                  [true, true],
                  [true, false]
                ])
              )
                wrong.push(`${name}: ${JSON.stringify(shown)}`);
              const wide = box.classList.contains('sui-scroll-edge-lines') ? 24 : 20;
              if (states[at][1].some((width) => width !== wide))
                wrong.push(`${name}: the fades are ${states[at][1].join(' and ')}px wide`);
              if (look.direction === 'rtl' && !look.maskImage.includes('to left'))
                wrong.push(`${name}: the fade does not mirror`);
            }
            return { checked: boxes.length, wrong };
          });
        try {
          for (const rtl of [false, true]) {
            await page.evaluate((rtl) => (document.documentElement.dir = rtl ? 'rtl' : ''), rtl);
            const found = await check();
            assert.ok(found.checked > 5, `only ${found.checked} sideways scrollers were found`);
            assert.deepEqual(found.wrong, [], rtl ? 'right to left' : 'left to right');
          }
        } finally {
          await page.evaluate(() => document.documentElement.removeAttribute('dir'));
        }
      }
    );

    test(
      'a linked card is one tab stop named by its title, rings the card and spares its controls',
      long,
      async () => {
        const page = await sink();
        await resize(page, 1440);
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
        assert.equal(ring, 'solid 1px true', 'the focused link does not ring its card');

        const members = peers.locator('.sui-card').nth(2);
        const underlined = () =>
          members
            .locator('.sui-card-words > span')
            .first()
            .evaluate((words) => getComputedStyle(words).textDecorationLine);
        const box = /** @type {{ x: number, y: number, width: number, height: number }} */ (
          await members.boundingBox()
        );
        const first = peers.locator('.sui-card').first();
        const edge = () => first.evaluate((card) => getComputedStyle(card).borderTopColor);
        const rest = await edge();
        const corner = /** @type {{ x: number, y: number, width: number, height: number }} */ (
          await first.boundingBox()
        );
        await page.mouse.move(corner.x + 24, corner.y + corner.height - 12);
        // Under load, hover can land a frame after the move.
        assert.ok(
          await settles(
            page.waitForFunction(
              ([card, resting]) => getComputedStyle(card).borderTopColor !== resting,
              /** @type {const} */ ([await first.elementHandle(), rest]),
              { timeout: 2000 }
            )
          ),
          'a hovered card keeps its resting keyline'
        );
        await page.mouse.move(box.x + 24, box.y + box.height - 12);
        assert.equal(
          await underlined(),
          'underline',
          'a hovered card does not underline its title'
        );
        assert.equal(
          await members.evaluate((card) => {
            const look = getComputedStyle(card);
            return look.outlineColor === look.borderTopColor;
          }),
          true,
          'a hovered card drops the focus ring its keyboard focus drew'
        );
        await members.getByRole('button', { name: 'Invite' }).hover();
        assert.equal(await underlined(), 'none', 'a hovered control underlines the card title');
        await page.mouse.move(0, 0);

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
      }
    );

    test('the page index follows sections that scroll inside a pane', long, async () => {
      const page = await sink();
      await resize(page, 1440);
      const pane = await page.addStyleTag({
        content: '#page-toc .sections { block-size: 15rem; overflow-y: auto; }'
      });
      try {
        // The pane stands well below the viewport's top quarter, so only its own reading line
        // can make "Required Checks" current.
        await page.evaluate(() => {
          const pane = /** @type {HTMLElement} */ (document.querySelector('#page-toc .sections'));
          scrollBy(0, pane.getBoundingClientRect().top - 400);
          const checks = /** @type {HTMLElement} */ (document.getElementById('toc-checks'));
          pane.scrollTop += checks.getBoundingClientRect().top - pane.getBoundingClientRect().top;
        });
        const current = () =>
          page.evaluate(() =>
            document
              .querySelector('#page-toc .sui-page-toc-link[aria-current="location"]')
              ?.textContent?.trim()
          );
        await settles(
          page.waitForFunction(
            () =>
              document
                .querySelector('#page-toc .sui-page-toc-link[aria-current="location"]')
                ?.textContent?.trim() === 'Required Checks',
            null,
            brief
          )
        );
        assert.equal(await current(), 'Required Checks');
      } finally {
        await pane.evaluate((tag) => /** @type {Element} */ (tag).remove());
      }
    });

    // Each width follows its own entry, since a press on the entry the address already names
    // moves nothing, and the focus an earlier press left would pass the check.
    test(
      "an index entry lands focus on its section's heading, from the phone drawer and under reduced motion",
      long,
      async () => {
        const page = await sink();
        try {
          for (const [width, reducedMotion, name] of /** @type {const} */ ([
            [375, 'no-preference', 'Data Table'],
            [1440, 'reduce', 'Tabs']
          ])) {
            await resize(page, width);
            await page.emulateMedia({ reducedMotion });
            await page.evaluate(() => scrollTo(0, 0));
            // The sink's own shell comes first; the app shell section's specimens follow it.
            if (width < 768) await page.locator('.sui-shell-menu').first().click();
            await page.locator('.sui-side-nav-row', { hasText: name }).first().click();
            await settles(
              page.waitForFunction(
                (name) => document.activeElement?.textContent?.trim() === name,
                name,
                brief
              )
            );
            const landed = await page.evaluate(() => ({
              focus: `${document.activeElement?.tagName} ${document.activeElement?.textContent?.trim()}`,
              open: document.querySelector('.sui-shell-side:popover-open') !== null
            }));
            assert.deepEqual(landed, { focus: `H2 ${name}`, open: false }, `at ${width}px`);
          }
        } finally {
          await page.emulateMedia({ reducedMotion: null });
        }
      }
    );

    test(
      "a heading an index entry lands on wears the kit's ring around its words",
      long,
      async () => {
        const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
        try {
          await visit(page, new URL('page-toc/', url).href);
          const entry = page.locator('#page-toc .sui-page-toc-link', { hasText: 'History' });
          await entry.focus();
          await page.keyboard.press('Enter');
          await settles(
            page.waitForFunction(
              () => document.activeElement?.textContent?.trim() === 'History',
              null,
              brief
            )
          );
          const ring = await page.evaluate(() => {
            const heading = /** @type {HTMLElement} */ (document.activeElement);
            const style = getComputedStyle(heading);
            const words = document.createRange();
            words.selectNodeContents(heading);
            const box = heading.getBoundingClientRect();
            return {
              outline: `${style.outlineStyle} ${style.outlineWidth}`,
              spare: box.width - words.getBoundingClientRect().width,
              // The box is trimmed to the baseline, so the ring clears a descender only by its
              // offset, which must reach past the font's descent there.
              clear:
                box.bottom + parseFloat(style.outlineOffset) - words.getBoundingClientRect().bottom
            };
          });
          assert.equal(ring.outline, 'solid 2px', "the browser's own outline traces the heading");
          assert.ok(ring.spare < 1, `the ring runs ${ring.spare}px past the heading's words`);
          assert.ok(ring.clear >= 1, `the ring stands ${ring.clear.toFixed(1)}px off a descender`);
          await page.keyboard.press('Tab');
          assert.equal(
            await page.locator('[data-sui-landed]').count(),
            0,
            'the heading keeps its mark after focus leaves it'
          );
        } finally {
          await page.close();
        }
      }
    );

    test(
      "an index's plates end on its column's end unless it scrolls, and on a phone its words start on the article's edge",
      long,
      async () => {
        const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
        try {
          await visit(page, new URL('page-toc/', url).href);
          const room = () =>
            page.evaluate(() => {
              const nav = /** @type {HTMLElement} */ (document.querySelector('#page-toc nav'));
              const link = /** @type {Element} */ (nav.querySelector('.sui-page-toc-link'));
              return (
                nav.getBoundingClientRect().left +
                nav.clientWidth -
                link.getBoundingClientRect().right
              );
            });
          assert.ok(
            Math.abs(await room()) < 0.5,
            `an index that fits ends ${await room()}px short`
          );
          const short = await page.addStyleTag({
            content: '#page-toc .sui-page-toc { max-block-size: 6rem; }'
          });
          // A scroll-state query answers at the next frame.
          await page.evaluate(
            () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
          );
          assert.ok(
            (await room()) >= 12 - 0.5,
            `a scrolling index keeps ${await room()}px for its bar`
          );
          await short.evaluate((node) => /** @type {Element} */ (node).remove());
          await page.setViewportSize({ width: 390, height: 844 });
          const edges = await page.evaluate(() => {
            const words = document.createRange();
            words.selectNodeContents(
              /** @type {Element} */ (
                document.querySelector('#page-toc .sui-page-toc-label > span')
              )
            );
            const left = (/** @type {string} */ selector) =>
              /** @type {Element} */ (document.querySelector(selector)).getBoundingClientRect()
                .left;
            return {
              words: words.getBoundingClientRect().left - left('#page-toc h4'),
              title: left('#page-toc .sui-page-toc-title') - left('#page-toc h4')
            };
          });
          for (const [part, off] of Object.entries(edges)) {
            assert.ok(
              Math.abs(off) < 0.5,
              `the index's ${part} start ${off}px off the article's edge`
            );
          }
        } finally {
          await page.close();
        }
      }
    );

    // Last, since it leaves the drawer open and the page in the other theme.
    test(
      'the side nav parts its title from rows scrolled under it and the part under its rows by hairlines, cuts its rows cleanly at both, and rests each side of them a gap clear (L-107)',
      long,
      async () => {
        const page = await sink();
        await resize(page, 1440);
        try {
          const found = await page.evaluate(async () => {
            const tree = /** @type {HTMLElement} */ (document.querySelector('.sui-side-nav-tree'));
            const head = /** @type {Element} */ (document.querySelector('.sui-side-nav-head'));
            const next = /** @type {Element} */ (tree.nextElementSibling);
            const list = /** @type {Element} */ (tree.firstElementChild);
            const frame = () => new Promise(requestAnimationFrame);
            const box = () => tree.getBoundingClientRect();
            const rest = async (/** @type {number} */ at) => {
              tree.scrollTop = at;
              await frame();
              await frame();
            };
            const rule = () => getComputedStyle(head, '::after');
            await rest(0);
            const top = list.getBoundingClientRect().top - box().top;
            const resting = rule().opacity;
            await rest(tree.scrollHeight);
            const bottom = box().bottom - list.getBoundingClientRect().bottom;
            return {
              scrolls: tree.scrollHeight - tree.clientHeight,
              top,
              bottom,
              underHead: box().top - head.getBoundingClientRect().bottom,
              overNext: next.getBoundingClientRect().top - box().bottom,
              gap: parseFloat(getComputedStyle(tree).getPropertyValue('--sui-local-tree-gap')) * 16,
              masked: getComputedStyle(tree).maskImage !== 'none',
              resting,
              line: [rule().opacity, rule().backgroundColor, rule().blockSize],
              next: [getComputedStyle(next).borderTopColor, getComputedStyle(next).borderTopWidth],
              underNext:
                /** @type {Element} */ (next.firstElementChild).getBoundingClientRect().top -
                next.getBoundingClientRect().top -
                parseFloat(getComputedStyle(next).borderTopWidth)
            };
          });
          assert.ok(found.scrolls > 100, `the rows scroll only ${found.scrolls}px`);
          assert.equal(found.masked, false, 'the rows fade as they pass the hairlines');
          assert.equal(found.resting, '0', 'the head draws a rule with no row under it');
          assert.deepEqual(
            found.line,
            ['1', found.next[0], found.next[1]],
            "rows under the title meet no hairline, or not the foot's"
          );
          assert.equal(found.gap, 16);
          assert.ok(
            Math.abs(found.underHead) <= 0.5,
            `the rows end ${found.underHead}px under the title`
          );
          assert.ok(
            Math.abs(found.overNext) <= 0.5,
            `the rows end ${found.overNext}px over the part under them`
          );
          assert.ok(
            Math.abs(found.top - found.gap) <= 0.5,
            `the first row rests ${found.top}px down`
          );
          assert.ok(
            Math.abs(found.bottom - found.gap) <= 0.5,
            `the last row rests ${found.bottom}px up`
          );
          assert.ok(
            Math.abs(found.underNext - found.gap) <= 0.5,
            `the part under the rows starts ${found.underNext}px under its hairline`
          );
        } finally {
          await page.evaluate(() => {
            const tree = document.querySelector('.sui-side-nav-tree');
            if (tree) tree.scrollTop = 0;
          });
        }
      }
    );

    test('a phone changes the theme from the drawer, far down the page', long, async () => {
      const page = await sink();
      await resize(page, 375);
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
      // The browser's own chrome follows the chosen theme's canvas (L-118).
      assert.deepEqual(
        await page.evaluate(() =>
          [...document.querySelectorAll('meta[name="theme-color"]')].map(
            (meta) => /** @type {HTMLMetaElement} */ (meta).content
          )
        ),
        wanted === 'dark' ? ['#0c0e11', '#0c0e11'] : ['#f7f7f5', '#f7f7f5']
      );
    });
  });

  // The chart tests read geometry and their own table, which no other test here touches.
  suite('one page of charts at each width', { concurrency: 1 }, () => {
    const charts = shared(() => open(1440));

    test("a line breaks at a missing value, and a table names its series from the start edge, on a data table's metrics", async () => {
      const page = await charts();
      // A chart draws its table only once its disclosure is open.
      await page.evaluate(async () => {
        for (const details of document.querySelectorAll('#charts .sui-chart details'))
          /** @type {HTMLDetailsElement} */ (details).open = true;
        await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
      });
      const { runs, aligns, tables } = await page.evaluate(() => {
        const probe = document.createElement('i');
        probe.style.color = 'var(--sui-border-control)';
        document.body.append(probe);
        const control = getComputedStyle(probe).color;
        probe.remove();
        const partial = /** @type {Element} */ (
          [...document.querySelectorAll('#charts .sui-chart')].find((chart) =>
            chart.textContent?.includes('Daily Readings')
          )
        );
        return {
          runs: partial.querySelector('path.line')?.getAttribute('d')?.match(/M/g)?.length,
          aligns: [
            ...new Set(
              [...document.querySelectorAll('#charts .sui-chart-table tbody th')].map(
                (cell) => getComputedStyle(cell).textAlign
              )
            )
          ],
          // Off by the title's start, the head rule's ink against the control ink.
          tables: [
            ...new Set(
              [...document.querySelectorAll('#charts .sui-chart-table')].map((box) => {
                const title = /** @type {Element} */ (
                  box.closest('.sui-chart')?.querySelector('.sui-chart-title')
                );
                const words = document.createRange();
                words.selectNodeContents(/** @type {Element} */ (box.querySelector('thead th')));
                const head = getComputedStyle(
                  /** @type {Element} */ (box.querySelector('thead th'))
                );
                return `${Math.round(words.getBoundingClientRect().left - title.getBoundingClientRect().left)} ${head.borderBottomColor === control}`;
              })
            )
          ]
        };
      });
      await page.evaluate(() => {
        for (const details of document.querySelectorAll('#charts .sui-chart details'))
          /** @type {HTMLDetailsElement} */ (details).open = false;
      });
      assert.equal(runs, 2, 'the line draws one run on each side of its gap');
      assert.deepEqual(aligns, ['start']);
      assert.deepEqual(tables, ['0 true']);
    });

    test(
      'a chart band reaches the edges of a stage that lends its inset, and stays in a specimen that does not, and a table’s summary follows its own plot, open or closed (L-66)',
      long,
      async () => {
        const page = await charts();
        const kinds = new Set();
        for (const width of [1440, 375]) {
          await resize(page, width);
          const bands = await page.evaluate(() =>
            [...document.querySelectorAll('#charts .plot-band')].map((band) => {
              const chart = /** @type {Element} */ (band.closest('.sui-chart'));
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
                // A stage lends its inset while its specimens stack, and only to a chart that
                // stands straight in the specimen, so a chart in a section keeps the section's
                // edges, and a pair side by side keeps its own.
                lent:
                  parseFloat(getComputedStyle(chart).getPropertyValue('--sui-local-bleed')) > 0 &&
                  chart.parentElement?.matches('.specimen > .body') === true,
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
          for (const band of bands) kinds.add(band.lent);
          for (const band of bands)
            if (band.lent) {
              assert.ok(
                Math.abs(band.start) < 0.5 && Math.abs(band.end) < 0.5,
                JSON.stringify(band)
              );
              assert.ok(Math.abs(band.plotStart) < 0.5, `the plot keeps the title's edge`);
            } else assert.ok(band.inside, `${width}px: a band leaves its specimen`);
          if (width !== 1440) continue;
          // Each legend stands one gap under its own plot and the table's summary one gap under
          // that, and opening a table moves neither its summary nor its neighbour's.
          const summaries = () =>
            page.evaluate(() =>
              [...document.querySelectorAll('#charts [data-layout="pairs"] .sui-chart')].map(
                (chart) => {
                  const band = /** @type {Element} */ (chart.querySelector('.plot-band'));
                  const legend = band.nextElementSibling;
                  const shown = legend && !legend.matches('details') && legend.clientHeight > 1;
                  const above = shown ? legend : band;
                  const summary = /** @type {Element} */ (chart.querySelector('details > summary'));
                  // From the pair's own row, so a lazily drawn row higher on the page that settles
                  // to its height as the page scrolls cannot read as a move.
                  const top =
                    summary.getBoundingClientRect().top -
                    /** @type {Element} */ (
                      chart.closest('[data-layout="pairs"]')
                    ).getBoundingClientRect().top;
                  return {
                    top,
                    legendGap: shown
                      ? legend.getBoundingClientRect().top - band.getBoundingClientRect().bottom
                      : 16,
                    summaryGap: Math.round(
                      summary.getBoundingClientRect().top - above.getBoundingClientRect().bottom
                    )
                  };
                }
              )
            );
          const closed = await summaries();
          assert.ok(closed.length >= 2 && closed.length % 2 === 0);
          for (const chart of closed)
            assert.ok(Math.abs(chart.legendGap - 16) < 0.5, `a legend ${chart.legendGap}px under`);
          assert.equal(
            new Set(closed.map((chart) => chart.summaryGap)).size,
            1,
            `summaries stand ${closed.map((chart) => chart.summaryGap)}px under what they follow`
          );
          await page
            .locator('#charts [data-layout="pairs"] .sui-chart details > summary')
            .first()
            .click();
          const opened = await summaries();
          await page
            .locator('#charts [data-layout="pairs"] .sui-chart details > summary')
            .first()
            .click();
          assert.deepEqual(
            opened.slice(0, 2).map((chart) => chart.top),
            closed.slice(0, 2).map((chart) => chart.top),
            'opening a table moves its summary or its neighbour’s'
          );
        }
        assert.deepEqual(kinds, new Set([true, false]));
      }
    );

    test(
      'a chart plot that scrolls is a named keyboard stop, and its table renders only when opened',
      long,
      async () => {
        const page = await charts();
        const chart = page.locator('#charts .narrow .sui-chart');
        const plot = chart.locator('.plot-scroll');
        for (const [width, scrolls] of /** @type {const} */ ([
          [1440, false],
          [320, true]
        ])) {
          await resize(page, width);
          assert.equal(await plot.getAttribute('tabindex'), scrolls ? '0' : null, `${width}px`);
          if (scrolls) {
            const heading = await chart.locator('.sui-chart-title').getAttribute('id');
            assert.equal(await plot.getAttribute('role'), 'region');
            assert.equal(await plot.getAttribute('aria-labelledby'), heading);
          }
          assert.equal(await chart.locator('table').count(), 0, 'the closed table is in the page');
        }
        // Opening the table does the same at every width, so it opens once, at the end.
        await chart.locator('summary').click();
        assert.equal(await chart.locator('table caption').textContent(), 'Items by Week');
      }
    );

    test(
      'a range chart in a section on a 390px phone fits its band, so its last tick shows',
      long,
      async () => {
        const page = await charts();
        await resize(page, 390);
        const plot = page
          .locator('#charts .sui-chart')
          .filter({ hasText: 'Release Windows' })
          .locator('.plot-scroll');
        const { scroll, client } = await plot.evaluate((box) => ({
          scroll: box.scrollWidth,
          client: box.clientWidth
        }));
        assert.ok(scroll <= client, `the plot runs ${scroll - client}px past its band`);
      }
    );

    // A line with more than 12 values draws no markers, so a value with a gap on each side has
    // no run to stand on.
    test('a range chart with the widest label it allows keeps its axis the right way round in a narrow box', async () => {
      const page = await openMount(browser, url);
      try {
        const rows = await page.evaluate(() => {
          const { lib, mount, flushSync } = /** @type {any} */ (window);
          const target = document.createElement('div');
          target.style.inlineSize = '240px';
          document.body.append(target);
          mount(lib.RangeChart, {
            target,
            props: {
              title: 'Windows',
              description: 'Each team’s window',
              valueLabel: 'Hours',
              data: [
                { label: 'W'.repeat(18), start: 2, end: 8 },
                { label: 'B', start: 1, end: 9 }
              ]
            }
          });
          flushSync();
          const labels = [...target.querySelectorAll('svg.plot text.axis[text-anchor="end"]')];
          const gutter = Math.max(...labels.map((label) => label.getBoundingClientRect().right));
          return [...target.querySelectorAll('svg.plot rect.range')].map((bar) => {
            const box = bar.getBoundingClientRect();
            return { width: Math.round(box.width), clear: box.left > gutter };
          });
        });
        assert.equal(rows.length, 2);
        for (const row of rows) {
          assert.ok(row.width > 40, `a bar is ${row.width}px wide`);
          assert.ok(row.clear, 'a bar starts under the labels');
        }
      } finally {
        await page.close();
      }
    });

    test('a value alone between two gaps keeps its marker on a line too long to mark', async () => {
      const page = await openMount(browser, url);
      try {
        const marks = await page.evaluate(() => {
          const { lib, mount, flushSync } = /** @type {any} */ (window);
          const ys = [3, 4, 5, 6, 7, 8, Number.NaN, 9, Number.NaN, 10, 11, 12, 13, 14, 15];
          const target = document.createElement('div');
          document.body.append(target);
          mount(lib.LineChart, {
            target,
            props: {
              title: 'Readings',
              description: 'One reading stands alone',
              xLabel: 'Day',
              yLabel: 'Items',
              series: [{ id: 'a', label: 'A', points: ys.map((y, index) => ({ x: index + 1, y })) }]
            }
          });
          flushSync();
          return [...target.querySelectorAll('path.marker title')].map((title) =>
            title.textContent?.replace(/\D+/g, ' ').trim()
          );
        });
        assert.deepEqual(marks, ['8 9'], 'the lone value at day 8 draws its marker');
      } finally {
        await page.close();
      }
    });

    test('a chart that opens a section stands the sub-section gap under its copy, at every width', async () => {
      for (const width of [1440, 390]) {
        const page = await openLayout('charts/', width);
        try {
          const [gap, rhythm] = await page.evaluate(() => {
            const chart = /** @type {HTMLElement} */ (
              document.querySelector('.sui-section-body > .sui-chart:first-child')
            );
            const head = /** @type {HTMLElement} */ (
              chart.closest('.sui-section')?.querySelector('.sui-section-head')
            );
            const probe = document.createElement('div');
            probe.style.blockSize = 'var(--sui-rhythm-subsection-gap)';
            chart.after(probe);
            const rhythm = probe.getBoundingClientRect().height;
            probe.remove();
            return [
              chart.getBoundingClientRect().top - head.getBoundingClientRect().bottom,
              rhythm
            ];
          });
          assert.equal(gap, rhythm, `${width}px`);
        } finally {
          await page.close();
        }
      }
    });

    test('a failed or empty chart says so in its plot’s box, where its veil waits', async () => {
      const page = await openLayout('charts/', 1440);
      try {
        const boxes = await page.evaluate(() =>
          [...document.querySelectorAll('.plot-band.standing')].map((band) => {
            const panel = /** @type {Element} */ (band.firstElementChild).getBoundingClientRect();
            const box = band.getBoundingClientRect();
            const look = getComputedStyle(band);
            const pad = parseFloat(look.paddingLeft);
            const probe = document.createElement('div');
            probe.style.blockSize = 'var(--sui-local-plot)';
            band.append(probe);
            const plot = probe.getBoundingClientRect().height;
            probe.remove();
            return `${Math.round(panel.left - box.left - pad)} ${Math.round(box.right - pad - panel.right)} ${Math.round(panel.height - plot)}`;
          })
        );
        assert.equal(boxes.length, 2, 'one failed and one empty chart');
        assert.deepEqual(new Set(boxes), new Set(['0 0 0']));
      } finally {
        await page.close();
      }
    });

    test('a failed or empty chart centres its state in the plot’s box, its title a step under the chart’s, at every width', async () => {
      for (const width of [1440, 390]) {
        const page = await openLayout('charts/', width);
        try {
          const found = await page.evaluate(() =>
            [...document.querySelectorAll('.plot-band.standing')].map((band) => {
              const panel = /** @type {HTMLElement} */ (band.firstElementChild);
              const box = panel.getBoundingClientRect();
              const middle = (box.left + box.right) / 2;
              const off = Math.max(
                ...[...panel.querySelectorAll('p, button, [class*="-mark"]')].map((part) => {
                  const own = part.getBoundingClientRect();
                  return Math.abs((own.left + own.right) / 2 - middle);
                })
              );
              const size = (/** @type {Element | null} */ element) =>
                element ? parseFloat(getComputedStyle(element).fontSize) : NaN;
              const chart = band.closest('.sui-chart');
              return [
                off <= 1,
                size(panel.querySelector('[class*="-state-title"]')) <
                  size(chart?.querySelector('.sui-chart-title') ?? null)
              ];
            })
          );
          assert.deepEqual(
            found,
            [
              [true, true],
              [true, true]
            ],
            `at ${width}px, each part centred and the title under the chart's`
          );
        } finally {
          await page.close();
        }
      }
    });

    test('a chart’s gridlines each fill one whole row or column of pixels, at every width', async () => {
      // Only the line's thickness counts: an end that straddles a pixel does not blur the line.
      for (const width of [1440, 320]) {
        const page = await openLayout('charts/', width);
        try {
          const split = await page.evaluate(() =>
            [...document.querySelectorAll('.sui-chart rect.grid')].flatMap((line) => {
              const box = line.getBoundingClientRect();
              const across = box.width > box.height ? [box.top, box.bottom] : [box.left, box.right];
              return across.some((edge) => edge % 1 !== 0)
                ? [`${box.left},${box.top} ${box.width}x${box.height}`]
                : [];
            })
          );
          assert.deepEqual(split, [], `at ${width}px, no gridline straddles two pixels`);
        } finally {
          await page.close();
        }
      }
    });

    test('a waiting chart veils its plot’s box, round at its corners, and leaves the band’s room round it on the band’s ground', async () => {
      const page = await openLayout('charts/', 1440);
      try {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        const band = page.locator('.plot-band:has(> .sui-chart-wait)').first();
        const shot = await band.screenshot({ scale: 'css' });
        const pad = await band.evaluate((band) => parseFloat(getComputedStyle(band).paddingTop));
        const [room, plot, corner] = await page.evaluate(
          async ({ url, pad }) => {
            const image = new Image();
            image.src = url;
            await image.decode();
            const canvas = new OffscreenCanvas(image.width, image.height);
            const context = /** @type {OffscreenCanvasRenderingContext2D} */ (
              canvas.getContext('2d')
            );
            context.drawImage(image, 0, 0);
            const at = (/** @type {number} */ x, /** @type {number} */ y) =>
              [...context.getImageData(Math.round(x), Math.round(y), 1, 1).data].join();
            // The band's room above the plot, the plot between its top and its first grid line,
            // and the plot's own corner pixel.
            return [
              at(image.width / 2, pad / 2),
              at(image.width / 2, pad + (image.height - 2 * pad) / 8),
              at(pad, pad)
            ];
          },
          { url: `data:image/png;base64,${shot.toString('base64')}`, pad }
        );
        assert.ok(pad > 0, 'the band has no room round its plot');
        assert.notEqual(room, plot, 'the veil fills the band’s room round the plot');
        assert.equal(corner, room, 'the veil’s corner is square');
      } finally {
        await page.close();
      }
    });

    test('a loading, refreshing, stale or partial chart’s note leads with its mark in its hue, a loading one’s clock in the note’s muted ink, at the words’ height, and the data control leads with a chevron that turns down open', async () => {
      const page = await charts();
      const read = await page.evaluate(() => {
        const note = (/** @type {string} */ status) =>
          /** @type {HTMLElement} */ (
            document.querySelector(`#charts .sui-chart-note[data-status="${status}"]`)
          );
        const ink = (/** @type {Element} */ host, /** @type {string} */ token) => {
          const probe = document.createElement('span');
          probe.style.color = `var(${token})`;
          host.append(probe);
          const color = getComputedStyle(probe).color;
          probe.remove();
          return color;
        };
        const marked = (/** @type {HTMLElement} */ host, /** @type {string} */ token) => {
          const mark = host.querySelector(':scope > svg');
          return mark ? getComputedStyle(mark).color === ink(host, token) : false;
        };
        const details = /** @type {HTMLDetailsElement} */ (
          document.querySelector('#charts .sui-chart details')
        );
        const chevron = details.querySelector('summary > .chevron svg');
        const turn = () =>
          chevron ? getComputedStyle(/** @type {Element} */ (chevron.parentElement)).rotate : '';
        chevron?.parentElement?.style.setProperty('transition', 'none');
        const closed = turn();
        details.open = true;
        const opened = turn();
        details.open = false;
        const loading = note('loading');
        return {
          loading: marked(loading, '--sui-text-muted'),
          start: [note('stale'), note('refreshing'), note('partial'), loading].map(
            (host) =>
              /** @type {Element} */ (host.querySelector(':scope > span')).getBoundingClientRect()
                .left - host.getBoundingClientRect().left
          ),
          stale: marked(note('stale'), '--sui-warning'),
          refreshing: marked(note('refreshing'), '--sui-info'),
          partial: marked(note('partial'), '--sui-info'),
          heights: [note('stale'), note('refreshing'), note('partial'), loading].map(
            (host) => host.getBoundingClientRect().height
          ),
          chevron: [Boolean(chevron), closed, opened]
        };
      });
      assert.ok(read.stale, 'the stale note has no mark in the warning hue');
      assert.ok(read.refreshing, 'the refreshing note has no mark in the info hue');
      assert.ok(read.partial, 'the partial note has no mark in the info hue');
      assert.ok(read.loading, 'the loading note has no mark in its muted ink');
      assert.equal(new Set(read.start).size, 1, `the notes' words start apart: ${read.start}`);
      assert.equal(new Set(read.heights).size, 1, `a mark grows its note: ${read.heights}`);
      assert.deepEqual(read.chevron, [true, 'none', '90deg'], 'the data control’s chevron');
    });

    test('a dark heatmap prints every value under its peak in one ink, white, as the step under the peak needs', async () => {
      const page = await charts();
      try {
        await page.evaluate(() => (document.documentElement.dataset.theme = 'dark'));
        const inks = await page.evaluate(() => [
          ...new Set(
            [...document.querySelectorAll('#charts .sui-chart text.value:not(.none, .step-4)')].map(
              (value) => getComputedStyle(value).fill
            )
          )
        ]);
        assert.deepEqual(inks, ['rgb(255, 255, 255)']);
      } finally {
        await page.evaluate(() => delete document.documentElement.dataset.theme);
      }
    });

    test('the chart face table holds what Chrome draws, glyph by glyph and pair by pair, tabular figures too', async () => {
      const { faceInk } = await import('../../src/lib/charts/geometry.ts');
      const page = await charts();
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

        // A tick's tabular figures, each measured through the face loaded with `tnum` on, and
        // each beside every glyph in SVG text with `tabular-nums`, where none of them kerns.
        const figures = [...'0123456789'];
        const tabular = await page.evaluate(
          async ({ face, figures, glyphs, weight }) => {
            const bytes = Uint8Array.from(atob(face), (c) => c.charCodeAt(0));
            const tnum = new FontFace('SUI tabular probe', bytes, {
              featureSettings: '"tnum"',
              weight: '400 700'
            });
            document.fonts.add(await tnum.load());
            const context = /** @type {CanvasRenderingContext2D} */ (
              document.createElement('canvas').getContext('2d')
            );
            context.font = `${weight} 1000px 'SUI tabular probe'`;
            const ns = 'http://www.w3.org/2000/svg';
            const svg = document.createElementNS(ns, 'svg');
            const text = document.createElementNS(ns, 'text');
            text.setAttribute(
              'style',
              `font: ${weight} 1000px 'SUI Plus Jakarta Sans'; font-variant-ligatures: none; font-variant-numeric: tabular-nums; white-space: pre`
            );
            svg.append(text);
            document.body.append(svg);
            const runs = figures.map((figure) => {
              text.textContent = `${figure}${glyphs.join(figure)}${figure}`;
              return text.getComputedTextLength();
            });
            svg.remove();
            return {
              inks: figures.map((figure) => {
                const ink = context.measureText(figure);
                return [
                  ink.width,
                  ink.actualBoundingBoxLeft,
                  ink.actualBoundingBoxRight,
                  ink.actualBoundingBoxAscent,
                  ink.actualBoundingBoxDescent
                ];
              }),
              runs
            };
          },
          {
            face: readFileSync(
              new URL('../../src/lib/assets/fonts/PlusJakartaSansLatinVF.woff2', import.meta.url)
            ).toString('base64'),
            figures,
            glyphs,
            weight: semibold ? 600 : 400
          }
        );
        /** @type {string[]} */
        const off = [];
        figures.forEach((figure, index) => {
          const ink = /** @type {import('../../src/lib/charts/geometry.ts').Ink} */ (
            faceInk(figure, semibold, true)
          );
          const table = [ink.advance, ink.left, ink.right, ink.ascent, ink.descent];
          if (
            table.some((value, at) => Math.abs(value * 1000 - tabular.inks[index][at]) > steps[at])
          )
            off.push(`${figure}: ${tabular.inks[index].join(' ')}`);
          // Nothing kerns, so the run is as long as its glyphs as each is drawn alone, figures
          // tabular, which holds exactly wherever a glyph's own advance is rounded.
          const run = `${figure}${glyphs.join(figure)}${figure}`;
          const own = [...run].reduce(
            (sum, glyph) =>
              sum +
              (figures.includes(glyph)
                ? tabular.inks[figures.indexOf(glyph)][0]
                : (drawnAdvance.get(glyph) ?? 0)),
            0
          );
          if (Math.abs(own - tabular.runs[index]) > 0.005 * run.length)
            off.push(`pairs with tabular ${figure}: ${tabular.runs[index] - own}`);
        });
        assert.deepEqual(off, [], semibold ? 'semibold tabular' : 'regular tabular');
      }
    });
  });

  /** What holds focus: a heading's words, or a link's address. */
  const focused = (/** @type {Page} */ page) =>
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
        assert.equal(await focused(page), 'Deploy Web #4174', 'focus is not on the run title');
        assert.equal(
          await page.evaluate(() => {
            const style = getComputedStyle(/** @type {Element} */ (document.activeElement));
            return `${style.outlineStyle} ${style.outlineWidth}`;
          }),
          'solid 2px',
          "the landed PageHeader title lost the kit's ring"
        );
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

  test(
    "a wide list-detail's run stands its actions on the title's line and its aside beside its steps",
    long,
    async () => {
      const page = await openLayout('layouts/list-detail/4182/', 1440);
      try {
        const stand = await page
          .locator('.sui-list-detail-detail .sui-page-header')
          .evaluate((node) => {
            const box = (/** @type {string} */ selector) =>
              node.querySelector(selector)?.getBoundingClientRect();
            const [layout, title, actions] = [
              box('.sui-page-header-layout'),
              box('.sui-page-header-title'),
              box('.sui-page-header-actions')
            ];
            return layout && title && actions
              ? {
                  lead: title.top - layout.top,
                  off: (actions.top + actions.bottom - title.top - title.bottom) / 2
                }
              : null;
          });
        assert.ok(stand, 'the run header has no title or actions');
        assert.equal(stand.lead, 0, 'the title stands under room kept for the hidden way back');
        assert.ok(Math.abs(stand.off) <= 1, `the actions stand ${stand.off}px off the title`);
        const tops = await page.evaluate(() =>
          ['main', 'aside'].map(
            (part) =>
              document.querySelector(`.sui-detail-layout-${part}`)?.getBoundingClientRect().top
          )
        );
        assert.equal(tops[0], tops[1], "the run's aside stands under its steps");
      } finally {
        await page.close();
      }
    }
  );

  test(
    'a wide list-detail keeps its list in place, marks the run it opens, and Back puts both panes where they stood',
    long,
    async () => {
      // A short window, so the list and the detail each scroll in their own pane.
      const page = await openLayout('layouts/list-detail/4182/', 1440, { height: 420 });
      try {
        const pair = page.locator('.sui-list-detail');
        const list = pair.locator('.sui-list-detail-list');
        const detail = pair.locator('.sui-list-detail-detail');
        const stand = () =>
          pair.evaluate((node) =>
            [...node.querySelectorAll('.sui-list-detail-list, .sui-list-detail-detail')].map(
              (pane) => pane.scrollTop
            )
          );
        // The row stands whole in the scrolled list, so the press scrolls nothing itself.
        await list.evaluate((pane) => (pane.scrollTop = 120));
        await detail.evaluate((pane) => (pane.scrollTop = 40));
        const stood = await stand();
        assert.ok(stood[1] > 0, 'the run detail is too short to scroll');
        await pair.locator('a[href="/layouts/list-detail/4176/"]').click();
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
        assert.equal(await focused(page), 'Deploy Web #4176', 'focus is not on the run title');
        assert.equal(await list.evaluate((pane) => pane.scrollTop), 120, 'the list lost its place');
        assert.deepEqual(
          await pair
            .locator('[aria-current="page"]')
            .evaluateAll((rows) => rows.map((row) => row.getAttribute('href'))),
          ['/layouts/list-detail/4176/'],
          'the opened run is not the one current row'
        );
        const open = pair.locator('.sui-object-row.current');
        const ground = () => open.evaluate((row) => getComputedStyle(row).backgroundColor);
        // The press that opened the run left the pointer on its row.
        await page.mouse.move(0, 0);
        const resting = await ground();
        await open.locator('a').hover();
        assert.ok(
          await settles(
            page.waitForFunction(
              (rest) =>
                getComputedStyle(
                  /** @type {Element} */ (document.querySelector('.sui-object-row.current'))
                ).backgroundColor !== rest,
              resting,
              brief
            )
          ),
          'the open row does not answer the pointer'
        );
        assert.deepEqual(
          (await audit(page)).filter(({ law }) => law === 'L-5').map(({ detail }) => detail),
          [],
          'a word on the hovered open row falls under its contrast'
        );
        // A press takes the pressed ground, over either hover.
        const pressedGround = await open.evaluate((row) => {
          const probe = row.appendChild(document.createElement('span'));
          probe.style.background = 'var(--sui-row-pressed)';
          const ground = getComputedStyle(probe).backgroundColor;
          probe.remove();
          return ground;
        });
        await page.mouse.down();
        assert.ok(
          await settles(
            page.waitForFunction(
              (pressed) =>
                getComputedStyle(
                  /** @type {Element} */ (document.querySelector('.sui-object-row.current'))
                ).backgroundColor === pressed,
              pressedGround,
              brief
            )
          ),
          'the pressed open row keeps its hover ground'
        );
        // Let go off the row, so the press opens nothing.
        await page.mouse.move(0, 0);
        await page.mouse.up();
        await page.mouse.move(0, 0);
        assert.equal(
          await pair.getByRole('link', { name: 'Runs' }).count(),
          0,
          'the way back shows beside the list'
        );

        const returns = async () => {
          await page.waitForURL(/\/layouts\/list-detail\/4182\/$/);
          await page.waitForFunction(
            (top) => document.querySelector('.sui-list-detail-detail')?.scrollTop === top,
            stood[1],
            brief
          );
        };
        await page.goBack();
        await settles(returns());
        assert.deepEqual(await stand(), stood, 'Back left the panes elsewhere');
        // The router takes an injected link as its own, so this leaves the page in place.
        await page.evaluate(() => {
          const away = Object.assign(document.createElement('a'), {
            href: '/layouts/detail-pane/'
          });
          away.textContent = 'Away';
          document.body.append(away);
          away.click();
        });
        await page.waitForURL(/\/layouts\/detail-pane\/$/);
        await page.goBack();
        await settles(returns());
        assert.deepEqual(await stand(), stood, 'a return to the page left the panes elsewhere');
      } finally {
        await page.close();
      }
    }
  );

  test(
    'an index and a side nav read an id that every object inherits as no entry',
    long,
    async () => {
      const page = await openMount(browser, url);
      try {
        const current = () =>
          page.evaluate(() =>
            [...document.querySelectorAll('.sui-page-toc-link[aria-current="location"]')].map(
              (link) => link.getAttribute('href')
            )
          );
        await page.evaluate(() => {
          const { lib, mount, flushSync } = /** @type {any} */ (window);
          const entries = ['intro', 'constructor', 'toString'].map((id) => ({ id, label: id }));
          const main = document.createElement('main');
          for (const { id } of entries) {
            const section = document.createElement('section');
            section.id = id;
            section.style.blockSize = '120vh';
            main.append(section);
          }
          const aside = document.createElement('aside');
          document.body.append(aside, main);
          mount(lib.PageToc, { target: aside, props: { entries } });
          flushSync();
        });
        assert.deepEqual(await current(), ['#intro']);
        await page.evaluate(() => document.getElementById('constructor')?.scrollIntoView());
        await page.waitForFunction(
          () =>
            document
              .querySelector('.sui-page-toc-link[aria-current="location"]')
              ?.getAttribute('href') === '#constructor'
        );
        assert.deepEqual(await current(), ['#constructor']);
        const plates = await page.evaluate(() => {
          const { lib, mount, flushSync } = /** @type {any} */ (window);
          const target = document.createElement('div');
          document.body.append(target);
          const sections = [{ items: [{ href: '/a', label: 'A', icon: 'home' }] }];
          try {
            mount(lib.SideNav, {
              target,
              props: { title: 'App', sections, current: 'constructor' }
            });
            flushSync();
          } catch (error) {
            return String(error);
          }
          return target.querySelectorAll('[aria-current]').length;
        });
        assert.equal(plates, 0, 'a current that matches no row drew a plate or threw');
      } finally {
        await page.close();
      }
    }
  );

  test(
    'an unrelated navigation with body focus does not pull focus into a list-detail',
    long,
    async () => {
      const page = await openMount(browser, url);
      try {
        await page.evaluate(() => {
          const { lib, mount, createRawSnippet, flushSync, state, get } = /** @type {any} */ (
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
      // Only geometry is read, which a theme never moves, so one page is resized to each width.
      const page = await openLayout('layouts/detail-pane/', 320);
      try {
        for (const width of [320, 375, 768, 1024, 1280, 1440]) {
          await resize(page, width);
          const found = await page.evaluate(() => {
            const wide = (/** @type {Element} */ box) => box.scrollWidth > box.clientWidth;
            const scrollers = [...document.querySelectorAll('main *')].filter(
              (box) => /auto|scroll/.test(getComputedStyle(box).overflowX) && wide(box)
            );
            const main = document.querySelector('.sui-detail-layout-main')?.getBoundingClientRect();
            const aside = document
              .querySelector('.sui-detail-layout-aside')
              ?.getBoundingClientRect();
            return {
              page: wide(document.documentElement),
              scrollers: scrollers.map((box) => `${box.tagName} ${box.className}`),
              beside: !!main && !!aside && Math.abs(main.top - aside.top) < 1
            };
          });
          const at = `at ${width}px`;
          assert.equal(found.page, false, `the page scrolls sideways ${at}`);
          assert.deepEqual(found.scrollers, [], `boxes scroll sideways ${at}`);
          if (width === 1440)
            assert.ok(found.beside, `the aside is not beside the main column ${at}`);
        }
      } finally {
        await page.close();
      }
    }
  );
});
