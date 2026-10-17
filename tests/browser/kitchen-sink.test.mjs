import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { startSink, visit } from './sink.mjs';

// The rendered half of docs/laws.md: the kitchen sink's own law audit, asked at every width
// and theme, plus the laws that need a real keyboard, a media emulation or two renders.

const WIDTHS = [320, 375, 768, 1440];
const THEMES = ['light', 'dark'];

/** @type {import('vite').ViteDevServer} */
let server;
/** @type {import('playwright-core').Browser} */
let browser;
let url = '';

before(async () => {
  ({ server, browser, url } = await startSink());
});

after(async () => {
  await browser?.close();
  await server?.close();
});

/**
 * @param {number} width
 * @param {string} theme
 * @param {import('playwright-core').BrowserContextOptions} [options]
 */
async function open(width, theme, options = {}) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, ...options });
  await visit(page, url);
  await page.evaluate(async (name) => {
    document.documentElement.dataset.suiTheme = name;
    await document.fonts.ready;
  }, theme);
  await page.waitForFunction(() => '__suiAudit' in window);
  return page;
}

/** @param {{ law: string; where: string; detail: string }[]} findings */
const report = (findings) =>
  findings.map(({ law, where, detail }) => `${law} ${where}: ${detail}`).join('\n');

for (const width of WIDTHS)
  for (const theme of THEMES)
    test(`the law audit finds nothing at ${width}px in ${theme}`, async () => {
      const page = await open(width, theme);
      try {
        const findings = await page.evaluate(() =>
          /** @type {{ __suiAudit: () => Promise<{ law: string; where: string; detail: string }[]> }} */ (
            /** @type {unknown} */ (window)
          ).__suiAudit()
        );
        assert.equal(findings.length, 0, report(findings));
      } finally {
        await page.close();
      }
    });

test('L-41 and L-96 every keyboard stop draws the 2px focus ring in full', async () => {
  const page = await open(1440, 'light');
  try {
    // The same measure the audit's ring check uses, from the module the page already loaded.
    // The path is an argument, so it resolves in the page, not in the type checker.
    await page.evaluate(async (checks) => {
      const { cutSides, ringReach } = await import(/* @vite-ignore */ checks);
      Object.assign(window, {
        ringCut: (/** @type {Element} */ element) =>
          cutSides(element, ringReach(getComputedStyle(element)))
      });
    }, '/src/routes/audit/checks.ts');
    const problems = [];
    let stops = 0;
    for (let step = 0; step < 600; step++) {
      await page.keyboard.press('Tab');
      const stop = await page.evaluate(() => {
        const element = document.activeElement;
        if (!element || element === document.body || element.hasAttribute('data-tab-seen'))
          return null;
        element.setAttribute('data-tab-seen', '');
        const path = [];
        for (
          let /** @type {Element | null} */ node = element;
          node && path.length < 4;
          node = node.parentElement
        )
          path.unshift(
            node.tagName.toLowerCase() +
              (node.id ? `#${node.id}` : '') +
              [...node.classList]
                .filter((c) => !c.startsWith('svelte-'))
                .slice(0, 2)
                .map((c) => `.${c}`)
                .join('')
          );
        // A full-row or full-card link may draw its ring on the row it covers (K-81).
        let wearer = element;
        let ring = getComputedStyle(element);
        for (
          let /** @type {Element | null} */ node = element, depth = 0;
          node && depth < 4 && ring.outlineStyle !== 'solid';
          node = node.parentElement, depth++
        ) {
          wearer = node;
          ring = getComputedStyle(node);
        }
        const cut = /** @type {{ ringCut: (element: Element) => string[] }} */ (
          /** @type {unknown} */ (window)
        ).ringCut(wearer);
        return {
          where: path.join(' > '),
          outline: ring.outlineStyle,
          width: ring.outlineWidth,
          cut
        };
      });
      if (!stop) break;
      stops++;
      if (stop.outline !== 'solid' || stop.width !== '2px')
        problems.push(`${stop.where}: outline ${stop.outline} ${stop.width}`);
      if (stop.cut.length) problems.push(`${stop.where}: ring cut at ${stop.cut.join(' and ')}`);
    }
    assert.ok(stops > 10, `only ${stops} keyboard stops were reached`);
    assert.deepEqual(problems, []);
  } finally {
    await page.close();
  }
});

