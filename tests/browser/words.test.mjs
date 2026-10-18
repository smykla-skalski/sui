import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { startSink, visit } from './sink.mjs';

// A language that joins words with no spaces, or with its own commas, must hear exactly its
// own marks. Chrome adds a space on each side of any box that is not inline text when it builds
// a name from content, so a mark beside a hidden box or between flex items is not enough.

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

test('a required legend from the server keeps the space before its word', async () => {
  const page = await browser.newPage();
  try {
    await visit(page, url);
    const cdp = await page.context().newCDPSession(page);
    const { result } = await cdp.send('Runtime.evaluate', {
      expression:
        "[...document.querySelectorAll('fieldset:has(.sui-check-list-required, .sui-choice-cards-required)')]"
    });
    const { result: found } = await cdp.send('Runtime.getProperties', {
      objectId: result.objectId ?? '',
      ownProperties: true
    });
    const names = [];
    for (const entry of found.filter((entry) => /^\d+$/.test(entry.name))) {
      const { nodes } = await cdp.send('Accessibility.getPartialAXTree', {
        objectId: entry.value?.objectId,
        fetchRelatives: false
      });
      names.push(nodes[0].name?.value);
    }
    assert.ok(names.length > 0, 'the sink holds no required legend');
    assert.deepEqual(
      names.filter((name) => !/\S Required$/.test(name ?? '')),
      []
    );
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
        'Card.unsavedLabel': 'NIEZAP',
        'SettingRow.unsavedLabel': 'NIEZAP',
        'CheckList.requiredLabel': 'WYM',
        'ChoiceCards.requiredLabel': 'WYM',
        'Callout.warningLabel': 'UWAGA',
        'SegmentedControl.countedLabel': (
          /** @type {string} */ label,
          /** @type {string} */ count
        ) => `{${count}|${label}}`,
        'SideNav.countLabel': (/** @type {number} */ count) => `{${count} SZT}`,
        'Pill.liveLabel': 'NAZYWO',
        'Link.externalLabel': 'ZEWN',
        'RelativeTime.exactLabel': (/** @type {string} */ time) => `{DOKL ${time}}`,
        'PairEntry.keyLabel': 'KLUCZ',
        'PairEntry.valueLabel': 'WART'
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
      put(lib.Callout, 'Callout', {
        tone: 'warning',
        title: 'Drift',
        live: true,
        children: html('<span>Body</span>')
      });
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
      Disclosure: (await read('[data-words="Disclosure"] summary')).name,
      AdditionPicker: (await read('[data-words="AdditionPicker"] [role="menuitem"]')).name,
      PairEntry: (await read('[data-words="PairEntry"] .sui-pair-edit')).name
    };
    assert.deepEqual(names, {
      Card: 'BillingⓒNIEZAP',
      SettingRow: { name: 'Retries', description: 'NIEZAP' },
      CheckList: 'Run onⓟWYM',
      ChoiceCards: 'MergeⓟWYM',
      SegmentedControl: '{24|Users}',
      SideNav: 'Queueⓒ{3 SZT}',
      Pill: 'RunⓒNAZYWO',
      Link: { name: 'Docs⁠', description: 'ZEWN' },
      Disclosure: 'SkippedⓒThree archived',
      AdditionPicker: 'Auto mergeⓒOnce green',
      PairEntry: 'KLUCZⓟaliasⓒWARTⓟShip'
    });

    const time = await read('[data-words="RelativeTime"] time');
    const resting = await page
      .locator('[data-words="RelativeTime"] time')
      .evaluate((node) => node.firstChild?.textContent?.trim() ?? '');
    assert.match(time.name ?? '', new RegExp(`^${resting}\\{DOKL [^}]+\\}$`));

    const callout = page.locator('[data-words="Callout"] [role="alert"]');
    await page.waitForFunction(
      () => document.querySelector('[data-words="Callout"] [role="alert"]')?.textContent !== ''
    );
    assert.equal(await callout.textContent(), 'UWAGAⓟDriftⓟBody');
  } finally {
    await page.close();
  }
});
