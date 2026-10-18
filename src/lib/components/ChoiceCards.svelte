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
  import { setRefusals } from '../internal/refusals.svelte.js';
  import VisuallyHidden from './VisuallyHidden.svelte';

  const id = $props.id();
  const refusals = setRefusals();

  let {
    label,
    options,
    value = $bindable(null),
    name = id,
    hint,
    error,
    validationMessage,
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
    /** Said in place of the browser's own words when a send leaves a required question unanswered, such as "Choose a plan". */
    validationMessage?: string;
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

  const shown = $derived(refusals.message(error, validationMessage));
  const describedby = $derived(
    [describedBy, hint && `${id}-hint`, shown && `${id}-error`].filter(Boolean).join(' ') ||
      undefined
  );
</script>

<!--
@component
One answer to one question, where every answer needs a sentence to say what it does, so
nothing has to be tried to find out. Answers that a word names are a `SegmentedControl`.

Each answer is a framed card of its own, 12px from the next, with its dot in the top end
corner on the label's first line, as radio cards are drawn across design systems, so the reader
sees at once how many answers there are. They sit side by side while each has 14rem and stack
when they do not. The chosen card wears a brand tint, a 2px brand edge and a filled dot
together, so the choice never rests on colour alone, and choosing moves nothing.
These are native radios, so the arrow keys move the choice and skip disabled answers.
`disabled` locks the whole group with `aria-disabled`, so a radio that holds focus during a
save keeps it.

- Semantics: a `<fieldset role="radiogroup">` named by its `<legend>`, described by the hint and the error, holding native radios each named by its label and described by its sentence, with a polite `role="status"` that speaks the error.
- Content: a question as the legend and two to six answers, each a short label and one sentence; an optional hint and an error.
- States: unchosen (a quiet edge), chosen (a brand tint, a 2px brand edge and a filled dot), hover (a veil and a firmer edge), focus (a flush 2px ring on a focus-coloured edge), pressed (a deeper ground, an inset shadow and a 1px sink), required (the word after the legend), invalid (a danger edge on every unchosen card and an error with a warning mark, from `error` or from a refused send), locked and disabled answers (0.5 opacity).
- Keyboard: Tab enters the group at the chosen answer, the arrows move the choice and skip disabled answers, and Space chooses; a locked group refuses all of them and keeps focus.
- Pointer and touch: every card is its own target, at least 72px tall.
- Focus: locking the group leaves focus on the radio that had it, and a send that leaves a required question unanswered moves focus to its first radio when it is the form's first refused control.
- Responsive: the cards sit side by side while each has 14rem and stack when they do not; long sentences wrap.
- Accessibility: the legend names the group, the required word is read with it, each card's label names its radio and its sentence describes it, and the error is spoken when it appears.
- Localization: `requiredLabel` is a prop with an English default, the question, answers and `validationMessage` come from the caller, a refusal without `validationMessage` is in the browser's words for the reader's language, and the dot and the layout follow the reading direction.
- Performance: one radio per answer; colours and edges change at once, and only the 1px sink moves.
- Analytics: `onchange` hears each answer the reader picks.
- Failure: an `error`, or a required question a send left unanswered, is drawn with a mark and words and spoken in place of the browser's bubble, and an unavailable answer stays visible and disabled.
-->

<fieldset
  {...rest}
  class={['sui-choice-cards', className]}
  role="radiogroup"
  aria-describedby={describedby}
  aria-disabled={disabled || undefined}
  aria-invalid={shown ? true : undefined}
  aria-required={required || undefined}
  {@attach refusals.area}
>
  <legend class="sui-choice-cards-legend"
    >{label}{#if required}<span class="sui-choice-cards-required"
        >{mark('space')}{requiredLabel}</span
      >{/if}</legend
  >
  <div class={['sui-choice-cards-grid', { invalid: Boolean(shown) }]}>
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
          {@attach refusals.watch}
        />
        <span id="{id}-{index}-label" class="sui-choice-card-label">{option.label}</span>
        <span class="sui-choice-card-dot" aria-hidden="true"></span>
        <span id="{id}-{index}-description" class="sui-choice-card-description"
          >{option.description}</span
        >
      </label>
    {/each}
  </div>
  {#if hint}<p id="{id}-hint" class="sui-choice-cards-help">{hint}</p>{/if}
  <!-- The status speaks the error, so the drawn copy stays out of the tree; the group's
       description still reads it. -->
  {#if shown}
    <p id="{id}-error" class="sui-choice-cards-error" aria-hidden="true">
      <span class="sui-choice-cards-mark"><Icon name="alert" size="xs" /></span>
      <span class="sui-choice-cards-words">{shown}</span>
    </p>
  {/if}
  <VisuallyHidden role="status">{shown ?? ''}</VisuallyHidden>
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
    align-content: center;
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

  /* Each answer is a card of its own, so the reader sees how many there are and where each
     ends; they sit side by side while each has 14rem and stack when they do not. */
  .sui-choice-cards-grid {
    display: grid;
    gap: var(--sui-space-3);
    grid-template-columns: repeat(auto-fit, minmax(min(14rem, 100%), 1fr));
  }

  /* The label and the sentence take the start column and the dot the top end corner, on the
     label's first line (L-94). */
  .sui-choice-card {
    align-content: start;
    align-items: start;
    background-color: var(--sui-control-bg);
    border-radius: var(--sui-radius-surface);
    box-shadow: inset 0 0 0 var(--sui-stroke) var(--sui-control-border);
    box-sizing: border-box;
    cursor: pointer;
    display: grid;
    gap: var(--sui-row-copy-gap) var(--sui-space-3);
    grid-template-columns: minmax(0, 1fr) auto;
    min-block-size: 72px;
    min-inline-size: 0;
    padding: var(--sui-space-4);
    position: relative;
    transition: translate var(--sui-duration-press) var(--sui-ease-standard);
    -webkit-user-select: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  /* An answer still missing marks every card, as an invalid field marks its frame. */
  .invalid .sui-choice-card:not(:has(input:checked)) {
    box-shadow: inset 0 0 0 var(--sui-stroke) var(--sui-danger);
  }

  /* Hover and press lay a veil over the card's own ground, its rest fill or its brand tint. */
  @media (hover: hover) {
    .sui-choice-card:hover:not(:active, .disabled) {
      background-image: linear-gradient(
        var(--sui-interactive-hover-layer),
        var(--sui-interactive-hover-layer)
      );
    }

    .sui-choice-card:hover:not(:active, .disabled, :has(input:checked)) {
      box-shadow: inset 0 0 0 var(--sui-stroke) var(--sui-control-border-hover);
    }

    /* A card in a group still missing its answer hovers in the danger hue, as an invalid field
       does, so the hover never hides the state (L-9). */
    .invalid .sui-choice-card:hover:not(:active, .disabled, :has(input:checked)) {
      background-image: linear-gradient(
        var(--sui-danger-hover-layer),
        var(--sui-danger-hover-layer)
      );
      box-shadow: inset 0 0 0 var(--sui-stroke) var(--sui-danger-hover);
    }
  }

  /* The chosen answer says so three ways at once: a brand tint, a 2px brand edge and a filled
     dot, so the choice never rests on colour alone. The edge is drawn inside the card, so
     choosing moves nothing. */
  .sui-choice-card:has(input:checked) {
    background-color: var(--sui-brand-action-tint);
    box-shadow: inset 0 0 0 var(--sui-stroke-bold) var(--sui-brand-action);
  }

  .sui-choice-card:active:not(.disabled) {
    background-image: linear-gradient(
      var(--sui-interactive-pressed),
      var(--sui-interactive-pressed)
    );
    box-shadow:
      var(--sui-pressed-inset),
      inset 0 0 0 var(--sui-stroke) var(--sui-control-border-hover);
    translate: 0 1px;
  }

  .sui-choice-card:has(input:checked):active:not(.disabled) {
    box-shadow:
      var(--sui-pressed-inset),
      inset 0 0 0 var(--sui-stroke-bold) var(--sui-brand-action);
  }

  /* The radio is the focus target and wears the ring, so it covers the card without its
     native paint. The card is framed, so the ring is flush and its edge takes the focus
     colour under it (L-41). */
  .sui-choice-card input {
    appearance: none;
    background: none;
    border: 0;
    border-radius: inherit;
    cursor: inherit;
    inset: 0;
    margin: 0;
    position: absolute;
  }

  .sui-choice-card:has(input:focus-visible) {
    box-shadow: inset 0 0 0 var(--sui-stroke) var(--sui-focus);
  }

  .sui-choice-card input:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-flush);
  }

  .sui-choice-card-dot {
    background: var(--sui-surface-base);
    block-size: var(--sui-icon-base);
    border: var(--sui-stroke-bold) solid var(--sui-border-strong);
    border-radius: 50%;
    box-sizing: border-box;
    /* The label's face, so `1cap` is the label's cap height and the dot centres on its
       snapped first line however many lines it wraps to. */
    font: var(--sui-weight-semibold) var(--sui-font-size-meta) / var(--sui-leading-flat)
      var(--sui-sans);
    grid-column: 2;
    grid-row: 1;
    inline-size: var(--sui-icon-base);
    margin-block: calc((round(up, 1cap, 2px) - var(--sui-icon-base)) / 2);
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
    align-content: center;
    block-size: var(--sui-block-snap-even);
    color: var(--sui-text-primary);
    font: var(--sui-weight-semibold) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    text-box: trim-both cap alphabetic;
    text-wrap: pretty;
  }

  .sui-choice-card-description {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    grid-column: 1;
    text-box: trim-both cap alphabetic;
    text-wrap: pretty;
  }

  .disabled {
    cursor: default;
    opacity: var(--sui-disabled-opacity);
  }

  .sui-choice-cards-help,
  .sui-choice-cards-words {
    align-content: center;
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

  /* High contrast drops the grounds, the edges and the dot's fill, so every card draws an
     outline, an invalid one twice as wide, the chosen one in `Highlight`, and the dot fills in
     system colours. */
  @media (forced-colors: active) {
    .sui-choice-card {
      outline: var(--sui-stroke) solid CanvasText;
      outline-offset: calc(-1 * var(--sui-stroke));
    }

    .invalid .sui-choice-card:not(:has(input:checked)) {
      outline-width: var(--sui-stroke-bold);
      outline-offset: calc(-1 * var(--sui-stroke-bold));
    }

    .sui-choice-card:has(input:checked) {
      outline: var(--sui-stroke-bold) solid Highlight;
      outline-offset: calc(-1 * var(--sui-stroke-bold));
    }

    .sui-choice-card:has(input:checked) .sui-choice-card-dot::after {
      background: Highlight;
      forced-color-adjust: none;
    }
  }

  @media (hover: hover) and (forced-colors: active) {
    .sui-choice-card:hover:not(.disabled, :has(input:checked)) {
      outline-color: Highlight;
    }
  }
</style>
