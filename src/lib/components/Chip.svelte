<script module lang="ts">
  type Rgb = [number, number, number];

  /* The luminance at which black and white ink read equally, about 4.58:1 each, so the better
     of the two always holds 4.5:1 on a fill as it is. */
  const CROSSOVER = Math.sqrt(1.05 * 0.05) - 0.05;
  /* A little over 4.5:1, so rounding the ink to whole channels never lands under it. */
  const FLOOR = 4.6;
  /* The dark theme's tint of the chip's color, as GitHub draws a label in the dark. */
  const TINT = 0.18;
  /* The lightest dark ground a chip stands on (`--sui-surface-inset`): its tint is lightest
     there, so ink that reads on it reads on every darker ground. Recompute if it changes. */
  const DARK_GROUND: Rgb = [0x1b, 0x1c, 0x1f];
  /* A fill this close to white needs an edge to show on a white card. */
  const PALE = 1.25;

  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const encode = (linear: number) => {
    const c = linear <= 0.0031308 ? linear * 12.92 : 1.055 * linear ** (1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, c)) * 255);
  };
  const luminance = ([r, g, b]: Rgb) =>
    0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const hex = (rgb: Rgb) => `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`;

  function parse(color: string): Rgb | null {
    const digits = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim())?.[1];
    if (!digits) return null;
    const full = digits.length === 3 ? [...digits].map((d) => d + d).join('') : digits;
    return [0, 2, 4].map((at) => parseInt(full.slice(at, at + 2), 16)) as Rgb;
  }

  /** sRGB to OKLCH (Ottosson), as lightness, chroma and hue in radians. */
  function oklch([r, g, b]: Rgb): [number, number, number] {
    const [lr, lg, lb] = [r, g, b].map(channel);
    const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
    const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
    const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
    const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    return [L, Math.hypot(a, bb), Math.atan2(bb, a)];
  }

  /** OKLCH to linear sRGB, which may fall outside 0 to 1 when the color is out of gamut. */
  function linear(L: number, C: number, h: number): [number, number, number] {
    const a = C * Math.cos(h);
    const b = C * Math.sin(h);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
    ];
  }

  /** The color at lightness `L` in the hue, with as much of the chroma as sRGB holds. */
  function shade(L: number, C: number, h: number): Rgb {
    const fits = (chroma: number) => linear(L, chroma, h).every((c) => c >= -1e-4 && c <= 1 + 1e-4);
    let low = 0;
    let high = C;
    if (!fits(high))
      for (let step = 0; step < 20; step++) {
        const mid = (low + high) / 2;
        if (fits(mid)) low = mid;
        else high = mid;
      }
    else low = high;
    return linear(L, low, h).map(encode) as Rgb;
  }

  /**
   * A painted chip in each theme. In the light one it wears the color as it is, with black or
   * white ink, whichever reads better, and an edge only when the fill is near white. In the
   * dark one it wears an 18% tint of the color, and its ink is the color itself, lifted in
   * lightness along its own hue until it reads 4.6:1 on that tint.
   */
  function paint(rgb: Rgb) {
    const own = luminance(rgb);
    const lightInk = own > CROSSOVER ? '#000000' : '#ffffff';
    const [L, C, h] = oklch(rgb);
    const edge = contrast(own, 1) < PALE ? hex(shade(Math.max(0, L - 0.2), C, h)) : undefined;
    const tint = luminance(
      rgb.map((c, at) => Math.round(c * TINT + DARK_GROUND[at] * (1 - TINT))) as Rgb
    );
    let ink = rgb;
    for (let lift = L; contrast(luminance(ink), tint) < FLOOR && lift < 1;) {
      lift = Math.min(1, lift + 0.01);
      ink = shade(lift, C, h);
    }
    return { fill: hex(rgb), lightInk, darkInk: hex(ink), edge };
  }

  /* A removed chip takes its own markup with it, so the news is read from a short-lived region
     in the layer the chip stood in, filled a beat after it lands so it is heard as a change. */
  function announce(near: Element, words: string): void {
    const region = document.createElement('div');
    region.setAttribute('role', 'status');
    region.style.cssText =
      'position: fixed; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap';
    (near.closest('dialog, [popover]') ?? document.body).append(region);
    setTimeout(() => (region.textContent = words), 100);
    setTimeout(() => region.remove(), 7000);
  }
</script>

