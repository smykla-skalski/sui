export const xyPlot = { minWidth: 280, height: 300, left: 58, right: 20, top: 20, bottom: 46 };

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

/** The shape that tells a series apart without its color, in the same order as its color. */
export function chartMarker(index: number): ChartMarker {
  return MARKERS[index % CHART_SERIES];
}

/** The dash that tells a line apart without its color. The first line has none. */
export function chartDash(index: number): string | undefined {
  return DASHES[index % CHART_SERIES];
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
