<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  let {
    value = $bindable(''),
    type = 'text',
    invalid = false,
    mono = false,
    bare = false,
    element = $bindable(null),
    'aria-invalid': ariaInvalid,
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

  /* A caller's own `aria-invalid`, such as a combobox's, counts as much as `invalid`. */
  const wrong = $derived(invalid || (ariaInvalid !== undefined && String(ariaInvalid) !== 'false'));
</script>

<!--
@component
The one text field. It rests on the control fill, takes the inset fill while it has focus,
and is 34px tall unless the surface it sits on asks for the 40px tier through
`--sui-local-control-height`. Focus turns its own border into the ring, so the ring is never
clipped by a card. A `readonly` field drops its fill and its strong baseline, so a value that
only reads never looks like one to type into.

It has no label of its own. Put it inside `Field`, or give it `aria-label` when the words
that name it are already on screen. `mono` sets technical values in the mono face with
tabular figures.

- Semantics: a native `<input>` of the given `type`, named by a `<label for>` or `aria-label`; `invalid` or a caller's `aria-invalid` sets `aria-invalid`.
- Content: one line of text the reader types, with an optional placeholder that is an example and never the label.
- States: rest (the control fill, a quiet frame and a 3:1 baseline), hover (a firmer frame), focus (the inset fill and a flush 2px ring), invalid (a danger edge on all four sides, kept under hover and focus), read-only (no fill and no baseline) and disabled (0.7 opacity).
- Keyboard: the browser's own text editing; Tab moves on.
- Pointer and touch: 34px tall on a pointer and 44px on a phone or any touch screen, with 16px text on a phone so iOS does not zoom.
- Focus: it takes focus on a press and never moves it elsewhere.
- Responsive: it fills its container and scrolls a long value inside itself.
- Accessibility: the label names it, a field's hint and error describe it, the baseline holds 3:1 on every ground, and its text holds 4.5:1.
- Localization: it draws no words of its own, its padding is logical, and the browser sets the text's direction from the page.
- Performance: one native input with no script beyond the binding; only its edge and fill colours change.
- Analytics: the native `oninput` and `onchange` report what the reader typed.
- Failure: an invalid value keeps the danger edge in every state, and the words that say why belong to the `Field` or the caller.
-->

<input
  bind:this={element}
  bind:value
  {type}
  {...rest}
  class={['sui-text-input', className]}
  class:mono
  class:bare
  aria-invalid={wrong || undefined}
/>

<style>
  .sui-text-input {
    background-color: var(--sui-control-bg);
    block-size: var(--sui-local-control-height, var(--sui-control-height-compact));
    border: var(--sui-stroke) solid var(--sui-field-frame);
    border-block-end-color: var(--sui-field-border);
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    font: var(--sui-weight-regular) var(--sui-font-size-input) / var(--sui-leading-input)
      var(--sui-sans);
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

  @media (hover: hover) {
    .sui-text-input:hover:not(:disabled, :focus, .bare, [readonly], [aria-invalid='true']) {
      border-color: var(--sui-field-frame-hover);
      border-block-end-color: var(--sui-field-border-hover);
    }
  }

  .sui-text-input:focus {
    background-color: var(--sui-input-bg);
  }

  .sui-text-input:focus-visible {
    border-color: var(--sui-focus);
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-flush);
  }

  /* An open list means the field is in use, so a combobox's preview keeps the editing look. */
  .sui-text-input[readonly]:not([aria-expanded='true']),
  .sui-text-input[readonly]:not([aria-expanded='true']):focus {
    background-color: transparent;
    border-block-end-color: var(--sui-field-frame);
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
  .sui-text-input.bare:is(:focus, :focus-visible, [aria-invalid='true'], [readonly]) {
    background-color: transparent;
    border-color: transparent;
    border-radius: 0;
    margin-block: calc(-1 * var(--sui-stroke));
    outline: none;
  }

  .sui-text-input.bare:disabled {
    opacity: 1;
  }

  .mono {
    font-family: var(--sui-mono);
    font-variant-numeric: tabular-nums;
  }

  /* High contrast paints every edge in one colour, so an invalid field says so with a 2px edge. */
  @media (forced-colors: active) {
    .sui-text-input[aria-invalid='true']:not(.bare) {
      border-width: var(--sui-stroke-bold);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-text-input {
      transition: none;
    }
  }
</style>
