<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLInputAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';

  const id = $props.id();

  let {
    checked = $bindable(false),
    indeterminate = $bindable(false),
    label,
    description,
    invalid = false,
    disabled = false,
    bare = false,
    element = $bindable(null),
    'aria-describedby': describedBy,
    'aria-disabled': ariaDisabled,
    onclick,
    class: className = '',
    children,
    ...rest
  }: {
    checked?: boolean;
    /** Some but not all of what this box stands for is chosen. A press clears it. */
    indeterminate?: boolean;
    /** The words beside the box, which are its accessible name. */
    label?: string;
    /** One sentence under the label, read as the box's description. */
    description?: string;
    /** Marks the value as wrong; pair it with an error the group describes. */
    invalid?: boolean;
    disabled?: boolean;
    /** The box alone, for a `SettingRow` or a `Field layout="row"` whose label names it. */
    bare?: boolean;
    element?: HTMLInputElement | null;
    /** Layout for the call site only, never the item's own paint. */
    class?: HTMLInputAttributes['class'];
    /** Richer words than `label` can carry. */
    children?: Snippet;
  } & Omit<HTMLInputAttributes, 'type' | 'checked' | 'indeterminate' | 'children'> = $props();

  const named = $derived(Boolean(children || label));
  /* `aria-disabled` locks the box without `disabled`, which would drop a focused box's focus
     to the body, so it stays a tab stop and refuses the press itself. */
  const locked = $derived(ariaDisabled === true || ariaDisabled === 'true');

  function press(event: MouseEvent & { currentTarget: EventTarget & HTMLInputElement }) {
    if (locked) event.preventDefault();
    else onclick?.(event);
  }
  const describedby = $derived(
    [describedBy, description && `${id}-description`].filter(Boolean).join(' ') || undefined
  );
</script>

<!--
@component
One item of a checklist: a visible 18px box with its words, for a multi-choice or a consent.
It is also the boolean of a form that a later save writes. A boolean that takes effect at
once is a `Switch`, and several boxes that answer one question go in a `CheckList`.

As the control of a `SettingRow` or a `Field layout="row"`, give it the row's `id`, no label
and `bare`. The row's label names it, its box lines up with the row's end, and it keeps a
44px touch target without setting the row's height.

The native input lies over the box without its native paint and wears the focus ring, and
the whole item is its label, so the item is the hit area. The label is the accessible name and
the description is read as its description, never as part of the name. `indeterminate` draws a
dash for a parent whose children are partly chosen. `aria-disabled="true"` locks the box while
it keeps focus, for a list that is saving.

- Semantics: a native `<input type="checkbox">` inside its `<label>`, named by the label and described by the description.
- Content: a short label and an optional one-sentence description, or richer `children`.
- States: unchecked, checked (a filled box with a check), partly chosen (a dash), hover (a row ground), focus (a 2px ring 2px off the box), pressed (a deeper ground, an inset shadow and a 1px sink), invalid (a danger edge, kept when checked), locked and disabled (0.7 opacity).
- Keyboard: Tab reaches it and Space toggles it; a locked or disabled box refuses the toggle.
- Pointer and touch: the whole item is the target, 34px tall, 44px with a description, on a phone or on any touch screen, and `bare` keeps a 44px hit area.
- Focus: a press never moves focus, and a locked box keeps it.
- Responsive: a long label wraps and the box stays centred on its first line.
- Accessibility: the label is the name, the description the description, `invalid` sets `aria-invalid`, and the box's edge holds 3:1.
- Localization: its words come from the caller, the box sits at the inline start and the layout is logical.
- Performance: one native input per item; only colours, the inset shadow and the 1px sink move.
- Analytics: the native `onchange` reports each toggle; a refused press never fires it.
- Failure: an invalid box keeps its danger edge in every state, and the words that say why belong to the group or the field.
-->

<label
  class={['sui-checkbox', className]}
  class:described={description}
  class:bare
  class:disabled={disabled || locked}
