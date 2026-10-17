<script module lang="ts">
  export type ChoiceCardOption = {
    value: string;
    /** A short name for the answer. */
    label: string;
    /** One sentence saying what choosing it does. */
    description: string;
    /** Keeps an unavailable answer visible while the keyboard skips it. */
    disabled?: boolean;
  };
</script>

<script lang="ts">
  import type { HTMLFieldsetAttributes } from 'svelte/elements';

  const id = $props.id();

  let {
    label,
    options,
    value = $bindable(null),
    name = id,
    hint,
    error,
    disabled = false,
    'aria-describedby': describedBy,
    class: className = '',
    ...rest
  }: {
    /** The question the cards answer, drawn as the group's legend. */
    label: string;
    options: ReadonlyArray<ChoiceCardOption>;
    /** `null` until the reader picks an answer. */
    value?: string | null;
    name?: string;
    hint?: string;
    /** Says what is wrong, such as an answer that is still missing. */
    error?: string;
    disabled?: boolean;
    class?: HTMLFieldsetAttributes['class'];
  } & Omit<HTMLFieldsetAttributes, 'children'> = $props();

  const describedby = $derived(
    [describedBy, hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') ||
      undefined
  );
</script>

<!--
@component
One answer to one question, where every answer needs a sentence to say what it does, so
nothing has to be tried to find out. Answers that a word names are a `SegmentedControl`.

The cards are one connected surface with 2px gutters, not separate cards, because they are
exclusive answers to a single question. They sit side by side while each has 14rem and stack
when they do not. The chosen card is a brand ground, brand ink and a filled dot together.
These are native radios, so the arrow keys move the choice and skip disabled answers.
-->

<fieldset
  {...rest}
  class={['sui-choice-cards', className]}
  {disabled}
  aria-describedby={describedby}
>
  <legend class="sui-choice-cards-legend">{label}</legend>
  <div class={['sui-choice-cards-grid', { invalid: Boolean(error) }]}>
    {#each options as option, index (option.value)}
      <label class="sui-choice-card" class:disabled={disabled || option.disabled}>
        <input
          type="radio"
          {name}
          value={option.value}
          bind:group={value}
          disabled={option.disabled}
          aria-labelledby="{id}-{index}-label"
          aria-describedby="{id}-{index}-description"
        />
        <span class="sui-choice-card-dot" aria-hidden="true"></span>
        <span id="{id}-{index}-label" class="sui-choice-card-label">{option.label}</span>
        <span id="{id}-{index}-description" class="sui-choice-card-description"
          >{option.description}</span
        >
      </label>
    {/each}
  </div>
  {#if hint}<p id="{id}-hint" class="sui-choice-cards-help">{hint}</p>{/if}
  {#if error}<p id="{id}-error" class="sui-choice-cards-error">{error}</p>{/if}
</fieldset>

<style>
  .sui-choice-cards {
    border: 0;
    display: grid;
    gap: var(--sui-row-copy-gap);
    margin: 0;
    min-inline-size: 0;
    padding: 0;
  }

  .sui-choice-cards-legend {
    color: var(--sui-text-secondary);
    float: inline-start;
    font: 600 var(--sui-font-size-control) / var(--sui-row-copy-leading) var(--sui-sans);
    padding: 0;
    text-box: trim-both cap alphabetic;
  }

  .sui-choice-cards-grid {
    background: var(--sui-control-bg);
    border-radius: var(--sui-radius-surface);
    box-shadow: inset 0 0 0 1px var(--sui-control-border);
    display: grid;
    gap: var(--sui-control-inset);
    grid-template-columns: repeat(auto-fit, minmax(min(14rem, 100%), 1fr));
    overflow: clip;
    padding: var(--sui-control-inset);
  }

  /* The same signal an invalid text field gives: its frame takes the danger ink. */
  .sui-choice-cards-grid.invalid {
    box-shadow: inset 0 0 0 1px var(--sui-danger);
  }

  .sui-choice-card {
    align-content: start;
    align-items: start;
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    cursor: pointer;
    display: grid;
    gap: var(--sui-row-copy-gap) var(--sui-space-3);
    grid-template-columns: auto minmax(0, 1fr);
    min-block-size: 72px;
    min-inline-size: 0;
    padding: var(--sui-space-3) var(--sui-space-4);
    position: relative;
    transition:
      background-color var(--sui-duration-fast) var(--sui-ease-standard),
      box-shadow var(--sui-duration-press) var(--sui-ease-standard),
      translate var(--sui-duration-press) var(--sui-ease-standard);
    -webkit-tap-highlight-color: transparent;
  }

  .sui-choice-card:hover:not(:active):not(.disabled) {
    background-color: var(--sui-interactive-hover-layer);
  }

  .sui-choice-card:active:not(.disabled) {
    background-color: var(--sui-interactive-pressed);
    box-shadow: var(--sui-pressed-inset);
    translate: 0 1px;
  }

  .sui-choice-card:has(input:checked) {
    background-color: color-mix(in oklab, var(--sui-brand-action) 25%, var(--sui-surface-base));
  }

  .sui-choice-card:has(input:checked):hover:not(.disabled) {
    background-color: color-mix(in oklab, var(--sui-brand-action) 29%, var(--sui-surface-base));
  }

  /* The radio is the focus target and wears the ring, so it covers the card without its
     native paint, and the ring sits inset because the group clips its corners. */
  .sui-choice-card input {
    appearance: none;
    background: none;
    border: 0;
    border-radius: var(--sui-radius-control);
    cursor: inherit;
    inset: 0;
    margin: 0;
    position: absolute;
  }

  .sui-choice-card input:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-inset);
  }

  .sui-choice-card-dot {
    background: var(--sui-surface-base);
    block-size: var(--sui-icon-base);
    border: 2px solid var(--sui-border-strong);
    border-radius: 50%;
    box-sizing: border-box;
    /* The label's face, so `1cap` is the label's cap height and the dot centres on its
       first line however many lines it wraps to. */
    font: 600 var(--sui-font-size-meta) / var(--sui-leading-flat) var(--sui-sans);
    inline-size: var(--sui-icon-base);
    margin-block: calc((1cap - var(--sui-icon-base)) / 2);
    position: relative;
  }

  .sui-choice-card:has(input:checked) .sui-choice-card-dot {
    border-color: var(--sui-brand-action);
  }

  .sui-choice-card:has(input:checked) .sui-choice-card-dot::after {
    background: var(--sui-brand-action);
    border-radius: 50%;
    content: '';
    inset: 2px;
    position: absolute;
  }

  .sui-choice-card-label {
    color: var(--sui-text-primary);
    font: 600 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    text-box: trim-both cap alphabetic;
    text-wrap: pretty;
  }

  .sui-choice-card:has(input:checked) .sui-choice-card-label {
    color: var(--sui-brand-action-text);
  }

  .sui-choice-card-description {
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    grid-column: 2;
    text-box: trim-both cap alphabetic;
    text-wrap: pretty;
  }

  .disabled {
    cursor: default;
    opacity: 0.5;
  }

  .sui-choice-cards-help,
  .sui-choice-cards-error {
    margin: 0;
    text-box: trim-both cap alphabetic;
  }

  .sui-choice-cards-help {
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
  }

  .sui-choice-cards-error {
    color: var(--sui-danger);
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-choice-card {
      transition: none;
    }

    .sui-choice-card:active:not(.disabled) {
      translate: none;
    }
  }
</style>