test('L-71 switching the theme moves nothing', async () => {
  // Reduced motion stops the spinners, whose boxes would otherwise turn between the two reads.
  const page = await open(1440, 'light', { reducedMotion: 'reduce' });
  try {
    const layout = () =>
      page.evaluate(() =>
        [...document.querySelectorAll('main *:not([data-audit-ignore] *, [data-audit-ignore])')]
          // A theme switch shows the new theme by design, so its own section is left out.
          .filter((element) => !element.closest('#theme-switch, .sui-segmented-thumb'))
          .filter((element) => element.getClientRects().length > 0)
          .map((element) => {
            const r = element.getBoundingClientRect();
            return [r.x, r.y, r.width, r.height].map((v) => Math.round(v * 2) / 2).join(',');
          })
      );
    const lightLayout = await layout();
    await page.evaluate(() => (document.documentElement.dataset.suiTheme = 'dark'));
    await page.waitForTimeout(400);
    const darkLayout = await layout();
    const moved = lightLayout.flatMap((box, index) =>
      box === darkLayout[index] ? [] : [`#${index}: ${box} -> ${darkLayout[index]}`]
    );
    assert.deepEqual(moved.slice(0, 10), []);
  } finally {
    await page.close();
  }
});

for (const [stored, colorScheme] of /** @type {const} */ ([
  ['dark', 'light'],
  [null, 'dark']
]))
  test(`the page starts dark with ${stored ?? 'nothing'} stored under a ${colorScheme} system`, async () => {
    const page = await browser.newPage({ colorScheme });
    try {
      if (stored)
        await page.addInitScript((theme) => localStorage.setItem('sui:theme', theme), stored);
      // Without its scripts the app never starts, so only the document can set the theme.
      await page.route('**/*', (route) =>
        route.request().resourceType() === 'document' ? route.continue() : route.abort()
      );
      await page.goto(url);
      assert.equal(await page.evaluate(() => document.documentElement.dataset.suiTheme), 'dark');
    } finally {
      await page.close();
    }
  });

test('L-75 reduced motion removes every transition and endless animation', async () => {
  const page = await open(1440, 'light', { reducedMotion: 'reduce' });
  try {
    const moving = await page.evaluate(() => {
      const found = [];
      for (const element of document.querySelectorAll('body *')) {
        const style = getComputedStyle(element);
        const durations = style.transitionDuration.split(',').map((part) => parseFloat(part));
        if (durations.some((duration) => duration > 0) && style.transitionProperty !== 'none')
          found.push(
            `${element.tagName.toLowerCase()}.${[...element.classList].join('.')}: transition ${style.transitionDuration}`
          );
      }
      for (const animation of document.getAnimations())
        if (animation.effect?.getTiming().iterations === Infinity)
          found.push(
            `${/** @type {CSSAnimation} */ (animation).animationName ?? 'animation'} loops forever`
          );
      return found;
    });
    assert.deepEqual(moving, []);
  } finally {
    await page.close();
  }
});

test('L-69 every glyph is centred in its 24-unit box', async () => {
  const page = await open(1440, 'light');
  try {
    const offCentre = await page.evaluate(() =>
      [
        ...new Map(
          [...document.querySelectorAll('svg[data-icon]')]
            .filter((svg) => svg.getClientRects().length > 0)
            .reverse()
            .map((svg) => [svg.getAttribute('data-icon'), /** @type {SVGGraphicsElement} */ (svg)])
        ).values()
      ]
        .map((svg) => {
          const box = svg.getBBox();
          const centre = box.y + box.height / 2;
          return { name: svg.getAttribute('data-icon'), centre };
        })
        .filter(({ centre }) => Math.abs(centre - 12) > 0.25)
        .map(({ name, centre }) => `${name}: ink centre ${centre.toFixed(2)}`)
    );
    assert.deepEqual(offCentre, []);
  } finally {
    await page.close();
  }
});