>
  <span class="sui-checkbox-control">
    <input
      bind:this={element}
      bind:checked
      bind:indeterminate
      {...rest}
      type="checkbox"
      {disabled}
      aria-labelledby={named ? `${id}-label` : undefined}
      aria-describedby={describedby}
      aria-invalid={invalid || undefined}
      aria-disabled={ariaDisabled}
      onclick={press}
    />
    <span class="sui-checkbox-box" class:invalid aria-hidden="true">
      {#if indeterminate}
        <span class="sui-checkbox-dash"></span>
      {:else}
        <Icon name="check" size="micro" strokeWidth={2} />
      {/if}
    </span>
  </span>
  {#if named || description}
    <span class="sui-checkbox-copy">
      {#if named}
        <span id="{id}-label" class="sui-checkbox-label">
          {#if children}{@render children()}{:else}{label}{/if}
        </span>
      {/if}
      {#if description}
        <span id="{id}-description" class="sui-checkbox-description">{description}</span>
      {/if}
    </span>
  {/if}
</label>

<style>
  .sui-checkbox {
    align-content: center;
    align-items: start;
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    column-gap: var(--sui-space-2);
    cursor: pointer;
    display: inline-grid;
    grid-template-columns: auto minmax(0, 1fr);
    max-inline-size: 100%;
    min-block-size: var(--sui-control-height-compact);
    padding: var(--sui-space-2);
    touch-action: manipulation;
    -webkit-user-select: none;
    user-select: none;
    transition:
      background-color var(--sui-duration-fast) var(--sui-ease-standard),
      box-shadow var(--sui-duration-press) var(--sui-ease-standard),
      translate var(--sui-duration-press) var(--sui-ease-standard);
    -webkit-tap-highlight-color: transparent;
  }

  .described {
    min-block-size: var(--sui-touch-target);
  }

  /* The padding stays for the hover ground, and the margin hands it back, so the box sits
     on the row's edge and the row keeps its own height. */
  /* No words to wrap, so no clamp: against its own shrink-wrapped column a 100% cap would eat
     the end padding and slide the box past the row's content edge (L-33). */
  .bare {
    margin: calc(-1 * var(--sui-space-2));
    max-inline-size: none;
    min-block-size: auto;
    position: relative;
  }

  .bare::before {
    block-size: var(--sui-touch-target);
    content: '';
    inline-size: var(--sui-touch-target);
    inset: calc((100% - var(--sui-touch-target)) / 2);
    position: absolute;
  }

  @media (hover: hover) {
    .sui-checkbox:hover:not(:active, .disabled) {
      background-color: var(--sui-row-hover);
    }
  }

  .sui-checkbox:active:not(.disabled) {
    background-image: linear-gradient(
      var(--sui-interactive-pressed),
      var(--sui-interactive-pressed)
    );
    box-shadow: var(--sui-pressed-inset);
    translate: 0 1px;
  }

  .sui-checkbox-control {
    display: grid;
    /* The label's face, so `1cap` is the label's cap height and the box centres on the
       label's first line however many lines the label wraps to. */
    font: var(--sui-weight-regular) var(--sui-font-size-control) / var(--sui-leading-flat)
      var(--sui-sans);
    margin-block: round(calc((1cap - var(--sui-icon-md)) / 2), 1px);
  }

  .sui-checkbox-control > * {
    grid-area: 1 / 1;
  }

  .sui-checkbox input {
    appearance: none;
    background: none;
    block-size: 100%;
    border: 0;
    border-radius: var(--sui-radius-check);
    cursor: inherit;
    inline-size: 100%;
    margin: 0;
  }

  .sui-checkbox input:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-offset);
  }

  .sui-checkbox-box {
    align-items: center;
    background: var(--sui-input-bg);
    block-size: var(--sui-icon-md);
    border: var(--sui-stroke) solid var(--sui-border-strong);
    border-radius: var(--sui-radius-check);
    box-sizing: border-box;
    color: transparent;
    display: inline-flex;
    inline-size: var(--sui-icon-md);
    justify-content: center;
    position: relative;
    transition:
      background-color var(--sui-duration-fast) var(--sui-ease-standard),
      border-color var(--sui-duration-fast) var(--sui-ease-standard),
      color var(--sui-duration-fast) var(--sui-ease-standard);
  }

  .sui-checkbox input:is(:checked, :indeterminate) + .sui-checkbox-box {
    background: var(--sui-brand-action);
    border-color: var(--sui-brand-action);
    color: var(--sui-on-brand-action);
  }

  /* As specific as the checked rule and after it, so a checked box keeps its danger edge. */
  .sui-checkbox input + .sui-checkbox-box.invalid {
    border-color: var(--sui-danger);
  }

  .sui-checkbox-dash {
    background: currentColor;
    block-size: 2px;
    border-radius: var(--sui-radius-pill);
    inline-size: var(--sui-space-2);
  }

  .sui-checkbox-copy {
    block-size: var(--sui-block-snap-even);
    display: grid;
    gap: var(--sui-row-copy-gap);
    min-inline-size: 0;
  }

  .sui-checkbox-label {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-primary);
    font: var(--sui-weight-regular) var(--sui-font-size-control) / var(--sui-row-copy-leading)
      var(--sui-sans);
    min-inline-size: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sui-checkbox-description {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    text-box: trim-both cap alphabetic;
  }

  .disabled {
    cursor: default;
    opacity: var(--sui-disabled-opacity);
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-checkbox,
    .sui-checkbox-box {
      transition: none;
    }

    .sui-checkbox:active:not(.disabled) {
      translate: none;
    }
  }

  /* High contrast flattens the fill and the ink, so the box draws its states in system colours,
     and the hovered row draws an edge in place of its ground. */
  @media (forced-colors: active) {
    .sui-checkbox-box {
      background: Canvas;
      border-color: CanvasText;
      color: transparent;
      forced-color-adjust: none;
    }

    .sui-checkbox input:is(:checked, :indeterminate) + .sui-checkbox-box {
      background: Highlight;
      border-color: Highlight;
      color: HighlightText;
    }

    /* Every edge is one colour here, so an invalid box says so with a 2px edge, checked or not. */
    .sui-checkbox input + .sui-checkbox-box.invalid {
      border-color: CanvasText;
      border-width: var(--sui-stroke-bold);
    }
  }

  @media (hover: hover) and (forced-colors: active) {
    .sui-checkbox:hover:not(.disabled) {
      outline: var(--sui-stroke) solid Highlight;
    }
  }
</style>
