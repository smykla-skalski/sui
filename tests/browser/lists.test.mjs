import assert from 'node:assert/strict';
import { after, before, suite, test } from 'node:test';
import { allSections, atRest, brief, long, settles, startSink, together, visit } from './sink.mjs';

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
    await visit(page, allSections(url));
    await page.evaluate(() => document.fonts.ready);
    return page;
  }

  /**
   * One page for the tests of the suite it is called in, opened by the first test that runs, so a
   * suite whose tests are all skipped opens none. A suite runs its tests in order, and one that
   * changes what another reads runs after it.
   * @param {import('playwright-core').BrowserContextOptions} [options]
   */
  function sharedPage(options) {
    /** @type {Promise<import('playwright-core').Page> | undefined} */
    let opened;
    after(() => opened?.then((page) => page.close()).catch(() => {}));
    return () => (opened ??= open(options));
  }

  /** @param {import('playwright-core').Page} page */
  const focused = (page) =>
    page.evaluate(() => {
      const element = document.activeElement;
      return element === document.body
        ? 'body'
        : `${element?.tagName.toLowerCase()} ${element?.getAttribute('aria-label') ?? element?.textContent?.trim() ?? ''} ${element instanceof HTMLInputElement ? element.value : ''}`.trim();
    });

  suite('the pattern entries', { concurrency: 1 }, () => {
    const opened = sharedPage();

    test("a block's names and every quiet copy control's words read at the 13px caption tier", async () => {
      const page = await opened();
      const sizes = await page.evaluate(() =>
        [
          ...document.querySelectorAll(
            '#code-block :is(.sui-code-block:not(.bare) :is(.sui-code-block-label, .sui-code-block-lang), .sui-copy-button:not(.toolbar, .bare))'
          )
        ].map((name) => `${name.textContent}: ${getComputedStyle(name).fontSize}`)
      );
      assert.ok(sizes.length >= 8, `only ${sizes.length} names and controls`);
      assert.deepEqual(
        sizes.filter((size) => !size.endsWith(': 13px')),
        [],
        'a name reads off the caption tier'
      );
    });

    test("a day feed's times read at the 13px caption tier, a step under their 14px entries", async () => {
      const page = await opened();
      const sizes = await page.evaluate(() => [
        ...new Set(
          [...document.querySelectorAll('#day-heading .entries time')].map(
            (time) => getComputedStyle(time).fontSize
          )
        )
      ]);
      assert.deepEqual(sizes, ['13px']);
    });

    test('a day feed keeps a form measure on a wide page, so each time stays near its entry', async () => {
      const page = await opened();
      const widths = await page.evaluate(() => {
        const feed = /** @type {Element} */ (document.querySelector('#day-heading .days'));
        const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
        const stage = /** @type {Element} */ (feed.parentElement).getBoundingClientRect().width;
        return { feed: feed.getBoundingClientRect().width / rem, stage: stage / rem };
      });
      assert.ok(widths.stage > 40, `the stage is only ${widths.stage}rem wide`);
      assert.ok(widths.feed <= 40, `the feed spans ${widths.feed}rem`);
    });

    test('P8 an entry that shows a problem follows its keystrokes', long, async () => {
      const page = await opened();
      const list = page
        .locator('#pattern-entries .specimen', { hasText: 'Invalid' })
        .locator('.sui-pattern-entries');
      await list.scrollIntoViewIfNeeded();
      const problems = () => list.locator('.sui-pattern-problem').count();
      const before = await problems();
      // The fourth entry repeats the second from the start, so it shows its problem on focus,
      // and one keystroke that makes it unique clears that problem at once.
      await list.getByRole('textbox', { name: 'Pattern 4' }).click();
      await page.keyboard.press('End');
      await page.keyboard.type('x');
      assert.equal(await problems(), before - 1, 'the entry in hand did not follow its keystroke');
    });

    test(
      'P8 and P9 a pattern is judged once left, and an emptied one comes back with Undo',
      long,
      async () => {
        const page = await opened();
        const list = page
          .locator('#pattern-entries .specimen', { hasText: 'Invalid' })
          .locator('.sui-pattern-entries');
        await list.scrollIntoViewIfNeeded();
        const problems = () => list.locator('.sui-pattern-problem').count();
        const before = await problems();

        await list.getByRole('button', { name: 'Add a Branch Pattern' }).click();
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
      }
    );

    // After the other tests of its list, because it leaves the first entry a duplicate that is
    // judged once focus leaves it.
    test(
      'P8 typing a duplicate into one pattern leaves the others unjudged until it is left',
      long,
      async () => {
        const page = await opened();
        const list = page
          .locator('#pattern-entries .specimen', { hasText: 'Invalid' })
          .locator('.sui-pattern-entries');
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
      }
    );

    test('pattern entries flow side by side with each cross inside its field', long, async () => {
      const page = await opened();
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
    });

    test(
      'every pattern stands one small step clear of its cross square, on either side, a short one too',
      long,
      async () => {
        const page = await opened();
        const gaps = await page
          .locator('#pattern-entries .specimen')
          .filter({ hasText: /^(A few entries|Right to left)/ })
          .locator('.sui-pattern-entry')
          .evaluateAll((entries) =>
            entries.map((entry) => {
              const words = /** @type {Element} */ (
                entry.querySelector('.sui-pattern-line')
              ).getBoundingClientRect();
              const cross = /** @type {Element} */ (
                entry.querySelector('.sui-pattern-remove')
              ).getBoundingClientRect();
              return Math.round(
                cross.left < words.left ? words.left - cross.right : cross.left - words.right
              );
            })
          );
        const step = await page.evaluate(() => {
          const probe = document.createElement('div');
          probe.style.inlineSize = 'var(--sui-space-1)';
          document.body.append(probe);
          const size = Math.round(probe.getBoundingClientRect().width);
          probe.remove();
          return size;
        });
        assert.ok(gaps.length > 4, 'the specimens hold too few entries to compare');
        assert.deepEqual(
          [...new Set(gaps)],
          [step],
          `the words stand ${gaps.join(', ')}px off their crosses, not ${step}px`
        );
      }
    );

    test('an off pattern paints its words once, all in the muted ink (L-40)', long, async () => {
      const page = await opened();
      const paint = await page
        .locator('#pattern-entries .specimen', { hasText: 'Disabled' })
        .locator('.sui-pattern-entry')
        .first()
        .evaluate((item) => {
          const probe = document.createElement('span');
          probe.style.color = 'var(--sui-text-muted)';
          item.append(probe);
          const muted = getComputedStyle(probe).color;
          probe.remove();
          const input = /** @type {HTMLElement} */ (item.querySelector('input'));
          const inks = [...item.querySelectorAll('.sui-pattern-copy span')].map(
            (span) => getComputedStyle(span).color
          );
          return {
            field: getComputedStyle(input).getPropertyValue('-webkit-text-fill-color'),
            copy: [...new Set(inks)].every((ink) => ink === muted)
          };
        });
      assert.deepEqual(paint, { field: 'rgba(0, 0, 0, 0)', copy: true });
    });

    test('a hover on any part of a pattern lights its whole field and its chip', long, async () => {
      const page = await opened();
      const entry = page
        .locator('#pattern-entries .specimen', { hasText: 'A few entries' })
        .locator('.sui-pattern-entry')
        .first();
      await entry.scrollIntoViewIfNeeded();
      const field = entry.locator('.sui-joined');
      const cross = entry.getByRole('button', { name: /^Remove/ });
      const ground = (/** @type {import('playwright-core').Locator} */ part, pseudo = '') =>
        part.evaluate(
          (element, pseudo) => getComputedStyle(element, pseudo).backgroundColor,
          pseudo
        );
      const rest = await ground(field);
      await entry.getByRole('textbox').hover();
      const lit = await ground(field);
      assert.notEqual(lit, rest, 'the pattern did not light its field');
      await cross.hover();
      assert.equal(await ground(field), lit, 'the cross did not light the whole field');
      assert.notEqual(await ground(cross, '::before'), 'rgba(0, 0, 0, 0)', 'the chip is unlit');
    });

    test(
      'L-89 removing the last pattern hands focus back, and Backspace in an empty entry steps back',
      long,
      async () => {
        const page = await opened();
        const list = page
          .locator('#pattern-entries .specimen', { hasText: 'A few entries' })
          .locator('.sui-pattern-entries');
        await list.scrollIntoViewIfNeeded();
        await list.getByRole('button', { name: 'Remove hotfix/*' }).focus();
        await page.keyboard.press('Enter');
        assert.match(await focused(page), /^input Pattern 2 release\/\*$/);

        await list.getByRole('button', { name: 'Add a Branch Pattern' }).click();
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
      }
    );

    test('pasting lines into an empty pattern reports each line exactly once', async () => {
      const page = await opened();
      const list = page
        .locator('#pattern-entries .specimen')
        .filter({ has: page.locator('#sink-pattern-added') })
        .locator('.sui-pattern-entries');
      await list.getByRole('button', { name: 'Add a Pattern' }).click();
      await list.getByRole('textbox').evaluate((input) => {
        const data = new DataTransfer();
        data.setData('text', 'a\nb');
        input.dispatchEvent(
          new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data })
        );
      });
      await page.waitForFunction(
        () => document.querySelector('#sink-pattern-added')?.textContent === 'a,b'
      );
      assert.deepEqual(
        await list
          .getByRole('textbox')
          .evaluateAll((inputs) =>
            inputs.map((input) => /** @type {HTMLInputElement} */ (input).value)
          ),
        ['a', 'b']
      );
      assert.equal(await page.locator('#sink-pattern-added').textContent(), 'a,b');
    });
  });

  suite('at phone width', { concurrency: 1 }, () => {
    const opened = sharedPage({ viewport: { width: 375, height: 812 } });

    test("L-59 L-90 on a phone a failed refresh's retry wraps under its words", async () => {
      const page = await opened();
      const strip = page
        .locator('#states .specimen', { hasText: 'Refresh failed' })
        .locator('.over');
      await strip.scrollIntoViewIfNeeded();
      const at = await strip.evaluate((node) => {
        const left = (/** @type {string} */ selector) =>
          /** @type {Element} */ (node.querySelector(selector)).getBoundingClientRect().left;
        return { words: left('.sui-error-state-title'), retry: left('button') };
      });
      assert.ok(
        Math.abs(at.retry - at.words) < 0.5,
        `the retry starts ${at.retry - at.words}px off its words`
      );
    });

    test('a day feed keeps every time on the row end edge on a phone', async () => {
      const page = await opened();
      const ends = await page.evaluate(() =>
        [...document.querySelectorAll('#day-heading .entries > li')].map((row) => {
          const time = /** @type {Element} */ (row.querySelector('time')).getBoundingClientRect();
          return Math.round(row.getBoundingClientRect().right - time.right);
        })
      );
      assert.ok(ends.length >= 7, `only ${ends.length} entries`);
      assert.deepEqual(
        [...new Set(ends)],
        [0],
        `the times end ${ends.join(', ')}px from the row end`
      );
    });

    test('a day feed sets each heading on its entries and parts its days at least twice as far', async () => {
      const page = await opened();
      const rooms = await page.evaluate(() =>
        [...document.querySelectorAll('#day-heading .day')].slice(1).map((day) => {
          const before = /** @type {Element} */ (day.previousElementSibling);
          const rows = before.querySelectorAll('li');
          const heading = /** @type {Element} */ (day.firstElementChild).getBoundingClientRect();
          const first = /** @type {Element} */ (day.querySelector('li')).getBoundingClientRect();
          return {
            between: heading.top - rows[rows.length - 1].getBoundingClientRect().bottom,
            within: first.top - heading.bottom,
            rows:
              rows.length > 1
                ? rows[1].getBoundingClientRect().top - rows[0].getBoundingClientRect().bottom
                : 0
          };
        })
      );
      assert.ok(rooms.length >= 4, `only ${rooms.length + 1} days`);
      for (const { between, within } of rooms)
        assert.ok(
          between >= 2 * within,
          `a day stands ${between}px under the last, its heading ${within}px over its entries`
        );
      const step = Math.max(...rooms.map(({ rows }) => rows));
      for (const { within } of rooms)
        assert.ok(
          within <= step,
          `a heading stands ${within}px over its entries, farther than their ${step}px step`
        );
    });

    test('a failed refresh pads its mark inside its edge as a form error does', async () => {
      const page = await opened();
      const insets = await page.evaluate(() =>
        [...document.querySelectorAll('#states :is(.sui-error-state.over, .sui-form-error)')].map(
          (root) => {
            const mark = /** @type {Element} */ (root.querySelector('svg'));
            const edge = root.classList.contains('over')
              ? getComputedStyle(root, '::before')
              : getComputedStyle(root);
            return (
              mark.getBoundingClientRect().left -
              root.getBoundingClientRect().left -
              parseFloat(edge.borderLeftWidth)
            );
          }
        )
      );
      assert.ok(insets.length >= 2, `only ${insets.length} parts`);
      assert.deepEqual([...new Set(insets)], [16], `marks stand ${insets.join(', ')}px inside`);
    });

    test('every empty and error state on the states page stands under its list heading', async () => {
      const page = await opened();
      const bare = await page.evaluate(() =>
        [...document.querySelectorAll('#states :is(.sui-empty-state, .sui-error-state)')]
          .filter((state) => !state.closest('.sui-section')?.querySelector('h4'))
          .map((state) => state.textContent?.trim().slice(0, 40))
      );
      assert.deepEqual(bare, [], 'a state stands with no list heading over it');
    });

    test('a retry stands raised over its failure wash in both themes, edged and hovering in the hue', async () => {
      const page = await opened();
      const found = await page.evaluate(() => {
        const panel = /** @type {HTMLElement} */ (
          document.querySelector('#states .sui-error-state:not(.over)')
        );
        const retry = /** @type {Element} */ (panel.querySelector('button'));
        // A color-mix() resolves to color(srgb 0-1 ...), a plain fill to rgb(0-255 ...).
        const channels = (/** @type {string} */ color) =>
          (color.match(/[\d.]+/g) ?? [])
            .map(Number)
            .map((value) => (color.startsWith('color(') ? value * 255 : value));
        const light = (/** @type {string} */ color) => {
          const [r, g, b] = channels(color);
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        return ['light', 'dark'].map((theme) => {
          panel.dataset.suiTheme = theme;
          const veil = document.createElement('div');
          veil.style.background = 'var(--sui-interactive-hover-layer)';
          panel.append(veil);
          const [r, g, b] = channels(getComputedStyle(veil).backgroundColor);
          veil.style.background = 'var(--sui-control-border)';
          const [er, eg, eb] = channels(getComputedStyle(veil).backgroundColor);
          veil.remove();
          const rest = light(getComputedStyle(retry).backgroundColor);
          const wash = light(getComputedStyle(panel).backgroundColor);
          delete panel.dataset.suiTheme;
          return { theme, raised: rest > wash, hue: r > g && r > b, edge: er > eg && er > eb };
        });
      });
      for (const { theme, raised, hue, edge } of found) {
        assert.ok(raised, `in ${theme} the retry sinks below its failure wash`);
        assert.ok(hue, `in ${theme} the retry's hover veil is not the danger hue`);
        assert.ok(edge, `in ${theme} the retry's edge is a grey on the danger wash`);
      }
    });

    test('a resting retry holds no more room around its words than its short busy words need', async () => {
      const page = await opened();
      const room = await page.evaluate(() => {
        const retry = /** @type {Element} */ (
          document.querySelector('#states .sui-error-state:not(.over) button')
        );
        const words = /** @type {Element} */ (retry.querySelector('.said'));
        return (retry.getBoundingClientRect().width - words.getBoundingClientRect().width) / 2;
      });
      // "Retrying…" behind its spinner needs 29px a side; "Trying Again…" held 41px.
      assert.ok(room <= 30, `the retry keeps ${room}px a side around "Try Again"`);
    });

    test('a copy button at rest is as wide as its resting and copied words, not its hidden failure', async () => {
      const page = await opened();
      const fits = await page.evaluate(() =>
        [...document.querySelectorAll('#code-block .sui-copy-button')].map((button) => {
          const words = (/** @type {Element} */ span) => {
            const range = document.createRange();
            range.selectNodeContents(span);
            return range.getBoundingClientRect().width;
          };
          const [rest, copied] = [...button.querySelectorAll('.sui-copy-button-labels > span')];
          const style = getComputedStyle(button);
          const frame =
            parseFloat(style.paddingInlineStart) +
            parseFloat(style.paddingInlineEnd) +
            parseFloat(style.borderInlineStartWidth) +
            parseFloat(style.borderInlineEndWidth);
          return {
            name: rest.textContent,
            spare:
              button.getBoundingClientRect().width - frame - Math.max(words(rest), words(copied))
          };
        })
      );
      assert.ok(fits.length >= 4, `only ${fits.length} copy buttons`);
      for (const { name, spare } of fits)
        assert.ok(spare < 1, `${name} keeps ${spare.toFixed(1)}px past its widest shown words`);
    });

    test('a framed code block heads its code with a faint step in both themes', async () => {
      const page = await opened();
      const found = await page.evaluate(() => {
        const channels = (/** @type {string} */ color) =>
          (color.match(/[\d.]+/g) ?? []).map(Number);
        // A color-mix() resolves to color(srgb 0-1 ...), a plain fill to rgb(0-255 ...).
        const luminance = (/** @type {string} */ color) => {
          const scale = color.startsWith('color(') ? 1 : 255;
          const [r, g, b] = channels(color).map((value) => {
            const c = value / scale;
            return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const heads = [
          ...document.querySelectorAll(
            '#code-block .sui-code-block:not(.bare) > :is(.sui-code-block-label, .sui-code-block-copy)'
          )
        ];
        return ['light', 'dark'].flatMap((theme) =>
          heads.map((head) => {
            const block = /** @type {HTMLElement} */ (head.parentElement);
            block.dataset.suiTheme = theme;
            const [a, b] = [head, block]
              .map((element) => luminance(getComputedStyle(element).backgroundColor) + 0.05)
              .sort((x, y) => y - x);
            const control = head.querySelector('button');
            const sunk =
              control !== null &&
              luminance(getComputedStyle(control).backgroundColor) <
                luminance(getComputedStyle(head).backgroundColor);
            delete block.dataset.suiTheme;
            return { theme, ratio: a / b, sunk };
          })
        );
      });
      assert.ok(found.length >= 4, `only ${found.length} heads`);
      for (const { theme, ratio, sunk } of found) {
        assert.ok(!sunk, `in ${theme} a copy control sinks under its head`);
        assert.ok(ratio > 1.01, `in ${theme} a head is drawn on the code's own ground`);
        assert.ok(ratio < 1.1, `in ${theme} a head stands ${ratio.toFixed(2)}:1 off its code`);
      }
    });

    test('a framed copy control edges its Copied words in the success ink and keeps its focus ring a gap off that edge', async () => {
      const page = await opened();
      await page.evaluate(() => {
        navigator.clipboard.writeText = () => Promise.resolve();
      });
      const copy = page.locator('#code-block .sui-copy-button:not(.bare)', {
        hasText: 'Copy Version'
      });
      const look = () =>
        copy.evaluate((button) => {
          const ink = (/** @type {string} */ token) => {
            const probe = document.createElement('i');
            probe.style.color = `var(${token})`;
            button.append(probe);
            const color = getComputedStyle(probe).color;
            probe.remove();
            return color;
          };
          const style = getComputedStyle(button);
          return {
            edge: style.borderTopColor,
            ring: style.outlineStyle === 'none' ? null : style.outlineColor,
            width: style.outlineWidth,
            offset: style.outlineOffset,
            success: ink('--sui-success'),
            focus: ink('--sui-focus')
          };
        });
      for (const scheme of /** @type {const} */ (['light', 'dark'])) {
        await page.emulateMedia({ colorScheme: scheme });
        await page.mouse.move(0, 0);
        await copy.focus();
        await page.keyboard.press('Enter');
        await copy.and(page.locator('[data-copied]')).waitFor();
        const focused = await look();
        assert.equal(focused.edge, focused.success, `in ${scheme} a Copied edge is not success`);
        assert.equal(focused.ring, focused.focus, `in ${scheme} Copied dropped its focus ring`);
        assert.equal(
          focused.width,
          '2px',
          `in ${scheme} the Copied ring thins to ${focused.width}`
        );
        assert.equal(
          focused.offset,
          '2px',
          `in ${scheme} the Copied ring touches the success edge (${focused.offset} off)`
        );
        await copy.hover();
        const hovered = await look();
        assert.equal(hovered.edge, hovered.success, `in ${scheme} a hover took the Copied edge`);
        await copy.locator(':scope:not([data-copied])').waitFor();
      }
      await page.emulateMedia({ colorScheme: null });
    });

    test('on a phone a code block heads its copy control inside its edge and gives its code the whole width', async () => {
      const page = await opened();
      const blocks = await page.evaluate(() =>
        [...document.querySelectorAll('#code-block .sui-code-block:not(.labelled)')].map(
          (block) => {
            const box = block.getBoundingClientRect();
            const copy = block.querySelector('.sui-code-block-copy');
            const control = copy?.querySelector('button')?.getBoundingClientRect();
            const code = /** @type {Element} */ (
              block.querySelector('pre')
            ).getBoundingClientRect();
            // Where the words of an element start: past its own start padding.
            const startOf = (/** @type {Element | null | undefined} */ element) =>
              element
                ? element.getBoundingClientRect().left +
                  parseFloat(getComputedStyle(element).paddingInlineStart)
                : 0;
            const name = copy?.querySelector('.sui-code-block-lang');
            const scroller = /** @type {Element} */ (block.querySelector('pre'));
            return {
              copy: copy !== null,
              parted: getComputedStyle(scroller).borderTopWidth !== '0px',
              lang: name?.textContent ?? null,
              baselines: [name, copy?.querySelector('button')].map((element) => {
                if (!element) return 0;
                const probe = document.createElement('span');
                probe.style.cssText = 'display: inline-block; inline-size: 0; block-size: 0';
                const words = element.querySelector('span:not(:has(*))') ?? element;
                words.append(probe);
                const top = probe.getBoundingClientRect().top;
                probe.remove();
                return top;
              }),
              onEdge: name ? startOf(name) - startOf(block.querySelector('.src')) : 0,
              past: control ? control.right - box.right : 0,
              above: control ? code.top - control.bottom : 0,
              spare: box.width - code.width
            };
          }
        )
      );
      const copied = blocks.filter((block) => block.copy);
      assert.ok(
        blocks.every((block) => block.parted === block.copy),
        'only a block with a copy row parts its code from the row with a line'
      );
      assert.ok(copied.length > 0, 'the section shows no code block with a copy control');
      for (const block of copied) {
        assert.ok(block.past <= -8, `a copy control ends ${block.past}px from its block's edge`);
        assert.ok(block.above >= 0, `a copy control reaches ${-block.above}px into the code`);
        assert.ok(block.spare <= 2, `the code leaves ${block.spare}px of its block's width`);
        assert.ok(
          Math.abs(block.baselines[0] - block.baselines[1]) < 0.5 || !block.lang,
          `a language's name stands ${block.baselines[0] - block.baselines[1]}px off the control's baseline`
        );
        assert.ok(
          Math.abs(block.onEdge) < 0.5,
          `a language's name stands ${block.onEdge}px off the code's edge`
        );
      }
      assert.deepEqual(
        copied.map((block) => block.lang).filter(Boolean),
        ['YAML', 'TOML', 'Markdown', 'Shell', 'Text', 'Shell'],
        'each copy row names its language, plain text too'
      );
    });

    // The choice's name stays 14px on a phone, so its note keeps the type step under it (L-25).
    test('an addition choice keeps its note a type step under its name on a phone', async () => {
      const page = await opened();
      const steps = await page.evaluate(() =>
        [...document.querySelectorAll('#addition-picker .sui-addition-note')].map((note) => {
          const name = /** @type {Element} */ (note.closest('.sui-addition-choice'));
          const size = (/** @type {Element} */ node) => parseFloat(getComputedStyle(node).fontSize);
          return size(name) - size(note);
        })
      );
      assert.ok(steps.length > 0, 'the section shows no note');
      assert.deepEqual([...new Set(steps)], [1], 'a note is not 1px under its name');
    });

    test(
      'a scrolled table keeps its held heading over the columns and its focus ring over both',
      long,
      async () => {
        const page = await opened();
        const frame = page.locator('#data-table .sui-data-table.held.scrolls .frame').first();
        await frame.scrollIntoViewIfNeeded();
        await page.keyboard.press('Shift');
        await frame.focus();
        // The held cells are placed for the new scroll in the frame after it.
        const { onHeld, box, ring } = await frame.evaluate(async (scroller) => {
          scroller.scrollLeft = 60;
          await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
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
      }
    );

    // Columns squeezed to their longest word once wrapped a sentence a word a line on a phone.
    test(
      'a table that scrolls wraps a long value to a few lines, not a word a line, read from the top of its row',
      long,
      async () => {
        const page = await opened();
        const table = page.locator('#data-table table[aria-label="Law checks"]');
        await table.scrollIntoViewIfNeeded();
        const { scrolls, rows } = await table.evaluate((element) => {
          const frame = /** @type {HTMLElement} */ (element.parentElement);
          const lineTops = (/** @type {Element} */ cell) => {
            const range = document.createRange();
            range.selectNodeContents(/** @type {Element} */ (cell.querySelector('.value')));
            return [...new Set([...range.getClientRects()].map((line) => Math.round(line.top)))];
          };
          return {
            scrolls: frame.scrollWidth > frame.clientWidth,
            rows: [.../** @type {HTMLTableElement} */ (element).tBodies[0].rows].map((row) => ({
              lines: lineTops(row.cells[2]).length,
              firsts: [...row.cells].map((cell) => lineTops(cell)[0])
            }))
          };
        });
        assert.ok(scrolls, 'the table no longer scrolls inside its frame');
        const lines = rows.map((row) => row.lines);
        assert.ok(
          lines.every((count) => count <= 2),
          `the long values wrap to ${lines.join(' and ')} lines`
        );
        for (const { firsts } of rows)
          assert.ok(
            Math.max(...firsts) - Math.min(...firsts) <= 1,
            `the first lines of one row start at ${firsts.join(', ')}px`
          );
      }
    );

    test(
      'a long pattern ends in an ellipsis at rest, and its colored copy follows what is typed and its scroll',
      long,
      async () => {
        const page = await opened();
        const entry = page
          .locator('#pattern-entries .specimen', { hasText: 'Long pattern' })
          .locator('.sui-pattern-entry')
          .first();
        await entry.scrollIntoViewIfNeeded();
        const field = entry.getByRole('textbox');
        const rest = await entry.evaluate((item) => {
          const copy = /** @type {HTMLElement} */ (item.querySelector('.sui-pattern-copy'));
          return {
            cut: copy.scrollWidth > copy.clientWidth,
            end: getComputedStyle(copy).textOverflow,
            line: getComputedStyle(/** @type {Element} */ (copy.firstElementChild)).display
          };
        });
        assert.deepEqual(
          rest,
          { cut: true, end: 'ellipsis', line: 'inline' },
          'a long pattern at rest does not end in an ellipsis, as a text field value does'
        );
        await field.focus();
        await page.keyboard.press('End');
        await page.keyboard.type('x');
        await page.waitForFunction(
          (input) => input instanceof HTMLInputElement && input.scrollLeft > 0,
          await field.elementHandle()
        );
        // The scroll event lands in the next frame, so the copy is read after it.
        await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => done(null))));
        const { value, copy, scroll, shift } = await entry.evaluate((item) => {
          const input = /** @type {HTMLInputElement} */ (item.querySelector('input'));
          const line = /** @type {HTMLElement} */ (item.querySelector('[aria-hidden="true"] > *'));
          return {
            value: input.value,
            copy: line.textContent,
            scroll: input.scrollLeft,
            shift: parseFloat(getComputedStyle(line).translate) || 0
          };
        });
        assert.equal(copy, value, 'the copy shows other words than the field');
        assert.ok(
          Math.abs(shift + scroll) < 0.5,
          `the copy moved ${shift}px for a ${scroll}px scroll`
        );
      }
    );

    test(
      'inline facts take a line each on a phone, values in one column, every line at the target',
      long,
      async () => {
        const page = await opened();
        const list = page.locator('#fact-list .sui-fact-list.inline').first();
        await list.scrollIntoViewIfNeeded();
        const facts = await list.evaluate((dl) =>
          [...dl.children].map((fact) => ({
            label: fact.querySelector('dt')?.textContent,
            top: fact.getBoundingClientRect().top,
            height: fact.getBoundingClientRect().height,
            value: fact.querySelector('dd')?.getBoundingClientRect().left,
            target: fact.querySelector('a[href], [tabindex="0"]') !== null
          }))
        );
        assert.ok(
          facts.some((fact) => fact.target),
          'the first inline list holds no target to test'
        );
        for (let i = 1; i < facts.length; i++)
          assert.ok(facts[i].top > facts[i - 1].top, `${facts[i].label} shares the line above`);
        assert.equal(
          new Set(facts.map((fact) => fact.value)).size,
          1,
          'the values do not start on one column'
        );
        for (const fact of facts)
          assert.equal(fact.height, 44, `${fact.label} is ${fact.height}px, off the 44px pitch`);
        const spill = await list.evaluate((dl) => {
          const label = /** @type {HTMLElement} */ (dl.querySelector('dt'));
          const words = label.textContent;
          label.textContent = 'Synchronisierungsstatus';
          const over = label.scrollWidth - label.clientWidth;
          label.textContent = words;
          return over;
        });
        assert.equal(spill, 0, 'a long one-word label paints past its column onto its value');
      }
    );
  });

  suite('the tools menu', { concurrency: 1 }, () => {
    const opened = sharedPage();

    test(
      'L-52 Tab out of the tools menu closes it and leaves no autofocus mark',
      long,
      async () => {
        const page = await opened();
        const trigger = page
          .locator('#list-toolbar')
          .getByRole('button', { name: /^(Sort by|Sort & Filter)$/ });
        // A Modal opens on the first `[autofocus]` it holds, so a mark left in a closed panel
        // would send a reopened dialog's focus to a hidden control.
        const marks = () => page.evaluate(() => document.querySelectorAll('[autofocus]').length);
        const unmarked = await marks();
        await trigger.first().scrollIntoViewIfNeeded();
        await trigger.first().click();
        await page.locator(':popover-open .sui-list-toolbar-panel').waitFor();
        const closes = () =>
          settles(
            page
              .locator(':popover-open .sui-list-toolbar-panel')
              .waitFor({ state: 'detached', ...brief })
          );
        await page.keyboard.press('Tab');
        assert.ok(await closes(), 'Tab left the menu open');

        // Opened by a press, Shift+Tab hands focus back to the button, and that is leaving too.
        await trigger.first().click();
        await page.locator(':popover-open .sui-list-toolbar-panel').waitFor();
        await page.keyboard.press('Shift+Tab');
        assert.ok(await closes(), 'Shift+Tab left the menu open');
        assert.equal(await marks(), unmarked, 'the closed menu left an autofocus mark');
      }
    );

    test(
      'a menu that focuses a choice as it opens leaves the page where it was',
      long,
      async () => {
        const page = await opened();
        // The last bar's menu has never opened, so it holds no placement from an earlier open.
        const trigger = page
          .locator('#list-toolbar')
          .getByRole('button', { name: /^(Sort by|Sort & Filter)$/ })
          .last();
        // Mid-screen, and at the viewport's foot, where a box first drawn under its trigger
        // would stand off the screen.
        for (const block of /** @type {const} */ (['center', 'end'])) {
          await trigger.evaluate((node, at) => node.scrollIntoView({ block: at }), block);
          const before = await page.evaluate(() => scrollY);
          assert.ok(before > 0, 'the page did not scroll to the bar');
          await trigger.click();
          await page.locator(':popover-open .sui-list-toolbar-panel').waitFor();
          assert.equal(
            await page.evaluate(() => scrollY),
            before,
            `opening the menu at the ${block} scrolled the page`
          );
          await page.keyboard.press('Escape');
        }
      }
    );

    test(
      'AC4 a toolbar says nothing until something changes, and its count again after a pick that leaves the count as it was',
      long,
      async () => {
        const page = await opened();
        const bar = page.locator('#list-toolbar .sui-list-toolbar').filter({
          has: page.getByRole('searchbox', { name: 'Search repositories' })
        });
        const counted = bar.last();
        await counted.scrollIntoViewIfNeeded();
        // The bar's own status, not the one its search field keeps for its matches.
        const status = counted.locator(':scope > [role="status"]');
        // A count comes 600ms after a change, so a page that loaded a second ago says none.
        assert.equal(
          await settles(
            page.waitForFunction(
              (element) => element?.textContent?.trim() !== '',
              await status.elementHandle(),
              { timeout: 1000 }
            )
          ),
          false,
          'the bar said its count with nothing changed'
        );
        await counted.getByRole('searchbox').fill('sui');
        await page.waitForURL((address) => address.searchParams.get('q') === 'sui', brief);
        await settles(
          page.waitForFunction(
            (element) => element?.textContent?.trim() === '1 result',
            await status.elementHandle(),
            brief
          )
        );
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
        await settles(
          page.waitForFunction(
            () =>
              /** @type {{ said: string[] }} */ (/** @type {unknown} */ (window)).said.includes(
                '1 result'
              ),
            null,
            brief
          )
        );
        const said = await page.evaluate(
          () => /** @type {{ said: string[] }} */ (/** @type {unknown} */ (window)).said
        );
        assert.ok(
          said.includes('1 result'),
          `after the pick the status said ${JSON.stringify(said)}`
        );

        // A link to the same page with another query shows that query, not the last one typed.
        await page.evaluate(() => {
          const link = Object.assign(document.createElement('a'), { href: '?q=kong' });
          document.querySelector('body > div')?.append(link);
          link.click();
          link.remove();
        });
        await page.waitForURL((address) => address.searchParams.get('q') === 'kong', brief);
        await page.waitForFunction(
          (element) => /** @type {HTMLInputElement} */ (element).value === 'kong',
          await counted.getByRole('searchbox').elementHandle(),
          brief
        );
        // Over the empty state the bar still draws its count, so it says the search left nothing.
        assert.equal(
          (await counted.locator('.sui-list-toolbar-count').textContent())?.trim(),
          'No results'
        );
      }
    );

    test(
      'the tools menu marks its chosen option across the whole option once it has grown',
      long,
      async () => {
        const page = await opened();
        for (const width of [1440, 375]) {
          await page.setViewportSize({ width, height: 900 });
          // The toolbar answers the new width in the frame after it.
          await page.evaluate(
            () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
          );
          const triggers = page
            .locator('#list-toolbar')
            .getByRole('button', { name: /^(Sort by|Sort & Filter)$/ });
          // A menu that holds only the sort is named for it, and one the filter has folded
          // into takes the bar's tools label.
          const named = await page
            .locator('#list-toolbar .sui-list-toolbar:has(.sui-list-toolbar-trigger)')
            .evaluateAll((bars) =>
              bars.map((bar) => [
                bar.querySelector('.sui-list-toolbar-segments')?.checkVisibility() !== false,
                /** @type {HTMLElement} */ (
                  bar.querySelector('.sui-list-toolbar-trigger button')
                ).innerText.trim()
              ])
            );
          for (const [inBar, name] of named) {
            assert.equal(name, inBar ? 'Sort by' : 'Sort & Filter', `at ${width}px`);
          }
          const count = await triggers.count();
          for (let index = 0; index < count; index++) {
            const trigger = triggers.nth(index);
            await trigger.scrollIntoViewIfNeeded();
            await trigger.click();
            const panel = page.locator(':popover-open .sui-list-toolbar-panel');
            await panel.waitFor();
            // The menu grows open, and its thumbs are measured again in the frame after the
            // growth ends, and slide there.
            await atRest(page);
            await page.evaluate(
              () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
            );
            await atRest(page);
            const marks = await panel.evaluate((element) =>
              [...element.querySelectorAll('.sui-segmented-track:has(input:checked)')].map(
                (track) => {
                  const option = track.querySelector('input:checked')?.closest('label');
                  const thumb = track.querySelector('.sui-segmented-thumb');
                  const [o, t] = [option?.getBoundingClientRect(), thumb?.getBoundingClientRect()];
                  // The option's own ground paints on whole device pixels, and the mark lands
                  // on the edges painted there.
                  /** @param {number | undefined} edge */
                  const painted = (edge) =>
                    edge === undefined
                      ? undefined
                      : Math.round(edge * devicePixelRatio) / devicePixelRatio;
                  return [painted(o?.left), t?.left, painted(o?.right), t?.right];
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
        }
      }
    );
  });

  suite('chips, pairs and segmented controls', { concurrency: 1 }, () => {
    const opened = sharedPage();

    test('AC12 a removed chip and a removed pair are announced', long, async () => {
      const page = await opened();
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
    });

    test('an unkeyed chip removal restores focus and announces the original label', async () => {
      const page = await opened();
      const group = page.getByRole('group', { name: 'Unkeyed labels' });
      await group.getByRole('button', { name: 'Remove first' }).click();
      assert.match(await focused(page), /^button Remove second/);
      await page.waitForFunction(() =>
        [...document.querySelectorAll('[role="status"]')].some(
          (status) => status.textContent?.trim() === 'Removed first'
        )
      );
      assert.deepEqual(await group.locator('.sui-chip-label').allTextContents(), [
        'second',
        'third'
      ]);
    });

    test(
      'P8 a pair editor left by a press outside or Tab keeps the draft, and Escape drops it',
      long,
      async () => {
        const page = await opened();
        const add = page
          .locator('#pair-entry')
          .getByRole('button', { name: 'Add an Alias' })
          .first();
        await add.scrollIntoViewIfNeeded();
        const editor = page.locator(':popover-open .sui-pair-editor');
        const key = editor.getByRole('textbox', { name: 'Alias' });
        // The editor's fields take their draft as it mounts, so a frame after it opens holds it.
        const reopen = async () => {
          await add.click();
          await editor.waitFor();
          await page.evaluate(
            () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
          );
        };

        await add.click();
        await key.fill('stage');
        await page.mouse.click(5, 5);
        await editor.waitFor({ state: 'detached' });
        await reopen();
        assert.equal(await key.inputValue(), 'stage', 'a press outside dropped the draft');

        // Tab past the last control of the editor leaves it, and that closes it.
        for (let step = 0; step < 6 && (await editor.count()) > 0; step++)
          await page.keyboard.press('Tab');
        assert.ok(
          await settles(editor.waitFor({ state: 'detached', ...brief })),
          'Tab out left the editor open'
        );

        await reopen();
        assert.equal(await key.inputValue(), 'stage', 'Tab out dropped the draft');
        await page.keyboard.press('Escape');
        await editor.waitFor({ state: 'detached' });
        await reopen();
        assert.equal(await key.inputValue(), '', 'Escape kept the draft');
      }
    );

    test(
      'L-89 focus follows a segmented control into its select when the room runs out',
      long,
      async () => {
        const page = await opened();
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
        await settles(
          page.waitForFunction(() => document.activeElement?.tagName === 'SELECT', null, brief)
        );
        assert.match(await focused(page), /^select/);
        // The next test drags this control, so it gets its room back.
        await control.evaluate((node) => node.parentElement?.style.removeProperty('inline-size'));
      }
    );

    // Last, because it turns the whole page right to left.
    test(
      'L-50 a dragged thumb in a right-to-left page chooses the option under the pointer',
      long,
      async () => {
        const page = await opened();
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
      }
    );
  });

  suite('what the page shows and loads', { concurrency: 1 }, () => {
    const opened = sharedPage();

    test('L-64 every placeholder shares one light that only transform moves', long, async () => {
      const page = await opened();
      const problems = await page.evaluate(() => {
        const found = [];
        const frames = document.querySelectorAll(
          'main .sui-skeleton-rows:not(.slow), main tbody:has(> tr.placeholder), main .sui-chart-wait, main .sui-timeline:has(> li.placeholder)'
        );
        if (frames.length < 4) found.push(`only ${frames.length} placeholders were found`);
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
    });

    test('L-64 a slow wait takes the shape of the placeholder rows around it', long, async () => {
      const page = await opened();
      await page.waitForSelector('#skeleton .sui-skeleton-rows.slow', { state: 'attached' });
      // On a narrow phone the waiting rows drop their side under the name, so the slow row
      // must hold that slot too.
      const shapes = () =>
        page.evaluate(() => {
          const found = [];
          const box = (/** @type {Element} */ element) => element.getBoundingClientRect();
          // Each line's top and height inside its row, so two rows compare line by line.
          const lines = (/** @type {Element} */ row, /** @type {string} */ selector) =>
            [...row.querySelectorAll(selector)]
              .map((line) => `${box(line).top - box(row).top}+${box(line).height}`)
              .join(' ');
          const groups = document.querySelectorAll('#skeleton .sui-skeleton-rows.slow');
          if (groups.length < 2) found.push(`only ${groups.length} slow waits were found`);
          for (const group of groups) {
            const [said, next] = group.querySelectorAll(':scope > .row');
            const kind = group.classList.contains('bars') ? 'two-line' : 'one-line';
            // The last row ends at its last bar (L-119), so a spare row after the neighbour lets
            // it stand a whole row's height.
            const spare = /** @type {Element} */ (next.cloneNode(true));
            group.append(spare);
            const whole = box(next).height;
            spare.remove();
            if (box(said).height !== whole)
              found.push(
                `${kind}: the slow row is ${box(said).height}px, its neighbour ${whole}px`
              );
            const words = lines(said, '.words > span');
            const bars = lines(next, '.main > .bar');
            if (words !== bars)
              found.push(`${kind}: the words stand at ${words}, the bars at ${bars}`);
          }
          return found;
        });
      const wide = page.viewportSize();
      const problems = await shapes();
      await page.setViewportSize({ width: 320, height: 800 });
      try {
        problems.push(...(await shapes()).map((problem) => `320px ${problem}`));
      } finally {
        if (wide) await page.setViewportSize(wide);
      }
      assert.deepEqual(problems, []);
    });

    test('L-64 a loading timeline holds the places its events will take', long, async () => {
      const page = await opened();
      const problems = await page.evaluate(() => {
        const waiting = document.querySelector('#timeline .sui-timeline:has(> li.placeholder)');
        const loaded = document.querySelector(
          '#timeline .sui-timeline[aria-busy="true"]:not(:has(> li.placeholder))'
        );
        if (!waiting || !loaded) return ['the loading and refreshing timelines were not found'];
        /** @param {Element} list */
        const places = (list) => {
          const top = list.getBoundingClientRect().top;
          return [
            `list ${list.getBoundingClientRect().height}`,
            ...[
              ...list.querySelectorAll(
                ':scope > li > :is(.sui-timeline-time, .sui-timeline-body, .sui-timeline-words)'
              )
            ].map((part) => {
              // The body pads out past its ink and takes the room back, so its content box is
              // the place it holds.
              const box = part.getBoundingClientRect();
              const look = getComputedStyle(part);
              const [start, end] = [look.paddingTop, look.paddingBottom].map(parseFloat);
              return `${part.className.split(' ')[0]} ${box.top + start - top} ${box.height - start - end}`;
            })
          ];
        };
        const want = places(loaded);
        const got = places(waiting).map((place) =>
          place.replace('sui-timeline-words', 'sui-timeline-body')
        );
        return got.join('\n') === want.join('\n')
          ? []
          : [`${got.join(', ')} for ${want.join(', ')}`];
      });
      assert.deepEqual(problems, []);
    });

    test(
      'L-113 a timeline grouped by day stays one list of its events, newest first',
      long,
      async () => {
        const page = await opened();
        const shape = await page.evaluate(() => {
          const list = document.querySelector('#timeline .sui-timeline:has(h4)');
          const events = [...(list?.children ?? [])];
          return {
            items: events.length,
            headings: events.map((event) => event.querySelector('h4')?.textContent ?? ''),
            times: events.map(
              (event) =>
                event.querySelector('.sui-timeline-time time')?.getAttribute('datetime') ?? ''
            )
          };
        });
        assert.equal(shape.items, 4, 'one list item per event, the day headings inside them');
        assert.deepEqual(
          shape.headings.map(Boolean),
          [true, false, true, true],
          'a heading opens each day'
        );
        assert.deepEqual(shape.times, shape.times.toSorted().reverse(), 'newest first');
      }
    );

    test('a missing fact says so in words a translator may change, a technical one too', async () => {
      const page = await opened();
      const missing = await page
        .locator('#fact-list .sui-fact-list-value.missing')
        .evaluateAll((values) =>
          values.map((value) => ({
            text: value.textContent?.trim(),
            translatable: /** @type {HTMLElement} */ (value).translate,
            face: getComputedStyle(value).fontFamily
          }))
        );
      const mono = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--sui-mono').trim()
      );
      assert.ok(missing.length >= 2, `${missing.length} missing facts on the page`);
      for (const { text, translatable, face } of missing)
        assert.ok(
          translatable && face !== mono,
          `"${text}" in ${face}, translatable ${translatable}`
        );
    });

    test(
      'fact rows line their values up past the longest label and stack each pair under 18rem of their own width',
      long,
      async () => {
        const page = await opened();
        const lists = page.locator('#fact-list .sui-fact-list.rows');
        await lists.first().scrollIntoViewIfNeeded();
        const pairs = (/** @type {number} */ index) =>
          lists.nth(index).evaluate((list) => ({
            width: list.getBoundingClientRect().width,
            // A trimmed box spans cap to baseline, and the words' own extent shows where a label
            // ends, since a grid cell stretches to its column.
            rows: [...list.children].map((row) => {
              const [label, value] = [...row.children];
              const words = document.createRange();
              words.selectNodeContents(label);
              return {
                label: label.getBoundingClientRect().toJSON(),
                labelEnd: words.getBoundingClientRect().right,
                value: value.getBoundingClientRect().toJSON()
              };
            })
          }));
        const wide = await pairs(0);
        const narrow = await pairs(1);
        assert.ok(
          wide.width >= 288 && narrow.width < 288,
          'the two lists are not either side of 18rem'
        );
        const labelsEnd = Math.max(...wide.rows.map((row) => row.labelEnd));
        for (const { label, value } of wide.rows) {
          assert.ok(
            value.top < label.bottom && value.bottom > label.top,
            'a wide row stacks its value'
          );
          assert.ok(
            Math.abs(value.left - labelsEnd - 24) < 0.5,
            `a value starts ${value.left - labelsEnd}px past the labels`
          );
        }
        // A narrow aside's 20rem still holds both columns.
        await lists.nth(1).evaluate((list) => {
          /** @type {HTMLElement} */ (list.parentElement).style.inlineSize = '20rem';
        });
        for (const { label, value } of (await pairs(1)).rows)
          assert.ok(value.top < label.bottom, 'a list 20rem wide stacks its value');
        await lists.nth(1).evaluate((list) => {
          /** @type {HTMLElement} */ (list.parentElement).style.inlineSize = '';
        });
        for (const { label, value } of narrow.rows) {
          assert.ok(
            Math.abs(value.top - label.bottom - 8) < 0.5,
            'a narrow value is not one copy gap under its label'
          );
          assert.ok(
            Math.abs(value.left - label.left) < 0.5,
            'a narrow value does not start under its label'
          );
        }
      }
    );

    test(
      'U5 a sortable heading sorts the rows and says so with aria-sort, and the order and an open code panel stay through a reload',
      long,
      async () => {
        const page = await opened();
        const table = page.locator('#data-table table').first();
        const sorted = async () => {
          assert.equal(
            await table.locator('th[aria-sort]').evaluate((node) => node.textContent?.trim()),
            'Repository'
          );
          assert.equal(await table.locator('th[aria-sort]').getAttribute('aria-sort'), 'ascending');
          assert.equal(await table.locator('tbody th').first().textContent(), 'ledger');
          // Only the sorted column's arrow wears the accent's text ink.
          const [glyph, accent] = await table.locator('th[aria-sort] svg').evaluate((svg) => {
            const probe = document.createElement('i');
            probe.style.color = 'var(--sui-brand-action-text)';
            svg.after(probe);
            const inks = [getComputedStyle(svg).color, getComputedStyle(probe).color];
            probe.remove();
            return inks;
          });
          assert.equal(glyph, accent);
        };
        await table.scrollIntoViewIfNeeded();
        await table.getByRole('button', { name: 'Repository' }).click();
        await sorted();
        const code = page.locator('#data-table .example').first().locator('details');
        await code.locator('summary', { hasText: 'Code' }).click();
        await page.waitForURL(
          (address) =>
            address.searchParams.get('sort') === 'name' &&
            address.searchParams.get('code-data-table-variants') === 'open',
          brief
        );
        await visit(page, page.url());
        await sorted();
        assert.equal(
          await code.evaluate((details) => /** @type {HTMLDetailsElement} */ (details).open),
          true
        );
      }
    );

    test(
      "a striped table keeps the plain table's text edge, and its stripes reach past it",
      long,
      async () => {
        const page = await opened();
        const [plain, striped] = await page
          .locator('#data-table .example')
          .first()
          .locator('table')
          .evaluateAll((tables) =>
            tables.map((table) => {
              const cell = /** @type {Element} */ (
                table.querySelector('tbody tr:nth-child(2) > th')
              );
              const box = cell.getBoundingClientRect();
              const stripe = /** @type {Element} */ (cell.parentElement).getBoundingClientRect();
              return {
                words: box.left + parseFloat(getComputedStyle(cell).paddingLeft),
                stripe: stripe.left
              };
            })
          );
        assert.ok(
          Math.abs(striped.words - plain.words) < 0.5,
          `${striped.words} vs ${plain.words}`
        );
        assert.ok(Math.abs(striped.words - striped.stripe - 12) < 0.5, 'the stripe hugs the words');
      }
    );

    test(
      "a focused diff block that scrolls draws its ring's corners clear of its edge fade",
      long,
      async () => {
        const page = await opened();
        // No diff on the page is wide enough to scroll on a desktop, so one is narrowed to.
        const diff = page.locator('#diff-block .sui-diff-block').first();
        await diff.evaluate((element) =>
          /** @type {HTMLElement} */ (element).style.setProperty('inline-size', '16rem')
        );
        const block = diff.locator('.sui-diff-block-scroll[tabindex="0"]');
        await block.scrollIntoViewIfNeeded();
        await page.keyboard.press('Shift');
        await block.focus();
        const box = await block.evaluate(async (scroller) => {
          scroller.scrollLeft = 0;
          await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
          return scroller.getBoundingClientRect().toJSON();
        });
        const shot = await page.screenshot({
          clip: {
            x: Math.round(box.x),
            y: Math.round(box.y),
            width: Math.round(box.width),
            height: 6
          }
        });
        // The top 6px of each end, where the ring bends round its corner over the padding: the
        // end corner, where the fade runs at rest, must draw the start corner's arc mirrored.
        const apart = await page.evaluate(
          async (data) => {
            const image = await createImageBitmap(await (await fetch(data)).blob());
            const context = /** @type {OffscreenCanvasRenderingContext2D} */ (
              new OffscreenCanvas(image.width, image.height).getContext('2d')
            );
            context.drawImage(image, 0, 0);
            const start = context.getImageData(0, 0, 10, 6).data;
            const end = context.getImageData(image.width - 10, 0, 10, 6).data;
            let worst = 0;
            for (let y = 0; y < 6; y++)
              for (let x = 0; x < 10; x++) {
                const a = (y * 10 + x) * 4;
                const b = (y * 10 + (9 - x)) * 4;
                // Only the ring's own pixels: past the arc the start corner shows the page and
                // the end corner the block's ground beside its copy column, which also tints the
                // arc's soft edge, so a faded arc reads about 400 apart and a whole one under 60.
                if (Math.min(start[a], end[b]) > 160) continue;
                worst = Math.max(
                  worst,
                  Math.abs(start[a] - end[b]) +
                    Math.abs(start[a + 1] - end[b + 1]) +
                    Math.abs(start[a + 2] - end[b + 2])
                );
              }
            return worst;
          },
          `data:image/png;base64,${shot.toString('base64')}`
        );
        await diff.evaluate((element) =>
          /** @type {HTMLElement} */ (element).style.removeProperty('inline-size')
        );
        assert.ok(apart < 120, `the end corner's arc differs from the start's by ${apart}`);
      }
    );

    test('a focused code block draws its ring over its own edge, round its copy control too', async () => {
      const page = await opened();
      const block = page.locator('#code-block .sui-code-block-scroll[tabindex="0"]').first();
      await block.scrollIntoViewIfNeeded();
      await page.keyboard.press('Shift');
      await block.focus();
      const rings = await block.evaluate((scroller) => {
        const frame = /** @type {Element} */ (scroller.parentElement);
        const look = getComputedStyle(frame);
        return {
          scroller: getComputedStyle(scroller).outlineStyle,
          frame: look.outlineStyle,
          over: parseFloat(look.outlineOffset) + parseFloat(look.borderTopWidth)
        };
      });
      assert.deepEqual(rings, { scroller: 'none', frame: 'solid', over: 0 });
    });

    test('K6 a retried error that leaves no control keeps focus where it stood', long, async () => {
      const page = await opened();
      const retry = page
        .locator('#states .specimen', { hasText: 'Usage Could Not Load' })
        .getByRole('button', { name: 'Try Again' });
      await retry.scrollIntoViewIfNeeded();
      await retry.focus();
      await page.keyboard.press('Enter');
      await settles(
        page.waitForFunction(
          () => /Usage for this month loaded/.test(document.activeElement?.textContent ?? ''),
          null,
          brief
        )
      );
      const at = await page.evaluate(() => ({
        body: document.activeElement === document.body,
        words: document.activeElement?.textContent?.trim()
      }));
      assert.equal(at.body, false, 'focus fell to the page');
      assert.match(at.words ?? '', /Usage for this month loaded/);
    });

    test(
      'a retry that succeeds leaves the failed panels beside it at their height, and its rows stand as far over their button as the filtered rows do',
      long,
      async () => {
        const page = await opened();
        const members = page
          .locator('#states .specimen', { hasText: 'Access Is Not Available' })
          .locator('.sui-error-state');
        const retry = page
          .locator('#states .specimen', { hasText: 'Repositories Could Not Load' })
          .getByRole('button', { name: 'Try Again' });
        await retry.scrollIntoViewIfNeeded();
        const height = () => members.evaluate((node) => node.getBoundingClientRect().height);
        const before = await height();
        await retry.click();
        const back = page.getByRole('button', { name: 'Show the Failure Again' });
        await settles(back.waitFor({ timeout: brief.timeout }));
        const after = await height();
        // From the last row's ink to the button under the rows, in each specimen.
        const under = (/** @type {string} */ id) =>
          page.evaluate((id) => {
            const section = /** @type {Element} */ (
              document.getElementById(id)?.closest('.sui-section')
            );
            const names = section.querySelectorAll('.name');
            const last = names[names.length - 1].getBoundingClientRect().bottom;
            const buttons = section.querySelectorAll('button');
            return buttons[buttons.length - 1].getBoundingClientRect().top - last;
          }, id);
        const [recovered, filtered] = [
          await under('sink-states-recovered'),
          await under('sink-states-filtered')
        ];
        await back.click();
        assert.equal(after, before);
        assert.ok(
          Math.abs(recovered - filtered) < 0.5,
          `recovered rows stand ${recovered}px over their button, filtered rows ${filtered}px`
        );
      }
    );

    test(
      'L-59 a failed refresh stands inside the rows it leaves, and failed panels side by side end on one line, each retry one gap under its words',
      long,
      async () => {
        const page = await opened();
        const strip = page
          .locator('#states .specimen', { hasText: 'Refresh failed' })
          .locator('.over');
        await strip.scrollIntoViewIfNeeded();
        const at = await strip.evaluate((node) => {
          const box = (/** @type {Element | null} */ element) => {
            const { left, right } = /** @type {Element} */ (element).getBoundingClientRect();
            return { left, right };
          };
          const tint = parseFloat(getComputedStyle(node, '::before').insetInlineStart);
          return {
            strip: box(node),
            tint,
            rows: box(node.parentElement?.querySelector('.sui-object-list') ?? null),
            words: box(node.querySelector('.sui-error-state-title')),
            retry: box(node.querySelector('button'))
          };
        });
        const problems = [];
        if (at.strip.left < at.rows.left || at.strip.right > at.rows.right)
          problems.push('the strip reaches past the rows');
        if (
          Math.abs(at.strip.left + at.tint - at.rows.left) >= 0.5 ||
          Math.abs(at.strip.right - at.tint - at.rows.right) >= 0.5
        )
          problems.push("the strip's tint steps in from the rows' edges");
        if (at.words.left - at.strip.left - at.tint < 12) problems.push('the words crowd the tint');
        if (at.strip.right - at.tint - at.retry.right < 12)
          problems.push('the retry crowds the tint');

        // An earlier test may have retried one panel into words, so each retry is weighed
        // against its own panel's words rather than against another retry.
        const feet = await page
          .locator('#states .specimen .sui-error-state:not(.over)')
          .evaluateAll((panels) =>
            panels.map((panel) => {
              const words = panel.querySelector('.sui-error-state-copy')?.getBoundingClientRect();
              const retry = panel.querySelector('.sui-error-state-retry')?.getBoundingClientRect();
              return {
                panel: Math.round(panel.getBoundingClientRect().bottom),
                above:
                  retry &&
                  words &&
                  retry.top - words.bottom - parseFloat(getComputedStyle(panel).rowGap)
              };
            })
          );
        if (feet.length < 2 || new Set(feet.map(({ panel }) => panel)).size !== 1)
          problems.push(`the panels on one line end apart: ${feet.map(({ panel }) => panel)}`);
        if (feet.some(({ above }) => above && Math.abs(above) >= 0.5))
          problems.push(`a retry stands off its words: ${feet.map(({ above }) => above)}`);
        assert.deepEqual(problems, []);
      }
    );

    test(
      'L-63 a loaded page takes focus to its first new row and says how many rows came',
      long,
      async () => {
        const page = await opened();
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
          /^button Try Again/,
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
      }
    );

    // Last in the suite: it grows two lists on the shared page.
    test(
      'a long list lays out only what is near the screen and draws it as a plain list does',
      long,
      async () => {
        const page = await opened();
        /** @type {[string, string, string][]} */
        const lists = [
          ['#object-list .sui-object-list', ':scope > li > *', ':scope > li > *'],
          [
            '#timeline .sui-timeline:has(.sui-timeline-face)',
            ':scope > li > .sui-timeline-body',
            ':scope > li > .sui-timeline-time'
          ]
        ];
        for (const [list, skips, stays] of lists) {
          // A part off the screen may still hold a guessed height, so each state is shot where
          // the row stands in it.
          const first = page.locator(`${list} > li`).first();
          const shot = async () => {
            await first.scrollIntoViewIfNeeded();
            const box = /** @type {{ x: number, y: number, width: number, height: number }} */ (
              await first.boundingBox()
            );
            return page.screenshot({
              clip: { x: box.x - 16, y: box.y - 16, width: box.width + 32, height: box.height + 32 }
            });
          };
          const skipping = await shot();
          // Paint containment draws a part at whole pixels, so the drawing to match is the same
          // containment with its clip edge far out, where any ink the skip cuts comes back.
          const reach = await page.addStyleTag({
            content: `${skips.replace(':scope', list)} { content-visibility: visible !important; overflow-clip-margin: 2rem !important; contain: paint !important; }`
          });
          assert.ok(
            skipping.equals(await shot()),
            `${list} cuts ink it would draw without skipping`
          );
          await reach.evaluate((style) => /** @type {Element} */ (style).remove());

          const shown = await page.evaluate(
            async ([list, skips, stays]) => {
              const element = /** @type {Element} */ (document.querySelector(list));
              const row = /** @type {Element} */ (element.lastElementChild);
              const copies = Array.from(
                { length: 300 },
                () => /** @type {Element} */ (row.cloneNode(true))
              );
              element.append(...copies);
              await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
              // A part that skips is still drawn as an empty box; what it holds is not.
              const seen = (/** @type {string} */ part) =>
                /** @type {Element} */ (element.querySelector(`${part} > *`)).checkVisibility({
                  contentVisibilityAuto: true
                });
              const last = (/** @type {string} */ part) =>
                part.replace(':scope > li', ':scope > li:last-child');
              const found = {
                near: seen(skips),
                far: seen(last(skips)),
                column: seen(last(stays))
              };
              for (const copy of copies) copy.remove();
              return found;
            },
            lists.find(([name]) => name === list) ?? lists[0]
          );
          assert.deepEqual(
            shown,
            { near: true, far: false, column: stays !== skips },
            `${list} lays out what is far off the screen, or skips what must stay`
          );
        }
      }
    );

    // Last in the suite: it leaves the example showing its loaded rows.
    test("a skeleton's rows stand as tall as the kit rows that take their place", async () => {
      const page = await opened();
      const example = page.locator('#skeleton .example').filter({
        has: page.getByRole('button', { name: 'Show Rows' })
      });
      // A handle, since the button that names the example changes its words once pressed.
      const region = await example.locator('.sui-skeleton').elementHandle();
      assert.ok(region, 'the example has no skeleton');
      await region.scrollIntoViewIfNeeded();
      // The section that holds the rows, since a loaded list hands back its last row's padding
      // past its own box, where the placeholders end at their last line.
      const height = () =>
        region.evaluate(
          (element) => element.closest('.sui-section')?.getBoundingClientRect().height
        );
      // The placeholders come 150ms after the region turns busy and stay at least 400ms after
      // it settles, so each side is measured once what it shows has turned, not its busy flag.
      const placeholders = (/** @type {boolean} */ shown) =>
        page.waitForFunction(
          ([element, shown]) => !!element.querySelector('.sui-skeleton-rows') === shown,
          /** @type {const} */ ([region, shown])
        );
      await placeholders(true);
      const waiting = await height();
      await example.getByRole('button', { name: 'Show Rows' }).click();
      await placeholders(false);
      const loaded = await height();
      assert.equal(loaded, waiting, 'the page moves when the rows arrive');
      // On a narrow phone a loaded row's side could drop under its name, and the head's action
      // could crowd its title, so the rows arrive there too.
      const firstLoad = page.locator('#skeleton .example', { hasText: 'First Load' });
      const wide = page.viewportSize();
      await page.setViewportSize({ width: 320, height: 800 });
      try {
        await firstLoad.getByRole('button', { name: 'Load Again' }).click();
        await placeholders(true);
        const phoneWaiting = await height();
        await firstLoad.getByRole('button', { name: 'Show Rows' }).click();
        await placeholders(false);
        assert.equal(await height(), phoneWaiting, 'the page moves when the rows arrive at 320px');
      } finally {
        if (wide) await page.setViewportSize(wide);
      }
    });
  });

  suite('settings and save bars', { concurrency: 1 }, () => {
    const opened = sharedPage();

    test('S2 a setting list says when it loads, fails or has nothing to set', long, async () => {
      const page = await opened();
      const states = page.locator('#setting-list .example', { hasText: 'List States' });
      await states.scrollIntoViewIfNeeded();
      const specimen = (/** @type {string} */ name) =>
        states.locator('.specimen').filter({ hasText: name });
      assert.equal(await specimen('Loading').locator('[aria-busy="true"]').count(), 1);
      assert.equal(await specimen('Failed').getByRole('alert').count(), 1);
      assert.equal(await specimen('Failed').getByRole('button', { name: 'Try Again' }).count(), 1);
      assert.match(
        (await specimen('Nothing to set').textContent()) ?? '',
        /Check back once this part has settings/
      );
    });

    test('a short pattern list keeps Add on the line of its last entry', long, async () => {
      const page = await opened();
      const list = page.locator('#setting-list .sui-pattern-entries').first();
      await list.scrollIntoViewIfNeeded();
      const [entry, add] = await Promise.all([
        list.locator('.sui-pattern-entry').last().boundingBox(),
        list.getByRole('button', { name: /^Add/ }).boundingBox()
      ]);
      assert.ok(entry && add, 'the list has no entry or no Add');
      assert.ok(Math.abs(add.y - entry.y) < 0.5, 'Add took a line of its own');
      assert.ok(Math.abs(add.height - entry.height) < 0.5, 'Add is not as tall as the entries');
    });

    test(
      'P9 a setting row offers Undo after a reset, and Undo hands focus to the reset',
      long,
      async () => {
        const page = await opened();
        const row = page.locator('#setting-list .sui-setting-row').first();
        await row.scrollIntoViewIfNeeded();
        await row.getByRole('button', { name: /^Reset / }).click();
        await row.getByRole('button', { name: /^Undo/ }).click();
        assert.notEqual(
          await row.getAttribute('data-unsaved'),
          null,
          'Undo did not put the change back'
        );
        assert.match(await focused(page), /^button Reset /);
      }
    );

    test(
      "a stacked row's reset stands over the name's hit area and answers a press",
      long,
      async () => {
        const page = await opened();
        const row = page.locator('#setting-list .sui-setting-row', { hasText: 'Commit footer' });
        await row.scrollIntoViewIfNeeded();
        const field = row.getByRole('textbox', { name: 'Commit footer' });
        const saved = await field.inputValue();
        await field.fill(`${saved}.`);
        const reset = row.getByRole('button', { name: /^Reset / });
        const hit = await reset.evaluate((button) => {
          const box = button.getBoundingClientRect();
          const top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
          return button.contains(top);
        });
        assert.ok(hit, "the name's hit area covers the reset");
        await reset.click();
        assert.equal(await field.inputValue(), saved, 'the reset did not put the footer back');
      }
    );

    test(
      'L-36 a press anywhere on a setting row reaches the control its name labels once',
      long,
      async () => {
        const page = await opened();
        const rows = page.locator('#setting-list .sui-setting-list').first();
        // A grid over the whole row: the why line, the padding, the gap between the sides and
        // the control itself. Only the reset is left out, because pressing it resets. Each
        // point is read off the row as it stands, since focusing a field may scroll the page,
        // in the same call that reads what the press before it did.
        const cells = Array.from({ length: 5 * 16 }, (_, cell) => ({
          x: ((cell % 16) + 0.5) / 16,
          y: (Math.floor(cell / 16) + 0.5) / 5
        }));
        /**
         * @param {import('playwright-core').Locator} row
         * @param {{ x: number, y: number } | undefined} cell
         */
        const read = (row, cell) =>
          row.evaluate((node, cell) => {
            const control = /** @type {HTMLInputElement} */ (node.querySelector('input'));
            const was = { focused: control === document.activeElement, checked: control.checked };
            /** @type {HTMLElement | null} */ (document.activeElement)?.blur();
            if (!cell) return { ...was, x: 0, y: 0, reset: false };
            const box = node.getBoundingClientRect();
            const [x, y] = [box.x + cell.x * box.width, box.y + cell.y * box.height];
            const reset = document.elementFromPoint(x, y)?.closest('.sui-setting-reset') !== null;
            return { ...was, x, y, reset };
          }, cell);

        const field = rows.locator('.sui-setting-row', { hasText: 'Command prefix' }).first();
        await field.evaluate((node) => node.scrollIntoView({ block: 'center' }));
        for (let index = 0; index <= cells.length; index++) {
          const at = await read(field, cells[index]);
          if (index > 0)
            assert.ok(
              at.focused,
              `a press at ${cells[index - 1].x},${cells[index - 1].y} of the row left the field unfocused`
            );
          if (index < cells.length) await page.mouse.click(at.x, at.y);
        }

        const box = rows.locator('.sui-setting-row', { hasText: 'Retry failed checks' }).first();
        await box.evaluate((node) => node.scrollIntoView({ block: 'center' }));
        /** @type {{ cell: { x: number, y: number }, checked: boolean } | undefined} */
        let pressed;
        for (let index = 0; index <= cells.length; index++) {
          const at = await read(box, cells[index]);
          if (pressed)
            assert.equal(
              at.checked,
              !pressed.checked,
              `a press at ${pressed.cell.x},${pressed.cell.y} of the row did not flip the box once`
            );
          pressed = undefined;
          if (index === cells.length || at.reset) continue;
          await page.mouse.click(at.x, at.y);
          pressed = { cell: cells[index], checked: at.checked };
        }
      }
    );

    test('L-16 a save never moves Discard, and wrapped actions fill their line', async () => {
      const page = await opened();
      const bars = page.locator('#save-bar .sui-save-bar');
      const boxes = (/** @type {import('playwright-core').Locator} */ bar) =>
        bar.evaluate((node) =>
          [...node.querySelectorAll('.actions .sui-button')].map((button) => {
            const { left, width } = button.getBoundingClientRect();
            return { left: Math.round(left), width: Math.round(width) };
          })
        );
      // The unsaved and saving specimens draw one bar at one width, idle and busy. On a phone
      // the two share a wrapped line, where padding that differs between them splits it unevenly.
      try {
        for (const width of [1280, 390]) {
          await page.setViewportSize({ width, height: 900 });
          assert.deepEqual(
            await boxes(bars.nth(1)),
            await boxes(bars.nth(0)),
            `at ${width}px Saving… is not where Save Changes was, so the save moved Discard`
          );
          if (width === 390) {
            // Save Changes fits half the phone line, and the busy Saving… with its spinner is
            // narrower still, so no room past the label's widens Save over Discard.
            const [discard, save] = await boxes(bars.nth(0));
            assert.equal(save.width, discard.width, 'Save Changes is wider than its half');
          }
          const offset = await bars
            .nth(1)
            .locator('.sui-button[aria-busy="true"]')
            .evaluate((button) => {
              const box = button.getBoundingClientRect();
              const start = button.querySelector('.sui-button-part')?.getBoundingClientRect().left;
              const words = [...button.querySelectorAll('.sui-button-words > *')].find(
                (word) => getComputedStyle(word).visibility === 'visible'
              );
              const end = words?.getBoundingClientRect().right ?? 0;
              return Math.abs((start ?? 0) + end - box.left - box.right) / 2;
            });
          assert.ok(
            offset <= 0.5,
            `at ${width}px the spinner and Saving… sit ${offset}px off the button's centre`
          );
          // The bar is the pane's form action, so at rest it closes the fields as a page form's
          // action does, 24px past the last one (L-35), not at the gap between two of them.
          const past = await bars.nth(0).evaluate((bar) => {
            const field = bar.previousElementSibling?.getBoundingClientRect();
            return bar.getBoundingClientRect().top - (field?.bottom ?? 0);
          });
          assert.equal(past, 24, `at ${width}px the bar stands ${past}px past the last field`);
          // With no field above it there is nothing to close, so the bar starts where any
          // specimen's first part does.
          const lead = await page
            .locator('#save-bar .specimen', { hasText: 'Long copy' })
            .locator('.sui-save-bar')
            .evaluate((bar) => {
              const holder = bar.parentElement?.getBoundingClientRect();
              return bar.getBoundingClientRect().top - (holder?.top ?? 0);
            });
          assert.equal(lead, 0, `at ${width}px a bar with nothing above it starts ${lead}px in`);
          // A bar at rest in a stage keeps the stage's pad under it, as beside it, not its
          // sticky inset on top of that pad. The narrow bar is the taller of its pair, so its
          // stage ends at it.
          const [beside, under] = await page
            .locator('#save-bar .specimen', { hasText: 'Long copy' })
            .locator('.sui-save-bar')
            .evaluate((bar) => {
              const box = bar.getBoundingClientRect();
              const stage = bar.closest('.stage')?.getBoundingClientRect();
              return [box.left - (stage?.left ?? 0), (stage?.bottom ?? 0) - box.bottom];
            });
          assert.equal(under, beside, `at ${width}px a bar's stage pads it ${under}px under it`);
        }
      } finally {
        await page.setViewportSize({ width: 1280, height: 900 });
      }
      // The conflict and narrow examples share a row, and their Code rows end on one line.
      const ends = await page
        .locator('#save-bar .pair .example > .frame')
        .evaluateAll((frames) => frames.map((frame) => frame.getBoundingClientRect().bottom));
      assert.equal(new Set(ends).size, 1, `the paired frames end apart: ${ends.join(', ')}`);
      const narrow = page
        .locator('#save-bar .specimen', { hasText: 'Long copy' })
        .locator('.sui-save-bar');
      const rows = await narrow.evaluate((bar) => {
        const copy = bar.querySelector('.copy')?.getBoundingClientRect();
        /** @type {Map<number, number[]>} */
        const lines = new Map();
        for (const button of bar.querySelectorAll('.actions .sui-button')) {
          const { top, left, right } = button.getBoundingClientRect();
          const line = lines.get(Math.round(top)) ?? [left, right];
          lines.set(Math.round(top), [Math.min(line[0], left), Math.max(line[1], right)]);
        }
        return [...lines.values()].map(([left, right]) => [
          Math.round(left - (copy?.left ?? 0)),
          Math.round((copy?.right ?? 0) - right)
        ]);
      });
      assert.ok(
        rows.every(([start, end]) => start === 0 && end === 0),
        `wrapped actions leave the line under the copy short: ${JSON.stringify(rows)}`
      );
    });

    test('L-89 the save bar hands focus on through discard and undo', long, async () => {
      const page = await opened();
      const section = page.locator('#save-bar');
      const field = section.getByLabel('Repository name').first();
      const bar = section.locator('.sui-save-bar').first();
      await field.scrollIntoViewIfNeeded();
      await field.focus();

      await bar.getByRole('button', { name: 'Discard' }).click();
      assert.match(await focused(page), /^button Undo/, 'focus did not move to Undo');
      assert.match(await bar.innerText(), /discarded/);

      await page.keyboard.press('Enter');
      assert.equal(await field.inputValue(), 'smyklot-panel', 'Undo did not bring the draft back');
      assert.match(
        await focused(page),
        /^input .*smyklot-panel/,
        'focus did not return to the field'
      );
    });

    // After the discard test, so focus comes into this bar from another pane's field, which is
    // no way back: Undo hands focus to Save.
    test(
      'L-16 and L-89 a conflicted save offers Reload, which replaces the draft with Undo',
      long,
      async () => {
        const page = await opened();
        const specimen = page.locator('#save-bar .specimen', { hasText: 'Conflict' }).first();
        const field = specimen.getByLabel('Default branch');
        const bar = specimen.locator('.sui-save-bar');
        await field.scrollIntoViewIfNeeded();
        // Saving again would be refused, so Reload is the only way on.
        assert.deepEqual(await bar.getByRole('button').allInnerTexts(), ['Reload']);
        // The mark stands beside the whole copy, centred on the one-line title's cap height.
        const [mark, title, reason] = await Promise.all(
          ['.mark svg', '.title', '.subtitle'].map((part) => bar.locator(part).boundingBox())
        );
        assert.ok(mark && title && reason, 'the conflict bar has no mark, title or reason');
        assert.equal(title.x, reason.x, 'the title and its reason start apart');
        assert.ok(mark.x + mark.width < title.x, 'the mark does not stand before the title');
        const off = mark.y + mark.height / 2 - (title.y + title.height / 2);
        assert.ok(Math.abs(off) <= 1, `the mark sits ${off}px off the title's middle`);

        const reload = bar.getByRole('button', { name: 'Reload', exact: true });
        await reload.click();
        const busy = bar.getByRole('button', { name: 'Reloading…' });
        assert.equal(await busy.getAttribute('aria-busy'), 'true');
        const holder = await busy.evaluate((node) =>
          node === document.activeElement
            ? null
            : `${document.activeElement?.tagName} ${document.activeElement?.textContent?.trim().slice(0, 40)}`
        );
        assert.equal(holder, null, `the busy Reload let go of focus to ${holder}`);
        await bar.getByText('The latest version replaced your changes').waitFor({ timeout: 4000 });
        assert.equal(await field.inputValue(), 'trunk', 'the reload did not bring the latest');
        assert.match(await focused(page), /^button Undo/, 'focus did not move to Undo');

        await page.keyboard.press('Enter');
        assert.equal(await field.inputValue(), 'develop', 'Undo did not put the draft back');
        assert.deepEqual(await bar.getByRole('button').allInnerTexts(), [
          'Discard',
          'Save Changes'
        ]);
        assert.match(await focused(page), /^button Save/, 'focus did not land on Save');
      }
    );

    // Last, because it leaves its menu open.
    test(
      'U5 typing in the addition menu jumps to the choice that starts with it, the pointer takes the one highlight, and a row-end picker hangs its menu from its end',
      long,
      async () => {
        const page = await opened();
        // The setting list's live picker, not its open copy of the same name.
        const trigger = page.locator('#sink-addition-more');
        await trigger.scrollIntoViewIfNeeded();
        await trigger.click();
        await page.locator(':popover-open [role="menu"]').waitFor();
        await page.keyboard.press('s');
        assert.match(await focused(page), /^button Skip draft/i);
        // Two lit rows, one under the keyboard and one under the pointer, read as two choices.
        await page.locator(':popover-open [role="menuitem"]').first().hover();
        assert.match(await focused(page), /^button Auto merge/i);
        const [menu, end] = await Promise.all([
          page.locator('.sui-popover:popover-open').boundingBox(),
          trigger.boundingBox()
        ]);
        assert.ok(menu && end, 'the menu or its trigger is not drawn');
        assert.ok(
          Math.abs(menu.x + menu.width - (end.x + end.width)) < 0.5,
          `the menu ends ${menu.x + menu.width - (end.x + end.width)}px off its trigger's end`
        );
        // Notes beside their labels started wherever each label ended, so no two lined up.
        assert.deepEqual(
          await page.locator(':popover-open .sui-addition-note').evaluateAll((notes) =>
            notes.map((note) => {
              const label = /** @type {Element} */ (note.previousElementSibling);
              const [n, l] = [note, label].map((part) => part.getBoundingClientRect());
              return [Math.round(n.left - l.left), n.top >= l.bottom];
            })
          ),
          [
            [0, true],
            [0, true],
            [0, true]
          ],
          'a note does not start under its label'
        );
        assert.equal(
          await page
            .locator('#addition-picker .sui-addition-preview .sui-addition-spinner')
            .count(),
          1,
          'the loading list draws no spinner beside its words'
        );
        // A copy is drawn as the live menu would be: each list as wide as its words, every one-line
        // row one height, and the retry's words on the failure's edge.
        const copies = await page.evaluate(() => {
          const box = (/** @type {Element | null} */ part) =>
            /** @type {Element} */ (part).getBoundingClientRect();
          const previews = [...document.querySelectorAll('#addition-picker .sui-addition-preview')];
          const failed = previews.find((preview) => preview.querySelector('.problem'));
          return {
            // ActionMenu's 13rem floor, so a one-line message never reads as a second button.
            floored: previews.every(
              (preview) => box(preview.querySelector('[role="menu"]')).width >= 208
            ),
            fitted: previews.every(
              (preview) =>
                box(preview).width < box(preview.closest('.specimen')).width - 24 ||
                preview.querySelector('.sui-addition-note')
            ),
            heights: [
              ...new Set(
                previews
                  .flatMap((preview) => [
                    ...preview.querySelectorAll('.sui-addition-done, .sui-addition-choice')
                  ])
                  .filter((row) => !row.querySelector('.sui-addition-note'))
                  .map((row) => Math.round(box(row).height))
              )
            ].length,
            // A copy draws every row, as a Combobox's does, so no long list is cut at its foot.
            whole: previews.every(
              (preview) =>
                getComputedStyle(/** @type {Element} */ (preview.querySelector('[role="menu"]')))
                  .maxBlockSize === 'none'
            ),
            edge: Math.round(
              box(failed?.querySelector('.sui-addition-choice .sui-addition-label') ?? null).left -
                box(failed?.querySelector('.problem .sui-addition-said') ?? null).left
            )
          };
        });
        assert.deepEqual(copies, { floored: true, fitted: true, heights: 1, whole: true, edge: 0 });
      }
    );
  });

  test('P7 a two-way theme switch keeps the shown theme when it is pressed', long, async () => {
    const page = await open({ colorScheme: 'dark' });
    try {
      const group = page
        .locator('#theme-switch fieldset')
        .filter({ has: page.locator('input[name="sink-theme-two"]') });
      // Its hint says whether the shown theme is the system's or a choice, and is read with the
      // group.
      const hint = () =>
        group.evaluate((element) =>
          element.ariaDescribedByElements?.map((hint) => hint.textContent).join(' ')
        );
      assert.equal(await hint(), 'Follows the system');
      const dark = group.locator('label', { hasText: 'Dark' });
      await dark.scrollIntoViewIfNeeded();
      await dark.click();
      assert.equal(await page.evaluate(() => localStorage.getItem('sui:theme')), 'dark');
      assert.equal(await hint(), 'Stays as chosen');
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
});
