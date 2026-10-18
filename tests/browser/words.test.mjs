import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { long, startSink, visit } from './sink.mjs';

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

test('a space mark from the server stays in the name beside its word', long, async () => {
  const page = await browser.newPage();
  try {
    await visit(page, url);
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

test('with every mark replaced, each joined name reads the marks and nothing between them', async () => {
  const page = await browser.newPage();
  try {
    await visit(page, url);
    await page.evaluate(async () => {
      // The sink's own copies, so the components share its Svelte runtime.
      const loaded = performance.getEntriesByType('resource').map((entry) => entry.name);
      const find = (/** @type {RegExp} */ pattern) => loaded.find((name) => pattern.test(name));
      const lib = await import(/* @vite-ignore */ find(/\/src\/lib\/index\.ts/) ?? '');
      const { mount, createRawSnippet, flushSync } = await import(
        /* @vite-ignore */ find(/\.vite\/deps\/svelte\.js/) ?? ''
      );
      lib.setWords({
        'marks.comma': 'ⓒ',
        'marks.space': 'ⓟ',
        'marks.stop': 'ⓢ',
        'Card.unsavedLabel': 'NIEZAP',
        'SettingRow.unsavedLabel': 'NIEZAP',
        'CheckList.requiredLabel': 'WYM',
        'ChoiceCards.requiredLabel': 'WYM',
        'Callout.warningLabel': 'UWAGA',
        'SideNav.countLabel': (/** @type {number} */ count) => `{${count} SZT}`,
        'Pill.liveLabel': 'NAZYWO',
        'Link.externalLabel': 'ZEWN',
        'RelativeTime.exactLabel': (/** @type {string} */ time) => `{DOKL ${time}}`,
        'PairEntry.keyLabel': 'KLUCZ',
        'PairEntry.valueLabel': 'WART',
        'PairEntry.arrowLabel': 'NA'
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
              if (ids().describedby) node.setAttribute('aria-describedby', ids().describedby ?? '');
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
        label: 'Add a check',
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
      Card: 'BillingⓒNIEZAP',
      SettingRow: { name: 'RetriesⓒNIEZAP', description: undefined },
      CheckList: 'Run onⓟWYM',
      ChoiceCards: 'MergeⓟWYM',
      SegmentedControl: 'Usersⓟ(24)',
      SideNav: 'Queueⓒ{3 SZT}',
      Pill: 'RunⓒNAZYWO',
      Link: { name: 'Docs⁠', description: 'ZEWN' },
      Disclosure: { name: 'SkippedⓒThree archived', description: undefined },
      AdditionPicker: 'Auto mergeⓒOnce green',
      PairEntry: 'aliasⓟNAⓟShip',
      ActionMenu: 'TransferⓒOwners only',
      ListToolbar: 'AllⓒUpdatedⓒOpen',
      IdentityRow: 'Ada Lovelaceⓒ@ada'
    });
    assert.equal(
      await page.locator('[data-words="ListToolbar"] .sui-list-toolbar-chosen').textContent(),
      'UpdatedⓒOpen'
    );

    const time = await read('[data-words="RelativeTime"] time');
    const resting = await page
      .locator('[data-words="RelativeTime"] time')
      .evaluate((node) => node.firstChild?.textContent?.trim() ?? '');
    assert.match(time.name ?? '', new RegExp(`^${resting}\\{DOKL [^}]+\\}$`));

    const callout = page.locator('[data-words="Callout"] [role="alert"]');
    await page.waitForFunction(
      () => document.querySelector('[data-words="Callout"] [role="alert"]')?.textContent !== ''
    );
    // What Chrome reads of the copy: the tip and the copy control by their names, and neither
    // the closed tip, the hidden note, the copy control's unshown state words nor the space
    // between the pill's flex items, which is not drawn. The title's no-break space stays.
    assert.equal(
      await callout.textContent(),
      'UWAGAⓟDrift\u00a0foundⓟRead Docs\u2060 nowRunⓒNAZYWO, ask About drift or Copy'
    );

    const duration = await read('[data-words="DurationInput"] input:not([type="hidden"])');
    const shown = await page
      .locator('[data-words="DurationInput"] :is(.sui-duration-hint, .sui-duration-words)')
      .allTextContents();
    assert.equal(shown.length, 2, 'the hint or the problem is not drawn');
    assert.equal(duration.description, shown.map((text) => text.trim()).join('ⓢ'));
  } finally {
    await page.close();
  }
});

test('a control inside a sentence adds no space of its own to it', async () => {
  const page = await browser.newPage();
  try {
    await visit(page, url);
    const spaced = await page.evaluate(async () => {
      const loaded = performance.getEntriesByType('resource').map((entry) => entry.name);
      const find = (/** @type {RegExp} */ pattern) => loaded.find((name) => pattern.test(name));
      const lib = await import(/* @vite-ignore */ find(/\/src\/lib\/index\.ts/) ?? '');
      const { mount, flushSync } = await import(
        /* @vite-ignore */ find(/\.vite\/deps\/svelte\.js/) ?? ''
      );
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
  } finally {
    await page.close();
  }
});
