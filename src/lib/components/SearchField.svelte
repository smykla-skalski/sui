<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import IconButton from './IconButton.svelte';
  import TextInput from './TextInput.svelte';

  const uid = $props.id();

  let {
    value = $bindable(''),
    label,
    hideLabel = false,
    clearLabel = 'Clear the search',
    onclear,
    element = $bindable(null),
    id = `${uid}-input`,
    class: className = '',
    onkeydown,
    ...rest
  }: {
    value?: string;
    /** The accessible name and the label drawn above the field. */
    label: string;
    /** Hides the drawn label, only for a caller that draws the field's visible label itself. */
    hideLabel?: boolean;
    /** The clear button's name and tooltip. */
    clearLabel?: string;
    /** Hears each clear, by the button or by Escape. */
    onclear?: () => void;
    element?: HTMLInputElement | null;
    id?: string;
    /** Layout for the call site only, never the field's own paint. */
    class?: HTMLInputAttributes['class'];
  } & Omit<HTMLInputAttributes, 'value' | 'type' | 'aria-label' | 'id'> = $props();

  function clear() {
    value = '';
    element?.focus();
    onclear?.();
  }

  function onkeydownInput(event: KeyboardEvent & { currentTarget: HTMLInputElement }) {
    onkeydown?.(event);
    if (event.key !== 'Escape' || !value || event.defaultPrevented) return;
    // Only a press that had something to clear is spent here; the next one reaches the
    // dialog or popover around the field and closes it.
    event.preventDefault();
    event.stopPropagation();
    value = '';
    onclear?.();
  }
</script>

<!--
@component
A search that narrows what is already on screen. It holds the query in `bind:value` and
reports every keystroke through `oninput`; waiting before acting on it belongs to the caller,
which is the only side that knows whether an answer costs a request.

A clear button shows once there is a query, and Escape clears it too. An Escape with nothing
to clear passes on, so the dialog or popover around the field still closes. `label` is the
accessible name and is drawn above the field, so the field never relies on its placeholder;
`hideLabel` hides it only for a caller that draws the visible label itself, as `ListToolbar`
does beside its search. A search that filters is never
disabled to say nothing matches; the list says that, and the caller puts the number of
matches in a polite `role="status"` beside it so a screen reader hears it.

- Semantics: a text input with `role="searchbox"`, named by `label`, through a drawn `<label for>` or `aria-label`, with a clear `IconButton` once there is a query.
- Content: one line of query text, an optional placeholder that is an example, and the magnifier at the start.
- States: empty, filled (with the clear button), focus (a flush 2px ring), invalid and disabled as `TextInput` draws them.
- Keyboard: typing narrows, Escape clears a query and passes on when there is none, and Tab reaches the clear button.
- Pointer and touch: 34px tall, 44px on a phone or any touch screen, and the clear button keeps a 44px hit area there.
- Focus: clearing by the button puts focus back in the field, and Escape keeps it there.
- Responsive: it fills its container and scrolls a long query inside itself, clear of the magnifier and the button.
- Accessibility: `label` names it, the clear button has its own name, and the caller's count status says how many match.
- Localization: `clearLabel` is a prop with an English default, and the magnifier and the button sit at the start and end in either direction.
- Performance: one input and a button that mounts with the first character; it never waits or requests on its own.
- Analytics: `oninput` reports each keystroke and `onclear` each clear.
- Failure: no matches are the list's to say; the field stays enabled and keeps the query.
-->

<div class={['sui-search-field', className]}>
  {#if !hideLabel}<label class="sui-search-field-label" for={id}>{label}</label>{/if}
  <div class="sui-search-field-box">
    <TextInput
      bind:element
      bind:value
      {...rest}
      {id}
      type="text"
      role="searchbox"
      enterkeyhint="search"
      class="search-input"
      aria-label={hideLabel ? label : undefined}
      onkeydown={onkeydownInput}
    />
    <span class="sui-search-field-icon"><Icon name="search" size="sm" strokeWidth={2} /></span>
    {#if value}
      <span class="sui-search-field-clear">
        <IconButton icon="close" label={clearLabel} onclick={clear} />
      </span>
    {/if}
  </div>
</div>

<style>
  .sui-search-field {
    display: grid;
    gap: var(--sui-row-copy-gap);
    min-inline-size: 0;
  }

  .sui-search-field-label {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-semibold) var(--sui-font-size-control) / var(--sui-row-copy-leading)
      var(--sui-sans);
    text-box: trim-both cap alphabetic;
  }

  .sui-search-field-box {
    align-items: center;
    display: grid;
    min-inline-size: 0;
  }

  .sui-search-field-box > :global(.search-input),
  .sui-search-field-icon,
  .sui-search-field-clear {
    grid-area: 1 / 1;
  }

  .sui-search-field-box > :global(.search-input) {
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