for (const width of [375, 1440])
  test(`L-48 and L-52 every menu, listbox and select opens in place at ${width}px`, async () => {
    const page = await open(width, 'light');
    try {
      const triggers = page.locator(
        'main > section [aria-haspopup="listbox"]:not(:disabled), main > section [aria-haspopup="menu"]:not(:disabled)'
      );
      const count = await triggers.count();
      assert.ok(count > 3, `only ${count} menu triggers were found`);
      const problems = [];
      for (let index = 0; index < count; index++) {
        const trigger = triggers.nth(index);
        if (!(await trigger.isVisible())) continue;
        await trigger.scrollIntoViewIfNeeded();
        // Where the reader sees it: scroll anchoring holds it there when a specimen above grows
        // on a timer, so only a scroll the opening caused moves it.
        const before = await trigger.evaluate((element) => element.getBoundingClientRect().top);
        await trigger.click();
        await page.waitForTimeout(250);
        const report = await trigger.evaluate((element) => {
          const layer = document.querySelector(
            ':popover-open:has([role="listbox"], [role="menu"])'
          );
          if (!layer) return { missing: true };
          const box = layer.getBoundingClientRect();
          const anchor = element.getBoundingClientRect();
          const options = [...layer.querySelectorAll('[role="option"], [role="menuitem"]')]
            .filter((option) => option.getClientRects().length > 0)
            .map((option) => option.getBoundingClientRect().height);
          return {
            missing: false,
            inside:
              box.left >= -0.5 &&
              box.top >= -0.5 &&
              box.right <= document.documentElement.clientWidth + 0.5 &&
              box.bottom <= document.documentElement.clientHeight + 0.5,
            narrower:
              element.getAttribute('aria-haspopup') === 'listbox' && box.width < anchor.width - 0.5,
            tall: box.height > 320.5,
            heights: [...new Set(options.map((height) => Math.round(height * 100) / 100))],
            tier: parseFloat(
              getComputedStyle(document.documentElement).getPropertyValue(
                '--sui-control-height-compact'
              )
            )
          };
        });
        const name = `trigger ${index} (${await trigger.getAttribute('aria-haspopup')})`;
        if (report.missing) problems.push(`${name}: no menu opened`);
        else {
          if (!report.inside) problems.push(`${name}: the layer leaves the viewport`);
          if (report.narrower) problems.push(`${name}: the listbox is narrower than its trigger`);
          if (report.tall) problems.push(`${name}: the layer is taller than 20rem`);
          if (report.heights?.some((height) => height < report.tier - 0.01))
            problems.push(
              `${name}: option heights ${report.heights.join(', ')}, under ${report.tier}`
            );
        }
        const after = await trigger.evaluate((element) => element.getBoundingClientRect().top);
        if (Math.abs(after - before) > 0.5)
          problems.push(`${name}: opening scrolled the page by ${after - before}px`);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
        if (!(await trigger.evaluate((element) => document.activeElement === element)))
          problems.push(`${name}: focus did not return to the trigger`);
      }

      // A native select draws its picker as `::picker(select)`, which has no element to
      // measure, so the picker is read through its computed style and its options' boxes.
      const selects = page.locator(
        'main > section select:not(:disabled):not([inert] *, [aria-hidden="true"] *)'
      );
      const total = await selects.count();
      assert.ok(total > 3, `only ${total} selects were found`);
      for (let index = 0; index < total; index++) {
        const select = selects.nth(index);
        if (!(await select.isVisible())) continue;
        await select.scrollIntoViewIfNeeded();
        // Where the reader sees it: scroll anchoring holds it there when a specimen above grows
        // on a timer, so only a scroll the opening caused moves it.
        const before = await select.evaluate((element) => element.getBoundingClientRect().top);
        await select.click();
        await page.waitForTimeout(250);
        const report = await select.evaluate((element) => {
          if (!(/** @type {HTMLSelectElement} */ (element).matches(':open')))
            return { open: false };
          const picker = getComputedStyle(element, '::picker(select)');
          const options = [.../** @type {HTMLSelectElement} */ (element).options]
            .filter((option) => option.getClientRects().length > 0)
            .map((option) => option.getBoundingClientRect().height);
          return {
            open: true,
            narrower: parseFloat(picker.width) < element.getBoundingClientRect().width - 0.5,
            tall: parseFloat(picker.height) > 320.5,
            heights: [...new Set(options.map((height) => Math.round(height * 100) / 100))],
            tier: parseFloat(
              getComputedStyle(document.documentElement).getPropertyValue(
                '--sui-control-height-compact'
              )
            )
          };
        });
        const name = `select ${index} (${(await select.getAttribute('aria-label')) ?? (await select.getAttribute('id'))})`;
        if (!report.open) problems.push(`${name}: the picker did not open`);
        else {
          if (report.narrower) problems.push(`${name}: the picker is narrower than its field`);
          if (report.tall) problems.push(`${name}: the picker is taller than 20rem`);
          if (report.heights?.some((height) => height < report.tier - 0.01))
            problems.push(
              `${name}: option heights ${report.heights.join(', ')}, under ${report.tier}`
            );
        }
        const after = await select.evaluate((element) => element.getBoundingClientRect().top);
        if (Math.abs(after - before) > 0.5)
          problems.push(`${name}: opening scrolled the page by ${after - before}px`);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
        if (!(await select.evaluate((element) => document.activeElement === element)))
          problems.push(`${name}: focus did not return to the field`);
      }
      assert.deepEqual(problems, []);
    } finally {
      await page.close();
    }
  });

