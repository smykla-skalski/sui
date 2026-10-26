import assert from 'node:assert/strict';
import { after, before, suite, test } from 'node:test';
import { allSections, long, startSink, together, visit } from './sink.mjs';

// The actions and form controls in the kitchen sink: focus handoffs, locked and pending states,
// what a form posts, and placement in a right-to-left page.

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

suite('forms', together, () => {
  /** @param {{ lang?: string; width?: number; fallbackFieldSizing?: boolean }} [options] */
  async function open({ lang, width = 1440, fallbackFieldSizing = false } = {}) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    if (fallbackFieldSizing)
      await page.addInitScript(() => {
        const supports = CSS.supports.bind(CSS);
        CSS.supports = /** @type {typeof CSS.supports} */ (
          (property, value) =>
            property === 'field-sizing' && value === 'content'
              ? false
              : value === undefined
                ? supports(property)
                : supports(property, value)
        );
      });
    if (lang)
      await page.route(
        (address) => `${address.origin}${address.pathname}` === allSections(url),
        async (route) => {
          const response = await route.fetch();
          const body = (await response.text()).replace(
            /<html lang="[^"]*"/,
            `<html lang="${lang}"`
          );
          await route.fulfill({ response, body });
        }
      );
    await visit(page, allSections(url));
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => '__suiAudit' in window);
    return page;
  }

  /** @param {import('playwright-core').Page} page */
  const focused = (page) =>
    page.evaluate(() => {
      const active = document.activeElement;
      return active ? `${active.tagName.toLowerCase()}#${active.id}.${active.className}` : '';
    });

  test('a busy icon button keeps focus and refuses the press', long, async () => {
    const page = await open();
    try {
      const busy = page.locator('#icon-buttons .sui-icon-button[aria-busy="true"]').first();
      await busy.focus();
      assert.ok(
        await busy.evaluate((button) => document.activeElement === button),
        'focus fell off'
      );
      assert.equal(
        await busy.evaluate((button) => /** @type {HTMLButtonElement} */ (button).disabled),
        false
      );
      assert.equal(await busy.getAttribute('aria-disabled'), 'true');
      const refused = await busy.evaluate((button) => {
        const press = new MouseEvent('click', { bubbles: true, cancelable: true });
        button.dispatchEvent(press);
        return press.defaultPrevented;
      });
      assert.ok(refused, 'the press ran while busy');
    } finally {
      await page.close();
    }
  });

  test(
    'a saving pane hands focus to Save and disables its fields until the save ends',
    long,
    async () => {
      const page = await open();
      try {
        const field = page.locator('#save-bar input').first();
        await field.scrollIntoViewIfNeeded();
        await field.click();
        await page.keyboard.press('End');
        await page.keyboard.type('-x');
        const typed = await field.inputValue();
        // The sink's save ends in about a second, sooner than a slow runner comes back from a
        // keystroke, so the page notes the hold the frame after the save starts.
        await page.evaluate(() => {
          const input = /** @type {HTMLInputElement} */ (document.querySelector('#save-bar input'));
          /** @type {any} */ (window).held = new Promise((done) => {
            const watch = new MutationObserver(() => {
              if (input.closest('[aria-busy="true"]') === null) return;
              watch.disconnect();
              requestAnimationFrame(() => {
                const press = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
                input.dispatchEvent(press);
                done({
                  onSave: document.activeElement?.getAttribute('aria-busy') === 'true',
                  disabled: input.disabled,
                  pressRefused: press.defaultPrevented
                });
              });
            });
            watch.observe(/** @type {HTMLElement} */ (document.getElementById('save-bar')), {
              attributeFilter: ['aria-busy'],
              subtree: true
            });
          });
        });
        await page.keyboard.press('ControlOrMeta+s');
        assert.deepEqual(
          await page.evaluate(() => /** @type {any} */ (window).held),
          { onSave: true, disabled: true, pressRefused: true },
          'a saving pane left its field in use or focus off Save'
        );
        await page.waitForFunction(
          () => document.querySelector('#save-bar input')?.closest('[aria-busy]') === null
        );
        await page.waitForFunction(() => document.activeElement?.tagName === 'INPUT');
        await page.keyboard.type('!');
        assert.equal(await field.inputValue(), `${typed}!`, 'focus did not return to the field');
      } finally {
        await page.close();
      }
    }
  );

  test('a locked choice group keeps focus and refuses a new answer', long, async () => {
    const page = await open();
    try {
      const group = page.locator('#choice-cards fieldset[aria-disabled="true"]').first();
      const chosen = group.locator('input:checked');
      const before = await chosen.getAttribute('value');
      await chosen.focus();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Space');
      assert.equal(await group.locator('input:checked').getAttribute('value'), before);
      // Forced, because a locked card is not enabled to the test runner either.
      await group
        .locator('.sui-choice-card')
        .filter({ hasNot: page.locator('input:checked') })
        .first()
        .click({ force: true });
      assert.equal(await group.locator('input:checked').getAttribute('value'), before);
      assert.ok(
        await group.evaluate((fieldset) => fieldset.contains(document.activeElement)),
        `focus left the group for ${await focused(page)}`
      );
    } finally {
      await page.close();
    }
  });

  test(
    'a pending switch refuses a second flip, keeps focus, and a refusal is spoken',
    long,
    async () => {
      const page = await open();
      try {
        const row = page.locator('#switch .sui-switch-row', {
          hasText: 'Mirror to the backup region'
        });
        const input = row.locator('input');
        await input.focus();
        // Both presses run inside the page, a task apart, because a slow runner returns from a
        // driven click so late that the sink's 900ms save has already answered.
        const second = await row.evaluate(async (element) => {
          const box = /** @type {HTMLInputElement} */ (element.querySelector('input'));
          /** @type {HTMLElement} */ (element).click();
          await new Promise((done) => setTimeout(done));
          const busy = box.getAttribute('aria-busy') === 'true';
          /** @type {HTMLElement} */ (element).click();
          return { busy, checked: box.checked };
        });
        assert.deepEqual(second, { busy: true, checked: true }, 'a second flip ran while saving');
        assert.ok(await input.evaluate((element) => document.activeElement === element));
        await page.waitForFunction(
          (element) => element && !element.hasAttribute('aria-busy'),
          await input.elementHandle()
        );
        assert.equal(await input.isChecked(), false);
        const status = await row
          .locator('xpath=ancestor::*[contains(@class,"sui-switch")][1]')
          .locator('[role="status"]')
          .textContent();
        assert.match(status ?? '', /mirroring stayed off/);
      } finally {
        await page.close();
      }
    }
  );

  test('the color picker goes back on Escape and closes when Tab leaves it', long, async () => {
    const page = await open();
    try {
      const trigger = page.locator('#color-picker button[aria-haspopup="dialog"]').first();
      const start = (await trigger.textContent())?.trim();
      await trigger.click();
      await page.waitForFunction(() => document.querySelector('.sui-popover:popover-open'));
      await page.keyboard.press('ArrowRight');
      assert.notEqual((await trigger.textContent())?.trim(), start, 'the arrow picked nothing');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('.sui-popover:popover-open'));
      assert.equal((await trigger.textContent())?.trim(), start);
      assert.ok(await trigger.evaluate((button) => document.activeElement === button));

      await trigger.click();
      await page.waitForFunction(() => document.querySelector('.sui-popover:popover-open'));
      await page.locator('.sui-popover:popover-open input.sui-text-input').focus();
      await page.keyboard.press('Tab');
      await page.waitForFunction(() => !document.querySelector('.sui-popover:popover-open'));
      assert.ok(
        await page.evaluate(() => document.activeElement !== document.body),
        'focus fell to the body'
      );
    } finally {
      await page.close();
    }
  });

  test('a form error summary takes focus and each link focuses its field', long, async () => {
    const page = await open();
    try {
      await page.locator('#states form button[type="submit"]').click();
      const summary = page.locator('#states form .sui-form-error');
      await summary.waitFor();
      assert.ok(await summary.evaluate((box) => document.activeElement === box));
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'sink-states-workspace');
    } finally {
      await page.close();
    }
  });

  test('the combobox keeps what was typed and posts the value, never the label', long, async () => {
    const page = await open();
    try {
      const field = page.getByRole('combobox', { name: 'Runtime' });
      await field.fill('Pyth');
      await page.keyboard.press('Tab');
      assert.equal(await field.inputValue(), 'Pyth', 'the typed text was dropped');
      await field.fill('go');
      await page.keyboard.press('Enter');
      await page.locator('#combobox figcaption .label', { hasText: /^Sent go$/ }).waitFor();
      assert.equal(await field.inputValue(), 'Go');
    } finally {
      await page.close();
    }
  });

  test('a refused send says why under the field, never in the browser bubble', long, async () => {
    const page = await open();
    try {
      const form = page.locator('#select form');
      const zone = form.locator('select[name="zone"]');
      // Listens after the field does, so it sees whether the bubble was cancelled.
      await zone.evaluate((select) =>
        select.addEventListener('invalid', (event) => {
          select.dataset.bubble = String(!event.defaultPrevented);
        })
      );
      await form.locator('button[type="submit"]').click();
      const error = form.locator('.sui-field-error');
      await error.waitFor();
      assert.equal(await zone.getAttribute('data-bubble'), 'false', 'the browser bubble showed');
      assert.equal((await error.textContent())?.trim(), 'Choose the time zone the reports run in');
      assert.ok(await zone.evaluate((select) => document.activeElement === select), 'not focused');
      assert.equal(await zone.getAttribute('aria-invalid'), 'true');
      assert.ok(
        (await zone.getAttribute('aria-describedby'))?.includes(
          (await error.getAttribute('id')) ?? 'none'
        ),
        'the error does not describe the select'
      );
      await zone.selectOption({ index: 1 });
      await error.waitFor({ state: 'detached' });
    } finally {
      await page.close();
    }
  });

  test('a combobox refuses a send while its text names no option', long, async () => {
    const page = await open();
    try {
      const field = page.getByRole('combobox', { name: 'Runtime' });
      const error = page.locator('#combobox form .sui-field-error');
      await field.fill('Cobol');
      await page.keyboard.press('Enter');
      await error.waitFor();
      assert.equal(
        await page.locator('#combobox figcaption .label', { hasText: /^Sent/ }).count(),
        0,
        'the draft was sent'
      );
      // Typed words that name an option lift the refusal before they are committed.
      await field.fill('Go');
      await error.waitFor({ state: 'detached' });
    } finally {
      await page.close();
    }
  });

  test('a refused combobox search says so', long, async () => {
    const page = await open();
    try {
      const field = page.getByRole('combobox', { name: 'Owner' });
      await field.fill('oct');
      await page.waitForFunction(() =>
        [...document.querySelectorAll('#combobox [role="status"]')].some((status) =>
          /could not load/.test(status.textContent ?? '')
        )
      );
    } finally {
      await page.close();
    }
  });

  test(
    'a duration problem waits for the reader to leave, and amounts read in the page language',
    long,
    async () => {
      const page = await open({ lang: 'de' });
      try {
        const amount = page.getByRole('textbox', { name: 'Merge window' });
        const root = amount.locator(
          'xpath=ancestor::div[contains(@class,"sui-duration-input")][1]'
        );
        await amount.fill('2,5');
        await page.locator('#duration-input figcaption', { hasText: '9000 seconds' }).waitFor();
        await amount.fill('2,0001');
        assert.equal(await root.locator('.sui-duration-problem').count(), 0, 'shown mid-typing');
        await page.keyboard.press('Tab');
        await root.locator('.sui-duration-problem').waitFor();
      } finally {
        await page.close();
      }
    }
  );

  test(
    'a link field selects all of its value on focus and one word on a double click',
    long,
    async () => {
      const page = await open();
      try {
        const value = page.locator('#copyable-link-field textarea').first();
        await value.scrollIntoViewIfNeeded();
        // The middle of a word that neither starts nor ends the value, measured in the field's font.
        const { x, y, word } = await value.evaluate((/** @type {HTMLTextAreaElement} */ area) => {
          const look = getComputedStyle(area);
          const mirror = document.createElement('span');
          for (const name of ['font-family', 'font-size', 'font-weight', 'letter-spacing'])
            mirror.style.setProperty(name, look.getPropertyValue(name));
          mirror.style.whiteSpace = 'pre';
          document.body.append(mirror);
          const width = (/** @type {string} */ text) => {
            mirror.textContent = text;
            return mirror.getBoundingClientRect().width;
          };
          const word = area.value.split(/\W+/).filter(Boolean)[1];
          const before = width(area.value.slice(0, area.value.indexOf(word)));
          const middle = before + width(word) / 2;
          mirror.remove();
          const box = area.getBoundingClientRect();
          return {
            x: box.x + area.clientLeft + parseFloat(look.paddingInlineStart) + middle,
            y: box.y + area.clientTop + parseFloat(look.paddingBlockStart) + 4,
            word
          };
        });
        const selected = () =>
          value.evaluate((/** @type {HTMLTextAreaElement} */ area) =>
            area.value.slice(area.selectionStart, area.selectionEnd)
          );
        await page.mouse.dblclick(x, y);
        assert.equal(await selected(), word, 'a double click did not select its word');
        await page.evaluate(() => /** @type {HTMLElement} */ (document.activeElement).blur());
        await value.focus();
        assert.equal(
          await selected(),
          await value.inputValue(),
          'focus that is not a press did not select the whole value'
        );
      } finally {
        await page.close();
      }
    }
  );

  // Chrome fires blur while it removes a focused control, inside the update that removes it.
  test('removing a focused chip with its tip shown throws nothing', long, async () => {
    const page = await open();
    /** @type {string[]} */
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      const remover = page.locator('#chip .sui-chip-remove:not([disabled])').first();
      await remover.scrollIntoViewIfNeeded();
      await remover.focus();
      await page.keyboard.press('Enter');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);
      assert.deepEqual(errors, []);
      assert.match(await focused(page), /sui-chip-remove/, 'focus left the chips');
    } finally {
      await page.close();
    }
  });

  test('a joined field rings the part that holds focus', long, async () => {
    const page = await open();
    try {
      const amount = page.getByRole('textbox', { name: 'Retry delay' });
      const host = amount.locator(
        'xpath=ancestor::div[contains(concat(" ", @class, " "), " sui-joined ")]'
      );
      const unit = host.locator('select');
      const ring = (/** @type {import('playwright-core').Locator} */ target) =>
        target.evaluate((element) => getComputedStyle(element).outlineStyle);
      // Reached by the keyboard, so the ring is the one a keyboard reader sees.
      await amount.focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      assert.equal(await ring(host), 'solid');
      await page.keyboard.press('Tab');
      assert.ok(await unit.evaluate((select) => document.activeElement === select));
      assert.equal(await ring(host), 'none', 'the field still wears the ring');
      assert.equal(await ring(unit), 'solid', 'the unit draws no ring of its own');
    } finally {
      await page.close();
    }
  });

  test(
    'a hover on a joined unit lights the whole field and the unit over it, which stays lit open',
    long,
    async () => {
      const page = await open();
      try {
        const host = page.locator('#duration-input .sui-joined').first();
        const unit = host.locator('select');
        const ground = (/** @type {import('playwright-core').Locator} */ part) =>
          part.evaluate((element) => getComputedStyle(element).backgroundColor);
        const rest = await ground(host);
        const unitRest = await ground(unit);
        await host.locator('input').hover();
        const lit = await ground(host);
        assert.notEqual(lit, rest, 'the amount did not light its field');
        await unit.hover();
        assert.notEqual(await ground(unit), unitRest, 'the unit does not answer the pointer');
        assert.equal(await ground(host), lit, 'the unit did not light the whole field');
        await unit.click();
        await page.waitForFunction(
          (select) => select?.matches(':open'),
          await unit.elementHandle()
        );
        await page.mouse.move(0, 0);
        assert.notEqual(await ground(unit), unitRest, 'the open unit went back to rest');
        await page.keyboard.press('Escape');
      } finally {
        await page.close();
      }
    }
  );

  // The audit reads fields at rest; a hover firms the frame, so the recess must firm with it.
  test('a hovered field keeps its recess darker than its frame', long, async () => {
    const page = await open();
    try {
      for (const selector of [
        '#text-input .sui-text-input',
        '#textarea .sui-textarea',
        '#select .sui-select-control',
        '#duration-input .sui-joined'
      ]) {
        const field = page.locator(selector).first();
        await field.hover();
        const { recess, frame } = await field.evaluate((element) => {
          const look = getComputedStyle(element);
          // Both are veils over the same ground, so laid on white they compare as a reader sees them.
          const shade = (/** @type {string} */ color) => {
            const [r, g, b, a = 1] = (color.match(/[\d.]+/g) ?? []).map(Number);
            return [r, g, b]
              .map((channel) => channel * a + 255 * (1 - a))
              .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
          };
          return {
            recess: shade(look.boxShadow.match(/rgba?\([^)]*\)/)?.[0] ?? 'rgba(0, 0, 0, 0)'),
            frame: shade(look.borderTopColor)
          };
        });
        assert.ok(recess < frame, `${selector} lightens its recess past its hovered frame`);
      }
    } finally {
      await page.close();
    }
  });

  test('an on switch keeps its thumb inside the track in a right-to-left page', long, async () => {
    const page = await open();
    try {
      await page.evaluate(() => (document.documentElement.dir = 'rtl'));
      await page.addStyleTag({ content: '*, *::after { transition: none !important; }' });
      const edges = await page.evaluate(() => {
        const input = /** @type {HTMLInputElement} */ (
          document.querySelector('#switch .sui-switch-row input:checked')
        );
        const track = /** @type {HTMLElement} */ (input.nextElementSibling);
        const box = track.getBoundingClientRect();
        const thumb = getComputedStyle(track, '::after');
        const end = box.right - track.clientLeft - parseFloat(thumb.insetInlineStart);
        const right = end + parseFloat(thumb.translate);
        return { track: [box.left, box.right], thumb: [right - parseFloat(thumb.width), right] };
      });
      assert.ok(
        edges.thumb[0] >= edges.track[0] && edges.thumb[1] <= edges.track[1],
        `thumb ${edges.thumb} leaves track ${edges.track}`
      );
    } finally {
      await page.close();
    }
  });

  test(
    'I4 swatches given as bare hex are named by their colour, not only their code',
    long,
    async () => {
      const page = await open();
      try {
        const trigger = page
          .locator('#color-picker .specimen', { hasText: 'Series color' })
          .locator('button[popovertarget]');
        await trigger.scrollIntoViewIfNeeded();
        await trigger.click();
        const names = await page
          .locator(':popover-open .swatches input')
          .evaluateAll((inputs) => inputs.map((input) => input.getAttribute('aria-label') ?? ''));
        assert.equal(names.length, 6);
        for (const name of names) assert.match(name, /^(Dark |Pale )?[A-Z][a-z]+, #[0-9a-f]{6}$/i);
        assert.deepEqual(
          names.map((name) => name.split(',')[0]),
          ['Blue', 'Green', 'Orange', 'Red', 'Violet', 'Teal']
        );
      } finally {
        await page.close();
      }
    }
  );

  test(
    'a hover on either part of a pair chip lights the whole chip, and the remove part over it',
    long,
    async () => {
      const page = await open();
      try {
        const chip = page.locator('#pair-entry .sui-pair-chip').first();
        const remove = chip.locator('.sui-pair-remove');
        const ground = () => chip.evaluate((element) => getComputedStyle(element).backgroundImage);
        const plate = () =>
          remove.evaluate((element) => getComputedStyle(element, '::before').backgroundColor);
        const rest = await ground();
        const plateRest = await plate();
        await chip.locator('.sui-pair-key').hover();
        const lit = await ground();
        assert.notEqual(lit, rest, 'the edit part did not light its chip');
        await remove.hover();
        assert.equal(await ground(), lit, 'the remove part did not light the whole chip');
        assert.notEqual(await plate(), plateRest, 'the remove part does not answer the pointer');
      } finally {
        await page.close();
      }
    }
  );

  test('66 seconds becomes 1.1 minutes without changing the seconds', async () => {
    const page = await open();
    try {
      const specimen = page.locator('#duration-input .specimen').filter({
        has: page.getByRole('textbox', { name: 'Retry delay' })
      });
      const amount = specimen.getByRole('textbox', { name: 'Retry delay' });
      await amount.fill('66');
      await specimen.locator('select').selectOption('minutes');
      assert.equal(await amount.inputValue(), '1.1');
      assert.match((await specimen.textContent()) ?? '', /Stored as 66 seconds/);
    } finally {
      await page.close();
    }
  });

  test('a reset key replaces an invalid draft when the owner value stays identical', async () => {
    const page = await open();
    try {
      const amount = page.getByRole('textbox', { name: 'Check cadence' });
      await amount.fill('0.5');
      await amount.blur();
      const discard = page.getByRole('button', { name: 'Discard the cadence' });
      await discard.click();
      assert.equal(await discard.getAttribute('data-reset'), '1');
      assert.equal(await amount.inputValue(), '30');
      // The owner heard the draft's problem, so it hears the problem go with it: Save then saves
      // instead of sending focus back to the amount.
      await page.getByRole('button', { name: 'Save the cadence' }).click();
      assert.equal(await amount.evaluate((node) => node === document.activeElement), false);
    } finally {
      await page.close();
    }
  });

  test('duration precision rejects real fractions but allows unit conversion noise', async () => {
    const page = await open();
    try {
      const specimen = page.locator('#duration-input .specimen').filter({
        has: page.getByRole('textbox', { name: 'Retry delay' })
      });
      const amount = specimen.getByRole('textbox', { name: 'Retry delay' });
      await amount.fill('4503599627370495.5');
      assert.match((await specimen.textContent()) ?? '', /Stored as 90 seconds/);
      await specimen.locator('select').selectOption('hours');
      await amount.fill('0.0002777777777777778');
      assert.match((await specimen.textContent()) ?? '', /Stored as 1 second/);
      // 8.2 × 60 is 491.99999999999994: the noise grows with the seconds, not the unit.
      await specimen.locator('select').selectOption('minutes');
      await amount.fill('8.2');
      assert.match((await specimen.textContent()) ?? '', /Stored as 492 seconds/);
    } finally {
      await page.close();
    }
  });

  test('a disabled search cannot be cleared', async () => {
    const page = await open();
    try {
      const field = page.getByRole('searchbox', { name: 'Search the locked projects' });
      const root = field.locator('xpath=ancestor::div[contains(@class,"sui-search-field")][1]');
      const clear = root.getByRole('button', { name: 'Clear the search' });
      assert.equal(await clear.isDisabled(), true);
      await clear.evaluate((button) =>
        button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      );
      assert.equal(await field.inputValue(), 'Locked');
    } finally {
      await page.close();
    }
  });

  test('a soft-held search keeps focus and refuses its clear action', async () => {
    const page = await open();
    try {
      const field = page.getByRole('searchbox', { name: 'Search the held projects' });
      const root = field.locator('xpath=ancestor::div[contains(@class,"sui-search-field")][1]');
      const clear = root.getByRole('button', { name: 'Clear the search' });
      await clear.focus();
      const refused = await clear.evaluate((button) => {
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        button.dispatchEvent(event);
        return event.defaultPrevented;
      });
      assert.equal(refused, true);
      assert.equal(await clear.getAttribute('aria-disabled'), 'true');
      assert.equal(await field.inputValue(), 'Held');
      assert.ok(await clear.evaluate((button) => document.activeElement === button));
    } finally {
      await page.close();
    }
  });

  test('a programmatic search fix clears its refusal and invalid state', async () => {
    const page = await open();
    try {
      const form = page.locator('#search-field form');
      const field = form.getByRole('searchbox');
      const error = form.locator('.sui-search-field-error');
      await form.getByRole('button', { name: 'Search', exact: true }).click();
      await error.waitFor();
      await form
        .getByRole('button', { name: 'Fix the audit query' })
        .evaluate((button) => /** @type {HTMLButtonElement} */ (button).click());
      await error.waitFor({ state: 'detached' });
      assert.equal(await field.inputValue(), 'valid');
      assert.equal(await field.getAttribute('aria-invalid'), null);
    } finally {
      await page.close();
    }
  });

  test('a programmatic select fix clears its refusal and invalid state', async () => {
    const page = await open();
    try {
      const form = page.locator('#select form');
      const zone = form.locator('select[name="zone"]');
      const error = form.locator('.sui-field-error');
      await form.locator('button[type="submit"]').click();
      await error.waitFor();
      await zone.evaluate((select) => {
        const input = /** @type {HTMLSelectElement} */ (select);
        input.value = input.options[1].value;
      });
      await error.waitFor({ state: 'detached' });
      assert.equal(await zone.getAttribute('aria-invalid'), null);
    } finally {
      await page.close();
    }
  });

  test('an owner replacement replaces a focused combobox draft', async () => {
    const page = await open();
    try {
      const field = page.getByRole('combobox', { name: 'Language', exact: true }).first();
      await field.fill('Pyth');
      await page
        .getByRole('button', { name: 'Replace the language' })
        .evaluate((button) => /** @type {HTMLButtonElement} */ (button).click());
      assert.equal(await field.inputValue(), 'Go');
      assert.ok(await field.evaluate((input) => document.activeElement === input));
      await field.evaluate((input) => input.blur());
      assert.equal(await field.inputValue(), 'Go');
    } finally {
      await page.close();
    }
  });

  test('a combobox clamps its active row when the limit shrinks', async () => {
    const page = await open();
    try {
      const field = page.getByRole('combobox', { name: 'Language', exact: true }).first();
      await field.fill('o');
      await page.keyboard.press('ArrowUp');
      await page
        .getByRole('button', { name: 'Limit the language suggestions' })
        .evaluate((button) => /** @type {HTMLButtonElement} */ (button).click());
      const active = await field.getAttribute('aria-activedescendant');
      assert.ok(active?.endsWith('-option-0'), `dangling active row: ${active}`);
      assert.equal(await page.locator(`#${active}`).count(), 1);
      await page.keyboard.press('Enter');
      assert.equal(await field.inputValue(), 'Go');
    } finally {
      await page.close();
    }
  });

  test('a valid short hex commits when the color field blurs', async () => {
    const page = await open();
    try {
      const trigger = page.locator('#color-picker button[aria-haspopup="dialog"]').first();
      await trigger.click();
      const hex = page.locator(':popover-open input.sui-text-input');
      await hex.fill('#abc');
      await hex.press('Tab');
      assert.match((await trigger.textContent()) ?? '', /#aabbcc/);
    } finally {
      await page.close();
    }
  });

  test('the link field fallback remeasures when its value changes', async () => {
    const page = await open({ fallbackFieldSizing: true });
    try {
      await page.addStyleTag({
        content: '.sui-copyable-link-value { field-sizing: fixed !important; }'
      });
      const field = page.getByRole('textbox', { name: 'Invitation link' });
      await field.evaluate((area) => {
        const root = /** @type {HTMLElement} */ (area.closest('.sui-copyable-link-field'));
        root.style.inlineSize = '16rem';
      });
      const before = await field.evaluate((area) => area.getBoundingClientRect().height);
      await page.getByRole('button', { name: 'Lengthen the invitation' }).click();
      await page.waitForFunction(
        ({ area, height }) => area.getBoundingClientRect().height > height,
        { area: await field.elementHandle(), height: before }
      );
      assert.ok(
        await field.evaluate((area) => area.scrollHeight <= area.clientHeight + 1),
        'the new value remains clipped'
      );
    } finally {
      await page.close();
    }
  });

  test('select-to-radio focus skips a checked disabled option', async () => {
    const page = await open();
    try {
      const control = page.locator('#segmented-control .sui-segmented').filter({
        has: page.locator('input[value="debug"]:checked')
      });
      await control.evaluate((node) => {
        if (node.parentElement) node.parentElement.style.inlineSize = '4rem';
      });
      const select = control.locator('select');
      await select.waitFor({ state: 'visible' });
      await select.focus();
      await control.evaluate((node) => {
        if (node.parentElement) node.parentElement.style.inlineSize = '40rem';
      });
      await page.waitForFunction(
        (node) =>
          node?.contains(document.activeElement) && document.activeElement?.matches('input'),
        await control.elementHandle()
      );
      assert.equal(
        await page.evaluate(() => /** @type {HTMLInputElement} */ (document.activeElement).value),
        'off'
      );
      assert.equal(
        await page.evaluate(
          () => /** @type {HTMLInputElement} */ (document.activeElement).disabled
        ),
        false
      );
    } finally {
      await page.close();
    }
  });

  test('aria-disabled refuses an icon button without dropping focus', async () => {
    const page = await open();
    try {
      const button = page.getByRole('button', { name: 'Soft disabled action' });
      await button.focus();
      const refused = await button.evaluate((element) => {
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        element.dispatchEvent(event);
        return event.defaultPrevented;
      });
      assert.equal(refused, true);
      assert.equal(await button.getAttribute('aria-disabled'), 'true');
      assert.equal(await page.locator('#sink-soft-presses').textContent(), '0');
      assert.ok(await button.evaluate((element) => document.activeElement === element));
    } finally {
      await page.close();
    }
  });
});
