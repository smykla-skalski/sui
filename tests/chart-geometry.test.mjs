import assert from 'node:assert/strict';
import test from 'node:test';
import {
  axis,
  chartDash,
  chartMarker,
  extent,
  markerPath,
  position,
  sieve,
  spread
} from '../src/lib/charts/geometry.ts';

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

test('the five series differ by shape, and every line after the first by dash', () => {
  const series = [0, 1, 2, 3, 4];
  assert.equal(new Set(series.map(chartMarker)).size, 5);
  assert.equal(chartDash(0), undefined);
  const dashes = series.slice(1).map(chartDash);
  assert.ok(dashes.every(Boolean));
  assert.equal(new Set(dashes).size, 4);
});

test('every marker shape spans at least its size both ways', () => {
  for (const shape of [0, 1, 2, 3, 4].map(chartMarker)) {
    const numbers = markerPath(shape, 0, 0, 8)
      .split(/[^\d.-]+/)
      .filter(Boolean)
      .map(Number);
    // Arcs carry radii and flags between their end points, so a circle is read by its ends.
    const pairs =
      shape === 'circle'
        ? [numbers.slice(0, 2), numbers.slice(7, 9)]
        : Array.from({ length: numbers.length / 2 }, (_, at) => numbers.slice(2 * at, 2 * at + 2));
    const xs = pairs.map(([px]) => px);
    const ys = pairs.map(([, py]) => py);
    assert.ok(Math.max(...xs) - Math.min(...xs) >= 8, `${shape} is narrower than 8`);
    if (shape !== 'circle')
      assert.ok(Math.max(...ys) - Math.min(...ys) >= 8, `${shape} is shorter than 8`);
  }
});

test('line names keep their order and never stand closer than the gap', () => {
  const placed = spread([100, 104, 60, 102], 16, 20, 254);
  const order = [2, 0, 3, 1];
  for (let at = 1; at < order.length; at++)
    assert.ok(placed[order[at]] - placed[order[at - 1]] >= 16 - 1e-9);
  assert.deepEqual(spread([40, 120, 200], 16, 20, 254), [40, 120, 200]);
});

test('line names stay inside the plot when they crowd an edge', () => {
  const placed = spread([250, 252, 254], 16, 20, 254);
  assert.ok(Math.max(...placed) <= 254 && Math.min(...placed) >= 20);
  assert.deepEqual(spread([0], 16, 20, 254), [20]);
});

test('a dense scatter keeps one mark per cell, in order, however many points arrive', () => {
  const at = (/** @type {[number, number]} */ point) => point;
  const cloud = Array.from(
    { length: 50_000 },
    (_, index) => /** @type {[number, number]} */ ([index % 100, Math.floor(index / 100) % 50])
  );
  const kept = sieve(cloud, at, 5);
  assert.equal(kept.length, 20 * 10);
  assert.deepEqual(kept[0], [0, 0]);
  assert.deepEqual(
    sieve(
      [
        [0, 0],
        [12, 0],
        [3, 4]
      ],
      at,
      5
    ),
    [
      [0, 0],
      [12, 0]
    ]
  );
});
