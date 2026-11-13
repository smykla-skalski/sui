<script module lang="ts">
  type Rgb = [number, number, number];

  /* A little over 4.5:1 and APCA Lc 60, so rounding the ink to whole channels never lands under
     either. */
  const FLOOR = 4.6;
  const LC_FLOOR = 61;
  const BLACK: Rgb = [0, 0, 0];
  const WHITE: Rgb = [255, 255, 255];
  /* The dark theme's tint of the chip's color, as GitHub draws a label in the dark. */
  const TINT = 0.26;
  /* The lightest dark ground a chip stands on (`--sui-surface-inset`): its tint is lightest
     there, so ink that reads on it reads on every darker ground. Recompute if it changes. */
  const DARK_GROUND: Rgb = [0x1b, 0x1c, 0x1f];
  /* A fill this close to white needs an edge to show on a white card. */
  const PALE = 1.25;
  /* A grey tint this close to the dark ground, as black's is, needs one too; a colored tint
     shows by its hue however dark it is. */
  const DEEP = 1.1;

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
  /* APCA-W3's screen luminance, with its soft clamp near black. */
  const screen = ([r, g, b]: Rgb) => {
    const y =
      0.2126729 * (r / 255) ** 2.4 + 0.7151522 * (g / 255) ** 2.4 + 0.072175 * (b / 255) ** 2.4;
    return y < 0.022 ? y + (0.022 - y) ** 1.414 : y;
  };
  /** The APCA lightness contrast of ink on a ground, without its sign. */
  function lc(ink: Rgb, ground: Rgb): number {
    const [text, back] = [screen(ink), screen(ground)];
    if (Math.abs(back - text) < 0.0005) return 0;
    const scaled =
      back > text ? (back ** 0.56 - text ** 0.57) * 1.14 : (text ** 0.62 - back ** 0.65) * 1.14;
    return scaled < 0.1 ? 0 : (scaled - 0.027) * 100;
  }
  const reads = (ink: Rgb, ground: Rgb) =>
    contrast(luminance(ink), luminance(ground)) >= FLOOR && lc(ink, ground) >= LC_FLOOR;
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

  /** The color moved along its own hue, one step at a time, until `ink` reads on it. */
  function settle(rgb: Rgb, ink: Rgb, step: number): { fill: Rgb; steps: number } {
    const [L, C, h] = oklch(rgb);
    let fill = rgb;
    let steps = 0;
    for (let at = L; !reads(ink, fill) && at > 0 && at < 1; steps++) {
      at = Math.min(1, Math.max(0, at + step));
      fill = shade(at, C, h);
    }
    return { fill, steps };
  }

  /**
   * A painted chip in each theme. In the light one it wears the color with black or white ink,
   * and an edge only when the fill is near white. A mid-tone fill on which neither ink reads
   * 4.6:1 and Lc 61 moves along its hue, darker under white or lighter under black, whichever
   * is the shorter way. In the dark one it wears a 26% tint of the color, and its ink is the
   * color itself, lifted in lightness along its own hue until it reads on that tint.
   */
  function paint(rgb: Rgb) {
    const white = settle(rgb, WHITE, -0.01);
    const black = settle(rgb, BLACK, 0.01);
    const { fill } = white.steps <= black.steps ? white : black;
    const lightInk = white.steps <= black.steps ? '#ffffff' : '#000000';
    const [L, C, h] = oklch(fill);
    const pale = contrast(luminance(fill), 1) < PALE;
    const edge = pale ? hex(shade(Math.max(0, L - 0.2), C, h)) : undefined;
    const tint = rgb.map((c, at) => Math.round(c * TINT + DARK_GROUND[at] * (1 - TINT))) as Rgb;
    const [own, chroma, hue] = oklch(rgb);
    let ink = rgb;
    for (let lift = own; !reads(ink, tint) && lift < 1;) {
      lift = Math.min(1, lift + 0.01);
      ink = shade(lift, chroma, hue);
    }
    const deep = chroma < 0.04 && contrast(luminance(tint), luminance(DARK_GROUND)) < DEEP;
    const darkEdge = deep
      ? hex(ink.map((c, at) => Math.round(c * 0.3 + tint[at] * 0.7)) as Rgb)
      : undefined;
    return { fill: hex(fill), hue: hex(rgb), lightInk, darkInk: hex(ink), edge, darkEdge };
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
  // A technical value breaks after its delimiters before anywhere else, so a wrapped path or
  // key keeps its words whole.
  const parts = $derived(mono ? label.split(/(?<=[/:=-])/) : [label]);
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
    const removed = label;
    const before = group.querySelectorAll('.sui-chip-remove').length;
    const at = [...group.querySelectorAll<HTMLElement>('.sui-chip-remove')].indexOf(own);
    onremove();
    await tick();
    // An unkeyed list can reuse this button for another value, so count the removal instead.
    const remaining = [...group.querySelectorAll<HTMLElement>('.sui-chip-remove')];
    if (own.isConnected && remaining.length === before) return;
    const next = remaining[at] ?? remaining[at - 1] ?? group;
    if (next === group && !group.hasAttribute('tabindex')) group.tabIndex = -1;
    next.focus({ preventScroll: true });
    announce(group, removedLabel(removed));
  }
