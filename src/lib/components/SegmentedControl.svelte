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
  import { word } from '../words.js';
  import { tick, untrack } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import Count from '../internal/Count.svelte';
  import { formatCount } from '../internal/locale.js';
  import Select from './Select.svelte';

  const id = $props.id();

  let {
    label,
    hideLabel = false,
    options,
    value = $bindable(null),
    name = id,
    disabled = false,
    countedLabel = word(
      'SegmentedControl.countedLabel',
      (word: string, count: string) => `${word} (${count})`
    ),
    element = $bindable(null),
    'aria-describedby': describedby,
    'aria-labelledby': labelledby,
    class: className = '',
    ...rest
  }: {
    /** Names the choice. It is drawn above the segments unless its name already stands elsewhere. */
    label: string;
    /** Speaks `label` without drawing it, for a control whose visible name stands beside it. */
    hideLabel?: boolean;
    /** Two to five options. More belong in a `Select`. */
    options: ReadonlyArray<SegmentOption>;
    /** `null` selects nothing and draws no thumb. */
    value?: string | null;
    name?: string;
    disabled?: boolean;
    /** The fallback select's words for an option with a count, given the count already formatted. */
    countedLabel?: (label: string, count: string) => string;
    /** The outer box, which holds the segments or, short of room, the select. */
    element?: HTMLDivElement | null;
    /** Layout for the call site only, never the control's own paint. */
    class?: HTMLAttributes<HTMLDivElement>['class'];
  } & Omit<HTMLAttributes<HTMLDivElement>, 'children'> = $props();

  let track = $state<HTMLFieldSetElement | null>(null);
  let fits = $state(true);
  // `start` runs from the track's inline-start edge, so a placement holds in either direction.
  let thumb = $state<{ option: string; start: number; width: number } | null>(null);
  let ready = $state(false);
  // The option a dragged thumb is held over. The thumb and the words follow it, and the
  // value only takes it when the pointer lets go.
  let held = $state<string | null>(null);
  const shown = $derived(held ?? value);
  // A name passed by id, or hidden on purpose, already stands somewhere a reader sees.
  const captioned = $derived(!hideLabel && !labelledby);

  const choices = $derived(
    options.map((option) => ({
      value: option.value,
      label:
        option.count === undefined
          ? option.label
          : countedLabel(
              option.label,
              typeof option.count === 'number' ? formatCount(option.count) : option.count
            ),
      disabled: option.disabled
    }))
  );

  // The box is as wide as the copy's natural width or the room, whichever is less, and the
  // select contributes no width, so swapping between the two never changes what is measured.
  // Focus on one form moves to the other, so a swap never drops it to the page (L-89).
  function fit(box: HTMLElement) {
    const natural = box.querySelector('.sui-segmented-ruler');
    if (!natural) return;
    const observer = new ResizeObserver(() => {
      const next = box.getBoundingClientRect().width + 0.5 >= natural.getBoundingClientRect().width;
      if (next === fits) return;
      const focused = box.contains(document.activeElement);
      fits = next;
      if (!focused) return;
      void tick().then(() =>
        (next
          ? (box.querySelector<HTMLElement>('input:checked') ??
            box.querySelector<HTMLElement>('input:enabled'))
          : box.querySelector('select')
        )?.focus({ preventScroll: true })
      );
    });
    observer.observe(box);
    observer.observe(natural);
    return () => observer.disconnect();
  }

  // ponytail: ignores `zoom` on ancestors; divide by it too if the control ever sits in a zoomed
  // subtree.
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
    // A layer growing open scales the control: its boxes are read in the layout's own pixels,
    // and read again each frame while the growth runs, so the thumb lands at full size.
    // `offsetWidth` is rounded, so only a clear difference is a scale.
    const ratio = own.width / track.offsetWidth || 1;
    const scale = Math.abs(ratio - 1) > 0.01 ? ratio : 1;
    if (scale !== 1 && document.getAnimations().length > 0) requestAnimationFrame(measure);
    const rtl = getComputedStyle(track).direction === 'rtl';
    const next = {
      option: input.value,
      start: (rtl ? own.right - box.right : box.left - own.left) / scale - track.clientLeft,
      width: box.width / scale
    };
    if (thumb?.start === next.start && thumb.width === next.width) return;
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

  // The enabled option nearest the pointer, whichever way the options run.
  function optionAt(x: number): string | null {
    const enabled = [...(track?.querySelectorAll<HTMLLabelElement>('label') ?? [])].filter(
      (option) => !option.querySelector('input')?.disabled
    );
    const away = (option: Element) => {
      const box = option.getBoundingClientRect();
      return Math.max(box.left - x, 0, x - box.right);
    };
    const at = enabled.reduce<HTMLLabelElement | null>(
      (best, option) => (best === null || away(option) < away(best) ? option : best),
      null
    );
    return at?.querySelector('input')?.value ?? null;
  }

  function grab(event: PointerEvent) {
    if (disabled || event.button !== 0 || value === null) return;
    const option = (event.target as Element).closest('label');
    if (!option?.classList.contains('selected')) return;
    drag = { pointer: event.pointerId, x: event.clientX, captured: false };
  }

  function follow(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.pointer || !track) return;
    // A press let go outside the track before it became a drag never reaches the track, so
    // the next move with no button down ends it rather than dragging the thumb on a hover.
    if ((event.buttons & 1) === 0) return drop();
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
fires `change` as a click would; Escape or a cancelled pointer puts it back.

