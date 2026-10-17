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
  import type { HTMLFieldsetAttributes } from 'svelte/elements';
  import Checkbox from './Checkbox.svelte';

  const id = $props.id();

  let {
    label,
    options,
    value = $bindable([]),
    name = id,
    hint,
    error,
    disabled = false,
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
    disabled?: boolean;
    class?: HTMLFieldsetAttributes['class'];
  } & Omit<HTMLFieldsetAttributes, 'children'> = $props();

  const stacked = $derived(options.some((option) => option.description));
  const describedby = $derived(
    [describedBy, hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') ||
      undefined
  );

  function toggle(option: string, on: boolean) {
    value = options
      .map((choice) => choice.value)
      .filter((choice) => (choice === option ? on : value.includes(choice)));
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
-->

<fieldset {...rest} class={['sui-check-list', className]} {disabled} aria-describedby={describedby}>
  <legend class="sui-check-list-legend">{label}</legend>
  <div class="sui-check-list-items" class:stacked>
    {#each options as option (option.value)}
      <Checkbox
        {name}
        value={option.value}
        label={option.label}
        description={option.description}
        checked={value.includes(option.value)}
        disabled={disabled || option.disabled}
        invalid={Boolean(error)}
        onchange={(event) => toggle(option.value, event.currentTarget.checked)}
      />
    {/each}
  </div>
  {#if hint}<p id="{id}-hint" class="sui-check-list-help">{hint}</p>{/if}
  {#if error}<p id="{id}-error" class="sui-check-list-error">{error}</p>{/if}
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
    color: var(--sui-text-secondary);
    float: inline-start;
    font: 600 var(--sui-font-size-control) / var(--sui-row-copy-leading) var(--sui-sans);
    padding: 0;
    text-box: trim-both cap alphabetic;
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
  .sui-check-list-error {
    margin: 0;
    text-box: trim-both cap alphabetic;
  }

  .sui-check-list-help {
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-compact) / var(--sui-row-copy-leading) var(--sui-sans);
  }

  .sui-check-list-error {
    color: var(--sui-danger);
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
  }
</style>