test('L-50 a dragged thumb chooses on release, and Escape puts it back', async () => {
  const page = await open(1440, 'light');
  try {
    const track = page
      .locator('#segmented-control .sui-segmented-track:not(:disabled)')
      .filter({ has: page.locator('.selected') })
      .first();
    await track.scrollIntoViewIfNeeded();
    const state = () =>
      track.evaluate((node) => ({
        checked: node.querySelector('input:checked')?.getAttribute('value'),
        shown: node.querySelector('.selected input')?.getAttribute('value')
      }));
    const options = track.locator('label');
    const at = await track.evaluate((node) =>
      [...node.querySelectorAll('label')].findIndex((option) => option.matches('.selected'))
    );
    const from = await options.nth(at).boundingBox();
    const to = await options.nth(at + 1 < (await options.count()) ? at + 1 : at - 1).boundingBox();
    assert.ok(from && to);
    const start = await state();
    const drag = async () => {
      await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
      await page.mouse.down();
      await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
    };

    await drag();
    const held = await state();
    assert.equal(held.checked, start.checked, 'holding the thumb over an option chose it');
    assert.notEqual(held.shown, start.shown, 'the thumb did not follow the pointer');
    await page.keyboard.press('Escape');
    assert.deepEqual(await state(), start, 'Escape did not put the thumb back');
    await page.mouse.up();

    await drag();
    await page.mouse.up();
    const chosen = await state();
    assert.equal(chosen.checked, held.shown, 'letting go did not choose the option');
    assert.equal(chosen.shown, chosen.checked);
  } finally {
    await page.close();
  }
});

test('L-80 a clipped label answers its own hover, not the page around it', async () => {
  const page = await open(1440, 'light');
  try {
    const stage = page.locator('#clipped-label .stage').first();
    await stage.scrollIntoViewIfNeeded();
    const box = await stage.boundingBox();
    assert.ok(box);
    const tips = () =>
      page.evaluate(() =>
        [...document.querySelectorAll('.sui-tooltip:popover-open')].map((tip) => tip.textContent)
      );
    // The main landmark takes script focus (tabindex -1), so it once anchored every tip.
    await page.mouse.move(box.x + 4, box.y + 4);
    await page.waitForTimeout(600);
    assert.deepEqual(await tips(), [], 'entering the page opened a tip');

    const label = page.locator('#clipped-label .sui-clipped-label').last();
    await label.hover();
    await page.waitForTimeout(600);
    assert.deepEqual(await tips(), [await label.textContent()]);
  } finally {
    await page.close();
  }
});

test("L-91 and L-89 a row's change of state moves nothing and keeps focus", async () => {
  const page = await open(1440, 'light');
  try {
    const list = page.locator('#setting-list .sui-setting-list').first();
    await list.scrollIntoViewIfNeeded();
    const row = list.locator('.sui-setting-row').first();
    const layout = () =>
      list.evaluate((node) =>
        [...node.querySelectorAll('.sui-setting-row, .sui-setting-control > *')].map((part) => {
          const box = part.getBoundingClientRect();
          return [box.left, box.top, box.width, box.height].map((value) => Math.round(value * 2));
        })
      );
    const changed = () => row.evaluate((node) => node.hasAttribute('data-unsaved'));
    assert.ok(await changed(), 'the first row starts changed');
    const before = await layout();
    await row.getByRole('button', { name: /^Reset / }).click();
    assert.equal(await changed(), false, 'the reset did not take the row back');
    assert.deepEqual(await layout(), before, 'saving the row moved or resized something');
    // The reset hides with the change it undid, so focus must land on what it reset.
    assert.ok(
      await row.evaluate((node) =>
        node.querySelector('.sui-setting-control')?.contains(document.activeElement)
      ),
      'focus fell out of the row when its reset hid'
    );
    // The drawn box lies over the native input, so set the input itself.
    await row.getByRole('checkbox').check({ force: true });
    assert.ok(await changed(), 'changing the value did not mark the row');
    assert.deepEqual(await layout(), before, 'changing the row moved or resized something');
  } finally {
    await page.close();
  }
});

