import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { allSections, long, startSink, visit } from '../sink.mjs';

// Lab stand-ins for field data: a page with the library and nothing else, on a CPU about as fast
// as a mid-range phone's, against the Core Web Vitals "good" limits (CLS 0.1, INP 200ms) and the
// 50ms long task. A laptop runs four times slower to get there; a CI runner is already that slow.
const slowdown = process.env.CI ? 1 : 4;

/** @type {{ close: () => Promise<void> }} */
let server;
/** @type {import('../sink.mjs').SinkBrowser} */
let browser;
let url = '';

// Its tests mount the library's own modules, which only a dev server serves.
before(async () => {
  ({ server, browser, url } = await startSink({ dev: true }));
});

after(async () => {
  await browser?.close();
  await server?.close();
});

/** An app page: the library loaded, the sink's own sections gone, the CPU slowed. */
async function app() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await visit(page, allSections(url));
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
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: slowdown });
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
    await visit(page, allSections(url));
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

/**
 * The page's frames while `act` runs and for `span` milliseconds from the first one: each one's
 * gap to the frame before it, and whether it is the first dropped frame after a click ran, the one
 * that draws its first answer, in the frame the click runs in or the next. A gap of 1.5 of the
 * display's own intervals or more is a dropped frame, at any refresh rate.
 * @param {import('playwright-core').Page} page
 * @param {number} span
 * @param {() => Promise<unknown>} act
 */
async function frames(page, span, act) {
  const recorded = page.evaluate(
    (span) =>
      new Promise((done) => {
        /** @type {{ at: number, gap: number }[]} */
        const seen = [];
        let start = 0;
        // A click starts only once its target holds still for a few frames, so the frames
        // before it show no answer yet. It is timed as it runs, not by its input's time stamp,
        // which comes before a frame that started ahead of it.
        let clicked = Infinity;
        const press = () => (clicked = Math.min(clicked, performance.now()));
        addEventListener('click', press, { capture: true });
        /** @param {number} now */
        const step = (now) => {
          if (start) seen.push({ at: now, gap: now - (seen.at(-1)?.at ?? start) });
          start ||= now;
          if (now - start < span) requestAnimationFrame(step);
          else {
            removeEventListener('click', press, { capture: true });
            done({ seen, clicked });
          }
        };
        requestAnimationFrame(step);
      }),
    span
  );
  // The recorder starts on a frame of its own, before the act.
  await page.waitForTimeout(100);
  await act();
  const { seen, clicked } =
    /** @type {{ seen: { at: number, gap: number }[], clicked: number }} */ (await recorded);
  const interval = seen.map(({ gap }) => gap).sort((a, b) => a - b)[seen.length >> 1];
  /** @param {number} gap */
  const late = (gap) => gap >= interval * 1.5;
  const answer = seen.find(({ at, gap }) => at > clicked && late(gap));
  return seen.map((frame) => ({
    gap: Math.round(frame.gap),
    dropped: late(frame.gap),
    answer: frame === answer
  }));
}

/**
 * The frames a measure found dropped, from the first of three runs that drops none, or from the
 * last run. Another process can take the machine for a frame at any moment, but the page's own
 * work drops its frames on every run.
 * @param {() => Promise<string[]>} measure
 */
async function steadiest(measure) {
  let late = await measure();
  for (let run = 1; run < 3 && late.length; run++) late = await measure();
  return late;
}

test('a clock tick over a list of 100 times drops no frame', long, async () => {
  const page = await app();
  try {
    await page.evaluate(async () => {
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
      await new Promise((painted) => requestAnimationFrame(() => setTimeout(painted)));
    });
    // The page's one clock ticks every 30 seconds after its first reader mounts.
    const late = await steadiest(async () =>
      (await frames(page, 31_000, async () => {}))
        .filter(({ dropped }) => dropped)
        .map(({ gap }) => `${gap}ms`)
    );
    assert.deepEqual(late, [], `the tick held frames for ${late.join(', ')}`);
  } finally {
    await page.close();
  }
});

// Chrome's own wheel gesture, one latched sequence as a wheel or trackpad sends it, over a long
// page whose index marks the section the reader is in.
test(
  'an index of 1000 sections follows a wheel scroll without dropping a frame',
  long,
  async () => {
    const late = await steadiest(async () => {
      const page = await app();
      try {
        await page.evaluate(async () => {
          const { lib, mount, flushSync } = /** @type {any} */ (window);
          const entries = Array.from({ length: 1000 }, (_, index) => ({
            id: `part-${index}`,
            label: `Part ${index}`
          }));
          const layout = document.createElement('div');
          layout.style.cssText =
            'display: grid; grid-template-columns: 16rem 1fr; align-items: start';
          const aside = document.createElement('div');
          const main = document.createElement('main');
          for (const { id, label } of entries) {
            const section = document.createElement('section');
            const heading = document.createElement('h2');
            section.id = id;
            section.style.blockSize = '240px';
            heading.textContent = label;
            section.append(heading);
            main.append(section);
          }
          layout.append(aside, main);
          document.body.append(layout);
          mount(lib.PageToc, { target: aside, props: { entries } });
          flushSync();
          await new Promise((painted) => requestAnimationFrame(() => setTimeout(painted)));
        });
        const cdp = await page.context().newCDPSession(page);
        const scroll = () =>
          cdp.send('Input.synthesizeScrollGesture', {
            x: 800,
            y: 450,
            yDistance: -20_000,
            speed: 4000,
            gestureSourceType: 'mouse'
          });
        return (await frames(page, 5000, scroll))
          .filter(({ dropped }) => dropped)
          .map(({ gap }) => `${gap}ms`);
      } finally {
        await page.close();
      }
    });
    assert.deepEqual(late, [], `the scroll held frames for ${late.join(', ')}`);
  }
);

// Each layer opens twice in its own section of the sink, the rest of the sink removed so the
// page is as small as an app's. The first open pays once for the layer's first style and paint,
// so the one frame that draws them may run long and every other frame is held to 60fps; every
// later open is held to it from the press.
for (const [id, trigger] of [
  ['action-menu', '[aria-haspopup="menu"]'],
  ['select', 'select:not([disabled])'],
  ['overlays', 'button[popovertarget]'],
  ['confirm-dialog', 'button:has-text("Publish release")'],
  ['modal', 'button:has-text("webhook")'],
  ['toaster', 'button:has-text("Save settings")']
]) {
  test(`the ${id} layer grows at 60 frames a second`, long, async () => {
    const late = await steadiest(async () => {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      try {
        await visit(page, allSections(url));
        await page.evaluate((id) => {
          for (const section of document.querySelectorAll('main section[id]'))
            if (section.id !== id) section.remove();
        }, id);
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: slowdown });
        const press = page.locator(`#${id} ${trigger}`).first();
        /** @type {string[]} */
        const found = [];
        for (const open of ['first', 'later']) {
          await page.waitForTimeout(500);
          for (const { gap, dropped, answer } of await frames(page, 800, () => press.click()))
            if (dropped && !(answer && open === 'first'))
              found.push(`${gap}ms on the ${open} open`);
          await page.keyboard.press('Escape');
        }
        return found;
      } finally {
        await page.close();
      }
    });
    assert.deepEqual(late, [], `frames held for ${late.join(', ')}`);
  });
}
