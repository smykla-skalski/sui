import assert from 'node:assert/strict';
import test from 'node:test';

// A list keeps a 24px foot clear of its rows for the scroll fade (L-107).
Object.assign(globalThis, {
  getComputedStyle: () => ({ scrollPaddingBlockStart: '0px', scrollPaddingBlockEnd: '24px' })
});
const { revealRow } = await import('../src/lib/internal/reveal.ts');

/** @param {number} clientHeight */
function list(clientHeight) {
  return { clientHeight, clientTop: 0, offsetTop: 0, scrollTop: 0 };
}

/** @param {object} parent @param {number} offsetTop */
const row = (parent, offsetTop) => ({ offsetParent: parent, offsetTop, offsetHeight: 36 });

test('a row below the view scrolls up to stand clear of the foot', () => {
  const menu = list(200);
  revealRow(/** @type {any} */ (menu), /** @type {any} */ (row(menu, 300)));
  assert.equal(menu.scrollTop, 300 + 36 + 24 - 200);
});

// In a short or zoomed viewport the row and the foot cannot both fit, and showing the row's
// foot hid its start, where its label and icon stand.
test('a row taller than the room above the foot shows its start', () => {
  const menu = list(40);
  revealRow(/** @type {any} */ (menu), /** @type {any} */ (row(menu, 100)));
  assert.equal(menu.scrollTop, 100);
});
