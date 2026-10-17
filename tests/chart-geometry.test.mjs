import assert from 'node:assert/strict';
import test from 'node:test';
import { axis, extent, position } from '../src/lib/charts/geometry.ts';

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

test('positions cover both ends of a domain', () => {
  assert.equal(position(5, [0, 10], 20, 120), 70);
});

test('ticks fall on 1, 2, 2.5 or 5 times a power of ten', () => {
  assert.deepEqual(axis([1, 2, 3, 4]).ticks, [1, 2, 3, 4]);
  assert.deepEqual(axis([12, 34], true).ticks, [0, 10, 20, 30, 40]);
  assert.deepEqual(axis([0, 0.9]).ticks, [0, 0.25, 0.5, 0.75, 1]);
  assert.deepEqual(axis([0.6, 1.4]).ticks, [0.6, 0.8, 1, 1.2, 1.4]);
  assert.deepEqual(axis([-8, -4], true).ticks, [-8, -6, -4, -2, 0]);
});

test('whole-number data gets whole-number ticks', () => {
  // 0 to 9 would step by 2.5 if the values were fractional.
  assert.deepEqual(axis([0, 9]).ticks, [0, 5, 10]);
  assert.deepEqual(axis([0, 9.5]).ticks, [0, 2.5, 5, 7.5, 10]);
  for (const values of [
    [1, 2, 3, 4, 5, 6, 7, 8],
    [3, 7],
    [0, 1],
    [120, 4_870]
  ])
    assert.ok(axis(values).ticks.every(Number.isInteger), `${values}`);
});

test('ticks are evenly spaced and the domain covers every value', () => {
  for (const values of [
    [1, 8],
    [0.6, 1.4],
    [12, 29, 48],
    [-3.2, 17.9],
    [0.001, 0.0042]
  ]) {
    const { domain, ticks } = axis(values);
    const step = ticks[1] - ticks[0];
    for (let index = 1; index < ticks.length; index++)
      assert.ok(Math.abs(ticks[index] - ticks[index - 1] - step) < step * 1e-9, `${values}`);
    assert.deepEqual(domain, [ticks[0], ticks.at(-1)]);
    assert.ok(domain[0] <= Math.min(...values) && domain[1] >= Math.max(...values), `${values}`);
  }
});

test('a single value still gets a readable range', () => {
  assert.deepEqual(axis([4]).ticks, [3, 4, 5]);
  assert.deepEqual(axis([4], true).ticks, [0, 1, 2, 3, 4]);
  assert.deepEqual(axis([]).ticks, [0, 1]);
});
