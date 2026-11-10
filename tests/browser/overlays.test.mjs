import assert from 'node:assert/strict';
import { after, before, suite, test } from 'node:test';
import {
  allSections,
  atRest,
  brief,
  long,
  openMount,
  settles,
  startSink,
  together,
  visit
} from './sink.mjs';

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

// The tests of a suite with one page run in order on it, so each leaves the page as the next
// one expects it.
const inOrder = { ...long, concurrency: 1 };

suite('overlays', together, () => {
  /** @param {import('playwright-core').BrowserContextOptions} [options] */
  async function open(options = {}) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, ...options });
    await visit(page, allSections(url));
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

  suite('on a phone, on one page', inOrder, () => {
    /** @type {import('playwright-core').Page} */
    let page;
    before(async () => {
      page = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    });
    after(() => page?.close());

    test('a long press on a time or a cut label shows its tip', async () => {
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
        // Held until the tip shows, past its 500ms hold; a tap would pass through as a click.
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
        const held = await settles(
          page.waitForFunction(() => document.querySelector('[popover]:popover-open'), null, brief)
        );
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        if (!held) found.push(`${await target.textContent()}`);
        await page.keyboard.press('Escape');
        // The next hold reads any open layer, so this tip has to be gone first.
        await settles(
          page.waitForFunction(() => !document.querySelector('[popover]:popover-open'), null, brief)
        );
      }
      assert.deepEqual(found, []);
    });

    test('L-58 a dialog that opens holding a long value shows its start, chosen, and stacks its actions at the full width in their reading order', async () => {
      const opener = page
        .locator('#modal button:not(.sui-modal *)', { hasText: 'Edit Webhook' })
        .first();
      await opener.scrollIntoViewIfNeeded();
      await opener.click();
      await page.waitForSelector('dialog[open]');
      const shown = await page.evaluate(
        () =>
          new Promise((done) =>
            requestAnimationFrame(() => {
              const input = /** @type {HTMLInputElement} */ (document.activeElement);
              const footer = /** @type {HTMLElement} */ (
                document.querySelector('dialog[open] > .sui-modal-foot')
              );
              const look = getComputedStyle(footer);
              done({
                field: {
                  overflows: input.scrollWidth > input.clientWidth,
                  scrolled: input.scrollLeft,
                  chosen: [input.selectionStart, input.selectionEnd],
                  length: input.value.length
                },
                inner:
                  footer.clientWidth -
                  parseFloat(look.paddingInlineStart) -
                  parseFloat(look.paddingInlineEnd),
                buttons: [...footer.querySelectorAll('button')].map((button) => {
                  const box = button.getBoundingClientRect();
                  return { words: button.textContent?.trim(), top: box.top, width: box.width };
                })
              });
            })
          )
      );
      const { field, inner, buttons } =
        /** @type {{ field: { overflows: boolean, scrolled: number, chosen: number[], length: number }, inner: number, buttons: { words: string, top: number, width: number }[] }} */ (
          shown
        );
      assert.ok(field.overflows, 'the address fits its field, so nothing here is proved');
      assert.equal(field.scrolled, 0, 'the field opened scrolled away from its start');
      assert.deepEqual(field.chosen, [0, field.length], 'the value is not chosen');
      assert.deepEqual(
        buttons.map((button) => button.words),
        ['Cancel', 'Save Webhook'],
        'the actions left their reading order'
      );
      for (const button of buttons)
        assert.ok(
          Math.abs(button.width - inner) <= 0.5,
          `${button.words} is ${button.width}px of a ${inner}px footer`
        );
      assert.ok(buttons[0].top < buttons[1].top, 'the actions share a line');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('dialog[open]'));
    });
  });

  suite('dialogs on one page', inOrder, () => {
    /** @type {import('playwright-core').Page} */
    let page;
    before(async () => {
      page = await open();
    });
    after(() => page?.close());

    test('L-58 a dialog opens on its first field, and a confirmation without one on its least destructive answer', async () => {
      /** @param {string} name */
      const opensOn = async (name) => {
        const opener = page
          .locator('#confirm-dialog button:not(.sui-modal *)', { hasText: name })
          .first();
        await opener.scrollIntoViewIfNeeded();
        await opener.click();
        await page.waitForSelector('dialog[open]');
        const at = await page.evaluate(() => {
          const active = document.activeElement;
          const field = document.querySelector('dialog[open] .sui-modal-body :is(input, textarea)');
          return active === field ? 'its first field' : active?.textContent?.trim();
        });
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.querySelector('dialog[open]'));
        return at;
      };
      assert.equal(await opensOn('Revoke Token'), 'its first field');
      assert.equal(await opensOn('Delete Repository'), 'Cancel');
    });

    test('S3 a refused confirmation stays open, pending and then failed, never closing on Escape', async () => {
      const opener = page.locator('#confirm-dialog button', { hasText: 'Leave Workspace' }).first();
      await opener.scrollIntoViewIfNeeded();
      await opener.click();
      const confirm = page.locator('dialog[open] button', { hasText: 'Leave Workspace' });
      await confirm.click();
      const dialog = page.locator('dialog[open]');
      assert.equal(await dialog.getAttribute('aria-busy'), 'true');
      await page.keyboard.press('Escape');
      assert.equal(await dialog.count(), 1, 'Escape closed a pending dialog');
      await page.waitForFunction(() => document.querySelector('dialog[open] .sui-modal-error p'));
      assert.match((await dialog.locator('.sui-modal-error').textContent()) ?? '', /cannot leave/);
      assert.equal(await focused(page), 'Leave Workspace');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('dialog[open]'));
      assert.equal(await focused(page), 'Leave Workspace', 'focus did not return to the opener');
    });

    test('L-89 a confirmed act that removes its opener hands focus to the next row', async () => {
      const opener = page.locator('#confirm-dialog button', { hasText: 'Revoke Release Script' });
      await opener.scrollIntoViewIfNeeded();
      await opener.click();
      await page.locator('dialog[open] button', { hasText: 'Revoke Token' }).click();
      await page.waitForFunction(() => !document.querySelector('dialog[open]'));
      assert.equal(await focused(page), 'Revoke Nightly Backup');
    });

    test('L-58 a press outside closes a form dialog as Escape does: a pristine one at once, a changed one after asking', async () => {
      const opener = page
        .locator('#modal button:not(.sui-modal *)', { hasText: 'Edit Webhook' })
        .first();
      const shown = () => page.locator('dialog[open]').count();
      await opener.scrollIntoViewIfNeeded();
      await opener.click();
      await page.waitForSelector('dialog[open]');
      // The scrim's corner, well outside the box.
      await page.mouse.click(4, 4);
      await page.waitForFunction(() => !document.querySelector('dialog[open]'));
      await opener.click();
      await page.waitForSelector('dialog[open]');
      await page.keyboard.press('End');
      await page.keyboard.type('/x');
      await page.mouse.click(4, 4);
      await page.waitForSelector('dialog[open][role="alertdialog"]');
      assert.equal(await shown(), 2, 'a press outside threw a changed form away');
      await page
        .locator('dialog[open][role="alertdialog"] button', { hasText: 'Discard Changes' })
        .click();
      await page.waitForFunction(() => !document.querySelector('dialog[open]'));
    });

    test('L-58 a busy dialog hands focus to its busy action and disables its fields until the work ends', async () => {
      const opener = page
        .locator('#modal button:not(.sui-modal *)', { hasText: 'Rename Repository' })
        .first();
      await opener.scrollIntoViewIfNeeded();
      await opener.click();
      const field = page.locator('dialog[open] input').first();
      await field.focus();
      // The dialog opens with the words chosen. On macOS End only scrolls, so ArrowRight puts
      // the caret after them on every platform.
      await page.keyboard.press('ArrowRight');
      await page.keyboard.type('-next');
      // The sink's work ends in under a second, sooner than a slow runner comes back from a
      // keystroke, so the page notes the hold the frame after the work starts.
      await page.evaluate(() => {
        const dialog = /** @type {HTMLDialogElement} */ (document.querySelector('dialog[open]'));
        /** @type {any} */ (window).held = new Promise((done) => {
          const watch = new MutationObserver(() => {
            if (dialog.getAttribute('aria-busy') !== 'true') return;
            watch.disconnect();
            requestAnimationFrame(() => {
              const input = /** @type {HTMLInputElement} */ (dialog.querySelector('input'));
              const press = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
              input.dispatchEvent(press);
              done({
                onAction: document.activeElement?.getAttribute('aria-busy') === 'true',
                disabled: input.disabled,
                pressRefused: press.defaultPrevented
              });
            });
          });
          watch.observe(dialog, { attributeFilter: ['aria-busy'] });
        });
      });
      await page.keyboard.press('Enter');
      assert.deepEqual(
        await page.evaluate(() => /** @type {any} */ (window).held),
        { onAction: true, disabled: true, pressRefused: true },
        'a busy dialog left its field in use or focus off its busy action'
      );
      await page.waitForFunction(
        () => !document.querySelector('dialog[open]')?.hasAttribute('aria-busy')
      );
      await page.waitForFunction(() => document.activeElement?.tagName === 'INPUT');
      await page.keyboard.type('!');
      assert.equal(await field.inputValue(), 'smyklot-next!', 'focus did not return to the field');
      // The sink refuses every rename, so the dialog is still open on the changed name.
      await page.keyboard.press('Escape');
      await page
        .locator('dialog[open][role="alertdialog"] button', { hasText: 'Discard Changes' })
        .click();
      await page.waitForFunction(() => !document.querySelector('dialog[open]'));
    });

    test('Ctrl+Enter or Cmd+Enter in a textarea sends its form, and Enter adds a line', async () => {
      const opener = page
        .locator('#modal button:not(.sui-modal *)', { hasText: 'Write Release Notes' })
        .first();
      await opener.scrollIntoViewIfNeeded();
      await opener.click();
      const notes = page.locator('dialog[open]').getByRole('textbox', { name: 'Release notes' });
      await notes.waitFor();
      await notes.fill('Fixed');
      await notes.press('Enter');
      assert.equal(await notes.inputValue(), 'Fixed\n', 'Enter did not add a line');
      await notes.press('ControlOrMeta+Enter');
      await page.waitForFunction(() => !document.querySelector('dialog[open]'));
    });

    test('L-58 a line parts a dialog body from its actions whether the body fits or scrolls, one inset above them as below', async () => {
      const opener = page.locator('#modal button', { hasText: 'Edit Webhook' }).first();
      await opener.scrollIntoViewIfNeeded();
      await opener.click();
      await page.waitForSelector('dialog[open] .sui-modal-body');
      const band = await page.evaluate(() => {
        const dialog = /** @type {Element} */ (document.querySelector('dialog[open]'));
        const line = /** @type {Element} */ (dialog.querySelector('.sui-modal-error'));
        const buttons = [...dialog.querySelectorAll('.sui-modal-foot button')].map((button) =>
          button.getBoundingClientRect()
        );
        return {
          above: Math.min(...buttons.map((box) => box.top)) - line.getBoundingClientRect().top,
          below:
            dialog.getBoundingClientRect().bottom -
            Math.max(...buttons.map((box) => box.bottom)) -
            parseFloat(getComputedStyle(dialog).borderBottomWidth)
        };
      });
      assert.ok(
        Math.abs(band.above - band.below) <= 0.5,
        `the actions stand ${band.above}px under the line and ${band.below}px over the foot`
      );
      const cut = () => {
        const after = document.querySelector('dialog[open] .sui-modal-body + .sui-modal-error');
        const line = after && getComputedStyle(after, '::before');
        return line ? Number(line.opacity) * parseFloat(line.borderTopWidth) : 0;
      };
      assert.ok((await page.evaluate(cut)) > 0, 'a body that fits draws no line over the actions');
      await page.evaluate(() => {
        const rest = document.createElement('div');
        rest.style.blockSize = '200vh';
        document.querySelector('dialog[open] .sui-modal-body')?.append(rest);
      });
      assert.ok((await page.evaluate(cut)) > 0, 'a body cut by the actions draws no line');
    });
  });

  test(
    'K10 an open layer rides with its trigger as the page scrolls and scrolls inside itself',
    long,
    async () => {
      const page = await open({ viewport: { width: 1440, height: 700 } });
      try {
        // A layer taller than its room scrolls inside, and that scroll stays where the wheel left it.
        const tall = page.getByRole('button', { name: 'Show Every Change' });
        await tall.scrollIntoViewIfNeeded();
        await tall.click();
        await page.waitForFunction(() => document.querySelector('#sink-popover-tall:popover-open'));
        await atRest(page);
        const box = page.locator('#sink-popover-tall');
        await box.hover();
        for (let step = 0; step < 3; step++) await page.mouse.wheel(0, 60);
        await settles(
          page.waitForFunction(
            () => (document.querySelector('#sink-popover-tall')?.scrollTop ?? 0) >= 120,
            null,
            brief
          )
        );
        const inside = await box.evaluate((element) => element.scrollTop);
        assert.ok(inside >= 120, `the layer scrolled to ${inside}px for 180px of wheel`);
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.querySelector(':popover-open'));

        // Under a page scroll the gap to the trigger is the same on every frame.
        const trigger = page.getByRole('button', { name: 'Repository actions' }).first();
        await trigger.scrollIntoViewIfNeeded();
        await trigger.click();
        await page.waitForFunction(() => document.querySelector('.sui-popover:popover-open'));
        await atRest(page);
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
        // One step a frame, so the samples see the page move between steps.
        for (let step = 0; step < 10; step++) {
          await page.mouse.wheel(0, 40);
          await page.evaluate(() => new Promise(requestAnimationFrame));
        }
        await page.waitForFunction(
          () =>
            /** @type {{ gaps: number[] }} */ (/** @type {unknown} */ (window)).gaps.length >= 40
        );
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
            (layer?.getBoundingClientRect().top ?? 0) -
            (anchor?.getBoundingClientRect().bottom ?? 0);
          filler.remove();
          return gap;
        });
        assert.ok(Math.abs(shifted - gaps[0]) <= 1, `after a shift above, the gap is ${shifted}px`);
      } finally {
        await page.close();
      }
    }
  );

  suite('menus and a pair editor on one page', inOrder, () => {
    /** @type {import('playwright-core').Page} */
    let page;
    before(async () => {
      page = await open();
    });
    after(() => page?.close());

    test("L-72 a layer opened from a changed row wears the page's palette, not the row's", async () => {
      const look = async (/** @type {import('playwright-core').Locator} */ entry) => {
        const add = entry.getByRole('button', { name: 'Add an Alias' });
        await add.scrollIntoViewIfNeeded();
        await add.click();
        const editor = page.locator(':popover-open:has(> .sui-pair-editor)');
        const seen = await editor.evaluate((layer) => {
          const field = layer.querySelector('input');
          const label = layer.querySelector('label');
          return field && label
            ? [getComputedStyle(field).backgroundColor, getComputedStyle(label).color]
            : [];
        });
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.querySelector(':popover-open'));
        return seen;
      };
      const plain = await look(page.locator('#pair-entry .sui-pair-entry').first());
      const changed = await look(
        page.locator('#pair-entry .sui-setting-row[data-unsaved] .sui-pair-entry').first()
      );
      assert.equal(plain.length, 2);
      assert.deepEqual(changed, plain, "the editor took the changed row's ground or ink");
    });

    test('L-52 a list open in a layer closes alone on a press inside the layer, Escape and Tab', async () => {
      const add = page.locator('#pair-entry').getByRole('button', { name: 'Add an Alias' }).first();
      await add.scrollIntoViewIfNeeded();
      const editor = page.locator(':popover-open:has(> .sui-pair-editor)');
      const field = editor.getByRole('combobox');
      const layers = () =>
        page.evaluate(() =>
          [...document.querySelectorAll(':popover-open')].map((layer) =>
            layer.querySelector('form') ? 'editor' : 'list'
          )
        );
      const listed = () =>
        page.waitForFunction(() => document.querySelector(':popover-open [role="listbox"]'));
      const oneLayer = () =>
        settles(
          page.waitForFunction(
            () => document.querySelectorAll(':popover-open').length === 1,
            null,
            brief
          )
        );
      await add.click();
      await field.click();
      await listed();

      // The form's padding is not focusable, so the press would hand focus to the page.
      await editor.locator('form').click({ position: { x: 4, y: 4 } });
      await oneLayer();
      assert.deepEqual(await layers(), ['editor'], 'a press inside the editor closed it');
      assert.ok(
        await editor.evaluate((layer) => layer.contains(document.activeElement)),
        'the press inside took focus out of the editor'
      );

      await field.click();
      await listed();
      await page.keyboard.press('Escape');
      await oneLayer();
      assert.deepEqual(await layers(), ['editor'], 'Escape closed more than the list');
      assert.equal(await field.evaluate((input) => input === document.activeElement), true);

      await page.keyboard.press('ArrowDown');
      await listed();
      await page.keyboard.press('Tab');
      await oneLayer();
      assert.deepEqual(await layers(), ['editor'], 'Tab out of the field closed the editor');
      assert.equal(await focused(page), 'Save Pair');

      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector(':popover-open'));
      await settles(
        page.waitForFunction(
          () => document.activeElement?.textContent?.trim() === 'Add an Alias',
          null,
          brief
        )
      );
      assert.equal(await focused(page), 'Add an Alias');
    });

    test('K9 in a right-to-left page menus hang from the mirrored edge and code stays left to right', async () => {
      await page.evaluate(() => (document.documentElement.dir = 'rtl'));
      /** Opens a menu and reads its inline edges against its trigger's. */
      const edges = async (/** @type {import('playwright-core').Locator} */ trigger) => {
        await trigger.scrollIntoViewIfNeeded();
        await trigger.click();
        const handle = await trigger.elementHandle();
        if (
          await settles(
            page.waitForFunction(
              (element) =>
                document
                  .getElementById(element?.getAttribute('popovertarget') ?? '')
                  ?.matches(':popover-open'),
              handle,
              brief
            )
          )
        )
          await atRest(page);
        const found = await trigger.evaluate((element) => {
          const layer = document.getElementById(element.getAttribute('popovertarget') ?? '');
          const box = layer?.getBoundingClientRect();
          const from = element.getBoundingClientRect();
          return box && { left: box.left - from.left, right: box.right - from.right };
        });
        await page.keyboard.press('Escape');
        await settles(
          page.waitForFunction(
            (element) =>
              !document
                .getElementById(element?.getAttribute('popovertarget') ?? '')
                ?.matches(':popover-open'),
            handle,
            brief
          )
        );
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
        page.locator('#action-menu button', { hasText: 'Release Actions' }).first()
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
    });
  });

  suite('tips on one page', inOrder, () => {
    /** @type {import('playwright-core').Page} */
    let page;
    before(async () => {
      page = await open();
    });
    after(() => page?.close());

    const oneTip = () =>
      settles(
        page.waitForFunction(
          () => document.querySelectorAll('.sui-tooltip:popover-open').length === 1,
          null,
          brief
        )
      );

    // The dots are the box's ground, so a parent that stretches the box would draw them past
    // the words.
    test('a relative time draws its dots under its words only', async () => {
      const widths = await page.evaluate(() =>
        [...document.querySelectorAll('#relative-time time.sui-relative-time:not(.exact)')].map(
          (time) => {
            const words = document.createRange();
            const text = [...time.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
            if (text) words.selectNodeContents(text);
            return [time.getBoundingClientRect().width, words.getBoundingClientRect().width];
          }
        )
      );
      assert.ok(widths.length > 0);
      for (const [box, words] of widths)
        assert.ok(Math.abs(box - words) <= 0.5, `dots run ${box}px under ${words}px of words`);
    });

    test('an open popover copy keeps the floating gap off its trigger', async () => {
      const [gap, step] = await page.evaluate(() => {
        const copy = /** @type {Element} */ (document.getElementById('sink-popover-open'));
        const trigger = /** @type {Element} */ (copy.previousElementSibling);
        return [
          copy.getBoundingClientRect().top - trigger.getBoundingClientRect().bottom,
          parseFloat(getComputedStyle(copy).getPropertyValue('--sui-floating-gap'))
        ];
      });
      assert.equal(gap, step);
    });

    test('K8 a tooltip describes its control only when it adds words', async () => {
      const described = await page.evaluate(() => {
        const icon = document.querySelector('#overlays button[aria-label="Refresh the list"]');
        const sync = [...document.querySelectorAll('#overlays button')].find(
          (button) => button.textContent?.trim() === 'Sync Now'
        );
        const tip = (/** @type {Element | null | undefined} */ button) =>
          document
            .getElementById(button?.getAttribute('aria-describedby') ?? '')
            ?.textContent?.trim() ?? null;
        return { icon: tip(icon), sync: tip(sync) };
      });
      assert.equal(described.icon, null, 'a tip that repeats the name describes its control');
      assert.match(described.sync ?? '', /Last synced/);
    });

    test('AC15 a manual layer survives an outside press and closes on Escape back to its trigger', async () => {
      const trigger = page.locator('#overlays button', { hasText: 'Pin the Notes' });
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
      await settles(
        page.waitForFunction(
          () => document.activeElement?.textContent?.trim() === 'Pin the Notes',
          null,
          brief
        )
      );
      assert.equal(await focused(page), 'Pin the Notes');
    });

    test('AC2 a cut label outside any control takes a tab stop and shows its whole text', async () => {
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
      await oneTip();
      const tips = await page.evaluate(() =>
        [...document.querySelectorAll('.sui-tooltip:popover-open')].map((tip) =>
          tip.textContent?.trim()
        )
      );
      assert.deepEqual(tips, [await label.textContent()]);
    });

    test('AC2 a time outside any control takes a tab stop and shows its whole instant', async () => {
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
      await oneTip();
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
    });

    // A popover scrolls by default and a tip's trimmed words overhang its box, so a tip that
    // scrolled would be a keyboard stop of its own, and closing it on blur dropped focus to the page.
    test('a shown tip is never a tab stop, so Tab goes on to the next control', async () => {
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
    });
  });

  test(
    'U6 a stack of toasts taller than the screen scrolls, so each toast the keyboard reaches is in view',
    long,
    async () => {
      const page = await open({ viewport: { width: 320, height: 640 } });
      try {
        const raise = page.locator('#toaster button', { hasText: 'Sync Repositories' });
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

  // WCAG 2.4.11: a toast that stays sits over the page's foot, where Tab scrolls each new
  // control into view. Only the end of the document, which cannot scroll any further, and a
  // control taller than the room above the stack may stay under it.
  test('a lasting toast never covers the control that takes focus', long, async () => {
    const page = await open({ viewport: { width: 375, height: 740 } });
    try {
      // The sink pads its own foot for its floating button, which would clear the toast too.
      await page.addStyleTag({ content: ':root { scroll-padding-block-end: 0; }' });
      await page.locator('#toaster button', { hasText: 'Sync Repositories' }).click();
      await page.waitForSelector('.sui-toaster:popover-open .sui-toast');
      await page.evaluate(() => {
        /** @type {HTMLElement | null} */ (document.activeElement)?.blur();
        scrollTo(0, 0);
      });
      const covered = [];
      for (let step = 0; step < 120; step++) {
        await page.keyboard.press('Tab');
        const under = await page.evaluate(() => {
          const focused = document.activeElement;
          if (!focused || focused === document.body || focused.closest('.sui-toaster')) return null;
          const box = focused.getBoundingClientRect();
          const toasts = [...document.querySelectorAll('.sui-toaster:popover-open .sui-toast')].map(
            (toast) => toast.getBoundingClientRect()
          );
          const top = Math.min(...toasts.map((toast) => toast.top));
          const atEnd = scrollY + innerHeight >= document.documentElement.scrollHeight - 1;
          if (atEnd || box.height > top || box.height === 0) return null;
          const meets = toasts.some(
            (toast) =>
              Math.min(box.right, toast.right) > Math.max(box.left, toast.left) &&
              Math.min(box.bottom, toast.bottom) > Math.max(box.top, toast.top)
          );
          return meets ? focused.getAttribute('aria-label') || focused.textContent?.trim() : null;
        });
        if (under) covered.push(under);
      }
      assert.deepEqual(covered, []);
    } finally {
      await page.close();
    }
  });

  test(
    'K9 a time writes its whole instant in the page language once the clock ticks',
    long,
    async () => {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      try {
        // Installed before the first load, so the page's clock is fake from its first timer.
        await page.clock.install();
        await visit(page, allSections(url));
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

  // The open copy once dropped its mark under the label on a phone, wrapped a one-sentence tip
  // there, and stood white on the white card. The Placement copies once showed bare
  // marks, so a still shot showed neither side.
  test(
    'help tip copies hang over and under their marks, by their labels, on one line',
    long,
    async () => {
      const page = await open({ viewport: { width: 390, height: 844 } });
      /** @param {Element} tip @param {DOMRect} m */
      const arrowOf = (tip, m) => {
        const t = tip.getBoundingClientRect();
        const arrow = getComputedStyle(tip, '::after');
        const size = parseFloat(arrow.width);
        const stroke = parseFloat(getComputedStyle(tip).borderTopWidth);
        const centre = {
          x: t.left + stroke + parseFloat(arrow.left) + size / 2,
          y: t.top + stroke + parseFloat(arrow.top) + size / 2
        };
        const reach = size * Math.SQRT1_2;
        const over = t.bottom <= m.top;
        const range = document.createRange();
        range.selectNodeContents(tip);
        return {
          over,
          // The live tip lands on the pixel grid, so every gap is read to the whole pixel.
          gap: Math.round(over ? m.top - t.bottom : t.top - m.bottom),
          lines: new Set([...range.getClientRects()].map((line) => Math.round(line.top))).size,
          start: t.left - m.left,
          aim: centre.x - (m.left + m.width / 2),
          point: over ? m.top - (centre.y + reach) : centre.y - reach - m.bottom
        };
      };
      const copies = async (on = page) =>
        /** @type {{ side: string, over: boolean, beside: boolean, ink: boolean, lines: number, aim: number }[]} */ (
          await on.evaluate(`[...document.querySelectorAll('#help-tip .sui-help-tip-preview')].map((copy) => {
          const arrowOf = ${arrowOf};
          const mark = copy.querySelector('.sui-help-tip');
          const tip = copy.querySelector('.sui-tooltip');
          const [w, m] = [copy.closest('.label').querySelector('.words'), mark].map((part) =>
            part.getBoundingClientRect()
          );
          const probe = document.createElement('span');
          probe.style.color = 'var(--sui-text-primary)';
          probe.style.backgroundColor = 'var(--sui-surface-base)';
          tip.append(probe);
          const look = getComputedStyle(probe);
          const [primary, base] = [look.color, look.backgroundColor];
          probe.remove();
          const style = getComputedStyle(tip);
          return {
            side: tip.dataset.side,
            beside: m.left >= w.right && m.top < w.bottom && m.bottom > w.top,
            ink: style.backgroundColor === primary && style.color === base,
            ...arrowOf(tip, m)
          };
        })`)
        );
      try {
        const phone = await copies();
        assert.deepEqual(
          phone.map(({ side, over }) => [side, over]),
          [
            ['block-start', true],
            ['block-end', false]
          ],
          'the Placement copies do not hang over and under their marks'
        );
        for (const copy of phone) {
          assert.ok(copy.beside, `the ${copy.side} mark drops under its label`);
          assert.equal(copy.lines, 1, `the ${copy.side} one-sentence tip wraps on a phone`);
          assert.ok(copy.ink, `the ${copy.side} tip is not inverted, primary ink under base words`);
        }
        await page.setViewportSize({ width: 1440, height: 900 });
        const desktop = await copies();
        const mark = page.locator('#help-tip .sui-help-tip:not(.sui-help-tip-preview *)').first();
        await page.keyboard.press('Shift');
        await mark.focus();
        await page.locator('.sui-tooltip:popover-open').waitFor();
        // The live tip once rose over the specimen's name, and the mark's ring touched the
        // label's last letter.
        const live = await page.evaluate(`(() => {
          const arrowOf = ${arrowOf};
          const button = document.activeElement;
          const tip = document.querySelector('.sui-tooltip:popover-open');
          const [m, t, name, w] = [
            button,
            tip,
            button.closest('figure').querySelector('figcaption'),
            button.closest('.label').querySelector('.words')
          ].map((part) => part.getBoundingClientRect());
          const style = getComputedStyle(button);
          const ring = parseFloat(style.outlineOffset) + parseFloat(style.outlineWidth);
          return {
            side: 'live',
            clearOfName: t.top >= name.bottom,
            ringRoom: m.left - ring - w.right,
            ...arrowOf(tip, m)
          };
        })()`);
        // A mark set right to left in a left-to-right tip hangs the tip from its right edge, and
        // the arrow, which stands from the tip's own start, still points at the mark.
        await page.evaluate(() => /** @type {HTMLElement} */ (document.activeElement).blur());
        await page.locator('.sui-tooltip:popover-open').waitFor({ state: 'hidden' });
        await mark.evaluate((button) => button.setAttribute('dir', 'rtl'));
        await page.keyboard.press('Shift');
        await mark.focus();
        await page.locator('.sui-tooltip:popover-open').waitFor();
        const mixed = await page.evaluate(`(() => {
          const arrowOf = ${arrowOf};
          const button = document.activeElement;
          const tip = document.querySelector('.sui-tooltip:popover-open');
          return { side: 'mixed', ltr: getComputedStyle(tip).direction === 'ltr', ...arrowOf(tip, button.getBoundingClientRect()) };
        })()`);
        await mark.evaluate((button) => button.removeAttribute('dir'));
        assert.ok(mixed.ltr, "the tip took the mark's direction, so the case is not mixed");
        assert.ok(
          Math.abs(mixed.aim) <= 0.5,
          `the arrow of a left-to-right tip on a right-to-left mark misses it by ${mixed.aim}px`
        );
        // Every tip starts at its mark with an arrow on the mark's centre whose point stands 8px
        // off it, clear of the focus ring (L-35), so a copy stands as far off as the live tip.
        for (const tip of [live, ...desktop]) {
          assert.equal(tip.gap, live.gap, `the ${tip.side} copy stands off unlike the live tip`);
          assert.equal(tip.lines, 1, `the ${tip.side} one-sentence tip wraps`);
          assert.ok(Math.abs(tip.start) <= 0.5, `the ${tip.side} tip does not start at its mark`);
          assert.ok(Math.abs(tip.aim) <= 0.5, `the ${tip.side} arrow misses the mark's centre`);
          assert.ok(
            Math.abs(tip.point - 8) <= 0.5,
            `the ${tip.side} arrow stands ${tip.point}px off`
          );
        }
        // The server render is the first frame and the only one without script, so its copies
        // aim at their marks before any measure runs.
        const still = await browser.newPage({
          viewport: { width: 1440, height: 900 },
          javaScriptEnabled: false
        });
        try {
          await still.goto(allSections(url));
          await still.evaluate(() => document.fonts.ready);
          for (const tip of await copies(still))
            assert.ok(
              Math.abs(tip.aim) <= 0.5,
              `the ${tip.side} arrow misses the mark's centre without script by ${tip.aim}px`
            );
        } finally {
          await still.close();
        }
        assert.ok(live.clearOfName, 'the live tip covers its specimen name');
        assert.ok(
          live.ringRoom >= 4 - 0.5,
          `the focus ring stands ${live.ringRoom}px off the words`
        );
      } finally {
        await page.close();
      }
    }
  );

  // The icon copy once stood on a 28px trigger beside a 34px one, so its menu started 6px higher.
  test(
    'action menu copies: regular items, menus on one line, phone reasons under triggers',
    long,
    async () => {
      const page = await open({ viewport: { width: 1440, height: 900 } });
      try {
        const tops = await page.evaluate(() =>
          [...document.querySelectorAll('#action-menu .sui-action-menu-preview .sui-popover')].map(
            (popover) => popover.getBoundingClientRect().top
          )
        );
        assert.ok(tops.length > 1, `the section shows ${tops.length} open menus`);
        assert.equal(new Set(tops).size, 1, `the menus start at ${tops.join(', ')}`);
        // The open icon copy ends a named row, as the live icon trigger does, and the name centres
        // on the trigger, not on the menu that hangs in the row's flow.
        const row = await page.evaluate(() => {
          const preview = document.querySelector(
            '#action-menu .sui-action-menu-preview[data-align="end"]'
          );
          const name = preview?.parentElement?.querySelector('.name');
          const trigger = preview?.querySelector('button');
          if (!name || !trigger) return null;
          const [n, t] = [name, trigger].map((node) => node.getBoundingClientRect());
          return Math.abs(n.top + n.height / 2 - (t.top + t.height / 2)) < 1;
        });
        assert.equal(row, true, 'the open icon copy has a name centred on its trigger');
        // The live icon row and its open copy are one row, so they draw at one width, and the two
        // disabled triggers' reasons stand on one line beside triggers of two heights.
        const widths = await page.evaluate(() => [
          ...new Set(
            [...document.querySelectorAll('#action-menu .row')].map((row) => {
              const box = row.getBoundingClientRect();
              const end = /** @type {Element} */ (
                row.querySelector('button')
              ).getBoundingClientRect();
              return `${box.width} ending ${box.right - end.right}`;
            })
          )
        ]);
        assert.equal(widths.length, 1, `the icon rows are ${widths.join(', ')}px wide`);
        assert.match(widths[0], / ending 0$/, 'a row ends with its trigger');
        // The row's band is one control tall, so its trigger centres on the line the buttons in
        // the next specimen stand on.
        const centres = await page.evaluate(() => {
          const centre = (/** @type {Element | null} */ node) => {
            const box = /** @type {Element} */ (node).getBoundingClientRect();
            return box.top + box.height / 2;
          };
          const [row] = document.querySelectorAll('#action-menu .row');
          const beside = [...document.querySelectorAll('#action-menu .actions button')];
          return [centre(row.querySelector('button')), centre(beside[0])];
        });
        assert.equal(
          centres[0],
          centres[1],
          `the row's trigger centres at ${centres.join(' vs ')}`
        );
        const reasonTops = await page.evaluate(() => [
          ...new Set(
            [...document.querySelectorAll('#action-menu .locked .reason')].map(
              (reason) => reason.getBoundingClientRect().top
            )
          )
        ]);
        assert.equal(reasonTops.length, 1, `the reasons start at ${reasonTops.join(', ')}`);
        // The row is as wide as the menu that hangs from it, so the two share both edges, and no
        // menu outgrows 20rem inside its edge.
        const hung = await page.evaluate(() => {
          const row = /** @type {Element} */ (document.querySelector('#action-menu .open'));
          const menus = [
            ...document.querySelectorAll('#action-menu .sui-action-menu-preview .sui-popover')
          ];
          const menu = /** @type {Element} */ (row.querySelector('.sui-popover'));
          return {
            start: menu.getBoundingClientRect().left - row.getBoundingClientRect().left,
            widest: Math.max(...menus.map((each) => each.getBoundingClientRect().width))
          };
        });
        assert.equal(hung.start, 0, `the menu starts ${hung.start}px inside its row`);
        assert.ok(hung.widest <= 322, `a menu is ${hung.widest}px wide`);
        // A disabled glyph wears its words' ink under the one disabled opacity (L-40).
        const inks = await page.evaluate(() => {
          const ink = (/** @type {string} */ selector) =>
            getComputedStyle(/** @type {Element} */ (document.querySelector(selector))).color;
          return {
            trigger: ink('#action-menu .locked .sui-icon-button'),
            button: ink('#action-menu .locked .sui-button'),
            icon: ink(
              '#action-menu .sui-action-menu-item[aria-disabled="true"] .sui-action-menu-icon'
            ),
            label: ink(
              '#action-menu .sui-action-menu-item[aria-disabled="true"] .sui-action-menu-label'
            )
          };
        });
        assert.equal(
          inks.trigger,
          inks.button,
          'a disabled icon trigger is dimmer than its button'
        );
        assert.equal(inks.icon, inks.label, 'a disabled item icon is dimmer than its name');
        // The open copy is the live row: its trigger is the quiet one the live row ends with.
        const sizes = await page.evaluate(() =>
          ['.row:not(.open) .sui-icon-button', '.open .sui-icon-button'].map(
            (selector) =>
              /** @type {Element} */ (
                document.querySelector(`#action-menu ${selector}`)
              ).getBoundingClientRect().height
          )
        );
        assert.equal(sizes[1], sizes[0], "the open copy's trigger is another size");
        // A list row that cannot be chosen draws its name in its reason's ink at full strength, so
        // the 13px reason never outranks the 14px name it qualifies (L-40).
        const offRows = await page.evaluate(() =>
          ['action-menu', 'select', 'combobox'].map((kind) => {
            const note = kind === 'action-menu' ? 'description' : 'note';
            const row = [
              ...document.querySelectorAll(
                `.sui-${kind}-${kind === 'action-menu' ? 'item' : 'option'}[aria-disabled="true"]`
              )
            ].find((each) => each.querySelector(`.sui-${kind}-${note}`));
            if (!row) return `${kind}: no disabled row with a reason`;
            const [label, reason] = [`.sui-${kind}-label`, `.sui-${kind}-${note}`].map((selector) =>
              getComputedStyle(/** @type {Element} */ (row.querySelector(selector)))
            );
            return `${kind}: ${label.opacity} ${label.color === reason.color ? 'reason ink' : label.color}`;
          })
        );
        assert.deepEqual(offRows, [
          'action-menu: 1 reason ink',
          'select: 1 reason ink',
          'combobox: 1 reason ink'
        ]);
        // A lit item's glyph rises with its words, as an icon button's glyph does on hover.
        const lit = await page.evaluate(() => {
          const item = /** @type {Element} */ (
            document.querySelector(
              '#action-menu .sui-action-menu-item.active:has(.sui-action-menu-icon)'
            )
          );
          return [
            item.querySelector('.sui-action-menu-icon'),
            item.querySelector('.sui-action-menu-label')
          ].map((part) => getComputedStyle(/** @type {Element} */ (part)).color);
        });
        assert.equal(lit[0], lit[1], "a lit item's glyph stays at rest under its risen words");
        // A copy's lit item is where the keyboard is, so it wears the ring, as a select's and a
        // combobox's lit row do.
        const rings = await page.evaluate(() =>
          [...document.querySelectorAll('#action-menu .sui-action-menu-item.active')].map(
            (item) => getComputedStyle(item).outlineStyle
          )
        );
        assert.ok(rings.length > 0, 'no lit item');
        assert.deepEqual(new Set(rings), new Set(['solid']));
        // A menu item that wraps never leaves one word alone on its last line.
        const lone = await page.evaluate(() =>
          [...document.querySelectorAll('#action-menu .sui-action-menu-label')].flatMap((label) => {
            const text = label.firstChild;
            if (!(text instanceof Text)) return [];
            const tops = [...text.data.matchAll(/\S+/g)].map(({ index, 0: word }) => {
              const range = document.createRange();
              range.setStart(text, index);
              range.setEnd(text, index + word.length);
              return Math.round(range.getBoundingClientRect().top);
            });
            const last = tops.filter((top) => top === tops.at(-1)).length;
            return new Set(tops).size > 1 && last < 2 ? [text.data] : [];
          })
        );
        assert.deepEqual(lone, []);
        // An item's description reads a type step under its name, as an option's note does (L-25).
        const steps = await page.evaluate(() =>
          [...document.querySelectorAll('#action-menu .sui-action-menu-description')].map(
            (description) => {
              const label = description.parentElement?.querySelector('.sui-action-menu-label');
              const size = (/** @type {Element} */ node) =>
                parseFloat(getComputedStyle(node).fontSize);
              return label ? size(label) - size(description) : 0;
            }
          )
        );
        assert.ok(steps.length > 0, 'the section shows no item description');
        for (const step of steps) assert.equal(step, 1, 'a description is 1px under its name');
        // A menu item is set at the regular weight, as an option in a list is (L-25).
        const weights = await page.evaluate(() => [
          ...new Set(
            [...document.querySelectorAll('#action-menu .sui-action-menu-item')].map(
              (item) => getComputedStyle(item).fontWeight
            )
          )
        ]);
        assert.deepEqual(weights, ['400']);
        // On a phone the icon trigger keeps its reason beside it while the line holds both, and
        // the reason drops under it as a whole line when not, as the button trigger's always does.
        const place = () =>
          page.evaluate(() =>
            [...document.querySelectorAll('#action-menu .locked')].map((locked) => {
              const trigger = /** @type {Element} */ (locked.querySelector('button'));
              const reason = /** @type {Element} */ (locked.querySelector('.reason'));
              const [t, r] = [trigger, reason].map((node) => node.getBoundingClientRect());
              return r.top >= t.bottom && r.left === t.left
                ? 'under'
                : r.left >= t.right && r.top < t.bottom
                  ? 'beside'
                  : `at ${r.left - t.left}, ${r.top - t.top}`;
            })
          );
        await page.setViewportSize({ width: 390, height: 800 });
        assert.deepEqual(await place(), ['beside', 'under']);
        await page.setViewportSize({ width: 320, height: 800 });
        assert.deepEqual(await place(), ['under', 'under']);
      } finally {
        await page.close();
      }
    }
  );

  // At twice the text size the menu's 13rem floor outgrew a phone, so the menu scrolled sideways
  // inside its popover and cut its separator.
  test(
    'an action menu or addition preview fits the window and its line at twice the text size',
    long,
    async () => {
      const page = await open({ viewport: { width: 375, height: 800 } });
      try {
        await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
        const previews = await page.evaluate(() =>
          [
            ...document.querySelectorAll(
              '#action-menu .sui-action-menu-preview, #addition-picker .sui-addition-preview'
            )
          ].map((preview) => {
            const popover = /** @type {Element} */ (preview.querySelector('.sui-popover'));
            const box = popover.getBoundingClientRect();
            const trigger = /** @type {Element} */ (
              preview.querySelector('button')
            ).getBoundingClientRect();
            const line = /** @type {Element} */ (preview.closest('.body')).getBoundingClientRect();
            const end = preview.getAttribute('data-align') === 'end';
            return {
              scrolls: popover.scrollWidth > popover.clientWidth,
              inLine: box.left >= line.left - 0.5 && box.right <= line.right + 0.5,
              aligned: Math.abs(end ? box.right - trigger.right : box.left - trigger.left) < 0.5
            };
          })
        );
        assert.ok(previews.length > 0, 'the section shows no open menu');
        for (const preview of previews)
          assert.deepEqual(preview, { scrolls: false, inLine: true, aligned: true });
        const trigger = page
          .locator('#action-menu button[aria-label="Repository actions"]')
          .first();
        await trigger.scrollIntoViewIfNeeded();
        await trigger.click();
        const popover = page.locator('.sui-popover:popover-open');
        await popover.waitFor();
        const floating = await popover.evaluate((element) => {
          const box = element.getBoundingClientRect();
          return {
            scrolls: element.scrollWidth > element.clientWidth,
            inside: box.left >= 0 && box.right <= document.documentElement.clientWidth
          };
        });
        assert.deepEqual(floating, { scrolls: false, inside: true });
        await page.keyboard.press('Escape');
      } finally {
        await page.close();
      }
    }
  );

  // An open trigger keeps its hover paint whatever its tone, so a filled one never takes a grey
  // edge while its menu is open.
  test('an open menu trigger of every tone wears its hover paint', long, async () => {
    const page = await open();
    try {
      const trigger = page
        .locator('#action-menu button.sui-button[aria-expanded]:not([data-tone="ghost"])')
        .first();
      await trigger.scrollIntoViewIfNeeded();
      const paint = () =>
        trigger.evaluate((button) => {
          const look = getComputedStyle(button);
          return `${look.backgroundColor} ${look.backgroundImage} ${look.borderTopColor}`;
        });
      for (const tone of ['default', 'signal', 'decision', 'stop', 'stop-quiet']) {
        await trigger.evaluate((button, tone) => button.setAttribute('data-tone', tone), tone);
        await trigger.hover();
        await atRest(page);
        const hovered = await paint();
        await trigger.click();
        await page.locator('.sui-popover:popover-open').waitFor();
        await page.mouse.move(0, 0);
        await atRest(page);
        assert.equal(await paint(), hovered, `an open ${tone} trigger leaves its hover paint`);
        await page.keyboard.press('Escape');
        await trigger.evaluate((button) => button.blur());
      }
    } finally {
      await page.close();
    }
  });

  test(
    "a disabled destructive item draws its glyph in its name's ink, not the danger ink",
    long,
    async () => {
      const page = await openMount(browser, url);
      try {
        const inks = await page.evaluate(() => {
          const { lib, mount, flushSync } = /** @type {any} */ (window);
          mount(lib.ActionMenu, {
            target: document.body,
            props: {
              label: 'Repository actions',
              icon: 'more',
              preview: true,
              items: [
                {
                  label: 'Delete',
                  icon: 'trash',
                  tone: 'stop',
                  disabled: true,
                  description: 'Owners only'
                }
              ]
            }
          });
          flushSync();
          const item = /** @type {Element} */ (document.querySelector('.sui-action-menu-item'));
          return ['.sui-action-menu-icon', '.sui-action-menu-label'].map(
            (part) => getComputedStyle(/** @type {Element} */ (item.querySelector(part))).color
          );
        });
        assert.equal(inks[0], inks[1], 'the glyph of a disabled stop item stays red');
      } finally {
        await page.close();
      }
    }
  );

  test('a discard after a failed save keeps its notice and Undo', long, async () => {
    const page = await openMount(browser, url);
    try {
      await page.evaluate(() => {
        const { lib, mount, flushSync, state, get, set } = /** @type {any} */ (window);
        const dirty = state(true);
        const saving = state(false);
        mount(lib.SaveBar, {
          target: document.body,
          props: {
            get dirty() {
              return get(dirty);
            },
            get saving() {
              return get(saving);
            },
            // The save ends when the test says so, so a busy machine cannot end it before
            // the test reads its busy words.
            onsave() {
              set(saving, true);
              Object.assign(window, { saved: () => set(saving, false) });
            },
            ondiscard() {
              set(dirty, false);
              return () => set(dirty, true);
            }
          }
        });
        flushSync();
      });
      await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
      await page.getByRole('button', { name: 'Saving…', exact: true }).waitFor();
      await page.evaluate(() => /** @type {any} */ (window).saved());
      await page.getByRole('button', { name: 'Save Changes', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Discard', exact: true }).click();
      await page.waitForFunction(
        () =>
          document.querySelector('.sui-save-bar .title')?.textContent ===
          'You discarded your changes',
        null,
        brief
      );
      const undo = page.getByRole('button', { name: 'Undo', exact: true });
      await undo.click();
      await page.waitForFunction(
        () =>
          document.querySelector('.sui-save-bar .title')?.textContent ===
          'You have unsaved changes',
        null,
        brief
      );
    } finally {
      await page.close();
    }
  });

  suite('inline anchoring on one mounted page', inOrder, () => {
    /** @type {import('playwright-core').Page} */
    let page;
    before(async () => {
      page = await openMount(browser, url, { viewport: { width: 900, height: 600 } });
    });
    after(() => page?.close());

    test('inline anchoring publishes the anchor width', async () => {
      const found = await page.evaluate(() => {
        const { place } = /** @type {any} */ (window).anchor;
        const anchor = document.createElement('button');
        anchor.style.cssText = 'position:fixed;left:100px;top:100px;width:100px;height:40px';
        const floating = document.createElement('div');
        floating.style.cssText =
          'position:absolute;width:var(--sui-floating-anchor-inline);max-height:var(--sui-floating-available-block);overflow:auto';
        const content = document.createElement('div');
        content.style.cssText = 'width:300px;height:2000px';
        floating.append(content);
        document.body.append(anchor, floating);
        place(floating, anchor, { side: 'inline-end' });
        const found = {
          custom: floating.style.getPropertyValue('--sui-floating-anchor-inline'),
          width: floating.getBoundingClientRect().width
        };
        // The next test measures the room of the same window.
        anchor.remove();
        floating.remove();
        return found;
      });
      assert.deepEqual(found, { custom: '100px', width: 100 });
    });

    test('inline anchoring replaces a stale block cap with its own viewport room', async () => {
      const found = await page.evaluate(() => {
        const { place } = /** @type {any} */ (window).anchor;
        const anchor = document.createElement('button');
        anchor.style.cssText = 'position:fixed;left:100px;top:500px;width:100px;height:40px';
        const floating = document.createElement('div');
        floating.style.cssText =
          'position:absolute;width:100px;max-height:var(--sui-floating-available-block);overflow:auto';
        const content = document.createElement('div');
        content.style.blockSize = '300px';
        floating.append(content);
        document.body.append(anchor, floating);
        floating.dataset.side = 'block-end';
        place(floating, anchor, { side: 'block-end' }, true);
        const stale = floating.style.getPropertyValue('--sui-floating-available-block');
        place(floating, anchor, { side: 'inline-end', align: 'start' });
        const box = floating.getBoundingClientRect();
        return {
          stale,
          available: floating.style.getPropertyValue('--sui-floating-available-block'),
          height: box.height,
          bottom: box.bottom
        };
      });
      assert.equal(found.stale, '48px');
      // Beside an anchor near the foot, the box slides up rather than shrinking to the room
      // under the anchor's top.
      assert.equal(found.available, '584px');
      assert.equal(found.height, 300);
      assert.ok(found.bottom <= 592, `the inline box reaches ${found.bottom}px`);
    });

    // The side follows the anchor's direction and the tip's start can follow another, so an
    // arrow set by the tip's start once pointed away from an anchor of the other direction.
    test('a tip beside an anchor of the other direction points its arrow at it', async () => {
      const cases = await page.evaluate(async () => {
        const { lib, mount, flushSync } = /** @type {any} */ (window);
        const found = [];
        for (const [tipDir, anchorDir] of [
          ['ltr', 'rtl'],
          ['rtl', 'ltr']
        ])
          for (const side of ['inline-start', 'inline-end']) {
            const host = document.createElement('div');
            host.dir = tipDir;
            host.style.cssText = 'position:fixed;left:400px;top:200px';
            const anchor = document.createElement('button');
            anchor.dir = anchorDir;
            anchor.textContent = 'Mark';
            host.append(anchor);
            document.body.append(host);
            mount(lib.Tooltip, { target: host, props: { anchor, text: 'Hi', side, open: true } });
            flushSync();
            await new Promise(requestAnimationFrame);
            const box = /** @type {HTMLElement} */ (host.querySelector('.sui-tooltip'));
            const [a, t] = [anchor, box].map((part) => part.getBoundingClientRect());
            const arrow = getComputedStyle(box, '::after');
            const at = parseFloat(arrow.left) + parseFloat(arrow.width) / 2;
            found.push({
              name: `${side} of a ${anchorDir} anchor in a ${tipDir} tip`,
              facing: t.left >= a.right ? 'left' : 'right',
              arrow: at < t.width / 2 ? 'left' : 'right'
            });
            host.remove();
          }
        return found;
      });
      for (const { name, facing, arrow } of cases)
        assert.equal(arrow, facing, `the arrow of the ${name} points away from it`);
    });

    // A `dir` passed to a field reached only its inner control, so its chevron or unit kept the
    // page's direction and stood over the words.
    test('a field set right to left on a left-to-right page ends with its chevron or unit', async () => {
      const found = await page.evaluate(() => {
        const { lib, mount, flushSync } = /** @type {any} */ (window);
        const options = [
          { value: 'alpha', label: 'Alpha' },
          { value: 'beta', label: 'Beta' }
        ];
        const fields = [
          [lib.Select, { label: 'Team', value: 'alpha', options }, '.sui-select-chevron'],
          [lib.Combobox, { 'aria-label': 'Team', options }, '.sui-combobox-chevron'],
          [lib.DurationInput, { label: 'Delay', value: 90 }, 'select']
        ];
        return fields.map(([component, props, end]) => {
          const host = document.body.appendChild(document.createElement('div'));
          host.style.cssText = 'inline-size:20rem';
          mount(component, { target: host, props: { ...props, dir: 'rtl' } });
          flushSync();
          const [field, part] = [host.firstElementChild, host.querySelector(end)].map((each) =>
            /** @type {Element} */ (each).getBoundingClientRect()
          );
          host.remove();
          return { end, left: part.left + part.width / 2 < field.left + field.width / 2 };
        });
      });
      for (const { end, left } of found)
        assert.ok(left, `the ${end} of a right-to-left field stands at its right, over the words`);
    });

    test('a box that follows a scrolled anchor reads every size before it writes one', async () => {
      const steps = await page.evaluate(() => {
        const { place } = /** @type {any} */ (window).anchor;
        const scroller = document.createElement('div');
        scroller.style.cssText = 'position:fixed;inset:0;overflow:auto';
        const anchor = document.createElement('button');
        anchor.style.cssText = 'display:block;margin:200px 100px 2000px;width:100px;height:40px';
        scroller.append(anchor);
        const floating = document.createElement('div');
        floating.style.cssText =
          'position:absolute;min-width:var(--sui-floating-anchor-inline);max-height:var(--sui-floating-available-block);overflow:auto';
        floating.append(Object.assign(document.createElement('div'), { style: 'height:100px' }));
        document.body.append(scroller, floating);
        place(floating, anchor, {});
        scroller.scrollTop = 50;
        void document.body.offsetHeight;

        // Any size read after a style write makes the browser lay the page out again.
        const log = /** @type {string[]} */ ([]);
        const style = CSSStyleDeclaration.prototype;
        const setProperty = style.setProperty;
        style.setProperty = function (...args) {
          log.push('write');
          return setProperty.apply(this, args);
        };
        const traps = /** @type {[object, string][]} */ ([
          [HTMLElement.prototype, 'offsetWidth'],
          [HTMLElement.prototype, 'offsetHeight'],
          [Element.prototype, 'scrollHeight']
        ]);
        const kept = traps.map(([proto, name]) => {
          const own = /** @type {PropertyDescriptor} */ (
            Object.getOwnPropertyDescriptor(proto, name)
          );
          Object.defineProperty(proto, name, {
            configurable: true,
            get() {
              log.push('read');
              return own.get?.call(this);
            }
          });
          return own;
        });
        try {
          place(floating, anchor, {}, true);
        } finally {
          style.setProperty = setProperty;
          traps.forEach(([proto, name], index) => Object.defineProperty(proto, name, kept[index]));
          scroller.remove();
          floating.remove();
        }
        return log;
      });
      assert.ok(steps.includes('write'), 'the scroll left the box cap as it was');
      assert.equal(
        steps.indexOf('read', steps.indexOf('write')),
        -1,
        `the placement read a size after a write: ${steps.join(' ')}`
      );
    });
  });

  suite('tips on a held clock, on one mounted page', inOrder, () => {
    /** @type {import('playwright-core').Page} */
    let page;
    before(async () => {
      page = await openMount(browser, url);
      // An installed clock still runs in real time until paused, so a slow runner would pass a
      // tip's delay between two steps of a test.
      await page.clock.install({ time: 0 });
      await page.clock.pauseAt(1000);
    });
    after(() => page?.close());

    test('the first tip waits, the next one in the group shows at once, and one long after waits again', async () => {
      await page.evaluate(() => {
        const { lib, mount, flushSync } = /** @type {any} */ (window);
        const row = document.body.appendChild(document.createElement('div'));
        row.style.cssText = 'display:flex;gap:48px;padding:120px';
        for (const label of ['Edit', 'Copy', 'Delete'])
          mount(lib.IconButton, { target: row, props: { icon: 'book', label } });
        flushSync();
      });
      // The tip just left lingers for a moment, so every open tip is read.
      const shown = () =>
        page.evaluate(() =>
          [...document.querySelectorAll('.sui-tooltip:popover-open')].map((tip) =>
            tip.textContent?.trim()
          )
        );
      const over = async (/** @type {string} */ label) => {
        const box = await page.getByRole('button', { name: label }).boundingBox();
        assert.ok(box);
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      };
      await over('Edit');
      await page.clock.runFor(200);
      assert.deepEqual(await shown(), [], 'the first tip showed at once');
      await page.clock.runFor(100);
      assert.deepEqual(await shown(), ['Edit'], 'the first tip never showed');
      await over('Copy');
      await page.clock.runFor(1);
      assert.ok((await shown()).includes('Copy'), 'the next tip in the group waited');
      await page.mouse.move(0, 0);
      await page.clock.runFor(1000);
      assert.deepEqual(await shown(), [], 'a tip stayed after the pointer left');
      await over('Delete');
      await page.clock.runFor(200);
      assert.deepEqual(await shown(), [], 'a tip long after the last one showed at once');
      await page.clock.runFor(100);
      assert.deepEqual(await shown(), ['Delete']);
    });
  });

  test(
    'a parent theme binding updates every switch and still follows the system',
    long,
    async () => {
      const page = await openMount(browser, url, { colorScheme: 'dark' });
      try {
        await page.evaluate(() => {
          localStorage.setItem('sui:theme', 'light');
          const { lib, mount, flushSync, state, get, set } = /** @type {any} */ (window);
          const value = state('system');
          const other = state('system');
          const binding = (/** @type {any} */ signal) => ({
            get value() {
              return get(signal);
            },
            set value(next) {
              set(signal, next);
            }
          });
          mount(lib.ThemeSwitch, {
            target: document.body,
            props: Object.assign(binding(value), { name: 'first-theme' })
          });
          mount(lib.ThemeSwitch, {
            target: document.body,
            props: Object.assign(binding(other), { name: 'second-theme' })
          });
          flushSync();
          Object.assign(window, { parentTheme: value, otherTheme: other });
        });
        const checked = () =>
          page.evaluate(() => ({
            first: /** @type {HTMLInputElement | null} */ (
              document.querySelector('input[name="first-theme"]:checked')
            )?.value,
            second: /** @type {HTMLInputElement | null} */ (
              document.querySelector('input[name="second-theme"]:checked')
            )?.value,
            root: document.documentElement.dataset.suiTheme
          }));
        assert.deepEqual(await checked(), { first: 'light', second: 'light', root: 'light' });
        await page.evaluate(() => {
          const { flushSync, set, parentTheme } = /** @type {any} */ (window);
          set(parentTheme, 'dark');
          flushSync();
        });
        assert.deepEqual(await checked(), { first: 'dark', second: 'dark', root: 'dark' });
        await page.evaluate(() => {
          const { flushSync, set, parentTheme } = /** @type {any} */ (window);
          set(parentTheme, 'system');
          flushSync();
        });
        assert.deepEqual(await checked(), { first: 'system', second: 'system', root: 'dark' });
      } finally {
        await page.close();
      }
    }
  );

  test(
    'an unchecked radio group is one native tab stop and can take initial dialog focus',
    long,
    async () => {
      const page = await openMount(browser, url);
      try {
        const stops = await page.evaluate(() => {
          const { tabStops } = /** @type {any} */ (window).focus;
          const group = document.createElement('div');
          group.innerHTML =
            '<button id="before">Before</button><input id="radio-one" type="radio" name="choice"><input id="radio-two" type="radio" name="choice"><a id="after" href="#after">After</a>';
          document.body.append(group);
          return tabStops(group).map((/** @type {HTMLElement} */ element) => element.id);
        });
        assert.deepEqual(stops, ['before', 'radio-one', 'after']);
        await page.locator('#before').focus();
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement?.id), 'radio-one');
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement?.id), 'after');
        const initial = await page.evaluate(() => {
          const { lib, mount, createRawSnippet, flushSync } = /** @type {any} */ (window);
          mount(lib.Modal, {
            target: document.body,
            props: {
              open: true,
              title: 'Choose one',
              children: createRawSnippet(() => ({
                render: () =>
                  '<input id="modal-one" type="radio" name="modal-choice"><input id="modal-two" type="radio" name="modal-choice">'
              }))
            }
          });
          flushSync();
          return document.activeElement?.id;
        });
        assert.equal(initial, 'modal-one');
      } finally {
        await page.close();
      }
    }
  );

  test(
    'confirmation waits for cross-realm promises and thenables, including rejection',
    long,
    async () => {
      const page = await openMount(browser, url);
      try {
        await page.evaluate(() => {
          const frame = document.createElement('iframe');
          document.body.append(frame);
          const ForeignPromise = /** @type {typeof Promise} */ (
            /** @type {any} */ (frame.contentWindow).Promise
          );
          const { lib, mount, flushSync, state, get, set } = /** @type {any} */ (window);
          const open = state(true);
          let mode = 'resolve';
          let settle = () => {};
          mount(lib.ConfirmDialog, {
            target: document.body,
            props: {
              get open() {
                return get(open);
              },
              set open(next) {
                set(open, next);
              },
              title: 'Finish this act?',
              consequence: 'The dialog waits for the answer',
              confirmLabel: 'Finish act',
              failedLabel: () => 'The act failed',
              onconfirm() {
                if (mode === 'resolve')
                  return new ForeignPromise((resolve) => {
                    settle = () => resolve(undefined);
                  });
                return {
                  then(
                    /** @type {unknown} */ _resolve,
                    /** @type {(reason?: unknown) => void} */ reject
                  ) {
                    settle = () => reject(new Error('refused'));
                  }
                };
              }
            }
          });
          flushSync();
          // The dialog's close event, a task after it shuts, ends the first answer; one opened
          // before it would be shut by it.
          const ends = { count: 0 };
          document.addEventListener('close', () => ends.count++, true);
          Object.assign(window, {
            ends,
            settle: () => settle(),
            rejectNext() {
              mode = 'reject';
              set(open, true);
              flushSync();
            }
          });
        });
        const confirm = page.getByRole('button', { name: 'Finish act', exact: true });
        await confirm.click();
        await page.waitForSelector('dialog[open][aria-busy="true"]');
        await page.evaluate(() => /** @type {any} */ (window).settle());
        await page.waitForFunction(() => /** @type {any} */ (window).ends.count > 0);
        await page.evaluate(() => /** @type {any} */ (window).rejectNext());
        await confirm.click();
        await page.waitForSelector('dialog[open][aria-busy="true"]');
        await page.evaluate(() => /** @type {any} */ (window).settle());
        await page.waitForFunction(
          () =>
            document
              .querySelector('dialog[open] .sui-modal-error')
              ?.textContent?.includes('The act failed'),
          null,
          brief
        );
        assert.equal(await page.locator('dialog[open][aria-busy="true"]').count(), 0);
      } finally {
        await page.close();
      }
    }
  );
  suite('controls a caller turns off, on one mounted page', inOrder, () => {
    /** @type {import('playwright-core').Page} */
    let page;
    before(async () => {
      page = await openMount(browser, url);
    });
    after(() => page?.close());

    // Each test mounts into its own host and takes it away, so the next one starts on an empty page.
    const clear = () =>
      page.evaluate(() => {
        const { unmount } = /** @type {any} */ (window);
        for (const part of /** @type {any} */ (window).parts ?? []) unmount(part);
        /** @type {any} */ (window).parts = [];
        document.querySelector('#host')?.remove();
      });

    test('a combobox turned read-only while its list is open shuts it and commits no draft', async () => {
      await page.evaluate(() => {
        const { lib, mount, flushSync, state, get, set } = /** @type {any} */ (window);
        const host = Object.assign(document.body.appendChild(document.createElement('div')), {
          id: 'host'
        });
        const readonly = state(false);
        /** @type {string[]} */
        const picked = [];
        /** @type {boolean[]} */
        const escapes = [];
        host.addEventListener('keydown', (event) => {
          if (event.key === 'Escape') escapes.push(event.defaultPrevented);
        });
        const combobox = mount(lib.Combobox, {
          target: host,
          props: {
            'aria-label': 'Team',
            options: [
              { value: 'alpha', label: 'Alpha' },
              { value: 'beta', label: 'Beta' }
            ],
            get readonly() {
              return get(readonly);
            },
            onselect: (/** @type {string} */ value) => picked.push(value)
          }
        });
        flushSync();
        Object.assign(window, {
          parts: [combobox],
          picked,
          escapes,
          lock(/** @type {boolean} */ on) {
            set(readonly, on);
            flushSync();
          }
        });
      });
      const field = page.getByRole('combobox', { name: 'Team' });
      await field.focus();
      await page.keyboard.type('Beta');
      await page.keyboard.press('ArrowDown');
      assert.equal(await field.getAttribute('aria-expanded'), 'true');
      await page.evaluate(() => /** @type {any} */ (window).lock(true));
      assert.equal(await field.getAttribute('aria-expanded'), 'false');
      await page.keyboard.press('Enter');
      await page.keyboard.press('Escape');
      const seen = await page.evaluate(() => {
        const { picked, escapes } = /** @type {any} */ (window);
        return { picked, escapes };
      });
      assert.deepEqual(seen.picked, [], 'a draft was committed while read-only');
      assert.deepEqual(seen.escapes, [false], 'Escape stopped at the shut list');
      await page.evaluate(() => /** @type {any} */ (window).lock(false));
      assert.equal(await field.getAttribute('aria-expanded'), 'false');
      await clear();
    });

    test('an owner replacement replaces a focused combobox draft, and a shrunk limit clamps its active row', async () => {
      await page.evaluate(() => {
        const { lib, mount, flushSync, state, get, set } = /** @type {any} */ (window);
        const host = Object.assign(document.body.appendChild(document.createElement('div')), {
          id: 'host'
        });
        const value = state('ts');
        const limit = state(100);
        const combobox = mount(lib.Combobox, {
          target: host,
          props: {
            'aria-label': 'Language',
            options: [
              { value: 'go', label: 'Go' },
              { value: 'ts', label: 'TypeScript' },
              { value: 'py', label: 'Python' }
            ],
            get value() {
              return get(value);
            },
            set value(next) {
              set(value, next);
            },
            get limit() {
              return get(limit);
            }
          }
        });
        flushSync();
        Object.assign(window, {
          parts: [combobox],
          own(/** @type {string} */ next) {
            set(value, next);
            flushSync();
          },
          cap(/** @type {number} */ next) {
            set(limit, next);
            flushSync();
          }
        });
      });
      const field = page.getByRole('combobox', { name: 'Language' });
      await field.fill('Pyth');
      await page.evaluate(() => /** @type {any} */ (window).own('go'));
      assert.equal(await field.inputValue(), 'Go');
      assert.ok(await field.evaluate((input) => document.activeElement === input));
      await field.evaluate((input) => input.blur());
      assert.equal(await field.inputValue(), 'Go');
      await field.fill('o');
      await page.keyboard.press('ArrowUp');
      await page.evaluate(() => /** @type {any} */ (window).cap(1));
      const active = await field.getAttribute('aria-activedescendant');
      assert.ok(active?.endsWith('-option-0'), `dangling active row: ${active}`);
      assert.equal(await page.locator(`#${active}`).count(), 1);
      await page.keyboard.press('Enter');
      assert.equal(await field.inputValue(), 'Go');
      await clear();
    });

    test('a refused combobox search says so', async () => {
      await page.evaluate(() => {
        const { lib, mount, flushSync } = /** @type {any} */ (window);
        const host = Object.assign(document.body.appendChild(document.createElement('div')), {
          id: 'host'
        });
        const combobox = mount(lib.Combobox, {
          target: host,
          props: {
            'aria-label': 'Owner',
            search: () => Promise.reject(new Error('The directory is offline'))
          }
        });
        flushSync();
        Object.assign(window, { parts: [combobox] });
      });
      await page.getByRole('combobox', { name: 'Owner' }).fill('oct');
      await page.waitForFunction(() =>
        /could not load/.test(document.querySelector('#host [role="status"]')?.textContent ?? '')
      );
      await clear();
    });

    test('a combobox copy keeps its typed text and offer when focus passes through it and draws a list taller than the window whole, and a sized combobox in a sentence keeps its chevron inside it', async () => {
      await page.evaluate(() => {
        const { lib, mount, flushSync } = /** @type {any} */ (window);
        const host = Object.assign(document.body.appendChild(document.createElement('div')), {
          id: 'host'
        });
        /** @type {string[]} */
        const picked = [];
        const copy = mount(lib.Combobox, {
          target: host,
          props: {
            'aria-label': 'Label',
            free: true,
            options: [{ value: 'bug', label: 'bug' }],
            previewText: 'feature',
            preview: true,
            onselect: (/** @type {string} */ value) => picked.push(value)
          }
        });
        const sentence = host.appendChild(document.createElement('p'));
        sentence.append('Before ');
        const sized = mount(lib.Combobox, {
          target: sentence,
          props: {
            'aria-label': 'Language',
            options: [{ value: 'ts', label: 'TypeScript' }],
            style: 'inline-size: 9rem'
          }
        });
        sentence.append(' after.');
        const long = mount(lib.Combobox, {
          target: host.appendChild(Object.assign(document.createElement('div'), { id: 'long' })),
          props: {
            'aria-label': 'Region',
            options: Array.from({ length: 60 }, (_, index) => ({
              value: `r${index}`,
              label: `Region ${index}`
            })),
            preview: true
          }
        });
        flushSync();
        Object.assign(window, { parts: [copy, sized, long], picked });
      });
      const copy = page.getByRole('combobox', { name: 'Label' });
      await copy.focus();
      await copy.evaluate((input) => input.blur());
      const seen = await page.evaluate(() => {
        const box = (/** @type {Element} */ node) => node.getBoundingClientRect();
        const input = /** @type {Element} */ (document.querySelector('#host p input'));
        const chevron = box(
          /** @type {Element} */ (input.parentElement?.querySelector('.sui-combobox-chevron'))
        );
        const field = box(input);
        const sentence = /** @type {Element} */ (document.querySelector('#host p'));
        return {
          picked: /** @type {any} */ (window).picked,
          shown: /** @type {HTMLInputElement} */ (
            document.querySelector('#host > .sui-combobox-preview input')
          ).value,
          offer: document.querySelectorAll('#host > .sui-combobox-preview [role="option"]').length,
          plus: [
            ...document.querySelectorAll('#host > .sui-combobox-preview [role="option"] svg')
          ].map((mark) => getComputedStyle(mark).visibility),
          inside: chevron.left >= field.left && chevron.right <= field.right,
          wrapper: box(/** @type {Element} */ (input.parentElement)).width - field.width,
          beside: field.left - box(sentence).left,
          cut: [...document.querySelectorAll('#long .sui-popover, #long .sui-combobox-list')].map(
            (layer) => layer.scrollHeight - layer.clientHeight
          )
        };
      });
      assert.deepEqual(seen.picked, [], 'focus passing through a copy commits nothing');
      assert.equal(seen.shown, 'feature');
      assert.equal(seen.offer, 1, 'the copy keeps its offer row');
      assert.deepEqual(seen.plus, ['visible'], 'a plus marks the offer as an entry to add');
      assert.ok(seen.inside, 'the chevron stands inside the sized field');
      assert.equal(seen.wrapper, 0, "the chevron's box is as wide as the field");
      assert.ok(seen.beside > 0, 'the field sits in the sentence, after its first word');
      assert.deepEqual(seen.cut, [0, 0], 'no layer of a long copy cuts a row or scrolls');
      await clear();
    });

    test('Escape on a caller-disabled select still closes the dialog around it', async () => {
      await page.evaluate(() => {
        const { lib, mount, createRawSnippet, flushSync, state, get, set } = /** @type {any} */ (
          window
        );
        const host = Object.assign(document.body.appendChild(document.createElement('div')), {
          id: 'host'
        });
        const open = state(true);
        const modal = mount(lib.Modal, {
          target: host,
          props: {
            get open() {
              return get(open);
            },
            set open(next) {
              set(open, next);
            },
            title: 'Pick a team',
            children: createRawSnippet(() => ({ render: () => '<div id="slot"></div>' }))
          }
        });
        flushSync();
        const select = mount(lib.Select, {
          target: document.getElementById('slot'),
          props: {
            'aria-label': 'Team',
            'aria-disabled': 'true',
            options: [
              { value: 'alpha', label: 'Alpha' },
              { value: 'beta', label: 'Beta' }
            ]
          }
        });
        flushSync();
        Object.assign(window, { parts: [select, modal] });
      });
      await page.getByRole('combobox', { name: 'Team' }).focus();
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('dialog[open]'), null, brief);
      await clear();
    });

    test('a caller-disabled switch and select keep focus and refuse a change', async () => {
      await page.evaluate(() => {
        const { lib, mount, flushSync } = /** @type {any} */ (window);
        const host = Object.assign(document.body.appendChild(document.createElement('div')), {
          id: 'host'
        });
        const parts = [
          mount(lib.Switch, { target: host, props: { label: 'Alerts', 'aria-disabled': 'true' } }),
          mount(lib.Select, {
            target: host,
            props: {
              'aria-label': 'Team',
              'aria-disabled': 'true',
              value: 'alpha',
              options: [
                { value: 'alpha', label: 'Alpha' },
                { value: 'beta', label: 'Beta' }
              ]
            }
          })
        ];
        flushSync();
        Object.assign(window, { parts });
      });
      const toggle = page.getByRole('switch', { name: 'Alerts' });
      await toggle.click({ force: true });
      assert.equal(await toggle.isChecked(), false, 'a click flipped the switch');
      await page.keyboard.press('Space');
      assert.equal(await toggle.isChecked(), false, 'Space flipped the switch');
      assert.ok(await toggle.evaluate((element) => document.activeElement === element));

      const team = page.getByRole('combobox', { name: 'Team' });
      await team.focus();
      await team.click({ force: true });
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      assert.equal(await team.inputValue(), 'alpha', 'the select took a new value');
      assert.equal(await team.evaluate((select) => select.matches(':open')), false);
      assert.ok(await team.evaluate((element) => document.activeElement === element));
      await clear();
    });
  });
});
