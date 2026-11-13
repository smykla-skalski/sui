import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, suite, test } from 'node:test';
import {
  allSections,
  atRest,
  audit,
  brief,
  long,
  openMount,
  settles,
  startSink,
  sweep,
  together,
  visit
} from './sink.mjs';

// The rendered half of docs/laws.md: the kitchen sink's own law audit, asked in every media tier
// and in both themes, plus the laws that need a real keyboard, a media emulation or two renders.

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
   * @param {string} [section] a section's own page, for a test that reads only that section
   */
  async function open(width, theme, options = {}, section) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, ...options });
    await visit(page, section ? new URL(`${section}/`, url).href : allSections(url));
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

  test('diff, code, and time regressions hold in their public API and rendering', async () => {
    const page = await openMount(browser, url);
    try {
      const result = await page.evaluate(() => {
        const { diff, code, format, lib, mount, flushSync } = /** @type {any} */ (window);
        const both = diff.unifiedDiff('x😀y', 'x😃y');
        const host = document.createElement('div');
        document.body.append(host);
        const eof = document.createElement('div');
        eof.id = 'eof-diff';
        host.append(eof);
        mount(diff.default, { target: eof, props: { before: 'a', after: 'a\n' } });
        const carried = document.createElement('div');
        carried.id = 'carried-diff';
        host.append(carried);
        mount(diff.default, {
          target: carried,
          props: {
            lang: 'shell',
            lines: [
              { op: ' ', text: 'echo "first' },
              { op: ' ', text: 'second" && echo ok' }
            ]
          }
        });
        const separate = document.createElement('div');
        separate.id = 'separate-diff';
        host.append(separate);
        mount(diff.default, {
          target: separate,
          props: {
            lang: 'shell',
            lines: [
              { op: '-', text: 'echo "removed' },
              { op: '+', text: 'echo added' }
            ]
          }
        });
        const invalid = document.createElement('div');
        invalid.id = 'invalid-time';
        host.append(invalid);
        let exactLabels = 0;
        mount(lib.RelativeTime, {
          target: invalid,
          props: {
            value: 'not-a-date',
            exactLabel: (/** @type {string} */ time) => {
              exactLabels += 1;
              return `, exactly ${time}`;
            }
          }
        });
        flushSync();
        return {
          exactLabels,
          eofAdded: diff.unifiedDiff('a', 'a\n'),
          eofRemoved: diff.unifiedDiff('a\n', 'a'),
          emptyAdded: diff.unifiedDiff('', '\n'),
          emptyRemoved: diff.unifiedDiff('\n', ''),
          prefix: diff.unifiedDiff('x😀', 'x😃')[0].emphasis,
          suffix: diff.unifiedDiff('😀x', '😃x')[0].emphasis,
          both: both[0].emphasis,
          marked: diff
            .emphasize([{ text: 'x😀y' }], both[0].emphasis)
            .filter((/** @type {{ word?: boolean }} */ piece) => piece.word)
            .map((/** @type {{ text: string }} */ piece) => piece.text),
          toml: ['[owner]', '[[products]]'].map((line) => code.tokenizeLine('toml', line)),
          json: code
            .tokenizeLine('json', '{"small":1e-9,"large":-2.5E+12}')
            .filter((/** @type {{ cls?: string }} */ piece) => piece.cls === 'tok-const')
            .map((/** @type {{ text: string }} */ piece) => piece.text),
          clipped: [format.clip('abc', 0), format.clip('abc', -2), format.clip('abc', 1)]
        };
      });
      assert.deepEqual(result.eofAdded, [
        { op: ' ', text: 'a' },
        { op: '+', text: '' }
      ]);
      assert.deepEqual(result.eofRemoved, [
        { op: ' ', text: 'a' },
        { op: '-', text: '' }
      ]);
      assert.deepEqual(result.emptyAdded, [{ op: '+', text: '' }]);
      assert.deepEqual(result.emptyRemoved, [{ op: '-', text: '' }]);
      assert.deepEqual(result.prefix, [[1, 3]]);
      assert.deepEqual(result.suffix, [[0, 2]]);
      assert.deepEqual(result.both, [[1, 3]]);
      assert.deepEqual(result.marked, ['😀']);
      assert.deepEqual(result.toml, [
        [{ cls: 'tok-head', text: '[owner]' }],
        [{ cls: 'tok-head', text: '[[products]]' }]
      ]);
      assert.deepEqual(result.json, ['1e-9', '-2.5E+12']);
      assert.deepEqual(result.clipped, ['', '', '…']);

      const eofRows = page.locator('#eof-diff .ln');
      assert.equal(await eofRows.count(), 2);
      assert.equal(await eofRows.nth(1).getAttribute('data-op'), '+');
      assert.equal(await eofRows.nth(1).locator('.src').textContent(), '');
      assert.match(await page.locator('#eof-diff pre').ariaSnapshot(), /Added/);
      assert.equal(
        await page.locator('#carried-diff .ln').nth(1).locator('.src .tok-str').textContent(),
        'second"'
      );
      assert.equal(
        await page.locator('#separate-diff .ln').nth(1).locator('.src .tok-head').textContent(),
        'echo'
      );
      const time = page.locator('#invalid-time time');
      assert.equal(result.exactLabels, 0);
      assert.equal(await time.textContent(), 'not-a-date');
      assert.equal(await time.getAttribute('aria-label'), null);
      assert.equal(await time.getAttribute('datetime'), null);
      assert.equal(await time.getAttribute('tabindex'), null);
      assert.match(await time.ariaSnapshot(), /not-a-date/);
      await time.hover();
      assert.equal(await page.locator('#invalid-time .sui-tooltip').count(), 0);
    } finally {
      await page.close();
    }
  });

  // Read once, on the 1440px audit page: a glyph's box is the same in every theme and width.
  /** @param {import('playwright-core').Page} page */
  const offCentreGlyphs = (page) =>
    page.evaluate(() =>
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

  // A theme changes only colours, and L-71 holds that it moves nothing, so the dark audit runs
  // only at the narrowest and the widest width, on the page the light audit read. 320px is the
  // reflow floor and lays a phone out as 375px does, so it stands for every phone.
  suite('the law audit', together, () => {
    for (const [width, themes] of /** @type {const} */ ([
      [320, ['light', 'dark']],
      [768, ['light']],
      [1440, ['light', 'dark']]
    ]))
      test(
        `the law audit finds nothing at ${width}px in ${themes.join(' and ')}` +
          (width === 1440 ? ', and L-69 every glyph is centred in its 24-unit box' : ''),
        width === 768 ? long : {},
        async () => {
          const page = await open(width, themes[0]);
          try {
            for (const theme of themes) {
              await page.evaluate(
                (name) => (document.documentElement.dataset.suiTheme = name),
                theme
              );
              const findings = await audit(page);
              assert.equal(findings.length, 0, `${theme}\n${report(findings)}`);
            }
            if (width === 1440) assert.deepEqual(await offCentreGlyphs(page), []);
          } finally {
            await page.close();
          }
        }
      );
  });

  // A decision callout or an unsaved row restates the default paint for the controls it holds,
  // so a disabled toned button there is right to wear that local paint. One audit of a small
  // page reads both laws.
  test(
    'L-40 a disabled tone is measured against the paint where its button stands, L-30 a heading or button off Title Case is found while a name, code or quote is not, L-31 so is a straight quote or a placeholder without its ellipsis, L-105 a count in words and L-20 a mono value open to translation or a heard word shut from it',
    long,
    async () => {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      try {
        await visit(page, new URL('buttons/', url).href);
        const restated = await page.evaluate(() => {
          const buttons = document.querySelectorAll(
            ".sui-button:is([data-tone='signal'], [data-tone='decision'], [data-tone='stop']):disabled"
          );
          for (const button of buttons) {
            const holder = /** @type {HTMLElement} */ (button.parentElement);
            holder.style.setProperty('--sui-surface-raised', 'transparent');
            holder.style.setProperty('--sui-control-border', 'var(--sui-warning)');
          }
          const host = document.createElement('div');
          host.id = 'title-case';
          host.innerHTML = [
            '<h2>Tones and states</h2>',
            '<button type="button">Save changes</button>',
            '<button type="button">Sign In to the Console</button>',
            '<h2>Install <code>npm</code> on macOS for “my-repo”</h2>',
            '<button type="button">Sync 6 Repositories</button>',
            '<p>Don\'t sync <code>"main"</code></p>',
            '<p>Don’t sync “main”</p>',
            '<input aria-label="Name" placeholder="Search repositories">',
            '<input aria-label="Name" placeholder="Search repositories…">',
            '<p>Sync three repositories</p>',
            '<p>Sync 3 repositories with a two-way link</p>',
            '<p>Run <code translate="no">git</code></p>',
            '<pre translate="no"><span class="sui-visually-hidden">Added</span>+ a</pre>',
            '<pre translate="no"><span class="sui-visually-hidden" translate="yes">Removed</span>- a</pre>',
            '<a href="#" translate="no" aria-describedby="title-case-away">Badge<span id="title-case-away" hidden>(opens another site)</span></a>',
            '<a href="#" aria-describedby="title-case-off"><span translate="no">Badge</span><span id="title-case-off" hidden>(opens another site)</span></a>'
          ].join('');
          document.body.append(host);
          return buttons.length;
        });
        assert.ok(restated > 0, 'the buttons page holds no disabled toned button');
        const findings = await audit(page);
        const kept = findings.filter(({ detail }) => detail.includes('keeps its tone'));
        assert.equal(kept.length, 0, report(kept));
        assert.deepEqual(
          findings
            .filter(({ law, where }) => law === 'L-30' && where.includes('#title-case'))
            .map(({ detail }) => detail),
          [
            '"Tones and states" is not Title Case at "states"',
            '"Tones and states" writes "and" instead of "&"',
            '"Save changes" is not Title Case at "changes"'
          ]
        );
        assert.deepEqual(
          findings
            .filter(({ law, where }) => law === 'L-31' && where.includes('#title-case'))
            .map(({ detail }) => detail),
          [
            "a straight ' instead of a curly quote",
            'the placeholder "Search repositories" does not end with "…"'
          ]
        );
        assert.deepEqual(
          findings
            .filter(({ law, where }) => law === 'L-105' && where.includes('#title-case'))
            .map(({ detail }) => detail),
          ['"three" is a count in words, not figures']
        );
        assert.deepEqual(
          findings
            .filter(({ law, where }) => law === 'L-20' && where.includes('#title-case'))
            .map(({ detail }) => detail),
          [
            '"npm" is a mono value a translator can change',
            '""main"" is a mono value a translator can change',
            '"Added" is a heard word a translator cannot change',
            '"(opens another site)" is a heard word a translator cannot change'
          ]
        );
      } finally {
        await page.close();
      }
    }
  );

  // A status leads its words with a mark, so only its words are trimmed, and the audit has to
  // measure them to see the step under the description.
  test(
    'L-24 the audit finds a status that stands the wrong gap under its description',
    long,
    async () => {
      const page = await open(1440, 'light', {}, 'setting-list');
      try {
        await page.evaluate(() => {
          const status = document.querySelector('.sui-setting-why + .sui-setting-status');
          /** @type {HTMLElement} */ (status).style.marginBlockStart = '0px';
        });
        const findings = (await audit(page)).filter(
          ({ law, detail }) => law === 'L-24' && detail.includes('not 12px')
        );
        assert.ok(findings.length > 0, 'a status a copy gap under its description is a finding');
      } finally {
        await page.close();
      }
    }
  );

  // A tablet wider than a phone still has a coarse pointer, so the touch tier must hold there too.
  test('the law audit finds nothing on a 1024px touch screen', long, async () => {
    const page = await open(1024, 'light', { hasTouch: true, isMobile: true });
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
      // Each stop is read as its Tab key comes up, when focus and its scroll have landed, so a
      // run of presses needs no read between them.
      await page.evaluate(() => {
        /** @type {{ where: string; outline: string; width: string; cut: string[] }[]} */
        const stops = [];
        const tabbed = { stops, done: false };
        Object.assign(window, { tabbed });
        const read = () => {
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
          // A flush border in the ring's color, its own or one an overlay draws over its edge, is
          // the ring's inner pixel (L-41).
          const over = getComputedStyle(wearer, '::after');
          const edge =
            parseFloat(ring.outlineOffset) !== 0
              ? 0
              : ring.borderTopColor === ring.outlineColor
                ? parseFloat(ring.borderTopWidth)
                : over.position === 'absolute' && over.borderTopColor === ring.outlineColor
                  ? parseFloat(over.borderTopWidth)
                  : 0;
          return {
            where: path.join(' > '),
            outline: ring.outlineStyle,
            width: `${parseFloat(ring.outlineWidth) + edge}px`,
            cut
          };
        };
        addEventListener(
          'keyup',
          (event) => {
            if (event.key !== 'Tab' || tabbed.done) return;
            const stop = read();
            if (stop) stops.push(stop);
            else tabbed.done = true;
          },
          true
        );
      });
      const tabbed = () =>
        page.evaluate(
          () =>
            /** @type {{ tabbed: { stops: { where: string; outline: string; width: string; cut: string[] }[]; done: boolean } }} */ (
              /** @type {unknown} */ (window)
            ).tabbed
        );
      // The sink holds about 1000 stops; the sweep ends where focus comes back to a stop it read,
      // and the bound only stops a page that never gives focus back. The presses of a run are sent
      // together, and the browser still takes them in turn.
      const cdp = await page.context().newCDPSession(page);
      const tab = { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 };
      for (let step = 0; step < 3000 && !(await tabbed()).done; step += 20)
        await Promise.all(
          Array.from({ length: 20 }, () => [
            cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', ...tab }),
            cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...tab })
          ]).flat()
        );
      const { stops } = await tabbed();
      const problems = [];
      for (const stop of stops) {
        if (stop.outline !== 'solid' || stop.width !== '2px')
          problems.push(`${stop.where}: outline ${stop.outline} ${stop.width}`);
        if (stop.cut.length) problems.push(`${stop.where}: ring cut at ${stop.cut.join(' and ')}`);
      }
      assert.ok(
        (await tabbed()).done,
        `the sweep ended before focus came back, after ${stops.length} stops`
      );
      assert.ok(stops.length > 10, `only ${stops.length} keyboard stops were reached`);
      assert.deepEqual(problems, []);
    } finally {
      await page.close();
    }
  });

  test(
    'L-75 reduced motion removes every transition and endless animation, at rest and pressed, and L-71 switching the theme moves nothing',
    long,
    async () => {
      // Reduced motion also stops the spinners, whose boxes would otherwise turn between two reads.
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
        // Also the widths whose dark audit was dropped on the strength of this check.
        for (const width of [1440, 768, 320]) {
          await page.setViewportSize({ width, height: 900 });
          await page.evaluate(() => (document.documentElement.dataset.suiTheme = 'light'));
          await atRest(page);
          const lightLayout = await layout();
          await page.evaluate(() => (document.documentElement.dataset.suiTheme = 'dark'));
          await atRest(page);
          const darkLayout = await layout();
          const moved = lightLayout.flatMap((box, index) =>
            box === darkLayout[index] ? [] : [`#${index}: ${box} -> ${darkLayout[index]}`]
          );
          assert.deepEqual(moved.slice(0, 10), [], `${width}px`);
        }

        // A pressed state is a rule of its own, which can outrank the reduced-motion one at rest.
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('DOM.enable');
        await cdp.send('CSS.enable');
        const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
        const { nodeIds } = await cdp.send('DOM.querySelectorAll', {
          nodeId: root.nodeId,
          selector: 'main :is(button, select, a[href], summary, input, [role="button"])'
        });
        await Promise.all(
          nodeIds.map((nodeId) =>
            cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['active'] })
          )
        );
        const pressed = await page.evaluate(() =>
          [...document.querySelectorAll('main *')].flatMap((element) => {
            const style = getComputedStyle(element);
            const durations = style.transitionDuration.split(',').map((part) => parseFloat(part));
            return durations.some((duration) => duration > 0) && style.transitionProperty !== 'none'
              ? [`${element.tagName.toLowerCase()}.${[...element.classList].join('.')}`]
              : [];
          })
        );
        assert.ok(nodeIds.length > 100, `only ${nodeIds.length} controls were pressed`);
        assert.deepEqual([...new Set(pressed)], [], 'pressed, these still ease');
      } finally {
        await page.close();
      }
    }
  );

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
          await page.goto(allSections(url));
          assert.equal(
            await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme),
            'dark'
          );
          // The browser's own chrome wears the dark canvas too (L-118).
          assert.deepEqual(
            await page.evaluate(() =>
              [...document.querySelectorAll('meta[name="theme-color"]')]
                .filter((meta) => matchMedia(/** @type {HTMLMetaElement} */ (meta).media).matches)
                .map((meta) => /** @type {HTMLMetaElement} */ (meta).content)
            ),
            ['#0c0e11']
          );
        } finally {
          await page.close();
        }
      }
    );

  // Growing the height would lay the whole page out on every frame, so only the content moves.
  test(
    'L-57 a disclosure opens to its full height at once and fades in its content',
    long,
    async () => {
      const page = await open(1440, 'light', {}, 'disclosure');
      try {
        const opened = await page.evaluate(async () => {
          const details = /** @type {HTMLDetailsElement} */ (
            document.querySelector('#disclosure details.sui-disclosure:not([open])')
          );
          details.open = true;
          const first = details.getBoundingClientRect().height;
          const opacity = Number(getComputedStyle(details, '::details-content').opacity);
          await Promise.allSettled(
            details.getAnimations({ subtree: true }).map((animation) => animation.finished)
          );
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
  test('L-58 a link a busy dialog holds loses its address, as a held button is disabled', async () => {
    const page = await openMount(browser, url);
    try {
      const link = await page.evaluate(async () => {
        const { lib, mount, createRawSnippet, flushSync } = /** @type {any} */ (window);
        const words = (/** @type {string} */ text) =>
          createRawSnippet(() => ({ render: () => `<span>${text}</span>` }));
        mount(lib.Modal, {
          target: document.body,
          props: {
            preview: true,
            busy: true,
            title: 'Rename Repository',
            // A raw snippet draws only markup, so the link is mounted into it as its own root.
            children: createRawSnippet(() => ({
              render: () => '<div id="held-link"></div>',
              setup: (/** @type {Element} */ node) => {
                mount(lib.Button, {
                  target: node,
                  props: { href: '/docs/', children: words('Read the Docs') }
                });
              }
            })),
            footer: createRawSnippet(() => ({
              render: () => '<button aria-busy="true">Saving</button>'
            }))
          }
        });
        flushSync();
        await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
        flushSync();
        const anchor = document.querySelector('#held-link a');
        return { href: anchor?.getAttribute('href'), role: anchor?.getAttribute('role') };
      });
      assert.deepEqual(link, { href: null, role: 'link' });
    } finally {
      await page.close();
    }
  });

  test('a fixed instant reads as the page was written, before and after script, in any zone', async () => {
    // Line Islands time is UTC+14, where noon UTC is already the next day.
    const read = async (/** @type {boolean} */ javaScriptEnabled) => {
      const page = await browser.newPage({ timezoneId: 'Pacific/Kiritimati', javaScriptEnabled });
      try {
        await page.goto(new URL('relative-time/', url).href);
        if (javaScriptEnabled) await page.waitForFunction(() => '__suiAudit' in window);
        return await page
          .locator('#relative-time time')
          .evaluateAll((times) =>
            times
              .map((time) => time.textContent?.trim() ?? '')
              .filter((words) => !/^(now|in\s|\d+\s\S+\sago)/.test(words))
          );
      } finally {
        await page.close();
      }
    };
    const written = await read(false);
    assert.ok(written.length >= 2, `found ${written.length} fixed instants`);
    assert.deepEqual(await read(true), written, 'script redrew a fixed date or hour');
  });

  test("L-57 a disclosure's hint shares the words' line only when both fit", async () => {
    const page = await open(375, 'light', {}, 'disclosure');
    try {
      const placed = await page.evaluate(() =>
        ['Skipped Repositories', 'More About This Sync'].map((name) => {
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
      const page = await open(width, 'light', {}, 'pill');
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

  test("an identity row's face stands level with its name's first line", async () => {
    // A long name used to centre the face on its whole block, so beside three lines it stood
    // by the second. It now centres on the first line, held in the row, as a short name's is.
    const page = await openMount(browser, url, { viewport: { width: 1440, height: 900 } });
    try {
      const rows = await page.evaluate(async () => {
        const { lib, mount, flushSync } = /** @type {any} */ (window);
        const host = document.createElement('div');
        host.style.cssText = 'display: grid; gap: 24px; inline-size: 16rem';
        document.body.append(host);
        const names = ['Ada Lovelace', 'Maria Gaetana Agnesi de la Cruz Montgomery-Wellington'];
        for (const name of names)
          for (const size of [24, 32, 40])
            mount(lib.IdentityRow, { target: host, props: { name, handle: '@ada', size } });
        flushSync();
        await document.fonts.ready;
        return [...host.querySelectorAll('.sui-identity-row')].map((row) => {
          const name = /** @type {Element} */ (row.querySelector('.sui-identity-name'));
          const words = document.createRange();
          words.selectNodeContents(name);
          const face = /** @type {Element} */ (
            row.querySelector('.sui-avatar')
          ).getBoundingClientRect();
          return {
            lines: words.getClientRects().length,
            top: face.top - row.getBoundingClientRect().top
          };
        });
      });
      for (const [index, size] of [24, 32, 40].entries()) {
        const [short, long] = [rows[index], rows[index + 3]];
        assert.equal(short.lines, 1, 'the short name wrapped');
        assert.ok(long.lines > 1, 'the long name did not wrap');
        assert.equal(
          long.top,
          short.top,
          `a wrapped name's ${size}px face stands ${long.top - short.top}px under a short name's`
        );
      }
    } finally {
      await page.close();
    }
  });

  test("L-102 an avatar's initials centre their drawn ink on the drawn circle", async () => {
    // A B leans on its stem, a Q hangs its tail and an accent stands over its letter, so the
    // advance and the cap band are not where the letters draw. The ground is painted red and
    // the letters blue, and both are found in the pixels at four device pixels to the pixel.
    for (const width of [1440, 375]) {
      const page = await openMount(browser, url, {
        viewport: { width, height: 900 },
        deviceScaleFactor: 4
      });
      try {
        const boxes = await page.evaluate(async () => {
          const { lib, mount, flushSync } = /** @type {any} */ (window);
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
  });

  test('L-6 the focus ring holds 3:1 on an open row the pointer rests on', async () => {
    // The open row's deeper hover share took the ring to 2.87:1 on the light inset ground, so a
    // row under keyboard focus keeps its resting plate while the pointer rests on it.
    const page = await open(1440, 'light', {}, 'avatar');
    try {
      const row = page.locator('#avatar .sui-object-row.current');
      await row.evaluate((node) =>
        /** @type {HTMLElement | null} */ (node.closest('.list'))?.style.setProperty(
          'background',
          'var(--sui-surface-inset)'
        )
      );
      await page.keyboard.press('Shift');
      await row.locator('a').focus();
      await row.locator('a').hover();
      assert.equal(await row.locator('a').evaluate((link) => link.matches(':focus-visible')), true);
      assert.deepEqual(
        (await audit(page)).filter(({ law }) => law === 'L-6').map(({ detail }) => detail),
        []
      );
    } finally {
      await page.close();
    }
  });

  test('a picture draws the same before script runs as after, named once', async () => {
    // The server render with no script is the reader's first frame: there a picture that fails
    // draws nothing over its initials and their ring, and one that loads covers them, even
    // through a logo's clear middle. The running page draws each the same.
    // Each failed picture names the one that loads beside it, so a specimen is found by its label.
    /** @type {Record<string, string>} */
    const named = {
      'Person, not loaded': 'Grace Hopper',
      'Workspace, not loaded': 'Platform Team',
      Person: 'Grace Hopper',
      Workspace: 'Platform Team'
    };
    const failed = ['Person, not loaded', 'Workspace, not loaded'];
    const loaded = ['Person', 'Workspace'];
    const address = new URL('avatar/', url);
    /** @type {string[]} */
    const problems = [];
    // A busy machine rasters a rounded edge's antialiased pixels up to five levels apart between
    // two shots of the same avatar on whole pixels, though nothing new shows there; what a part
    // draws changes far more.
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
            a.data.every((level, index) => Math.abs(level - b.data[index]) <= 6)
          );
        },
        [one.toString('base64'), two.toString('base64')]
      );
    // A busy machine can show a frame or more before a change is painted, so the witness is a
    // shot that the next one repeats.
    /**
     * @param {import('playwright-core').Page} page
     * @param {import('playwright-core').Locator} avatar
     */
    const settled = async (page, avatar) => {
      let shot = await avatar.screenshot();
      for (let tries = 0; tries < 10; tries += 1) {
        const next = await avatar.screenshot();
        if (await alike(page, next, shot)) return next;
        shot = next;
      }
      return shot;
    };
    /**
     * @param {import('playwright-core').Page} page
     * @param {string} name
     */
    const shoot = async (page, name) => {
      const avatar = page
        .locator('#avatar .example', { hasText: /^Pictures/ })
        .locator('figure')
        .filter({ has: page.getByText(name, { exact: true }) })
        .getByRole('img', { name: named[name], exact: true });
      await avatar.scrollIntoViewIfNeeded();
      // An edge off the pixel grid blends a few levels apart once the layers above it change,
      // so a shot is only a fair witness of an avatar standing on whole pixels.
      const x = (await avatar.boundingBox())?.x ?? 0;
      if (!Number.isInteger(x)) problems.push(`${name} stands at x ${x}`);
      // A lazy picture may not have started when decode() settles on a busy page, so it
      // loads now and the shot waits for it to fail or draw, and for the faces.
      for (const img of await avatar.locator('img').all())
        await img.evaluate(async (node) => {
          const picture = /** @type {HTMLImageElement} */ (node);
          picture.loading = 'eager';
          await picture.decode().catch(() => {});
          await document.fonts.ready;
        });
      return { avatar, shot: await settled(page, avatar) };
    };
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
          const { avatar, shot } = await shoot(page, name);
          drawn[name] = shot;
          if (javaScriptEnabled) {
            // Under a full parallel run the running page can still be painting when two shots
            // first agree, so it gets about a second to match; a change script makes stays.
            let same = await alike(page, drawn[name], before[name]);
            for (let tries = 0; !same && tries < 10; tries += 1) {
              await page.waitForTimeout(100);
              drawn[name] = await settled(page, avatar);
              same = await alike(page, drawn[name], before[name]);
            }
            // The first frame's shot may be the one a busy machine blurred at an edge, so it is
            // taken again on a page without script; a change script makes differs every time.
            for (let tries = 0; !same && tries < 3; tries += 1) {
              const quiet = await browser.newPage({
                viewport: { width: 1440, height: 900 },
                javaScriptEnabled: false
              });
              try {
                await quiet.goto(address.href);
                before[name] = (await shoot(quiet, name)).shot;
              } finally {
                await quiet.close();
              }
              same = await alike(page, drawn[name], before[name]);
            }
            if (!same) {
              const shots = ['before', 'after'].map((kind) =>
                join(tmpdir(), `sui-avatar-${name.replace(/\W+/g, '-')}-script-${kind}.png`)
              );
              writeFileSync(shots[0], before[name]);
              writeFileSync(shots[1], drawn[name]);
              problems.push(`${name} changes once script runs, see ${shots.join(' and ')}`);
            }
            continue;
          }
          // What a part adds is what disappears with it.
          const part = avatar.locator(failed.includes(name) ? 'img' : 'svg');
          await part.evaluate((node) => node.style.setProperty('display', 'none'));
          let without = await settled(page, avatar);
          // A busy machine can paint an edge pixel of either shot a few levels off, so both are
          // taken again; a part that draws something differs every time.
          let same = await alike(page, without, drawn[name]);
          for (let tries = 0; !same && tries < 5; tries += 1) {
            await part.evaluate((node) => node.style.removeProperty('display'));
            drawn[name] = await settled(page, avatar);
            await part.evaluate((node) => node.style.setProperty('display', 'none'));
            without = await settled(page, avatar);
            same = await alike(page, without, drawn[name]);
          }
          if (!same) {
            const shots = ['with', 'without'].map((kind) =>
              join(tmpdir(), `sui-avatar-${name.replace(/\W+/g, '-')}-${kind}.png`)
            );
            writeFileSync(shots[0], drawn[name]);
            writeFileSync(shots[1], without);
            problems.push(
              `${name}: the ${failed.includes(name) ? 'failed picture' : 'covered initials'} drew something, see ${shots.join(' and ')}`
            );
          }
          await part.evaluate((node) => node.style.removeProperty('display'));
        }
        if (!javaScriptEnabled) {
          assert.equal(
            await (await shoot(page, 'Person, not loaded')).avatar.ariaSnapshot(),
            '- img "Grace Hopper"'
          );
          // Beside the name an avatar is not heard at all, so the name is read once.
          await page.goto(new URL('timeline/', url).href);
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

  /** A menu or listbox layer that is open. */
  const LAYER = ':popover-open:has([role="listbox"], [role="menu"])';

  /**
   * @param {import('playwright-core').Page} page
   * @param {number} worker
   */
  const opensInPlace = async (page, worker) => {
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
      const before = await trigger.evaluate((element) => element.getBoundingClientRect().top);
      await trigger.click();
      if (
        await settles(page.waitForFunction((layer) => document.querySelector(layer), LAYER, brief))
      )
        await atRest(page);
      await page.mouse.move(0, 0);
      const report = await trigger.evaluate((element) => {
        const layer = document.querySelector(':popover-open:has([role="listbox"], [role="menu"])');
        if (!layer) return { missing: true };
        // A layer can start its opening move a frame after it shows, past the rest above.
        for (const animation of layer.getAnimations({ subtree: true }))
          if (animation.effect?.getTiming().iterations !== Infinity) animation.finish();
        const probe = document.createElement('span');
        probe.style.color = 'var(--sui-interactive-hover-layer)';
        element.append(probe);
        const veil = getComputedStyle(probe).color;
        probe.remove();
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
          lit:
            !element.matches('.sui-button:not(.field)') ||
            getComputedStyle(element).backgroundImage.includes(veil),
          heights: [...new Set(options.map((height) => Math.round(height * 100) / 100))],
          // The token is a max() of round()s, so a probe resolves it to pixels.
          tier: (() => {
            const probe = document.createElement('div');
            probe.style.blockSize = 'var(--sui-control-height-compact)';
            document.body.append(probe);
            const height = probe.getBoundingClientRect().height;
            probe.remove();
            return height;
          })()
        };
      });
      const name = `trigger ${index} (${await trigger.getAttribute('aria-haspopup')})`;
      if (report.missing) problems.push(`${name}: no menu opened`);
      else {
        if (!report.inside) problems.push(`${name}: the layer leaves the viewport`);
        if (report.narrower) problems.push(`${name}: the listbox is narrower than its trigger`);
        if (report.tall) problems.push(`${name}: the layer is taller than 20rem`);
        if (!report.lit) problems.push(`${name}: the open trigger lost its hover paint`);
        if (report.heights?.some((height) => height < report.tier - 0.01))
          problems.push(
            `${name}: option heights ${report.heights.join(', ')}, under ${report.tier}`
          );
      }
      const after = await trigger.evaluate((element) => element.getBoundingClientRect().top);
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
      const before = await select.evaluate((element) => element.getBoundingClientRect().top);
      await select.click();
      const handle = await select.elementHandle();
      if (
        await settles(page.waitForFunction((element) => element?.matches(':open'), handle, brief))
      )
        await atRest(page);
      await page.mouse.move(0, 0);
      const report = await select.evaluate((element) => {
        if (!(/** @type {HTMLSelectElement} */ (element).matches(':open'))) return { open: false };
        const picker = getComputedStyle(element, '::picker(select)');
        const probe = document.createElement('span');
        probe.style.color = 'var(--sui-field-frame-focus)';
        element.after(probe);
        const edge = getComputedStyle(probe).color;
        probe.remove();
        const options = [.../** @type {HTMLSelectElement} */ (element).options]
          .filter((option) => option.getClientRects().length > 0)
          .map((option) => option.getBoundingClientRect().height);
        return {
          open: true,
          narrower: parseFloat(picker.width) < element.getBoundingClientRect().width - 0.5,
          tall: parseFloat(picker.height) > 320.5,
          lit:
            !element.matches('.sui-select:not(.bare) select:not([aria-invalid="true"])') ||
            getComputedStyle(element).borderTopColor === edge,
          heights: [...new Set(options.map((height) => Math.round(height * 100) / 100))],
          // The token is a max() of round()s, so a probe resolves it to pixels.
          tier: (() => {
            const probe = document.createElement('div');
            probe.style.blockSize = 'var(--sui-control-height-compact)';
            document.body.append(probe);
            const height = probe.getBoundingClientRect().height;
            probe.remove();
            return height;
          })()
        };
      });
      const name = `select ${index} (${(await select.getAttribute('aria-label')) ?? (await select.getAttribute('id'))})`;
      if (!report.open) problems.push(`${name}: the picker did not open`);
      else {
        if (report.narrower) problems.push(`${name}: the picker is narrower than its field`);
        if (report.tall) problems.push(`${name}: the picker is taller than 20rem`);
        if (!report.lit) problems.push(`${name}: the open field lost its focus edge`);
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
  };

  /**
   * @param {import('playwright-core').Page} page
   * @param {number} worker
   */
  const layersOnTrigger = async (page, worker) => {
    // A smooth scroll would still move the trigger while its layer grows. Each layer's motion is
    // seeked to its ends, so its length does not matter, and a long one is still running when a
    // busy page gets round to looking at it. The trigger keeps its own press timing.
    await page.addStyleTag({
      content:
        'html { scroll-behavior: auto !important; } .sui-popover { --sui-duration-press: 10000ms !important; --sui-duration-normal: 10000ms !important; --sui-duration-open: 10000ms !important; }'
    });
    // The phone drawer is an edge layer, not one placed beside its trigger, and modal over its
    // own menu button, so it closes from inside.
    const triggers = page.locator(
      'main > section [popovertarget]:not(:disabled):not(.sui-shell-menu, [aria-controls*="drawer"])'
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
    for (let index = worker; index < count; index += WORKERS) {
      const trigger = triggers.nth(index);
      if (!(await trigger.isVisible())) continue;
      await trigger.scrollIntoViewIfNeeded();
      const name = `trigger ${index} (${(await trigger.textContent())?.trim() || (await trigger.getAttribute('aria-label'))})`;
      await trigger.click();
      await moving(trigger, true);
      const grew = await at(trigger, 'start');
      if (grew) problems.push(`${name}: opening does not start on the trigger, ${grew}`);
      await trigger.click();
      if (
        !(await settles(
          page.waitForFunction(() => !document.querySelector('[popover]:popover-open'), null, brief)
        ))
      ) {
        problems.push(`${name}: a second press left its layer open`);
        await page.keyboard.press('Escape');
      }
      await moving(trigger, false);
      const shrank = await at(trigger, 'end');
      if (shrank) problems.push(`${name}: closing does not end on the trigger, ${shrank}`);
      // The next trigger opens only once this layer has finished closing.
      await settles(
        page.waitForFunction(
          (element) =>
            !document.getElementById(element?.getAttribute('popovertarget') ?? '')?.getAnimations()
              .length,
          await trigger.elementHandle(),
          brief
        )
      );
    }
    return problems;
  };

  // A layer fits a phone's viewport only with the least room, so where each opens is read at
  // 375px. The second press and the motion read the wide layout, in one pass over the triggers.
  for (const width of [375, 1440])
    test(
      width === 375
        ? 'L-48 and L-52 every menu, listbox and select opens in place at 375px, its trigger kept in its hover paint'
        : 'a second press closes each layer at 1440px, and L-97 each layer grows from its trigger',
      long,
      async () => {
        const problems = await sweep(
          () => open(width, 'light'),
          WORKERS,
          async (page, worker) =>
            width === 375 ? await opensInPlace(page, worker) : await layersOnTrigger(page, worker)
        );
        assert.deepEqual(problems, []);
      }
    );

  test('L-50 a finger dragging the thumb chooses where it lifts', long, async () => {
    const page = await open(390, 'light', { hasTouch: true, isMobile: true }, 'segmented-control');
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
      await settles(
        page.waitForFunction(
          ([node, value]) => node?.querySelector('input:checked')?.getAttribute('value') === value,
          /** @type {const} */ ([await track.elementHandle(), wanted]),
          brief
        )
      );
      assert.equal(
        await track.evaluate((node) => node.querySelector('input:checked')?.getAttribute('value')),
        wanted,
        'lifting the finger over an option did not choose it'
      );

      // A second finger lands on the thumb mid-drag, and both lift.
      const held = () =>
        page.evaluate(() => ({
          inert: document.querySelectorAll('[inert]').length,
          select: document.documentElement.style.userSelect
        }));
      const rest = await held();
      await touch('touchStart', x1, y);
      for (let step = 1; step <= 4; step++)
        await touch('touchMove', x1 + ((x0 - x1) * step) / 4, y);
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [
          { x: x0, y, id: 0 },
          { x: x0 + 2, y, id: 1 }
        ]
      });
      await touch('touchEnd', x0, y);
      assert.deepEqual(await held(), rest, 'two fingers on the thumb left the page held');
    } finally {
      await page.close();
    }
  });

  test('L-50 a dragged thumb chooses on release, and Escape puts it back', long, async () => {
    const page = await open(1440, 'light', {}, 'segmented-control');
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
    const page = await open(1440, 'light', {}, 'clipped-label');
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
      // No state marks a tip that never opens, so this waits out the 250ms show delay.
      await page.waitForTimeout(600);
      assert.deepEqual(await tips(), [], 'entering the page opened a tip');

      const label = page.locator('#clipped-label .sui-clipped-label').last();
      await label.hover();
      await settles(
        page.waitForFunction(() => document.querySelector('.sui-tooltip:popover-open'), null, brief)
      );
      assert.deepEqual(await tips(), [await label.textContent()]);
    } finally {
      await page.close();
    }
  });

  test("L-91 and L-89 a row's change of state moves nothing and keeps focus", long, async () => {
    const page = await open(1440, 'light', {}, 'setting-list');
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
    "L-36 a phone's setting rows keep a lone switch and a fact beside the copy, a stacked row's copy takes the whole row under its reset, a switch's row hovers, controls under the copy leave no band above them, a status stands apart from the description with its mark, a checked box keeps the accent, a reset stands right before its select, and the narrow list fills the column",
    long,
    async () => {
      const page = await open(390, 'light', {}, 'setting-list');
      try {
        const rows = await page.locator('#setting-list .sui-setting-row').evaluateAll((all) =>
          all.map((row) => {
            const part = (/** @type {string} */ name) =>
              /** @type {Element} */ (row.querySelector(name)).getBoundingClientRect();
            const name = /** @type {Element} */ (row.querySelector('.sui-setting-words'));
            const [words, mark] = [...name.children].map((span) => [...span.getClientRects()]);
            return {
              name: name.firstElementChild?.textContent ?? '',
              beside: part('.sui-setting-value').left >= part('.sui-setting-say').right,
              fullWhy:
                row.querySelector('.sui-setting-why') === null ||
                Math.abs(part('.sui-setting-why').width - row.clientWidth + 16) < 1,
              markOnLastLine: Math.abs(mark[0].top - (words.at(-1)?.top ?? 0)) < 1,
              copyOnly:
                row.querySelector('.sui-setting-why') !== null &&
                Math.abs(part('.sui-setting-say').bottom - part('.sui-setting-why').bottom) < 1
            };
          })
        );
        const row = (/** @type {string} */ name) => rows.find((each) => each.name === name);
        for (const name of ['Mirror to the backup region', 'Sign each payload', 'Merge method'])
          assert.equal(row(name)?.beside, true, `${name} dropped under its copy`);
        // Controls on a line of their own leave the copy no empty band above them.
        for (const name of ['Command prefix', 'Log level'])
          assert.equal(row(name)?.copyOnly, true, `${name} kept an empty band over its controls`);
        const paths = row(
          'Paths the bot never formats, even when a rule in a parent workspace asks it to'
        );
        assert.equal(paths?.fullWhy, true, "the stacked row's why line kept the reset's column");
        assert.equal(paths?.markOnLastLine, true, 'the hidden Unsaved word took a line of its own');

        // The saving word and the Unsaved mark are statuses, set apart from the description.
        assert.deepEqual(
          await page
            .locator('#setting-list .sui-setting-row', { hasText: 'Sign each payload' })
            .evaluate((node) => {
              const look = (/** @type {string} */ part) =>
                getComputedStyle(/** @type {Element} */ (node.querySelector(part)));
              const [why, status, mark] = [
                '.sui-setting-why',
                '.sui-setting-status',
                '.sui-setting-mark'
              ].map(look);
              const [over, under] = ['.sui-setting-why', '.sui-setting-status'].map((part) =>
                /** @type {Element} */ (node.querySelector(part)).getBoundingClientRect()
              );
              return [
                why.fontWeight,
                status.fontWeight,
                mark.fontWeight,
                why.color !== status.color,
                Math.round(under.top - over.bottom)
              ];
            }),
          ['400', '500', '500', true, 12],
          'the saving word or the Unsaved mark reads as more of the description'
        );
        // A saving switch is its own change at work, as a busy button is, so it keeps its strength.
        assert.equal(
          await page
            .locator('#setting-list .sui-setting-row', { hasText: 'Sign each payload' })
            .locator('.sui-switch-track')
            .evaluate((track) => getComputedStyle(track).opacity),
          '1',
          'the saving switch dimmed as if held by work around it'
        );
        // The free area of a row whose name flips a switch wears the row's hover veil; a row
        // whose name only focuses a field does not.
        const veil = async (/** @type {string} */ name) => {
          const target = page.locator('#setting-list .sui-setting-row', { hasText: name }).first();
          await target.hover({ position: { x: 12, y: 12 } });
          return target.evaluate((node) => getComputedStyle(node, '::before').backgroundImage);
        };
        assert.notEqual(await veil('Mirror to the backup region'), 'none', 'the row did not hover');
        assert.equal(await veil('Command prefix'), 'none', "a field's row hovered");
        // A checked box keeps the accent on a changed row, so it has one on colour on the page,
        // and each status line is led by its mark.
        const fills = await page
          .locator('#setting-list .sui-setting-row', { hasText: 'Retry failed checks' })
          .evaluateAll((all) =>
            all.map((row) => {
              const box = row.querySelector('input:checked + .sui-checkbox-box');
              return box ? getComputedStyle(box).backgroundColor : '';
            })
          );
        assert.equal(
          new Set(fills.filter(Boolean)).size,
          1,
          `a checked box wore ${fills.join(' and ')}`
        );
        assert.equal(
          await page
            .locator('#setting-list :is(.sui-setting-status, .sui-setting-problem)')
            .evaluateAll(
              (all) =>
                all.filter((line) => line.firstElementChild?.tagName.toLowerCase() !== 'svg').length
            ),
          0,
          'a status line has no mark'
        );
        // A reset stands right before the select a segmented control turns into.
        assert.equal(
          await page
            .locator('#setting-list .sui-setting-row', { hasText: 'Log level' })
            .first()
            .evaluate((node) => {
              const at = (/** @type {string} */ part) =>
                /** @type {Element} */ (node.querySelector(part)).getBoundingClientRect();
              const [reset, select] = [at('.sui-setting-reset'), at('.sui-segmented select')];
              return [
                Math.round(select.left - reset.right),
                Math.round(select.top - reset.top)
              ].join();
            }),
          '8,0',
          'the reset stood away from its select'
        );
        // A phone's column is already narrow, so the narrow list leaves no empty band in it.
        assert.equal(
          await page
            .locator('#setting-list .example', { hasText: 'Narrow Width' })
            .locator('.sui-setting-list')
            .evaluate((list) => {
              const inner = list.getBoundingClientRect();
              const outer = /** @type {Element} */ (
                list.closest('.example')
              ).getBoundingClientRect();
              return [Math.round(inner.left - outer.left), Math.round(outer.right - inner.right)];
            })
            .then(([start, end]) => end - start),
          0,
          'the narrow list left an empty band beside its rows'
        );
      } finally {
        await page.close();
      }
    }
  );

  test(
    'L-52 and L-89 a pair chip edits in place and focus never falls to the page',
    long,
    async () => {
      const page = await open(1440, 'light', {}, 'pair-entry');
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
        await settles(
          page.waitForFunction(() => document.activeElement?.closest('[popover]'), null, brief)
        );
        assert.equal(await focused(), 'editor', 'the editor did not take focus');
        // A rejected key keeps the editor open with its words, and changes nothing.
        await page.keyboard.press('ControlOrMeta+a');
        await page.keyboard.type('Ship it');
        await page.keyboard.press('Enter');
        assert.equal(await editor.count(), 1, 'a rejected key closed the editor');
        assert.match(await editor.innerText(), /lowercase/);
        // Remove Pair stands at the editor's start, apart from Save Pair at its end.
        const [actions, removal, save] = await Promise.all(
          [
            editor.locator('.sui-pair-actions'),
            editor.getByRole('button', { name: 'Remove Pair' }),
            editor.getByRole('button', { name: 'Save Pair' })
          ].map((part) => part.boundingBox())
        );
        assert.ok(actions && removal && save, 'the editor lost an action');
        assert.ok(
          Math.abs(removal.x - actions.x) < 0.5 &&
            Math.abs(save.x + save.width - actions.x - actions.width) < 0.5,
          'Remove Pair and Save Pair do not stand at the two ends'
        );
        // The removal is destructive, so it wears the bordered danger tone (L-39).
        assert.equal(
          await editor.getByRole('button', { name: 'Remove Pair' }).getAttribute('data-tone'),
          'stop-quiet'
        );
        await page.keyboard.press('Escape');
        await settles(
          page.waitForFunction(
            () =>
              !document.querySelector(':popover-open .sui-pair-editor') &&
              !document.activeElement?.closest('[popover]'),
            null,
            brief
          )
        );
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
        assert.match(await focused(), /Add an Alias/, 'focus did not move to Add');
      } finally {
        await page.close();
      }
    }
  );

  // A sweep over every control of a kind runs on this many pages side by side. Each page loads
  // the whole sink, and on a four-core runner a third and fourth page cost more than they save.
  const WORKERS = 2;

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
    'L-42 every kind of control shows its press: a ground, an inset, and a sink when it has a frame',
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
              // Controls of one kind share their press styles, so one of each kind is pressed: the
              // kind is what those styles select on, its tag, classes, tone, state and role, and
              // the component it stands in, whose variant can restyle it, as a bare select does.
              const classes = (/** @type {Element} */ element) =>
                [...element.classList].filter((name) => !name.startsWith('svelte-')).sort();
              const own = (/** @type {Element} */ element) =>
                [
                  element.tagName,
                  ...classes(element),
                  ...[...element.attributes]
                    .filter(({ name }) =>
                      /^(data-|role$|type$|aria-(pressed|selected|current|checked|expanded)$)/.test(
                        name
                      )
                    )
                    .map(({ name, value }) => `${name}=${value}`)
                    .sort(),
                  element.querySelector('input:checked') ? 'checked' : ''
                ].join(' ');
              /** @type {Map<string, number>} */
              const kinds = new Map();
              for (const element of found) {
                const host = element.parentElement?.closest('[class*="sui-"]');
                const kind = `${own(element)} in ${host ? own(host) : ''}`;
                if (!kinds.has(kind)) kinds.set(kind, kinds.size);
                element.setAttribute('data-press-probe', String(kinds.get(kind)));
              }
              return { controls: found.length, kinds: kinds.size };
            },
            { pressable: PRESSABLE, textLinks: TEXT_LINKS }
          );
          assert.ok(count.controls > 50, `only ${count.controls} pressable controls were found`);
          assert.ok(count.kinds > 30, `only ${count.kinds} kinds of control were found`);
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
          const control = page.locator('[data-press-at]');
          for (let index = worker; index < count.kinds; index += WORKERS) {
            // Brought to the middle of the view, clear of the page's fixed bars, and measured in
            // one call. A control an earlier press re-rendered away is not there to press, so the
            // first of its kind still shown stands for it.
            const point = await page.evaluate((index) => {
              document.querySelector('[data-press-at]')?.removeAttribute('data-press-at');
              const element = [...document.querySelectorAll(`[data-press-probe="${index}"]`)].find(
                (element) => element.checkVisibility({ visibilityProperty: true })
              );
              if (!element) return null;
              element.setAttribute('data-press-at', '');
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

  test("on a phone a page's source row heads its examples, closer to them than they stand apart", async () => {
    const page = await open(390, 'light', {}, 'combobox');
    try {
      const gaps = await page.evaluate(() => {
        const head = /** @type {Element} */ (
          document.querySelector('.section:not(.headed) > .head')
        );
        // Each example stands in a wrapper that only carries its style props and draws no box.
        const [first, second] =
          head.parentElement?.querySelectorAll(':scope > svelte-css-wrapper > *') ?? [];
        return [
          first.getBoundingClientRect().top - head.getBoundingClientRect().bottom,
          second.getBoundingClientRect().top - first.getBoundingClientRect().bottom
        ];
      });
      assert.deepEqual(gaps, [16, 24]);
    } finally {
      await page.close();
    }
  });

  test('L-87 the phone drawer holds focus and gives it back', long, async () => {
    // The shell is a whole page of its own, opened on a phone.
    const page = await browser.newPage({ viewport: { width: 375, height: 900 } });
    try {
      await visit(page, new URL('layouts/app-shell/', url).href);
      const menu = page.locator('.sui-shell-menu');
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
      await visit(page, allSections(url));
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
});