<script lang="ts">
  import { word } from '../words.js';
  import { tick } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import Tooltip from './Tooltip.svelte';

  let {
    label,
    color,
    small = false,
    mono = false,
    onremove,
    disabled = false,
    removeLabel = word('Chip.removeLabel', (value: string) => `Remove ${value}`),
    removedLabel = word('Chip.removedLabel', (value: string) => `Removed ${value}`),
    class: className = '',
    ...rest
  }: {
    /** The value the chip carries. It also names the remove control. */
    label: string;
    /** A color somebody else chose, as three or six hex digits with or without `#`, as GitHub stores a label's. */
    color?: string;
    /** For a chip set inside a line of text rather than beside it. */
    small?: boolean;
    /** For a technical value: an ID, a path, a version or a key. */
    mono?: boolean;
    /** Draws a remove control named by `removeLabel`. */
    onremove?: () => void;
    /** Holds the remove control while removing cannot run; say why beside the chips. */
    disabled?: boolean;
    /** The remove control's name and tooltip, given the value. */
    removeLabel?: (label: string) => string;
    /** Said once the chip has gone, given the value. */
    removedLabel?: (label: string) => string;
    class?: HTMLAttributes<HTMLSpanElement>['class'];
  } & Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'color'> = $props();

  let remover = $state<HTMLButtonElement | null>(null);

  const removeName = $derived(removeLabel(label));
  const painted = $derived.by(() => {
    const rgb = color === undefined ? null : parse(color);
    return rgb ? paint(rgb) : null;
  });

  /* The pressed control leaves with its chip, so focus is placed before it would fall to the
     body: on the next remove control in the group, the previous one, or the group itself. */
  async function remove() {
    const own = remover;
    const group = own?.parentElement?.parentElement;
    if (!own || !group || !onremove) return;
    const removers = [...group.querySelectorAll<HTMLElement>('.sui-chip-remove')];
    const at = removers.indexOf(own);
    const next = removers[at + 1] ?? removers[at - 1] ?? group;
    onremove();
    await tick();
    // Still here: the caller kept the chip, or an unkeyed list reused it for the next value.
    if (own.isConnected) return;
    if (next === group && !group.hasAttribute('tabindex')) group.tabIndex = -1;
    next.focus({ preventScroll: true });
    announce(group, removedLabel(label));
  }
</script>

<!--
@component
A value drawn as a mark: a label name, a pattern, a count. It never carries a status; reach for
`Pill` for a state, a role or a standing. `color` paints the chip in a color somebody else
chose, such as a GitHub label's, and is how a reader recognises it in a list.

A painted chip is drawn as GitHub draws a label. In the light theme it wears the color as it
is, with black or white ink, whichever reads better, and either reads 4.5:1 on any fill at the
point where they read the same. In the dark theme it wears an 18% tint of the color, and its
ink is the color itself, lifted in lightness along its own hue until it reads 4.5:1, so a
label keeps its hue in both themes. Only a near-white fill draws an edge, so it still shows on
a white card. Anything but hex digits draws the plain chip, so a stored value never writes a
style declaration.

- Semantics: a `span` holding the value as text, with a native `button` to remove it when `onremove` is set.
- Content: one value of any length, which wraps inside the chip so no part of it is cut; `small` for a chip inside a line of text, `mono` for a technical value.
- States: rest, painted (its color in the light theme, a tint of it in the dark one), and on the remove control hover, pressed, focus and disabled at the disabled opacity.
- Keyboard: the remove control is a tab stop, and Enter or Space removes; the chip itself is not a stop.
- Pointer and touch: the remove target is 24px; on a phone or a coarse pointer a removable chip grows to 44px tall around a 44px square control, so the targets of chips on wrapped lines never overlap.
- Focus: after a removal it moves to the next remove control in the chip's parent, then the previous one, then the parent itself, which gets `tabindex="-1"` when it has none.
- Responsive: as wide as its value, up to its container, and taller as a long value wraps.
- Accessibility: the remove control is named by `removeLabel`, which is also its tooltip, and a polite status says `removedLabel` once the chip has gone; a painted chip's ink holds 4.5:1 in both themes, and under forced colors every chip keeps an outline.
- Localization: `removeLabel` and `removedLabel` are functions of the value with English defaults; the remove control sits at the inline end, so it moves to the left in a right-to-left page.
- Performance: a painted chip computes its paint for both themes once per color, and the theme picks one with `light-dark()`; a remove control mounts one tooltip.
- Analytics: `onremove` hears each removal.
- Failure: a color that is not hex digits draws the plain chip; with `disabled` the remove control stays visible and does nothing, so say why beside the chips.
-->

<span
  {...rest}
  class={['sui-chip', className, { small, mono, painted, removable: onremove !== undefined }]}
  style:--sui-chip-fill={painted?.fill}
  style:--sui-chip-ink-light={painted?.lightInk}
  style:--sui-chip-ink-dark={painted?.darkInk}
  style:--sui-chip-edge={painted?.edge}
