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
  import { mark, word } from '../words.js';
  import type { HTMLFieldsetAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import VisuallyHidden from './VisuallyHidden.svelte';

  const id = $props.id();

  let {
    label,
    options,
    value = $bindable(null),
    name = id,
    hint,
    error,
    required = false,
    requiredLabel = word('ChoiceCards.requiredLabel', 'Required'),
    disabled = false,
    onchange,
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
    /** An answer must be chosen: the legend says `requiredLabel` and the radios are `required`. */
    required?: boolean;
    /** The word after the legend of a question that must be answered. */
    requiredLabel?: string;
    /** Locks the answers while they cannot change, such as during a save; focus stays where it is. */
    disabled?: boolean;
    /** Hears each answer the reader picks. */
    onchange?: (value: string) => void;
    class?: HTMLFieldsetAttributes['class'];
  } & Omit<HTMLFieldsetAttributes, 'children' | 'onchange' | 'disabled'> = $props();

  const MOVES = new Set([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

  /* `disabled` on the group would drop a focused radio's focus to the body, so a locked group
     keeps its radios focusable and refuses every press and arrow that would change the answer. */
  function refuse(event: Event) {
    if (!disabled) return;
    if (event instanceof KeyboardEvent && !MOVES.has(event.key)) return;
    event.preventDefault();
  }

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
`disabled` locks the whole group with `aria-disabled`, so a radio that holds focus during a
save keeps it.

- Semantics: a `<fieldset role="radiogroup">` named by its `<legend>`, described by the hint and the error, holding native radios each named by its label and described by its sentence, with a polite `role="status"` that speaks the error.
- Content: a question as the legend and two to six answers, each a short label and one sentence; an optional hint and an error.
- States: unchosen, chosen (a brand ground, brand ink and a filled dot), hover (a veil), focus (an inset 2px ring), pressed (a deeper veil, an inset shadow and a 1px sink), required (the word after the legend), invalid (a danger frame and an error with a warning mark), locked and disabled answers (0.7 opacity).
- Keyboard: Tab enters the group at the chosen answer, the arrows move the choice and skip disabled answers, and Space chooses; a locked group refuses all of them and keeps focus.
- Pointer and touch: every card is its own target, at least 72px tall.
- Focus: it never moves focus, and locking the group leaves focus on the radio that had it.
- Responsive: the cards sit side by side while each has 14rem and stack when they do not; long sentences wrap.
- Accessibility: the legend names the group, the required word is read with it, each card's label names its radio and its sentence describes it, and the error is spoken when it appears.
- Localization: `requiredLabel` is a prop with an English default, the question and answers come from the caller, and the dot and the layout follow the reading direction.
- Performance: one radio per answer; only colours, the inset shadow and the 1px sink move.
- Analytics: `onchange` hears each answer the reader picks.
- Failure: an `error` is drawn with a mark and words and spoken, and an unavailable answer stays visible and disabled.
-->

<fieldset
  {...rest}
  class={['sui-choice-cards', className]}
  role="radiogroup"
  aria-describedby={describedby}
  aria-disabled={disabled || undefined}
  aria-invalid={error ? true : undefined}
  aria-required={required || undefined}
>
  <legend class="sui-choice-cards-legend"
    >{label}{#if required}{mark('space')}<span class="sui-choice-cards-required"
        >{requiredLabel}</span
      >{/if}</legend
  >
  <div class={['sui-choice-cards-grid', { invalid: Boolean(error) }]}>
    {#each options as option, index (option.value)}
      <label class="sui-choice-card" class:disabled={disabled || option.disabled}>
        <input
          type="radio"
          {name}
          value={option.value}
          bind:group={value}
          disabled={option.disabled}
          {required}
          aria-disabled={disabled || undefined}
          aria-labelledby="{id}-{index}-label"
          aria-describedby="{id}-{index}-description"
          onclick={refuse}
          onkeydown={refuse}
          onchange={() => onchange?.(option.value)}
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
  <!-- The status speaks the error, so the drawn copy stays out of the tree; the group's
       description still reads it. -->
  {#if error}
    <p id="{id}-error" class="sui-choice-cards-error" aria-hidden="true">
      <span class="sui-choice-cards-mark"><Icon name="alert" size="xs" /></span>
      <span class="sui-choice-cards-words">{error}</span>
    </p>
  {/if}
  <VisuallyHidden role="status">{error ?? ''}</VisuallyHidden>
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
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    float: inline-start;
    font: var(--sui-weight-semibold) var(--sui-font-size-control) / var(--sui-row-copy-leading)
      var(--sui-sans);
    padding: 0;
    text-box: trim-both cap alphabetic;
  }

  .sui-choice-cards-required {
    color: var(--sui-text-muted);
    font-weight: var(--sui-weight-regular);
    margin-inline-start: var(--sui-space-1);
  }

  .sui-choice-cards-grid {
    background: var(--sui-control-bg);
    border-radius: var(--sui-radius-surface);
    box-shadow: inset 0 0 0 var(--sui-stroke) var(--sui-control-border);
    display: grid;
    gap: var(--sui-control-inset);
    grid-template-columns: repeat(auto-fit, minmax(min(14rem, 100%), 1fr));
    overflow: clip;
    padding: var(--sui-control-inset);
  }

  /* The same signal an invalid text field gives: its frame takes the danger ink. */
  .sui-choice-cards-grid.invalid {
    box-shadow: inset 0 0 0 var(--sui-stroke) var(--sui-danger);
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
    -webkit-user-select: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  @media (hover: hover) {
    .sui-choice-card:hover:not(:active, .disabled) {
      background-color: var(--sui-interactive-hover-layer);
    }

    .sui-choice-card:has(input:checked):hover:not(:active, .disabled) {
      background-color: color-mix(in srgb, var(--sui-brand-action) 14%, var(--sui-surface-base));
    }
  }

  .sui-choice-card:active:not(.disabled) {
    background-color: var(--sui-interactive-pressed);
    box-shadow: var(--sui-pressed-inset);
    translate: 0 1px;
  }

  .sui-choice-card:has(input:checked):not(:active) {
    background-color: var(--sui-brand-action-tint);
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
    border: var(--sui-stroke-bold) solid var(--sui-border-strong);
    border-radius: 50%;
    box-sizing: border-box;
    /* The label's face, so `1cap` is the label's cap height and the dot centres on its
       first line however many lines it wraps to. */
    font: var(--sui-weight-semibold) var(--sui-font-size-meta) / var(--sui-leading-flat)
      var(--sui-sans);
    inline-size: var(--sui-icon-base);
    margin-block: round(calc((1cap - var(--sui-icon-base)) / 2), 1px);
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
    block-size: var(--sui-block-snap);
    color: var(--sui-text-primary);
    font: var(--sui-weight-semibold) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    text-box: trim-both cap alphabetic;
    text-wrap: pretty;
  }

  .sui-choice-card:has(input:checked) .sui-choice-card-label {
    color: var(--sui-brand-action-text);
  }

  .sui-choice-card-description {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    grid-column: 2;
    text-box: trim-both cap alphabetic;
    text-wrap: pretty;
  }

  .disabled {
    cursor: default;
    opacity: var(--sui-disabled-opacity);
  }

  .sui-choice-cards-help,
  .sui-choice-cards-words {
    block-size: var(--sui-block-snap);
    margin: 0;
    min-inline-size: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sui-choice-cards-help {
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
  }

  .sui-choice-cards-error {
    align-items: start;
    color: var(--sui-danger);
    column-gap: var(--sui-space-1);
    display: grid;
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    grid-template-columns: auto minmax(0, 1fr);
    margin: 0;
  }

  /* Centred on the first line's cap height, however many lines the error wraps to. */
  .sui-choice-cards-mark {
    display: flex;
    margin-block: round(calc((1cap - var(--sui-icon-xs)) / 2), 1px);
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-choice-card {
      transition: none;
    }

    .sui-choice-card:active:not(.disabled) {
      translate: none;
    }
  }

  /* High contrast drops the grounds, the frame's shadow and the dot's fill, so the frame and
     the chosen card draw outlines, an invalid frame twice as wide, and the dot fills in system
     colours. */
  @media (forced-colors: active) {
    .sui-choice-cards-grid {
      outline: var(--sui-stroke) solid CanvasText;
      outline-offset: calc(-1 * var(--sui-stroke));
    }

    .sui-choice-cards-grid.invalid {
      outline-width: var(--sui-stroke-bold);
      outline-offset: calc(-1 * var(--sui-stroke-bold));
    }

    .sui-choice-card:has(input:checked) {
      outline: var(--sui-stroke-bold) solid Highlight;
      outline-offset: var(--sui-focus-ring-inset);
    }

    .sui-choice-card:has(input:checked) .sui-choice-card-dot::after {
      background: Highlight;
      forced-color-adjust: none;
    }
  }

  @media (hover: hover) and (forced-colors: active) {
    .sui-choice-card:hover:not(.disabled, :has(input:checked)) {
      outline: var(--sui-stroke) solid Highlight;
      outline-offset: calc(-1 * var(--sui-stroke));
    }
  }
</style>
