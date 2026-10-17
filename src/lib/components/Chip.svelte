<script module lang="ts">
  type Rgb = [number, number, number];

  /* The two inks a painted chip can wear: `--sui-text-primary` in the light and in the dark
     palette, reached by scoping the ink to that theme. Their relative luminance is restated here
     so the choice can be made before paint; recompute it if those two tokens change. */
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
    /** Draws a remove control named "Remove" and the value. */
    onremove?: () => void;
    class?: HTMLAttributes<HTMLSpanElement>['class'];
  } & Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'color'> = $props();

  let remover = $state<HTMLButtonElement | null>(null);

  const removeLabel = $derived(`Remove ${label}`);
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
  }
</script>

<!--
@component
A value drawn as a mark: a label name, a pattern, a count. It never carries a status; reach for
`Pill` for a state, a role or a standing. `color` paints the chip in a color somebody else
chose, such as a GitHub label's, and is how a reader recognises it in a list.

A painted chip's ink is dark or light, whichever reads better on the fill, and a mid tone that
neither reads 4.5:1 on is nudged toward white or black until one does. Anything but hex digits
draws the plain chip, so a stored value never writes a style declaration. A long value wraps
inside the chip, so no part of it is ever cut.

`onremove` adds a remove control with a 24px target, 44px on a coarse pointer. After a removal
focus moves to the next remove control in the chip's parent, then the previous one, then the
parent itself, which gets `tabindex="-1"` when it has none.
-->

<span
  {...rest}
  class={['sui-chip', className, { small, mono, painted, removable: onremove !== undefined }]}
  style:--sui-chip-fill={painted?.fill}
>
  <span class="sui-chip-label" data-sui-theme={painted?.theme}>{label}</span>
  {#if onremove !== undefined}
    <button
      bind:this={remover}
      type="button"
      class="sui-chip-remove"
      data-sui-theme={painted?.theme}
      aria-label={removeLabel}
      onclick={remove}
    >
      <Icon name="close" size="xs" strokeWidth={2} />
    </button>
    <!-- Client only, so a chip inside a paragraph never gets a block box from the server. -->
    {#if remover}
      <Tooltip anchor={remover} text={removeLabel} />
    {/if}
  {/if}
</span>

<style>
  .sui-chip {
    align-items: center;
    background: var(--sui-neutral-tint);
    border-radius: var(--sui-r-chip);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 22%, transparent);
    box-sizing: border-box;
    color: var(--sui-text-secondary);
    display: inline-flex;
    font: 600 var(--sui-font-size-compact) / var(--sui-leading-compact) var(--sui-sans);
    gap: var(--sui-space-1);
    inline-size: fit-content;
    max-inline-size: 100%;
    min-block-size: var(--sui-control-height-chip);
    padding-inline: var(--sui-space-2);
  }

  .small {
    font-size: var(--sui-font-size-micro);
    min-block-size: var(--sui-control-height-chip-small);
  }

  .mono {
    font-family: var(--sui-mono);
    font-variant-numeric: tabular-nums;
    font-weight: 500;
  }

  /* The padding sits on the label so a wrapped value clears the edges, while one line keeps
     the chip at its tier. */
  .sui-chip-label {
    min-inline-size: 0;
    overflow-wrap: anywhere;
    padding-block: var(--sui-space-1);
    text-box: trim-both cap alphabetic;
  }

  /* The edge is the fill pulled toward the page's ink, so a white chip still has an outline on
     a white card. The label and the remove control are scoped to the ink's own theme. */
  .painted {
    background: var(--sui-chip-fill);
    box-shadow: inset 0 0 0 1px
      color-mix(in srgb, var(--sui-chip-fill) 72%, var(--sui-text-primary));
  }

  .painted .sui-chip-label,
  .painted .sui-chip-remove {
    color: var(--sui-text-primary);
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
    block-size: var(--sui-tier-mark);
    border: 0;
    border-radius: inherit;
    color: inherit;
    cursor: pointer;
    display: inline-flex;
    flex: none;
    inline-size: var(--sui-tier-mark);
    justify-content: center;
    margin: 0;
    padding: 0;
    position: relative;
    touch-action: manipulation;
    transition:
      background-color var(--sui-duration-fast) var(--sui-ease-standard),
      translate var(--sui-duration-press) var(--sui-ease-standard),
      box-shadow var(--sui-duration-press) var(--sui-ease-standard);
    -webkit-tap-highlight-color: transparent;
  }

  /* The glyph is 20px so the chip keeps its height; the pointer target is 24px, and a finger's
     is the full touch target. */
  .sui-chip-remove::before {
    content: '';
    inset: calc(-1 * var(--sui-control-inset));
    position: absolute;
  }

  @media (pointer: coarse), (max-width: 47.9375rem) {
    .sui-chip-remove::before {
      inset: calc((var(--sui-tier-mark) - var(--sui-touch-target)) / 2);
    }
  }

  .sui-chip-remove:hover:not(:active) {
    background-color: var(--sui-interactive-hover-layer);
  }

  .sui-chip-remove:active {
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

    .sui-chip-remove:active {
      translate: none;
    }
  }
</style>
