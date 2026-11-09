import assert from 'node:assert/strict';
import test from 'node:test';

// The helper only acts where calc-size() is missing, which no Chromium the browser tests run
// lacks, so its browser parts are stood in for here.
/** @type {(entries: unknown[]) => void} */
let report = () => {};
/** @type {(() => void)[]} */
const frames = [];
Object.assign(globalThis, {
  CSS: { supports: () => false },
  ResizeObserver: class {
    /** @param {(entries: unknown[]) => void} callback */
    constructor(callback) {
      report = callback;
    }
    observe() {}
    unobserve() {}
  },
  requestAnimationFrame: (/** @type {() => void} */ frame) => frames.push(frame)
});
const { evenHeight } = await import('../src/lib/internal/even-height.ts');

const resized = (/** @type {{ style: Record<string, string> }} */ target, blockSize = 0) => {
  report([{ target, contentBoxSize: [{ blockSize }] }]);
};
const nextFrame = () => frames.splice(0).forEach((frame) => frame());

test('L-95 an even height gives its padding back once detached, even with a resize queued', () => {
  const copy = { style: { paddingBlockEnd: '' } };
  const detach = evenHeight(/** @type {any} */ (copy));
  resized(copy, 41);
  nextFrame();
  assert.equal(copy.style.paddingBlockEnd, '1px');

  resized(copy, 43);
  detach?.();
  assert.equal(copy.style.paddingBlockEnd, '', 'the detached box kept the padding');
  nextFrame();
  assert.equal(copy.style.paddingBlockEnd, '', 'a resize queued before detaching wrote padding');
});
