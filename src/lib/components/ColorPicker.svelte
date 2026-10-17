<script module lang="ts">
  type Hsv = { h: number; s: number; v: number };

  // These literals are the user's data and the color space itself: the default swatches a
  // caller can replace, and the gradients that draw hue, saturation and value. They are not
  // paint, so they live here and never in the palette or the style block.
  const DEFAULT_SWATCHES = [
    '#b60205',
    '#d93f0b',
    '#fbca04',
    '#0e8a16',
    '#006b75',
    '#1d76db',
    '#0052cc',
    '#5319e7',
    '#e99695',
    '#f9d0c4',
    '#fef2c0',
    '#c2e0c6',
    '#bfdadc',
    '#c5def5',
    '#bfd4f2',
    '#d4c5f9'
  ];
  const HUE_RAIL =
    'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)';
  const plane = (hue: string) =>
    `linear-gradient(to top, #000000, transparent), linear-gradient(to right, #ffffff, ${hue})`;

  function hexToHsv(hex: string): Hsv {
    const n = parseInt(hex.slice(1), 16);
    const r = ((n >> 16) & 255) / 255;
    const g = ((n >> 8) & 255) / 255;
    const b = (n & 255) / 255;
    const max = Math.max(r, g, b);
    const d = max - Math.min(r, g, b);
    let h = 0;
    if (d !== 0) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h = (h * 60 + 360) % 360;
    }
    return { h, s: max === 0 ? 0 : d / max, v: max };
  }

  function hsvToHex({ h, s, v }: Hsv): string {
    const channel = (i: number) => {
      const k = (i + h / 60) % 6;
      const c = v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
      return Math.round(c * 255)
        .toString(16)
        .padStart(2, '0');
    };
    return `#${channel(5)}${channel(3)}${channel(1)}`;
  }

  /** Three digits or six, with or without the `#`. */
  function parseHex(raw: string): string | null {
    const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(raw.trim());
    if (!match) return null;
    const digits = match[1].toLowerCase();
    return `#${digits.length === 3 ? [...digits].map((c) => c + c).join('') : digits}`;
  }

  const clamp = (n: number) => Math.min(1, Math.max(0, n));
</script>