>
  <span class="sui-chip-label">{label}</span>
  {#if onremove !== undefined}
    <button
      bind:this={remover}
      type="button"
      class="sui-chip-remove"
      aria-label={removeName}
      {disabled}
      onclick={remove}
    >
      <Icon name="close" size="xs" strokeWidth={2} />
    </button>
    <!-- Client only, so a chip inside a paragraph never gets a block box from the server. -->
    {#if remover}
      <Tooltip anchor={remover} text={removeName} />
    {/if}
  {/if}
</span>

<style>
  /* The parts hang from the top: the label's padding centres one line in the chip's height and
     the remove mark sits on that line, so a value that wraps keeps its mark beside its first
     line (L-94). */
  .sui-chip {
    --sui-local-chip: var(--sui-control-height-chip);
    --sui-local-remove: var(--sui-tier-mark);
    align-items: start;
    background: var(--sui-neutral-tint);
    border-radius: var(--sui-radius-chip);
    box-shadow: inset 0 0 0 var(--sui-stroke) color-mix(in srgb, currentColor 22%, transparent);
    box-sizing: border-box;
    color: var(--sui-text-secondary);
    display: inline-flex;
    font: var(--sui-weight-semibold) var(--sui-font-size-compact) / var(--sui-leading-compact)
      var(--sui-sans);
    gap: var(--sui-space-1);
    inline-size: fit-content;
    max-inline-size: 100%;
    min-block-size: var(--sui-local-chip);
    padding-inline: var(--sui-space-2);
  }

  .small {
    --sui-local-chip: var(--sui-control-height-chip-small);
    font-size: var(--sui-font-size-micro);
  }

  .mono {
    font-family: var(--sui-mono);
    font-variant-numeric: tabular-nums;
    font-weight: var(--sui-weight-medium);
  }

  /* The padding sits on the label so a wrapped value clears the edges, while one line keeps
     the chip at its tier with the words on its middle. */
  .sui-chip-label {
    align-content: center;
    block-size: var(--sui-block-snap-even);
    min-inline-size: 0;
    overflow-wrap: anywhere;
    padding-block: calc((var(--sui-local-chip) - round(up, 1cap, 2px)) / 2);
    text-box: trim-both cap alphabetic;
  }

  /* A painted chip has no edge but a near-white one's, which shows it on a white card; the
     theme picks the light or the dark paint. */
  .painted {
    background: light-dark(
      var(--sui-chip-fill),
      color-mix(in srgb, var(--sui-chip-fill) 18%, transparent)
    );
    box-shadow: inset 0 0 0 var(--sui-stroke)
      light-dark(var(--sui-chip-edge, transparent), transparent);
    color: light-dark(var(--sui-chip-ink-light), var(--sui-chip-ink-dark));
  }

  /* The remove control sits concentric with the chip: the same inset on the end as above
     and below it. */
  .removable {
    padding-inline-end: var(--sui-control-inset);
  }

  .small.removable {
    padding-inline-end: 0;
  }

  .sui-chip-remove {
    align-items: center;
    background-color: transparent;
    block-size: var(--sui-local-remove);
    border: 0;
    border-radius: inherit;
    color: inherit;
    cursor: pointer;
    display: inline-flex;
    flex: none;
    inline-size: var(--sui-local-remove);
    justify-content: center;
    margin: calc((var(--sui-local-chip) - var(--sui-local-remove)) / 2) 0;
    padding: 0;
    position: relative;
    touch-action: manipulation;
    transition:
      translate var(--sui-duration-press) var(--sui-ease-standard),
      box-shadow var(--sui-duration-press) var(--sui-ease-standard);
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    -webkit-user-select: none;
  }

  /* The glyph is 20px so the chip keeps its height; the pointer target is 24px, and a finger's
     is the full touch target. */
  .sui-chip-remove::before {
    content: '';
    inset: calc(-1 * var(--sui-control-inset));
    position: absolute;
  }

  /* A finger's 44px target that reached past the chip would overlap the next line's, so the
     chip grows to hold the whole target instead. */
  @media (pointer: coarse), (max-width: 47.9375rem) {
    .removable,
    .small.removable {
      --sui-local-chip: var(--sui-touch-target);
      --sui-local-remove: var(--sui-touch-target);
      padding-inline-end: 0;
    }

    .sui-chip-remove::before {
      inset: 0;
    }
  }

  @media (hover: hover) {
    .sui-chip-remove:hover:not(:active, :disabled) {
      background-color: var(--sui-interactive-hover-layer);
    }
  }

  .sui-chip-remove:disabled {
    cursor: default;
    opacity: var(--sui-disabled-opacity);
  }

  .sui-chip-remove:active:not(:disabled) {
    background-color: var(--sui-interactive-pressed);
    box-shadow: var(--sui-pressed-inset);
    translate: 0 1px;
  }

  .sui-chip-remove:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-flush);
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-chip-remove {
      transition: none;
    }

    .sui-chip-remove:active:not(:disabled) {
      translate: none;
    }
  }

  /* Forced colors drop the fill and the inset edge, so the chip keeps its shape by an outline. */
  @media (forced-colors: active) {
    .sui-chip {
      outline: var(--sui-stroke) solid CanvasText;
      outline-offset: calc(-1 * var(--sui-stroke));
    }
  }
</style>
