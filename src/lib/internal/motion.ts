/**
 * A duration token in milliseconds, as `node` reads it. A minified stylesheet may write the token
 * in seconds (`.16s` for `160ms`), so the unit decides the scale.
 */
export function duration(name: string, node: Element = document.documentElement): number {
  const time = getComputedStyle(node).getPropertyValue(name).trim();
  return parseFloat(time) * (time.endsWith('ms') ? 1 : 1000) || 0;
}
