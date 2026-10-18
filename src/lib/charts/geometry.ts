import type { ChartPoint } from './types.js';

/** The least plot width before a line or scatter scrolls, at a 16px root. */
export const xyMinWidth = 280;

/** The grid's height in a line or scatter, in CSS pixels. */
const XY_GRID = 234;

/**
 * Where a run of text puts ink, as canvas `measureText` reports it: its advance, how far the
 * ink reaches before its start point (`left`) and past it (`right`), and above (`ascent`) and
 * below (`descent`) its baseline.
 */
export type Ink = { advance: number; left: number; right: number; ascent: number; descent: number };

/** Measures chart text at the plot's own size, in the regular or the semibold face. */
export type Measure = (text: string, semibold?: boolean) => Ink;

/** An even guess at the ink of `size`px text, for a server render, which has no font to measure. */
export function guessInk(size: number): Measure {
  return (text) => {
    const advance = text.length * size * 0.56;
    return { advance, left: 0, right: advance, ascent: size * 0.72, descent: 0 };
  };
}

/** The inline extent of the ink of text drawn at `x` with SVG `text-anchor` `anchor`. */
export function inkSpan(
  ink: Ink,
  x: number,
  anchor: 'start' | 'middle' | 'end' = 'start'
): [number, number] {
  const start = x - (anchor === 'end' ? ink.advance : anchor === 'middle' ? ink.advance / 2 : 0);
  return [start - ink.left, start + ink.right];
}

/** The baseline that centres the ink of text on `y`. */
export function centred(ink: Ink, y: number): number {
  return y + (ink.ascent - ink.descent) / 2;
}

/**
 * Something drawn at a fraction `at` of the plot's width, 0 at its start and 1 at its end,
 * whose ink reaches `past` beyond that point towards the end.
 */
export type Reach = { at: number; past: number };

/**
 * The plot's end that puts the furthest ink exactly on `width`. Each reach ends at
 * `start + at * (end - start) + past`, which grows with `end`, so the tightest one sets it.
 */
export function plotEnd(start: number, width: number, reaches: Reach[]): number {
  let end = width;
  for (const { at, past } of reaches)
    if (at > 0) end = Math.min(end, start + (width - start - past) / at);
  return end;
}

/** A tick's place as a fraction of its axis, and its words. */
export type Tick = { at: number; text: string };

/**
 * A mark's place as fractions of the plot, `x` from its start and `y` from its bottom, and how
 * far its ink reaches from there across, above and below.
 */
export type MarkReach = { x: number; y: number; across: number; above: number; below: number };

/** Ticks of `values` laid out along their domain. */
export function ticksOf(
  values: number[],
  domain: [number, number],
  format: (value: number) => string
): Tick[] {
  return values.map((value) => ({
    at: (value - domain[0]) / (domain[1] - domain[0]),
    text: format(value)
  }));
}

const most = (values: number[]) => Math.max(0, ...values);

/** The highest ink top and the lowest ink bottom of a row of text on one baseline. */
const lineInk = (inks: Ink[]) => ({
  ascent: most(inks.map((ink) => ink.ascent)),
  descent: most(inks.map((ink) => ink.descent))
});

export type XYLayout = {
  width: number;
  height: number;
  /** The plot's edges: the first and the last x tick, the top and the bottom y tick. */
  left: number;
  right: number;
  top: number;
  bottom: number;
  /** Where the y tick labels end, left of the plot. */
  tickEnd: number;
  /** The rotated y title's baseline and its centre along the plot. */
  yTitle: { x: number; y: number };
  xTickBaseline: number;
  xTitleBaseline: number;
  /** Each line name's baseline, and how far right of its line's last point it starts. */
  names: number[];
  nameGap: number;
};

/**
 * A line or scatter laid out to its ink: the y title's ink starts at 0, the furthest of the x
 * ticks, the marks and the line names ends at `width`, the highest ink sits at 0 and the
 * lowest at the height. The plot takes whatever room the words leave, so the chart starts and
 * ends exactly at the edges of the room it has. Gaps grow with the reader's text `scale`.
 */
