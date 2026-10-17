<script module lang="ts">
  export type ChipTone = 'neutral' | 'info' | 'success' | 'brand' | 'warning' | 'danger' | 'absent';
</script>

<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import Icon, { type IconName } from '../icons/Icon.svelte';
  import ClippedLabel from './ClippedLabel.svelte';
  import Tooltip from './Tooltip.svelte';

  let {
    label,
    tone = 'neutral',
    icon,
    small = false,
    mono = false,
    onremove,
    class: className = '',
    ...rest
  }: {
    /** The value the chip carries. It also names the remove control. */
    label: string;
    tone?: ChipTone;
    /** For an outcome the tone alone cannot name. */
    icon?: IconName;
    /** For a chip set inside a line of text rather than beside it. */
    small?: boolean;
    /** For a technical value: an ID, a path, a version or a key. */
    mono?: boolean;
    /** Draws a remove control named "Remove" and the value. */
    onremove?: () => void;
    class?: HTMLAttributes<HTMLSpanElement>['class'];
  } & Omit<HTMLAttributes<HTMLSpanElement>, 'children'> = $props();

  let remover = $state<HTMLButtonElement | null>(null);

  const removeLabel = $derived(`Remove ${label}`);
</script>

<!--
@component
A value a row reports, drawn as a mark: a label name, a pattern, a count. Where `Pill` is a
standing and `StatusPill` a fact about the surface, a chip carries one cell's value and takes
its tone from what that value means, so the same word wears the same tone down a column.

`success` is a good outcome, `info` informs, `brand` wears the brand tint, `warning` and
`danger` need attention, and `absent` says there is nothing to show with a dashed keyline, in
the shape itself. `onremove` adds a remove control with a 24px hit area. A long value ends in
an ellipsis and shows in full in a tooltip.
-->

<span
  {...rest}
  class={['sui-chip', className, { small, mono, removable: onremove !== undefined }]}
  data-tone={tone}
>
  {#if icon !== undefined}
    <Icon name={icon} size={small ? 'xs' : 'sm'} strokeWidth={2} />
  {/if}
  <ClippedLabel text={label} {mono} />
  {#if onremove !== undefined}
    <button
      bind:this={remover}
      type="button"
      class="sui-chip-remove"
      aria-label={removeLabel}
      onclick={onremove}
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
    font: 600 var(--sui-font-size-compact) / var(--sui-leading-flat) var(--sui-sans);
    gap: var(--sui-space-1);
    inline-size: fit-content;
    max-inline-size: 100%;
    min-block-size: var(--sui-control-height-chip);
    padding-inline: var(--sui-space-2);
    white-space: nowrap;
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

  .sui-chip > :global(svg:first-child) {
    margin-inline-start: calc(-1 * var(--sui-icon-ink-start, 0px));
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

  /* The glyph is 20px so the chip keeps its height; the pointer target is 24px. */
  .sui-chip-remove::before {
    content: '';
    inset: calc(-1 * var(--sui-control-inset));
    position: absolute;
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

  .sui-chip[data-tone='success'] {
    background: var(--sui-success-tint);
    color: var(--sui-success);
  }

  .sui-chip[data-tone='info'] {
    background: var(--sui-info-tint);
    color: var(--sui-info);
  }

  .sui-chip[data-tone='brand'] {
    background: var(--sui-brand-action-tint);
    color: var(--sui-brand-action-text);
  }

  .sui-chip[data-tone='warning'] {
    background: var(--sui-warning-tint);
    color: var(--sui-warning);
  }

  .sui-chip[data-tone='danger'] {
    background: var(--sui-danger-tint);
    color: var(--sui-danger);
  }

  /* An outline rather than the keyline, because an inset shadow cannot be dashed. Inset by
     its own width, so the chip measures the same as its neighbours. */
  .sui-chip[data-tone='absent'] {
    background: transparent;
    box-shadow: none;
    color: var(--sui-text-muted);
    outline: 1px dashed color-mix(in srgb, currentColor 42%, transparent);
    outline-offset: -1px;
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
