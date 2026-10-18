import assert from 'node:assert/strict';
import test from 'node:test';
import {
  axis,
  chartDash,
  chartMarker,
  extent,
  heatmapLayout,
  inkSpan,
  markerPath,
  markerReach,
  plotEnd,
  position,
  rangeLayout,
  sieve,
  spread,
  ticksOf,
  xyLayout
} from '../src/lib/charts/geometry.ts';

/**
 * A stand-in for canvas metrics: fixed-width glyphs whose ink sits half a pixel inside their
 * advance, capitals 8px tall and descenders 2px deep, wider in the semibold face.
 * @param {string} text
 * @param {boolean} [semibold]
 */
const measure = (text, semibold = false) => {
  const advance = text.length * (semibold ? 6.5 : 6);
  return {
    advance,
    left: -0.5,
    right: advance - 0.5,
    ascent: 8,
    descent: /[gjpqy]/.test(text) ? 2 : 0
  };
};

/** The extent of a list of `[start, end]` spans. */
const union = (/** @type {number[][]} */ spans) => [
  Math.min(...spans.map(([start]) => start)),
  Math.max(...spans.map(([, end]) => end))
];

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

test('the plot end puts the furthest ink exactly on the width', () => {
  const end = plotEnd(40, 400, [
    { at: 1, past: 0 },
    { at: 1, past: 9 },
    { at: 0.5, past: 200 }
  ]);
  // Each reach ends at start + at * (end - start) + past; the furthest of them is the width.
  const reaches = [40 + (end - 40) + 9, 40 + 0.5 * (end - 40) + 200, end];
  assert.ok(Math.abs(Math.max(...reaches) - 400) < 1e-9);
});

test('a marker reaches as far as its drawn path', () => {
  for (const shape of [0, 1, 2, 3, 4].map(chartMarker)) {
    const numbers = markerPath(shape, 0, 0, 10)
      .split(/[^\d.-]+/)
      .filter(Boolean)
      .map(Number);
    const pairs =
      shape === 'circle'
        ? [
            [-5, 0],
            [5, 0],
            [0, -5],
            [0, 5]
          ]
        : Array.from({ length: numbers.length / 2 }, (_, at) => numbers.slice(2 * at, 2 * at + 2));
    const reach = markerReach(shape, 10);
    assert.ok(Math.abs(Math.max(...pairs.map(([x]) => x)) - reach.across) < 1e-9, shape);
    assert.ok(Math.abs(-Math.min(...pairs.map(([, y]) => y)) - reach.above) < 1e-9, shape);
    assert.ok(Math.abs(Math.max(...pairs.map(([, y]) => y)) - reach.below) < 1e-9, shape);
  }
});

test('a line or scatter starts and ends exactly at the edges of its room', () => {
  const yAxis = axis([3, 88], true);
  const xAxis = axis([1, 12]);
  for (const [width, names] of /** @type {const} */ ([
    [640, []],
    [640, ['North', 'Southwest region']],
    [300, ['Long name for a line']]
  ])) {
    const xTicks = ticksOf(xAxis.ticks, xAxis.domain, String);
    const yTicks = ticksOf(yAxis.ticks, yAxis.domain, String);
    const marks = [{ x: 1, y: 1, across: 5, above: 5, below: 5 }];
    const ends = names.map((text, index) => ({ x: 1, y: index / 4, text }));
    const box = xyLayout({
      width,
      scale: 1,
      measure,
      xTicks,
      yTicks,
      xLabel: 'Week',
      yLabel: 'Requests',
      marks,
      names: ends
    });
    const x = (/** @type {number} */ at) => box.left + at * (box.right - box.left);
    const y = (/** @type {number} */ at) => box.bottom - at * (box.bottom - box.top);
    const title = measure('Requests', true);
    const across = union([
      [box.yTitle.x - title.ascent, box.yTitle.x + title.descent],
      ...yTicks.map((tick) => inkSpan(measure(tick.text), box.tickEnd, 'end')),
      ...xTicks.map((tick) => inkSpan(measure(tick.text), x(tick.at), 'middle')),
      ...marks.map((mark) => [x(mark.x) - mark.across, x(mark.x) + mark.across]),
      ...ends.map((end) => inkSpan(measure(end.text, true), x(end.x) + box.nameGap)),
      [box.left, box.right]
    ]);
    assert.ok(Math.abs(across[0]) < 1e-9, `${width}: the ink starts at ${across[0]}`);
    assert.ok(Math.abs(across[1] - width) < 1e-9, `${width}: the ink ends at ${across[1]}`);
    const down = union([
      [box.top - 0.5, box.bottom + 0.5],
      ...yTicks.map((tick) => [y(tick.at) - 4, y(tick.at) + 4]),
      ...marks.map((mark) => [y(mark.y) - mark.above, y(mark.y) + mark.below]),
      ...box.names.map((baseline) => [baseline - 8, baseline]),
      [box.xTitleBaseline - 8, box.xTitleBaseline]
    ]);
    assert.ok(Math.abs(down[0]) < 1e-9, `${width}: the ink tops out at ${down[0]}`);
    assert.ok(box.height - down[1] >= 0 && box.height - down[1] < 1, `${width}: height`);
    assert.ok(
      box.xTickBaseline - 8 >= box.bottom + 4 + 8 - 1e-9,
      'x ticks clear the lowest y tick'
    );
  }
});

test('a range chart starts at its longest label and ends at its furthest ink', () => {
  const values = axis([12, 48]);
  const ticks = ticksOf(values.ticks, values.domain, String);
  const labels = ['Planning', 'Design', 'Build and release'];
  const marks = [
    { at: (48 - values.domain[0]) / (values.domain[1] - values.domain[0]), past: 5 },
    { at: 0.5, past: 6.5 }
  ];
  const box = rangeLayout({
    width: 500,
    scale: 1,
    measure,
    labels,
    ticks,
    valueLabel: 'Hours',
    marks
  });
  const x = (/** @type {number} */ at) => box.left + at * (box.right - box.left);
  const across = union([
    ...labels.map((label) => inkSpan(measure(label), box.labelEnd, 'end')),
    ...ticks.map((tick) => inkSpan(measure(tick.text), x(tick.at), 'middle')),
    ...marks.map((mark) => [x(mark.at) - mark.past, x(mark.at) + mark.past]),
    [box.left - 0.5, box.right + 0.5]
  ]);
  assert.ok(Math.abs(across[0]) < 1e-9, `the ink starts at ${across[0]}`);
  assert.ok(Math.abs(across[1] - 500) < 1e-9, `the ink ends at ${across[1]}`);
  assert.ok(box.height - (box.titleBaseline + 0) < 1, 'the axis title ends the height');
});

test('a matrix starts at its longest row name and its column names top it', () => {
  const rows = ['Morning', 'Afternoon'];
  const columns = ['Mon', 'Tue', 'Wed'];
  const box = heatmapLayout({ scale: 1, measure, rows, columns });
  const starts = rows.map((row) => inkSpan(measure(row), box.labelEnd, 'end')[0]);
  assert.ok(Math.abs(Math.min(...starts)) < 1e-9);
  assert.equal(box.columnBaseline - 8, 0);
  const last = box.left + columns.length * box.size - box.inset;
  assert.ok(box.width - last >= 0 && box.width - last < 1);
  assert.ok(box.height - (box.top + rows.length * box.size - box.inset) < 1);
});