export function xyLayout(input: {
  width: number;
  scale: number;
  measure: Measure;
  xTicks: Tick[];
  yTicks: Tick[];
  xLabel: string;
  yLabel: string;
  marks: MarkReach[];
  names: { x: number; y: number; text: string }[];
}): XYLayout {
  const { width, scale, measure, xTicks, yTicks, marks } = input;
  const tickGap = 8 * scale;
  const titleGap = 12 * scale;
  const nameGap = 12 * scale;
  const xInk = xTicks.map((tick) => measure(tick.text));
  const yInk = yTicks.map((tick) => measure(tick.text));
  const nameInk = input.names.map((name) => measure(name.text, true));
  const yTitle = input.yLabel ? measure(input.yLabel, true) : null;
  const xTitle = input.xLabel ? measure(input.xLabel, true) : null;
  const cap = measure('H', true).ascent;

  // Turned a quarter left, the y title's ascent points to the start, so it reaches 0 there.
  const titleX = yTitle?.ascent ?? 0;
  const titleEnd = yTitle ? yTitle.ascent + yTitle.descent + titleGap : 0;
  const left = Math.max(
    titleEnd + tickGap + most(yInk.map((ink) => ink.advance + ink.left)),
    ...xInk
      .filter((_, index) => xTicks[index].at === 0)
      .map((ink) => -inkSpan(ink, 0, 'middle')[0]),
    ...marks.filter((mark) => mark.x === 0).map((mark) => mark.across)
  );
  const right = plotEnd(left, width, [
    { at: 1, past: 0 },
    ...xInk.map((ink, index) => ({ at: xTicks[index].at, past: inkSpan(ink, 0, 'middle')[1] })),
    ...marks.map((mark) => ({ at: mark.x, past: mark.across })),
    ...nameInk.map((ink, index) => ({ at: input.names[index].x, past: nameGap + ink.right }))
  ]);

  // Down the plot, laid out from a top of 0 and then moved so the highest ink lands on 0.
  const grid = XY_GRID;
  const yAt = (at: number) => grid - at * grid;
  const tops = [-0.5];
  const bottoms = [grid + 0.5];
  yInk.forEach((ink, index) => {
    const baseline = centred(ink, yAt(yTicks[index].at));
    tops.push(baseline - ink.ascent);
    bottoms.push(baseline + ink.descent);
  });
  for (const mark of marks) {
    tops.push(yAt(mark.y) - mark.above);
    bottoms.push(yAt(mark.y) + mark.below);
  }
  const names = spread(
    input.names.map((name) => yAt(name.y)),
    16 * scale,
    0,
    grid
  ).map((centre) => centre + cap / 2);
  names.forEach((baseline, index) => {
    tops.push(baseline - nameInk[index].ascent);
    bottoms.push(baseline + nameInk[index].descent);
  });
  // The x ticks stand a tick gap under everything the plot draws, the lowest y tick included.
  const ticks = lineInk(xInk);
  const xTickBaseline = Math.max(...bottoms) + tickGap + ticks.ascent;
  if (yTitle) {
    tops.push(grid / 2 + yTitle.advance / 2 - yTitle.right);
    bottoms.push(grid / 2 + yTitle.advance / 2 + yTitle.left);
  }
  let foot = xTickBaseline + ticks.descent;
  const xTitleBaseline = foot + titleGap + (xTitle?.ascent ?? 0);
  if (xTitle) foot = xTitleBaseline + xTitle.descent;
  bottoms.push(foot);

  const shift = -Math.min(...tops);
  return {
    width,
    height: Math.ceil(Math.max(...bottoms) + shift - 1e-6),
    left,
    right,
    top: shift,
    bottom: grid + shift,
    tickEnd: left - tickGap,
    yTitle: { x: titleX, y: grid / 2 + shift },
    xTickBaseline: xTickBaseline + shift,
    xTitleBaseline: xTitleBaseline + shift,
    names: names.map((baseline) => baseline + shift),
    nameGap
  };
}

