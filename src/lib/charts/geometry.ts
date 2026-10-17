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
