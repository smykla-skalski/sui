<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import IconButton from './IconButton.svelte';
  import TextInput from './TextInput.svelte';

  let {
    value = $bindable(''),
    label,
    clearLabel = 'Clear the search',
    element = $bindable(null),
    class: className = '',
    onkeydown,
    ...rest
  }: {
    value?: string;
    /** The accessible name. The magnifier says what the box is only to somebody looking at it. */
    label: string;
    /** The clear button's name and tooltip. */
    clearLabel?: string;
    element?: HTMLInputElement | null;
    /** Layout for the call site only, never the field's own paint. */
    class?: HTMLInputAttributes['class'];
  } & Omit<HTMLInputAttributes, 'value' | 'type' | 'aria-label'> = $props();

  function clear() {
    value = '';
    element?.focus();
  }

  function onkeydownInput(event: KeyboardEvent & { currentTarget: HTMLInputElement }) {
    onkeydown?.(event);
    if (event.key !== 'Escape' || !value || event.defaultPrevented) return;
    // Only a press that had something to clear is spent here; the next one reaches the
    // dialog or popover around the field and closes it.
    event.preventDefault();
    event.stopPropagation();
    value = '';
  }
</script>

<!--
@component
A search that narrows what is already on screen. It holds the query in `bind:value` and
reports every keystroke through `oninput`; waiting before acting on it belongs to the caller,
which is the only side that knows whether an answer costs a request.

A clear button shows once there is a query, and Escape clears it too. An Escape with nothing
to clear passes on, so the dialog or popover around the field still closes. `label` is the
accessible name and is never drawn. A search that filters is never disabled to say nothing
matches; the list says that.
-->

<div class={['sui-search-field', className]}>
  <TextInput
    bind:element
    bind:value
    {...rest}
    type="text"
    role="searchbox"
    enterkeyhint="search"
    class="search-input"
    aria-label={label}
    onkeydown={onkeydownInput}
  />
  <span class="sui-search-field-icon"><Icon name="search" size="sm" strokeWidth={2} /></span>
  {#if value}
    <span class="sui-search-field-clear">
      <IconButton icon="close" label={clearLabel} onclick={clear} />
    </span>
  {/if}
</div>

<style>
  .sui-search-field {
    align-items: center;
    display: grid;
    min-inline-size: 0;
  }

  .sui-search-field > :global(.search-input),
  .sui-search-field-icon,
  .sui-search-field-clear {
    grid-area: 1 / 1;
  }

  .sui-search-field > :global(.search-input) {
    padding-inline: var(--sui-space-8)
      var(--sui-local-control-height, var(--sui-control-height-compact));
  }

  .sui-search-field-icon {
    color: var(--sui-text-muted);
    display: flex;
    justify-self: start;
    margin-inline-start: var(--sui-space-3);
    pointer-events: none;
  }

  .sui-search-field-clear {
    display: flex;
    justify-self: end;
    /* As far from the end as the 28px button sits from the top, at either control tier. */
    margin-inline-end: calc(
      (var(--sui-local-control-height, var(--sui-control-height-compact)) - var(--sui-tier-quiet)) /
        2
    );
  }
</style>