</script>

<!--
@component
A value drawn as a mark: a label name, a pattern, a count. It never carries a status; reach for
`Pill` for a state, a role or a standing. `color` paints the chip in a color somebody else
chose, such as a GitHub label's, and is how a reader recognises it in a list.

A painted chip is drawn as GitHub draws a label. In the light theme it wears the color with
black or white ink. On a mid-tone fill where neither ink reads 4.5:1 and APCA Lc 60, the fill
moves along its own hue, the shorter way, until one does. In the dark theme it wears a 26%
tint of the color, and its ink is the color itself, lifted in lightness along its own hue
until it reads 4.5:1 and Lc 60, so a label keeps its hue in both themes. Only a near-white fill draws an edge in the light theme, so it still shows on
a white card, and only a near-black one in the dark theme, whose tint all but vanishes there. Anything but hex digits draws the plain chip, so a stored value never writes a
style declaration.

- Semantics: a `span` holding the value as text, with a native `button` to remove it when `onremove` is set.
- Content: one value of any length, which wraps inside the chip so no part of it is cut; `small` for a chip inside a line of text, `mono` for a technical value.
- States: rest, painted (its color in the light theme, a tint of it in the dark one), and on the remove control hover, pressed and focus; a disabled chip takes an off field's paint, the quieter field well with no edge and its value and mark in the muted ink at full strength, and a painted one keeps a tenth of its color over that well, half that on the deeper dark well, so it still shows which label it is.
- Keyboard: the remove control is a tab stop, and Enter or Space removes; the chip itself is not a stop.
- Pointer and touch: the remove target is 24px; on a phone or a coarse pointer a removable chip, a small one too at the default chip's type size, is drawn 34px tall with a 44px target that reaches over its own value, and a 5px margin above and below holds the rest of the target, so the targets of chips on wrapped lines never overlap.
- Focus: after a removal it moves to the next remove control in the chip's parent, then the previous one, then the parent itself, which gets `tabindex="-1"` when it has none.
- Responsive: as wide as its value, up to its container, and taller as a long value wraps; a `mono` value wraps after a `/`, `:`, `=` or `-` before it breaks a word.
- Accessibility: the remove control is named by `removeLabel`, which is also its tooltip unless the chip is disabled, and a polite status says `removedLabel` once the chip has gone; a painted chip's ink holds 4.5:1 and APCA Lc 60 in both themes, and under forced colors every chip keeps an outline.
- Localization: `removeLabel` and `removedLabel` are functions of the value with English defaults; the remove control sits at the inline end, so it moves to the left in a right-to-left page.
- Performance: a painted chip computes its paint for both themes once per color, and the theme picks one with `light-dark()`; a remove control mounts one tooltip.
- Analytics: `onremove` hears each removal.
- Failure: a color that is not hex digits draws the plain chip; with `disabled` the remove control stays visible and does nothing, so say why beside the chips.
-->

<span
  {...rest}
  class={[
    'sui-chip',
    className,
    {
      small,
      mono,
      painted,
      removable: onremove !== undefined,
      off: disabled && onremove !== undefined
    }
  ]}
  style:--sui-chip-fill={painted?.fill}
  style:--sui-chip-hue={painted?.hue}
  style:--sui-chip-ink-light={painted?.lightInk}
  style:--sui-chip-ink-dark={painted?.darkInk}
  style:--sui-chip-edge={painted?.edge}
  style:--sui-chip-edge-dark={painted?.darkEdge}
