import { existsSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { chromium } from 'playwright-core';
import { createBuilder, createServer, preview } from 'vite';

/**
 * Options for a test that takes long, such as an axe or a picture pass over the whole sink or a
 * sweep that presses every control. It runs only with `SUI_LONG=1` (`npm run test:browser:long`),
 * as in CI, so the everyday run stays quick.
 */
export const long = { skip: process.env.SUI_LONG ? false : 'long: run with SUI_LONG=1' };

/**
 * Lets a file's tests run side by side. Each test opens its own page in the file's browser, so
 * they share nothing but the browser; a third of the machine's cores keeps the pages from
 * starving one another while the other files run too.
 */
export const together = { concurrency: Math.max(2, Math.floor(availableParallelism() / 3)) };

const launch = () => chromium.launch({ channel: process.env.SUI_BROWSER_CHANNEL ?? 'chrome' });

/**
 * Starts the kitchen sink on a free port, built once and served as static files. A dev server
 * sends each page about 500 modules one by one, so the pages a run opens side by side wait on it
 * in turn and pass the 30-second wait. `SUI_SINK_DEV=1` serves the dev server instead, for a
 * quick run of one file while editing.
 */
export async function serveSink() {
  if (process.env.SUI_SINK_DEV) return serveDev();
  // The app build, as `vite build` runs it: SvelteKit writes its client's entries in it.
  await (await createBuilder({ logLevel: 'error' })).buildApp();
  const server = await preview({ logLevel: 'error', preview: { port: 0 } });
  return { server, url: server.resolvedUrls?.local[0] ?? '' };
}

/**
 * Without a dependency cache, as in CI, the dev server optimizes its dependencies on the first
 * visit and then reloads the page, so one visit happens here, before any test presses anything
 * on a page that is about to reload.
 */
async function serveDev() {
  // The sink's modules are transformed while the test files and their browsers start.
  const server = await createServer({
    logLevel: 'error',
    server: {
      port: 0,
      warmup: { clientFiles: ['./src/routes/**/*.svelte', './src/lib/**/*.{svelte,ts}'] }
    }
  });
  await server.listen();
  const url = server.resolvedUrls?.local[0] ?? '';
  if (existsSync('node_modules/.vite/deps/_metadata.json')) return { server, url };
  const browser = await launch();
  const page = await browser.newPage();
  await page.goto(`${url}?audit=manual`);
  await page.waitForFunction(() => '__suiAudit' in window, null, { timeout: 120_000 });
  await browser.close();
  return { server, url };
}

/** @typedef {{ newPage: import('playwright-core').Browser['newPage']; close: () => Promise<void> }} SinkBrowser */

/**
 * A browser for the sink, started on its first page, so a file whose tests are all skipped
 * starts none. The run's global setup serves one sink for every file through `SUI_SINK_URL`; a
 * file run on its own serves its own. `dev` serves a dev server of its own, for a test of what
 * only the dev server does.
 * @param {{ dev?: boolean }} [options]
 * @returns {Promise<{ server: { close: () => Promise<void> }; browser: SinkBrowser; url: string }>}
 */
export async function startSink({ dev = false } = {}) {
  const shared = dev ? undefined : process.env.SUI_SINK_URL;
  const own = shared ? null : await (dev ? serveDev() : serveSink());
  /** @type {Promise<import('playwright-core').Browser> | undefined} */
  let started;
  return {
    server: { close: async () => void (await own?.server.close()) },
    browser: {
      // The built sink registers its service worker, whose caches would carry one test's
      // answers into the next; a dev sink registers none, and its own test asks for one.
      newPage: async (options) =>
        (await (started ??= launch())).newPage(
          dev ? options : { serviceWorkers: 'block', ...options }
        ),
      close: async () => void (await (await started)?.close())
    },
    url: shared ?? own?.url ?? ''
  };
}

/**
 * Loads the sink and waits until it has mounted, so its controls answer a press. The page runs
 * its law audit only when a test asks for it.
 * @param {import('playwright-core').Page} page
 * @param {string} url
 */
export async function visit(page, url) {
  const address = new URL(url);
  address.searchParams.set('audit', 'manual');
  await page.goto(address.href);
  await page.waitForFunction(() => '__suiAudit' in window);
}

/**
 * Spreads a sweep over several pages of the sink, each taking every `workers`th item from its own
 * `worker` on, so a sweep that waits on the browser for each item runs side by side. Every page
 * holds the same items in the same order, and the problems each one finds are joined.
 * @param {() => Promise<import('playwright-core').Page>} opener
 * @param {number} workers
 * @param {(page: import('playwright-core').Page, worker: number) => Promise<string[]>} run
 * @returns {Promise<string[]>}
 */
export async function sweep(opener, workers, run) {
  const pages = await Promise.all(Array.from({ length: workers }, opener));
  try {
    return (await Promise.all(pages.map((page, worker) => run(page, worker)))).flat();
  } finally {
    await Promise.all(pages.map((page) => page.close()));
  }
}

/** How long a test waits for a state to arrive before it reports that it never did. */
export const brief = { timeout: 2000 };

/**
 * Says whether a wait such as `page.waitForFunction(predicate, arg, brief)` saw its state arrive,
 * so a test reads a state the moment it arrives instead of sleeping a guessed time, and still
 * reports a state that never arrives.
 * @param {Promise<unknown>} wait
 * @returns {Promise<boolean>}
 */
export const settles = (wait) =>
  wait.then(
    () => true,
    () => false
  );

/**
 * Ends every finite animation at once, so boxes are read where they come to rest. A scroll-driven
 * one is left alone: it follows its scroller, and ending it would hold it at its end.
 * @param {import('playwright-core').Page} page
 */
export const atRest = (page) =>
  page.evaluate(() => {
    for (const animation of document.getAnimations())
      if (
        animation.timeline instanceof DocumentTimeline &&
        animation.effect?.getTiming().iterations !== Infinity
      )
        animation.finish();
  });

/**
 * Runs the page's law audit. The page's own run waits for every finite animation to end; ending
 * them at once gives the same final state seconds sooner.
 * @param {import('playwright-core').Page} page
 * @returns {Promise<{ law: string; where: string; detail: string }[]>}
 */
export const audit = (page) =>
  page.evaluate(async () => {
    for (const animation of document.getAnimations())
      if (
        animation.timeline instanceof DocumentTimeline &&
        animation.effect?.getTiming().iterations !== Infinity
      )
        animation.finish();
    const run =
      /** @type {{ __suiAudit: () => Promise<{ law: string; where: string; detail: string }[]> }} */ (
        /** @type {unknown} */ (window)
      ).__suiAudit;
    return run();
  });
