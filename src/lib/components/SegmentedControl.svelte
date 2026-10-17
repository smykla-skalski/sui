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
    const input = track.querySelector<HTMLInputElement>('input:checked');
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
    void value;
    untrack(measure);
  });

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
    <fieldset
      bind:this={track}
      class={['sui-segmented-track', { ready }]}
      {disabled}
      aria-describedby={describedby}
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
          class:selected={value === option.value}
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
    margin: 0;
    min-inline-size: 0;
    padding: var(--sui-control-inset);
    position: relative;
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

  .sui-segmented-thumb {
    background: var(--sui-segment-thumb);
    border-radius: var(--sui-radius-control);
    inset-block: var(--sui-control-inset);
    left: 0;
    pointer-events: none;
    position: absolute;
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

  .sui-segmented-track:has(.sui-segmented-option:active > input:checked:enabled)
    .sui-segmented-thumb {
    background: var(--sui-brand-action-pressed);
    box-shadow: var(--sui-pressed-inset);
  }

  .sui-segmented-option {
    cursor: pointer;
    display: flex;
    flex: none;
    position: relative;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  .sui-segmented-option::before {
    background: var(--sui-segment-hover);
    border-radius: var(--sui-radius-control);
    content: '';
    inset: 0;
    opacity: 0;
    pointer-events: none;
    position: absolute;
    transition:
      opacity var(--sui-duration-press) var(--sui-ease-standard),
      background-color var(--sui-duration-press) var(--sui-ease-standard),
      box-shadow var(--sui-duration-press) var(--sui-ease-standard);
  }

  .sui-segmented-option:hover:not(:active, .selected, .disabled)::before {
    opacity: 1;
  }

  .sui-segmented-option:active:not(.selected, .disabled)::before {
    background: var(--sui-segment-pressed);
    box-shadow: var(--sui-pressed-inset);
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
  }

  .sui-segmented-input:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-inset);
  }

  .selected .sui-segmented-input:focus-visible {
    outline-color: var(--sui-on-brand-action);
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
  }

  .sui-segmented-label > :global(svg:first-child) {
    flex: none;
    margin-inline-start: calc(-1 * var(--sui-icon-ink-start, 0px));
  }

  .sui-segmented-word {
    text-box: trim-both cap alphabetic;
  }

  .sui-segmented-option:hover:not(.selected, .disabled) .sui-segmented-label {
    color: var(--sui-text-primary);
  }

  .selected .sui-segmented-label {
    color: var(--sui-on-brand-action);
  }

  .disabled .sui-segmented-label {
    opacity: var(--sui-disabled-opacity);
  }

  .sui-segmented-count {
    background: var(--sui-interactive-hover-layer);
    border-radius: var(--sui-radius-chip);
    color: var(--sui-text-secondary);
    display: inline-grid;
    font: 600 var(--sui-font-size-micro) / var(--sui-leading-flat) var(--sui-sans);
    font-variant-numeric: tabular-nums;
    padding: var(--sui-space-1);
    place-items: center;
  }

  .sui-segmented-count > span {
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
