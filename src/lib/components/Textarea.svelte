<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';

  let {
    value = $bindable(''),
    rows = 3,
    invalid = false,
    mono = false,
    element = $bindable(null),
    class: className = '',
    ...rest
  }: {
    value?: string | null;
    /** How many lines it shows before it scrolls. The reader can drag it taller. */
    rows?: number;
    /** Marks the value as wrong; pair it with an error the field describes. */
    invalid?: boolean;
    /** For technical text: config, YAML, a list of paths. */
    mono?: boolean;
    element?: HTMLTextAreaElement | null;
    class?: HTMLTextareaAttributes['class'];
  } & Omit<HTMLTextareaAttributes, 'value'> = $props();
</script>

<!--
@component
The one multi-line field, for words a person writes: a reason, a note, a description. It
wears the same paint as `TextInput`, sets its text in the interface face at control size
instead of the browser's default, and the reader can drag it taller but never wider.

It has no label of its own. Put it in a `Field` through the `control` snippet, or give it
`aria-label`. `mono` is for technical text such as configuration.
-->

<textarea
  bind:this={element}
  bind:value
  {rows}
  {...rest}
  class={['sui-textarea', className]}
  class:mono
  aria-invalid={invalid || undefined}></textarea>

<style>
  .sui-textarea {
    background-color: var(--sui-control-bg);
    border: 1px solid var(--sui-field-frame);
    border-block-end-color: var(--sui-field-border);
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    display: block;
    font: 400 var(--sui-font-size-input) / var(--sui-leading-input) var(--sui-sans);
    inline-size: 100%;
    margin: 0;
    min-block-size: var(--sui-control-height-compact);
    min-inline-size: var(--sui-field-target-min);
    padding: var(--sui-space-2);
    resize: vertical;
    transition:
      background-color var(--sui-duration-fast) var(--sui-ease-standard),
      border-color var(--sui-duration-fast) var(--sui-ease-standard);
  }

  .sui-textarea::placeholder {
    color: var(--sui-text-muted);
    opacity: 1;
  }

  .sui-textarea:hover:not(:disabled):not(:focus) {
    border-color: var(--sui-field-frame-hover);
    border-block-end-color: var(--sui-field-border-hover);
  }

  .sui-textarea:focus {
    background-color: var(--sui-input-bg);
  }

  .sui-textarea:focus-visible {
    border-color: var(--sui-focus);
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-flush);
  }

  .sui-textarea[aria-invalid='true'] {
    border-color: var(--sui-danger);
  }

  .sui-textarea:disabled {
    cursor: default;
    opacity: var(--sui-disabled-opacity);
    resize: none;
  }

  .mono {
    font-family: var(--sui-mono);
    font-variant-numeric: tabular-nums;
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-textarea {
      transition: none;
    }
  }
</style>
