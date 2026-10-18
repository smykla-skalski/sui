import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { long, startSink, visit } from './sink.mjs';

// Focus, keyboard and placement of the floating layers and dialogs, on the kitchen sink.

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

/** @param {import('playwright-core').BrowserContextOptions} [options] */
async function open(options = {}) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, ...options });
  await visit(page, url);
  await page.evaluate(() => document.fonts.ready);
  // A smooth scroll would still be moving a trigger when its layer is measured.
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
  return page;
}

/** @param {import('playwright-core').Page} page */
const focused = (page) =>
  page.evaluate(() =>
    document.activeElement === document.body
      ? 'body'
      : (document.activeElement?.textContent ?? '').trim()
  );

test('on a phone a long press on a time or a cut label shows its tip', long, async () => {
  const page = await open({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true
  });
  try {
    const cdp = await page.context().newCDPSession(page);
    const cut = await page.evaluate(() =>
      [...document.querySelectorAll('#clipped-label .sui-clipped-label')].findIndex(
        (label) => label.scrollWidth > label.clientWidth + 1
      )
    );
    assert.ok(cut >= 0, 'the sink holds no cut label at this width');
    const found = [];
    for (const target of [
      page.locator('#relative-time time').first(),
      page.locator('#clipped-label .sui-clipped-label').nth(cut)
    ]) {
      await target.scrollIntoViewIfNeeded();
      const box = await target.boundingBox();
      assert.ok(box);
      const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      // Held past the tip's 500ms hold; a tap would pass through as a click instead.
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
      await page.waitForTimeout(900);
      const held = await page.evaluate(
        () => document.querySelector('[popover]:popover-open') !== null
      );
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      if (!held) found.push(`${await target.textContent()}`);
      await page.keyboard.press('Escape');
    }
    assert.deepEqual(found, []);
  } finally {
    await page.close();
  }
});

test('L-89 a confirmed act that removes its opener hands focus to the next row', long, async () => {
  const page = await open();
  try {
    const opener = page.locator('#confirm-dialog button', { hasText: 'Revoke Release script' });
    await opener.scrollIntoViewIfNeeded();
    await opener.click();
    await page.locator('dialog[open] button', { hasText: 'Revoke token' }).click();
    await page.waitForFunction(() => !document.querySelector('dialog[open]'));
    assert.equal(await focused(page), 'Revoke Nightly backup');
  } finally {
    await page.close();
  }
});

test(
  'S3 a refused confirmation stays open, pending and then failed, never closing on Escape',
  long,
  async () => {
    const page = await open();
    try {
      const opener = page.locator('#confirm-dialog button', { hasText: 'Leave workspace' }).first();
      await opener.scrollIntoViewIfNeeded();
      await opener.click();
      const confirm = page.locator('dialog[open] button', { hasText: 'Leave workspace' });
      await confirm.click();
      const dialog = page.locator('dialog[open]');
      assert.equal(await dialog.getAttribute('aria-busy'), 'true');
      await page.keyboard.press('Escape');
      assert.equal(await dialog.count(), 1, 'Escape closed a pending dialog');
      await page.waitForFunction(() => document.querySelector('dialog[open] .sui-modal-error p'));
      assert.match((await dialog.locator('.sui-modal-error').textContent()) ?? '', /cannot leave/);
      assert.equal(await focused(page), 'Leave workspace');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('dialog[open]'));
      assert.equal(await focused(page), 'Leave workspace', 'focus did not return to the opener');
    } finally {
      await page.close();
    }
  }
);