test('L-52 and L-89 a pair chip edits in place and focus never falls to the page', async () => {
  const page = await open(1440, 'light');
  try {
    const entry = page.locator('#pair-entry .sui-pair-entry').first();
    await entry.scrollIntoViewIfNeeded();
    const chip = (/** @type {string} */ key) =>
      entry.getByRole('button', { name: new RegExp(`\\b${key}\\b.*deploy|\\b${key}\\b.*merge`) });
    const focused = () =>
      page.evaluate(() =>
        document.activeElement?.closest('[popover]')
          ? 'editor'
          : (document.activeElement?.textContent?.trim() ?? '')
      );
    const editor = page.locator(':popover-open .sui-pair-editor');

    await chip('ship').click();
    await page.waitForTimeout(250);
    assert.equal(await focused(), 'editor', 'the editor did not take focus');
    // A rejected key keeps the editor open with its words, and changes nothing.
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('Ship it');
    await page.keyboard.press('Enter');
    assert.equal(await editor.count(), 1, 'a rejected key closed the editor');
    assert.match(await editor.innerText(), /lowercase/);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    assert.equal(await editor.count(), 0, 'Escape did not close the editor');
    assert.match(await focused(), /ship/, 'focus did not return to the chip');
    assert.equal(
      await entry.locator('.sui-pair-key').first().textContent(),
      'ship',
      'Escape kept the draft'
    );

    // Removing the first pair hands focus to the pair that took its place.
    await entry.getByRole('button', { name: 'Remove ship' }).click();
    assert.match(await focused(), /\bgo\b/, 'focus did not move to the next pair');
    await entry.getByRole('button', { name: 'Remove go' }).click();
    assert.match(await focused(), /Add an alias/, 'focus did not move to Add');
  } finally {
    await page.close();
  }
});

test('L-97 every layer a press opens grows from its trigger edge and folds back to it', async () => {
  const page = await open(1440, 'light');
  try {
    // A smooth scroll would still move the trigger while its layer grows. Each layer's motion is
    // seeked to its ends, so its length does not matter, and a long one is still running when a
    // busy page gets round to looking at it. The trigger keeps its own press timing.
    await page.addStyleTag({
      content:
        'html { scroll-behavior: auto !important; } .sui-popover { --sui-duration-press: 2000ms !important; --sui-duration-normal: 2000ms !important; }'
    });
    // The phone drawer is an edge layer, not one placed beside its trigger.
    const triggers = page.locator(
      'main > section [popovertarget]:not(:disabled):not([aria-controls*="drawer"])'
    );
    const count = await triggers.count();
    assert.ok(count > 5, `only ${count} popover triggers were found`);
    const problems = [];
    // Seeks the trigger's own layer to one end of its motion: the box must be a line on its edge
    // that faces the trigger, as long as the trigger, and clear of the trigger itself.
    const at = (
      /** @type {import('playwright-core').Locator} */ trigger,
      /** @type {'start' | 'end'} */ end
    ) =>
      trigger.evaluate((element, end) => {
        const box = document.getElementById(element.getAttribute('popovertarget') ?? '');
        if (!(box instanceof HTMLElement) || !box.classList.contains('sui-popover')) return '';
        if (box.getAnimations().length === 0) return 'it does not move';
        for (const animation of box.getAnimations()) {
          animation.pause();
          animation.currentTime =
            end === 'start' ? 0 : Number(animation.effect?.getTiming().duration) - 0.01;
        }
        const seen = box.getBoundingClientRect();
        const from = element.getBoundingClientRect();
        for (const animation of box.getAnimations()) animation.finish();
        const near = (/** @type {number} */ a, /** @type {number} */ b) => Math.abs(a - b) <= 1;
        const below = box.dataset.side !== 'block-start';
        const line =
          seen.height <= 1 &&
          near(seen.left, from.left) &&
          near(seen.width, from.width) &&
          (below ? seen.top >= from.bottom : seen.bottom <= from.top);
        const size = (/** @type {DOMRect} */ r) =>
          `${Math.round(r.width)}x${Math.round(r.height)} at ${Math.round(r.left)},${Math.round(r.top)}`;
        return line ? '' : `it is ${size(seen)}, the trigger ${size(from)}`;
      }, end);
    // Waits, frame by frame, until the layer is open or closed and in motion, so a slow frame
    // under load never lets the motion start late or end before it is seen. A layer that never
    // moves times out here and fails at `at`.
    const moving = (
      /** @type {import('playwright-core').Locator} */ trigger,
      /** @type {boolean} */ open
    ) =>
      trigger.evaluate(
        (element, open) =>
          new Promise((resolve) => {
            const box = document.getElementById(element.getAttribute('popovertarget') ?? '');
            const started = performance.now();
            const look = () => {
              if (!box || performance.now() - started > 5000) return resolve(false);
              if (box.matches(':popover-open') === open && box.getAnimations().length > 0)
                return resolve(true);
              requestAnimationFrame(look);
            };
            look();
          }),
        open
      );
    for (let index = 0; index < count; index++) {
      const trigger = triggers.nth(index);
      if (!(await trigger.isVisible())) continue;
      await trigger.scrollIntoViewIfNeeded();
      const name = `trigger ${index} (${(await trigger.textContent())?.trim() || (await trigger.getAttribute('aria-label'))})`;
      await trigger.click();
      await moving(trigger, true);
      const grew = await at(trigger, 'start');
      if (grew) problems.push(`${name}: opening does not start on the trigger, ${grew}`);
      await page.keyboard.press('Escape');
      await moving(trigger, false);
      const shrank = await at(trigger, 'end');
      if (shrank) problems.push(`${name}: closing does not end on the trigger, ${shrank}`);
      await page.waitForTimeout(150);
    }
    assert.deepEqual(problems, []);
  } finally {
    await page.close();
  }
});

