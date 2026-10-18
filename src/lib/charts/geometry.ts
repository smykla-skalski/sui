import type { ChartPoint } from './types.js';

/** The plot's frame in CSS pixels at a 16px root. The margins hold text, so they grow with it. */
export const xyPlot = { minWidth: 280, height: 300, left: 58, right: 20, top: 20, bottom: 46 };

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
    const d = r * 1.3;
    return at([
      [0, -d],
      [d, 0],
      [0, d],
      [-d, 0]
    ]);
  }
  if (shape === 'triangle') {
    const t = r * 1.25;
    return at([
      [0, -t],
      [t, t * 0.8],
      [-t, t * 0.8]
    ]);
  }
  const arm = r * 1.15;
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
