import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

// The lists, pickers and settings behaviours that need a real keyboard, pointer and focus:
// where focus goes when a control leaves, what a reader can take back, and what is said.

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

/** @param {import('playwright-core').BrowserContextOptions} [options] */
async function open(options = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, ...options });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  return page;
}

/** @param {import('playwright-core').Page} page */
const focused = (page) =>
  page.evaluate(() => {
    const element = document.activeElement;
    return element === document.body
      ? 'body'
      : `${element?.tagName.toLowerCase()} ${element?.getAttribute('aria-label') ?? element?.textContent?.trim() ?? ''} ${element instanceof HTMLInputElement ? element.value : ''}`.trim();
  });

test('L-89 the save bar hands focus on through discard, undo and a landed save', async () => {
  const page = await open();
  try {
    const section = page.locator('#save-bar');
    const field = section.getByLabel('Repository name').first();
    const bar = section.locator('.sui-save-bar').first();
    await field.scrollIntoViewIfNeeded();
    await field.focus();

    await bar.getByRole('button', { name: 'Discard' }).click();
    assert.match(await focused(page), /^button Undo/, 'focus did not move to Undo');
    assert.match(await bar.innerText(), /discarded/);

    await page.keyboard.press('Enter');
    assert.equal(await field.inputValue(), 'smyklot-panel', 'Undo did not bring the draft back');
    assert.match(
      await focused(page),
      /^input .*smyklot-panel/,
      'focus did not return to the field'
    );

    // The shortcut saves from the field, and a landed save leaves focus where the reader is.
    await page.keyboard.press('ControlOrMeta+s');
    await bar.getByText('Your changes are saved').waitFor({ timeout: 4000 });
    assert.match(await focused(page), /^input /);

    await field.fill('smyklot-next');
    await bar.getByRole('button', { name: 'Save' }).click();
    await bar.getByText('Your changes are saved').waitFor({ timeout: 4000 });
    assert.match(await focused(page), /^input .*smyklot-next/, 'focus fell when Save went away');
  } finally {
    await page.close();
  }
});

test('L-50 a dragged thumb in a right-to-left page chooses the option under the pointer', async () => {
  const page = await open();
  try {
    await page.evaluate(() => (document.documentElement.dir = 'rtl'));
    const track = page.locator('#segmented-control fieldset.sui-segmented-track').first();
    await track.scrollIntoViewIfNeeded();
    const options = track.locator('label');
    const from = await options.nth(1).boundingBox();
    const to = await options.nth(2).boundingBox();
    assert.ok(from && to && to.x < from.x, 'the options did not run right to left');
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
    await page.mouse.up();
    assert.equal(
      await track.evaluate((node) => node.querySelector('input:checked')?.getAttribute('value')),
      await options.nth(2).locator('input').getAttribute('value')
    );
  } finally {
    await page.close();
  }
});

test('L-89 focus follows a segmented control into its select when the room runs out', async () => {
  const page = await open();
  try {
    const control = page.locator('#segmented-control .sui-segmented').first();
    await control.scrollIntoViewIfNeeded();
    await control.locator('input:checked').focus();
    await control.evaluate((node) => {
      if (node.parentElement) node.parentElement.style.inlineSize = '4rem';
    });
    await page.waitForFunction(
      (node) => node?.querySelector('select') !== null,
      await control.elementHandle()
    );
    await page.waitForTimeout(50);
    assert.match(await focused(page), /^select/);
  } finally {
    await page.close();
  }
});

test('P7 a two-way theme switch keeps the shown theme when it is pressed', async () => {
  const page = await open({ colorScheme: 'dark' });
  try {
    const dark = page
      .locator('#theme-switch fieldset')
      .filter({ has: page.locator('input[name="sink-theme-two"]') })
      .locator('label', { hasText: 'Dark' });
    await dark.scrollIntoViewIfNeeded();
    await dark.click();
    assert.equal(await page.evaluate(() => localStorage.getItem('sui:theme')), 'dark');
  } finally {
    await page.close();
  }
});