>
  <span class="sui-chip-label" translate={mono ? 'no' : undefined}
    >{#each parts as part, index (index)}{#if index > 0}<wbr />{/if}{part}{/each}</span
  >
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
    <!-- A disabled remove names no action it cannot take; the reason stands beside the chips. -->
    {#if remover && !disabled}
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
    inline-size: var(--sui-inline-snap);
    max-inline-size: 100%;
    min-block-size: var(--sui-local-chip);
    padding-inline: var(--sui-space-2);
  }

  /* In a line of text a small chip stands on the text's own box, its foot on the words' foot,
     so it stays inside the line's height rather than growing the line under a baseline. */
  .small {
    --sui-local-chip: var(--sui-control-height-chip-small);
    font-size: var(--sui-font-size-micro);
    vertical-align: text-bottom;
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
    padding-block: calc(
        (var(--sui-local-chip) - round(up, 1cap, 2px)) / 2 + var(--sui-block-snap-half-even, 0px)
      )
      calc(
        (var(--sui-local-chip) - round(up, 1cap, 2px)) / 2 + var(--sui-block-snap-spare-even, 0px) -
          var(--sui-block-snap-half-even, 0px)
      );
    text-box: trim-both cap alphabetic;
  }

  /* A painted chip has no edge but a near-white one's, which shows it on a white card, and a
     near-black one's, whose tint all but vanishes on a dark ground; the theme picks the light
     or the dark paint. */
  .painted {
    background: light-dark(
      var(--sui-chip-fill),
      color-mix(in srgb, var(--sui-chip-hue) 26%, transparent)
    );
    box-shadow: inset 0 0 0 var(--sui-stroke)
      light-dark(var(--sui-chip-edge, transparent), var(--sui-chip-edge-dark, transparent));
    color: light-dark(var(--sui-chip-ink-light), var(--sui-chip-ink-dark));
  }

  /* A chip whose remove is off reads as an off field does, as a pair entry's chip does: the
     quieter field well with no edge, and its value and mark in the muted ink at full strength,
     so it reads as fixed while its value stays legible (L-40). */
  .off {
    background: var(--sui-field-disabled);
    box-shadow: none;
    color: var(--sui-text-muted);
  }

  /* A painted chip that is off keeps a trace of its color over the well, so a reader still
     knows the label while it reads as fixed beside the plain ones. The dark well is so deep
     that a tenth of a pale hue lifts the chip over the other off ones, so dark keeps half. */
  .off.painted {
    background: light-dark(
      color-mix(in srgb, var(--sui-chip-hue) 10%, var(--sui-field-disabled)),
      color-mix(in srgb, var(--sui-chip-hue) 5%, var(--sui-field-disabled))
    );
  }

  .off > .sui-chip-remove:disabled {
    opacity: 1;
  }

  /* The remove control sits concentric with the chip: the same inset on the end as above
     and below it. */
  .removable {
    padding-inline-end: var(--sui-control-inset);
  }

  .small.removable {
    padding-inline-end: 0;
  }

  /* A control as tall as its chip stands in no inset, so it takes the chip's own corner. */
  .small > .sui-chip-remove {
    border-radius: inherit;
  }

  .sui-chip-remove {
    align-items: center;
    background-color: transparent;
    block-size: var(--sui-local-remove);
    border: 0;
    /* Concentric with the chip: its corner is the chip's, less the inset around it. */
    border-radius: var(--sui-radius-chip-remove);
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

  /* A finger gets a 44px target while the chip is drawn at the pointer's 34px tier, so a row of
     removable chips stays a row of marks and not a stack of fields. The target reaches inward
     over the chip's own value, never past its end, and the chip's margin holds the 5px it
     reaches above and below, so the targets of chips on wrapped lines never overlap. */
  @media (pointer: coarse), (max-width: 47.9375rem) {
    /* A small chip's micro type would read as a caption in a 34px chip beside default ones of
       the same height, so a removable one takes their size. */
    .small.removable {
      font-size: var(--sui-font-size-compact);
    }

    .removable,
    .small.removable {
      --sui-local-chip: var(--sui-control-height-drawn);
      --sui-local-remove: var(--sui-control-height-drawn);
      margin-block: calc((var(--sui-touch-target) - var(--sui-local-chip)) / 2);
      padding-inline-end: 0;
    }

    .sui-chip-remove {
      border-radius: inherit;
    }

    /* Logical sides, so in a right-to-left page the target still reaches over the value. */
    .sui-chip-remove::before {
      inset-block: calc((var(--sui-local-remove) - var(--sui-touch-target)) / 2);
      inset-inline: calc(var(--sui-local-remove) - var(--sui-touch-target)) 0;
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

  /* Inside the control, so the ring never lands on the chip's own edge as a double line. */
  .sui-chip-remove:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-inset);
  }

  /* On a painted fill the focus blue can fall under 3:1, as on violet, so the ring takes the
     chip's ink, which holds 4.5:1 on that fill (L-6). */
  .painted .sui-chip-remove:focus-visible {
    outline-color: currentColor;
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