test(
  'K10 an open layer rides with its trigger as the page scrolls and scrolls inside itself',
  long,
  async () => {
    const page = await open({ viewport: { width: 1440, height: 700 } });
    try {
      // A layer taller than its room scrolls inside, and that scroll stays where the wheel left it.
      const tall = page.getByRole('button', { name: 'Show every change' });
      await tall.scrollIntoViewIfNeeded();
      await tall.click();
      await page.waitForTimeout(400);
      const box = page.locator('#sink-popover-tall');
      await box.hover();
      for (let step = 0; step < 3; step++) {
        await page.mouse.wheel(0, 60);
        await page.waitForTimeout(80);
      }
      const inside = await box.evaluate((element) => element.scrollTop);
      assert.ok(inside >= 120, `the layer scrolled to ${inside}px for 180px of wheel`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // Under a page scroll the gap to the trigger is the same on every frame.
      const trigger = page.getByRole('button', { name: 'Repository actions' }).first();
      await trigger.scrollIntoViewIfNeeded();
      await trigger.click();
      await page.waitForTimeout(400);
      const before = await page.evaluate(() => scrollY);
      await page.evaluate(() => {
        const anchor = document.querySelector('[aria-label="Repository actions"]');
        const layer = document.querySelector('.sui-popover:popover-open');
        const gaps = /** @type {number[]} */ ([]);
        Object.assign(window, { gaps });
        const sample = () => {
          if (!anchor || !layer) return;
          gaps.push(layer.getBoundingClientRect().top - anchor.getBoundingClientRect().bottom);
          if (gaps.length < 40) requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      });
      await page.mouse.move(700, 350);
      for (let step = 0; step < 10; step++) {
        await page.mouse.wheel(0, 40);
        await page.waitForTimeout(16);
      }
      await page.waitForTimeout(400);
      assert.notEqual(await page.evaluate(() => scrollY), before, 'the page did not scroll');
      const gaps = await page.evaluate(
        () => /** @type {{ gaps: number[] }} */ (/** @type {unknown} */ (window)).gaps
      );
      assert.ok(
        Math.max(...gaps) - Math.min(...gaps) <= 1,
        `the gap to the trigger ran ${[...new Set(gaps.map(Math.round))].join(', ')}px`
      );

      // Content above that grows moves the trigger within the page, and the layer goes with it.
      const shifted = await page.evaluate(async () => {
        const anchor = document.querySelector('[aria-label="Repository actions"]');
        const layer = document.querySelector('.sui-popover:popover-open');
        const filler = document.createElement('div');
        filler.style.blockSize = '120px';
        anchor?.closest('section')?.before(filler);
        await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
        const gap =
          (layer?.getBoundingClientRect().top ?? 0) - (anchor?.getBoundingClientRect().bottom ?? 0);
        filler.remove();
        return gap;
      });
      assert.ok(Math.abs(shifted - gaps[0]) <= 1, `after a shift above, the gap is ${shifted}px`);
    } finally {
      await page.close();
    }
  }
);

test(
  'AC15 a manual layer survives an outside press and closes on Escape back to its trigger',
  long,
  async () => {
    const page = await open();
    try {
      const trigger = page.locator('#overlays button', { hasText: 'Pin the notes' });
      await trigger.scrollIntoViewIfNeeded();
      await trigger.click();
      const layer = page.locator('#sink-popover-pinned');
      await page.locator('#overlays .lead').click();
      assert.ok(
        await layer.evaluate((box) => box.matches(':popover-open')),
        'an outside press closed it'
      );
      await layer.locator('button').focus();
      await page.keyboard.press('Escape');
      // Focus comes back with the toggle event, a task after the layer hides.
      await page.waitForFunction(
        () => !document.querySelector('#sink-popover-pinned:popover-open')
      );
      await page.waitForTimeout(100);
      assert.equal(await focused(page), 'Pin the notes');
    } finally {
      await page.close();
    }
  }
);

test(
  'K9 in a right-to-left page menus hang from the mirrored edge and code stays left to right',
  long,
  async () => {
    const page = await open();
    try {
      await page.evaluate(() => (document.documentElement.dir = 'rtl'));
      /** Opens a menu and reads its inline edges against its trigger's. */
      const edges = async (/** @type {import('playwright-core').Locator} */ trigger) => {
        await trigger.scrollIntoViewIfNeeded();
        await trigger.click();
        await page.waitForTimeout(300);
        const found = await trigger.evaluate((element) => {
          const layer = document.getElementById(element.getAttribute('popovertarget') ?? '');
          const box = layer?.getBoundingClientRect();
          const from = element.getBoundingClientRect();
          return box && { left: box.left - from.left, right: box.right - from.right };
        });
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
        return found;
      };
      const end = await edges(
        page.locator('#action-menu button[aria-label="Repository actions"]').first()
      );
      assert.ok(
        end && Math.abs(end.left) <= 1,
        `align="end" hangs ${end?.left}px off the left edge`
      );
      const start = await edges(
        page.locator('#action-menu button', { hasText: 'Release actions' }).first()
      );
      assert.ok(
        start && Math.abs(start.right) <= 1,
        `align="start" hangs ${start?.right}px off the right edge`
      );
      const directions = await page.evaluate(() =>
        [...document.querySelectorAll('#code-block pre, #diff-block pre')].map(
          (pre) => getComputedStyle(pre).direction
        )
      );
      assert.ok(directions.length > 0);
      assert.deepEqual([...new Set(directions)], ['ltr']);
    } finally {
      await page.close();
    }
  }
);

test(
  'U6 a stack of toasts taller than the screen scrolls, so each toast the keyboard reaches is in view',
  long,
  async () => {
    const page = await open({ viewport: { width: 320, height: 640 } });
    try {
      const raise = page.locator('#toaster button', { hasText: 'Sync repositories' });
      await raise.scrollIntoViewIfNeeded();
      await raise.focus();
      for (let count = 0; count < 12; count++) await page.keyboard.press('Enter');
      await page.waitForFunction(
        () => document.querySelectorAll('.sui-toaster:popover-open .sui-toast').length === 12
      );
      const inView = () =>
        page.evaluate(() => {
          const box = document.activeElement?.getBoundingClientRect();
          return Boolean(
            document.activeElement?.closest('.sui-toaster') &&
            box &&
            box.top >= 0 &&
            box.bottom <= innerHeight
          );
        });
      // Tab reaches the oldest toast first, which a stack that only grows would push off the top.
      for (let step = 0; step < 30; step++) {
        await page.keyboard.press('Tab');
        if (await page.evaluate(() => document.activeElement?.closest('.sui-toaster'))) break;
      }
      assert.ok(await inView(), 'Tab reached a toast off the screen');
      await page.keyboard.press('F8');
      assert.ok(
        await page.evaluate(() => document.activeElement?.closest('.sui-toast:last-child')),
        'F8 did not reach the newest toast'
      );
      assert.ok(await inView(), 'F8 reached a toast off the screen');
    } finally {
      await page.close();
    }
  }
);

test(
  'AC2 a cut label outside any control takes a tab stop and shows its whole text',
  long,
  async () => {
    const page = await open();
    try {
      const label = page.locator('#clipped-label .sui-clipped-label', {
        hasText: 'Platform engineering'
      });
      await label.scrollIntoViewIfNeeded();
      assert.equal(await label.getAttribute('tabindex'), '0');
      const whole = page.locator('#clipped-label .sui-clipped-label', { hasText: /^Platform$/ });
      assert.equal(await whole.getAttribute('tabindex'), null, 'a label that fits took a tab stop');
      // A key press first, so the focus that follows counts as keyboard focus.
      await page.keyboard.press('Shift');
      await label.focus();
      await page.waitForTimeout(100);
      const tips = await page.evaluate(() =>
        [...document.querySelectorAll('.sui-tooltip:popover-open')].map((tip) =>
          tip.textContent?.trim()
        )
      );
      assert.deepEqual(tips, [await label.textContent()]);
    } finally {
      await page.close();
    }
  }
);

test(
  'AC2 a time outside any control takes a tab stop and shows its whole instant',
  long,
  async () => {
    const page = await open();
    try {
      const time = page.locator('#relative-time time.sui-relative-time:not(.exact)').first();
      await time.scrollIntoViewIfNeeded();
      assert.equal(await time.getAttribute('tabindex'), '0');
      const exact = page.locator('#relative-time time.sui-relative-time.exact').first();
      assert.equal(
        await exact.getAttribute('tabindex'),
        null,
        'a time shown whole took a tab stop'
      );
      await page.keyboard.press('Shift');
      await time.focus();
      await page.waitForTimeout(100);
      const tips = await page.evaluate(() =>
        [...document.querySelectorAll('.sui-tooltip:popover-open')].map((tip) =>
          tip.textContent?.trim()
        )
      );
      const whole = await time.evaluate(
        (element) => element.querySelector('.sui-visually-hidden, [class*=hidden]')?.textContent
      );
      assert.equal(tips.length, 1);
      assert.ok(whole?.includes(tips[0] ?? '-'), `the tip ${tips[0]} is not the whole instant`);
    } finally {
      await page.close();
    }
  }
);

// A popover scrolls by default and a tip's trimmed words overhang its box, so a tip that
// scrolled would be a keyboard stop of its own, and closing it on blur dropped focus to the page.
test('a shown tip is never a tab stop, so Tab goes on to the next control', long, async () => {
  const page = await open();
  try {
    const button = page.locator('#icon-buttons .sui-icon-button').first();
    await button.scrollIntoViewIfNeeded();
    await page.keyboard.press('Shift');
    await button.focus();
    await page.locator('.sui-tooltip:popover-open').waitFor();
    await page.keyboard.press('Tab');
    const landed = await page.evaluate(() => {
      const active = document.activeElement;
      return active === document.body ? 'the page' : (active?.closest('.sui-tooltip')?.id ?? '');
    });
    assert.equal(landed, '', `Tab from a control with its tip shown landed on ${landed}`);
  } finally {
    await page.close();
  }
});

test(
  'K9 a time writes its whole instant in the page language once the clock ticks',
  long,
  async () => {
    const page = await open();
    try {
      await page.clock.install();
      await page.reload({ waitUntil: 'networkidle' });
      // The server's markup holds the time before the page is live; the clock starts only once the
      // sink has mounted, which a busy runner may take a moment to do. The page's own timers are
      // fake now, so the wait polls from here.
      for (let wait = 0; wait < 100; wait++) {
        if (await page.evaluate(() => '__suiAudit' in window)) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      const time = page.locator('#relative-time time.sui-relative-time.exact').first();
      await time.waitFor();
      const before = await time.textContent();
      await page.evaluate(() => (document.documentElement.lang = 'de'));
      // The page's clock ticks every half minute; a busy page may land the new words a beat later.
      let after = before;
      for (let tick = 0; tick < 4 && after === before; tick++) {
        await page.clock.runFor(31_000);
        after = await time.textContent();
      }
      assert.notEqual(after, before, 'the exact reading kept the old language');
    } finally {
      await page.close();
    }
  }
);

test('K8 a tooltip describes its control only when it adds words', long, async () => {
  const page = await open();
  try {
    const described = await page.evaluate(() => {
      const icon = document.querySelector('#overlays button[aria-label="Refresh the list"]');
      const sync = [...document.querySelectorAll('#overlays button')].find(
        (button) => button.textContent?.trim() === 'Sync now'
      );
      const tip = (/** @type {Element | null | undefined} */ button) =>
        document
          .getElementById(button?.getAttribute('aria-describedby') ?? '')
          ?.textContent?.trim() ?? null;
      return { icon: tip(icon), sync: tip(sync) };
    });
    assert.equal(described.icon, null, 'a tip that repeats the name describes its control');
    assert.match(described.sync ?? '', /Last synced/);
  } finally {
    await page.close();
  }
});
