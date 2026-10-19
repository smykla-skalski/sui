import assert from 'node:assert/strict';
import { after, before, suite, test } from 'node:test';
import { atRest, audit, brief, long, settles, startSink, sweep, together, visit } from './sink.mjs';

// The rendered half of docs/laws.md: the kitchen sink's own law audit, asked at every width
// and theme, plus the laws that need a real keyboard, a media emulation or two renders.

const WIDTHS = [320, 375, 768, 1440];
const THEMES = ['light', 'dark'];

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

suite('the kitchen sink', together, () => {
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

  // The everyday run audits a phone in light and a desktop in dark; the rest wait for SUI_LONG.
  const everyday = (/** @type {number} */ width, /** @type {string} */ theme) =>
    (width === 375 && theme === 'light') || (width === 1440 && theme === 'dark');

  suite('the law audit', together, () => {
    for (const width of WIDTHS)
      for (const theme of THEMES)
        test(
          `the law audit finds nothing at ${width}px in ${theme}`,
          everyday(width, theme) ? {} : long,
          async () => {
            const page = await open(width, theme);
            try {
              const findings = await audit(page);
              assert.equal(findings.length, 0, report(findings));
            } finally {
              await page.close();
            }
          }
        );
  });

  test('the page keeps its audit per path and runs it again only on a press', long, async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    try {
      const kept = {
        findings: [{ law: 'L-1', where: 'main', detail: 'kept from an earlier run' }],
        at: '2026-10-01T12:00:00.000Z',
        width: 1440,
        theme: 'light'
      };
      await page.addInitScript((record) => {
        localStorage.setItem(`sui:audit:${location.origin}${location.pathname}`, record);
        localStorage.setItem(`sui:audit:${location.origin}/elsewhere/`, 'not this page');
      }, JSON.stringify(kept));
      await page.goto(url);
      await page.waitForFunction(() => '__suiAudit' in window);
      const summary = page.locator('.audit .summary');
      // The kept run shows at once, and no run starts on its own.
      assert.equal((await summary.textContent())?.trim(), '1 finding against 1 law');
      await page.waitForTimeout(1500);
      assert.equal((await summary.textContent())?.trim(), '1 finding against 1 law');

      await page.getByRole('button', { name: 'Run the audit again' }).click();
      // The run measures the whole page, which takes a CI runner about a minute and a half.
      await page.waitForFunction(
        () =>
          !document.querySelector('.audit .summary')?.textContent?.includes('kept') &&
          document.querySelector('.audit .summary')?.textContent?.trim() ===
            'Every law holds on this page',
        null,
        { timeout: 240_000 }
      );
      const stored = await page.evaluate(() =>
        JSON.parse(
          localStorage.getItem(`sui:audit:${location.origin}${location.pathname}`) ?? 'null'
        )
      );
      assert.deepEqual(stored.findings, []);
      assert.equal(
        await page.evaluate(() => localStorage.getItem(`sui:audit:${location.origin}/elsewhere/`)),
        'not this page'
      );
    } finally {
      await page.close();
    }
  });

  // A tablet wider than a phone still has a coarse pointer, so the touch tier must hold there too.
  for (const width of [820, 1024])
    test(`the law audit finds nothing on a ${width}px touch screen`, long, async () => {
      const page = await open(width, 'light', { hasTouch: true, isMobile: true });
      try {
        const findings = await audit(page);
        assert.equal(findings.length, 0, report(findings));
      } finally {
        await page.close();
      }
    });

  test('L-41 and L-96 every keyboard stop draws the 2px focus ring in full', long, async () => {
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
          // A full-row or full-card link may draw its ring on the row it covers (K-81), a joined
          // field on its frame, whose pattern input stands four boxes in, and a scroller whose
          // held parts stack over its own outline draws it from a frame's `::after`.
          let wearer = element;
          let ring = getComputedStyle(element);
          for (
            let /** @type {Element | null} */ node = element, depth = 0;
            node && depth < 6 && ring.outlineStyle !== 'solid';
            node = node.parentElement, depth++
          ) {
            wearer = node;
            ring = getComputedStyle(node);
            const over = getComputedStyle(node, '::after');
            if (ring.outlineStyle !== 'solid' && over.outlineStyle === 'solid') ring = over;
          }
          // The same measure the audit's ring check uses, which the audit panel hands the page.
          const cut =
            /** @type {{ __suiRingCut: (element: Element, look: CSSStyleDeclaration) => string[] }} */ (
              /** @type {unknown} */ (window)
            ).__suiRingCut(wearer, ring);
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

  test('L-71 switching the theme moves nothing', long, async () => {
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
    test(
      `the page starts dark with ${stored ?? 'nothing'} stored under a ${colorScheme} system`,
      long,
      async () => {
        const page = await browser.newPage({ colorScheme });
        try {
          if (stored)
            await page.addInitScript((theme) => localStorage.setItem('sui:theme', theme), stored);
          // Without its scripts the app never starts, so only the document and its styles can
          // set the theme: a stored one through the head's script, the system's through the
          // palette's own media query.
          await page.route('**/*', (route) =>
            route.request().resourceType() === 'script' ? route.abort() : route.continue()
          );
          await page.goto(url);
          assert.equal(
            await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme),
            'dark'
          );
        } finally {
          await page.close();
        }
      }
    );

  test('L-75 reduced motion removes every transition and endless animation', long, async () => {
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

  // Growing the height would lay the whole page out on every frame, so only the content moves.
  test(
    'L-57 a disclosure opens to its full height at once and fades in its content',
    long,
    async () => {
      const page = await open(1440, 'light');
      try {
        const opened = await page.evaluate(async () => {
          const details = /** @type {HTMLDetailsElement} */ (
            document.querySelector('#disclosure details.sui-disclosure:not([open])')
          );
          details.open = true;
          const first = details.getBoundingClientRect().height;
          const opacity = Number(getComputedStyle(details, '::details-content').opacity);
          await new Promise((resolve) => setTimeout(resolve, 400));
          return { first, opacity, last: details.getBoundingClientRect().height };
        });
        assert.equal(opened.first, opened.last);
        assert.ok(opened.opacity < 1, 'the content shows at once instead of fading in');
      } finally {
        await page.close();
      }
    }
  );

  // A hint that keeps its seat beside the words squeezes them onto more lines on a phone.
  test("L-57 a disclosure's hint shares the words' line only when both fit", async () => {
    const page = await open(375, 'light');
    try {
      const placed = await page.evaluate(() =>
        ['Skipped repositories', 'More about this sync'].map((name) => {
          const words = [...document.querySelectorAll('#disclosure .sui-disclosure-label')].find(
            (label) => label.textContent === name
          );
          const hint = words?.parentElement?.querySelector('.sui-disclosure-hint');
          if (!words || !hint) return null;
          const range = document.createRange();
          range.selectNodeContents(words);
          const tops = new Set([...range.getClientRects()].map((line) => Math.round(line.top)));
          const a = words.getBoundingClientRect();
          const b = hint.getBoundingClientRect();
          return {
            lines: tops.size,
            beside: Math.abs(b.top - a.top) < 0.5,
            under: b.top >= a.bottom && Math.abs(b.left - a.left) < 0.5
          };
        })
      );
      assert.deepEqual(placed, [
        { lines: 1, beside: true, under: false },
        { lines: 1, beside: false, under: true }
      ]);
    } finally {
      await page.close();
    }
  });

  test('L-102 a wrapped pill keeps its one-line inset and its words inside its corners', async () => {
    // 200% text wraps the long status onto several lines, where a fully round end would cut
    // across the first and last lines' words.
    for (const [width, text] of /** @type {const} */ ([
      [1440, '100%'],
      [375, '200%']
    ])) {
      const page = await open(width, 'light');
      try {
        await page.evaluate((size) => (document.documentElement.style.fontSize = size), text);
        const off = await page.evaluate(() => {
          const pills = [...document.querySelectorAll('#pill .sui-pill')];
          /** @param {Element | undefined} pill */
          const measure = (pill) => {
            const label = pill?.querySelector('.sui-pill-label');
            if (!pill || !label) return null;
            const look = getComputedStyle(label);
            const context = document.createElement('canvas').getContext('2d');
            if (!context) return null;
            context.font = `${look.fontWeight} ${look.fontSize} ${look.fontFamily}`;
            const face = context.measureText('H');
            const range = document.createRange();
            range.selectNodeContents(label);
            const box = pill.getBoundingClientRect();
            const lines = [...range.getClientRects()].map((line) => ({
              start: line.left - box.left,
              end: line.right - box.left,
              cap: line.top + face.fontBoundingBoxAscent - face.actualBoundingBoxAscent - box.top,
              base: line.top + face.fontBoundingBoxAscent - box.top
            }));
            const radius = Math.min(
              parseFloat(getComputedStyle(pill).borderTopLeftRadius),
              box.width / 2,
              box.height / 2
            );
            return { width: box.width, height: box.height, radius, lines };
          };
          const one = measure(pills.find((pill) => pill.textContent?.trim() === 'Invited'));
          const wrapped = measure(pills.find((pill) => pill.textContent?.includes('platform')));
          if (!one || !wrapped) return ['the sink lost its pills'];
          if (wrapped.lines.length < 2) return ['the long status does not wrap'];
          const found = [];
          const top = (/** @type {typeof one} */ pill) => pill.lines[0].cap;
          const bottom = (/** @type {typeof one} */ pill) =>
            pill.height - pill.lines[pill.lines.length - 1].base;
          if (
            Math.abs(top(wrapped) - top(one)) > 0.5 ||
            Math.abs(bottom(wrapped) - bottom(one)) > 0.5
          )
            found.push(
              `its words stand ${top(wrapped).toFixed(2)}px and ${bottom(wrapped).toFixed(2)}px from its edges, not ${top(one).toFixed(2)}px as on one line`
            );
          // The first line's top corners and the last line's bottom corners, each against the
          // round corner it stands in.
          const { radius: r, width, height, lines } = wrapped;
          const [first, last] = [lines[0], lines[lines.length - 1]];
          const corners = [
            [first.start, first.cap],
            [width - first.end, first.cap],
            [last.start, height - last.base],
            [width - last.end, height - last.base]
          ];
          for (const [x, y] of corners)
            if (x < r && y < r && Math.hypot(r - x, r - y) > r)
              found.push(
                `a word's corner at ${x.toFixed(1)}, ${y.toFixed(1)} reaches past a ${r}px round corner`
              );
          return found;
        });
        assert.deepEqual(off, [], `${width}px at ${text} text`);
      } finally {
        await page.close();
      }
    }
  });

  test("L-102 an avatar's initials centre their drawn ink on the drawn circle", async () => {
    // A B leans on its stem, a Q hangs its tail and an accent stands over its letter, so the
    // advance and the cap band are not where the letters draw. The ground is painted red and
    // the letters blue, and both are found in the pixels at four device pixels to the pixel.
    // The avatars are mounted from the library's own modules, which only a dev server serves.
    const dev = await startSink({ dev: true });
    for (const width of [1440, 375]) {
      const page = await dev.browser.newPage({
        viewport: { width, height: 900 },
        deviceScaleFactor: 4
      });
      try {
        await visit(page, dev.url);
        await page.evaluate(async () => void (await document.fonts.ready));
        const boxes = await page.evaluate(async () => {
          const loaded = performance.getEntriesByType('resource').map((entry) => entry.name);
          const find = (/** @type {RegExp} */ pattern) => loaded.find((name) => pattern.test(name));
          const lib = await import(/* @vite-ignore */ find(/\/src\/lib\/index\.ts/) ?? '');
          const { mount, flushSync } = await import(
            /* @vite-ignore */ find(/\.vite\/deps\/svelte\.js/) ?? ''
          );
          const host = document.createElement('div');
          host.id = 'avatar-ink';
          host.style.cssText =
            'position: fixed; inset: 0; z-index: 2147483647; display: flex; flex-wrap: wrap; align-content: start; gap: 6px; padding: 6px; background: white';
          const paint = document.createElement('style');
          paint.textContent =
            '#avatar-ink .sui-avatar { background: #f00 !important; color: #00f !important; outline: none !important }';
          document.head.append(paint);
          document.body.append(host);
          const names = ['Bart', 'Jo', 'Quinn', 'grace', 'Mary Wells', 'Platform Team'];
          names.push('Engineering Team 01', 'Ágnes', 'İlker', 'Çelik');
          for (const size of [20, 21, 24, 28, 30, 32, 36, 40, 48])
            for (const name of names) mount(lib.Avatar, { target: host, props: { name, size } });
          flushSync();
          await document.fonts.ready;
          return [...host.querySelectorAll('.sui-avatar')].map((avatar) => ({
            letters: `${avatar.textContent?.trim()} at ${avatar.getBoundingClientRect().width}px`,
            box: avatar.getBoundingClientRect().toJSON()
          }));
        });
        const shot = await page.screenshot();
        const off = await page.evaluate(
          async ({ data, boxes }) => {
            const image = await createImageBitmap(await (await fetch(data)).blob());
            const context = new OffscreenCanvas(image.width, image.height).getContext('2d');
            if (!context) return ['no canvas'];
            context.drawImage(image, 0, 0);
            const scale = image.width / innerWidth;
            return boxes.flatMap(({ letters, box }) => {
              const [x0, y0] = [Math.floor((box.x - 3) * scale), Math.floor((box.y - 3) * scale)];
              const [w, h] = [
                Math.ceil((box.width + 6) * scale),
                Math.ceil((box.height + 6) * scale)
              ];
              const { data: px } = context.getImageData(x0, y0, w, h);
              /** @param {(r: number, g: number, b: number) => number} cover */
              const middle = (cover) => {
                const cols = new Array(w).fill(0);
                const rows = new Array(h).fill(0);
                for (let y = 0; y < h; y++)
                  for (let x = 0; x < w; x++) {
                    const i = (y * w + x) * 4;
                    const v = cover(px[i], px[i + 1], px[i + 2]);
                    cols[x] = Math.max(cols[x], v);
                    rows[y] = Math.max(rows[y], v);
                  }
                /** @param {number[]} line */
                const centre = (line) =>
                  (line.findIndex((v) => v >= 0.5) + line.findLastIndex((v) => v >= 0.5) + 1) /
                  2 /
                  scale;
                return [centre(cols), centre(rows)];
              };
              const circle = middle((r, g, b) => (r + b - 2 * g) / 255);
              const ink = middle((r, g, b) => (g < 64 ? (b - r) / 255 : 0));
              const [dx, dy] = [ink[0] - circle[0], ink[1] - circle[1]];
              return Math.abs(dx) > 0.25 || Math.abs(dy) > 0.25
                ? [`${letters}: the ink stands ${dx.toFixed(2)}, ${dy.toFixed(2)}px off the middle`]
                : [];
            });
          },
          { data: `data:image/png;base64,${shot.toString('base64')}`, boxes }
        );
        assert.deepEqual(off, [], `${width}px`);
      } finally {
        await page.close();
      }
    }
    await dev.browser.close();
    await dev.server.close();
  });

  test('a picture draws the same before script runs as after, named once', async () => {
    // The server render with no script is the reader's first frame: there a picture that fails
    // draws nothing over its initials and their ring, and one that loads covers them, even
    // through a logo's clear middle. The running page draws each the same.
    const failed = ['Alan Turing', 'Radia Perlman'];
    const loaded = ['Grace Hopper', 'Platform Team'];
    const address = new URL(url);
    address.searchParams.set('audit', 'manual');
    /** @type {string[]} */
    const problems = [];
    // Linux blends an antialiased edge pixel a level or two apart once the layers under it
    // change, though nothing under it shows; what a part draws changes far more.
    /**
     * @param {import('playwright-core').Page} page
     * @param {Buffer} one
     * @param {Buffer} two
     */
    const alike = (page, one, two) =>
      page.evaluate(
        async ([one, two]) => {
          const decode = async (/** @type {string} */ data) => {
            const picture = await createImageBitmap(
              await (await fetch(`data:image/png;base64,${data}`)).blob()
            );
            const canvas = new OffscreenCanvas(picture.width, picture.height);
            const context = /** @type {OffscreenCanvasRenderingContext2D} */ (
              canvas.getContext('2d')
            );
            context.drawImage(picture, 0, 0);
            return context.getImageData(0, 0, picture.width, picture.height);
          };
          const [a, b] = await Promise.all([decode(one), decode(two)]);
          return (
            a.width === b.width &&
            a.height === b.height &&
            a.data.every((level, index) => Math.abs(level - b.data[index]) <= 2)
          );
        },
        [one.toString('base64'), two.toString('base64')]
      );
    /** @type {Record<string, Buffer>} */
    let before = {};
    /** @param {boolean} javaScriptEnabled */
    const draw = async (javaScriptEnabled) => {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 900 },
        javaScriptEnabled
      });
      try {
        await page.goto(address.href);
        if (javaScriptEnabled) await page.waitForFunction(() => '__suiAudit' in window);
        /** @type {Record<string, Buffer>} */
        const drawn = {};
        for (const name of [...failed, ...loaded]) {
          const avatar = page
            .locator('#avatar .example', { hasText: /^(Pictures|Fallbacks)/ })
            .getByRole('img', { name, exact: true });
          await avatar.scrollIntoViewIfNeeded();
          for (const img of await avatar.locator('img').all())
            await img.evaluate((node) =>
              /** @type {HTMLImageElement} */ (node).decode().catch(() => {})
            );
          drawn[name] = await avatar.screenshot();
          if (javaScriptEnabled) {
            if (!(await alike(page, drawn[name], before[name])))
              problems.push(`${name} changes once script runs`);
            continue;
          }
          // What a part adds is what disappears with it.
          const part = avatar.locator(failed.includes(name) ? 'img' : 'svg');
          await part.evaluate((node) => node.style.setProperty('display', 'none'));
          if (!(await alike(page, await avatar.screenshot(), drawn[name])))
            problems.push(
              `${name}: the ${failed.includes(name) ? 'failed picture' : 'covered initials'} drew something`
            );
          await part.evaluate((node) => node.style.removeProperty('display'));
        }
        if (!javaScriptEnabled) {
          assert.equal(
            await page.getByRole('img', { name: 'Alan Turing', exact: true }).ariaSnapshot(),
            '- img "Alan Turing"'
          );
          // Beside the name an avatar is not heard at all, so the name is read once.
          for (const event of await page.locator('#timeline li:has(.sui-avatar)').all())
            assert.doesNotMatch(await event.ariaSnapshot(), /\bimg\b/);
        }
        return drawn;
      } finally {
        await page.close();
      }
    };
    before = await draw(false);
    await draw(true);
    assert.deepEqual(problems, []);
  });

  test('L-69 every glyph is centred in its 24-unit box', long, async () => {
    const page = await open(1440, 'light');
    try {
      const offCentre = await page.evaluate(() =>
        [
          ...new Map(
            [...document.querySelectorAll('svg[data-icon]')]
              .filter((svg) => svg.getClientRects().length > 0)
              .reverse()
              .map((svg) => [
                svg.getAttribute('data-icon'),
                /** @type {SVGGraphicsElement} */ (svg)
              ])
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

  /** A menu or listbox layer that is open. */
  const LAYER = ':popover-open:has([role="listbox"], [role="menu"])';

  for (const width of [375, 1440])
    test(
      `L-48 and L-52 every menu, listbox and select opens in place at ${width}px`,
      long,
      async () => {
        const problems = await sweep(
          () => open(width, 'light'),
          WORKERS,
          async (page, worker) => {
            const triggers = page.locator(
              'main > section [aria-haspopup="listbox"]:not(:disabled), main > section [aria-haspopup="menu"]:not(:disabled)'
            );
            const count = await triggers.count();
            assert.ok(count > 3, `only ${count} menu triggers were found`);
            const problems = [];
            for (let index = worker; index < count; index += WORKERS) {
              const trigger = triggers.nth(index);
              if (!(await trigger.isVisible())) continue;
              await trigger.scrollIntoViewIfNeeded();
              // Where the reader sees it: scroll anchoring holds it there when a specimen above grows
              // on a timer, so only a scroll the opening caused moves it.
              const before = await trigger.evaluate(
                (element) => element.getBoundingClientRect().top
              );
              await trigger.click();
              if (
                await settles(
                  page.waitForFunction((layer) => document.querySelector(layer), LAYER, brief)
                )
              )
                await atRest(page);
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
                    element.getAttribute('aria-haspopup') === 'listbox' &&
                    box.width < anchor.width - 0.5,
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
                if (report.narrower)
                  problems.push(`${name}: the listbox is narrower than its trigger`);
                if (report.tall) problems.push(`${name}: the layer is taller than 20rem`);
                if (report.heights?.some((height) => height < report.tier - 0.01))
                  problems.push(
                    `${name}: option heights ${report.heights.join(', ')}, under ${report.tier}`
                  );
              }
              const after = await trigger.evaluate(
                (element) => element.getBoundingClientRect().top
              );
              if (Math.abs(after - before) > 0.5)
                problems.push(`${name}: opening scrolled the page by ${after - before}px`);
              await page.keyboard.press('Escape');
              const back = await settles(
                page.waitForFunction(
                  (element) => document.activeElement === element,
                  await trigger.elementHandle(),
                  brief
                )
              );
              if (!back) problems.push(`${name}: focus did not return to the trigger`);
            }

            // A native select draws its picker as `::picker(select)`, which has no element to
            // measure, so the picker is read through its computed style and its options' boxes.
            const selects = page.locator(
              'main > section select:not(:disabled):not([inert] *, [aria-hidden="true"] *)'
            );
            const total = await selects.count();
            assert.ok(total > 3, `only ${total} selects were found`);
            for (let index = worker; index < total; index += WORKERS) {
              const select = selects.nth(index);
              if (!(await select.isVisible())) continue;
              await select.scrollIntoViewIfNeeded();
              // Where the reader sees it: scroll anchoring holds it there when a specimen above grows
              // on a timer, so only a scroll the opening caused moves it.
              const before = await select.evaluate(
                (element) => element.getBoundingClientRect().top
              );
              await select.click();
              const handle = await select.elementHandle();
              if (
                await settles(
                  page.waitForFunction((element) => element?.matches(':open'), handle, brief)
                )
              )
                await atRest(page);
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
                if (report.narrower)
                  problems.push(`${name}: the picker is narrower than its field`);
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
              await settles(
                page.waitForFunction((element) => element?.matches(':not(:open)'), handle, brief)
              );
              if (!(await select.evaluate((element) => document.activeElement === element)))
                problems.push(`${name}: focus did not return to the field`);
            }
            return problems;
          }
        );
        assert.deepEqual(problems, []);
      }
    );

  test('L-50 a finger dragging the thumb chooses where it lifts', long, async () => {
    const page = await open(390, 'light', { hasTouch: true, isMobile: true });
    try {
      const track = page
        .locator('#segmented-control .sui-segmented-track:not(:disabled)')
        .filter({ has: page.locator('.selected') })
        .first();
      await track.scrollIntoViewIfNeeded();
      const options = track.locator('label');
      const at = await track.evaluate((node) =>
        [...node.querySelectorAll('label')].findIndex((option) => option.matches('.selected'))
      );
      const target = at + 1 < (await options.count()) ? at + 1 : at - 1;
      const from = await options.nth(at).boundingBox();
      const to = await options.nth(target).boundingBox();
      assert.ok(from && to);
      const wanted = await options.nth(target).locator('input').getAttribute('value');
      // A real finger: touch events, from which the browser makes touch pointers and may scroll.
      const cdp = await page.context().newCDPSession(page);
      const touch = (
        /** @type {'touchStart' | 'touchMove' | 'touchEnd'} */ type,
        /** @type {number} */ x,
        /** @type {number} */ y
      ) =>
        cdp.send('Input.dispatchTouchEvent', {
          type,
          touchPoints: type === 'touchEnd' ? [] : [{ x, y }]
        });
      const y = from.y + from.height / 2;
      const x0 = from.x + from.width / 2;
      const x1 = to.x + to.width / 2;
      await touch('touchStart', x0, y);
      for (let step = 1; step <= 8; step++)
        await touch('touchMove', x0 + ((x1 - x0) * step) / 8, y);
      await touch('touchEnd', x1, y);
      await page.waitForTimeout(100);
      assert.equal(
        await track.evaluate((node) => node.querySelector('input:checked')?.getAttribute('value')),
        wanted,
        'lifting the finger over an option did not choose it'
      );
    } finally {
      await page.close();
    }
  });

  test('L-50 a dragged thumb chooses on release, and Escape puts it back', long, async () => {
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
      const to = await options
        .nth(at + 1 < (await options.count()) ? at + 1 : at - 1)
        .boundingBox();
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

  test('L-80 a clipped label answers its own hover, not the page around it', long, async () => {
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

  test("L-91 and L-89 a row's change of state moves nothing and keeps focus", long, async () => {
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

  test(
    'L-52 and L-89 a pair chip edits in place and focus never falls to the page',
    long,
    async () => {
      const page = await open(1440, 'light');
      try {
        const entry = page.locator('#pair-entry .sui-pair-entry').first();
        await entry.scrollIntoViewIfNeeded();
        const chip = (/** @type {string} */ key) =>
          entry.getByRole('button', {
            name: new RegExp(`\\b${key}\\b.*deploy|\\b${key}\\b.*merge`)
          });
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
    }
  );

  test(
    'L-97 every layer a press opens grows from its trigger edge and folds back to it',
    long,
    async () => {
      const problems = await sweep(
        () => open(1440, 'light'),
        WORKERS,
        async (page, worker) => {
          // A smooth scroll would still move the trigger while its layer grows. Each layer's motion is
          // seeked to its ends, so its length does not matter, and a long one is still running when a
          // busy page gets round to looking at it. The trigger keeps its own press timing.
          await page.addStyleTag({
            content:
              'html { scroll-behavior: auto !important; } .sui-popover { --sui-duration-press: 10000ms !important; --sui-duration-normal: 10000ms !important; --sui-duration-open: 10000ms !important; }'
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
              if (!(box instanceof HTMLElement) || !box.classList.contains('sui-popover'))
                return '';
              if (box.getAnimations().length === 0) return 'it does not move';
              for (const animation of box.getAnimations()) {
                animation.pause();
                animation.currentTime =
                  end === 'start' ? 0 : Number(animation.effect?.getTiming().duration) - 0.01;
              }
              const seen = box.getBoundingClientRect();
              const from = element.getBoundingClientRect();
              for (const animation of box.getAnimations()) animation.finish();
              const near = (/** @type {number} */ a, /** @type {number} */ b) =>
                Math.abs(a - b) <= 1;
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
          for (let index = worker; index < count; index += WORKERS) {
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
            // The next trigger opens only once this layer has finished closing.
            await settles(
              page.waitForFunction(
                (element) =>
                  !document
                    .getElementById(element?.getAttribute('popovertarget') ?? '')
                    ?.getAnimations().length,
                await trigger.elementHandle(),
                brief
              )
            );
          }
          return problems;
        }
      );
      assert.deepEqual(problems, []);
    }
  );

  // A sweep over every control of a kind runs on this many pages side by side.
  const WORKERS = 4;

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

  test(
    'L-42 every control shows its press: a ground, an inset, and a sink when it has a frame',
    long,
    async () => {
      const problems = await sweep(
        () => open(1440, 'light'),
        WORKERS,
        async (page, worker) => {
          const count = await page.evaluate(
            ({ pressable, textLinks }) => {
              const found = [...document.querySelectorAll(pressable)].filter(
                (element) =>
                  !element.matches(textLinks) &&
                  // A locked control refuses the press, so it shows none (L-40).
                  !element.matches(
                    ':disabled, :has(input:is(:disabled, [aria-disabled="true"])), .disabled, [aria-disabled="true"], [aria-busy="true"], [inert], [inert] *'
                  ) &&
                  !element.closest(
                    '[popover]:not(:popover-open), [hidden], [aria-hidden="true"]'
                  ) &&
                  element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) &&
                  element.getBoundingClientRect().width > 0
              );
              found.forEach((element, index) =>
                element.setAttribute('data-press-probe', String(index))
              );
              return found.length;
            },
            { pressable: PRESSABLE, textLinks: TEXT_LINKS }
          );
          assert.ok(count > 50, `only ${count} pressable controls were found`);
          // Transitions off, so each state is read the moment it applies.
          await page.addStyleTag({
            content: '*, *::before, *::after { transition: none !important; }'
          });
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
                    (sibling) =>
                      sibling !== element && getComputedStyle(sibling).position === 'absolute'
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
                  opened: Boolean(document.querySelector(':open, :popover-open')),
                  // A border of its own, even a clear one, makes a control free-standing; a part of a
                  // shared frame, such as a chip's remove part, has none and does not sink.
                  framed: parseFloat(look.borderTopWidth) > 0,
                  name: `${element.tagName.toLowerCase()}.${[...element.classList].filter((name) => !name.startsWith('svelte-')).join('.')} “${(element.textContent ?? '').trim().slice(0, 24) || element.getAttribute('aria-label')}”`
                };
              }
            });
          });
          const take = (/** @type {Element} */ element) =>
            /** @type {{ pressRead: (element: Element) => { paint: string[]; sink: string; opened: boolean; framed: boolean; name: string } }} */ (
              /** @type {unknown} */ (window)
            ).pressRead(element);
          const problems = [];
          for (let index = worker; index < count; index += WORKERS) {
            const control = page.locator(`[data-press-probe="${index}"]`);
            // Brought to the middle of the view, clear of the page's fixed bars, and measured in
            // one call. A control an earlier press re-rendered away is not there to press.
            const point = await page.evaluate((index) => {
              const element = document.querySelector(`[data-press-probe="${index}"]`);
              if (!element?.checkVisibility({ visibilityProperty: true })) return null;
              element.scrollIntoView({ block: 'center', inline: 'nearest' });
              const box = element.getBoundingClientRect();
              return box.width > 0 && box.height > 0
                ? { x: box.x + box.width / 2, y: box.y + box.height / 2 }
                : null;
            }, index);
            if (!point) continue;
            await page.mouse.move(point.x, point.y);
            const rest = await control.evaluate(take);
            await page.mouse.down();
            const pressed = await control.evaluate(take);
            // Leave before letting go, so the press never becomes a click.
            await page.mouse.move(0, 0);
            await page.mouse.up();
            // A select opens its picker on the press itself; left open, it would take the next
            // press as a light dismiss, so whatever a press opened is closed before the next one.
            if (pressed.opened) await page.keyboard.press('Escape');
            const grounded = pressed.paint.some(
              (/** @type {string} */ part, /** @type {number} */ at) => part !== rest.paint[at]
            );
            const inset = pressed.paint.some((/** @type {string} */ part) =>
              part.includes('inset')
            );
            if (!grounded || !inset) problems.push(`${pressed.name}: no pressed ground and inset`);
            else if (rest.framed && pressed.sink !== '0px 1px')
              problems.push(`${pressed.name}: a framed control does not sink 1px`);
          }
          return problems;
        }
      );
      assert.deepEqual(problems, []);
    }
  );

  test('L-52 a second press on a trigger closes its open layer', long, async () => {
    const reopened = await sweep(
      () => open(1440, 'light'),
      WORKERS,
      async (page, worker) => {
        // The phone drawer is modal and covers its own menu button, so it closes from inside.
        const triggers = page.locator(
          'main > section [popovertarget]:not(:disabled):not(.sui-shell-menu)'
        );
        const count = await triggers.count();
        assert.ok(count > 10, `only ${count} layer triggers were found`);
        const reopened = [];
        for (let index = worker; index < count; index += WORKERS) {
          const trigger = triggers.nth(index);
          if (!(await trigger.isVisible())) continue;
          await trigger.scrollIntoViewIfNeeded();
          await trigger.click();
          if (
            !(await settles(
              page.waitForFunction(
                () => document.querySelector('[popover]:popover-open'),
                null,
                brief
              )
            ))
          )
            continue;
          await trigger.click();
          if (
            !(await settles(
              page.waitForFunction(
                () => !document.querySelector('[popover]:popover-open'),
                null,
                brief
              )
            ))
          ) {
            reopened.push(
              `${index} “${((await trigger.textContent()) ?? '').trim().slice(0, 30)}”`
            );
            await page.keyboard.press('Escape');
          }
        }
        return reopened;
      }
    );
    assert.deepEqual(reopened, []);
  });

  test('L-87 the phone drawer holds focus and gives it back', long, async () => {
    const page = await open(1440, 'light');
    try {
      const menu = page.locator('#app-shell .sui-shell-menu').filter({ visible: true }).first();
      await menu.scrollIntoViewIfNeeded();
      await menu.click();
      await settles(
        page.waitForFunction(
          () =>
            document
              .querySelector('.sui-shell-side:popover-open')
              ?.contains(document.activeElement),
          null,
          brief
        )
      );
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
      // Closing hands focus back a moment after the drawer leaves, so both are waited for.
      await settles(
        page.waitForFunction(
          (element) =>
            !document.querySelector(':popover-open.sui-shell-side') &&
            document.activeElement === element,
          await menu.elementHandle(),
          brief
        )
      );
      assert.equal(
        await page.evaluate(() => document.querySelector(':popover-open.sui-shell-side')),
        null,
        'Escape did not close the drawer'
      );
      assert.ok(
        await menu.evaluate((element) => document.activeElement === element),
        'focus did not return to the bar'
      );
    } finally {
      await page.close();
    }
  });

  test("a reload's first frame that shows text draws it in SUI's own faces", long, async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    try {
      await visit(page, url);
      // Every request takes as long as on a slow phone connection, so a face that is fetched
      // arrives after the first frame.
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 600,
        downloadThroughput: -1,
        uploadThroughput: -1
      });
      await page.addInitScript(() => {
        /** @type {{ text: boolean; ready: boolean }[]} */
        const painted = [];
        Object.assign(window, { painted });
        const step = () => {
          const text =
            document.querySelector('h1') !== null &&
            getComputedStyle(document.body).visibility === 'visible';
          // The Latin faces, which draw every word on the page.
          const latin = [...document.fonts].filter((face) => /U\+0-FF\b/i.test(face.unicodeRange));
          const ready = latin.length > 0 && latin.every((face) => face.status === 'loaded');
          painted.push({ text, ready });
          if (!text) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
      await page.reload({ waitUntil: 'commit' });
      // The app need not start: the frames before it are what this reads.
      const first = await page.waitForFunction(() =>
        /** @type {{ painted: { text: boolean; ready: boolean }[] }} */ (
          /** @type {unknown} */ (window)
        ).painted.find((frame) => frame.text)
      );
      assert.deepEqual(await first.jsonValue(), { text: true, ready: true });
    } finally {
      await page.close();
    }
  });

  test("a reload halfway down paints the reader's place from its first frame", long, async () => {
    const page = await open(1440, 'light');
    try {
      const place = await page.evaluate(() => {
        scrollTo(0, 3000);
        return scrollY;
      });
      await page.addInitScript(() =>
        requestAnimationFrame(() => Object.assign(window, { first: scrollY }))
      );
      await page.reload();
      await page.waitForFunction(() => '__suiAudit' in window);
      assert.equal(
        await page.evaluate(
          () => /** @type {{ first: number }} */ (/** @type {unknown} */ (window)).first
        ),
        place
      );
    } finally {
      await page.close();
    }
  });

  test('a phone reload draws the kept audit at once and shifts nothing', long, async () => {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    try {
      await visit(page, url);
      // A kept run, as a returning reader has, which the panel reads only once the page runs.
      await page.evaluate(() =>
        localStorage.setItem(
          `sui:audit:${location.origin}${location.pathname}`,
          JSON.stringify({
            findings: [],
            at: '2026-10-01T12:00:00.000Z',
            width: 375,
            theme: 'light'
          })
        )
      );
      await page.addInitScript(() => {
        Object.assign(window, { shifted: 0 });
        new PerformanceObserver((list) => {
          for (const entry of /** @type {any[]} */ (list.getEntries()))
            /** @type {any} */ (window).shifted += entry.value;
        }).observe({ type: 'layout-shift', buffered: true });
        // The panel's words in the first frame that paints the page.
        const words = (/** @type {string} */ selector) =>
          /** @type {HTMLElement | null} */ (document.querySelector(selector))?.innerText.trim();
        const step = () => {
          if (
            document.querySelector('.audit') &&
            getComputedStyle(document.body).visibility === 'visible'
          )
            Object.assign(window, { first: [words('.audit .summary'), words('.audit .badge')] });
          else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
      await page.goto(url);
      await page.waitForFunction(
        () =>
          document.querySelector('.audit .summary')?.textContent?.trim() ===
          'Every law holds on this page'
      );
      await page.evaluate(
        () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
      );
      assert.deepEqual(await page.evaluate(() => /** @type {any} */ (window).first), [
        'Every law holds on this page',
        'Passing'
      ]);
      assert.equal(await page.evaluate(() => /** @type {any} */ (window).shifted), 0);
    } finally {
      await page.close();
    }
  });
});
