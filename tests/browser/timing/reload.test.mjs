import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { allSections, long, startSink } from '../sink.mjs';

// A reload must paint its final page in its first frame: what the server drew is what the page
// draws once its script runs, the window stands at the reader's place, and nothing appears,
// vanishes or scrolls itself afterwards. Layout shift scores miss most of this, because a part
// that swaps in place, or a pane that scrolls itself, shifts nothing.

/** @type {{ close: () => Promise<void> }} */
let server;
/** @type {import('../sink.mjs').SinkBrowser} */
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
 * The pixels two same-sized PNG shots differ in, beyond the noise of a smoothed edge.
 * @param {import('playwright-core').Page} page
 * @param {string} a
 * @param {string} b
 */
const differing = (page, a, b) =>
  page.evaluate(
    async ([a, b]) => {
      const read = async (/** @type {string} */ data) => {
        const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
        const image = await createImageBitmap(new Blob([bytes]));
        const canvas = new OffscreenCanvas(image.width, image.height);
        const context = /** @type {OffscreenCanvasRenderingContext2D} */ (canvas.getContext('2d'));
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, image.width, image.height);
      };
      const [one, two] = [await read(a), await read(b)];
      if (one.width !== two.width || one.height !== two.height) return Infinity;
      let count = 0;
      for (let i = 0; i < one.data.length; i += 4)
        if (
          Math.abs(one.data[i] - two.data[i]) +
            Math.abs(one.data[i + 1] - two.data[i + 1]) +
            Math.abs(one.data[i + 2] - two.data[i + 2]) >
          24
        )
          count++;
      return count;
    },
    [a, b]
  );

// The frames the browser shows are compared, not states read from script, because a frame
// callback runs before the browser settles a scroll target or a scroll-state query, and so
// reads a page that is never drawn.
test('a reload halfway down paints its settled page in its first frame', long, async () => {
  const page = await browser.newPage({
    viewport: { width: 1341, height: 1091 },
    colorScheme: 'dark'
  });
  try {
    await page.goto(allSections(url));
    await page.waitForFunction(() => '__suiAudit' in window);
    const place = await page.evaluate(() => {
      scrollTo(0, Math.round((document.documentElement.scrollHeight - innerHeight) / 2));
      return scrollY;
    });
    await page.evaluate(
      () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
    );
    const cdp = await page.context().newCDPSession(page);
    /** @type {{ data: string; at: number }[]} */
    const shots = [];
    cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
      shots.push({ data, at: (metadata.timestamp ?? 0) * 1000 });
      cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    });
    await cdp.send('Page.startScreencast', { format: 'png', maxWidth: 1341, maxHeight: 1091 });
    await page.reload();
    await page.waitForFunction(() => '__suiAudit' in window);
    // A window to watch, not a wait for a state: a part that moves late moves after any state
    // the page could report.
    await page.waitForTimeout(2500);
    await cdp.send('Page.stopScreencast');
    const { origin, painted, y } = await page.evaluate(() => ({
      origin: performance.timeOrigin,
      painted: performance.getEntriesByName('first-paint')[0]?.startTime ?? 0,
      y: scrollY
    }));
    assert.equal(y, place, 'the reload lost the reader’s place');
    // A shot is stamped a little before the paint it shows is timed, never a frame before.
    const drawn = shots.filter((shot) => shot.at - origin >= painted - 8);
    assert.ok(drawn.length > 0, 'no frame was recorded');
    const changed = await differing(page, drawn[0].data, drawn[drawn.length - 1].data);
    // A rounded corner's smoothing may settle by a few pixels once the index's plate is measured.
    assert.ok(changed <= 32, `the first frame differs from the settled page in ${changed}px`);
  } finally {
    await page.close();
  }
});

// Sections whose parts used to change once the page ran: a control's form, a theme picker's
// choice, a partly chosen box, a table's line that says it scrolls, a tab row's place, a slow
// wait, times read from now, and a matrix that folded. The charts are compared by the boxes of
// their parts instead, which a shot clipped to the window would cut off.
const sections = [
  'segmented-control',
  'theme-switch',
  'checkbox',
  'data-table',
  'tabs',
  'skeleton',
  'relative-time',
  'buttons',
  'callout'
];

/** Where each chart draws every part of its plot, from the chart's own corner. */
const chartParts = () =>
  [...document.querySelectorAll('#charts .sui-chart')].map((chart) => {
    const corner = chart.getBoundingClientRect();
    return [chart, ...chart.querySelectorAll('.plot-band, .plot-band svg :not(title)')]
      .map((part) => {
        const box = part.getBoundingClientRect();
        return [box.x - corner.x, box.y - corner.y, box.width, box.height]
          .map((value) => value.toFixed(2))
          .join(' ');
      })
      .join(', ');
  });

test('the server’s render draws every part as the page draws it once it runs', long, async () => {
  /** @type {string[]} */
  const changed = [];
  for (const [width, height] of [
    [1341, 1091],
    [375, 812]
  ]) {
    /** @type {import('playwright-core').Page[]} */
    const pages = [];
    for (const runs of [false, true]) {
      const page = await browser.newPage({ viewport: { width, height }, colorScheme: 'dark' });
      if (!runs)
        await page.route('**/*', (route) =>
          route.request().resourceType() === 'script' ? route.abort() : route.continue()
        );
      await page.goto(allSections(url));
      if (runs) await page.waitForFunction(() => '__suiAudit' in window);
      await page.evaluate(() => document.fonts.ready);
      pages.push(page);
    }
    const shoot = async (
      /** @type {import('playwright-core').Page} */ page,
      /** @type {string} */ id
    ) => {
      const section = page.locator(`main > section#${id}`);
      await section.evaluate((el) =>
        scrollTo({ top: el.getBoundingClientRect().top + scrollY, behavior: 'instant' })
      );
      await page.evaluate(async () => {
        const frames = () =>
          new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
        await frames();
        // Both pages draw every part as it rests. A paused spinner still turns on the
        // compositor in Chrome, where the page reports it at its start, so it is cancelled.
        for (const animation of document.getAnimations())
          if (animation.timeline instanceof DocumentTimeline) animation.cancel();
        await frames();
      });
      const box = await section.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: Math.min(r.height, innerHeight - r.y) };
      });
      return (await page.screenshot({ clip: box })).toString('base64');
    };
    const [drawn, ran] = await Promise.all(pages.map((page) => page.evaluate(chartParts)));
    if (drawn.length === 0 || ran.length !== drawn.length)
      changed.push(`#charts at ${width}px: ${drawn.length} charts, then ${ran.length}`);
    drawn.forEach((parts, at) => {
      if (parts !== ran[at]) changed.push(`chart ${at + 1} of #charts at ${width}px`);
    });
    for (const id of sections) {
      const shots = [await shoot(pages[0], id), await shoot(pages[1], id)];
      const count = await differing(pages[1], shots[0], shots[1]);
      if (count === 0) continue;
      // Both frames are kept, so a redraw that only shows up under load can be read afterwards.
      const [served, run] = ['served', 'run'].map((kind) =>
        join(tmpdir(), `sui-reload-${id}-${width}-${kind}.png`)
      );
      writeFileSync(served, Buffer.from(shots[0], 'base64'));
      writeFileSync(run, Buffer.from(shots[1], 'base64'));
      changed.push(`${id} at ${width}px: ${count}px (${served}, ${run})`);
    }
    for (const page of pages) await page.close();
  }
  assert.deepEqual(changed, [], `the page redrew ${changed.join(', ')}`);
});