// Every control a reader presses, save text links: buttons, select triggers, summaries, menu
// items, options, tabs, navigation rows, chips and check rows.
const PRESSABLE = [
  'button',
  'select',
  'summary',
  "[role='menuitem']",
  "[role='option']",
  "label:has(input:is([type='checkbox'], [type='radio']))",
  'a[href]'
]
  .map((selector) => `main ${selector}`)
  .join(', ');
const TEXT_LINKS = '.sui-link, .sui-back-link, .sui-skip-link, .sui-breadcrumb a, p a';

test('L-42 every control shows its press: a ground, an inset, and a sink when it has a frame', async () => {
  const page = await open(1440, 'light');
  try {
    const count = await page.evaluate(
      ({ pressable, textLinks }) => {
        const found = [...document.querySelectorAll(pressable)].filter(
          (element) =>
            !element.matches(textLinks) &&
            !element.matches(
              ':disabled, :has(input:disabled), .disabled, [aria-disabled="true"], [aria-busy="true"], [inert], [inert] *'
            ) &&
            !element.closest('[popover]:not(:popover-open), [hidden], [aria-hidden="true"]') &&
            element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) &&
            element.getBoundingClientRect().width > 0
        );
        found.forEach((element, index) => element.setAttribute('data-press-probe', String(index)));
        return found.length;
      },
      { pressable: PRESSABLE, textLinks: TEXT_LINKS }
    );
    assert.ok(count > 50, `only ${count} pressable controls were found`);
    // Transitions off, so each state is read the moment it applies.
    await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; }' });
    // The paint a press may change: the control, the row a whole-row link covers, its
    // pseudo-elements, its children and the absolute layers beside it, such as a segmented thumb.
    await page.evaluate(() => {
      Object.assign(window, {
        pressRead: (/** @type {Element} */ element) => {
          const parts = [
            element,
            ...(element.parentElement ? [element.parentElement] : []),
            ...element.querySelectorAll('*'),
            ...[...(element.parentElement?.children ?? [])].filter(
              (sibling) => sibling !== element && getComputedStyle(sibling).position === 'absolute'
            )
          ];
          const look = getComputedStyle(element);
          return {
            paint: parts.flatMap((part) =>
              [null, '::before', '::after'].map((pseudo) => {
                const style = getComputedStyle(part, pseudo);
                return `${style.backgroundColor}|${style.backgroundImage}|${style.boxShadow}`;
              })
            ),
            sink: look.translate,
            // A border of its own, even a clear one, makes a control free-standing; a part of a
            // shared frame, such as a chip's remove part, has none and does not sink.
            framed: parseFloat(look.borderTopWidth) > 0,
            name: `${element.tagName.toLowerCase()}.${[...element.classList].filter((name) => !name.startsWith('svelte-')).join('.')} “${(element.textContent ?? '').trim().slice(0, 24) || element.getAttribute('aria-label')}”`
          };
        }
      });
    });
    const take = (/** @type {Element} */ element) =>
      /** @type {{ pressRead: (element: Element) => { paint: string[]; sink: string; framed: boolean; name: string } }} */ (
        /** @type {unknown} */ (window)
      ).pressRead(element);
    const problems = [];
    for (let index = 0; index < count; index++) {
      const control = page.locator(`[data-press-probe="${index}"]`);
      if (!(await control.isVisible())) continue;
      // A control an earlier press re-rendered away is not there to press.
      const reached = await control
        .scrollIntoViewIfNeeded({ timeout: 2000 })
        .then(() => true)
        .catch(() => false);
      if (!reached) continue;
      const box = await control.boundingBox();
      if (!box) continue;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      const rest = await control.evaluate(take);
      await page.mouse.down();
      const pressed = await control.evaluate(take);
      // Leave before letting go, so the press never becomes a click.
      await page.mouse.move(0, 0);
      await page.mouse.up();
      const grounded = pressed.paint.some(
        (/** @type {string} */ part, /** @type {number} */ at) => part !== rest.paint[at]
      );
      const inset = pressed.paint.some((/** @type {string} */ part) => part.includes('inset'));
      if (!grounded || !inset) problems.push(`${pressed.name}: no pressed ground and inset`);
      else if (rest.framed && pressed.sink !== '0px 1px')
        problems.push(`${pressed.name}: a framed control does not sink 1px`);
    }
    assert.deepEqual(problems, []);
  } finally {
    await page.close();
  }
});

