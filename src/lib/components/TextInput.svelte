<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  let {
    value = $bindable(''),
    type = 'text',
    invalid = false,
    mono = false,
    bare = false,
    element = $bindable(null),
    class: className = '',
    ...rest
  }: {
    value?: string | number | null;
    type?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number';
    /** Marks the value as wrong; pair it with an error the field describes. */
    invalid?: boolean;
    /** For technical values: IDs, paths, versions, numbers. */
    mono?: boolean;
    /**
     * Drops the frame, for one part of a joined field whose host draws the frame, the focus
     * ring and the error and disabled looks.
     */
    bare?: boolean;
    element?: HTMLInputElement | null;
    class?: HTMLInputAttributes['class'];
  } & Omit<HTMLInputAttributes, 'value' | 'type'> = $props();
</script>

<!--
@component
The one text field. It rests on the control fill, takes the inset fill while it has focus,
and is 34px tall unless the surface it sits on asks for the 40px tier through
`--sui-local-control-height`. Focus turns its own border into the ring, so the ring is never
clipped by a card.

It has no label of its own. Put it inside `Field`, or give it `aria-label` when the words
that name it are already on screen. `mono` sets technical values in the mono face with
tabular figures.
-->

<input
  bind:this={element}
  bind:value
  {type}
  {...rest}
  class={['sui-text-input', className]}
  class:mono
  class:bare
  aria-invalid={invalid || undefined}
/>

<style>
  .sui-text-input {
    background-color: var(--sui-control-bg);
    block-size: var(--sui-local-control-height, var(--sui-control-height-compact));
    border: 1px solid var(--sui-field-frame);
    border-block-end-color: var(--sui-field-border);
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    font: 400 var(--sui-font-size-input) / var(--sui-leading-input) var(--sui-sans);
    inline-size: 100%;
    margin: 0;
    min-inline-size: var(--sui-field-target-min);
    padding: 0 var(--sui-space-2);
    transition:
      background-color var(--sui-duration-fast) var(--sui-ease-standard),
      border-color var(--sui-duration-fast) var(--sui-ease-standard);
  }

  .sui-text-input::placeholder {
    color: var(--sui-text-muted);
    opacity: 1;
  }

  .sui-text-input:hover:not(:disabled, :focus, .bare) {
    border-color: var(--sui-field-frame-hover);
    border-block-end-color: var(--sui-field-border-hover);
  }

  .sui-text-input:focus {
    background-color: var(--sui-input-bg);
  }

  .sui-text-input:focus-visible {
    border-color: var(--sui-focus);
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-flush);
  }

  .sui-text-input[aria-invalid='true'] {
    border-color: var(--sui-danger);
  }

  .sui-text-input:disabled {
    cursor: default;
    opacity: var(--sui-disabled-opacity);
  }

  /* Lies over the host's edge by its own transparent border, so it keeps the full height.
     The ground, edge and ring are the host's. */
  .sui-text-input.bare,
  .sui-text-input.bare:is(:hover, :focus, :focus-visible, [aria-invalid='true']) {
    background-color: transparent;
    border-color: transparent;
    border-radius: 0;
    margin-block: -1px;
    outline: none;
  }

  .sui-text-input.bare:disabled {
    opacity: 1;
  }

  .mono {
    font-family: var(--sui-mono);
    font-variant-numeric: tabular-nums;
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-text-input {
      transition: none;
    }
  }
</style>
