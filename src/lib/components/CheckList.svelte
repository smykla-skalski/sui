<script module lang="ts">
  export type CheckListOption = {
    value: string;
    label: string;
    /** One sentence under the label. */
    description?: string;
    /** Keeps an unavailable choice visible. */
    disabled?: boolean;
  };
</script>

<script lang="ts">
  import { word } from '../words.js';
  import type { HTMLFieldsetAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import Checkbox from './Checkbox.svelte';
  import VisuallyHidden from './VisuallyHidden.svelte';

  const id = $props.id();

  let {
    label,
    options,
    value = $bindable([]),
    name = id,
    hint,
    error,
    required = false,
    requiredLabel = word('CheckList.requiredLabel', 'Required'),
    disabled = false,
    onchange,
    'aria-describedby': describedBy,
    class: className = '',
    ...rest
  }: {
    /** The question the boxes answer, drawn as the group's legend. */
    label: string;
    options: ReadonlyArray<CheckListOption>;
    /** The chosen values, in the order of `options`. */
    value?: string[];
    name?: string;
    hint?: string;
    /** Says what is wrong. Every box is marked invalid and the group is described by it. */
    error?: string;
    /** At least one box must be chosen: the legend says `requiredLabel`, and the caller checks it on send. */
    required?: boolean;
    /** The word after the legend of a group that must be answered. */
    requiredLabel?: string;
    /** Locks every box while the group cannot change, such as during a save; focus stays where it is. */
    disabled?: boolean;
    /** Hears the chosen values after each toggle. */
    onchange?: (value: string[]) => void;
    class?: HTMLFieldsetAttributes['class'];
  } & Omit<HTMLFieldsetAttributes, 'children' | 'onchange' | 'disabled'> = $props();

  const stacked = $derived(options.some((option) => option.description));
  const describedby = $derived(
    [describedBy, hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') ||
      undefined
  );

  function toggle(option: string, on: boolean) {
    value = options
      .map((choice) => choice.value)
      .filter((choice) => (choice === option ? on : value.includes(choice)));
    onchange?.(value);
  }
</script>

<!--
@component
Several boxes that answer one question, any number of them at once, with the question as the
legend. `bind:value` holds the chosen values in the order of `options`, whatever order they
were picked in.

Short labels run along one wrapping line. Once any option carries a description, every option
takes its own line so the sentences read down. The boxes' edge lines up with the legend and
the text around the group, because each item's hover ground bleeds out into the margin.
`disabled` locks the boxes with `aria-disabled` rather than `disabled`, so a box that holds
focus while the group saves keeps it.

- Semantics: a `<fieldset>` named by its `<legend>`, described by the hint and the error, holding native checkboxes, with a polite `role="status"` that speaks the error.
- Content: a question as the legend, two or more options with short labels and optional descriptions, an optional hint and an error.
- States: each box's own states, required (the word after the legend), invalid (every box's danger edge and an error with a warning mark), locked while saving and disabled options.
- Keyboard: Tab moves from box to box and Space toggles one; a locked group refuses the toggle and keeps focus.
- Pointer and touch: each item is its own target, 34px tall, 44px with a description, on a phone or any touch screen.
- Focus: it never moves focus, and locking the group leaves focus on the box that had it.
- Responsive: short labels wrap along a line, and options with descriptions stack one per line.
- Accessibility: the legend names the group, the required word is read with it, the hint and error describe it, and the error is spoken when it appears.
- Localization: `requiredLabel` is a prop with an English default, the question, options and messages come from the caller, and the layout is logical.
- Performance: one checkbox per option; nothing animates beyond the boxes' own states.
- Analytics: `onchange` hears the chosen values after each toggle.
- Failure: an `error` is drawn with a mark and words and spoken, and an unavailable option stays visible and disabled.
-->

<fieldset {...rest} class={['sui-check-list', className]} aria-describedby={describedby}>
  <legend class="sui-check-list-legend"
    >{label}{#if required}{' '}<span class="sui-check-list-required">{requiredLabel}</span
      >{/if}</legend
  >
  <div class="sui-check-list-items" class:stacked>
    {#each options as option (option.value)}
      <Checkbox
        {name}
        value={option.value}
        label={option.label}
        description={option.description}
        checked={value.includes(option.value)}
        disabled={option.disabled}
        aria-disabled={disabled || undefined}
        invalid={Boolean(error)}
        onchange={(event) => toggle(option.value, event.currentTarget.checked)}
      />
    {/each}
  </div>
  {#if hint}<p id="{id}-hint" class="sui-check-list-help">{hint}</p>{/if}
  <!-- The status speaks the error, so the drawn copy stays out of the tree; the group's
       description still reads it. -->
  {#if error}
    <p id="{id}-error" class="sui-check-list-error" aria-hidden="true">
      <span class="sui-check-list-mark"><Icon name="alert" size="xs" /></span>
      <span class="sui-check-list-words">{error}</span>
    </p>
  {/if}
  <VisuallyHidden role="status">{error ?? ''}</VisuallyHidden>
</fieldset>

<style>
  .sui-check-list {
    border: 0;
    display: grid;
    gap: var(--sui-row-copy-gap);
    margin: 0;
    min-inline-size: 0;
    padding: 0;
  }

  .sui-check-list-legend {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    float: inline-start;
    font: var(--sui-weight-semibold) var(--sui-font-size-control) / var(--sui-row-copy-leading)
      var(--sui-sans);
    padding: 0;
    text-box: trim-both cap alphabetic;
  }

  .sui-check-list-required {
    color: var(--sui-text-muted);
    font-weight: var(--sui-weight-regular);
    margin-inline-start: var(--sui-space-1);
  }

  .sui-check-list-items {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-1) var(--sui-space-3);
    margin-inline-start: calc(-1 * var(--sui-space-2));
    min-inline-size: 0;
  }

  .stacked {
    flex-direction: column;
    gap: var(--sui-space-1);
  }

  .sui-check-list-help,
  .sui-check-list-words {
    block-size: var(--sui-block-snap);
    margin: 0;
    min-inline-size: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sui-check-list-help {
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
  }

  .sui-check-list-error {
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
  .sui-check-list-mark {
    display: flex;
    margin-block: round(calc((1cap - var(--sui-icon-xs)) / 2), 1px);
  }
</style>