test('L-52 a second press on a trigger closes its open layer', async () => {
  const page = await open(1440, 'light');
  try {
    // The phone drawer is modal and covers its own menu button, so it closes from inside.
    const triggers = page.locator(
      'main > section [popovertarget]:not(:disabled):not(.sui-shell-menu)'
    );
    const count = await triggers.count();
    assert.ok(count > 10, `only ${count} layer triggers were found`);
    const reopened = [];
    for (let index = 0; index < count; index++) {
      const trigger = triggers.nth(index);
      if (!(await trigger.isVisible())) continue;
      await trigger.scrollIntoViewIfNeeded();
      await trigger.click();
      await page.waitForTimeout(300);
      if ((await page.locator('[popover]:popover-open').count()) === 0) continue;
      await trigger.click();
      await page.waitForTimeout(300);
      if ((await page.locator('[popover]:popover-open').count()) > 0) {
        reopened.push(`${index} “${((await trigger.textContent()) ?? '').trim().slice(0, 30)}”`);
        await page.keyboard.press('Escape');
      }
    }
    assert.deepEqual(reopened, []);
  } finally {
    await page.close();
  }
});

test('L-87 the phone drawer holds focus and gives it back', async () => {
  const page = await open(1440, 'light');
  try {
    const menu = page.locator('#app-shell .sui-shell-menu').filter({ visible: true }).first();
    await menu.scrollIntoViewIfNeeded();
    await menu.click();
    await page.waitForTimeout(300);
    const inside = () =>
      page.evaluate(() => {
        const drawer = document.querySelector('.sui-shell-side:popover-open');
        return Boolean(drawer?.contains(document.activeElement));
      });
    assert.ok(await inside(), 'focus did not move into the drawer');
    for (let step = 0; step < 20; step++) {
      await page.keyboard.press(step % 3 === 0 ? 'Shift+Tab' : 'Tab');
      assert.ok(await inside(), `Tab ${step + 1} left the drawer`);
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    assert.equal(
      await page.evaluate(() => document.querySelector(':popover-open.sui-shell-side')),
      null
    );
    assert.ok(
      await menu.evaluate((element) => document.activeElement === element),
      'focus did not return to the bar'
    );
  } finally {
    await page.close();
  }
});
