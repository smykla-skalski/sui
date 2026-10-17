<script lang="ts">
  import type { HTMLAttributes, HTMLInputAttributes } from 'svelte/elements';
  import JoinedField from '../internal/JoinedField.svelte';
  import CopyButton from './CopyButton.svelte';
  import Field, { type FieldControl } from './Field.svelte';
  import TextInput from './TextInput.svelte';

  let {
    value,
    label,
    hint,
    copyLabel = 'Copy link',
    class: className = '',
    ...rest
  }: {
    /** The link or token, shown in full and put on the clipboard as it is. */
    value: string;
    /** Draws a `Field` label over the value. Without one, name the field with `aria-label`. */
    label?: string;
    /** One sentence under the field, such as when the link stops working. */
    hint?: string;
    /** The copy button's resting label, naming what it copies. */
    copyLabel?: string;
    /** Layout for the call site only, on the whole field. */
    class?: HTMLAttributes<HTMLDivElement>['class'];
  } & Omit<HTMLInputAttributes, 'value' | 'type' | 'readonly' | 'class' | 'children'> = $props();
</script>

<!--
@component
A generated link or token, shown so it can be read, copied in one press, or selected and
copied by hand. The value sits in a read-only mono field, never a disabled one, because a
disabled field cannot be selected, and selecting it is the way out when the clipboard is not
available. Tabbing into the field selects the whole value.

The field and its `CopyButton` are one control: the copy action is a chip inside the field's end,
under one frame and one focus ring. The copy part confirms with "Copied". A long value scrolls inside the field and
never widens the row. With `label` the pair sits in a `Field`, and the
label names the text field.
-->

{#snippet row(control?: FieldControl)}
  <JoinedField>
    {#snippet start()}
      <TextInput
        {...rest}
        bare
        id={control?.id ?? rest.id}
        aria-describedby={control?.describedby ?? rest['aria-describedby']}
        {value}
        readonly
        mono
      />
    {/snippet}
    {#snippet end()}<CopyButton text={value} label={copyLabel} bare />{/snippet}
  </JoinedField>
{/snippet}

<div class={['sui-copyable-link-field', className]}>
  {#if label}
    <Field {label} {hint} id={rest.id ?? undefined} control={row} />
  {:else}
    {@render row()}
  {/if}
</div>

<style>
  .sui-copyable-link-field {
    min-inline-size: 0;
  }
</style>