export type RangeLayout = {
  width: number;
  height: number;
  /** The plot's edges: the first and the last tick. */
  left: number;
  right: number;
  /** One row's height, and where the row labels end, left of the plot. */
  row: number;
  labelEnd: number;
  cap: number;
  tickBaseline: number;
  titleBaseline: number;
};

/**
 * A range chart laid out to its ink: the longest row label starts at 0, the furthest tick
 * label, end or marker ends at `width`, the grid starts at the top and the axis title ends at
 * the bottom.
 */
export function rangeLayout(input: {
  width: number;
  scale: number;
  measure: Measure;
  labels: string[];
  ticks: Tick[];
  valueLabel: string;
  marks: Reach[];
}): RangeLayout {
  const { width, scale, measure, ticks, marks } = input;
  const labelGap = 12 * scale;
  const tickGap = 8 * scale;
  const titleGap = 12 * scale;
  const row = 42 * scale;
  const labelInk = input.labels.map((label) => measure(label));
  const tickInk = ticks.map((tick) => measure(tick.text));
  const title = input.valueLabel ? measure(input.valueLabel, true) : null;
  const left = Math.max(
    labelGap + most(labelInk.map((ink) => ink.advance + ink.left)),
    ...tickInk
      .filter((_, index) => ticks[index].at === 0)
      .map((ink) => -inkSpan(ink, 0, 'middle')[0]),
    ...marks.filter((mark) => mark.at === 0).map((mark) => mark.past)
  );
  // A grid line is a stroke wide, so the last one reaches half a stroke past its tick.
  const right = plotEnd(left, width, [
    { at: 1, past: 0.5 },
    ...tickInk.map((ink, index) => ({ at: ticks[index].at, past: inkSpan(ink, 0, 'middle')[1] })),
    ...marks
  ]);
  const rows = input.labels.length * row;
  const tickRow = lineInk(tickInk);
  const tickBaseline = rows + tickGap + tickRow.ascent;
  const titleBaseline = tickBaseline + tickRow.descent + titleGap + (title?.ascent ?? 0);
  return {
    width,
    height: Math.ceil(
      (title ? titleBaseline + title.descent : tickBaseline + tickRow.descent) - 1e-6
    ),
    left,
    right,
    row,
    labelEnd: left - labelGap,
    cap: measure('H').ascent,
    tickBaseline,
    titleBaseline
  };
}

export type HeatmapLayout = {
  width: number;
  height: number;
  /** Where the first column and the first row of cells start; a cell stands `inset` inside. */
  left: number;
  top: number;
  size: number;
  inset: number;
  labelEnd: number;
  columnBaseline: number;
  cap: number;
};

/**
 * A matrix laid out to its ink: the longest row name starts at 0, the column names' ink tops
 * the matrix at 0, and the last cell, or a column name wider than it, ends the width. Cells
 * keep their size, so the matrix is as wide as its columns.
 */
export function heatmapLayout(input: {
  scale: number;
  measure: Measure;
  rows: string[];
  columns: string[];
}): HeatmapLayout {
  const { scale, measure } = input;
  const size = 52 * scale;
  const inset = 2;
  const gap = 12 * scale;
  const rowInk = input.rows.map((name) => measure(name));
  const columnInk = input.columns.map((name) => measure(name));
  const columns = lineInk(columnInk);
  const left = gap - inset + most(rowInk.map((ink) => ink.advance + ink.left));
  const columnBaseline = columns.ascent;
  const top = columnBaseline + columns.descent + gap - inset;
  const ends = columnInk.map(
    (ink, index) => inkSpan(ink, left + (index + 0.5) * size, 'middle')[1]
  );
  return {
    width: Math.ceil(Math.max(left + input.columns.length * size - inset, ...ends) - 1e-6),
    height: Math.ceil(top + input.rows.length * size - inset - 1e-6),
    left,
    top,
    size,
    inset,
    labelEnd: left + inset - gap,
    columnBaseline,
    cap: measure('H').ascent
  };
}

