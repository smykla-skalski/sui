import assert from 'node:assert/strict';
import { after, before, suite, test } from 'node:test';
import { allSections, atRest, long, startSink, together, visit } from './sink.mjs';

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
  /** @param {{ lang?: string; width?: number; path?: string }} [options] */
  async function open({ lang, width = 1440, path = 'all/' } = {}) {
    const address = new URL(path, url).href;
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    if (lang)
      await page.route(
        (asked) => `${asked.origin}${asked.pathname}` === address,
        async (route) => {
          const response = await route.fetch();
          const body = (await response.text()).replace(
            /<html lang="[^"]*"/,
            `<html lang="${lang}"`
          );
          await route.fulfill({ response, body });
        }
      );
    await visit(page, address);
    await page.evaluate(() => document.fonts.ready);
    return page;
  }

  /**
   * One page for the tests of the suite it is called in, opened by the first test that runs, so a
   * suite whose tests are all skipped opens none. A suite runs its tests in order, and one that
   * changes what another reads runs after it.
   */
  function sharedPage() {
    /** @type {Promise<import('playwright-core').Page> | undefined} */
    let opened;
    after(() => opened?.then((page) => page.close()).catch(() => {}));
    return () => (opened ??= open());
  }

  /** @param {import('playwright-core').Page} page */
  const focused = (page) =>
    page.evaluate(() => {
      const active = document.activeElement;
      return active ? `${active.tagName.toLowerCase()}#${active.id}.${active.className}` : '';
    });

  suite('presses and focus', { concurrency: 1 }, () => {
    const opened = sharedPage();

    test(
      'a busy or aria-disabled icon button keeps focus and refuses the press',
      long,
      async () => {
        const page = await opened();
        for (const button of [
          page.locator('#icon-buttons .sui-icon-button[aria-busy="true"]').first(),
          page.getByRole('button', { name: 'Soft disabled action' })
        ]) {
          await button.focus();
          assert.ok(
            await button.evaluate((element) => document.activeElement === element),
            'focus fell off'
          );
          assert.equal(
            await button.evaluate((element) => /** @type {HTMLButtonElement} */ (element).disabled),
            false
          );
          assert.equal(await button.getAttribute('aria-disabled'), 'true');
          const refused = await button.evaluate((element) => {
            const press = new MouseEvent('click', { bubbles: true, cancelable: true });
            element.dispatchEvent(press);
            return press.defaultPrevented;
          });
          assert.ok(refused, 'the press ran');
        }
        assert.equal(await page.locator('#sink-soft-presses').textContent(), '0');
      }
    );

    test('a locked choice group keeps focus and refuses a new answer', long, async () => {
      const page = await opened();
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
    });

    test(
      'a pending switch refuses a second flip, keeps focus, and a refusal is spoken',
      long,
      async () => {
        const page = await opened();
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
      }
    );

    test('a form error summary takes focus and each link focuses its field', long, async () => {
      const page = await opened();
      await page.locator('#states form button[type="submit"]').click();
      const summary = page.locator('#states form .sui-form-error');
      await summary.waitFor();
      assert.ok(await summary.evaluate((box) => document.activeElement === box));
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'sink-states-workspace');
    });

    test(
      'a link field selects all of its value on focus and one word on a double click',
      long,
      async () => {
        const page = await opened();
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
      }
    );

    // Chrome fires blur while it removes a focused control, inside the update that removes it.
    test('removing a focused chip with its tip shown throws nothing', long, async () => {
      const page = await opened();
      /** @type {string[]} */
      const errors = [];
      const record = (/** @type {Error} */ error) => errors.push(error.message);
      page.on('pageerror', record);
      try {
        const remover = page.locator('#chip .sui-chip-remove:not([disabled])').first();
        await remover.scrollIntoViewIfNeeded();
        await remover.focus();
        await page.keyboard.press('Enter');
        await page.keyboard.press('Enter');
        // The removal's update ends within the frame, and its error reaches the test before
        // the page answers.
        await page.evaluate(() => new Promise((done) => requestAnimationFrame(done)));
        assert.deepEqual(errors, []);
        assert.match(await focused(page), /sui-chip-remove/, 'focus left the chips');
      } finally {
        page.off('pageerror', record);
      }
    });

    test('select-to-radio focus skips a checked disabled option', async () => {
      const page = await opened();
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
    });

    // Last, because it turns the whole page right to left.
    test(
      'L-47 a light text field fills the surface white at rest, keeps it on focus and stays opaque on hover (L-10)',
      long,
      async () => {
        const page = await opened();
        for (const [selector, typed] of [
          ['#text-input .sui-text-input', '#text-input .sui-text-input'],
          ['#textarea .sui-textarea', '#textarea .sui-textarea'],
          ['#duration-input .sui-joined', '#duration-input .sui-joined input']
        ]) {
          await page.mouse.move(0, 0);
          const field = page.locator(selector).first();
          const ground = () =>
            field.evaluate((element) => getComputedStyle(element).backgroundColor);
          const rest = await ground();
          assert.equal(rest, 'rgb(255, 255, 255)', `${selector} rests on another fill`);
          await field.hover();
          assert.doesNotMatch(
            await ground(),
            /rgba|\//,
            `${selector} lets the ground through on hover`
          );
          await page.mouse.move(0, 0);
          await page.locator(typed).first().focus();
          assert.equal(await ground(), rest, `${selector} changes its fill on focus`);
        }
      }
    );

    test(
      'L-55 two measured examples share a row that ends where the cards above end, and fill a phone line',
      long,
      async () => {
        /** @param {import('playwright-core').Page} page */
        const frames = (page) =>
          page.evaluate(() =>
            ['states', 'in-context', 'narrow-width'].map((name) => {
              const box = document
                .getElementById(`field-${name}`)
                ?.closest('.example')
                ?.querySelector('.frame')
                ?.getBoundingClientRect();
              return box && { top: box.top, end: box.right, width: box.width };
            })
          );
        const page = await opened();
        const heads = await page.evaluate(() =>
          ['in-context', 'narrow-width'].map((name) => {
            const title = document.getElementById(`field-${name}`);
            const note = title?.closest('.head')?.querySelector('.note');
            return [title?.getBoundingClientRect().top, note?.getBoundingClientRect().top];
          })
        );
        assert.deepEqual(heads[1], heads[0], 'the two titles and notes start on one line');
        const [states, context, narrow] = await frames(page);
        assert.ok(states && context && narrow);
        assert.equal(context.top, narrow.top, 'the pair stands on one row');
        assert.ok(
          Math.abs(narrow.end - states.end) < 1,
          `the pair ends at ${narrow.end}, the cards above at ${states.end}`
        );
        const phone = await open({ width: 390 });
        const [, small, wrapped] = await frames(phone);
        await phone.close();
        assert.ok(small && wrapped);
        assert.equal(wrapped.width, small.width, 'a wrapped frame keeps a narrow measure');
      }
    );

    test(
      'a checkbox row centres its box on the label, its notes 12px under the box, an error mark under it',
      long,
      async () => {
        const page = await opened();
        const rows = await page.evaluate(() =>
          [
            ...document.querySelectorAll(
              "#field .sui-field[data-layout='row']:has(input[type='checkbox']):has(.sui-field-help, .sui-field-error)"
            )
          ].map((field) => {
            const box = (/** @type {string} */ selector) =>
              /** @type {Element} */ (field.querySelector(selector)).getBoundingClientRect();
            const label = box('.sui-field-label');
            const check = box('.sui-checkbox-box');
            return {
              gap: box(':is(.sui-field-help, .sui-field-error-text)').top - check.bottom,
              offCentre: check.top + check.height / 2 - (label.top + label.height / 2)
            };
          })
        );
        assert.ok(rows.length > 1, 'no checkbox rows');
        for (const row of rows) {
          assert.ok(Math.abs(row.gap - 12) <= 0.5, JSON.stringify(row));
          assert.ok(Math.abs(row.offCentre) <= 1, JSON.stringify(row));
        }
        const edges = await page
          .locator("#field .sui-field[data-layout='row']:has(.sui-field-error)")
          .first()
          .evaluate((field) => {
            const box = (/** @type {string} */ selector) =>
              /** @type {Element} */ (field.querySelector(selector)).getBoundingClientRect();
            const check = box('input[type="checkbox"]');
            const mark = box('.sui-field-error-mark');
            return {
              label: box('.sui-field-label').left,
              words: box('.sui-field-error-text').left,
              markMiddle: mark.left + mark.width / 2,
              checkMiddle: check.left + check.width / 2
            };
          });
        assert.ok(Math.abs(edges.words - edges.label) < 0.5, JSON.stringify(edges));
        assert.ok(Math.abs(edges.markMiddle - edges.checkMiddle) < 1, JSON.stringify(edges));
      }
    );

    test(
      'a field error stands 20px under its hint, which stands 12px under the control (L-35)',
      long,
      async () => {
        const page = await opened();
        const gaps = await page.evaluate(() =>
          [
            ...document.querySelectorAll('.sui-field:has(> .sui-field-help + .sui-field-error)')
          ].map((field) => {
            const box = (/** @type {string} */ selector) =>
              /** @type {Element} */ (field.querySelector(selector)).getBoundingClientRect();
            const help = box(':scope > .sui-field-help');
            return {
              hint: help.top - box(':scope > .sui-field-control').bottom,
              error: box(':scope > .sui-field-error .sui-field-error-text').top - help.bottom
            };
          })
        );
        assert.ok(gaps.length > 0, 'no field shows a hint and an error');
        for (const { hint, error } of gaps) {
          assert.ok(Math.abs(hint - 12) <= 0.5, `the hint stands ${hint}px under the control`);
          assert.ok(Math.abs(error - 20) <= 0.5, `the error stands ${error}px under the hint`);
        }
      }
    );

    test(
      'an invalid field keeps its danger edge when it is off or only reads (L-9)',
      long,
      async () => {
        const page = await opened();
        const edges = await page.evaluate(() => {
          const probe = document.body.appendChild(document.createElement('i'));
          probe.style.color = 'var(--sui-danger)';
          const danger = getComputedStyle(probe).color;
          probe.remove();
          /** @param {string} selector @param {(field: HTMLInputElement) => void} state */
          const edge = (selector, state) => {
            const field = /** @type {HTMLInputElement} */ (
              document.querySelector(`${selector}:not(.bare, .held, :disabled, [readonly])`)
            );
            state(field);
            field.setAttribute('aria-invalid', 'true');
            const style = getComputedStyle(field);
            const sides = ['top', 'right', 'bottom', 'left'].map((side) =>
              style.getPropertyValue(`border-${side}-color`)
            );
            // The page is shared, so the field goes back as it was.
            field.disabled = false;
            field.readOnly = false;
            field.removeAttribute('aria-invalid');
            return sides.every((color) => color === danger) ? 'danger' : sides.join(' ');
          };
          return {
            'an off text input': edge('.sui-text-input', (field) => (field.disabled = true)),
            'a read-only text input': edge('.sui-text-input', (field) => (field.readOnly = true)),
            'an off text area': edge('.sui-textarea', (field) => (field.disabled = true))
          };
        });
        for (const [field, color] of Object.entries(edges))
          assert.equal(color, 'danger', `${field} drew a ${color} edge`);
      }
    );

    test('L-74 a segmented thumb travels by translate and scale, never by its width', async () => {
      const page = await opened();
      const control = page
        .locator('#segmented-control .sui-segmented')
        .filter({ has: page.locator('input[value="invitations"]') })
        .first();
      await control.scrollIntoViewIfNeeded();
      const thumb = control.locator('.sui-segmented-thumb');
      await thumb.waitFor();
      // The travel runs 240ms, less than a busy runner may take between the click and the read,
      // so it is held long enough to still be running when read.
      await control.evaluate((node) =>
        /** @type {HTMLElement} */ (node).style.setProperty('--sui-duration-travel', '60s')
      );
      const checked = await control.locator('input:checked').getAttribute('value');
      await control
        .locator('label', { hasText: checked === 'users' ? 'Invitations' : 'Users' })
        .click();
      const moved = await thumb.evaluate((node) =>
        node
          .getAnimations()
          .flatMap((animation) =>
            animation instanceof CSSTransition
              ? [animation.transitionProperty]
              : (animation.effect instanceof KeyframeEffect ? animation.effect.getKeyframes() : [])
                  .flatMap((frame) => Object.keys(frame))
                  .filter(
                    (key) => !['offset', 'computedOffset', 'easing', 'composite'].includes(key)
                  )
          )
      );
      assert.ok(moved.includes('translate') && moved.includes('scale'), `moved by ${moved}`);
      assert.deepEqual(
        moved.filter(
          (property) => !['translate', 'scale', 'background-color', 'box-shadow'].includes(property)
        ),
        [],
        'the thumb animated its layout'
      );
    });

    test(
      'an on switch keeps its thumb inside the track in a right-to-left page',
      long,
      async () => {
        const page = await opened();
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
      }
    );
  });

  suite('choosing fields', { concurrency: 1 }, () => {
    const opened = sharedPage();

    // First, because it checks that nothing was sent yet.
    test('a combobox refuses a send while its text names no option', long, async () => {
      const page = await opened();
      const field = page.getByRole('combobox', { name: 'Runtime' });
      const error = page.locator('#combobox form .sui-field-error');
      await field.fill('Cobol');
      await page.keyboard.press('Enter');
      await error.waitFor();
      assert.equal(
        await page.locator('#combobox figcaption', { hasText: /^Sent/ }).count(),
        0,
        'the draft was sent'
      );
      // Typed words that name an option lift the refusal before they are committed.
      await field.fill('Go');
      await error.waitFor({ state: 'detached' });
    });

    test(
      'the combobox keeps what was typed and posts the value, never the label',
      long,
      async () => {
        const page = await opened();
        const field = page.getByRole('combobox', { name: 'Runtime' });
        await field.fill('Pyth');
        await page.keyboard.press('Tab');
        assert.equal(await field.inputValue(), 'Pyth', 'the typed text was dropped');
        await field.fill('go');
        await page.keyboard.press('Enter');
        await page.locator('#combobox figcaption', { hasText: /^Sent go$/ }).waitFor();
        assert.equal(await field.inputValue(), 'Go');
      }
    );

    test('a refused combobox search says so', long, async () => {
      const page = await opened();
      const field = page.getByRole('combobox', { name: 'Owner' });
      await field.fill('oct');
      await page.waitForFunction(() =>
        [...document.querySelectorAll('#combobox [role="status"]')].some((status) =>
          /could not load/.test(status.textContent ?? '')
        )
      );
    });

    test('an owner replacement replaces a focused combobox draft', async () => {
      const page = await opened();
      const field = page.getByRole('combobox', { name: 'Language', exact: true }).first();
      await field.fill('Pyth');
      await page
        .getByRole('button', { name: 'Replace the Language' })
        .evaluate((button) => /** @type {HTMLButtonElement} */ (button).click());
      assert.equal(await field.inputValue(), 'Go');
      assert.ok(await field.evaluate((input) => document.activeElement === input));
      await field.evaluate((input) => input.blur());
      assert.equal(await field.inputValue(), 'Go');
    });

    test('a combobox clamps its active row when the limit shrinks', async () => {
      const page = await opened();
      const field = page.getByRole('combobox', { name: 'Language', exact: true }).first();
      await field.fill('o');
      await page.keyboard.press('ArrowUp');
      await page
        .getByRole('button', { name: 'Limit the Language Suggestions' })
        .evaluate((button) => /** @type {HTMLButtonElement} */ (button).click());
      const active = await field.getAttribute('aria-activedescendant');
      assert.ok(active?.endsWith('-option-0'), `dangling active row: ${active}`);
      assert.equal(await page.locator(`#${active}`).count(), 1);
      await page.keyboard.press('Enter');
      assert.equal(await field.inputValue(), 'Go');
    });

    test(
      'a refused send says why under the field, never in the browser bubble, and a fix by hand or by code lifts it',
      long,
      async () => {
        const page = await opened();
        const form = page.locator('#select form');
        const zone = form.locator('select[name="zone"]');
        const send = form.locator('button[type="submit"]');
        // Listens after the field does, so it sees whether the bubble was cancelled.
        await zone.evaluate((select) =>
          select.addEventListener('invalid', (event) => {
            select.dataset.bubble = String(!event.defaultPrevented);
          })
        );
        await send.click();
        const error = form.locator('.sui-field-error');
        await error.waitFor();
        assert.equal(await zone.getAttribute('data-bubble'), 'false', 'the browser bubble showed');
        assert.equal(
          (await error.textContent())?.trim(),
          'Choose the time zone the reports run in'
        );
        assert.ok(
          await zone.evaluate((select) => document.activeElement === select),
          'not focused'
        );
        assert.equal(await zone.getAttribute('aria-invalid'), 'true');
        assert.ok(
          (await zone.getAttribute('aria-describedby'))?.includes(
            (await error.getAttribute('id')) ?? 'none'
          ),
          'the error does not describe the select'
        );
        await zone.selectOption({ index: 1 });
        await error.waitFor({ state: 'detached' });

        // A value set by code fires no change event, and still lifts the refusal.
        await zone.evaluate((select) => {
          /** @type {HTMLSelectElement} */ (select).value = '';
        });
        await send.click();
        await error.waitFor();
        await zone.evaluate((select) => {
          const input = /** @type {HTMLSelectElement} */ (select);
          input.value = input.options[1].value;
        });
        await error.waitFor({ state: 'detached' });
        assert.equal(await zone.getAttribute('aria-invalid'), null);
      }
    );

    test('a disabled search cannot be cleared', async () => {
      const page = await opened();
      const field = page.getByRole('searchbox', { name: 'Search the locked projects' });
      const root = field.locator('xpath=ancestor::div[contains(@class,"sui-search-field")][1]');
      const clear = root.getByRole('button', { name: 'Clear the search' });
      assert.equal(await clear.isDisabled(), true);
      await clear.evaluate((button) =>
        button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      );
      assert.equal(await field.inputValue(), 'Locked');
    });

    test('a soft-held search keeps focus and refuses its clear action', async () => {
      const page = await opened();
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
    });

    test('a programmatic search fix clears its refusal and invalid state', async () => {
      const page = await opened();
      const form = page.locator('#search-field form');
      const field = form.getByRole('searchbox');
      const error = form.locator('.sui-search-field-error');
      await form.getByRole('button', { name: 'Search Events', exact: true }).click();
      await error.waitFor();
      await form
        .getByRole('button', { name: 'Fix the Audit Query' })
        .evaluate((button) => /** @type {HTMLButtonElement} */ (button).click());
      await error.waitFor({ state: 'detached' });
      assert.equal(await field.inputValue(), 'valid');
      assert.equal(await field.getAttribute('aria-invalid'), null);
    });

    test('a committed value loses the spaces at its ends, so a pattern takes it', async () => {
      const page = await opened();
      const name = page.locator('#field input[name="repository"]');
      const contact = page.locator('#field input[name="contact"]');
      await name.fill('my-repo ');
      await contact.fill('you@example.com');
      await contact.press('Enter');
      await page
        .locator('#field figcaption', { hasText: /^Sent my-repo for you@example\.com$/ })
        .waitFor();
      await name.fill('   ');
      await contact.focus();
      assert.equal(await name.inputValue(), '', 'spaces alone stayed as a value');
    });
  });

  suite('durations, hovers and pickers', { concurrency: 1 }, () => {
    const opened = sharedPage();
    /** @param {import('playwright-core').Page} page */
    const retryDelay = (page) =>
      page.locator('#duration-input .specimen').filter({
        has: page.getByRole('textbox', { name: 'Retry delay' })
      });

    // First, so the fields it reads at rest hold neither focus nor the pointer.
    test(
      'a hover on a joined unit lights the whole field and the unit over it, which stays lit open',
      long,
      async () => {
        const page = await opened();
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
      }
    );

    // Before any other test changes the retry delay from the 90 seconds it starts at.
    test('duration precision rejects real fractions but allows unit conversion noise', async () => {
      const page = await opened();
      const specimen = retryDelay(page);
      const amount = specimen.getByRole('textbox', { name: 'Retry delay' });
      await amount.fill('4503599627370495.5');
      assert.match((await specimen.textContent()) ?? '', /Stored as 90\sseconds/);
      await specimen.locator('select').selectOption('hours');
      await amount.fill('0.0002777777777777778');
      assert.match((await specimen.textContent()) ?? '', /Stored as 1\ssecond/);
      // 8.2 × 60 is 491.99999999999994: the noise grows with the seconds, not the unit.
      await specimen.locator('select').selectOption('minutes');
      await amount.fill('8.2');
      assert.match((await specimen.textContent()) ?? '', /Stored as 492\sseconds/);
    });

    test('66 seconds becomes 1.1 minutes without changing the seconds', async () => {
      const page = await opened();
      const specimen = retryDelay(page);
      const amount = specimen.getByRole('textbox', { name: 'Retry delay' });
      // The test before leaves the unit at minutes.
      await specimen.locator('select').selectOption('seconds');
      await amount.fill('66');
      await specimen.locator('select').selectOption('minutes');
      assert.equal(await amount.inputValue(), '1.1');
      assert.match((await specimen.textContent()) ?? '', /Stored as 66\sseconds/);
    });

    test('a joined field rings the part that holds focus', long, async () => {
      const page = await opened();
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
    });

    test('a reset key replaces an invalid draft when the owner value stays identical', async () => {
      const page = await opened();
      const amount = page.getByRole('textbox', { name: 'Check cadence' });
      await amount.fill('0.5');
      await amount.blur();
      const discard = page.getByRole('button', { name: 'Discard the Cadence' });
      await discard.click();
      assert.equal(await discard.getAttribute('data-reset'), '1');
      assert.equal(await amount.inputValue(), '30');
      // The owner heard the draft's problem, so it hears the problem go with it: Save then saves
      // instead of sending focus back to the amount.
      await page.getByRole('button', { name: 'Save the Cadence' }).click();
      assert.equal(await amount.evaluate((node) => node === document.activeElement), false);
    });

    // The audit reads fields at rest; a hover firms the frame, so the recess must firm with it.
    test('a hovered field keeps its recess darker than its frame', long, async () => {
      const page = await opened();
      for (const selector of [
        '#text-input .sui-text-input',
        '#textarea .sui-textarea',
        '#select .sui-select-control',
        '#duration-input .sui-joined'
      ]) {
        const field = page.locator(selector).first();
        await field.hover();
        await atRest(page);
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
    });

    test(
      'a hover on either part of a pair chip lights the whole chip, and the remove part over it',
      long,
      async () => {
        const page = await opened();
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
      }
    );

    test(
      'a saving pane hands focus to Save and disables its fields until the save ends',
      long,
      async () => {
        const page = await opened();
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
      }
    );

    test(
      'the color picker goes back on Escape, even mid-drag, leaving no autofocus mark, moves its hue as a native range, focuses each part from its name, stills the page while dragged, keeps a long hex as typed, and commits a short hex and closes when Tab leaves it',
      long,
      async () => {
        const page = await opened();
        const trigger = page.locator('#color-picker button[aria-haspopup="dialog"]').first();
        const start = (await trigger.textContent())?.trim();
        // The picker takes focus a tick after it opens, and the keys go where focus is.
        const open = async () => {
          await trigger.click();
          await page.waitForFunction(() =>
            document.activeElement?.closest('.sui-popover:popover-open')
          );
        };
        // A Modal opens on the first `[autofocus]` it holds, so a mark left in a closed panel
        // would send a reopened dialog's focus to a hidden control.
        const marks = () => page.evaluate(() => document.querySelectorAll('[autofocus]').length);
        const unmarked = await marks();
        await open();
        await page.keyboard.press('ArrowRight');
        assert.notEqual((await trigger.textContent())?.trim(), start, 'the arrow picked nothing');

        const hue = page.locator(':popover-open').getByRole('slider', { name: 'Hue' });
        assert.equal(
          await hue.evaluate((node) => node instanceof HTMLInputElement && node.type),
          'range'
        );
        // Hover waits for the panel to stop growing, so the press lands where it is read.
        await page.locator(':popover-open .hue').hover();
        const rail = /** @type {{ x: number, y: number, width: number, height: number }} */ (
          await page.locator(':popover-open .hue').boundingBox()
        );
        // A point along the drawn rail is that far round the wheel, so the native thumb's travel
        // matches the drawing. A press on the thumb itself keeps the value, so the quarter comes
        // first, away from the sample's hue near the middle.
        const at = async (/** @type {number} */ part) => {
          await page.mouse.click(rail.x + rail.width * part, rail.y + rail.height / 2);
          return Number(await hue.inputValue());
        };
        const quarter = await at(0.25);
        assert.ok(Math.abs(quarter - 90) <= 2, `a quarter along the rail reads ${quarter}°`);
        const half = await at(0.5);
        assert.ok(Math.abs(half - 180) <= 2, `the middle of the rail reads ${half}°`);
        await hue.press('ArrowRight');
        assert.equal(Number(await hue.inputValue()), half + 2);
        await hue.press('Shift+ArrowLeft');
        assert.equal(Number(await hue.inputValue()), half - 18);

        // A click on a part's name focuses that part, as a label does.
        for (const [name, part] of [
          ['Hue', '.hue-range'],
          ['Saturation & brightness', '.area']
        ]) {
          await page.locator(':popover-open .part-label').getByText(name, { exact: true }).click();
          assert.ok(
            await page.evaluate((part) => document.activeElement?.matches(part), part),
            `a click on "${name}" left focus elsewhere`
          );
        }

        // L-116 a drag chooses no text and stills the rest of the page until it ends.
        const area = /** @type {{ x: number, y: number, width: number, height: number }} */ (
          await page.locator(':popover-open .area').boundingBox()
        );
        const still = () =>
          page.evaluate(() => ({
            select: getComputedStyle(document.documentElement).userSelect,
            page: /** @type {HTMLElement} */ (document.querySelector('#buttons')).closest('[inert]')
              ? 'inert'
              : 'live'
          }));
        // The page's own inline choice comes back with its priority once the drag ends.
        await page.evaluate(() =>
          document.documentElement.style.setProperty('-webkit-user-select', 'text', 'important')
        );
        await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2);
        await page.mouse.down();
        await page.mouse.move(area.x + area.width / 3, area.y + area.height / 3, { steps: 4 });
        assert.deepEqual(
          await still(),
          { select: 'none', page: 'inert' },
          'the drag left the page live'
        );
        await page.mouse.up();
        assert.deepEqual(await still(), { select: 'text', page: 'live' }, 'the page stayed held');
        assert.equal(
          await page.evaluate(() => {
            const { style } = document.documentElement;
            const kept = style.getPropertyPriority('-webkit-user-select');
            style.removeProperty('-webkit-user-select');
            return kept;
          }),
          'important'
        );

        // Escape in the middle of a drag closes the picker and gives back the page and focus.
        await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2);
        await page.mouse.down();
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.querySelector('.sui-popover:popover-open'));
        assert.equal((await still()).page, 'live', 'the closed picker left the page inert');
        assert.ok(await trigger.evaluate((button) => document.activeElement === button));
        await page.mouse.up();
        assert.equal((await trigger.textContent())?.trim(), start);
        assert.equal(await marks(), unmarked, 'the closed picker left an autofocus mark');

        await open();
        const hex = page.locator('.sui-popover:popover-open input.sui-text-input');
        await hex.fill('#0e8a16ff');
        assert.equal(await hex.inputValue(), '#0e8a16ff', 'the field cut what was typed');
        await hex.fill('#abc');
        await page.keyboard.press('Tab');
        await page.waitForFunction(() => !document.querySelector('.sui-popover:popover-open'));
        assert.ok(
          await page.evaluate(() => document.activeElement !== document.body),
          'focus fell to the body'
        );
        assert.match((await trigger.textContent()) ?? '', /#aabbcc/, 'the short hex was dropped');
      }
    );

    // Last, because it leaves its picker open.
    test(
      'I4 swatches given as bare hex are named by their colour, not only their code',
      long,
      async () => {
        const page = await opened();
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
      }
    );
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

  test('the link field grows by its lines as its value lengthens, in CSS alone', async () => {
    const page = await open();
    try {
      // A browser without `field-sizing` keeps a text area at its rows, so the field must not
      // lean on it.
      await page.addStyleTag({
        content: '.sui-copyable-link-value { field-sizing: fixed !important; }'
      });
      const field = page.getByRole('textbox', { name: 'Invitation link' });
      await field.evaluate((area) => {
        const root = /** @type {HTMLElement} */ (area.closest('.sui-copyable-link-field'));
        root.style.inlineSize = '16rem';
      });
      const before = await field.evaluate((area) => area.getBoundingClientRect().height);
      await page.getByRole('button', { name: 'Lengthen the Invitation' }).click();
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

  test('the save shortcut follows the letter the layout types and is named for the platform, and unsaved work asks before the page or the app moves on', async () => {
    const page = await open({ path: 'save-bar/' });
    try {
      const field = page.locator('#save-bar input').first();
      const apple = await page.evaluate(() => /mac|iphone|ipad/i.test(navigator.platform));
      assert.match(
        (await page.locator('#save-bar .note').first().textContent()) ?? '',
        apple ? /⌘S saves/ : /Ctrl\+S saves/
      );
      await field.click();
      await page.keyboard.type('-x');
      // On Dvorak the S sits where QWERTY has the semicolon, and the O where QWERTY has the S.
      const saves = (/** @type {string} */ key, /** @type {string} */ code) =>
        field.evaluate(
          (input, [key, code]) =>
            !input.dispatchEvent(
              new KeyboardEvent('keydown', {
                key,
                code,
                ctrlKey: true,
                metaKey: true,
                bubbles: true,
                cancelable: true
              })
            ),
          [key, code]
        );
      assert.equal(await saves('o', 'KeyS'), false, 'Cmd+O on Dvorak saved');
      assert.equal(await saves('s', 'Semicolon'), true, 'Cmd+S on Dvorak did not save');

      // The save ran; a click waits until the field takes input again, and new words make work.
      await field.click();
      await page.keyboard.type('-y');
      /** @type {string[]} */
      const asked = [];
      page.on('dialog', (dialog) => {
        asked.push(dialog.type());
        void dialog.dismiss();
      });
      // A move inside the app never unloads the page, so the app asks, and a refusal stays.
      // The router takes an injected link as its own, as it takes any in-app link.
      await Promise.all([
        page.waitForEvent('dialog'),
        page.evaluate(() => {
          const away = Object.assign(document.createElement('a'), { href: '../buttons/' });
          away.textContent = 'Buttons';
          document.body.append(away);
          away.click();
        })
      ]);
      await page.evaluate(() => new Promise(requestAnimationFrame));
      assert.deepEqual(asked, ['confirm'], 'the app moved on with no question');
      assert.match(page.url(), /\/save-bar\/$/, 'a refused move still left the page');
      await page.goto('about:blank').catch(() => {});
      assert.deepEqual(asked, ['confirm', 'beforeunload'], 'the page went with no question');
      await page.locator('#save-bar').getByRole('button', { name: 'Discard' }).first().click();
      await page.goto('about:blank');
      assert.deepEqual(asked, ['confirm', 'beforeunload'], 'a clean pane still asked');
    } finally {
      await page.close();
    }
  });

  test('text typed before the page hydrates stays and counts', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    try {
      /** @type {() => void} */
      let release = () => {};
      const held = new Promise((done) => (release = () => done(undefined)));
      await page.route('**/_app/immutable/**/*.js', async (route) => {
        await held;
        await route.continue();
      });
      await page.goto(allSections(url), { waitUntil: 'commit' });
      const pattern = page.locator('#pattern-entries .sui-pattern-input').first();
      const runtime = page.getByRole('combobox', { name: 'Runtime' });
      await pattern.fill('trunk/*');
      await runtime.fill('Pyth');
      release();
      await page.waitForFunction(() => '__suiAudit' in window);
      assert.equal(await pattern.inputValue(), 'trunk/*', 'hydration wrote over the pattern');
      assert.equal(
        await page.locator('#pattern-entries .sui-pattern-copy').first().textContent(),
        'trunk/*',
        'the list never heard the typed pattern'
      );
      assert.equal(await runtime.inputValue(), 'Pyth');
      assert.equal(await runtime.getAttribute('aria-expanded'), 'true', 'the combobox ignored it');
    } finally {
      await page.close();
    }
  });

  test('a duration amount reads the page language own digits', long, async () => {
    const page = await open({ lang: 'ar-EG', path: 'duration-input/' });
    try {
      const amount = page.getByRole('textbox', { name: 'Merge window' });
      const root = amount.locator('xpath=ancestor::div[contains(@class,"sui-duration-input")][1]');
      await amount.fill('٣');
      await page.keyboard.press('Tab');
      await page.locator('#duration-input figcaption', { hasText: '10800 seconds' }).waitFor();
      assert.equal(await root.locator('.sui-duration-problem').count(), 0);
      assert.equal(await amount.getAttribute('aria-invalid'), null);
    } finally {
      await page.close();
    }
  });
});
