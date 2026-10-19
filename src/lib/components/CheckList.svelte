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
  import { mark, word } from '../words.js';
  import type { Attachment } from 'svelte/attachments';
  import type { HTMLFieldsetAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import { setRefusals } from '../internal/refusals.svelte.js';
  import Checkbox from './Checkbox.svelte';
  import VisuallyHidden from './VisuallyHidden.svelte';

  const id = $props.id();
  const refusals = setRefusals();

  let {
    label,
    options,
    value = $bindable([]),
    name = id,
    hint,
    error,
    required = false,
    requiredLabel = word('CheckList.requiredLabel', 'Required'),
    requiredMessage = word('CheckList.requiredMessage', 'Choose at least one option'),
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
    /** At least one box must be chosen: the legend says `requiredLabel`, and a form refuses a send with none. */
    required?: boolean;
    /** The word after the legend of a group that must be answered. */
    requiredLabel?: string;
    /** Said under the group when a send leaves a required group with no box chosen. */
    requiredMessage?: string;
    /** Locks every box while the group cannot change, such as during a save; focus stays where it is. */
    disabled?: boolean;
    /** Hears the chosen values after each toggle. */
    onchange?: (value: string[]) => void;
    class?: HTMLFieldsetAttributes['class'];
  } & Omit<HTMLFieldsetAttributes, 'children' | 'onchange' | 'disabled'> = $props();

  const stacked = $derived(options.some((option) => option.description));
  const shown = $derived(refusals.message(error));
  const describedby = $derived(
    [describedBy, hint && `${id}-hint`, shown && `${id}-error`].filter(Boolean).join(' ') ||
      undefined
  );
  const first = $derived(options.find((option) => !option.disabled));

  /* No native constraint asks for one of several boxes, so the first box that can be chosen
     carries it as a custom one, and the form refuses a send with none chosen. */
  const oneChosen: Attachment<HTMLInputElement> = (box) => {
    box.setCustomValidity(required && value.length === 0 ? requiredMessage : '');
    return () => box.setCustomValidity('');
  };

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

A `required` group is a native constraint: a form refuses a send with no box chosen, says
`requiredMessage` under the group in place of the browser's bubble and moves focus to the first
box. Choosing one lifts it. A caller's `error` always wins.

- Semantics: a `<fieldset>` named by its `<legend>`, described by the hint and the error, holding native checkboxes, with a polite `role="status"` that speaks the error.
- Content: a question as the legend, two or more options with short labels and optional descriptions, an optional hint and an error.
- States: each box's own states, required (the word after the legend), invalid (every box's danger edge and an error with a warning mark, from `error` or from a refused send), locked while saving and disabled options.
- Keyboard: Tab moves from box to box and Space toggles one; a locked group refuses the toggle and keeps focus.
- Pointer and touch: each item is its own target, 34px tall, 44px with a description, on a phone or any touch screen.
- Focus: locking the group leaves focus on the box that had it, and a send refused for a required group with none chosen moves focus to its first box when it is the form's first refused control.
- Responsive: short labels wrap along a line, and options with descriptions stack one per line.
- Accessibility: the legend names the group, the required word is read with it, the hint and error describe it, and the error is spoken when it appears.
- Localization: `requiredLabel` and `requiredMessage` are props with English defaults, the question, options and messages come from the caller, and the layout is logical.
- Performance: one checkbox per option; nothing animates beyond the boxes' own states.
- Analytics: `onchange` hears the chosen values after each toggle.
- Failure: an `error`, or a required group a send left empty, is drawn with a mark and words and spoken, and an unavailable option stays visible and disabled.
-->

<fieldset
  {...rest}
  class={['sui-check-list', className]}
  aria-describedby={describedby}
  {@attach refusals.area}
>
  <legend class="sui-check-list-legend"
    >{label}{#if required}<span class="sui-check-list-required">{mark('space')}{requiredLabel}</span
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
        invalid={Boolean(shown)}
        onchange={(event) => toggle(option.value, event.currentTarget.checked)}
        {@attach option === first ? oneChosen : undefined}
      />
    {/each}
  </div>
  {#if hint}<p id="{id}-hint" class="sui-check-list-help">{hint}</p>{/if}
  <!-- The status speaks the error, so the drawn copy stays out of the tree; the group's
       description still reads it. -->
  {#if shown}
    <p id="{id}-error" class="sui-check-list-error" aria-hidden="true">
      <span class="sui-check-list-mark"><Icon name="alert" size="xs" /></span>
      <span class="sui-check-list-words">{shown}</span>
    </p>
  {/if}
  <VisuallyHidden role="status">{shown ?? ''}</VisuallyHidden>
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
    align-content: center;
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
    align-content: center;
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
