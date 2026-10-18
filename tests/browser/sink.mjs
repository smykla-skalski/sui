import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

/**
 * Options for a test that takes long, such as an axe or a picture pass over the whole sink or a
 * sweep that presses every control. It runs only with `SUI_LONG=1` (`npm run test:browser:long`),
 * as in CI, so the everyday run stays quick.
 */
export const long = { skip: process.env.SUI_LONG ? false : 'long: run with SUI_LONG=1' };

const launch = () => chromium.launch({ channel: process.env.SUI_BROWSER_CHANNEL ?? 'chrome' });

/**
 * Starts the kitchen sink on a free port. Without a dependency cache, as in CI, the server
 * optimizes its dependencies on the first visit and then reloads the page, so one visit happens
 * here, before any test presses anything on a page that is about to reload.
 */
export async function serveSink() {
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
 * file run on its own serves its own.
 * @returns {Promise<{ server: { close: () => Promise<void> }; browser: SinkBrowser; url: string }>}
 */
export async function startSink() {
  const shared = process.env.SUI_SINK_URL;
  const own = shared ? null : await serveSink();
  /** @type {Promise<import('playwright-core').Browser> | undefined} */
  let started;
  return {
    server: { close: async () => void (await own?.server.close()) },
    browser: {
      newPage: async (options) => (await (started ??= launch())).newPage(options),
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
 * Runs the page's law audit. The page's own run waits for every finite animation to end; ending
 * them at once gives the same final state seconds sooner.
 * @param {import('playwright-core').Page} page
 * @returns {Promise<{ law: string; where: string; detail: string }[]>}
 */
export const audit = (page) =>
  page.evaluate(async () => {
    for (const animation of document.getAnimations())
      if (animation.effect?.getTiming().iterations !== Infinity) animation.finish();
    const run =
      /** @type {{ __suiAudit: () => Promise<{ law: string; where: string; detail: string }[]> }} */ (
        /** @type {unknown} */ (window)
      ).__suiAudit;
    return run();
  });
