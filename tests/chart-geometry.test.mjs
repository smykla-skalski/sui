import assert from 'node:assert/strict';
import test from 'node:test';
import { extent, position, ticks } from '../src/lib/charts/geometry.ts';

test('empty and non-finite datasets have a usable domain', () => {
  assert.deepEqual(extent([NaN, Infinity, -Infinity]), [0, 1]);
  assert.deepEqual(extent([]), [0, 1]);
});

test('constant datasets get nonzero ranges and zero can be included', () => {
  assert.deepEqual(extent([4, 4]), [3.6, 4.4]);
  assert.deepEqual(extent([4, 8], true), [0, 8]);
  assert.deepEqual(extent([-8, -4], true), [-8, 0]);
});

test('large datasets scale without argument-spread limits', () => {
  const values = Array.from({ length: 200_000 }, (_, index) => index);
  assert.deepEqual(extent(values), [0, 199_999]);
});

test('positions and ticks cover both ends of a domain', () => {
  assert.equal(position(5, [0, 10], 20, 120), 70);
  assert.deepEqual(ticks([0, 8], 3), [0, 4, 8]);
});
