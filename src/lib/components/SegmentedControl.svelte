<script module lang="ts">
  import type { IconName } from '../icons/Icon.svelte';

  export type SegmentOption = {
    value: string;
    label: string;
    /** Drawn before the label, which stays visible. */
    icon?: IconName;
    /** A count beside the label, set in mono. */
    count?: number | string;
    /** Keeps an unavailable option visible while the keyboard skips it. */
    disabled?: boolean;
  };
</script>

<script lang="ts">
  import { untrack } from 'svelte';
  import type { FocusEventHandler, HTMLFieldsetAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';

  const id = $props.id();

  let {
    label,
    options,
    value = $bindable(null),
    name = id,
    disabled = false,
    element = $bindable(null),
    class: className = '',
    ...rest
  }: {
    /** Names the choice for assistive technology. It is never drawn. */
    label: string;
    /** Two to five options. More belong in a picker. */
    options: ReadonlyArray<SegmentOption>;
    /** `null` selects nothing and draws no thumb. */
    value?: string | null;
    name?: string;
    disabled?: boolean;
    element?: HTMLFieldSetElement | null;
    /** Layout for the call site only, never the control's own paint. */
    class?: HTMLFieldsetAttributes['class'];
  } & Omit<HTMLFieldsetAttributes, 'children'> = $props();

  let thumb = $state<{ option: string; left: number; width: number } | null>(null);
  let ready = $state(false);

  // ponytail: ignores `zoom` and scale transforms on ancestors; multiply their factors into
  // the measurement if the control ever has to sit inside a scaled subtree.
  function measure() {
    const track = element;
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
      left: box.left - own.left - track.clientLeft + track.scrollLeft,
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
    const track = element;
    void options;
    if (!track) return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(track);
    for (const option of track.querySelectorAll('label')) observer.observe(option);
    return () => observer.disconnect();
  });

  $effect(() => {
    if (!thumb || ready) return;
    // Commit the placement before the transition switches on, so it lands instead of sliding.
    element?.getBoundingClientRect();
    ready = true;
  });

  const reveal: FocusEventHandler<HTMLInputElement> = (event) => {
    const track = element;
    const option = event.currentTarget.closest('label');
    if (!track || !option) return;
    const box = option.getBoundingClientRect();
    const own = track.getBoundingClientRect();
    if (box.left < own.left) track.scrollLeft += box.left - own.left;
    else if (box.right > own.right) track.scrollLeft += box.right - own.right;
  };
</script>

<!--
@component
One choice from two to five options a reader can see all at once. Past five the words stop
fitting, and the choice belongs in a picker. Answers that each need a sentence are
`ChoiceCards`.

The selection is one solid thumb exactly as wide as its option and held 2px inside the
track. It lands without sliding on first paint, travels 240ms between options, and is not
drawn at all for `null`, which is how a control says its value is inherited, not chosen. A
control short of room scrolls inside its own track, and focus scrolls the focused option
into view.

These are native radios under a hidden legend, so the arrow keys move the choice and skip
disabled options. The thumb is measured from the checked option because CSS cannot size one
box from a sibling; that is the only script here.
-->

<fieldset bind:this={element} {...rest} class={['sui-segmented', className]} class:ready {disabled}>
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
        onfocus={reveal}
      />
      <span class="sui-segmented-label">
        {#if option.icon}<Icon name={option.icon} size="sm" />{/if}
        <span class="sui-segmented-word">{option.label}</span>
        {#if option.count !== undefined}
          <span class="sui-segmented-count"><span>{option.count}</span></span>
        {/if}
      </span>
    </label>
  {/each}
</fieldset>

<style>
  .sui-segmented {
    background: var(--sui-segment-track);
    block-size: var(--sui-local-control-height, var(--sui-control-height-compact));
    border: 0;
    /* A surface radius around a control-radius thumb, 2px in, keeps the two curves concentric. */
    border-radius: var(--sui-radius-surface);
    box-shadow: inset 0 0 0 1px var(--sui-border-subtle);
    box-sizing: border-box;
    display: inline-flex;
    flex: none;
    inline-size: fit-content;
    margin: 0;
    max-inline-size: 100%;
    min-inline-size: 0;
    overflow-x: auto;
    overflow-y: hidden;
    padding: var(--sui-control-inset);
    position: relative;
    scrollbar-width: none;
  }

  .sui-segmented::-webkit-scrollbar {
    display: none;
  }

  .sui-segmented:disabled {
    opacity: 0.5;
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

  .sui-segmented:has(.sui-segmented-option:hover:not(:active) > input:checked:enabled)
    .sui-segmented-thumb {
    background: var(--sui-brand-action-hover);
  }

  .sui-segmented:has(.sui-segmented-option:active > input:checked:enabled) .sui-segmented-thumb {
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

  .sui-segmented:disabled .sui-segmented-option,
  .sui-segmented-option.disabled {
    cursor: default;
  }

  .sui-segmented:disabled .sui-segmented-option::before {
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
    opacity: 0.5;
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
