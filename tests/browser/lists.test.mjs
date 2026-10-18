import assert from 'node:assert/strict';
import { after, before, suite, test } from 'node:test';
import { brief, long, settles, startSink, together, visit } from './sink.mjs';

// The lists, pickers and settings behaviours that need a real keyboard, pointer and focus:
// where focus goes when a control leaves, what a reader can take back, and what is said.

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

suite('lists', together, () => {
  /** @param {import('playwright-core').BrowserContextOptions} [options] */
  async function open(options = {}) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, ...options });
    await visit(page, url);
    await page.evaluate(() => document.fonts.ready);
    return page;
  }

  /** @param {import('playwright-core').Page} page */
  const focused = (page) =>
    page.evaluate(() => {
      const element = document.activeElement;
      return element === document.body
        ? 'body'
        : `${element?.tagName.toLowerCase()} ${element?.getAttribute('aria-label') ?? element?.textContent?.trim() ?? ''} ${element instanceof HTMLInputElement ? element.value : ''}`.trim();
    });

  test(
    'L-89 the save bar hands focus on through discard, undo and a landed save',
    long,
    async () => {
      const page = await open();
      try {
        const section = page.locator('#save-bar');
        const field = section.getByLabel('Repository name').first();
        const bar = section.locator('.sui-save-bar').first();
        await field.scrollIntoViewIfNeeded();
        await field.focus();

        await bar.getByRole('button', { name: 'Discard' }).click();
        assert.match(await focused(page), /^button Undo/, 'focus did not move to Undo');
        assert.match(await bar.innerText(), /discarded/);

        await page.keyboard.press('Enter');
        assert.equal(
          await field.inputValue(),
          'smyklot-panel',
          'Undo did not bring the draft back'
        );
        assert.match(
          await focused(page),
          /^input .*smyklot-panel/,
          'focus did not return to the field'
        );

        // The shortcut saves from the field, and a landed save leaves focus where the reader is.
        await page.keyboard.press('ControlOrMeta+s');
        await bar.getByText('Your changes are saved').waitFor({ timeout: 4000 });
        assert.match(await focused(page), /^input /);

        await field.fill('smyklot-next');
        await bar.getByRole('button', { name: 'Save' }).click();
        await bar.getByText('Your changes are saved').waitFor({ timeout: 4000 });
        assert.match(
          await focused(page),
          /^input .*smyklot-next/,
          'focus fell when Save went away'
        );
      } finally {
        await page.close();
      }
    }
  );

  test(
    'L-50 a dragged thumb in a right-to-left page chooses the option under the pointer',
    long,
    async () => {
      const page = await open();
      try {
        await page.evaluate(() => (document.documentElement.dir = 'rtl'));
        const track = page.locator('#segmented-control fieldset.sui-segmented-track').first();
        await track.scrollIntoViewIfNeeded();
        const options = track.locator('label');
        const from = await options.nth(1).boundingBox();
        const to = await options.nth(2).boundingBox();
        assert.ok(from && to && to.x < from.x, 'the options did not run right to left');
        await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
        await page.mouse.down();
        await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
        await page.mouse.up();
        assert.equal(
          await track.evaluate((node) =>
            node.querySelector('input:checked')?.getAttribute('value')
          ),
          await options.nth(2).locator('input').getAttribute('value')
        );
      } finally {
        await page.close();
      }
    }
  );

  test(
    'L-89 focus follows a segmented control into its select when the room runs out',
    long,
    async () => {
      const page = await open();
      try {
        const control = page.locator('#segmented-control .sui-segmented').first();
        await control.scrollIntoViewIfNeeded();
        await control.locator('input:checked').focus();
        await control.evaluate((node) => {
          if (node.parentElement) node.parentElement.style.inlineSize = '4rem';
        });
        await page.waitForFunction(
          (node) => node?.querySelector('select') !== null,
          await control.elementHandle()
        );
        await page.waitForTimeout(50);
        assert.match(await focused(page), /^select/);
      } finally {
        await page.close();
      }
    }
  );

  test(
    'a scrolled table keeps its held heading over the columns and its focus ring over both',
    long,
    async () => {
      const page = await open({ viewport: { width: 375, height: 800 } });
      try {
        const frame = page.locator('#data-table .sui-data-table.held.scrolls .frame').first();
        await frame.scrollIntoViewIfNeeded();
        await page.keyboard.press('Shift');
        await frame.focus();
        await frame.evaluate((scroller) => (scroller.scrollLeft = 60));
        await page.waitForTimeout(200);
        const { onHeld, box, ring } = await frame.evaluate((scroller) => {
          const held = /** @type {Element} */ (scroller.querySelector('thead th:first-child'));
          const edge = held.getBoundingClientRect();
          const top = document.elementFromPoint(edge.right - 3, edge.top + edge.height / 2);
          const viewport = /** @type {Element} */ (scroller.parentElement);
          return {
            onHeld: held.contains(top),
            box: scroller.getBoundingClientRect().toJSON(),
            ring: getComputedStyle(viewport, '::after').outlineColor
          };
        });
        assert.ok(onHeld, 'a scrolled column painted over the held heading');
        // The ring's start side, where the held cells stand, is drawn in the ring's color.
        const shot = await page.screenshot({
          clip: { x: box.x + 0.5, y: box.y + box.height / 2, width: 1, height: 1 }
        });
        const pixel = await page.evaluate(
          async (data) => {
            const image = await createImageBitmap(await (await fetch(data)).blob());
            const context = new OffscreenCanvas(1, 1).getContext('2d');
            context?.drawImage(image, 0, 0);
            const [r, g, b] = context?.getImageData(0, 0, 1, 1).data ?? [];
            return `rgb(${r}, ${g}, ${b})`;
          },
          `data:image/png;base64,${shot.toString('base64')}`
        );
        assert.equal(pixel, ring, 'the held cells cover the focus ring');
      } finally {
        await page.close();
      }
    }
  );

  test('P7 a two-way theme switch keeps the shown theme when it is pressed', long, async () => {
    const page = await open({ colorScheme: 'dark' });
    try {
      const dark = page
        .locator('#theme-switch fieldset')
        .filter({ has: page.locator('input[name="sink-theme-two"]') })
        .locator('label', { hasText: 'Dark' });
      await dark.scrollIntoViewIfNeeded();
      await dark.click();
      assert.equal(await page.evaluate(() => localStorage.getItem('sui:theme')), 'dark');
    } finally {
      await page.close();
    }
    // Space on the shown option fires no click, and is a choice all the same.
    const keyboard = await open({ colorScheme: 'dark' });
    try {
      const radio = keyboard.locator('input[name="sink-theme-two"][value="dark"]');
      await radio.scrollIntoViewIfNeeded();
      await radio.focus();
      await keyboard.keyboard.press('Space');
      assert.equal(await keyboard.evaluate(() => localStorage.getItem('sui:theme')), 'dark');
    } finally {
      await keyboard.close();
    }
  });

  test('L-52 Tab out of the tools menu closes it', long, async () => {
    const page = await open();
    try {
      const trigger = page
        .locator('#list-toolbar')
        .getByRole('button', { name: 'Sort and filter' });
      await trigger.first().scrollIntoViewIfNeeded();
      await trigger.first().click();
      await page.locator(':popover-open .sui-list-toolbar-panel').waitFor();
      await page.keyboard.press('Tab');
      await page.waitForTimeout(250);
      assert.equal(await page.locator(':popover-open .sui-list-toolbar-panel').count(), 0);

      // Opened by a press, Shift+Tab hands focus back to the button, and that is leaving too.
      await trigger.first().click();
      await page.locator(':popover-open .sui-list-toolbar-panel').waitFor();
      await page.keyboard.press('Shift+Tab');
      await page.waitForTimeout(250);
      assert.equal(
        await page.locator(':popover-open .sui-list-toolbar-panel').count(),
        0,
        'Shift+Tab left the menu open'
      );
    } finally {
      await page.close();
    }
  });

  test(
    'the tools menu marks its chosen option across the whole option once it has grown',
    long,
    async () => {
      for (const width of [1440, 375]) {
        const page = await open({ viewport: { width, height: 900 } });
        try {
          const triggers = page
            .locator('#list-toolbar')
            .getByRole('button', { name: 'Sort and filter' });
          const count = await triggers.count();
          for (let index = 0; index < count; index++) {
            const trigger = triggers.nth(index);
            await trigger.scrollIntoViewIfNeeded();
            await trigger.click();
            const panel = page.locator(':popover-open .sui-list-toolbar-panel');
            await panel.waitFor();
            await page.waitForFunction(
              () =>
                document
                  .querySelector('.sui-popover:popover-open')
                  ?.getAnimations({ subtree: true }).length === 0
            );
            const marks = await panel.evaluate((element) =>
              [...element.querySelectorAll('.sui-segmented-track:has(input:checked)')].map(
                (track) => {
                  const option = track.querySelector('input:checked')?.closest('label');
                  const thumb = track.querySelector('.sui-segmented-thumb');
                  const [o, t] = [option?.getBoundingClientRect(), thumb?.getBoundingClientRect()];
                  return [o?.left, t?.left, o?.right, t?.right];
                }
              )
            );
            assert.ok(marks.length > 0, 'the menu holds no segmented choice');
            for (const [start, from, end, to] of marks)
              assert.ok(
                Math.abs(Number(start) - Number(from)) <= 0.25 &&
                  Math.abs(Number(end) - Number(to)) <= 0.25,
                `${width}px menu ${index}: the mark runs ${from}-${to} over the option at ${start}-${end}`
              );
            await page.keyboard.press('Escape');
            await settles(
              page.waitForFunction(
                () => !document.querySelector('.sui-popover:popover-open'),
                null,
                brief
              )
            );
          }
        } finally {
          await page.close();
        }
      }
    }
  );

  test(
    'AC4 a toolbar says its count again after a pick that leaves the count as it was',
    long,
    async () => {
      const page = await open();
      try {
        const bar = page.locator('#list-toolbar .sui-list-toolbar').filter({
          has: page.getByRole('searchbox', { name: 'Search repositories' })
        });
        const counted = bar.last();
        await counted.scrollIntoViewIfNeeded();
        await counted.getByRole('searchbox').fill('sui');
        await page.waitForTimeout(800);
        const status = counted.locator('[role="status"]');
        assert.equal((await status.textContent())?.trim(), '1 result');
        await status.evaluate((element) => {
          const said = /** @type {string[]} */ ([]);
          Object.assign(window, { said });
          new MutationObserver(() => said.push(element.textContent?.trim() ?? '')).observe(
            element,
            {
              childList: true,
              subtree: true
            }
          );
        });
        await counted.locator('label', { hasText: 'Active' }).first().click();
        await page.waitForTimeout(800);
        const said = await page.evaluate(
          () => /** @type {{ said: string[] }} */ (/** @type {unknown} */ (window)).said
        );
        assert.ok(
          said.includes('1 result'),
          `after the pick the status said ${JSON.stringify(said)}`
        );
      } finally {
        await page.close();
      }
    }
  );

  test(
    'P8 and P9 a pattern is judged once left, and an emptied one comes back with Undo',
    long,
    async () => {
      const page = await open();
      try {
        const list = page.locator('#pattern-entries .sui-pattern-entries').first();
        await list.scrollIntoViewIfNeeded();
        const problems = () => list.locator('.sui-pattern-problem').count();
        const before = await problems();

        await list.getByRole('button', { name: 'Add a branch pattern' }).click();
        await page.keyboard.type('a b');
        assert.equal(await problems(), before, 'a half-typed pattern was judged at once');
        await page.keyboard.press('Tab');
        assert.equal(await problems(), before + 1, 'a left pattern was not judged');

        const second = list.getByRole('textbox', { name: 'Pattern 2' });
        await second.fill('');
        await second.blur();
        assert.equal(await list.getByRole('textbox').count(), 4, 'the emptied entry stayed');
        await list.getByRole('button', { name: 'Undo' }).click();
        assert.equal(await list.getByRole('textbox', { name: 'Pattern 2' }).inputValue(), 'main');
        assert.match(await focused(page), /^input Pattern 2 main/);
      } finally {
        await page.close();
      }
    }
  );

  test('U5 typing in the addition menu jumps to the choice that starts with it', long, async () => {
    const page = await open();
    try {
      const trigger = page.locator('#addition-picker').getByRole('button', {
        name: 'Override another'
      });
      await trigger.scrollIntoViewIfNeeded();
      await trigger.click();
      await page.locator(':popover-open [role="menu"]').waitFor();
      await page.keyboard.press('s');
      assert.match(await focused(page), /^button Skip draft/);
    } finally {
      await page.close();
    }
  });

  test(
    'P9 a setting row offers Undo after a reset, and Undo hands focus to the reset',
    long,
    async () => {
      const page = await open();
      try {
        const row = page.locator('#setting-list .sui-setting-row').first();
        await row.scrollIntoViewIfNeeded();
        await row.getByRole('button', { name: /^Reset / }).click();
        assert.equal(await row.getAttribute('data-unsaved'), null);
        await row.getByRole('button', { name: /^Undo/ }).click();
        assert.notEqual(
          await row.getAttribute('data-unsaved'),
          null,
          'Undo did not put the change back'
        );
        assert.match(await focused(page), /^button Reset /);
      } finally {
        await page.close();
      }
    }
  );

  test('AC12 a removed chip and a removed pair are announced', long, async () => {
    const page = await open();
    try {
      const said = () =>
        page.evaluate(() =>
          [...document.querySelectorAll('[role="status"]')].map((node) => node.textContent?.trim())
        );
      const chip = page.locator('#chip').getByRole('button', { name: 'Remove topology/zone' });
      await chip.scrollIntoViewIfNeeded();
      // The status speaks once its words land, which a busy page may take a moment to do.
      const spoken = (/** @type {string} */ words) =>
        page
          .waitForFunction(
            (expected) =>
              [...document.querySelectorAll('[role="status"]')].some(
                (node) => node.textContent?.trim() === expected
              ),
            words,
            { timeout: 5000 }
          )
          .then(
            () => true,
            () => false
          );
      await chip.click();
      assert.ok(await spoken('Removed topology/zone'), 'the chip removal was not said');

      const pair = page.locator('#pair-entry').getByRole('button', { name: 'Remove ship' }).first();
      await pair.click();
      assert.ok(await spoken('Removed ship'), 'the pair removal was not said');
    } finally {
      await page.close();
    }
  });

  test('U5 a sortable heading sorts the rows and says so with aria-sort', long, async () => {
    const page = await open();
    try {
      const table = page.locator('#data-table table').first();
      await table.scrollIntoViewIfNeeded();
      await table.getByRole('button', { name: 'Repository' }).click();
      assert.equal(
        await table.locator('th[aria-sort]').evaluate((node) => node.textContent?.trim()),
        'Repository'
      );
      assert.equal(await table.locator('th[aria-sort]').getAttribute('aria-sort'), 'ascending');
      assert.equal(await table.locator('tbody th').first().textContent(), 'ledger');
    } finally {
      await page.close();
    }
  });

  test('K6 a retried error that leaves no control keeps focus where it stood', long, async () => {
    const page = await open();
    try {
      const retry = page
        .locator('#states .specimen', { hasText: 'Usage could not be loaded' })
        .getByRole('button', { name: 'Try again' });
      await retry.scrollIntoViewIfNeeded();
      await retry.focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);
      const at = await page.evaluate(() => ({
        body: document.activeElement === document.body,
        words: document.activeElement?.textContent?.trim()
      }));
      assert.equal(at.body, false, 'focus fell to the page');
      assert.match(at.words ?? '', /Usage for this month loaded/);
    } finally {
      await page.close();
    }
  });

  test(
    'L-63 a loaded page takes focus to its first new row and says how many rows came',
    long,
    async () => {
      const page = await open();
      try {
        const more = page.locator('#load-more-activity + .sui-load-more');
        const row = () =>
          page.evaluate(() =>
            document.activeElement
              ?.closest('#load-more-activity > li')
              ?.textContent?.trim()
              .replace(/\s+/g, ' ')
          );
        await more.scrollIntoViewIfNeeded();
        await more.getByRole('button').focus();
        // The sink fails its second page once, so the retry is pressed before anything lands.
        await page.keyboard.press('Enter');
        await more.getByRole('alert').waitFor();
        assert.match(
          await focused(page),
          /^button Try again/,
          'the failure took focus off the retry'
        );

        await page.keyboard.press('Enter');
        await settles(
          page.waitForFunction(
            () => document.activeElement?.closest('#load-more-activity'),
            null,
            brief
          )
        );
        assert.equal(await row(), 'Webhook delivered Event 5', 'focus stayed off the new rows');
        assert.equal(await more.getByRole('status').textContent(), '4 more loaded, 8 of 12 shown');

        await more.getByRole('button').focus();
        await page.keyboard.press('Enter');
        await more.getByRole('button').waitFor({ state: 'detached' });
        assert.equal(
          await row(),
          'Member promoted to owner Event 9',
          'the last page dropped focus'
        );
        assert.equal(await more.getByRole('status').textContent(), '4 more loaded, 12 of 12 shown');
      } finally {
        await page.close();
      }
    }
  );

  test(
    'P8 a pair editor left by a press outside or Tab keeps the draft, and Escape drops it',
    long,
    async () => {
      const page = await open();
      try {
        const add = page
          .locator('#pair-entry')
          .getByRole('button', { name: 'Add an alias' })
          .first();
        await add.scrollIntoViewIfNeeded();
        const editor = page.locator(':popover-open .sui-pair-editor');
        const key = editor.getByRole('textbox', { name: 'Alias' });

        await add.click();
        await key.fill('stage');
        await page.mouse.click(5, 5);
        await editor.waitFor({ state: 'detached' });
        await add.click();
        await editor.waitFor();
        await page.waitForTimeout(100);
        assert.equal(await key.inputValue(), 'stage', 'a press outside dropped the draft');

        // Tab past the last control of the editor leaves it, and that closes it.
        for (let step = 0; step < 6 && (await editor.count()) > 0; step++)
          await page.keyboard.press('Tab');
        await page.waitForTimeout(250);
        assert.equal(await editor.count(), 0, 'Tab out left the editor open');

        await add.click();
        await editor.waitFor();
        await page.waitForTimeout(100);
        assert.equal(await key.inputValue(), 'stage', 'Tab out dropped the draft');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(250);
        await add.click();
        await editor.waitFor();
        await page.waitForTimeout(100);
        assert.equal(await key.inputValue(), '', 'Escape kept the draft');
      } finally {
        await page.close();
      }
    }
  );

  test(
    'P8 typing a duplicate into one pattern leaves the others unjudged until it is left',
    long,
    async () => {
      const page = await open();
      try {
        const list = page.locator('#pattern-entries .sui-pattern-entries').first();
        await list.scrollIntoViewIfNeeded();
        const first = list.getByRole('textbox', { name: 'Pattern 1' });
        const second = await list.getByRole('textbox', { name: 'Pattern 2' }).inputValue();
        const before = await list.locator('.sui-pattern-problem').count();
        await first.click();
        await first.fill(second);
        assert.equal(
          await list.locator('.sui-pattern-problem').count(),
          before,
          'another entry was judged against a half-typed one'
        );
      } finally {
        await page.close();
      }
    }
  );

  test('S2 a setting list says when it loads, fails or has nothing to set', long, async () => {
    const page = await open();
    try {
      const states = page.locator('#setting-list .example', { hasText: 'List states' });
      await states.scrollIntoViewIfNeeded();
      const specimen = (/** @type {string} */ name) =>
        states.locator('.specimen').filter({ hasText: name });
      assert.equal(await specimen('Loading').locator('[aria-busy="true"]').count(), 1);
      assert.equal(await specimen('Failed').getByRole('alert').count(), 1);
      assert.equal(await specimen('Failed').getByRole('button', { name: 'Try again' }).count(), 1);
      assert.match(
        (await specimen('Nothing to set').textContent()) ?? '',
        /Settings show here once there are any/
      );
    } finally {
      await page.close();
    }
  });

  test('L-64 every placeholder shares one light that only transform moves', long, async () => {
    const page = await open();
    try {
      const problems = await page.evaluate(() => {
        const found = [];
        const frames = document.querySelectorAll(
          'main .sui-skeleton-rows:not(.slow), main tbody:has(> tr.placeholder), main .sui-chart-wait'
        );
        if (frames.length < 3) found.push(`only ${frames.length} placeholders were found`);
        for (const frame of frames) {
          const bars = frame.matches('.sui-chart-wait')
            ? [frame]
            : [...frame.querySelectorAll('.bar')];
          const lights = bars.flatMap((bar) => bar.getAnimations({ subtree: true }));
          if (lights.length !== bars.length)
            found.push(`${frame.className}: ${lights.length} lights for ${bars.length} bars`);
          for (const light of lights) {
            const moved = /** @type {KeyframeEffect} */ (light.effect)
              .getKeyframes()
              .flatMap((keyframe) => Object.keys(keyframe))
              .filter((key) => !['offset', 'computedOffset', 'easing', 'composite'].includes(key));
            if (moved.some((property) => property !== 'transform'))
              found.push(`${frame.className}: the light moves ${moved.join(', ')}`);
            if (light.startTime !== lights[0].startTime)
              found.push(`${frame.className}: the lights are out of step`);
          }
          // Each bar shows its part of a layer laid out on the whole placeholder, so every bar's
          // layer has the same box and the bars read as lit by one light.
          const layers = new Set(
            bars.map((bar) => {
              const layer = getComputedStyle(bar, '::after');
              return `${layer.left} ${layer.top} ${layer.width} ${layer.height}`;
            })
          );
          if (layers.size !== 1)
            found.push(`${frame.className}: its bars carry ${layers.size} separate lights`);
        }
        return found;
      });
      assert.deepEqual(problems, []);
    } finally {
      await page.close();
    }
  });

  test('P8 an entry that shows a problem follows its keystrokes', long, async () => {
    const page = await open();
    try {
      const list = page.locator('#pattern-entries .sui-pattern-entries').first();
      await list.scrollIntoViewIfNeeded();
      const problems = () => list.locator('.sui-pattern-problem').count();
      const before = await problems();
      // The fourth entry repeats the second from the start, so it shows its problem on focus,
      // and one keystroke that makes it unique clears that problem at once.
      await list.getByRole('textbox', { name: 'Pattern 4' }).click();
      await page.keyboard.press('End');
      await page.keyboard.type('x');
      assert.equal(await problems(), before - 1, 'the entry in hand did not follow its keystroke');
    } finally {
      await page.close();
    }
  });

  test('pattern entries flow side by side with each cross inside its field', long, async () => {
    const page = await open();
    try {
      const list = page
        .locator('#pattern-entries .specimen', { hasText: 'A few entries' })
        .locator('.sui-pattern-entries');
      await list.scrollIntoViewIfNeeded();
      const entries = await list.locator('.sui-pattern-entry').evaluateAll((items) =>
        items.map((item) => {
          const field = item.firstElementChild?.getBoundingClientRect();
          const cross = item.querySelector('button')?.getBoundingClientRect();
          return {
            top: field?.top ?? NaN,
            inside:
              !!field &&
              !!cross &&
              cross.left >= field.left &&
              cross.right <= field.right &&
              cross.top >= field.top &&
              cross.bottom <= field.bottom
          };
        })
      );
      assert.ok(Math.abs(entries[0].top - entries[1].top) < 0.5, 'each entry took a row');
      assert.ok(
        entries.every((entry) => entry.inside),
        'a cross stood outside its field'
      );
    } finally {
      await page.close();
    }
  });

  test(
    'L-89 removing the last pattern hands focus back, and Backspace in an empty entry steps back',
    long,
    async () => {
      const page = await open();
      try {
        const list = page
          .locator('#pattern-entries .specimen', { hasText: 'A few entries' })
          .locator('.sui-pattern-entries');
        await list.scrollIntoViewIfNeeded();
        await list.getByRole('button', { name: 'Remove hotfix/*' }).focus();
        await page.keyboard.press('Enter');
        assert.match(await focused(page), /^input Pattern 2 release\/\*$/);

        await list.getByRole('button', { name: 'Add a branch pattern' }).click();
        await page.keyboard.press('Backspace');
        assert.match(await focused(page), /^input Pattern 2 release\/\*$/);
        assert.equal(await list.getByRole('textbox').count(), 2, 'the empty entry stayed');

        // A held key empties the entry it is in and stops there, never running on.
        for (let press = 0; press < 12; press++) await page.keyboard.down('Backspace');
        await page.keyboard.up('Backspace');
        assert.match(await focused(page), /^input Pattern 2$/);
        await page.keyboard.press('Backspace');
        assert.match(await focused(page), /^input Pattern 1 main$/);
        assert.equal(await list.getByRole('button', { name: 'Undo' }).count(), 1);
      } finally {
        await page.close();
      }
    }
  );
});
