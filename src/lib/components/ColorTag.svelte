<script module lang="ts">
  type Rgb = [number, number, number];

  /* The two inks a tag can wear: `--sui-text-primary` in the light and in the dark palette,
     reached by scoping the tag to that theme. Their relative luminance is restated here so the
     choice can be made before paint; recompute it if those two tokens change. */
  const INK = { light: 0.0138, dark: 0.9168 } as const;
  /* A little over 4.5:1, so rounding the fill to whole channels never lands under it. */
  const FLOOR = 4.6;

  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = ([r, g, b]: Rgb) =>
    0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

  function parse(color: string): Rgb | null {
    const digits = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim())?.[1];
    if (!digits) return null;
    const full = digits.length === 3 ? [...digits].map((d) => d + d).join('') : digits;
    return [0, 2, 4].map((at) => parseInt(full.slice(at, at + 2), 16)) as Rgb;
  }

  /**
   * The theme whose ink reads best on the caller's color, and the fill: that color, or the
   * least step from it toward white or black that brings the ink to 4.5:1. Mid tones such as
   * GitHub's red `d73a4a` reach neither ink as they are.
   */
  function paint(rgb: Rgb): { theme: keyof typeof INK; fill: string } {
    const own = luminance(rgb);
    const theme = contrast(own, INK.light) >= contrast(own, INK.dark) ? 'light' : 'dark';
    const pole = theme === 'light' ? 255 : 0;
    let mixed = rgb;
    for (let step = 1; step <= 20 && contrast(luminance(mixed), INK[theme]) < FLOOR; step++)
      mixed = rgb.map((c) => Math.round(c + ((pole - c) * step) / 20)) as Rgb;
    return { theme, fill: `rgb(${mixed.join(' ')})` };
  }
</script>

<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    label,
    color,
    class: className = '',
    ...rest
  }: {
    /** The tag's name. */
    label: string;
    /** The caller's color as three or six hex digits, with or without `#`, as GitHub stores a label's. */
    color: string;
    class?: HTMLAttributes<HTMLSpanElement>['class'];
  } & Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'color'> = $props();

  const rgb = $derived(parse(color));
  const painted = $derived(rgb ? paint(rgb) : null);
</script>

<!--
@component
A tag painted in a color somebody else chose, such as a GitHub label, with its name. The
color is how a reader recognises the tag in a list, so it fills the whole tag, and its edge
is the same color pulled toward the ink so a white tag still has an outline on a white card.

The ink is dark or light, whichever reads better on the fill, and a mid tone that neither
reads 4.5:1 on is nudged toward white or black until one does. Anything but hex digits draws
the neutral tag instead, so a stored value never writes a style declaration. The color never
says anything the name does not, and a tag of the product's own meaning is `Chip`.
-->

<span
  {...rest}
  class={['sui-color-tag', className, { unknown: !painted }]}
  data-sui-theme={painted?.theme}
  style:--sui-color-tag-fill={painted?.fill}
>
  <span class="sui-color-tag-label">{label}</span>
</span>

<style>
  .sui-color-tag {
    align-items: center;
    background: var(--sui-color-tag-fill);
    border: 1px solid color-mix(in srgb, var(--sui-color-tag-fill) 72%, var(--sui-text-primary));
    border-radius: var(--sui-r-chip);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    display: inline-flex;
    font: 600 var(--sui-font-size-compact) / var(--sui-leading-compact) var(--sui-sans);
    inline-size: fit-content;
    max-inline-size: 100%;
    min-block-size: var(--sui-control-height-chip);
    padding: var(--sui-space-1) var(--sui-space-2);
  }

  .unknown {
    background: var(--sui-neutral-tint);
    border-color: var(--sui-border-subtle);
    color: var(--sui-text-secondary);
  }

  .sui-color-tag-label {
    min-inline-size: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }
</style>
