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
the whole item is its label, so the item is the hit area. The label is the accessible name and the description is read
as its description, never as part of the name. `indeterminate` draws a dash for a parent
whose children are partly chosen.
-->

<label class={['sui-checkbox', className]} class:described={description} class:bare class:disabled>
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
  .bare {
    margin: calc(-1 * var(--sui-space-2));
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

  .sui-checkbox:hover:not(:active):not(.disabled) {
    background-color: var(--sui-row-hover);
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
    font: 400 var(--sui-font-size-control) / var(--sui-leading-flat) var(--sui-sans);
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
    border: 1px solid var(--sui-border-strong);
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

  .sui-checkbox-box.invalid {
    border-color: var(--sui-danger);
  }

  .sui-checkbox input:is(:checked, :indeterminate) + .sui-checkbox-box {
    background: var(--sui-brand-action);
    border-color: var(--sui-brand-action);
    color: var(--sui-on-brand-action);
  }

  .sui-checkbox-dash {
    background: currentColor;
    block-size: 2px;
    border-radius: var(--sui-radius-chip);
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
    font: 400 var(--sui-font-size-control) / var(--sui-row-copy-leading) var(--sui-sans);
    text-box: trim-both cap alphabetic;
  }

  .sui-checkbox-description {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
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
</style>
