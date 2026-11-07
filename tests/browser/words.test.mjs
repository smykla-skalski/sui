import assert from 'node:assert/strict';
import { after, before, suite, test } from 'node:test';
import { allSections, long, openMount, startSink, together, visit } from './sink.mjs';

// A language that joins words with no spaces, or with its own commas, must hear exactly its
// own marks. Chrome adds a space on each side of any box that is not inline text when it builds
// a name from content, so a mark beside a hidden box or between flex items is not enough.

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

suite('words', together, () => {
  test('a space mark from the server stays in the name beside its word', long, async () => {
    const page = await browser.newPage();
    try {
      await visit(page, allSections(url));
      const cdp = await page.context().newCDPSession(page);
      /** @param {string} selector */
      const names = async (selector) => {
        const { result } = await cdp.send('Runtime.evaluate', {
          expression: `[...document.querySelectorAll(${JSON.stringify(selector)})]`
        });
        const { result: found } = await cdp.send('Runtime.getProperties', {
          objectId: result.objectId ?? '',
          ownProperties: true
        });
        const read = [];
        for (const entry of found.filter((entry) => /^\d+$/.test(entry.name))) {
          const { nodes } = await cdp.send('Accessibility.getPartialAXTree', {
            objectId: entry.value?.objectId,
            fetchRelatives: false
          });
          read.push(nodes[0].name?.value);
        }
        return read;
      };
      const legends = await names(
        'fieldset:has(.sui-check-list-required, .sui-choice-cards-required)'
      );
      assert.ok(legends.length > 0, 'the sink holds no required legend');
      assert.deepEqual(
        legends.filter((name) => !/\S Required$/.test(name ?? '')),
        []
      );
      // A closed list's options are out of the tree, so the first list with a note opens.
      const list = await page.$$eval('[role="combobox"]', (inputs) =>
        inputs
          .find(
            (input) =>
              input instanceof HTMLInputElement &&
              !input.disabled &&
              !input.readOnly &&
              input.checkVisibility() &&
              document
                .getElementById(input.getAttribute('aria-controls') ?? '')
                ?.querySelector('.sui-combobox-note')
          )
          ?.getAttribute('aria-controls')
      );
      assert.ok(list, 'the sink holds no option with a note');
      const input = page.locator(`[aria-controls="${list}"]`);
      await input.scrollIntoViewIfNeeded();
      await input.focus();
      await page.keyboard.press('ArrowDown');
      const noted = `#${list} .sui-combobox-option:has(.sui-combobox-note)`;
      await page.locator(noted).first().waitFor();
      const options = await names(noted);
      const words = await page.$$eval(noted, (found) =>
        found.map(
          (option) =>
            `${option.querySelector('.sui-combobox-label')?.textContent?.trim()} ${option.querySelector('.sui-combobox-note')?.textContent?.trim()}`
        )
      );
      assert.deepEqual(options, words);
    } finally {
      await page.close();
    }
  });

  // These tests only mount components. The space test runs first, because the next one
  // replaces the marks for the whole page.
  suite('mounted on one page', { concurrency: 1 }, () => {
    /** @type {import('playwright-core').Page} */
    let page;
    before(async () => {
      page = await openMount(browser, url);
    });
    after(() => page?.close());

    test('a control inside a sentence adds no space of its own to it', async () => {
      const spaced = await page.evaluate(() => {
        const { lib, mount, flushSync } = /** @type {any} */ (window);
        /** @type {[string, Record<string, unknown>][]} */
        const controls = [
          ['RelativeTime', { value: Date.now() - 60_000 }],
          ['HelpTip', { label: 'About drift', text: 'Drift means the files differ' }],
          ['CopyButton', { text: 'abc' }],
          ['IconButton', { label: 'Delete', icon: 'trash' }],
          ['ActionMenu', { label: 'More', items: [] }],
          ['AdditionPicker', { label: 'Add', choices: [], onadd: () => {} }],
          ['ColorPicker', { value: '#0e8a16', 'aria-label': 'Color' }],
          // Narrowed, because at full width a trailing space hangs at the line's end undrawn.
          [
            'Combobox',
            {
              'aria-label': 'Language',
              name: 'language',
              options: [{ value: 'ts', label: 'TypeScript' }],
              style: 'inline-size: 9rem'
            }
          ]
        ];
        return controls.flatMap(([name, props]) => {
          const sentence = document.createElement('p');
          document.body.prepend(sentence);
          sentence.append('Before');
          mount(lib[name], { target: sentence, props });
          flushSync();
          sentence.append('after.');
          // A space the component writes beside its own root is drawn between the words around it.
          const drawn = [...sentence.childNodes].filter((node) => {
            if (node.nodeType !== Node.TEXT_NODE || node.textContent?.trim()) return false;
            const range = document.createRange();
            range.selectNodeContents(node);
            return range.getClientRects().length > 0;
          });
          return drawn.length > 0 ? [name] : [];
        });
      });
      assert.deepEqual(spaced, []);
    });

    test('with every mark replaced, each joined name reads the marks and nothing between them', async () => {
      await page.evaluate(() => {
        const { lib, mount, createRawSnippet, flushSync } = /** @type {any} */ (window);
        lib.setWords({
          'marks.comma': 'ⓒ',
          'marks.space': 'ⓟ',
          'marks.stop': 'ⓢ',
          'Card.unsavedLabel': 'DIRTY',
          'SettingRow.unsavedLabel': 'DIRTY',
          'CheckList.requiredLabel': 'MUST',
          'ChoiceCards.requiredLabel': 'MUST',
          'Callout.warningLabel': 'HEADS-UP',
          'SideNav.countLabel': (/** @type {number} */ count) => `{${count} PCS}`,
          'Pill.liveLabel': 'ON-AIR',
          'Link.externalLabel': 'OFFSITE',
          'RelativeTime.exactLabel': (/** @type {string} */ time) => `{EXACT ${time}}`,
          'PairEntry.keyLabel': 'NAME',
          'PairEntry.valueLabel': 'TARGET'
        });
        const host = document.createElement('div');
        host.id = 'words-host';
        document.body.prepend(host);
        const html = (/** @type {string} */ markup) =>
          createRawSnippet(() => ({ render: () => markup }));
        const place = (/** @type {string} */ name, tag = 'div') => {
          const box = document.createElement(tag);
          box.dataset.words = name;
          host.append(box);
          return box;
        };
        const put = (
          /** @type {any} */ component,
          /** @type {string} */ name,
          /** @type {Record<string, unknown>} */ props,
          /** @type {string | undefined} */ tag = undefined
        ) => mount(component, { target: place(name, tag), props });
        put(lib.Card, 'Card', { title: 'Billing', unsaved: true, children: html('<p>x</p>') });
        put(lib.SettingRow, 'SettingRow', {
          name: 'Retries',
          unsaved: true,
          control: createRawSnippet(
            (/** @type {() => { id: string, describedby?: string }} */ ids) => ({
              render: () => '<input type="checkbox">',
              setup: (/** @type {Element} */ node) => {
                node.id = ids().id;
                if (ids().describedby)
                  node.setAttribute('aria-describedby', ids().describedby ?? '');
              }
            })
          )
        });
        put(lib.CheckList, 'CheckList', {
          label: 'Run on',
          required: true,
          options: [{ value: 'a', label: 'A' }],
          value: []
        });
        put(lib.ChoiceCards, 'ChoiceCards', {
          label: 'Merge',
          required: true,
          options: [{ value: 'a', label: 'A' }],
          value: 'a'
        });
        put(lib.SegmentedControl, 'SegmentedControl', {
          label: 'Show',
          value: 'u',
          options: [
            { value: 'u', label: 'Users', count: 24 },
            { value: 'i', label: 'Invites' }
          ]
        });
        put(lib.SideNav, 'SideNav', {
          title: 'Runs',
          sections: [{ items: [{ href: '#queue', label: 'Queue', icon: 'list', count: 3 }] }]
        });
        put(lib.Pill, 'Pill', { live: true, children: html('<span>Run</span>') }, 'button');
        put(lib.Link, 'Link', { href: 'https://example.com', children: html('<span>Docs</span>') });
        put(lib.RelativeTime, 'RelativeTime', { value: Date.now() - 3_600_000 }, 'p');
        put(lib.Disclosure, 'Disclosure', {
          summary: 'Skipped',
          hint: 'Three archived',
          children: html('<p>x</p>')
        });
        put(lib.AdditionPicker, 'AdditionPicker', {
          label: 'Add a Check',
          choices: [{ value: 'a', label: 'Auto merge', description: 'Once green' }],
          onadd: () => {}
        });
        put(lib.PairEntry, 'PairEntry', {
          label: 'Aliases',
          value: [{ key: 'alias', value: 'ship' }],
          options: [{ value: 'ship', label: 'Ship' }]
        });
        put(lib.ActionMenu, 'ActionMenu', {
          label: 'More',
          preview: true,
          items: [{ label: 'Transfer', description: 'Owners only', disabled: true }]
        });
        put(lib.Callout, 'Callout', {
          tone: 'warning',
          title: 'Drift\u00a0found',
          live: true,
          children: html(
            '<span>Read <span data-link></span> now<span data-pill></span>, ask <span data-tip></span> or <span data-copy></span></span>'
          )
        });
        flushSync();
        // A link and a pill in the live words, each with words a screen reader alone hears.
        const slot = (/** @type {string} */ name) =>
          document.querySelector(`[data-words="Callout"] [data-${name}]`) ?? document.body;
        mount(lib.Link, {
          target: slot('link'),
          props: { href: 'https://example.com', children: html('<span>Docs</span>') }
        });
        mount(lib.HelpTip, {
          target: slot('tip'),
          props: { label: 'About drift', text: 'Drift means the files differ' }
        });
        mount(lib.CopyButton, { target: slot('copy'), props: { text: 'abc' } });
        mount(lib.Pill, {
          target: slot('pill'),
          props: { live: true, children: html('<span>Run</span>') }
        });
        const tool = (/** @type {string} */ label, /** @type {string[]} */ words) => ({
          label,
          options: words.map((word) => ({ value: word, label: word })),
          value: words[0],
          onchange: () => {}
        });
        put(lib.ListToolbar, 'ListToolbar', {
          searchLabel: 'Search',
          filter: tool('State', ['All', 'Archived']),
          tools: [tool('Sort', ['Updated', 'Name']), tool('Show', ['Open', 'Closed'])]
        });
        put(lib.DurationInput, 'DurationInput', { label: 'Delay', value: 5, min: 60, max: 86_400 });
        put(lib.IdentityRow, 'IdentityRow', { name: 'Ada Lovelace', handle: '@ada' }, 'button');
        put(
          lib.IdentityRow,
          'IdentityHandle',
          {
            name: 'Ada Lovelace',
            handle: '@ada',
            handleName: (/** @type {string} */ name, /** @type {string} */ handle) =>
              handle.startsWith('@') ? `${name} on GitHub, ${handle}` : name
          },
          'button'
        );
        put(lib.PageHeader, 'FactLine', { title: 'Repository', eyebrow: ['main', '84 files'] });
        flushSync();
      });
      await page.locator('[data-words="AdditionPicker"] button').first().click();
      await page.locator('[data-words="AdditionPicker"] [role="menuitem"]').first().waitFor();

      const cdp = await page.context().newCDPSession(page);
      /** @param {string} selector */
      const read = async (selector) => {
        const { result } = await cdp.send('Runtime.evaluate', {
          expression: `document.querySelector(${JSON.stringify(selector)})`
        });
        assert.ok(result.objectId, `nothing matches ${selector}`);
        const { nodes } = await cdp.send('Accessibility.getPartialAXTree', {
          objectId: result.objectId,
          fetchRelatives: false
        });
        const description = nodes[0].properties?.find((entry) => entry.name === 'describedby');
        return {
          name: nodes[0].name?.value,
          description: nodes[0].description?.value ?? description?.value?.value
        };
      };
      const names = {
        Card: (await read('[data-words="Card"] .sui-card-title')).name,
        SettingRow: await read('[data-words="SettingRow"] input'),
        CheckList: (await read('[data-words="CheckList"] fieldset')).name,
        ChoiceCards: (await read('[data-words="ChoiceCards"] fieldset')).name,
        SegmentedControl: (await read('[data-words="SegmentedControl"] input[value="u"]')).name,
        SideNav: (await read('[data-words="SideNav"] a[href="#queue"]')).name,
        Pill: (await read('[data-words="Pill"]')).name,
        Link: await read('[data-words="Link"] a'),
        Disclosure: await read('[data-words="Disclosure"] summary'),
        AdditionPicker: (await read('[data-words="AdditionPicker"] [role="menuitem"]')).name,
        PairEntry: (await read('[data-words="PairEntry"] .sui-pair-edit')).name,
        ActionMenu: (await read('[data-words="ActionMenu"] [role="menuitem"]')).name,
        ListToolbar: (await read('[data-words="ListToolbar"] [aria-describedby$="-described"]'))
          .description,
        IdentityRow: (await read('[data-words="IdentityRow"]')).name
      };
      assert.deepEqual(names, {
        Card: 'BillingⓒDIRTY',
        SettingRow: { name: 'RetriesⓒDIRTY', description: undefined },
        CheckList: 'Run onⓟMUST',
        ChoiceCards: 'MergeⓟMUST',
        SegmentedControl: 'Usersⓟ(24)',
        SideNav: 'Queueⓒ{3 PCS}',
        Pill: 'RunⓒON-AIR',
        Link: { name: 'Docs⁠', description: 'OFFSITE' },
        Disclosure: { name: 'SkippedⓒThree archived', description: undefined },
        AdditionPicker: 'Auto mergeⓒOnce green',
        PairEntry: 'alias: ShipⓒNAME: TARGET',
        ActionMenu: 'TransferⓒOwners only',
        ListToolbar: 'AllⓒUpdatedⓒOpen',
        IdentityRow: 'Ada Lovelaceⓒ@ada'
      });
      assert.equal(
        await page.locator('[data-words="ListToolbar"] .sui-list-toolbar-chosen').textContent(),
        'UpdatedⓒOpen'
      );
      // The login is heard as it is drawn, so a page translator leaves it in both copies, and
      // the caller's words are given the login itself.
      for (const [row, said] of [
        ['IdentityRow', 'Ada Lovelaceⓒ@ada'],
        ['IdentityHandle', 'Ada Lovelace on GitHub, @ada']
      ])
        assert.deepEqual(
          await page
            .locator(`[data-words="${row}"] .sui-visually-hidden`)
            .evaluate((heard) => [
              heard.textContent,
              [...heard.querySelectorAll('*')].map((node) => [
                node.textContent,
                /** @type {HTMLElement} */ (node).translate
              ])
            ]),
          [said, [['@ada', false]]]
        );

      // What a reader hears of a fact line, text by text: the dot's alternative text is the
      // comma mark, and the dot itself is never read. The eyebrow draws its words in capitals,
      // and Chrome reads them as drawn.
      const { result: line } = await cdp.send('Runtime.evaluate', {
        expression: `document.querySelector('[data-words="FactLine"] .sui-fact-line')`
      });
      await cdp.send('Accessibility.enable');
      const {
        nodes: [root]
      } = await cdp.send('Accessibility.getPartialAXTree', {
        objectId: line.objectId,
        fetchRelatives: false
      });
      /** @type {unknown[]} */
      const heard = [];
      const visited = new Set();
      const listen = async (/** @type {typeof root} */ node) => {
        if (visited.has(node.nodeId)) return;
        visited.add(node.nodeId);
        if (node.role?.value === 'StaticText') return void heard.push(node.name?.value);
        const { nodes } = await cdp.send('Accessibility.getChildAXNodes', { id: node.nodeId });
        for (const child of nodes) await listen(child);
      };
      await listen(root);
      assert.deepEqual(heard, ['MAIN', 'ⓒ', '84 FILES']);

      const time = await read('[data-words="RelativeTime"] time');
      const resting = await page
        .locator('[data-words="RelativeTime"] time')
        .evaluate((node) => node.firstChild?.textContent?.trim() ?? '');
      assert.match(time.name ?? '', new RegExp(`^${resting}\\{EXACT [^}]+\\}$`));

      const callout = page.locator('[data-words="Callout"] [role="alert"]');
      await page.waitForFunction(
        () => document.querySelector('[data-words="Callout"] [role="alert"]')?.textContent !== ''
      );
      // What Chrome reads of the copy: the tip and the copy control by their names, and neither
      // the closed tip, the hidden note, the copy control's unshown state words nor the space
      // between the pill's flex items, which is not drawn. The title's no-break space stays.
      assert.equal(
        await callout.textContent(),
        'HEADS-UPⓟDrift\u00a0foundⓟRead Docs\u2060 nowRunⓒON-AIR, ask About drift or Copy'
      );

      const duration = await read('[data-words="DurationInput"] input:not([type="hidden"])');
      const shown = await page
        .locator('[data-words="DurationInput"] :is(.sui-duration-hint, .sui-duration-words)')
        .allTextContents();
      assert.equal(shown.length, 2, 'the hint or the problem is not drawn');
      assert.equal(duration.description, shown.map((text) => text.trim()).join('ⓢ'));
    });
  });

  // Waits measured in seconds, moved on by the page's clock instead of waited out.
  suite('mounted on a held clock', { concurrency: 1 }, () => {
    /** @type {import('playwright-core').Page} */
    let page;
    before(async () => {
      page = await openMount(browser, url);
      // An installed clock still runs in real time until paused, so a slow runner would pass a
      // 150ms wait between two steps of a test.
      await page.clock.install({ time: 0 });
      await page.clock.pauseAt(1000);
    });
    after(() => page?.close());

    test('L-117 a spinner waits out a fast answer and stays a moment once drawn', async () => {
      await page.evaluate(() => {
        const { lib, mount, flushSync, createRawSnippet, state, get } = /** @type {any} */ (window);
        const loading = state(false);
        const target = Object.assign(document.createElement('div'), { id: 'spinning' });
        document.body.prepend(target);
        mount(lib.Button, {
          target,
          props: {
            get loading() {
              return get(loading);
            },
            children: createRawSnippet(() => ({ render: () => '<span>Go</span>' }))
          }
        });
        flushSync();
        Object.assign(window, { loading });
      });
      /** @param {boolean} on */
      const set = (on) =>
        page.evaluate((on) => {
          const { set, flushSync, loading } = /** @type {any} */ (window);
          set(loading, on);
          flushSync();
        }, on);
      const spins = () => page.locator('#spinning .sui-button-spinner').isVisible();
      const marks = [];
      // A 60ms answer draws nothing.
      await set(true);
      await page.clock.runFor(60);
      marks.push(await spins());
      await set(false);
      await page.clock.runFor(200);
      marks.push(await spins());
      // A slow one draws the spinner, and an end right after it keeps the spinner a moment.
      await set(true);
      await page.clock.runFor(80);
      marks.push(await spins());
      await page.clock.runFor(170);
      marks.push(await spins());
      await set(false);
      await page.clock.runFor(100);
      marks.push(await spins());
      await page.clock.runFor(500);
      marks.push(await spins());
      assert.deepEqual(marks, [false, false, false, true, true, false]);
    });

    test('a live pill pulses again on a beat only once its dot has been still for 5 seconds', async () => {
      await page.evaluate(() => {
        const { lib, mount, flushSync, createRawSnippet, state, get } = /** @type {any} */ (window);
        const beat = state(0);
        const target = Object.assign(document.createElement('div'), { id: 'beating' });
        document.body.prepend(target);
        mount(lib.Pill, {
          target,
          props: {
            live: true,
            get beat() {
              return get(beat);
            },
            children: createRawSnippet(() => ({ render: () => '<span>Syncing</span>' }))
          }
        });
        flushSync();
        Object.assign(window, { beat });
      });
      const pulse = () =>
        page.evaluate(
          () =>
            document
              .querySelector('#beating .sui-pill-dot')
              ?.getAnimations({ subtree: true })
              .filter((run) => run.playState === 'running')
              .map((run) => run.effect?.getTiming().iterations) ?? []
        );
      const beatOnce = () =>
        page.evaluate(() => {
          const { set, get, flushSync, beat } = /** @type {any} */ (window);
          set(beat, get(beat) + 1);
          flushSync();
        });
      const seen = [await pulse()];
      // The dot is still from its `animationend`, which the browser sends with its next frame.
      await page.evaluate(async () => {
        const dot = /** @type {Element} */ (document.querySelector('#beating .sui-pill-dot'));
        const ended = new Promise((done) =>
          dot.addEventListener('animationend', done, { once: true })
        );
        for (const run of dot.getAnimations({ subtree: true })) run.finish();
        await ended;
      });
      await beatOnce();
      seen.push(await pulse());
      await page.clock.runFor(5000);
      await beatOnce();
      seen.push(await pulse());
      await beatOnce();
      seen.push(await pulse());
      // Three runs on arrival, none for a beat while the dot is fresh, one after 5 still
      // seconds, and none for a beat while that run still moves.
      assert.deepEqual(seen, [[3], [], [1], [1]]);
    });
  });
});
