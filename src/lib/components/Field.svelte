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
  import type { Snippet } from 'svelte';
  import type { HTMLInputAttributes } from 'svelte/elements';
  import TextInput from './TextInput.svelte';

  const fallbackId = $props.id();

  let {
    label,
    hint,
    error,
    required = false,
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
    /** Shows the word "Required" beside the label and marks the control required. */
    required?: boolean;
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

  const describedby = $derived(
    [describedBy, hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') ||
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
-->

<div class="sui-field" data-layout={layout}>
  {#if required}
    <div class="sui-field-head">
      <label class="sui-field-label" for={id}>{label}</label>
      <span class="sui-field-required" aria-hidden="true">Required</span>
    </div>
  {:else}
    <label class="sui-field-label" for={id}>{label}</label>
  {/if}
  <div class="sui-field-control">
    {#if control}
      {@render control({ id, describedby, invalid: Boolean(error), required })}
    {:else}
      <TextInput
        {...rest}
        {id}
        {type}
        {required}
        class={className}
        bind:value
        invalid={Boolean(error)}
        aria-describedby={describedby}
      />
    {/if}
  </div>
  {#if hint}<p id="{id}-hint" class="sui-field-help">{hint}</p>{/if}
  {#if error}<p id="{id}-error" class="sui-field-error">{error}</p>{/if}
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
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: 600 var(--sui-font-size-control) / var(--sui-row-copy-leading) var(--sui-sans);
    min-inline-size: 0;
    text-box: trim-both cap alphabetic;
  }

  .sui-field-head {
    align-items: baseline;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-1) var(--sui-space-2);
    min-inline-size: 0;
  }

  .sui-field-required {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-muted);
    font: 400 var(--sui-font-size-control) / var(--sui-row-copy-leading) var(--sui-sans);
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
  .sui-field-error {
    block-size: var(--sui-block-snap);
    margin: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sui-field-help {
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
  }

  .sui-field-error {
    color: var(--sui-danger);
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
  }
</style>
