<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLInputAttributes } from 'svelte/elements';

  let {
    checked = $bindable(false),
    label,
    bare = false,
    invalid = false,
    disabled = false,
    element = $bindable(null),
    class: className = '',
    children,
    ...rest
  }: {
    checked?: boolean;
    /** The words beside the track, which are also its accessible name. */
    label?: string;
    /** Drops the 44px tap box from layout, for a head or row that sets its own rhythm. */
    bare?: boolean;
    /** Marks the value as wrong; pair it with an error the field describes. */
    invalid?: boolean;
    disabled?: boolean;
    element?: HTMLInputElement | null;
    /** Layout for the call site only, never the switch's own paint. */
    class?: HTMLInputAttributes['class'];
    /** Richer words than `label` can carry. */
    children?: Snippet;
  } & Omit<HTMLInputAttributes, 'type' | 'checked' | 'role' | 'children'> = $props();
</script>

<!--
@component
A boolean a reader flips directly. Flipping it is the change, so it is an input with the
switch role and not a button that opens a form. A multi-choice or a consent is a
`CheckList` instead.

The track says nothing on its own, so give it words: `label`, `children`, a `Field` whose
label points at its `id`, or `aria-label`. The track always carries a 44px hit area. The
row is 44px tall too unless `bare` takes that out of layout, for a head or a row that sets
its own rhythm.
-->

<label class={['sui-switch', className]} class:bare class:disabled>
  {#if children}
    <span class="sui-switch-label">{@render children()}</span>
  {:else if label}
    <span class="sui-switch-label">{label}</span>
  {/if}
  <span class="sui-switch-control">
    <input
      bind:this={element}
      bind:checked
      {...rest}
      type="checkbox"
      role="switch"
      {disabled}
      aria-invalid={invalid || undefined}
    />
    <span class="sui-switch-track" class:invalid aria-hidden="true"></span>
  </span>
</label>

<style>
  .sui-switch {
    align-items: center;
    cursor: pointer;
    display: inline-flex;
    gap: var(--sui-space-2);
    inline-size: fit-content;
    max-inline-size: 100%;
    min-block-size: var(--sui-touch-target);
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  .bare {
    min-block-size: auto;
  }

  .sui-switch-label {
    color: var(--sui-text-primary);
    font: 400 var(--sui-font-size-control) / var(--sui-row-copy-leading) var(--sui-sans);
    min-inline-size: 0;
    text-box: trim-both cap alphabetic;
  }

  .sui-switch-control {
    display: grid;
    flex: none;
  }

  /* The input is the focus target and wears the ring, so it lies exactly over the track;
     appearance none keeps native paint away without hiding the ring with it. */
  .sui-switch-control > * {
    grid-area: 1 / 1;
  }

  .sui-switch input {
    appearance: none;
    background: none;
    block-size: 100%;
    border: 0;
    border-radius: var(--sui-radius-chip);
    cursor: inherit;
    inline-size: 100%;
    margin: 0;
  }

  .sui-switch input:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-offset);
  }

  .sui-switch-track {
    background: var(--sui-switch-track-off);
    block-size: 20px;
    border: 1px solid var(--sui-switch-track-off-border);
    border-radius: var(--sui-radius-chip);
    box-sizing: border-box;
    inline-size: 34px;
    position: relative;
    transition:
      background-color var(--sui-duration-fast) var(--sui-ease-standard),
      border-color var(--sui-duration-fast) var(--sui-ease-standard);
  }

  /* 20 + 24 and 34 + 16 both clear the 44px touch target, laid out or not. */
  .sui-switch-track::before {
    content: '';
    inset: calc(-1 * var(--sui-space-3)) calc(-1 * var(--sui-space-2));
    position: absolute;
  }

  .sui-switch-track::after {
    background: var(--sui-switch-thumb);
    block-size: 16px;
    border-radius: 50%;
    box-shadow: 0 1px 2px var(--sui-shadow-color);
    content: '';
    inline-size: 16px;
    inset-block-start: 1px;
    inset-inline-start: 1px;
    position: absolute;
    transition: translate var(--sui-duration-fast) var(--sui-ease-standard);
  }

  .sui-switch input:checked + .sui-switch-track {
    background: var(--sui-switch-track-on);
    border-color: var(--sui-switch-track-on);
  }

  .sui-switch input:checked + .sui-switch-track::after {
    translate: 14px 0;
  }

  .sui-switch-track.invalid {
    border-color: var(--sui-danger);
  }

  .disabled {
    cursor: default;
    opacity: 0.5;
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-switch-track,
    .sui-switch-track::after {
      transition: none;
    }
  }
</style>
