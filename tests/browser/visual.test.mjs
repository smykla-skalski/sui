import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

// Visual regression: each kitchen-sink section, drawn in both themes, must match the picture
// recorded for this platform. Fonts rasterize differently per operating system, so pictures are
// kept per platform, and a platform with none recorded skips rather than passing unseen.
// Record or refresh them with `SUI_VISUAL_UPDATE=1 node --test tests/browser/visual.test.mjs`
// after a change that is meant to look different, and review the new pictures in the diff.

// The same page drawn twice differs in a few anti-aliased pixels at glyph and curve edges, by
// a few levels. A pixel counts as changed only past that noise, and a section only when more
// pixels change than such noise reaches; a moved edge or a new colour changes far more.
const NOISE_LEVEL = 26;
const NOISE_PIXELS = 64;

/**
 * Counts the pixels that differ past the noise, decoding both pictures in the page, or -1 when
 * their sizes differ.
 * @param {import('playwright-core').Page} page
 * @param {Buffer} seen
 * @param {Buffer} recorded
 */
const changedPixels = (page, seen, recorded) =>
  page.evaluate(
    async ([one, two, level]) => {
      const decode = async (/** @type {string} */ data) => {
        const picture = await createImageBitmap(
          await (await fetch(`data:image/png;base64,${data}`)).blob()
        );
        const canvas = new OffscreenCanvas(picture.width, picture.height);
        const context = /** @type {OffscreenCanvasRenderingContext2D} */ (canvas.getContext('2d'));
        context.drawImage(picture, 0, 0);
        return context.getImageData(0, 0, picture.width, picture.height);
      };
      const [a, b] = await Promise.all([decode(String(one)), decode(String(two))]);
      if (a.width !== b.width || a.height !== b.height) return -1;
      let changed = 0;
      for (let index = 0; index < a.data.length; index += 4)
        for (let channel = 0; channel < 4; channel++)
          if (Math.abs(a.data[index + channel] - b.data[index + channel]) > Number(level)) {
            changed++;
            break;
          }
      return changed;
    },
    [seen.toString('base64'), recorded.toString('base64'), NOISE_LEVEL]
  );

const UPDATE = process.env.SUI_VISUAL_UPDATE === '1';
const BASELINES = join(import.meta.dirname, 'visual', process.platform);

/** @type {import('vite').ViteDevServer} */
let server;
/** @type {import('playwright-core').Browser} */
let browser;
let url = '';

before(async () => {
  server = await createServer({ logLevel: 'error', server: { port: 0 } });
  await server.listen();
  url = server.resolvedUrls?.local[0] ?? '';
  browser = await chromium.launch({ channel: process.env.SUI_BROWSER_CHANNEL ?? 'chrome' });
});

after(async () => {
  await browser?.close();
  await server?.close();
});

for (const theme of ['light', 'dark'])
  test(`every section looks as recorded in ${theme}`, async (t) => {
    if (!UPDATE && !existsSync(BASELINES)) {
      t.skip(`no pictures are recorded for ${process.platform}`);
      return;
    }
    mkdirSync(BASELINES, { recursive: true });
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce'
    });
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.evaluate(async (name) => {
        document.documentElement.dataset.suiTheme = name;
        await document.fonts.ready;
      }, theme);
      // Time-relative words and live pulses would differ between runs.
      await page.addStyleTag({
        content:
          '*, *::before, *::after { animation: none !important; caret-color: transparent !important; } time { visibility: hidden !important; }'
      });
      const ids = await page
        .locator('main > section[id]')
        .evaluateAll((sections) => sections.map((section) => section.id));
      assert.ok(ids.length > 40, `only ${ids.length} sections were found`);
      const changed = [];
      const missing = [];
      for (const id of ids) {
        const section = page.locator(`main > section#${id}`);
        await section.scrollIntoViewIfNeeded();
        const picture = await section.screenshot({ animations: 'disabled' });
        const file = join(BASELINES, `${id}-${theme}.png`);
        if (UPDATE) writeFileSync(file, picture);
        else if (!existsSync(file)) missing.push(id);
        else {
          const pixels = await changedPixels(page, picture, readFileSync(file));
          if (pixels === -1 || pixels > NOISE_PIXELS) {
            const seen = join(tmpdir(), `sui-visual-${id}-${theme}.png`);
            writeFileSync(seen, picture);
            changed.push(
              `${id}: ${pixels === -1 ? 'a new size' : `${pixels} pixels`} (now in ${seen})`
            );
          }
        }
      }
      assert.deepEqual(missing, [], 'sections with no recorded picture');
      assert.deepEqual(changed, [], 'sections that look different from their recorded picture');
    } finally {
      await page.close();
    }
  });