<script lang="ts">
  import { tick } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import Button from './Button.svelte';
  import Field, { type FieldControl } from './Field.svelte';
  import Popover from './Popover.svelte';
  import TextInput from './TextInput.svelte';

  const uid = $props.id();

  let {
    value = $bindable(),
    swatches = DEFAULT_SWATCHES,
    label,
    disabled = false,
    element = $bindable(null),
    class: className = '',
    onclick,
    ...rest
  }: {
    /** The color as `#rrggbb`. It follows the picker live while the popover is open. */
    value: string;
    /** The one-press choices, in reading order. */
    swatches?: readonly string[];
    /** Draws a `Field` label over the trigger. Inside a `Field` of your own, leave it off. */
    label?: string;
    disabled?: boolean;
    element?: HTMLButtonElement | HTMLAnchorElement | null;
    /** Layout for the call site only, never the trigger's own paint. */
    class?: HTMLButtonAttributes['class'];
  } & Omit<HTMLButtonAttributes, 'value' | 'children' | 'popovertarget'> = $props();

  const popoverId = `${uid}-popover`;
  const errorId = `${uid}-error`;

  let open = $state(false);
  // The picker owns its hue: a grey's hex has none to read back, so the hue survives here
  // instead of snapping to red whenever the saturation or the brightness touches zero.
  let hsv = $state<Hsv>({ h: 0, s: 0, v: 0 });
  let hexField = $state('');
  let hexInvalid = $state(false);
  let hexInput = $state<HTMLInputElement | null>(null);
  let grid = $state<HTMLElement | null>(null);
  let area = $state<HTMLElement | null>(null);
  let drag: { target: HTMLElement; kind: 'area' | 'hue' } | null = null;

  const current = $derived(parseHex(value) ?? value);
  /* A `<label for>` would replace the trigger's words as its name, so the name is the
     label's words and the hex together, and a reader hears which color it holds. */
  const labelled = $derived(
    [...(element && 'labels' in element ? element.labels : [])]
      .map((node) => node.textContent?.trim())
      .filter(Boolean)
      .join(' ') || rest['aria-label']
  );
  const name = $derived(labelled ? `${labelled} ${current}` : undefined);
  const palette = $derived([...new Set(swatches.map((swatch) => swatch.toLowerCase()))]);
  const hueColor = $derived(hsvToHex({ h: hsv.h, s: 1, v: 1 }));
  const saturation = $derived(Math.round(hsv.s * 100));
  const brightness = $derived(Math.round(hsv.v * 100));

  // The trigger's press lands before the browser opens the popover, so the picker reseeds
  // from the value it is about to show.
  function seed(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) {
    if (!open) {
      const hex = parseHex(value);
      if (hex && hex !== hsvToHex(hsv)) hsv = keepHue(hex);
      hexField = current;
      hexInvalid = false;
    }
    onclick?.(event);
  }

  $effect(() => {
    if (!open) return;
    void tick().then(() => {
      const start =
        grid?.querySelector<HTMLInputElement>('input:checked') ??
        grid?.querySelector<HTMLInputElement>('input') ??
        area;
      start?.focus({ preventScroll: true });
    });
  });

  function keepHue(hex: string): Hsv {
    const read = hexToHsv(hex);
    return { ...read, h: read.s === 0 ? hsv.h : read.h };
  }

  function apply(next: Hsv) {
    hsv = next;
    value = hsvToHex(next);
    hexField = value;
    hexInvalid = false;
  }

  function pick(hex: string) {
    hsv = keepHue(hex);
    value = hex;
    hexField = hex;
    hexInvalid = false;
  }

  function close() {
    open = false;
    element?.focus();
  }

  function dragMove(event: PointerEvent) {
    if (!drag) return;
    const box = drag.target.getBoundingClientRect();
    const x = clamp((event.clientX - box.left) / box.width);
    if (drag.kind === 'hue') apply({ ...hsv, h: x * 360 });
    else apply({ ...hsv, s: x, v: 1 - clamp((event.clientY - box.top) / box.height) });
  }

  function dragStart(event: PointerEvent, kind: 'area' | 'hue') {
    const target = event.currentTarget as HTMLElement;
    drag = { target, kind };
    target.setPointerCapture(event.pointerId);
    target.focus({ preventScroll: true });
    dragMove(event);
    event.preventDefault();
  }

  function dragEnd() {
    drag = null;
  }

  function step(event: KeyboardEvent): number {
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') return 1;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') return -1;
    return 0;
  }

  function areaKeys(event: KeyboardEvent) {
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      return apply({ ...hsv, s: event.key === 'End' ? 1 : 0 });
    }
    const direction = step(event);
    if (direction === 0) return;
    event.preventDefault();
    const amount = (event.shiftKey ? 10 : 1) / 100;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
      apply({ ...hsv, s: clamp(hsv.s + direction * amount) });
    else apply({ ...hsv, v: clamp(hsv.v + direction * amount) });
  }

  function hueKeys(event: KeyboardEvent) {
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      return apply({ ...hsv, h: event.key === 'End' ? 359 : 0 });
    }
    const direction = step(event);
    if (direction === 0) return;
    event.preventDefault();
    apply({ ...hsv, h: (hsv.h + direction * (event.shiftKey ? 20 : 2) + 360) % 360 });
  }

  function typeHex(event: Event & { currentTarget: HTMLInputElement }) {
    hexInvalid = false;
    // Only a whole six-digit value follows the typing, so "#0e8" on the way to "#0e8a16"
    // never flashes a different color.
    if (!/^#?[0-9a-f]{6}$/i.test(event.currentTarget.value.trim())) return;
    const hex = parseHex(event.currentTarget.value);
    if (hex && hex !== current) {
      hsv = keepHue(hex);
      value = hex;
    }
  }

  function commitHex(): boolean {
    const hex = parseHex(hexField);
    hexInvalid = hex === null;
    if (!hex) return false;
    hexField = hex;
    if (hex !== current) {
      hsv = keepHue(hex);
      value = hex;
    }
    return true;
  }

  function commitOnEnter(event: KeyboardEvent) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (event.target === hexInput && !commitHex()) return;
    close();
  }
</script>

<!--
@component
A color as `#rrggbb`, picked from a trigger that shows the swatch and the hex. The popover
offers the caller's swatches as a radio group, a saturation and brightness area, a hue rail
and a hex field. Reach for it only when the color is the user's own data, such as a label
color; a theme never needs one.

The value follows the picker live, so `bind:value` sees every step of a drag. Arrows move
the knob and the hue thumb (Shift for bigger steps) and walk the swatches. Home and End take
the area to no or full saturation and the rail to its ends. Enter commits and closes, a
swatch press does the same, and Escape closes and leaves the field's half-typed hex behind.
A grey keeps the hue it had, so dragging through it never snaps the rail to red.

`label` draws a visible `Field` label over the trigger. Inside a `Field` of your own, spread
the field's `id` and `describedby` onto it and leave `label` off. Either way the trigger's
name is the label and the hex, such as "Label color #0f766e".
-->

