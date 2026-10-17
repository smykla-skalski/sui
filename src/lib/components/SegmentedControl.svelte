<script module lang="ts">
  import type { IconName } from '../icons/Icon.svelte';

  export type SegmentOption = {
    value: string;
    label: string;
    /** Drawn before the label, which stays visible. Dropped when the control falls back to a select. */
    icon?: IconName;
    /** A count beside the label. The fallback select says it in brackets, such as "Users (24)". */
    count?: number | string;
    /** Keeps an unavailable option visible while the keyboard skips it. */
    disabled?: boolean;
  };
</script>

<script lang="ts">
  import { untrack } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import Select from './Select.svelte';

  const id = $props.id();

  let {
    label,
    options,
    value = $bindable(null),
    name = id,
    disabled = false,
    element = $bindable(null),
    'aria-describedby': describedby,
    class: className = '',
    ...rest
  }: {
    /** Names the choice for assistive technology. It is never drawn. */
    label: string;
    /** Two to five options. More belong in a `Select`. */
    options: ReadonlyArray<SegmentOption>;
    /** `null` selects nothing and draws no thumb. */
    value?: string | null;
    name?: string;
    disabled?: boolean;
    /** The outer box, which holds the segments or, short of room, the select. */
    element?: HTMLDivElement | null;
    /** Layout for the call site only, never the control's own paint. */
    class?: HTMLAttributes<HTMLDivElement>['class'];
  } & Omit<HTMLAttributes<HTMLDivElement>, 'children'> = $props();

  let track = $state<HTMLFieldSetElement | null>(null);
  let fits = $state(true);
  let thumb = $state<{ option: string; left: number; width: number } | null>(null);
  let ready = $state(false);
  // The option a dragged thumb is held over. The thumb and the words follow it, and the
  // value only takes it when the pointer lets go.
  let held = $state<string | null>(null);
  const shown = $derived(held ?? value);

  const choices = $derived(
    options.map((option) => ({
      value: option.value,
      label: option.count === undefined ? option.label : `${option.label} (${option.count})`,
      disabled: option.disabled
    }))
  );

  // The box is as wide as the copy's natural width or the room, whichever is less, and the
  // select contributes no width, so swapping between the two never changes what is measured.
  function fit(box: HTMLElement) {
    const natural = box.querySelector('.sui-segmented-ruler');
    if (!natural) return;
    const observer = new ResizeObserver(() => {
      fits = box.getBoundingClientRect().width + 0.5 >= natural.getBoundingClientRect().width;
    });
    observer.observe(box);
    observer.observe(natural);
    return () => observer.disconnect();
  }

  // ponytail: ignores `zoom` and scale transforms on ancestors; multiply their factors into
  // the measurement if the control ever has to sit inside a scaled subtree.
  function measure() {
    if (!track) return;
    const input =
      held === null ? track.querySelector<HTMLInputElement>('input:checked') : radio(held);
    const box = input?.closest('label')?.getBoundingClientRect();
    // A closed popover reports no box, which is not a position: wait to be measured again.
    if (!input || !box || box.width === 0) {
      thumb = null;
      ready = false;
      return;
    }
    const own = track.getBoundingClientRect();
    const next = {
      option: input.value,
      left: box.left - own.left - track.clientLeft,
      width: box.width
    };
    if (thumb?.left === next.left && thumb.width === next.width) return;
    // Only a new selection travels. The same option measuring differently (a font landed, a
    // count arrived, a neighbour grew) is placed again, so nothing slides under a still reader.
    if (thumb?.option === next.option) ready = false;
    thumb = next;
  }

  $effect(() => {
    void shown;
    untrack(measure);
  });

  const radio = (option: string) =>
    [...(track?.querySelectorAll<HTMLInputElement>('input') ?? [])].find(
      (input) => input.value === option
    ) ?? null;

  // THE THUMB CAN BE DRAGGED, as a platform segmented control's can: press on the selected
  // option, move past a few pixels, and the thumb follows the pointer from option to option,
  // skipping disabled ones. Letting go chooses where it stands, through the radio itself so
  // `change` fires as for a click; Escape or a cancelled pointer puts it back. Below the
  // threshold nothing is captured, so a plain click keeps its native behaviour. Dragging is
  // never the only way: a click or the arrow keys choose any option (WCAG 2.5.7).
  const DRAG_THRESHOLD = 4;
  let drag: { pointer: number; x: number; captured: boolean } | null = null;

  function optionAt(x: number): string | null {
    const enabled = [...(track?.querySelectorAll<HTMLLabelElement>('label') ?? [])].filter(
      (option) => !option.querySelector('input')?.disabled
    );
    if (enabled.length === 0) return null;
    const boxes = enabled.map((option) => option.getBoundingClientRect());
    const index = boxes.findIndex((box) => x < box.right);
    const at = enabled[index === -1 ? enabled.length - 1 : index];
    return at.querySelector('input')?.value ?? null;
  }

  function grab(event: PointerEvent) {
    if (disabled || event.button !== 0 || value === null) return;
    const option = (event.target as Element).closest('label');
    if (!option?.classList.contains('selected')) return;
    drag = { pointer: event.pointerId, x: event.clientX, captured: false };
  }

  function follow(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.pointer || !track) return;
    if (!drag.captured) {
      if (Math.abs(event.clientX - drag.x) < DRAG_THRESHOLD) return;
      track.setPointerCapture(event.pointerId);
      drag.captured = true;
    }
    const over = optionAt(event.clientX);
    if (over !== null) held = over === value ? null : over;
  }

  function release(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.pointer) return;
    const target = drag.captured ? held : null;
    drop();
    if (target === null) return;
    const input = radio(target);
    input?.click();
    input?.focus({ preventScroll: true });
  }

  function drop() {
    drag = null;
    held = null;
  }

  function escape(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !drag?.captured) return;
    event.preventDefault();
    track?.releasePointerCapture(drag.pointer);
    drop();
  }

  $effect(() => {
    const node = track;
    void options;
    if (!node) return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(node);
    for (const option of node.querySelectorAll('label')) observer.observe(option);
    return () => {
      observer.disconnect();
      // Segments that come back after the select land again, never slide in from an old place.
      thumb = null;
      ready = false;
    };
  });

  $effect(() => {
    if (!thumb || ready) return;
    // Commit the placement before the transition switches on, so it lands instead of sliding.
    track?.getBoundingClientRect();
    ready = true;
  });
