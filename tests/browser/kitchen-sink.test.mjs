import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

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
  server = await createServer({ logLevel: 'error', server: { port: 0 } });
  await server.listen();
  url = server.resolvedUrls?.local[0] ?? '';
  browser = await chromium.launch({ channel: process.env.SUI_BROWSER_CHANNEL ?? 'chrome' });
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
  await page.goto(url, { waitUntil: 'networkidle' });
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

test('L-41 every keyboard stop draws the 2px focus ring', async () => {
  const page = await open(1440, 'light');
  try {
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
        let ring = getComputedStyle(element);
        for (
          let /** @type {Element | null} */ node = element, depth = 0;
          node && depth < 4 && ring.outlineStyle !== 'solid';
          node = node.parentElement, depth++
        )
          ring = getComputedStyle(node);
        return { where: path.join(' > '), outline: ring.outlineStyle, width: ring.outlineWidth };
      });
      if (!stop) break;
      stops++;
      if (stop.outline !== 'solid' || stop.width !== '2px')
        problems.push(`${stop.where}: outline ${stop.outline} ${stop.width}`);
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
  test(`L-48 and L-52 every menu and listbox opens in place at ${width}px`, async () => {
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
        const before = await page.evaluate(() => scrollY);
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
          if (report.heights?.some((height) => height !== report.tier))
            problems.push(
              `${name}: option heights ${report.heights.join(', ')}, not ${report.tier}`
            );
        }
        if ((await page.evaluate(() => scrollY)) !== before)
          problems.push(`${name}: opening scrolled the page`);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
        if (!(await trigger.evaluate((element) => document.activeElement === element)))
          problems.push(`${name}: focus did not return to the trigger`);
      }
      assert.deepEqual(problems, []);
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