/**
 * Keeps the lowest and the highest point of each of `columns` slices of the domain, in order,
 * so a line through far more points than the plot has pixels draws the same peaks for a
 * fraction of the path.
 */
export function thin(
  points: ChartPoint[],
  columns: number,
  domain: [number, number]
): ChartPoint[] {
  if (points.length <= columns * 2) return points;
  const kept: ChartPoint[] = [];
  const span = domain[1] - domain[0] || 1;
  let slice = -1;
  let low: ChartPoint | null = null;
  let high: ChartPoint | null = null;
  const flush = () => {
    if (!low || !high) return;
    if (low === high) kept.push(low);
    else kept.push(...(low.x <= high.x ? [low, high] : [high, low]));
  };
  for (const point of [...points].sort((a, b) => a.x - b.x)) {
    const at = Math.min(columns - 1, Math.floor(((point.x - domain[0]) / span) * columns));
    if (at !== slice) {
      flush();
      slice = at;
      low = high = point;
    } else {
      if (point.y < (low?.y ?? Infinity)) low = point;
      if (point.y > (high?.y ?? -Infinity)) high = point;
    }
  }
  flush();
  return kept;
}

/**
 * Keeps the first point that lands in each `cell`-pixel square, so a dense scatter draws one
 * mark where many would lie under each other, and the plot holds a bounded number of paths.
 */
export function sieve<T>(points: T[], at: (point: T) => [number, number], cell: number): T[] {
  const taken = new Set<string>();
  return points.filter((point) => {
    const [x, y] = at(point);
    const key = `${Math.floor(x / cell)}:${Math.floor(y / cell)}`;
    if (taken.has(key)) return false;
    taken.add(key);
    return true;
  });
}

export function extent(values: number[], includeZero = false): [number, number] {
  let minimum = Infinity;
  let maximum = -Infinity;
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }
  if (minimum === Infinity) return [0, 1];
  if (includeZero) {
    minimum = Math.min(minimum, 0);
    maximum = Math.max(maximum, 0);
  }
  if (minimum === maximum) {
    const padding = Math.abs(minimum) * 0.1 || 1;
    return [minimum - padding, maximum + padding];
  }
  return [minimum, maximum];
}

export function position(
  value: number,
  domain: [number, number],
  start: number,
  end: number
): number {
  return start + ((value - domain[0]) / (domain[1] - domain[0])) * (end - start);
}

const STEPS = [1, 2, 2.5, 5, 10];

/**
 * Ticks about `count` strong, 1, 2, 2.5 or 5 times a power of ten apart, with whole steps when
 * every value is whole. The domain runs from the first tick to the last, so it covers every value.
 */
export function axis(
  values: number[],
  includeZero = false,
  count = 5
): { domain: [number, number]; ticks: number[] } {
  const [minimum, maximum] = extent(values, includeZero);
  const whole = values.every((value) => !Number.isFinite(value) || Number.isInteger(value));
  const rough = (maximum - minimum) / (count - 1);
  const power = 10 ** Math.floor(Math.log10(rough));
  const step =
    STEPS.map((multiple) => multiple * power).find(
      (candidate) => candidate >= rough && (!whole || Number.isInteger(candidate))
    ) ?? 1;
  const decimals = Math.max(0, 1 - Math.floor(Math.log10(step)));
  // The epsilon stops a quotient such as 0.6 / 0.2 = 2.9999… from adding a tick past the data.
  const first = Math.floor(minimum / step + 1e-9);
  const last = Math.ceil(maximum / step - 1e-9);
  const ticks = Array.from({ length: last - first + 1 }, (_, index) =>
    Number(((first + index) * step).toFixed(decimals))
  );
  return { domain: [ticks[0], ticks[ticks.length - 1]], ticks };
}

