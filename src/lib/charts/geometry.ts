export const plot = { width: 640, height: 300, left: 58, right: 20, top: 20, bottom: 46 };

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

export function ticks(domain: [number, number], count = 5): number[] {
  return Array.from(
    { length: count },
    (_, index) => domain[0] + ((domain[1] - domain[0]) * index) / (count - 1)
  );
}

export function chartColor(index: number): string {
  const fallbacks = ['#0f766e', '#526b7a', '#8a5d17', '#a33a45', '#5b459f'];
  const colorIndex = index % fallbacks.length;
  return `var(--sui-chart-${colorIndex + 1}, ${fallbacks[colorIndex]})`;
}