{#snippet trigger(field?: FieldControl)}
  <Button
    bind:element
    {...rest}
    id={field?.id ?? rest.id}
    aria-describedby={field?.describedby ?? rest['aria-describedby']}
    aria-label={name}
    class={field ? undefined : ['sui-color-picker', className]}
    {disabled}
    popovertarget={popoverId}
    aria-haspopup="dialog"
    aria-expanded={open}
    onclick={seed}
  >
    {#snippet icon()}
      <span class="mark" style:--sui-color-picker-value={current}></span>
    {/snippet}
    <code class="hex">{current}</code>
    {#snippet trailing()}
      <Icon name="chevron-down" size="sm" />
    {/snippet}
  </Button>
{/snippet}

{#if label}
  <div class={['sui-color-picker', className]}>
    <Field {label} id={rest.id ?? `${uid}-trigger`} control={trigger} />
  </div>
{:else}
  {@render trigger()}
{/if}

<Popover
  id={popoverId}
  anchor={element}
  bind:open
  role="dialog"
  aria-label="Pick a color"
  onkeydown={commitOnEnter}
>
  <div
    class="panel"
    style:--sui-color-picker-value={current}
    style:--sui-color-picker-hue={hueColor}
    style:--sui-color-picker-x="{hsv.s * 100}%"
    style:--sui-color-picker-y="{(1 - hsv.v) * 100}%"
    style:--sui-color-picker-h="{(hsv.h / 360) * 100}%"
  >
    {#if palette.length > 0}
      <div bind:this={grid} class="swatches" role="radiogroup" aria-label="Swatches">
        {#each palette as swatch (swatch)}
          <span class="cell">
            <input
              type="radio"
              class="swatch"
              name="{uid}-swatch"
              value={swatch}
              aria-label="Color {swatch}"
              checked={swatch === current}
              style:--sui-color-picker-swatch={swatch}
              onchange={() => pick(swatch)}
              onclick={(event) => {
                if (event.detail > 0) close();
              }}
            />
            {#if swatch === current}
              <!-- A light halo under a dark check, or the reverse in dark, reads on any swatch. -->
              <span class="check" aria-hidden="true">
                <span class="halo"><Icon name="check" size="sm" strokeWidth={5} /></span>
                <span class="ink"><Icon name="check" size="sm" strokeWidth={2} /></span>
              </span>
            {/if}
          </span>
        {/each}
      </div>
    {/if}

    <div
      bind:this={area}
      class="area"
      role="slider"
      tabindex="0"
      aria-label="Saturation and brightness"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={saturation}
      aria-valuetext="Saturation {saturation}%, brightness {brightness}%"
      style:background-image={plane(hueColor)}
      onpointerdown={(event) => dragStart(event, 'area')}
      onpointermove={dragMove}
      onpointerup={dragEnd}
      onpointercancel={dragEnd}
      onkeydown={areaKeys}
    >
      <span class="knob"></span>
    </div>

    <div
      class="hue"
      role="slider"
      tabindex="0"
      aria-label="Hue"
      aria-valuemin={0}
      aria-valuemax={360}
      aria-valuenow={Math.round(hsv.h)}
      aria-valuetext="{Math.round(hsv.h)} degrees"
      style:background-image={HUE_RAIL}
      onpointerdown={(event) => dragStart(event, 'hue')}
      onpointermove={dragMove}
      onpointerup={dragEnd}
      onpointercancel={dragEnd}
      onkeydown={hueKeys}
    >
      <span class="thumb"></span>
    </div>

    <TextInput
      bind:element={hexInput}
      bind:value={hexField}
      mono
      aria-label="Hex color"
      invalid={hexInvalid}
      aria-describedby={hexInvalid ? errorId : undefined}
      spellcheck="false"
      autocomplete="off"
      maxlength={7}
      oninput={typeHex}
      onblur={() => (hexInvalid = parseHex(hexField) === null)}
    />
    {#if hexInvalid}
      <p id={errorId} class="error">
        <Icon name="alert" size="xs" />
        <span>Use a hex color such as #0e8a16</span>
      </p>
    {/if}
  </div>
</Popover>

<style>
  /* Registered so the swatch's state veil interpolates, the same way `Button` does it. */
  @property --sui-color-picker-layer {
    syntax: '<color>';
    inherits: false;
    initial-value: transparent;
  }

  .mark,
  .panel {
    --sui-color-picker-hairline: color-mix(in srgb, var(--sui-text-primary) 14%, transparent);
  }

  /* A swatch's ring is its own colour, its lightness clamped into the band that holds 3:1 on
     the ground. A colour that already contrasts is unchanged, so its ring vanishes into it; one
     that does not gets the nearest shade of itself that does, never a grey line (L-93). */
  .mark {
    --sui-color-picker-ring: oklch(
      from var(--sui-color-picker-value)
        clamp(var(--sui-swatch-edge-floor), l, var(--sui-swatch-edge-ceiling)) c h
    );
    background-color: var(--sui-color-picker-value);
    block-size: var(--sui-icon-base);
    border-radius: 50%;
    box-shadow: inset 0 0 0 1px var(--sui-color-picker-ring);
    flex: none;
    inline-size: var(--sui-icon-base);
  }

  .hex {
    font-family: var(--sui-mono);
    font-variant-numeric: tabular-nums;
    font-weight: 400;
  }

  .panel {
    box-sizing: border-box;
    display: grid;
    gap: var(--sui-space-2);
    /* The token is the popover's outer width, so the popover's 1px border comes off it. */
    inline-size: calc(var(--sui-cp-width) - 2px);
    padding: var(--sui-cp-pad);
  }

  .swatches {
    display: grid;
    gap: var(--sui-cp-gap);
    grid-template-columns: repeat(var(--sui-cp-cols), var(--sui-cp-cell));
  }

  .cell {
    display: grid;
    transition: translate var(--sui-duration-press) var(--sui-ease-standard);
  }

  .cell:active {
    translate: 0 1px;
  }

  .swatch {
    --sui-color-picker-layer: transparent;
    appearance: none;
    background-color: var(--sui-color-picker-swatch);
    background-image: linear-gradient(var(--sui-color-picker-layer), var(--sui-color-picker-layer));
    block-size: var(--sui-cp-cell);
    border: 1px solid
      oklch(
        from var(--sui-color-picker-swatch)
          clamp(var(--sui-swatch-edge-floor), l, var(--sui-swatch-edge-ceiling)) c h
      );
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    cursor: pointer;
    grid-area: 1 / 1;
    inline-size: var(--sui-cp-cell);
    margin: 0;
    transition:
      --sui-color-picker-layer var(--sui-duration-fast) var(--sui-ease-standard),
      box-shadow var(--sui-duration-press) var(--sui-ease-standard);
  }

  .swatch:hover:not(:active) {
    --sui-color-picker-layer: var(--sui-interactive-hover-layer);
  }

  .swatch:active {
    --sui-color-picker-layer: var(--sui-interactive-pressed);
    box-shadow: var(--sui-pressed-inset);
  }

  .swatch:focus-visible,
  .area:focus-visible,
  .hue:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-offset);
  }

  .check {
    display: grid;
    grid-area: 1 / 1;
    place-items: center;
    pointer-events: none;
  }

  .check > span {
    display: flex;
    grid-area: 1 / 1;
  }

  .halo {
    color: var(--sui-popover-bg);
  }

  .ink {
    color: var(--sui-text-primary);
  }

  .area {
    block-size: var(--sui-cp-area-height);
    border-radius: var(--sui-radius-control);
    box-shadow: inset 0 0 0 1px var(--sui-color-picker-hairline);
    cursor: crosshair;
    position: relative;
    touch-action: none;
  }

  /* Both knobs track the pointer raw: a knob that eases behind a drag reads as broken. The
     two rings, the thumb material inside the strong border, hold on every color. */
  .knob,
  .thumb {
    border: 2px solid var(--sui-switch-thumb);
    border-radius: 50%;
    box-shadow: 0 0 0 1px var(--sui-border-strong);
    box-sizing: border-box;
    pointer-events: none;
    position: absolute;
    translate: -50% -50%;
  }

  .knob {
    background-color: var(--sui-color-picker-value);
    block-size: var(--sui-cp-knob);
    inline-size: var(--sui-cp-knob);
    inset-block-start: var(--sui-color-picker-y);
    inset-inline-start: var(--sui-color-picker-x);
  }

  .hue {
    block-size: var(--sui-cp-hue-height);
    border-radius: var(--sui-radius-chip);
    cursor: pointer;
    /* The thumb's own radius, so its centre reaches both ends of the rail. */
    margin-inline: calc(var(--sui-cp-hue-thumb) / 2);
    position: relative;
    touch-action: none;
  }

  .thumb {
    background-color: var(--sui-color-picker-hue);
    block-size: var(--sui-cp-hue-thumb);
    inline-size: var(--sui-cp-hue-thumb);
    inset-block-start: 50%;
    inset-inline-start: var(--sui-color-picker-h);
  }

  .error {
    align-items: center;
    color: var(--sui-danger);
    display: flex;
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    gap: var(--sui-space-1);
    margin: 0;
  }

  .error > span {
    block-size: var(--sui-block-snap);
    text-box: trim-both cap alphabetic;
  }

  @media (prefers-reduced-motion: reduce) {
    .cell,
    .swatch {
      transition: none;
    }

    .cell:active {
      translate: none;
    }
  }
</style>
