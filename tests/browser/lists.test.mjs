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
  // Space on the shown option fires no click, and is a choice all the same.
  const keyboard = await open({ colorScheme: 'dark' });
  try {
    const radio = keyboard.locator('input[name="sink-theme-two"][value="dark"]');
    await radio.scrollIntoViewIfNeeded();
    await radio.focus();
    await keyboard.keyboard.press('Space');
    assert.equal(await keyboard.evaluate(() => localStorage.getItem('sui:theme')), 'dark');
  } finally {
    await keyboard.close();
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

    // Opened by a press, Shift+Tab hands focus back to the button, and that is leaving too.
    await trigger.first().click();
    await page.locator(':popover-open .sui-list-toolbar-panel').waitFor();
    await page.keyboard.press('Shift+Tab');
    await page.waitForTimeout(250);
    assert.equal(
      await page.locator(':popover-open .sui-list-toolbar-panel').count(),
      0,
      'Shift+Tab left the menu open'
    );
  } finally {
    await page.close();
  }
});

test('the tools menu marks its chosen option across the whole option once it has grown', async () => {
  const page = await open();
  try {
    const trigger = page.locator('#list-toolbar').getByRole('button', { name: 'Sort and filter' });
    await trigger.first().scrollIntoViewIfNeeded();
    await trigger.first().click();
    const panel = page.locator(':popover-open .sui-list-toolbar-panel');
    await panel.waitFor();
    await page.waitForTimeout(600);
    const marks = await panel.evaluate((element) =>
      [...element.querySelectorAll('.sui-segmented-track:has(input:checked)')].map((track) => {
        const option = track.querySelector('input:checked')?.closest('label');
        const thumb = track.querySelector('.sui-segmented-thumb');
        return [option?.getBoundingClientRect().width, thumb?.getBoundingClientRect().width];
      })
    );
    assert.ok(marks.length > 0, 'the menu holds no segmented choice');
    for (const [option, thumb] of marks)
      assert.ok(Math.abs(Number(option) - Number(thumb)) <= 0.5, `${thumb}px marks ${option}px`);
  } finally {
    await page.close();
  }
});

test('AC4 a toolbar says its count again after a pick that leaves the count as it was', async () => {
  const page = await open();
  try {
    const bar = page.locator('#list-toolbar .sui-list-toolbar').filter({
      has: page.getByRole('searchbox', { name: 'Search repositories' })
    });
    const counted = bar.last();
    await counted.scrollIntoViewIfNeeded();
    await counted.getByRole('searchbox').fill('sui');
    await page.waitForTimeout(800);
    const status = counted.locator('[role="status"]');
    assert.equal((await status.textContent())?.trim(), '1 result');
    await status.evaluate((element) => {
      const said = /** @type {string[]} */ ([]);
      Object.assign(window, { said });
      new MutationObserver(() => said.push(element.textContent?.trim() ?? '')).observe(element, {
        childList: true,
        subtree: true
      });
    });
    await counted.locator('label', { hasText: 'Active' }).first().click();
    await page.waitForTimeout(800);
    const said = await page.evaluate(
      () => /** @type {{ said: string[] }} */ (/** @type {unknown} */ (window)).said
    );
    assert.ok(said.includes('1 result'), `after the pick the status said ${JSON.stringify(said)}`);
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

test('K6 a retried error that leaves no control keeps focus where it stood', async () => {
  const page = await open();
  try {
    const retry = page
      .locator('#states .specimen', { hasText: 'Usage could not be loaded' })
      .getByRole('button', { name: 'Try again' });
    await retry.scrollIntoViewIfNeeded();
    await retry.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    const at = await page.evaluate(() => ({
      body: document.activeElement === document.body,
      words: document.activeElement?.textContent?.trim()
    }));
    assert.equal(at.body, false, 'focus fell to the page');
    assert.match(at.words ?? '', /Usage for this month loaded/);
  } finally {
    await page.close();
  }
});

test('P8 a pair editor left by a press outside or Tab keeps the draft, and Escape drops it', async () => {
  const page = await open();
  try {
    const add = page.locator('#pair-entry').getByRole('button', { name: 'Add an alias' }).first();
    await add.scrollIntoViewIfNeeded();
    const editor = page.locator(':popover-open .sui-pair-editor');
    const key = editor.getByRole('textbox', { name: 'Alias' });

    await add.click();
    await key.fill('stage');
    await page.mouse.click(5, 5);
    await editor.waitFor({ state: 'detached' });
    await add.click();
    await editor.waitFor();
    await page.waitForTimeout(100);
    assert.equal(await key.inputValue(), 'stage', 'a press outside dropped the draft');

    // Tab past the last control of the editor leaves it, and that closes it.
    for (let step = 0; step < 6 && (await editor.count()) > 0; step++)
      await page.keyboard.press('Tab');
    await page.waitForTimeout(250);
    assert.equal(await editor.count(), 0, 'Tab out left the editor open');

    await add.click();
    await editor.waitFor();
    await page.waitForTimeout(100);
    assert.equal(await key.inputValue(), 'stage', 'Tab out dropped the draft');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    await add.click();
    await editor.waitFor();
    await page.waitForTimeout(100);
    assert.equal(await key.inputValue(), '', 'Escape kept the draft');
  } finally {
    await page.close();
  }
});

test('P8 typing a duplicate into one pattern leaves the others unjudged until it is left', async () => {
  const page = await open();
  try {
    const list = page.locator('#pattern-entries .sui-pattern-entries').first();
    await list.scrollIntoViewIfNeeded();
    const first = list.getByRole('textbox', { name: 'Pattern 1' });
    const second = await list.getByRole('textbox', { name: 'Pattern 2' }).inputValue();
    const before = await list.locator('.sui-pattern-problem').count();
    await first.click();
    await first.fill(second);
    assert.equal(
      await list.locator('.sui-pattern-problem').count(),
      before,
      'another entry was judged against a half-typed one'
    );
  } finally {
    await page.close();
  }
});

test('S2 a setting list says when it loads, fails or has nothing to set', async () => {
  const page = await open();
  try {
    const states = page.locator('#setting-list .example', { hasText: 'List states' });
    await states.scrollIntoViewIfNeeded();
    const specimen = (/** @type {string} */ name) =>
      states.locator('.specimen').filter({ hasText: name });
    assert.equal(await specimen('Loading').locator('[aria-busy="true"]').count(), 1);
    assert.equal(await specimen('Failed').getByRole('alert').count(), 1);
    assert.equal(await specimen('Failed').getByRole('button', { name: 'Try again' }).count(), 1);
    assert.match(
      (await specimen('Nothing to set').textContent()) ?? '',
      /Settings show here once there are any/
    );
  } finally {
    await page.close();
  }
});
