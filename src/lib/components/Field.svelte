<script module lang="ts">
  export type FieldControl = {
    /** Put this on the control so the field's label names it. */
    id: string;
    /** The hint and error ids, for the control's `aria-describedby`. */
    describedby: string | undefined;
    /** True while the field shows an error. */
    invalid: boolean;
    /** True when the field must be filled. Put `required` on a native control, `aria-required` on any other. */
    required: boolean;
  };
</script>

<script lang="ts">
  import { word } from '../words.js';
  import type { Snippet } from 'svelte';
  import type { HTMLInputAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import { setRefusals } from '../internal/refusals.svelte.js';
  import TextInput from './TextInput.svelte';
  import VisuallyHidden from './VisuallyHidden.svelte';

  const fallbackId = $props.id();
  const refusals = setRefusals();

  let {
    label,
    hint,
    error,
    validationMessage,
    required = false,
    requiredLabel = word('Field.requiredLabel', 'Required'),
    value = $bindable(''),
    type = 'text',
    layout = 'stack',
    control,
    id = fallbackId,
    'aria-describedby': describedBy,
    class: className = '',
    ...rest
  }: {
    label: string;
    /** One sentence under the control that helps the reader fill it in. */
    hint?: string;
    /** Says what is wrong. The control is marked invalid and described by it. */
    error?: string;
    /** Said in place of the browser's own words when its check refuses the value, such as "Enter a repository name". */
    validationMessage?: string;
    /** Shows `requiredLabel` beside the label and marks the control required. */
    required?: boolean;
    /** The word beside the label of a field that must be filled. */
    requiredLabel?: string;
    value?: string | number | null;
    type?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number';
    /** `row` puts the label beside a switch instead of above the control. */
    layout?: 'stack' | 'row';
    /** Draws any control in place of the text input, such as `Textarea` or `Switch`. */
    control?: Snippet<[FieldControl]>;
    /** Lands on the text input, never on the field. */
    class?: HTMLInputAttributes['class'];
    id?: string;
  } & Omit<HTMLInputAttributes, 'value' | 'type' | 'id'> = $props();

  const shown = $derived(refusals.message(error, validationMessage));
  const describedby = $derived(
    [describedBy, hint && `${id}-hint`, shown && `${id}-error`].filter(Boolean).join(' ') ||
      undefined
  );
</script>

<!--
@component
A label, its control, and the help and error under it, 8px apart as rendered ink. With no
`control` it draws a `TextInput`, and every native input attribute, `bind:value` and `class`
land on that input.

Any other control goes in the `control` snippet, which receives the `id` the label points at,
the `describedby` ids of the hint and the error, `invalid` and `required`. Spread them onto a
`Textarea`, a `Select`, a `Checkbox` or a picker. `layout="row"` sets the label beside a
checkbox or a switch, both centred on one line.

`required` writes the word "Required" beside the label, never only an asterisk, and marks
the control. The word stays out of the accessibility tree, because the control already
announces itself as required.

A group of choices names itself with a legend, so `CheckList`, `ChoiceCards` and
`SegmentedControl` stand on their own instead of inside a field.

An error leads with a warning mark, so it differs from the hint by more than colour, and a
polite status speaks it when it appears or changes.

Validation stays native: a form refuses a send that breaks `required`, `pattern`, `type`,
`min` or `max`. The refusal shows here as the error, in place of the browser's bubble, which
takes no style. It reads `validationMessage` when the caller gives one, and else the browser's
own words in the reader's language. Focus moves to the first refused control, and its field
scrolls into view. The error lifts once the value is fixed, and a value still wrong when the
reader leaves it gets its new reason then. A caller's `error` always wins. A SUI control in
the `control` snippet reports here on its own, and a control of another kind keeps the bubble.

- Semantics: a `<label for>` that names the control, a hint and an error that describe it through `aria-describedby`, and a polite `role="status"` that speaks the error.
- Content: `label` (a few words, sentence case), an optional one-sentence `hint`, an optional `error` that says what is wrong and how to fix it, and any one control.
- States: rest, required (the word beside the label and a required control), with a hint, invalid (the control's danger edge and an error with a warning mark, from `error` or from a send the browser's check refused) and disabled (the control's own look).
- Keyboard: a press on the label focuses the control; the control brings its own keys.
- Pointer and touch: the label is part of a text control's target, and the control keeps its own sizes.
- Focus: a send the browser's check refuses moves focus to the first refused control and scrolls its field into view, clear of the page's sticky bars through the page's scroll padding.
- Responsive: it fills its column, and a long label, hint or error wraps with the same 8px gap between lines; `row` keeps a switch or checkbox beside a label that wraps.
- Accessibility: the label names the control, hint and error describe it, the error is spoken when it appears, and every line holds 4.5:1.
- Localization: `requiredLabel` is a prop with an English default, the label, hint, error and `validationMessage` come from the caller, a refusal without `validationMessage` is in the browser's words for the reader's language, and the layout is logical.
- Performance: static markup and one status per field; nothing animates.
- Analytics: none of its own; the control reports through its own callbacks.
- Failure: an `error` or a refused value is drawn with a mark and words and spoken, and a missing `label` is a type error, so a field is never unnamed.
-->

<div class="sui-field" data-layout={layout} {@attach refusals.area}>
  {#if required}
    <div class="sui-field-head">
      <label class="sui-field-label" for={id}>{label}</label>
      <span class="sui-field-required" aria-hidden="true">{requiredLabel}</span>
    </div>
  {:else}
    <label class="sui-field-label" for={id}>{label}</label>
  {/if}
  <div class="sui-field-control">
    {#if control}
      {@render control({ id, describedby, invalid: Boolean(shown), required })}
    {:else}
      <TextInput
        {...rest}
        {id}
        {type}
        {required}
        class={className}
        bind:value
        invalid={Boolean(shown)}
        aria-describedby={describedby}
      />
    {/if}
  </div>
  {#if hint}<p id="{id}-hint" class="sui-field-help">{hint}</p>{/if}
  <!-- The status speaks the error, so the drawn copy stays out of the tree; the control's
       description still reads it. -->
  {#if shown}
    <p id="{id}-error" class="sui-field-error" aria-hidden="true">
      <span class="sui-field-error-mark"><Icon name="alert" size="xs" /></span>
      <span class="sui-field-error-text">{shown}</span>
    </p>
  {/if}
  <VisuallyHidden role="status">{shown ?? ''}</VisuallyHidden>
</div>

<style>
  .sui-field {
    display: grid;
    gap: var(--sui-row-copy-gap);
    min-inline-size: 0;
  }

  .sui-field[data-layout='row'] {
    align-items: center;
    column-gap: var(--sui-space-4);
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .sui-field[data-layout='row'] > :is(.sui-field-help, .sui-field-error) {
    grid-column: 1 / -1;
  }

  .sui-field-label {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-semibold) var(--sui-font-size-control) / var(--sui-row-copy-leading)
      var(--sui-sans);
    min-inline-size: 0;
    text-box: trim-both cap alphabetic;
  }

  /* The label of a box or a switch flips it on a click, so it shows the pointer (L-100). */
  .sui-field:has(
      .sui-field-control :global(:is(input[type='checkbox'], input[type='radio']):not(:disabled))
    )
    .sui-field-label {
    cursor: pointer;
  }

  .sui-field-head {
    align-items: baseline;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-1) var(--sui-space-2);
    min-inline-size: 0;
  }

  .sui-field-required {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-muted);
    font: var(--sui-weight-regular) var(--sui-font-size-control) / var(--sui-row-copy-leading)
      var(--sui-sans);
    text-box: trim-both cap alphabetic;
  }

  .sui-field-control {
    display: grid;
    min-inline-size: 0;
  }

  .sui-field[data-layout='row'] > .sui-field-control {
    align-items: center;
    display: flex;
    min-block-size: var(--sui-control-height-compact);
  }

  .sui-field-help,
  .sui-field-error-text {
    align-content: center;
    block-size: var(--sui-block-snap);
    margin: 0;
    min-inline-size: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sui-field-help {
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
  }

  .sui-field-error {
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
  .sui-field-error-mark {
    display: flex;
    margin-block: round(calc((1cap - var(--sui-icon-xs)) / 2), 1px);
  }
</style>
