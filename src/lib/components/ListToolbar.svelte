<script module lang="ts">
  import type { SegmentOption } from './SegmentedControl.svelte';

  export type ListToolGroup = {
    /** Names the choice, such as "Sort by" or "State". */
    label: string;
    /** Two to five options, as `SegmentedControl` takes them. */
    options: readonly SegmentOption[];
    value: string | null;
    onchange: (value: string) => void;
  };
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import IconButton from './IconButton.svelte';
  import Popover from './Popover.svelte';
  import SearchField from './SearchField.svelte';
  import SegmentedControl from './SegmentedControl.svelte';

  const uid = $props.id();

  let {
    query = $bindable(''),
    searchLabel,
    placeholder,
    filter,
    tools = [],
    toolsLabel = 'Sort and filter',
    action,
    class: className = '',
    ...rest
  }: {
    query?: string;
    /** The search field's accessible name, such as "Search repositories". */
    searchLabel: string;
    placeholder?: string;
    /** The primary filter, drawn as a segmented control beside the search. */
    filter?: ListToolGroup;
    /** The sort and any further filters, gathered in one menu behind the tools button. */
    tools?: readonly ListToolGroup[];
    /** The tools button's accessible name and tooltip. */
    toolsLabel?: string;
    /** The one primary action, at the end of the bar. */
    action?: Snippet;
    class?: HTMLAttributes<HTMLDivElement>['class'];
  } & Omit<HTMLAttributes<HTMLDivElement>, 'children'> = $props();

  const popupId = `${uid}-tools`;

  let open = $state(false);
  let trigger = $state<HTMLButtonElement | null>(null);
  let segments = $state<HTMLElement | null>(null);
  /* The width that hides the segmented filter is a container query, so the menu asks the
     page whether it is hidden rather than repeating that width here. */
  let collapsed = $state(false);

  const current = $derived(
    filter?.options.find((option) => option.value === filter?.value)?.label ?? ''
  );

  function onbeforetoggle(event: ToggleEvent) {
    if (event.newState === 'open') collapsed = segments !== null && !segments.checkVisibility();
  }

  function ontoggle(event: ToggleEvent & { currentTarget: HTMLElement }) {
    if (event.newState !== 'open') return;
    const menu = event.currentTarget;
    const choice =
      menu.querySelector<HTMLInputElement>('input:checked') ??
      menu.querySelector<HTMLInputElement>('input:enabled');
    choice?.focus();
  }
</script>

<!--
@component
The bar over a list: a search that leads, an optional primary filter as a segmented control,
a tools button holding the sort and any further filters, and one optional primary action at
the end. Search and filters stand outside the list's card. The bar owns no list state: each
group reports its choice through `onchange`, and the query is `bind:query`.

The primary filter and the tools button are one unit and wrap together, so the button is never
left on a line by itself. Short of room, the search takes its own line and the filter sits
under it with the tools button, scrolling inside its own track. In a bar narrower than 18rem
the filter folds into the tools menu, its choice is named beside the button, and the search
shares a line with them. Without `tools` there is no button and the filter never folds.

The menu stays open through every choice, because a reader came for the set, and closes on
Escape or an outside press, returning focus to the tools button.
-->

{#snippet group(choice: ListToolGroup)}
  <div class="sui-list-toolbar-group">
    <p class="sui-list-toolbar-heading" aria-hidden="true">{choice.label}</p>
    <SegmentedControl
      label={choice.label}
      options={choice.options}
      bind:value={() => choice.value, (value) => value !== null && choice.onchange(value)}
    />
  </div>
{/snippet}

<div
  {...rest}
  class={['sui-list-toolbar', className, { foldable: filter !== undefined && tools.length > 0 }]}
>
  <div class="sui-list-toolbar-bar">
    <div class="sui-list-toolbar-search">
      <SearchField bind:value={query} label={searchLabel} {placeholder} />
    </div>
    {#if filter || tools.length > 0}
      <div class="sui-list-toolbar-filters">
        {#if filter}
          <div bind:this={segments} class="sui-list-toolbar-segments">
            {@render group(filter)}
          </div>
          <span class="sui-list-toolbar-current">{current}</span>
        {/if}
        {#if tools.length > 0}
          <IconButton
            bind:element={trigger}
            icon="sliders"
            label={toolsLabel}
            toolbar
            popovertarget={popupId}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={popupId}
          />
        {/if}
      </div>
    {/if}
    {#if action}
      <div class="sui-list-toolbar-action">{@render action()}</div>
    {/if}
  </div>
</div>

{#if tools.length > 0}
  <Popover
    id={popupId}
    anchor={trigger}
    bind:open
    align="end"
    role="dialog"
    aria-label={toolsLabel}
    {onbeforetoggle}
    {ontoggle}
  >
    <div class="sui-list-toolbar-panel">
      {#if collapsed && filter}{@render group(filter)}{/if}
      {#each tools as tool (tool.label)}{@render group(tool)}{/each}
    </div>
  </Popover>
{/if}

<style>
  .sui-list-toolbar {
    container-type: inline-size;
    inline-size: 100%;
    min-inline-size: 0;
  }

  .sui-list-toolbar-bar {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-2) var(--sui-space-3);
  }

  .sui-list-toolbar-search {
    flex: 1 1 16rem;
    min-inline-size: 0;
  }

  .sui-list-toolbar-filters {
    align-items: center;
    display: flex;
    gap: var(--sui-space-2);
    max-inline-size: 100%;
    min-inline-size: 0;
  }

  .sui-list-toolbar-segments {
    display: flex;
    min-inline-size: 0;
  }

  /* In the bar the segmented control names itself; the visible heading is the menu's. */
  .sui-list-toolbar-segments .sui-list-toolbar-heading {
    display: none;
  }

  .sui-list-toolbar-current {
    color: var(--sui-text-secondary);
    display: none;
    font: 600 var(--sui-font-size-compact) / var(--sui-leading-flat) var(--sui-sans);
    text-box: trim-both cap alphabetic;
    white-space: nowrap;
  }

  .sui-list-toolbar-action {
    display: flex;
    gap: var(--sui-space-2);
    margin-inline-start: auto;
  }

  @container (max-width: 18rem) {
    .foldable .sui-list-toolbar-search {
      flex-basis: 0;
    }

    .foldable .sui-list-toolbar-segments {
      display: none;
    }

    .foldable .sui-list-toolbar-current {
      display: block;
    }
  }

  .sui-list-toolbar-panel {
    display: grid;
    gap: var(--sui-space-4);
    min-inline-size: 0;
    padding: var(--sui-space-3);
  }

  .sui-list-toolbar-group {
    display: grid;
    gap: var(--sui-row-copy-gap);
    justify-items: start;
    min-inline-size: 0;
  }

  .sui-list-toolbar-heading {
    color: var(--sui-text-muted);
    font: 600 var(--sui-font-size-micro) / var(--sui-leading-tight) var(--sui-sans);
    letter-spacing: 0.07em;
    margin: 0;
    text-box: trim-both cap alphabetic;
    text-transform: uppercase;
  }
</style>