const CHART_SERIES = 5;

export function chartColor(index: number): string {
  return `var(--sui-chart-${(index % CHART_SERIES) + 1})`;
}

export type ChartMarker = 'circle' | 'square' | 'triangle' | 'diamond' | 'cross';

const MARKERS: readonly ChartMarker[] = ['circle', 'square', 'triangle', 'diamond', 'cross'];

/* The first line is solid. Round caps eat into each gap, so the gaps are wider than they read. */
const DASHES: readonly (string | undefined)[] = [undefined, '8 6', '1 6', '12 5 1 5', '4 5'];

/* Past five series the colours come round again, so each later round shifts the shapes by one
   and the dashes by two: up to 25 series, no two share a colour, a shape and a dash. */
const round = (index: number) => Math.floor(index / CHART_SERIES);

/** The shape that tells a series apart without its color, in the same order as its color. */
export function chartMarker(index: number): ChartMarker {
  return MARKERS[(index + round(index)) % CHART_SERIES];
}

/** The dash that tells a line apart without its color. The first line has none. */
export function chartDash(index: number): string | undefined {
  return DASHES[(index + 2 * round(index)) % CHART_SERIES];
}

/* How far past its half size each angular shape reaches, so it weighs the same as a circle. */
const STRETCH = { diamond: 1.3, triangle: 1.25, cross: 1.15 };

/**
 * A marker as an SVG path centred on (`cx`, `cy`). `size` is the side of the box the
 * shape fills; the angular shapes reach a little past it so they weigh the same as a circle.
 */
export function markerPath(shape: ChartMarker, cx: number, cy: number, size: number): string {
  const r = size / 2;
  const at = (points: [number, number][]) =>
    `M ${points.map(([dx, dy]) => `${cx + dx} ${cy + dy}`).join(' L ')} Z`;
  if (shape === 'circle')
    return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
  if (shape === 'square')
    return at([
      [-r, -r],
      [r, -r],
      [r, r],
      [-r, r]
    ]);
  if (shape === 'diamond') {
    const d = r * STRETCH.diamond;
    return at([
      [0, -d],
      [d, 0],
      [0, d],
      [-d, 0]
    ]);
  }
  if (shape === 'triangle') {
    const t = r * STRETCH.triangle;
    return at([
      [0, -t],
      [t, t * 0.8],
      [-t, t * 0.8]
    ]);
  }
  const arm = r * STRETCH.cross;
  const w = size / 6;
  return at([
    [-w, -arm],
    [w, -arm],
    [w, -w],
    [arm, -w],
    [arm, w],
    [w, w],
    [w, arm],
    [-w, arm],
    [-w, w],
    [-arm, w],
    [-arm, -w],
    [-w, -w]
  ]);
}

/** How far a marker of `size` reaches from its centre: to either side, above and below. */
export function markerReach(
  shape: ChartMarker,
  size: number
): { across: number; above: number; below: number } {
  const r = size / 2;
  if (shape === 'circle' || shape === 'square') return { across: r, above: r, below: r };
  const reach = r * STRETCH[shape];
  return { across: reach, above: reach, below: shape === 'triangle' ? reach * 0.8 : reach };
}

/**
 * Moves label centres apart so no two stand closer than `gap`, keeping their order and,
 * where there is room, staying between `min` and `max`. Labels already apart do not move.
 */
export function spread(values: number[], gap: number, min: number, max: number): number[] {
  const order = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const placed = order.map((item) => item.value);
  for (let at = 0; at < placed.length; at++)
    placed[at] = Math.max(placed[at], at === 0 ? min : placed[at - 1] + gap);
  for (let at = placed.length - 1; at >= 0; at--)
    placed[at] = Math.min(placed[at], at === placed.length - 1 ? max : placed[at + 1] - gap);
  const result = new Array<number>(values.length);
  order.forEach((item, at) => (result[item.index] = placed[at]));
  return result;
}