test('L-52 Tab out of the tools menu closes it', async () => {
  const page = await open();
  try {
    const trigger = page.locator('#list-toolbar').getByRole('button', { name: 'Sort and filter' });
    await trigger.first().scrollIntoViewIfNeeded();
    await trigger.first().click();
    await page.locator(':popover-open .sui-list-toolbar-panel').waitFor();
    await page.keyboard.press('Tab');
    await page.waitForTimeout(250);
    assert.equal(await page.locator(':popover-open .sui-list-toolbar-panel').count(), 0);
  } finally {
    await page.close();
  }
});

test('P8 and P9 a pattern is judged once left, and an emptied one comes back with Undo', async () => {
  const page = await open();
  try {
    const list = page.locator('#pattern-entries .sui-pattern-entries').first();
    await list.scrollIntoViewIfNeeded();
    const problems = () => list.locator('.sui-pattern-problem').count();
    const before = await problems();

    await list.getByRole('button', { name: 'Add a branch pattern' }).click();
    await page.keyboard.type('a b');
    assert.equal(await problems(), before, 'a half-typed pattern was judged at once');
    await page.keyboard.press('Tab');
    assert.equal(await problems(), before + 1, 'a left pattern was not judged');

    const second = list.getByRole('textbox', { name: 'Pattern 2' });
    await second.fill('');
    await second.blur();
    assert.equal(await list.getByRole('textbox').count(), 4, 'the emptied entry stayed');
    await list.getByRole('button', { name: 'Undo' }).click();
    assert.equal(await list.getByRole('textbox', { name: 'Pattern 2' }).inputValue(), 'main');
    assert.match(await focused(page), /^input Pattern 2 main/);
  } finally {
    await page.close();
  }
});

test('U5 typing in the addition menu jumps to the choice that starts with it', async () => {
  const page = await open();
  try {
    const trigger = page.locator('#addition-picker').getByRole('button', {
      name: 'Override another'
    });
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    await page.locator(':popover-open [role="menu"]').waitFor();
    await page.keyboard.press('s');
    assert.match(await focused(page), /^button Skip draft/);
  } finally {
    await page.close();
  }
});

test('P9 a setting row offers Undo after a reset, and Undo hands focus to the reset', async () => {
  const page = await open();
  try {
    const row = page.locator('#setting-list .sui-setting-row').first();
    await row.scrollIntoViewIfNeeded();
    await row.getByRole('button', { name: /^Reset / }).click();
    assert.equal(await row.getAttribute('data-unsaved'), null);
    await row.getByRole('button', { name: /^Undo/ }).click();
    assert.notEqual(
      await row.getAttribute('data-unsaved'),
      null,
      'Undo did not put the change back'
    );
    assert.match(await focused(page), /^button Reset /);
  } finally {
    await page.close();
  }
});

test('AC12 a removed chip and a removed pair are announced', async () => {
  const page = await open();
  try {
    const said = () =>
      page.evaluate(() =>
        [...document.querySelectorAll('[role="status"]')].map((node) => node.textContent?.trim())
      );
    const chip = page.locator('#chip').getByRole('button', { name: 'Remove topology/zone' });
    await chip.scrollIntoViewIfNeeded();
    await chip.click();
    await page.waitForTimeout(200);
    assert.ok((await said()).includes('Removed topology/zone'), 'the chip removal was not said');

    const pair = page.locator('#pair-entry').getByRole('button', { name: 'Remove ship' }).first();
    await pair.click();
    assert.ok((await said()).includes('Removed ship'), 'the pair removal was not said');
  } finally {
    await page.close();
  }
});

test('U5 a sortable heading sorts the rows and says so with aria-sort', async () => {
  const page = await open();
  try {
    const table = page.locator('#data-table table').first();
    await table.scrollIntoViewIfNeeded();
    await table.getByRole('button', { name: 'Repository' }).click();
    assert.equal(
      await table.locator('th[aria-sort]').evaluate((node) => node.textContent?.trim()),
      'Repository'
    );
    assert.equal(await table.locator('th[aria-sort]').getAttribute('aria-sort'), 'ascending');
    assert.equal(await table.locator('tbody th').first().textContent(), 'ledger');
  } finally {
    await page.close();
  }
});