</script>

<!--
@component
One choice from two to five options a reader can see all at once. Six or more belong in a
`Select`, and answers that each need a sentence are `ChoiceCards`.

The selection is one solid thumb exactly as wide as its option and held 2px inside the track. It
lands without sliding on first paint, travels 240ms between options, and is not drawn at all for
`null`, which is how a control says its value is inherited, not chosen.

The thumb can be dragged: press the selected option and move, and the thumb and its ink follow
the pointer from option to option, skipping disabled ones. Letting go chooses where it stands and
fires `change` as a click would; Escape or a cancelled pointer puts it back. A click or the arrow
keys reach every option too, so the drag is never the only way.

Short of room, the control draws the same choice as a native `Select`, with icons dropped and
counts in brackets, such as "Users (24)". An inert, hidden copy of the segments, with no inputs,
measures their natural width against the room through a `ResizeObserver`. `aria-describedby`
reaches the group or the select, and other attributes and events land on the outer box, so
`onchange` hears a pick in either form.

The segments are native radios under a hidden legend, so the arrow keys move the choice and skip
disabled options. The thumb is measured from the checked option because CSS cannot size one box
from a sibling.
-->

{#snippet face(option: SegmentOption)}
  {#if option.icon}<Icon name={option.icon} size="sm" />{/if}
  <span class="sui-segmented-word">{option.label}</span>
  {#if option.count !== undefined}
    <span class="sui-segmented-count"><span>{option.count}</span></span>
  {/if}
{/snippet}

<div bind:this={element} {...rest} class={['sui-segmented', className]} {@attach fit}>
  <div class="sui-segmented-measure" aria-hidden="true" inert>
    <div class="sui-segmented-track sui-segmented-ruler">
      {#each options as option (option.value)}
        <span class="sui-segmented-option">
          <span class="sui-segmented-label">{@render face(option)}</span>
        </span>
      {/each}
    </div>
  </div>
  {#if fits}
    <!-- The radios are the controls. The track only follows a drag that starts on the
         selected one, and Escape cancels that drag. -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <fieldset
      bind:this={track}
      class={['sui-segmented-track', { ready, dragging: held !== null }]}
      {disabled}
      aria-describedby={describedby}
      onpointerdown={grab}
      onpointermove={follow}
      onpointerup={release}
      onpointercancel={drop}
      onkeydown={escape}
    >
      <legend class="sui-segmented-legend">{label}</legend>
      {#if thumb}
        <span
          class="sui-segmented-thumb"
          style:translate="{thumb.left}px 0"
          style:inline-size="{thumb.width}px"
          aria-hidden="true"
        ></span>
      {/if}
      {#each options as option (option.value)}
        <label
          class="sui-segmented-option"
          class:selected={shown === option.value}
          class:disabled={option.disabled}
        >
          <input
            type="radio"
            class="sui-segmented-input"
            {name}
            value={option.value}
            bind:group={value}
            disabled={option.disabled}
          />
          <span class="sui-segmented-label">{@render face(option)}</span>
        </label>
      {/each}
    </fieldset>
  {:else}
    <div class="sui-segmented-picker">
      <Select
        options={choices}
        bind:value
        aria-label={label}
        aria-describedby={describedby}
        {name}
        {disabled}
      />
    </div>
  {/if}
</div>

<style>
  .sui-segmented {
    display: inline-grid;
    grid-template-columns: minmax(0, max-content);
    max-inline-size: 100%;
    min-inline-size: 0;
    vertical-align: middle;
  }

  .sui-segmented > * {
    grid-area: 1 / 1;
  }

  .sui-segmented-measure {
    block-size: 0;
    overflow: hidden;
    visibility: hidden;
  }

  .sui-segmented-ruler {
    inline-size: max-content;
  }

  /* Holds no width of its own, so the select never widens the box it was measured against. */
  .sui-segmented-picker {
    contain: inline-size;
    min-inline-size: 0;
  }

  .sui-segmented-track {
    background: var(--sui-segment-track);
    block-size: var(--sui-local-control-height, var(--sui-control-height-compact));
    border: 0;
    /* A surface radius around a control-radius thumb, 2px in, keeps the two curves concentric. */
    border-radius: var(--sui-radius-surface);
    box-shadow: inset 0 0 0 1px var(--sui-border-subtle);
    box-sizing: border-box;
    display: flex;
    /* Fills, thumb and words stack inside the track alone: fill, then thumb, then words. */
    isolation: isolate;
    margin: 0;
    min-inline-size: 0;
    padding: var(--sui-control-inset);
    position: relative;
  }

  /* A horizontal drag on the track moves the thumb; a vertical one still scrolls the page. */
  .sui-segmented-track:not(:disabled) {
    touch-action: pan-y;
  }

  .sui-segmented-track.dragging,
  .sui-segmented-track.dragging .sui-segmented-option {
    cursor: grabbing;
  }

  .sui-segmented-track:not(:disabled) .sui-segmented-option.selected {
    cursor: grab;
  }

  .sui-segmented-track:disabled {
    opacity: var(--sui-disabled-opacity);
  }

  .sui-segmented-legend {
    block-size: 1px;
    clip-path: inset(50%);
    inline-size: 1px;
    overflow: hidden;
    padding: 0;
    position: absolute;
    white-space: nowrap;
  }

  /* A plate seated on the track by a small drop shadow, rounded on all four wherever it
     stands. */
  .sui-segmented-thumb {
    background: var(--sui-segment-thumb);
    border-radius: var(--sui-radius-control);
    box-shadow: var(--sui-segment-thumb-shadow);
    inset-block: var(--sui-control-inset);
    left: 0;
    pointer-events: none;
    position: absolute;
    z-index: 2;
  }

  .ready .sui-segmented-thumb {
    transition:
      translate var(--sui-duration-travel) var(--sui-ease-travel),
      inline-size var(--sui-duration-travel) var(--sui-ease-travel),
      background-color var(--sui-duration-fast) var(--sui-ease-standard),
      box-shadow var(--sui-duration-press) var(--sui-ease-standard);
  }

  .sui-segmented-track:has(.sui-segmented-option:hover:not(:active) > input:checked:enabled)
    .sui-segmented-thumb {
    background: var(--sui-brand-action-hover);
  }

  /* The thumb takes the press without the 1px sink: inside a shared track a pixel down
     reads as sliding in its well, so it darkens and settles into a crease instead. */
  .sui-segmented-track:has(.sui-segmented-option:active > input:checked:enabled)
    .sui-segmented-thumb {
    background: var(--sui-brand-action-pressed);
    box-shadow: var(--sui-pressed-inset), var(--sui-segment-thumb-shadow-pressed);
  }

  .sui-segmented-option {
    cursor: pointer;
    display: flex;
    flex: none;
    position: relative;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  /* THE FILL IS ONE BOX AND THE WHOLE HOVERED OR PRESSED SURFACE. It keeps the thumb's
     curve, concentric with the track, where it meets the track's end. Where it meets the
     thumb it squares and runs one radius under it: the thumb is drawn over the fill, so
     all that survives of the run is the wedge the thumb's curve leaves, and no sliver of
     bare track shows at the join. Logical corners, so the rule holds right to left. */
  .sui-segmented-option::before {
    --sui-local-bleed-start: 0px;
    --sui-local-bleed-end: 0px;

    background: var(--sui-segment-hover);
    border-radius: var(--sui-radius-control);
    content: '';
    inset-block: 0;
    inset-inline-end: calc(-1 * var(--sui-local-bleed-end));
    inset-inline-start: calc(-1 * var(--sui-local-bleed-start));
    opacity: 0;
    pointer-events: none;
    position: absolute;
    transition:
      opacity var(--sui-duration-press) var(--sui-ease-standard),
      background-color var(--sui-duration-press) var(--sui-ease-standard),
      box-shadow var(--sui-duration-press) var(--sui-ease-standard);
    z-index: 1;
  }

  .selected + .sui-segmented-option::before {
    --sui-local-bleed-start: var(--sui-radius-control);

    border-end-start-radius: 0;
    border-start-start-radius: 0;
  }

  .sui-segmented-option:has(+ .selected)::before {
    --sui-local-bleed-end: var(--sui-radius-control);

    border-end-end-radius: 0;
    border-start-end-radius: 0;
  }

  /* The selected option draws no fill: the thumb is its ground and carries its states. */
  .sui-segmented-option:hover:not(:active, .selected, .disabled)::before {
    opacity: 1;
  }

  /* The press is the hover one step deeper, sunk into the track. The side rims move out by
     the run, so each lands on the edge a reader sees and not under the thumb. */
  .sui-segmented-option:active:not(.selected, .disabled)::before {
    background: var(--sui-segment-pressed);
    box-shadow:
      inset 0 2px 4px var(--sui-segment-well-head),
      inset var(--sui-local-bleed-start) 0 3px var(--sui-segment-well-rim),
      inset calc(-1 * var(--sui-local-bleed-end)) 0 3px var(--sui-segment-well-rim),
      inset 0 -1px 0 var(--sui-segment-well-foot);
    opacity: 1;
  }

  .sui-segmented-track:disabled .sui-segmented-option,
  .sui-segmented-option.disabled {
    cursor: default;
  }

  .sui-segmented-track:disabled .sui-segmented-option::before {
    opacity: 0;
  }

  /* The radio is the focus target and wears the ring, so it covers its option without its
     native paint. The label above it is transparent, and the track clips, so the ring is inset. */
  .sui-segmented-input {
    appearance: none;
    background: none;
    border: 0;
    border-radius: var(--sui-radius-control);
    cursor: inherit;
    inset: 0;
    margin: 0;
    position: absolute;
    z-index: 3;
  }

  .sui-segmented-input:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-inset);
  }

  .selected .sui-segmented-input:focus-visible {
    outline-color: var(--sui-segment-thumb-ink);
  }

  .sui-segmented-label {
    align-items: center;
    color: var(--sui-text-secondary);
    display: flex;
    font: 600 var(--sui-font-size-compact) / var(--sui-leading-flat) var(--sui-sans);
    gap: var(--sui-space-1);
    justify-content: center;
    padding: 0 var(--sui-space-3);
    pointer-events: none;
    position: relative;
    transition: color var(--sui-duration-fast) var(--sui-ease-standard);
    white-space: nowrap;
    z-index: 3;
  }

  .sui-segmented-label > :global(svg:first-child) {
    flex: none;
    margin-inline-start: calc(-1 * var(--sui-icon-ink-start, 0px));
  }

  .sui-segmented-word {
    block-size: var(--sui-block-snap);
    text-box: trim-both cap alphabetic;
  }

  /* A keyboard press lands on the pressed surface with no hover before it, so press lifts
     the ink as well. */
  .sui-segmented-option:is(:hover, :active):not(.selected, .disabled) .sui-segmented-label {
    color: var(--sui-text-primary);
  }

  .selected .sui-segmented-label {
    color: var(--sui-segment-thumb-ink);
  }

  .disabled .sui-segmented-label {
    opacity: var(--sui-disabled-opacity);
  }

  .sui-segmented-count {
    border-radius: var(--sui-radius-chip);
    color: var(--sui-text-muted);
    display: inline-grid;
    font: 600 var(--sui-font-size-micro) / var(--sui-leading-flat) var(--sui-sans);
    font-variant-numeric: tabular-nums;
    padding: var(--sui-space-1);
    place-items: center;
  }

  .sui-segmented-count > span {
    block-size: var(--sui-block-snap-even);
    text-box: trim-both cap alphabetic;
  }

  .selected .sui-segmented-count {
    background: var(--sui-brand-action-tint);
    color: var(--sui-brand-action-text);
  }

  @media (prefers-reduced-motion: reduce) {
    .ready .sui-segmented-thumb,
    .sui-segmented-option::before,
    .sui-segmented-label {
      transition: none;
    }
  }
</style>
