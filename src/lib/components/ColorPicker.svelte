<script module lang="ts">
  type Hsv = { h: number; s: number; v: number };

  /** A hex, or a hex with the name a screen reader hears for it. */
  export type ColorSwatch = string | { value: string; label: string };

  // These literals are the user's data and the color space itself: the default swatches a
  // caller can replace, and the gradients that draw hue, saturation and value. They are not
  // paint, so they live here and never in the palette or the style block.
  const DEFAULT_SWATCHES: readonly ColorSwatch[] = [
    { value: '#b60205', label: 'Red' },
    { value: '#d93f0b', label: 'Orange' },
    { value: '#fbca04', label: 'Yellow' },
    { value: '#0e8a16', label: 'Green' },
    { value: '#006b75', label: 'Teal' },
    { value: '#1d76db', label: 'Blue' },
    { value: '#0052cc', label: 'Dark blue' },
    { value: '#5319e7', label: 'Violet' },
    { value: '#e99695', label: 'Pale red' },
    { value: '#f9d0c4', label: 'Peach' },
    { value: '#fef2c0', label: 'Cream' },
    { value: '#c2e0c6', label: 'Pale green' },
    { value: '#bfdadc', label: 'Pale teal' },
    { value: '#c5def5', label: 'Pale blue' },
    { value: '#bfd4f2', label: 'Lavender blue' },
    { value: '#d4c5f9', label: 'Lavender' }
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

  // ponytail: nine hue families and three tones, enough to tell swatches apart by ear; a
  // caller who needs finer names gives each swatch a `label` or replaces `colorName`.
  const HUES: readonly [number, string][] = [
    [15, 'Red'],
    [40, 'Orange'],
    [65, 'Yellow'],
    [160, 'Green'],
    [195, 'Teal'],
    [250, 'Blue'],
    [290, 'Violet'],
    [335, 'Pink'],
    [360, 'Red']
  ];

  /** A plain English name for a hex, such as "Dark blue" or "Pale green". */
  function describeColor(hex: string): string {
    const { h, s, v } = hexToHsv(hex);
    if (s < 0.12) return v < 0.15 ? 'Black' : v > 0.92 ? 'White' : v < 0.45 ? 'Dark gray' : 'Gray';
    const hue = HUES.find(([end]) => h < end)?.[1] ?? 'Red';
    if (v < 0.45) return `Dark ${hue.toLowerCase()}`;
    if (s < 0.35 && v > 0.8) return `Pale ${hue.toLowerCase()}`;
    return hue;
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
  import { mark, word } from '../words.js';
  import { tick } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import { pageLocale } from '../internal/locale.js';
  import Button from './Button.svelte';
  import Field, { type FieldControl } from './Field.svelte';
  import Popover from './Popover.svelte';
  import TextInput from './TextInput.svelte';
  import VisuallyHidden from './VisuallyHidden.svelte';

  const uid = $props.id();
  const percent = new Intl.NumberFormat(pageLocale(), { style: 'percent' });
  const whole = new Intl.NumberFormat(pageLocale());

  let {
    value = $bindable(),
    swatches = DEFAULT_SWATCHES.map((swatch) =>
      typeof swatch === 'string'
        ? swatch
        : { ...swatch, label: word(`ColorPicker.swatch.${swatch.value}`, swatch.label) }
    ),
    label,
    disabled = false,
    name,
    dialogLabel = word('ColorPicker.dialogLabel', 'Pick a color'),
    swatchesLabel = word('ColorPicker.swatchesLabel', 'Swatches'),
    colorName = word('ColorPicker.colorName', describeColor),
    swatchName = word(
      'ColorPicker.swatchName',
      (hex: string, named?: string) => `${named ?? colorName(hex)}${mark('comma')}${hex}`
    ),
    areaLabel = word('ColorPicker.areaLabel', 'Saturation and brightness'),
    areaValue = word(
      'ColorPicker.areaValue',
      (saturation: number, brightness: number) =>
        `Saturation ${percent.format(saturation / 100)}, brightness ${percent.format(brightness / 100)}`
    ),
    hueLabel = word('ColorPicker.hueLabel', 'Hue'),
    hueValue = word('ColorPicker.hueValue', (degrees: number) =>
      degrees === 1 ? '1 degree' : `${whole.format(degrees)} degrees`
    ),
    hexLabel = word('ColorPicker.hexLabel', 'Hex color'),
    hexError = word('ColorPicker.hexError', 'Use a hex color such as #0e8a16'),
    triggerName = word(
      'ColorPicker.triggerName',
      (field: string, hex: string) => `${field}${mark('space')}${hex}`
    ),
    onchange,
    element = $bindable(null),
    class: className = '',
    onclick,
    ...rest
  }: {
    /** The color as `#rrggbb`. It follows the picker live while the popover is open. */
    value: string;
    /** The one-press choices, in reading order; a named one is read by its name and hex. */
    swatches?: readonly ColorSwatch[];
    /** Draws a `Field` label over the trigger. Inside a `Field` of your own, leave it off. */
    label?: string;
    disabled?: boolean;
    /** Posts the hex with a form. */
    name?: string;
    /** The popover's accessible name. */
    dialogLabel?: string;
    /** The swatch group's accessible name. */
    swatchesLabel?: string;
    /** Names a swatch given as a bare hex, such as "Dark blue"; plain English by default. */
    colorName?: (hex: string) => string;
    /** A swatch's accessible name from its hex and its name, its `label` or else `colorName`. */
    swatchName?: (hex: string, named?: string) => string;
    /** Drawn over the saturation and brightness area, and its name. */
    areaLabel?: string;
    /** The area's value in words, from percentages. */
    areaValue?: (saturation: number, brightness: number) => string;
    /** Drawn over the hue rail, and its name. */
    hueLabel?: string;
    /** The rail's value in words, from degrees. */
    hueValue?: (degrees: number) => string;
    /** Drawn over the hex field, and its name. */
    hexLabel?: string;
    /** Said under the hex field when it does not hold a hex color. */
    hexError?: string;
    /** The trigger's accessible name from the field's label and the hex. */
    triggerName?: (field: string, hex: string) => string;
    /** Hears the color each time the popover closes on a new one. */
    onchange?: (hex: string) => void;
    element?: HTMLButtonElement | HTMLAnchorElement | null;
    /** Layout for the call site only, never the trigger's own paint. */
    class?: HTMLButtonAttributes['class'];
  } & Omit<
    HTMLButtonAttributes,
    'value' | 'children' | 'popovertarget' | 'name' | 'onchange'
  > = $props();

  const popoverId = `${uid}-popover`;
  const errorId = `${uid}-error`;
  const hexId = `${uid}-hex`;

  let open = $state(false);
  // The picker owns its hue: a grey's hex has none to read back, so the hue survives here
  // instead of snapping to red whenever the saturation or the brightness touches zero.
  let hsv = $state<Hsv>({ h: 0, s: 0, v: 0 });
  let hexField = $state('');
  let hexInvalid = $state(false);
  let hexInput = $state<HTMLInputElement | null>(null);
  let grid = $state<HTMLElement | null>(null);
  let area = $state<HTMLElement | null>(null);
  let box = $state<HTMLElement | null>(null);
  let drag: { target: HTMLElement; kind: 'area' | 'hue' } | null = null;
  // The color the popover opened on, which Escape goes back to.
  let start = { hex: '', hsv: { h: 0, s: 0, v: 0 } };

  const current = $derived(parseHex(value) ?? value);
  /* A `<label for>` would replace the trigger's words as its name, so the name is the
     label's words and the hex together, and a reader hears which color it holds. */
  const labelled = $derived(
    [...(element && 'labels' in element ? element.labels : [])]
      .map((node) => node.textContent?.trim())
      .filter(Boolean)
      .join(mark('space')) || rest['aria-label']
  );
  const accessibleName = $derived(labelled ? triggerName(labelled, current) : undefined);
  const palette = $derived.by(() => {
    const seen = new Map<string, string | undefined>();
    for (const swatch of swatches) {
      const hex = (typeof swatch === 'string' ? swatch : swatch.value).toLowerCase();
      if (!seen.has(hex)) seen.set(hex, typeof swatch === 'string' ? undefined : swatch.label);
    }
    return [...seen].map(([hex, named]) => ({ hex, named }));
  });
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
      start = { hex: current, hsv: { ...hsv } };
    }
    onclick?.(event);
  }

  $effect(() => {
    if (!open) return;
    void tick().then(() => {
      const first =
        grid?.querySelector<HTMLInputElement>('input:checked') ??
        grid?.querySelector<HTMLInputElement>('input') ??
        area;
      first?.focus({ preventScroll: true });
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

  function closed() {
    if (current !== start.hex) onchange?.(current);
  }

  function dragMove(event: PointerEvent) {
    if (!drag) return;
    const bounds = drag.target.getBoundingClientRect();
    const x = clamp((event.clientX - bounds.left) / bounds.width);
    if (drag.kind === 'hue') apply({ ...hsv, h: x * 360 });
    else apply({ ...hsv, s: x, v: 1 - clamp((event.clientY - bounds.top) / bounds.height) });
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

  function keys(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      // Escape is the way back: the color the picker opened on returns, typed hex and all.
      hsv = { ...start.hsv };
      value = start.hex;
      hexField = start.hex;
      hexInvalid = false;
      return;
    }
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
and a hex field, each with its words drawn over it. Reach for it only when the color is the
user's own data, such as a label color; a theme never needs one.

The value follows the picker live, so `bind:value` sees every step of a drag. Arrows move
the knob and the hue thumb (Shift for bigger steps) and walk the swatches. Home and End take
the area to no or full saturation and the rail to its ends. Enter commits and closes, a
swatch press does the same, Escape closes and goes back to the color the picker opened on,
and Tab past the last stop closes it and moves on. A grey keeps the hue it had, so dragging
through it never snaps the rail to red. The area and the rail are a color space, not a line
of text, so they read left to right in every direction, as a chart's plot does.

`label` draws a visible `Field` label over the trigger. Inside a `Field` of your own, spread
the field's `id` and `describedby` onto it and leave `label` off. Either way the trigger's
name is the label and the hex, such as "Label color #0f766e". `name` posts the hex.

- Semantics: a `Button` with `aria-haspopup="dialog"` and `aria-expanded`, a `role="dialog"` popover named by `dialogLabel`, a radio group of swatches, two `role="slider"` controls, a hex text field, and a hidden input that posts the hex.
- Content: the caller's swatches, named or by hex, the area, the rail and the hex field, each with its drawn words.
- States: closed, open, a checked swatch (a check mark), hover and pressed swatches, dragging, an invalid hex (an error with a warning mark) and a disabled trigger.
- Keyboard: Enter or Space opens it, Tab walks the swatches, area, rail and hex, the arrows move each, Enter commits, Escape goes back and closes, and Tab past the hex closes it.
- Pointer and touch: the trigger is 34px, or 44px on a phone or any touch screen, where swatches are 44px and the rail's hit area 44px tall; every drag has keys.
- Focus: opening focuses the checked swatch, or the first, or the area; Enter, a swatch press and Escape return focus to the trigger, and Tab out lets it move on.
- Responsive: the popover is the swatch grid's width, six swatches a row on a touch screen, and stays inside the viewport.
- Accessibility: every part has a name, the sliders say their values in words, the hex error is spoken, and a swatch that does not hold 3:1 wears a ring of its own colour that does.
- Localization: every word and value text is a prop with an English default, percentages and degrees follow the page language, and the panel's layout is logical while the color space stays left to right.
- Performance: a drag writes `value` on every pointer move, and nothing animates but a swatch's 1px press.
- Analytics: `onchange` hears the color each time the popover closes on a new one.
- Failure: a hex that does not read stays in the field with its reason, and Escape takes the color back to where it started.
-->

{#snippet trigger(field?: FieldControl)}
  <Button
    bind:element
    {...rest}
    id={field?.id ?? rest.id}
    aria-describedby={field?.describedby ?? rest['aria-describedby']}
    aria-label={accessibleName}
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
{/if}{#if name}<input
    type="hidden"
    {name}
    value={current}
    form={rest.form}
    {disabled}
  />{/if}<Popover
  id={popoverId}
  anchor={element}
  bind:open
  bind:element={box}
  role="dialog"
  aria-label={dialogLabel}
  onkeydown={keys}
  closeOnLeave
  onclose={closed}
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
      <div bind:this={grid} class="swatches" role="radiogroup" aria-label={swatchesLabel}>
        {#each palette as swatch (swatch.hex)}
          <span class="cell">
            <input
              type="radio"
              class="swatch"
              name="{uid}-swatch"
              value={swatch.hex}
              aria-label={swatchName(swatch.hex, swatch.named)}
              checked={swatch.hex === current}
              style:--sui-color-picker-swatch={swatch.hex}
              onchange={() => pick(swatch.hex)}
              onclick={(event) => {
                if (event.detail > 0) close();
              }}
            />
            {#if swatch.hex === current}
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

    <div class="part">
      <span id="{uid}-area-label" class="part-label">{areaLabel}</span>
      <div
        bind:this={area}
        class="area"
        dir="ltr"
        role="slider"
        tabindex="0"
        aria-labelledby="{uid}-area-label"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={saturation}
        aria-valuetext={areaValue(saturation, brightness)}
        style:background-image={plane(hueColor)}
        onpointerdown={(event) => dragStart(event, 'area')}
        onpointermove={dragMove}
        onpointerup={dragEnd}
        onpointercancel={dragEnd}
        onkeydown={areaKeys}
      >
        <span class="knob"></span>
      </div>
    </div>

    <div class="part">
      <span id="{uid}-hue-label" class="part-label">{hueLabel}</span>
      <div
        class="hue"
        dir="ltr"
        role="slider"
        tabindex="0"
        aria-labelledby="{uid}-hue-label"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hsv.h)}
        aria-valuetext={hueValue(Math.round(hsv.h))}
        style:background-image={HUE_RAIL}
        onpointerdown={(event) => dragStart(event, 'hue')}
        onpointermove={dragMove}
        onpointerup={dragEnd}
        onpointercancel={dragEnd}
        onkeydown={hueKeys}
      >
        <span class="thumb"></span>
      </div>
    </div>

    <div class="part">
      <label for={hexId} class="part-label">{hexLabel}</label>
      <TextInput
        id={hexId}
        bind:element={hexInput}
        bind:value={hexField}
        mono
        invalid={hexInvalid}
        aria-describedby={hexInvalid ? errorId : undefined}
        spellcheck="false"
        autocomplete="off"
        maxlength={7}
        oninput={typeHex}
        onblur={() => (hexInvalid = parseHex(hexField) === null)}
      />
      <!-- The status speaks the error, so the drawn copy stays out of the tree; the field's
           description still reads it. -->
      {#if hexInvalid}
        <p id={errorId} class="error" aria-hidden="true">
          <span class="error-mark"><Icon name="alert" size="xs" /></span>
          <span class="error-words">{hexError}</span>
        </p>
      {/if}
      <VisuallyHidden role="status">{hexInvalid ? hexError : ''}</VisuallyHidden>
    </div>
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
    box-shadow: inset 0 0 0 var(--sui-stroke) var(--sui-color-picker-ring);
    flex: none;
    inline-size: var(--sui-icon-base);
  }

  .hex {
    font-family: var(--sui-mono);
    font-variant-numeric: tabular-nums;
    font-weight: var(--sui-weight-regular);
  }

  .panel {
    box-sizing: border-box;
    display: grid;
    gap: var(--sui-space-3);
    /* The token is the popover's outer width, so the popover's 1px border comes off it. */
    inline-size: calc(var(--sui-cp-width) - 2 * var(--sui-stroke));
    padding: var(--sui-cp-pad);
  }

  /* A part's words sit closer to it than the parts sit to each other. */
  .part {
    display: grid;
    gap: var(--sui-row-copy-gap);
  }

  .part-label {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-semibold) var(--sui-font-size-control) / var(--sui-row-copy-leading)
      var(--sui-sans);
    text-box: trim-both cap alphabetic;
  }

  .swatches {
    display: grid;
    gap: var(--sui-cp-gap);
    grid-template-columns: repeat(var(--sui-cp-cols), var(--sui-cp-cell));
  }

  .cell {
    display: grid;
    transition: translate var(--sui-duration-press) var(--sui-ease-standard);
    -webkit-user-select: none;
    user-select: none;
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
    border: var(--sui-stroke) solid
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

  @media (hover: hover) {
    .swatch:hover:not(:active) {
      --sui-color-picker-layer: var(--sui-interactive-hover-layer);
    }
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
    box-shadow: inset 0 0 0 var(--sui-stroke) var(--sui-color-picker-hairline);
    cursor: crosshair;
    position: relative;
    touch-action: none;
    -webkit-user-select: none;
    user-select: none;
  }

  /* Both knobs track the pointer raw: a knob that eases behind a drag reads as broken. The
     two rings, the thumb material inside the strong border, hold on every color. */
  .knob,
  .thumb {
    border: var(--sui-stroke-bold) solid var(--sui-switch-thumb);
    border-radius: 50%;
    box-shadow: 0 0 0 var(--sui-stroke) var(--sui-border-strong);
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
    border-radius: var(--sui-radius-pill);
    cursor: pointer;
    /* The thumb's own radius, so its centre reaches both ends of the rail. */
    margin-inline: calc(var(--sui-cp-hue-thumb) / 2);
    position: relative;
    touch-action: none;
    -webkit-user-select: none;
    user-select: none;
  }

  .thumb {
    background-color: var(--sui-color-picker-hue);
    block-size: var(--sui-cp-hue-thumb);
    inline-size: var(--sui-cp-hue-thumb);
    inset-block-start: 50%;
    inset-inline-start: var(--sui-color-picker-h);
  }

  .error {
    align-items: start;
    color: var(--sui-danger);
    column-gap: var(--sui-space-1);
    display: grid;
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    grid-template-columns: auto minmax(0, 1fr);
    margin: 0;
  }

  /* Centred on the first line's cap height, however many lines the error wraps to. */
  .error-mark {
    display: flex;
    margin-block: round(calc((1cap - var(--sui-icon-xs)) / 2), 1px);
  }

  .error-words {
    block-size: var(--sui-block-snap);
    min-inline-size: 0;
    overflow-wrap: anywhere;
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

  /* A finger needs 44px targets (L-38): six swatches a row at the touch size, which keeps the
     popover inside a 320px screen, and a rail whose hit area grows past its drawn height. */
  @media (pointer: coarse), (max-width: 47.9375rem) {
    .panel {
      inline-size: calc(
        6 * var(--sui-touch-target) + 5 * var(--sui-cp-gap) + 2 * var(--sui-cp-pad)
      );
    }

    .swatches {
      grid-template-columns: repeat(6, var(--sui-touch-target));
    }

    .swatch {
      block-size: var(--sui-touch-target);
      inline-size: var(--sui-touch-target);
    }

    .hue::before {
      content: '';
      inset-block: calc((100% - var(--sui-touch-target)) / 2);
      inset-inline: calc(-1 * var(--sui-cp-hue-thumb) / 2);
      position: absolute;
    }
  }

  /* The colors are the reader's data, so high contrast keeps them as they are. */
  @media (forced-colors: active) {
    .mark,
    .swatch,
    .area,
    .hue,
    .knob,
    .thumb {
      forced-color-adjust: none;
    }
  }
</style>
