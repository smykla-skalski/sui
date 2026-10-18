import { chromium } from 'playwright-core';
import { createServer } from 'vite';

/**
 * Starts the kitchen sink on a free port and a browser for it. A cold server optimizes its
 * dependencies on the first visit and then reloads the page, so one visit happens here, before
 * any test presses anything on a page that is about to reload.
 */
export async function startSink() {
  const server = await createServer({ logLevel: 'error', server: { port: 0 } });
  await server.listen();
  const url = server.resolvedUrls?.local[0] ?? '';
  const browser = await chromium.launch({ channel: process.env.SUI_BROWSER_CHANNEL ?? 'chrome' });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => '__suiAudit' in window, null, { timeout: 120_000 });
  await page.waitForLoadState('networkidle');
  await page.close();
  return { server, browser, url };
}

/**
 * Loads the sink and waits until it has mounted, so its controls answer a press.
 * @param {import('playwright-core').Page} page
 * @param {string} url
 */
export async function visit(page, url) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => '__suiAudit' in window);
}
