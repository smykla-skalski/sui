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

    test(
      'a pending choice group keeps focus, refuses a new answer and turns its dot',
      long,
      async () => {
        const page = await opened();
        const group = page.locator('#choice-cards fieldset[aria-busy="true"]');
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
        const strength = await group
          .locator('.sui-choice-card:not(:has(input:disabled))')
          .evaluateAll((cards) =>
            cards.map((card) => [
              card.querySelector('input')?.checked,
              getComputedStyle(card).opacity,
              getComputedStyle(card.querySelector('.sui-choice-card-label') ?? card).color
            ])
          );
        assert.deepEqual(
          [...new Set(strength.map(([, opacity]) => opacity))],
          ['1'],
          'the answer that saves and the answers it refuses keep full strength'
        );
        const [chosenInk] = strength.filter(([chosen]) => chosen).map(([, , ink]) => ink);
        assert.ok(
          strength.filter(([chosen]) => !chosen).every(([, , ink]) => ink !== chosenInk),
          `the refused answers take the muted ink: ${JSON.stringify(strength)}`
        );
        assert.notEqual(
          await group
            .locator('.sui-choice-card:has(input:checked) .sui-choice-card-dot')
            .evaluate((dot) => getComputedStyle(dot).animationName),
          'none',
          'the saving answer turns its dot'
        );
        const [arc, rest] = await group
          .locator('.sui-choice-card:has(input:checked) .sui-choice-card-dot')
          .evaluate((dot) => {
            const style = getComputedStyle(dot);
            return [style.borderTopColor, style.borderRightColor];
          });
        assert.notEqual(arc, rest, 'the turning ring draws one side in the accent');
        assert.equal(
          await group
            .locator('.sui-choice-card:has(input:checked) .sui-choice-card-dot')
            .evaluate((dot) => getComputedStyle(dot, '::after').visibility),
          'visible',
          'the turning dot keeps its filled centre'
        );
        const off = page.locator('#choice-cards fieldset[aria-disabled="true"]:not([aria-busy])');
        assert.deepEqual(
          [
            ...new Set(
              await off
                .locator('.sui-choice-card')
                .evaluateAll((cards) => cards.map((card) => getComputedStyle(card).opacity))
            )
          ],
          ['1'],
          'a disabled group draws at full strength, as a disabled field does'
        );
        /** @param {import('playwright-core').Locator} card */
        const ink = (card) =>
          card.locator('.sui-choice-card-label').evaluate((label) => getComputedStyle(label).color);
        assert.notEqual(
          await ink(off.locator('.sui-choice-card:not(:has(input:checked))').first()),
          await ink(group.locator('.sui-choice-card:has(input:checked)')),
          "a disabled group's answers take the muted ink"
        );
        const answer = page
          .locator(
            '#choice-cards fieldset:not([aria-disabled]) .sui-choice-card:has(input:disabled)'
          )
          .first();
        assert.deepEqual(
          [await answer.evaluate((card) => getComputedStyle(card).opacity), await ink(answer)],
          ['1', await ink(off.locator('.sui-choice-card:not(:has(input:checked))').first())],
          'a disabled answer draws as a disabled group does, at full strength in the muted ink'
        );
        await page.emulateMedia({ forcedColors: 'active' });
        try {
          assert.equal(
            await ink(off.locator('.sui-choice-card:has(input:checked)')),
            await ink(off.locator('.sui-choice-card:not(:has(input:checked))').first()),
            "in high contrast a disabled group's chosen answer is GrayText as its others are"
          );
        } finally {
          await page.emulateMedia({ forcedColors: null });
        }
        /** @param {import('playwright-core').Locator} where */
        const paint = (where) =>
          where
            .locator('.sui-choice-card:has(input:checked)')
            .evaluate((card) => [
              getComputedStyle(card).backgroundColor,
              getComputedStyle(card.querySelector('.sui-choice-card-dot') ?? card, '::after')
                .backgroundColor
            ]);
        const [[liveGround, liveDot], [offGround, offDot]] = [await paint(group), await paint(off)];
        assert.ok(
          liveGround !== offGround && liveDot !== offDot,
          `a disabled group's chosen card drops the accent tint and dot: ${offGround} ${offDot}`
        );
      }
    );

    test(
      'every focused card rings 2px off its edge, a chosen one over a 1px brand edge',
      long,
      async () => {
        const page = await opened();
        await page.keyboard.press('Shift');
        const chosen = page
          .locator('#choice-cards fieldset:not([aria-disabled]) input:checked')
          .first();
        await chosen.evaluate((input) => input.focus());
        const { edge, brand, offset } = await chosen.evaluate((input) => {
          const probe = document.createElement('i');
          probe.style.color = 'var(--sui-brand-action)';
          input.after(probe);
          const brand = getComputedStyle(probe).color;
          probe.remove();
          return {
            edge: getComputedStyle(/** @type {Element} */ (input.parentElement)).boxShadow,
            brand,
            offset: getComputedStyle(input).outlineOffset
          };
        });
        assert.ok(edge.includes(brand) && edge.includes(' 1px'), `the chosen edge became ${edge}`);
        assert.equal(offset, '2px');
        const open = page
          .locator('#choice-cards fieldset:not([aria-disabled]) input:not(:checked):not(:disabled)')
          .first();
        await open.evaluate((input) => input.focus());
        assert.equal(await open.evaluate((input) => getComputedStyle(input).outlineOffset), '2px');
      }
    );

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
          const track = element.querySelector('.sui-switch-track');
          const strength = getComputedStyle(/** @type {Element} */ (track)).opacity;
          /** @type {HTMLElement} */ (element).click();
          return { busy, strength, checked: box.checked };
        });
        // A save at work keeps the track at full strength, as a busy button does (L-40).
        assert.deepEqual(
          second,
          { busy: true, strength: '1', checked: true },
          'a second flip ran while saving, or the saving track dimmed'
        );
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

    test('every note under a switch, a reason or an error, stands one distance from its track', async () => {
      const page = await opened();
      const gaps = await page.evaluate(() =>
        [
          ...document.querySelectorAll(
            '#switch :is(div.locked, .sui-switch:has(.sui-switch-error))'
          )
        ].map((holder) => {
          const track = holder.querySelector('.sui-switch-track')?.getBoundingClientRect();
          const words = holder.querySelector('.reason, .sui-switch-words');
          const range = document.createRange();
          range.selectNodeContents(/** @type {Node} */ (words));
          return Math.round(range.getBoundingClientRect().top - (track?.bottom ?? 0));
        })
      );
      assert.ok(gaps.length >= 4, `only ${gaps.length} notes under a switch`);
      assert.equal(new Set(gaps).size, 1, `the notes stand ${gaps.join(', ')}px from their tracks`);
    });

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

    test('a segmented control rings its track and draws a disabled choice without the accent', async () => {
      const page = await opened();
      await page.keyboard.press('Shift');
      const live = page
        .locator('#segmented-control .sui-segmented > .sui-segmented-track:not(:disabled)')
        .first();
      const radio = live.locator('input:checked');
      await radio.evaluate((input) => /** @type {HTMLInputElement} */ (input).focus());
      assert.deepEqual(
        await radio.evaluate((input) => {
          const track = /** @type {Element} */ (input.closest('.sui-segmented-track'));
          return [
            getComputedStyle(input).outlineStyle,
            getComputedStyle(track).outlineStyle,
            getComputedStyle(track).outlineOffset
          ];
        }),
        ['none', 'solid', '2px'],
        'the ring stands 2px off the track, as off every free-standing control'
      );
      /** @param {import('playwright-core').Locator} track */
      const look = (track) =>
        track.evaluate((element) => {
          const thumb = element.querySelector('.sui-segmented-thumb');
          const label = element.querySelector(
            '.sui-segmented-option.selected .sui-segmented-label'
          );
          const off = element.querySelector('.sui-segmented-option.disabled .sui-segmented-label');
          return {
            opacity: getComputedStyle(element).opacity,
            thumb: thumb ? getComputedStyle(thumb).backgroundColor : '',
            chosen: label ? getComputedStyle(label).opacity : '',
            other: off ? getComputedStyle(off).opacity : '1'
          };
        });
      const accent = (await look(live)).thumb;
      const whole = page
        .locator('#segmented-control .sui-segmented > .sui-segmented-track.off')
        .first();
      const option = page
        .locator('#segmented-control .sui-segmented > .sui-segmented-track:not(:disabled)')
        .filter({ has: page.locator('.selected.disabled') });
      // A chosen disabled option holds its control, so the options beside it are off as single
      // disabled options are, while a disabled whole keeps every word at full strength.
      for (const [name, track, other] of /** @type {const} */ ([
        ['a disabled control', whole, '1'],
        ['a chosen disabled option', option, '0.6']
      ])) {
        const seen = await look(track);
        assert.deepEqual(
          { ...seen, thumb: seen.thumb === accent },
          { opacity: '1', thumb: false, chosen: '1', other },
          `${name} stays at full strength and its thumb drops the accent`
        );
      }
      /** @param {import('playwright-core').Locator} track */
      const seat = (track) =>
        track.locator('.sui-segmented-thumb').evaluate((thumb) =>
          getComputedStyle(thumb)
            .boxShadow.split(/,(?![^(]*\))/)
            .map((layer) => layer.includes('inset'))
        );
      assert.deepEqual(
        [await seat(whole), await seat(option)],
        [[true], [true]],
        'a chosen disabled plate lies flat with its edge, among live options and in a disabled whole'
      );
      const among = page
        .locator('#segmented-control .sui-segmented > .sui-segmented-track:not(:disabled)')
        .filter({ has: page.locator('.disabled:not(.selected)') })
        .first();
      assert.equal(
        (await look(among)).other,
        '0.6',
        'a disabled option among live ones keeps the disabled opacity'
      );
      assert.notEqual(
        await whole.evaluate((element) => getComputedStyle(element).backgroundColor),
        await live.evaluate((element) => getComputedStyle(element).backgroundColor),
        "a disabled control takes the disabled field's fill"
      );
    });

    test("a segmented control's chosen words weigh more and no option resizes on a choice", async () => {
      const page = await opened();
      const track = page
        .locator('#segmented-control .sui-segmented > .sui-segmented-track:not(:disabled)')
        .first();
      const read = () =>
        track.evaluate((element) =>
          [...element.querySelectorAll('.sui-segmented-option')].map((option) => ({
            width: option.getBoundingClientRect().width,
            weight: getComputedStyle(
              /** @type {Element} */ (option.querySelector('.sui-segmented-word > span'))
            ).fontWeight,
            chosen: option.classList.contains('selected')
          }))
        );
      const before = await read();
      assert.deepEqual(
        before.map(({ weight, chosen }) => (chosen ? weight === '600' : weight === '500')),
        before.map(() => true),
        "the chosen words are semibold and the others medium, as a button's"
      );
      // Keys, not a click, so later tests on this page still see keyboard focus.
      const radio = track.locator('input:checked');
      await radio.evaluate((input) => /** @type {HTMLInputElement} */ (input).focus());
      await page.keyboard.press('ArrowRight');
      const after = await read();
      await page.keyboard.press('ArrowLeft');
      assert.notDeepEqual(
        after.map(({ chosen }) => chosen),
        before.map(({ chosen }) => chosen),
        'the click moved the choice'
      );
      assert.deepEqual(
        after.map(({ width }) => width),
        before.map(({ width }) => width),
        'every option keeps its width when the heavier weight moves'
      );
    });

    test('a segmented control whose choice is disabled holds it against a drag, a click and a hover', async () => {
      const page = await opened();
      const tracks = page.locator('#segmented-control .sui-segmented > .sui-segmented-track');
      const option = tracks.filter({ has: page.locator('.selected.disabled') }).first();
      const whole = page
        .locator('#segmented-control .sui-segmented > .sui-segmented-track.off')
        .first();
      try {
        for (const [name, track] of /** @type {const} */ ([
          ['a chosen disabled option', option],
          ['a disabled whole', whole]
        ])) {
          await track.scrollIntoViewIfNeeded();
          const chosen = () =>
            track.evaluate((node) => node.querySelector('input:checked')?.getAttribute('value'));
          const before = await chosen();
          const other = track.locator('label:not(.selected)').first();
          const from = await track.locator('label.selected').boundingBox();
          const to = await other.boundingBox();
          assert.ok(from && to);
          assert.deepEqual(
            await track.evaluate((node) => ({
              grab: getComputedStyle(/** @type {Element} */ (node.querySelector('label.selected')))
                .cursor,
              live: /** @type {Element} */ (node.parentElement).querySelectorAll(
                'input:enabled, select:enabled'
              ).length
            })),
            { grab: 'default', live: 0 },
            `${name} offers no grab and no option to move to`
          );
          await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
          await page.mouse.down();
          await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
          await page.mouse.up();
          assert.equal(await chosen(), before, `${name} let a drag move its choice`);
          await other.click({ force: true });
          assert.equal(await chosen(), before, `${name} let a click move its choice`);
          await other.hover();
          assert.equal(
            await other.evaluate((label) => getComputedStyle(label, '::before').opacity),
            '0',
            `${name} answers a hover`
          );
        }
      } finally {
        await page.mouse.move(0, 0);
        await page.keyboard.press('Shift');
      }
    });

    test('a segmented count on the track wears an edge and one on the thumb none', async () => {
      const page = await opened();
      const control = page.locator('#segmented-control .sui-segmented:has(.sui-count)').first();
      /** @param {string} which */
      const edged = (which) =>
        control
          .locator(`.sui-segmented-track .sui-segmented-option${which} .sui-count`)
          .first()
          .evaluate((count) => {
            const [color] = getComputedStyle(count).boxShadow.split(' 0px');
            return !/rgba\(\d+, \d+, \d+, 0\)/.test(color) && color !== 'none';
          });
      assert.deepEqual(
        [await edged(':not(.selected)'), await edged('.selected')],
        [true, false],
        'a count on the track draws its edge, and the thumb veil needs none'
      );
    });

    // No specimen pairs a count with a chosen disabled option, so the test sets the classes the
    // component would, and drops the thumb to stand in for the render before script measures it.
    test("a chosen disabled segment's count and unmeasured plate drop the live thumb's inks", async () => {
      const page = await opened();
      const control = page.locator('#segmented-control .sui-segmented:has(.sui-count)').first();
      /** @param {string} which */
      const countInk = (which) =>
        control
          .locator(`.sui-segmented-option${which} .sui-count`)
          .first()
          .evaluate((count) => getComputedStyle(count).color);
      const resting = await countInk(':not(.selected)');
      await control
        .locator('.sui-segmented-option.selected')
        .evaluate((option) => option.classList.add('disabled'));
      assert.equal(
        await countInk('.selected'),
        resting,
        'a chosen disabled count wears the resting count ink, not the thumb ink'
      );
      await page.emulateMedia({ forcedColors: 'active' });
      // The plate's ground eases into the system colours, so its paint is read once it lands.
      await page.evaluate(() =>
        Promise.all(
          document
            .getAnimations()
            .filter((animation) => animation instanceof CSSTransition)
            .map((animation) => animation.finished.catch(() => undefined))
        )
      );
      try {
        const off = page
          .locator('#segmented-control .sui-segmented > .sui-segmented-track.off')
          .first();
        /** @param {Element} plate */
        const paint = (plate) => {
          const style = getComputedStyle(plate);
          return [style.backgroundColor, style.outlineStyle, style.outlineColor];
        };
        const measured = await off.locator('.sui-segmented-thumb').evaluate(paint);
        await off.evaluate((track) => track.querySelector('.sui-segmented-thumb')?.remove());
        assert.deepEqual(
          await off.locator('.sui-segmented-option.selected').evaluate(paint),
          measured,
          'in high contrast an unmeasured disabled choice is Canvas edged in GrayText, as the measured thumb is'
        );
        assert.equal(
          await countInk('.selected'),
          await control
            .locator('.sui-segmented-option.selected .sui-segmented-label')
            .evaluate((label) => getComputedStyle(label).color),
          'in high contrast a chosen disabled count is GrayText, as its words are'
        );
      } finally {
        await page.emulateMedia({ forcedColors: null });
      }
    });

    test('a segmented hint stands the field gap under its control and describes it', async () => {
      const page = await opened();
      const control = page
        .locator('#segmented-control .sui-segmented:has(.sui-segmented-help)')
        .first();
      const placed = await control.evaluate((box) => {
        const track = /** @type {HTMLFieldSetElement} */ (
          box.querySelector(':scope > .sui-segmented-track')
        );
        const help = /** @type {HTMLElement} */ (box.querySelector('.sui-segmented-help'));
        const width = track.getBoundingClientRect().width;
        const words = help.textContent;
        help.textContent = `${words} `.repeat(6);
        const widened = track.getBoundingClientRect().width !== width;
        help.textContent = words;
        return {
          described: (track.getAttribute('aria-describedby') ?? '').split(' ').includes(help.id),
          gap: Math.round(help.getBoundingClientRect().top - track.getBoundingClientRect().bottom),
          widened
        };
      });
      assert.deepEqual(
        placed,
        { described: true, gap: 12, widened: false },
        'the hint describes the group, stands 12px under it and never widens it'
      );
    });

    test('a segmented track wears the edge of the select it turns into', async () => {
      const page = await opened();
      const edges = await page.evaluate(() => {
        const track = /** @type {Element} */ (
          document.querySelector('#segmented-control .sui-segmented > .sui-segmented-track')
        );
        const shown = /** @type {Element} */ (
          [...document.querySelectorAll('#segmented-control .sui-segmented-picker select')].find(
            (select) => select.checkVisibility()
          )
        );
        return [
          getComputedStyle(track).boxShadow.split(' 0px')[0],
          getComputedStyle(shown).borderTopColor
        ];
      });
      assert.equal(edges[0], edges[1], 'the track and its select wear one edge');
    });

    test('a segmented hairline parts bare options and gives way beside the thumb and a hover', async () => {
      const page = await opened();
      const track = page
        .locator('#segmented-control .sui-segmented-track:not(:disabled, .locked)')
        .filter({ has: page.locator('input[value="warnings"]:checked') })
        .filter({ has: page.locator('input[value="debug"]:disabled') })
        .first();
      const parts = () =>
        track.evaluate((element) =>
          [
            ...element.querySelectorAll(
              ':scope > .sui-segmented-option:has(+ .sui-segmented-option)'
            )
          ]
            .map((option) => getComputedStyle(option, '::after'))
            .map((line) => (line.content === 'none' ? 0 : Number(line.opacity)))
            .join(' ')
        );
      // Off | Errors, Errors | Warnings (thumb), Warnings | Info (thumb), Info | Debug.
      assert.equal(await parts(), '1 0 0 1');
      await track.locator('.sui-segmented-option').first().hover();
      await page.waitForFunction(
        (element) =>
          getComputedStyle(
            /** @type {Element} */ (
              /** @type {Element} */ (element).querySelector('.sui-segmented-option')
            ),
            '::after'
          ).opacity === '0',
        await track.elementHandle()
      );
      assert.equal(await parts(), '0 0 0 1', 'a hovered option drops the line beside its fill');
      await page.mouse.move(0, 0);
      await page.keyboard.press('Shift');
    });

    test('a segmented control that turns into a select keeps the width it had', async () => {
      const page = await opened();
      const widths = await page
        .locator('#segmented-control .sui-segmented:has(.sui-segmented-picker select:visible)')
        .evaluateAll((boxes) =>
          boxes.map((box) => [
            Math.round(box.getBoundingClientRect().width),
            Math.round(
              /** @type {Element} */ (
                box.querySelector('.sui-select-control')
              ).getBoundingClientRect().width
            )
          ])
        );
      assert.ok(widths.length >= 2, 'the page shows no segmented control as a select');
      for (const [box, select] of widths)
        assert.equal(select, box, 'the select fills the room the segments had');
    });

    test('select-to-radio focus lands on the first option when nothing is chosen', async () => {
      const page = await opened();
      const control = page
        .locator('#segmented-control .sui-segmented')
        .filter({ hasNot: page.locator('input:checked') })
        .first();
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
        'day'
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
      'L-55 two measured examples share a row that ends where the cards above end, and fill a phone line, where a divider parts two forms further than an action from its fields',
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
        const insets = await page.evaluate(() => {
          const stage = document
            .getElementById('field-narrow-width')
            ?.closest('.example')
            ?.querySelector('.stage');
          const box = stage?.getBoundingClientRect();
          const field = stage?.querySelector('.sui-field')?.getBoundingClientRect();
          return box && field && [field.left - box.left, box.right - field.right];
        });
        assert.ok(insets);
        assert.ok(
          Math.abs(insets[0] - insets[1]) < 1,
          `the narrow field stands ${insets[0]}px and ${insets[1]}px inside its frame`
        );
        const phone = await open({ width: 390 });
        const [, small, wrapped] = await frames(phone);
        const forms = await phone.evaluate(() => {
          const example = document.getElementById('field-refused-send')?.closest('.example');
          const refused = example?.querySelectorAll('figure')[1];
          const action = example?.querySelector('form .action');
          const caption = refused?.querySelector('figcaption')?.getBoundingClientRect();
          const end = action?.getBoundingClientRect();
          const last = action?.previousElementSibling?.getBoundingClientRect();
          return (
            refused &&
            caption &&
            end &&
            last && {
              between: caption.top - end.bottom,
              close: end.top - last.bottom,
              divider: getComputedStyle(refused).borderBlockStartWidth
            }
          );
        });
        await phone.close();
        assert.ok(forms);
        assert.ok(
          forms.between > forms.close,
          `two forms stand ${forms.between}px apart, as close as an action to its fields (${forms.close}px)`
        );
        assert.equal(forms.divider, '1px', 'a divider parts the two forms');
        assert.ok(small && wrapped);
        assert.equal(wrapped.width, small.width, 'a wrapped frame keeps a narrow measure');
      }
    );

    test(
      'the Textarea states start their boxes on one line, no specimen cuts a line of its text, a divider parts the stacked field pair, and no line of the lead ends on a one-letter word',
      long,
      async () => {
        /** @param {import('playwright-core').Page} page */
        const boxes = (page) =>
          page.evaluate(() =>
            [...document.querySelectorAll('#textarea .sui-textarea')].map((box) => ({
              top: box.getBoundingClientRect().top,
              cut: box.scrollHeight - box.clientHeight,
              states: Boolean(box.closest('.example')?.querySelector('#textarea-states'))
            }))
          );
        const wide = await boxes(await opened());
        const row = wide.filter((box) => box.states).slice(0, 3);
        assert.equal(row.length, 3);
        assert.ok(
          row.every((box) => box.top === row[0].top),
          `the first states row starts at ${row.map((box) => box.top)}`
        );
        const phone = await open({ width: 390 });
        const narrow = await boxes(phone);
        const divider = await phone.evaluate(() => {
          const pair = document.getElementById('textarea-in-a-field')?.closest('.example');
          const second = pair?.querySelectorAll('figure')[1];
          return second && getComputedStyle(second).borderBlockStartWidth;
        });
        await phone.close();
        assert.equal(divider, '1px', 'a divider parts the stacked field pair');
        for (const box of [...wide, ...narrow])
          assert.ok(box.cut <= 0, `a textarea hides ${box.cut}px of its text`);
        // At 1440 the lead's line break falls right after its one-letter word "A".
        const own = await open({ path: 'textarea/' });
        const dangling = await own.evaluate(() => {
          const text = document.querySelector('.sui-page-header-description')?.firstChild;
          if (!(text instanceof Text)) return ['no lead'];
          /** @param {number} at */
          const top = (at) => {
            const range = document.createRange();
            range.setStart(text, at);
            range.setEnd(text, at + 1);
            return range.getBoundingClientRect().top;
          };
          return [...text.data.matchAll(/(?<=^|\s)\p{L}(?=\s)/gu)]
            .filter((word) => top(word.index) !== top(word.index + 2))
            .map((word) => text.data.slice(word.index, word.index + 12));
        });
        await own.close();
        assert.deepEqual(dangling, [], 'a one-letter word ends a line of the lead');
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

    test('every invalid input draws one danger edge in both themes, a switch and a box too', async () => {
      const page = await opened();
      const edges = await page.evaluate(() => {
        const root = document.documentElement;
        const theme = root.dataset.theme;
        /** @type {Record<string, string[]>} */
        const drawn = {};
        for (const scheme of ['light', 'dark']) {
          root.dataset.theme = scheme;
          const probe = document.body.appendChild(document.createElement('i'));
          probe.style.color = 'var(--sui-danger-edge)';
          const edge = getComputedStyle(probe).color;
          probe.remove();
          /** @param {string} selector @param {(style: CSSStyleDeclaration) => string} paint */
          const off = (selector, paint) => {
            const element = document.querySelector(selector);
            return element && paint(getComputedStyle(element)).includes(edge) ? [] : [selector];
          };
          drawn[scheme] = [
            ...off('#text-input .sui-text-input[aria-invalid="true"]', (s) => s.borderTopColor),
            ...off('#switch .sui-switch-track.invalid', (s) => s.borderTopColor + s.outlineColor),
            ...off('#field .sui-checkbox-box.invalid', (s) => s.borderTopColor + s.outlineColor)
          ];
        }
        if (theme) root.dataset.theme = theme;
        else delete root.dataset.theme;
        return drawn;
      });
      assert.deepEqual(edges, { light: [], dark: [] }, 'these drew an edge of another red');
    });

    test('an invalid box keeps its size, and a focused invalid switch or box its ring 2px clear', async () => {
      const page = await opened();
      const drawn = await page.evaluate(() =>
        ['#switch .sui-switch-track.invalid', '#field .sui-checkbox-box.invalid'].map(
          (selector) => {
            const part = /** @type {HTMLElement} */ (document.querySelector(selector));
            const input = /** @type {HTMLInputElement} */ (part.previousElementSibling);
            const rest = getComputedStyle(part);
            const restOutset =
              rest.outlineStyle === 'none'
                ? 0
                : parseFloat(rest.outlineWidth) + parseFloat(rest.outlineOffset);
            input.focus();
            const focused = getComputedStyle(part);
            const shown = {
              selector,
              restOutset,
              focused: input.matches(':focus-visible'),
              edge: focused.borderTopWidth,
              doubled: focused.outlineStyle !== 'none',
              ringOffset: getComputedStyle(input).outlineOffset
            };
            input.blur();
            return shown;
          }
        )
      );
      assert.deepEqual(drawn, [
        {
          selector: '#switch .sui-switch-track.invalid',
          restOutset: 1,
          focused: true,
          edge: '1px',
          doubled: false,
          ringOffset: '2px'
        },
        {
          selector: '#field .sui-checkbox-box.invalid',
          restOutset: 0,
          focused: true,
          edge: '2px',
          doubled: false,
          ringOffset: '2px'
        }
      ]);
    });

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

    test('an open select copy is the closed field turned over, as wide and tall as its picker, its groups lined and headed on the names, an off option dimming its name only', async () => {
      const page = await opened();
      const look = await page.evaluate(() => {
        const section = /** @type {Element} */ (document.querySelector('#select'));
        const width = (/** @type {Element | null | undefined} */ node) =>
          node?.getBoundingClientRect().width ?? 0;
        const closed = section.querySelector('.sui-select:not(.sui-select-preview *)');
        const copies = [...section.querySelectorAll('.sui-select-preview')].map((preview) => ({
          field: width(preview.querySelector('.sui-select')),
          sheet: width(preview.querySelector('.sui-select-sheet')),
          chevron: getComputedStyle(
            /** @type {Element} */ (preview.querySelector('.sui-select-chevron'))
          ).rotate
        }));
        const sheet = /** @type {Element} */ (
          [...section.querySelectorAll('.sui-select-sheet')].find((node) =>
            node.querySelector('.sui-select-heading')
          )
        );
        const start = (/** @type {Element} */ node) => {
          const range = document.createRange();
          range.selectNodeContents(node);
          return range.getBoundingClientRect().left;
        };
        const strength = (/** @type {Element} */ node) => {
          let opacity = 1;
          for (let at = /** @type {Element | null} */ (node); at; at = at.parentElement)
            opacity *= parseFloat(getComputedStyle(at).opacity);
          return opacity;
        };
        const off = /** @type {Element} */ (
          section.querySelector('.sui-select-sheet [aria-disabled="true"]:has(.sui-select-note)')
        );
        const lines = (/** @type {ParentNode} */ list) =>
          [...list.querySelectorAll('.sui-select-heading')].map(
            (heading) => getComputedStyle(heading).borderBlockStartWidth
          );
        const live = /** @type {HTMLSelectElement} */ (
          [...section.querySelectorAll('select')].find((select) => select.querySelector('optgroup'))
        );
        return {
          closed: width(closed),
          copies,
          heading: start(/** @type {Element} */ (sheet.querySelector('.sui-select-heading'))),
          name: start(/** @type {Element} */ (sheet.querySelector('.sui-select-label'))),
          off: {
            name: strength(/** @type {Element} */ (off.querySelector('.sui-select-label'))),
            reason: strength(/** @type {Element} */ (off.querySelector('.sui-select-note')))
          },
          lines: { copy: lines(sheet), live: lines(live) },
          tall: [...section.querySelectorAll('.sui-select-sheet')].map((node) => ({
            height: node.getBoundingClientRect().height,
            cut: node.scrollHeight > node.clientHeight
          }))
        };
      });
      assert.ok(look.copies.length >= 3, 'the page shows the open copies');
      for (const copy of look.copies) {
        assert.equal(copy.field, look.closed, 'an open copy keeps the closed field width');
        assert.equal(copy.sheet, copy.field, 'its picker is as wide as its field');
        assert.equal(copy.chevron, '180deg', 'its chevron is turned over');
      }
      assert.ok(
        Math.abs(look.heading - look.name) < 1,
        'a group heading starts where the names do'
      );
      // An option that cannot be chosen dims its name, never the reason it gives (L-40).
      assert.ok(Math.abs(look.off.name - 0.6) < 0.01, `an off name stands at ${look.off.name}`);
      assert.equal(look.off.reason, 1, 'an off option keeps its reason at full contrast');
      // A group after a row stands under a line, in the copy and in the live picker alike.
      assert.deepEqual(look.lines.copy, ['1px', '1px']);
      assert.deepEqual(look.lines.live, ['1px', '1px']);
      // The copy stops where the real picker does, so a long list is cut as it is.
      for (const sheet of look.tall)
        assert.ok(sheet.height <= 320, `a copy runs ${sheet.height}px`);
      assert.ok(
        look.tall.some((sheet) => sheet.cut),
        'a long list is cut at the picker height'
      );
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

    test('a disabled search draws no clear button, and a long query ends in an ellipsis at rest', async () => {
      const page = await opened();
      const field = page.getByRole('searchbox', { name: 'Search the locked projects' });
      const root = field.locator('xpath=ancestor::div[contains(@class,"sui-search-field")][1]');
      assert.equal(await root.getByRole('button', { name: 'Clear the search' }).count(), 0);
      await field.press('Escape').catch(() => {});
      assert.equal(await field.inputValue(), 'Locked');
      const long = page.locator('#search-field .narrow input');
      assert.ok(await long.evaluate((input) => input.scrollWidth > input.clientWidth));
      assert.equal(
        await long.evaluate((input) => getComputedStyle(input).textOverflow),
        'ellipsis'
      );
    });

    test('a soft-held search keeps focus, refuses its clear action and wears the read-only paint', async () => {
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
      const paint = (/** @type {import('playwright-core').Locator} */ input) =>
        input.evaluate((node) => {
          const style = getComputedStyle(node);
          return [
            style.backgroundColor,
            style.borderInlineStartColor,
            style.boxShadow,
            style.color
          ];
        });
      const readOnly = page.locator('#text-input input[readonly]').first();
      assert.deepEqual(await paint(field), await paint(readOnly));
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

    test("a search says a caller's error under it, and its words start 8px past its 16px magnifier", async () => {
      const page = await opened();
      const field = page.getByRole('searchbox', { name: 'Search the teams' }).first();
      assert.equal(await field.getAttribute('aria-invalid'), 'true');
      const said = await field.evaluate((input) =>
        (input.getAttribute('aria-describedby') ?? '')
          .split(' ')
          .map((id) => document.getElementById(id)?.textContent?.trim())
          .join(' ')
      );
      assert.match(said, /Enter at least 3 characters to search/);
      const inset = await field.evaluate((input) => {
        const icon = input.parentElement?.querySelector('.sui-search-field-icon svg');
        const box = input.getBoundingClientRect();
        const glyph = icon?.getBoundingClientRect();
        return {
          size: glyph?.width,
          start: (glyph?.left ?? 0) - box.left,
          gap:
            box.left + parseFloat(getComputedStyle(input).paddingInlineStart) - (glyph?.right ?? 0)
        };
      });
      assert.deepEqual(inset, { size: 16, start: 12, gap: 8 });
    });

    test('paired examples share a row on a wide page, pad 24px like every wide frame and stack on a phone', async () => {
      const pairs = [
        ['#search-field-soft-hold', '#search-field-in-context'],
        ['#field-in-context', '#field-narrow-width'],
        ['#switch-keyboard-focus', '#switch-narrow-width'],
        ['#checkbox-required-invalid', '#checkbox-narrow-width']
      ];
      /** @param {import('playwright-core').Page} page */
      const frames = (page) =>
        page.evaluate(
          (ids) =>
            ids.map((id) => {
              const frame = document
                .querySelector(id)
                ?.closest('.example')
                ?.querySelector('.frame');
              const box = frame?.getBoundingClientRect();
              const stage = frame?.querySelector('.stage');
              const pad = stage ? parseFloat(getComputedStyle(stage).paddingInlineStart) : NaN;
              return { top: box?.top, left: box?.left, pad };
            }),
          [...pairs.flat(), '#search-field-narrow-width']
        );
      const wide = await frames(await opened());
      for (const [index, [first, second]] of pairs.entries()) {
        const [one, two] = wide.slice(index * 2, index * 2 + 2);
        assert.equal(one.top, two.top, `${first} and ${second} start on one line`);
        assert.ok((two.left ?? 0) > (one.left ?? 0), `${second} stands beside ${first}`);
      }
      assert.deepEqual(
        new Set(wide.map(({ pad }) => pad)),
        new Set([24]),
        'a wide page pads every stage 24px, however narrow its frame'
      );
      const phone = await open({ width: 390 });
      const narrow = await frames(phone);
      await phone.close();
      for (const [index, [first, second]] of pairs.entries()) {
        const [one, two] = narrow.slice(index * 2, index * 2 + 2);
        assert.equal(one.left, two.left, `on a phone ${first} and ${second} stack`);
      }
      assert.equal(narrow[0].pad, 16, 'a phone pads its stages 16px');
    });

    test("a check box matrix's column heads stand on their boxes' edge", async () => {
      const page = await opened();
      const offsets = await page.evaluate(() => {
        const grid = document
          .querySelector('#checkbox-states')
          ?.closest('.example')
          ?.querySelector('.variants .grid');
        const heads = [...(grid?.querySelectorAll(':scope > .column') ?? [])];
        const boxes = [
          ...(grid?.querySelector('.row')?.querySelectorAll('.sui-checkbox-box') ?? [])
        ];
        return heads.map(
          (head, index) =>
            (boxes[index]?.getBoundingClientRect().left ?? NaN) - head.getBoundingClientRect().left
        );
      });
      assert.deepEqual(offsets, [0, 0, 0], 'each box starts where its column head does');
    });

    // The held row heads once painted the whole column gap, over the first column's ring.
    test("a matrix's held row heads cover no focus ring or hover ground", async () => {
      const page = await opened();
      const input = page
        .locator('#checkbox-states')
        .locator('xpath=ancestor::*[contains(@class, "example")]')
        .locator('.variants .row')
        .first()
        .locator('input')
        .first();
      /** @param {number} x @param {number} y */
      const pixel = async (x, y) => {
        const shot = await page.screenshot({ clip: { x: x - 0.5, y, width: 1, height: 1 } });
        return page.evaluate(
          async (data) => {
            const image = await createImageBitmap(await (await fetch(data)).blob());
            const context = new OffscreenCanvas(1, 1).getContext('2d');
            context?.drawImage(image, 0, 0);
            const [r, g, b] = context?.getImageData(0, 0, 1, 1).data ?? [];
            return `rgb(${r}, ${g}, ${b})`;
          },
          `data:image/png;base64,${shot.toString('base64')}`
        );
      };
      /** @param {string} state */
      const ringShows = async (state) => {
        await input.evaluate((element) => /** @type {HTMLElement} */ (element).blur());
        // A key first, so the focus that follows is a keyboard's and draws the ring. The page's
        // own focus, which scrolls only as the browser does; the driver's scrolls it into view.
        await page.keyboard.press('Shift');
        await input.evaluate((element) => /** @type {HTMLElement} */ (element).focus());
        const { x, y, ring, onBox } = await input.evaluate((element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          const y = rect.top + rect.height / 2;
          const top = document.elementFromPoint(rect.left + rect.width / 2, y);
          return {
            x: rect.left - parseFloat(style.outlineOffset) - parseFloat(style.outlineWidth) / 2,
            y,
            ring: style.outlineColor,
            onBox: Boolean(top && element.closest('label')?.contains(top))
          };
        });
        assert.ok(onBox, `${state}: the focused box stands under the held row heads`);
        assert.equal(
          await pixel(x, y),
          ring,
          `${state}: the held row heads cover the ring's start side`
        );
      };
      // The hover ground bleeds into the gap as far as the box does, and shows whole there.
      /** @param {string} state */
      const hoverShows = async (state) => {
        const row = input.locator('xpath=ancestor::label[1]');
        await input.evaluate((element) => /** @type {HTMLElement} */ (element).blur());
        await row.hover();
        const { left, right, middle } = await row.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return { left: rect.left + 1, right: rect.right - 1, middle: rect.top + rect.height / 2 };
        });
        assert.equal(
          await pixel(left, middle),
          await pixel(right, middle),
          `${state}: the held row heads cover the hover ground's start`
        );
        await page.mouse.move(0, 0);
      };
      const scroller = input.locator('xpath=ancestor::*[contains(@class, "variants")][1]');
      const scrolls = () => scroller.evaluate((box) => box.scrollWidth > box.clientWidth);
      try {
        assert.equal(await scrolls(), false, 'the matrix fits a wide page');
        await ringShows('fitting');
        await hoverShows('fitting');
        await page.setViewportSize({ width: 1024, height: 900 });
        await page.waitForFunction(
          (box) => box.scrollWidth > box.clientWidth,
          await scroller.elementHandle()
        );
        await scroller.evaluate((box) => box.scrollTo({ left: 0 }));
        await ringShows('scrolling, at its start');
        await hoverShows('scrolling, at its start');
        await scroller.evaluate((box) => box.scrollTo({ left: box.scrollWidth }));
        await ringShows('scrolled past the first column');
      } finally {
        await input.evaluate((element) => /** @type {HTMLElement} */ (element).blur());
        await page.setViewportSize({ width: 1440, height: 900 });
      }
    });

    test("a list a parent box chooses for stands under the parent's words", async () => {
      const page = await opened();
      const edges = await page.evaluate(() => {
        const stage = document
          .querySelector('#checkbox-in-context')
          ?.closest('.example')
          ?.querySelector('.stage');
        const [parent, child] = [...(stage?.querySelectorAll('.sui-checkbox') ?? [])];
        const left = (/** @type {Element | null | undefined} */ node) =>
          node?.getBoundingClientRect().left;
        const legend = stage?.querySelector('.sui-check-list legend');
        return {
          words: left(parent?.querySelector('.sui-checkbox-label')),
          box: left(child?.querySelector('.sui-checkbox-box')),
          gap:
            (legend?.getBoundingClientRect().top ?? NaN) -
            (parent?.getBoundingClientRect().bottom ?? NaN),
          fieldGap: parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue('--sui-field-gap')
          )
        };
      });
      assert.ok(edges.words !== undefined, 'the parent box has words');
      assert.equal(edges.box, edges.words, 'the first child box starts where the parent words do');
      assert.equal(
        edges.gap,
        edges.fieldGap * 16,
        "the list's legend stands a field gap under the parent, as its options under it"
      );
    });

    test("a section head's switch ends where its stage ends, as the head's action does on a pane", async () => {
      const page = await opened();
      const gap = await page.evaluate(() => {
        const track = document
          .querySelector('#switch-in-a-section-head')
          ?.closest('.example')
          ?.querySelector('.sui-section .sui-switch-track');
        const stage = track?.closest('.stage');
        if (!track || !stage) return NaN;
        const inner =
          stage.getBoundingClientRect().right -
          parseFloat(getComputedStyle(stage).paddingInlineEnd);
        return Math.round(inner - track.getBoundingClientRect().right);
      });
      assert.equal(gap, 0, `the switch stops ${gap}px short of the stage's inner edge`);
    });

    test('an on switch under the pointer takes the action hover fill, as a filled button does', async () => {
      const page = await opened();
      const row = page.locator('#switch .sui-switch-row', { hasText: 'Keep audit log' }).first();
      await row.hover();
      const fills = await row.evaluate(async (element) => {
        const box = /** @type {Element} */ (element.querySelector('.sui-switch-track'));
        await Promise.all(box.getAnimations().map((animation) => animation.finished));
        const probe = document.body.appendChild(document.createElement('i'));
        probe.style.color = 'var(--sui-brand-action-hover)';
        const hover = getComputedStyle(probe).color;
        probe.remove();
        const track = getComputedStyle(box);
        return { hover, fill: track.backgroundColor, edge: track.borderTopColor };
      });
      await page.mouse.move(0, 0);
      assert.deepEqual([fills.fill, fills.edge], [fills.hover, fills.hover]);
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
      'an off select and an off colour trigger draw as an off text field does, at full strength',
      long,
      async () => {
        const page = await opened();
        const looks = await page.evaluate(() =>
          [
            '#text-input input.sui-text-input:disabled',
            '#select .sui-select-control:disabled',
            '#color-picker button[aria-haspopup="dialog"]:disabled'
          ].map((selector) => {
            const field = /** @type {Element} */ (document.querySelector(selector));
            const look = getComputedStyle(field);
            const chevron = field.parentElement?.querySelector('.sui-select-chevron');
            return [
              look.backgroundColor,
              look.borderTopColor,
              look.boxShadow,
              look.color,
              look.opacity,
              chevron ? getComputedStyle(chevron).opacity : '1'
            ].join(' | ');
          })
        );
        assert.deepEqual(looks.slice(1), [looks[0], looks[0]]);
      }
    );

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
        // The wheel is drawn between the thumb's centres at the two ends, so a press picks the
        // hue drawn under it. A press on the thumb itself keeps the value, so the quarter comes
        // first, away from the sample's hue near the middle.
        const inset = await page
          .locator(':popover-open .thumb')
          .evaluate((thumb) => thumb.getBoundingClientRect().width / 2);
        const at = async (/** @type {number} */ part) => {
          await page.mouse.click(
            rail.x + inset + (rail.width - 2 * inset) * part,
            rail.y + rail.height / 2
          );
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
        // As on the rail, the plane is drawn between the knob's centres, so the knob stays inside
        // the area at its corners and a press picks the colour drawn under it.
        const knob = page.locator(':popover-open .knob');
        const reach = await knob.evaluate((element) => element.getBoundingClientRect().width / 2);
        const saturation = () =>
          page
            .locator(':popover-open .area')
            .evaluate((element) => Number(element.getAttribute('aria-valuenow')));
        await page.mouse.click(area.x + area.width - 1, area.y + 1);
        const corner = /** @type {{ x: number, y: number, width: number, height: number }} */ (
          await knob.boundingBox()
        );
        assert.ok(
          corner.x + corner.width <= area.x + area.width + 0.5 && corner.y >= area.y - 0.5,
          'the knob hangs past the area at its corner'
        );
        await page.mouse.click(
          area.x + reach + (area.width - 2 * reach) * 0.25,
          area.y + area.height / 2
        );
        const across = await saturation();
        assert.ok(Math.abs(across - 25) <= 2, `a quarter across the drawn plane reads ${across}%`);
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

    // The page's frames share one measure, as each kit page's do, and the four states keep one
    // row in it, the disabled one's reason wrapped under its own trigger.
    test('the colour picker page frames its examples alike, its states in one row and a locked reason in two lines', async () => {
      const page = await opened();
      const { widths, tops, reasonLines } = await page.evaluate(() => {
        const section = /** @type {Element} */ (document.querySelector('#color-picker'));
        const reason = /** @type {HTMLElement} */ (
          section.querySelector('.states .specimen:last-child [id$="-hint"]')
        );
        return {
          widths: [...section.querySelectorAll('.frame')].map(
            (frame) => frame.getBoundingClientRect().width
          ),
          tops: [...section.querySelectorAll('.states .specimen')].map(
            (specimen) => specimen.getBoundingClientRect().top
          ),
          reasonLines: Math.round(
            reason.getBoundingClientRect().height / parseFloat(getComputedStyle(reason).lineHeight)
          )
        };
      });
      assert.equal(widths.length, 3);
      assert.equal(new Set(widths).size, 1, `the frames are ${widths.join(', ')}px wide`);
      assert.equal(tops.length, 4);
      assert.equal(new Set(tops).size, 1, 'a state left the row');
      assert.ok(reasonLines <= 2, `the locked state's reason takes ${reasonLines} lines`);
    });

    // Last, because it leaves the page in its own state.
    test(
      "I4 swatches given as bare hex are named by their colour, not only their code, and a picker's trigger wears a field's edge, marked in forced colors, its knob and a focused swatch's ring kept clear",
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
        // Every part of the panel, the swatches too, is named by a label in view in a field
        // label's size, leading and ink, a weight under it, so the picker's own label leads (L-35).
        const parts = await page.evaluate(() => {
          const panel = /** @type {Element} */ (document.querySelector(':popover-open'));
          const field = /** @type {Element} */ (document.querySelector('.sui-field-label'));
          const set = (/** @type {Element} */ label, step = 0) => {
            const look = getComputedStyle(label);
            return `${Number(look.fontWeight) - step} ${look.fontSize}/${look.lineHeight} ${look.color}`;
          };
          const named = panel.querySelector('[role="radiogroup"]')?.getAttribute('aria-labelledby');
          return {
            swatches: named ? document.getElementById(named)?.checkVisibility() : false,
            sets: [...panel.querySelectorAll('.part-label')].map((label) => set(label)),
            field: set(field, 100)
          };
        });
        assert.ok(parts.swatches, 'the swatches have no label in view');
        assert.deepEqual(new Set(parts.sets), new Set([parts.field]));

        // A trigger holds a value, so it wears a Select's field edge and baseline: the rest
        // ones at rest, and the open one in a field's focus edge, its ring left to the keys.
        await page.mouse.move(0, 0);
        const edges = () =>
          page.locator('#color-picker button[aria-haspopup="dialog"]').evaluateAll((buttons) =>
            buttons.map((button) => {
              const paint = (/** @type {string} */ token) => {
                const probe = document.createElement('span');
                probe.style.color = `var(${token})`;
                button.append(probe);
                const color = getComputedStyle(probe).color;
                probe.remove();
                return color;
              };
              const look = getComputedStyle(button);
              const [ground, frame, base] =
                button.getAttribute('aria-expanded') === 'true'
                  ? ['--sui-control-bg', '--sui-field-frame-focus', '--sui-field-border-focus']
                  : ['--sui-control-bg', '--sui-field-frame', '--sui-field-border'];
              return (
                button.matches(':disabled') ||
                (look.backgroundColor === paint(ground) &&
                  look.borderTopColor === paint(frame) &&
                  look.borderBottomColor === paint(base))
              );
            })
          );
        assert.ok(
          (await edges()).every(Boolean),
          "a trigger wears a button's paint, not a field's"
        );
        const clear = await page.evaluate(() => {
          const panel = /** @type {Element} */ (document.querySelector(':popover-open'));
          const area = /** @type {Element} */ (
            panel.querySelector('.area')
          ).getBoundingClientRect();
          const probe = document.createElement('span');
          probe.style.color = 'var(--sui-border-control)';
          panel.append(probe);
          const edge = getComputedStyle(probe).color;
          probe.remove();
          const knob = /** @type {Element} */ (
            panel.querySelector('.knob')
          ).getBoundingClientRect();
          const thumb = /** @type {Element} */ (panel.querySelector('.thumb'));
          const hue = /** @type {Element} */ (panel.querySelector('.hue'));
          const rail = hue.getBoundingClientRect();
          return {
            aligned: rail.left === area.left && rail.right === area.right,
            reach: /** @type {Element} */ (
              panel.querySelector('.hue-range')
            ).getBoundingClientRect().height,
            rims: [hue, panel.querySelector('.area')].map(
              (part) => getComputedStyle(/** @type {Element} */ (part)).boxShadow
            ),
            edge,
            sizes: [knob.width, thumb.getBoundingClientRect().width]
          };
        });
        assert.equal(clear.sizes[0], clear.sizes[1], "the area's knob and the hue's thumb differ");
        assert.ok(clear.aligned, "the hue rail stops short of the area's edges");
        assert.equal(clear.rims[0], clear.rims[1], "the hue rail lacks the area's rim");
        assert.ok(
          clear.rims[0].includes(clear.edge),
          "the area's rim is fainter than a control's edge"
        );
        assert.ok(clear.reach >= 24, `the hue rail takes a press only ${clear.reach}px tall`);
        // The focused swatch's ring stays clear of the next swatch.
        await page.keyboard.press('ArrowRight');
        const room = await page.evaluate(() => {
          const swatch = /** @type {Element} */ (document.activeElement);
          const ring = getComputedStyle(swatch);
          const grid = /** @type {Element} */ (swatch.closest('.swatches'));
          return (
            parseFloat(getComputedStyle(grid).columnGap) -
            parseFloat(ring.outlineWidth) -
            parseFloat(ring.outlineOffset)
          );
        });
        assert.ok(room > 0, `a focused swatch's ring stands ${room}px from the next one`);
        // The swatches' name hands focus to the checked one, where the arrows go on from, never
        // back to the first.
        await page.locator(':popover-open .swatches').evaluate((grid) => {
          const name = document.getElementById(grid.getAttribute('aria-labelledby') ?? '');
          /** @type {HTMLElement} */ (name).click();
        });
        assert.ok(
          await page.evaluate(() => {
            const swatch = document.activeElement;
            return (
              swatch?.matches('.swatch:checked') &&
              swatch !== swatch.closest('.swatches')?.querySelector('.swatch')
            );
          }),
          "the swatches' name left focus off the checked swatch"
        );

        // High contrast drops the recess and the veil, so the open trigger and a hovered one
        // draw their edge in the system's highlight.
        await page.emulateMedia({ forcedColors: 'active' });
        try {
          const marked = () =>
            page.locator('#color-picker button[aria-haspopup="dialog"]').evaluateAll((buttons) => {
              const probe = document.createElement('span');
              probe.style.color = 'Highlight';
              document.body.append(probe);
              const highlight = getComputedStyle(probe).color;
              probe.remove();
              return buttons
                .filter((button) => button.matches(':hover, [aria-expanded="true"]'))
                .map((button) => getComputedStyle(button).borderTopColor === highlight);
            });
          await page.mouse.move(0, 0);
          assert.deepEqual(await marked(), [true], 'forced colors left the open trigger unmarked');
          await page.keyboard.press('Escape');
          await page.locator('#color-picker button[aria-haspopup="dialog"]').first().hover();
          assert.deepEqual(await marked(), [true], 'forced colors left a hovered trigger unmarked');
        } finally {
          await page.emulateMedia({ forcedColors: null });
        }

        // A focused trigger keeps its focus edge under the pointer, as a focused Select does.
        const first = page.locator('#color-picker button[aria-haspopup="dialog"]').first();
        await page.mouse.move(0, 0);
        await page.keyboard.press('Shift');
        await first.focus();
        const look = () =>
          first.evaluate((button) => {
            const style = getComputedStyle(button);
            return `${style.backgroundColor} ${style.backgroundImage} ${style.borderTopColor} ${style.borderBottomColor}`;
          });
        const focused = await look();
        await first.hover();
        await atRest(page);
        assert.equal(await look(), focused, 'a hover took a focused trigger out of its focus edge');
        // A hovered trigger wears a field's hover, never a button's veil and edge.
        await page.evaluate(() => /** @type {HTMLElement} */ (document.activeElement).blur());
        const hovered = await first.evaluate((button) => {
          const paint = (/** @type {string} */ token) => {
            const probe = document.createElement('span');
            probe.style.color = `var(${token})`;
            button.append(probe);
            const color = getComputedStyle(probe).color;
            probe.remove();
            return color;
          };
          const style = getComputedStyle(button);
          return (
            [
              style.backgroundColor,
              style.borderTopColor,
              style.backgroundImage.includes('0)')
            ].join(' ') ===
            [paint('--sui-field-hover'), paint('--sui-field-frame-hover'), true].join(' ')
          );
        });
        assert.ok(hovered, "a hovered trigger wears a button's hover, not a field's");
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

  test('a link field says a copy in the success ink on its tint, and a refusal in the danger ink on its tint with the value handed over selected, each 4.5:1 at rest, hovered and pressed', async () => {
    const page = await open({ path: 'copyable-link-field/' });
    try {
      const field = page.getByRole('textbox', { name: 'Invitation link' });
      const copy = page.getByRole('button', { name: 'Copy Link' });
      // The words against the ground as painted: each background layer, top first, blended in a
      // canvas over the grounds under the button down to the first opaque one.
      const said = () =>
        copy.evaluate((button) => {
          const shown = /** @type {HTMLElement} */ (
            [...button.querySelectorAll('.sui-copy-button-labels > span')].find(
              (label) => getComputedStyle(label).visibility === 'visible'
            )
          );
          const ink = (/** @type {string} */ token) => {
            const probe = document.createElement('span');
            probe.style.color = `var(${token})`;
            button.append(probe);
            const color = getComputedStyle(probe).color;
            probe.remove();
            return color;
          };
          /** @type {string[]} */
          const layers = [];
          for (let box = /** @type {Element | null} */ (button); box; box = box.parentElement) {
            const look = getComputedStyle(box);
            const colors = look.backgroundImage.match(/[a-z]+\([^()]*\)/g) ?? [];
            layers.push(...colors.filter((_, index) => index % 2 === 0), look.backgroundColor);
          }
          const pen = /** @type {CanvasRenderingContext2D} */ (
            document.createElement('canvas').getContext('2d', { willReadFrequently: true })
          );
          const paint = (/** @type {string[]} */ colors) => {
            pen.clearRect(0, 0, 1, 1);
            for (const color of colors) {
              pen.fillStyle = color;
              pen.fillRect(0, 0, 1, 1);
            }
            return [...pen.getImageData(0, 0, 1, 1).data.slice(0, 3)];
          };
          const opaque = layers.findIndex(
            (color) => String(paint(['#fff', color])) === String(paint(['#000', color]))
          );
          const ground = paint(layers.slice(0, opaque + 1).reverse());
          const words = paint([getComputedStyle(shown).color]);
          const light = (/** @type {number[]} */ rgb) =>
            rgb
              .map((value) => value / 255)
              .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
              .reduce((sum, c, index) => sum + c * [0.2126, 0.7152, 0.0722][index], 0);
          const [high, low] = [light(ground), light(words)].sort((a, b) => b - a);
          return {
            words: shown.textContent,
            ink: getComputedStyle(shown).color,
            image: getComputedStyle(button).backgroundImage,
            contrast: (high + 0.05) / (low + 0.05),
            success: ink('--sui-success'),
            danger: ink('--sui-danger'),
            successTint: ink('--sui-success-tint'),
            dangerTint: ink('--sui-danger-tint')
          };
        });
      const answer = (/** @type {boolean} */ lands) =>
        page.evaluate((lands) => {
          navigator.clipboard.writeText = () =>
            lands ? Promise.resolve() : Promise.reject(new DOMException('', 'NotAllowedError'));
        }, lands);
      const readable = async (/** @type {string} */ outcome) => {
        await page.mouse.move(0, 0);
        const rest = await said();
        await copy.hover();
        const hovered = await said();
        await page.mouse.down();
        const pressed = await said();
        await page.mouse.move(0, 0);
        await page.mouse.up();
        for (const [state, look] of Object.entries({ rest, hovered, pressed }))
          assert.ok(
            look.contrast >= 4.5,
            `${outcome} ${state} reads ${look.contrast.toFixed(2)}:1 on its ground`
          );
        return rest;
      };

      for (const scheme of /** @type {const} */ (['light', 'dark'])) {
        await page.emulateMedia({ colorScheme: scheme });
        await answer(true);
        await copy.click();
        await page.waitForFunction(() => document.querySelector('[data-copied]'));
        const copied = await readable(`${scheme} copied`);
        assert.equal(copied.words, 'Copied');
        assert.equal(copied.ink, copied.success, 'a copy is not said in the success ink');
        assert.ok(copied.image.includes(copied.successTint), 'a copy does not tint the ground');
      }

      const tall = () =>
        field.evaluate((area) => area.closest('.sui-joined')?.getBoundingClientRect().height);
      const rest = await tall();
      await answer(false);
      await copy.click();
      await page.waitForFunction(() => document.querySelector('[data-failed]'));
      assert.equal(await tall(), rest, 'the refusal stacked its words taller than the field');
      assert.deepEqual(
        await field.evaluate((/** @type {HTMLTextAreaElement} */ area) => ({
          focused: document.activeElement === area,
          selected: area.value.slice(area.selectionStart, area.selectionEnd) === area.value
        })),
        { focused: true, selected: true },
        'a refusal did not hand the value over selected'
      );
      for (const scheme of /** @type {const} */ (['light', 'dark'])) {
        await page.emulateMedia({ colorScheme: scheme });
        const failed = await readable(`${scheme} refused`);
        assert.equal(failed.words, 'Copy by Hand');
        assert.equal(failed.ink, failed.danger, 'a refusal is not said in the danger ink');
        assert.ok(failed.image.includes(failed.dangerTint), 'a refusal does not tint the ground');
      }
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
