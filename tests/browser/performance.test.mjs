import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { long, startSink, visit } from './sink.mjs';

// Lab stand-ins for field data: a page with the library and nothing else, on a CPU four times
// slower, against the Core Web Vitals "good" limits (CLS 0.1, INP 200ms) and the 50ms long task.

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

/** An app page: the library loaded, the sink's own sections gone, the CPU four times slower. */
async function app() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await visit(page, url);
  await page.evaluate(async () => {
    const loaded = performance.getEntriesByType('resource').map((entry) => entry.name);
    const find = (/** @type {RegExp} */ pattern) => loaded.find((name) => pattern.test(name));
    const lib = await import(/* @vite-ignore */ find(/\/src\/lib\/index\.ts/) ?? '');
    const { mount, flushSync } = await import(
      /* @vite-ignore */ find(/\.vite\/deps\/svelte\.js/) ?? ''
    );
    Object.assign(window, { lib, mount, flushSync });
    for (const element of [...document.body.children]) element.remove();
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  return page;
}

test('loading the sink shifts no layout past the CLS limit', long, async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.addInitScript(() => {
      Object.assign(window, { shifted: 0 });
      new PerformanceObserver((list) => {
        for (const entry of /** @type {any[]} */ (list.getEntries()))
          if (!entry.hadRecentInput)
            /** @type {any} */ (window).shifted += entry.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await visit(page, url);
    await page.waitForTimeout(1000);
    const shifted = await page.evaluate(() => /** @type {any} */ (window).shifted);
    assert.ok(shifted < 0.1, `the page shifted ${shifted}`);
  } finally {
    await page.close();
  }
});

test('a keystroke in a combobox of 5000 options answers within 200ms', long, async () => {
  const page = await app();
  try {
    const answered = await page.evaluate(async () => {
      const { lib, mount, flushSync } = /** @type {any} */ (window);
      const options = Array.from({ length: 5000 }, (_, index) => ({
        value: `v${index}`,
        label: `Option ${index} ${['alpha', 'beta', 'gamma'][index % 3]}`
      }));
      mount(lib.Combobox, {
        target: document.body,
        props: { 'aria-label': 'Pick', options }
      });
      flushSync();
      const input = /** @type {HTMLInputElement} */ (
        document.querySelector('input[role="combobox"]')
      );
      input.focus();
      // From the key to the frame that shows its answer, as INP counts it.
      const start = performance.now();
      input.value = 'b';
      input.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'b' }));
      await new Promise((frame) => requestAnimationFrame(() => setTimeout(frame)));
      return performance.now() - start;
    });
    assert.ok(answered < 200, `the keystroke took ${Math.round(answered)}ms`);
  } finally {
    await page.close();
  }
});

test('sorting a table of 500 rows answers within 200ms', long, async () => {
  const page = await app();
  try {
    const answered = await page.evaluate(async () => {
      const { lib, mount, flushSync } = /** @type {any} */ (window);
      const rows = Array.from({ length: 500 }, (_, index) => ({
        id: index,
        name: `repo-${(index * 7919) % 500}`,
        stars: (index * 104729) % 1000
      }));
      mount(lib.DataTable, {
        target: document.body,
        props: {
          caption: 'Repositories',
          columns: [
            { key: 'name', label: 'Name', sortable: true },
            { key: 'stars', label: 'Stars', sortable: true }
          ],
          rows,
          rowKey: (/** @type {{ id: number }} */ row) => row.id
        }
      });
      flushSync();
      const start = performance.now();
      /** @type {HTMLElement} */ (document.querySelector('th button')).click();
      await new Promise((frame) => requestAnimationFrame(() => setTimeout(frame)));
      return performance.now() - start;
    });
    assert.ok(answered < 200, `the sort took ${Math.round(answered)}ms`);
  } finally {
    await page.close();
  }
});

test('a clock tick over a list of 100 times holds no task past 50ms', long, async () => {
  const page = await app();
  try {
    const longest = await page.evaluate(async () => {
      const { lib, mount, flushSync } = /** @type {any} */ (window);
      const list = document.createElement('ul');
      document.body.append(list);
      for (let index = 0; index < 100; index++) {
        const item = document.createElement('li');
        list.append(item);
        mount(lib.RelativeTime, {
          target: item,
          props: { value: Date.now() - index * 3_600_000 }
        });
      }
      flushSync();
      // The page's one clock ticks every 30 seconds; one tick is waited for.
      return new Promise((done) => {
        let worst = 0;
        new PerformanceObserver((entries) => {
          for (const entry of entries.getEntries()) worst = Math.max(worst, entry.duration);
        }).observe({ type: 'longtask' });
        setTimeout(() => done(worst), 31_000);
      });
    });
    assert.equal(longest, 0, `a tick held the page for ${longest}ms`);
  } finally {
    await page.close();
  }
});