Short of room, the control draws the same choice as a native `Select`, with icons dropped and
counts in brackets, such as "Users (24)". An inert, hidden copy of the segments, with no inputs,
measures their natural width against the room through a `ResizeObserver`. The thumb is measured
from the checked option because CSS cannot size one box from a sibling.

- Semantics: a `fieldset` of native radios named by `label`, or by `aria-labelledby` when it is passed; the fallback is a native `select` with the same name.
- Content: two to five options, each a short word with an optional icon and count; a long word never wraps, so the control turns into the select instead.
- States: rest, hover (a fill that keeps the thumb's curve), pressed (the fill sinks, the thumb darkens and creases), selected (the thumb), focus (an inset ring on the option), disabled options and a disabled whole at the disabled opacity, and `null` with no thumb.
- Keyboard: Tab reaches the checked option, or the first one when nothing is chosen; the arrow keys move the choice and skip disabled options; Escape puts a dragged thumb back.
- Pointer and touch: a click chooses any option and a drag of the thumb chooses on release, so the drag is never the only way (WCAG 2.5.7); on a phone or a coarse pointer each option is at least 44 by 44px.
- Focus: choosing keeps focus on the option; when the segments turn into the select, or back, focus moves to the other form instead of falling to the page.
- Responsive: as wide as its words or its room, whichever is less; short of room it turns into a `Select`, because a hidden option is a lost option.
- Accessibility: `label` is drawn above the segments, 8px from them, unless `hideLabel` is set or `aria-labelledby` names a label that is already drawn; `aria-describedby` reaches the group or the select; counts are part of each option's name.
- Localization: `label`, option words and `countedLabel` are the caller's; numeric counts are grouped in the page's language; the thumb is placed from the inline-start edge and the drag finds the option under the pointer, so both hold right to left.
- Performance: two `ResizeObserver`s per control; the thumb moves by `translate` and its width, and reduced motion drops every transition.
- Analytics: the outer box hears a native `change` event for every pick, in either form, through `onchange`.
- Failure: a value no option has draws no thumb and an empty select; disabled options stay visible while the keyboard skips them.
-->

{#snippet face(option: SegmentOption)}
  {#if option.icon}<Icon name={option.icon} size="sm" />{/if}
  <span class="sui-segmented-word">{option.label}</span>
  {#if option.count !== undefined}
    <Count value={option.count} />
  {/if}
{/snippet}

<div
  bind:this={element}
  {...rest}
  class={['sui-segmented', className, { captioned }]}
  {@attach fit}
>
  {#if captioned}
    <!-- The legend names the group; this draws the same words where a reader looks for them. -->
    <span class="sui-segmented-caption" aria-hidden="true">{label}</span>
  {/if}
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
      aria-labelledby={labelledby}
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
          style:--sui-segmented-start="{thumb.start}px"
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
        aria-label={labelledby ? undefined : label}
        aria-labelledby={labelledby}
        aria-describedby={describedby}
        {name}
        {disabled}
      />
    </div>
  {/if}
</div>

<style>
  /* The track is an inset ground, so a darkening veil would sink a count's ink under 4.5:1;
     its pill lifts toward the surface instead. */
  .sui-segmented {
    --sui-local-count-ground: color-mix(in srgb, var(--sui-surface-base) 55%, transparent);
    display: inline-grid;
    grid-template-columns: minmax(0, max-content);
    max-inline-size: 100%;
    min-inline-size: 0;
    vertical-align: middle;
  }

  .sui-segmented > * {
    grid-area: 1 / 1;
  }

  .captioned {
    row-gap: var(--sui-space-2);
  }

  .captioned > * {
    grid-area: 2 / 1;
  }

  .captioned > .sui-segmented-caption {
    grid-area: 1 / 1;
  }

  .sui-segmented-caption {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-semibold) var(--sui-font-size-control) / var(--sui-row-copy-leading)
      var(--sui-sans);
    min-inline-size: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
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
    box-shadow: inset 0 0 0 var(--sui-stroke) var(--sui-border-subtle);
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
     stands. It moves along the reading direction, so its travel flips right to left. */
  .sui-segmented-thumb {
    --sui-segmented-sign: 1;
    background: var(--sui-segment-thumb);
    border-radius: var(--sui-radius-control);
    box-shadow: var(--sui-segment-thumb-shadow);
    inset-block: var(--sui-control-inset);
    inset-inline-start: 0;
    pointer-events: none;
    position: absolute;
    translate: calc(var(--sui-segmented-start) * var(--sui-segmented-sign)) 0;
    z-index: var(--sui-layer-inner-plate);
  }

  .sui-segmented-thumb:dir(rtl) {
    --sui-segmented-sign: -1;
  }

  .ready .sui-segmented-thumb {
    transition:
      translate var(--sui-duration-travel) var(--sui-ease-travel),
      inline-size var(--sui-duration-travel) var(--sui-ease-travel),
      background-color var(--sui-duration-fast) var(--sui-ease-standard),
      box-shadow var(--sui-duration-press) var(--sui-ease-standard);
  }

  @media (hover: hover) {
    .sui-segmented-track:has(.sui-segmented-option:hover:not(:active) > input:checked:enabled)
      .sui-segmented-thumb {
      background: var(--sui-brand-action-hover);
    }
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
    -webkit-user-select: none;
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
  @media (hover: hover) {
    .sui-segmented-option:hover:not(:active, .selected, .disabled)::before {
      opacity: 1;
    }
  }

  /* The press is the hover one step deeper, sunk into the track. The side rims move out by
     the run, so each lands on the edge a reader sees and not under the thumb. */
  .sui-segmented-option:active:not(.selected, .disabled)::before {
    background: var(--sui-segment-pressed);
    box-shadow:
      inset 0 2px 4px var(--sui-segment-well-head),
      inset var(--sui-local-bleed-start) 0 3px var(--sui-segment-well-rim),
      inset calc(-1 * var(--sui-local-bleed-end)) 0 3px var(--sui-segment-well-rim),
      inset 0 calc(-1 * var(--sui-stroke)) 0 var(--sui-segment-well-foot);
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
    z-index: var(--sui-layer-inner-face);
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
    font: var(--sui-weight-semibold) var(--sui-font-size-compact) / var(--sui-leading-flat)
      var(--sui-sans);
    gap: var(--sui-space-1);
    justify-content: center;
    padding: 0 var(--sui-space-3);
    pointer-events: none;
    position: relative;
    transition: color var(--sui-duration-fast) var(--sui-ease-standard);
    white-space: nowrap;
    z-index: var(--sui-layer-inner-face);
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
  .sui-segmented-option:active:not(.selected, .disabled) .sui-segmented-label {
    color: var(--sui-text-primary);
  }

  @media (hover: hover) {
    .sui-segmented-option:hover:not(.selected, .disabled) .sui-segmented-label {
      color: var(--sui-text-primary);
    }
  }

  .selected .sui-segmented-label {
    color: var(--sui-segment-thumb-ink);
  }

  .disabled .sui-segmented-label {
    opacity: var(--sui-disabled-opacity);
  }

  /* On the filled thumb the count wears the thumb's ink on a veil of the opposite lightness,
     which only deepens the ink's contrast with the fill, whatever the fill's hue. */
  .sui-segmented-option.selected {
    --sui-local-count-ground: oklch(from var(--sui-segment-thumb-ink) calc(1 - l) 0 0 / 22%);
    --sui-local-count-ink: var(--sui-segment-thumb-ink);
  }

  /* A finger's target is at least 44px each way (L-38), so each option's target reaches over
     the track's rim beside it. */
  @media (max-width: 47.9375rem), (pointer: coarse) {
    .sui-segmented-option {
      justify-content: center;
      min-inline-size: var(--sui-touch-target);
    }

    .sui-segmented-option::after {
      content: '';
      inset-block: calc((100% - var(--sui-touch-target)) / 2);
      inset-inline: 0;
      position: absolute;
    }
  }

  /* High contrast drops grounds and shadows, so the thumb and its words take the system's
     selection colours, and the track keeps an edge. */
  @media (forced-colors: active) {
    .sui-segmented-track {
      outline: var(--sui-stroke) solid CanvasText;
      outline-offset: calc(-1 * var(--sui-stroke));
    }

    .sui-segmented-thumb {
      background: Highlight;
      forced-color-adjust: none;
    }

    .sui-segmented-option.selected {
      --sui-local-count-ground: transparent;
      --sui-local-count-ink: HighlightText;
    }

    .selected .sui-segmented-label {
      color: HighlightText;
      forced-color-adjust: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .ready .sui-segmented-thumb,
    .sui-segmented-option::before,
    .sui-segmented-label {
      transition: none;
    }
  }
</style>
