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
  import { word } from '../words.js';
  import { untrack, type Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import { formatCount, pageLocale } from '../internal/locale.js';
  import Button from './Button.svelte';
  import Popover from './Popover.svelte';
  import SearchField from './SearchField.svelte';
  import SegmentedControl from './SegmentedControl.svelte';
  import VisuallyHidden from './VisuallyHidden.svelte';

  const uid = $props.id();

  let {
    query = $bindable(''),
    searchLabel,
    placeholder,
    filter,
    tools = [],
    toolsLabel = word('ListToolbar.toolsLabel', 'Sort and filter'),
    action,
    count,
    pending = false,
    countLabel = word('ListToolbar.countLabel', (total: number, shown: string) =>
      total === 0 ? 'No results' : `${shown} ${total === 1 ? 'result' : 'results'}`
    ),
    pendingLabel = word('ListToolbar.pendingLabel', 'Searching…'),
    onsearch,
    class: className = '',
    ...rest
  }: {
    query?: string;
    /** The search field's drawn label and accessible name, such as "Search repositories". */
    searchLabel: string;
    placeholder?: string;
    /** The primary filter, drawn as a segmented control beside the search. */
    filter?: ListToolGroup;
    /** The sort and any further filters, gathered in one menu behind the tools button. */
    tools?: readonly ListToolGroup[];
    /** The tools button's visible label, which also names its menu. */
    toolsLabel?: string;
    /** The one primary action, at the end of the bar. */
    action?: Snippet;
    /** How many rows the search and filters leave, said once the reader pauses. */
    count?: number;
    /** A search is on its way; said in place of the count. */
    pending?: boolean;
    /** Says the count, given the number for plural rules and the same number formatted. */
    countLabel?: (count: number, formatted: string) => string;
    pendingLabel?: string;
    /** Hears the query once the reader pauses typing. */
    onsearch?: (query: string) => void;
    class?: HTMLAttributes<HTMLDivElement>['class'];
  } & Omit<HTMLAttributes<HTMLDivElement>, 'children'> = $props();

  const popupId = `${uid}-tools`;

  let open = $state(false);
  let trigger = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
  let segments = $state<HTMLElement | null>(null);
  /* The width that hides the segmented filter is a container query, so the menu asks the
     page whether it is hidden rather than repeating that width here. */
  let collapsed = $state(false);

  const labelOf = (group: ListToolGroup) =>
    group.options.find((option) => option.value === group.value)?.label;
  const current = $derived(filter ? (labelOf(filter) ?? '') : '');
  const chosen = $derived(
    new Intl.ListFormat(pageLocale(), { style: 'narrow', type: 'unit' }).format(
      tools.map(labelOf).filter((label) => label !== undefined)
    )
  );

  /* Said a moment after the last keystroke or pick, so a reader typing hears one count, and
     never on first paint, when nothing has changed yet. A pick that leaves the count as it was
     is said again, so the reader knows the list answered; `onsearch` hears only a new query. */
  const PAUSE = 600;
  let said = $state('');
  let told = $state(0);
  let primed = false;
  let searched = untrack(() => query);
  $effect(() => {
    const settled = query;
    const waiting = pending;
    const total = count;
    void [current, chosen];
    if (!primed) {
      primed = true;
      return;
    }
    const timer = setTimeout(() => {
      said = untrack(() =>
        waiting ? pendingLabel : total === undefined ? '' : countLabel(total, formatCount(total))
      );
      told += 1;
      if (settled === searched) return;
      searched = settled;
      onsearch?.(settled);
    }, PAUSE);
    return () => clearTimeout(timer);
  });

  function onbeforetoggle(event: ToggleEvent) {
    if (event.newState === 'open') collapsed = segments !== null && !segments.checkVisibility();
  }

  function ontoggle(event: ToggleEvent & { currentTarget: HTMLElement }) {
    if (event.newState !== 'open') return;
    const menu = event.currentTarget;
    const choice =
      menu.querySelector<HTMLInputElement>('input:checked') ??
      menu.querySelector<HTMLInputElement>('input:enabled');
    choice?.focus({ preventScroll: true });
  }
</script>

<!--
@component
The bar over a list: a search that leads, an optional primary filter as a segmented control, a
tools button holding the sort and any further filters, and one optional primary action at the
end of its line. On a line of its own the action starts at the edge, never adrift at the far
end. Search and filters stand outside the list's card. The bar owns no list state: each group
reports its choice through `onchange`, and the query is `bind:query`.

The primary filter and the tools button are one unit and wrap together, so the button is never
left on a line by itself. Short of room, the search takes its own line and the filter sits under
it with the tools button, and turns into a select when its options do not fit. In a bar
narrower than 18rem the filter folds into the tools menu and its choice is named beside the
button. Without `tools` there is no button and the filter never folds.

- Semantics: a `SearchField` named by its drawn label, a `SegmentedControl` per group named by its visible heading, a tools `button` with `aria-haspopup="dialog"`, and a dialog `Popover` holding the further groups.
- Content: a search label, an optional filter and tools of two to five options each, and one optional action.
- States: the tools button names the tools' choices beside it, so a sort or filter in the menu stays in view; open, pending (a spinner and `pendingLabel` beside the search) and empty results are said through the status, and a pick that leaves the count as it was is said again.
- Keyboard: Tab walks search, filter, tools button and action; in the menu Tab moves through the groups and closes the menu on leaving it, and Escape closes it and returns focus to the tools button.
- Pointer and touch: every control keeps its own 34px tier, 44px on a phone; an outside press closes the menu.
- Focus: opening the menu moves focus to its first chosen option; closing it with Escape returns focus to the tools button.
- Responsive: a container query folds the filter into the menu under 18rem; the search, the filter unit and the action wrap as whole pieces.
- Accessibility: each group's heading is drawn and names it; `count` and `pending` are said through a polite status a moment after the reader pauses; the tools button is described by the choices it holds.
- Localization: `toolsLabel`, `pendingLabel` and `countLabel`, a function of the count with the count formatted in the page's language, are props with English defaults; the tools' choices are joined as a list in the page's language, the folded filter is set off by a dot rather than a written mark, and the bar follows the reading direction.
- Performance: one container query and one short timer per bar; the menu mounts only with `tools`.
- Analytics: each group's `onchange` hears its pick, and `onsearch` hears a new query once the reader pauses, never a repeat of the last one.
- Failure: `pending` says `pendingLabel`, and a count of 0 says `countLabel(0)`, while the list below draws its own empty state with the way out.
-->

{#snippet group(choice: ListToolGroup, id: string)}
  <div class="sui-list-toolbar-group">
    <p {id} class="sui-list-toolbar-heading">{choice.label}</p>
    <SegmentedControl
      label={choice.label}
      aria-labelledby={id}
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
      <label class="sui-list-toolbar-heading" for="{uid}-search">{searchLabel}</label>
      <span class="sui-list-toolbar-field">
        <SearchField
          bind:value={query}
          label={searchLabel}
          hideLabel
          id="{uid}-search"
          {placeholder}
        />
      </span>
    </div>
    <!-- Seen while a search is on its way; the status says it to a screen reader. -->
    {#if pending}
      <span class="sui-list-toolbar-pending" aria-hidden="true">
        <span class="sui-list-toolbar-spinner"></span><span>{pendingLabel}</span>
      </span>
    {/if}
    {#if filter || tools.length > 0}
      <div class="sui-list-toolbar-filters">
        {#if filter}
          <div bind:this={segments} class="sui-list-toolbar-segments">
            {@render group(filter, `${uid}-filter`)}
          </div>
        {/if}
        <span class="sui-list-toolbar-tools">
          {#if tools.length > 0}
            <span class="sui-list-toolbar-trigger">
              <Button
                bind:element={trigger}
                popovertarget={popupId}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-controls={popupId}
                aria-describedby={`${uid}-chosen`}
              >
                {#snippet icon()}<Icon name="sliders" size="sm" />{/snippet}
                {toolsLabel}
              </Button>
            </span>
          {/if}
          {#if filter || chosen}
            <span id="{uid}-chosen" class="sui-list-toolbar-current">
              {#if filter}<span class="sui-list-toolbar-folded">{current}</span>{/if}
              {#if filter && chosen}<span class="sui-list-toolbar-dot" aria-hidden="true"
                ></span>{/if}
              {#if chosen}<span class="sui-list-toolbar-chosen">{chosen}</span>{/if}
            </span>
          {/if}
        </span>
      </div>
    {/if}
    {#if action}
      <div class="sui-list-toolbar-action">{@render action()}</div>
    {/if}
  </div>
  <!-- Keyed, so the same words said again are a new announcement. -->
  <VisuallyHidden role="status"
    >{#key told}<span>{said}</span>{/key}</VisuallyHidden
  >
</div>

{#if tools.length > 0}
  <Popover
    id={popupId}
    anchor={trigger}
    bind:open
    align="end"
    role="dialog"
    aria-label={toolsLabel}
    closeOnLeave
    {onbeforetoggle}
    {ontoggle}
  >
    <div class="sui-list-toolbar-panel">
      {#if collapsed && filter}{@render group(filter, `${uid}-menu-filter`)}{/if}
      {#each tools as tool, index (tool.label)}{@render group(tool, `${uid}-menu-${index}`)}{/each}
    </div>
  </Popover>
{/if}

<style>
  .sui-list-toolbar {
    container-type: inline-size;
    inline-size: 100%;
    min-inline-size: 0;
  }

  /* Spread, not pushed by an auto margin: the action ends a line it shares, and on a line of
     its own it starts at the edge like the search above it (L-90). */
  .sui-list-toolbar-bar {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-2) var(--sui-space-3);
    justify-content: space-between;
  }

  /* The search's label stands before it on its line, as the filter's heading does. */
  .sui-list-toolbar-search {
    align-items: center;
    display: flex;
    flex: 1 1 16rem;
    flex-wrap: wrap;
    gap: var(--sui-space-2);
    min-inline-size: 0;
  }

  .sui-list-toolbar-field {
    display: grid;
    flex: 1 1 10rem;
    min-inline-size: 0;
  }

  /* Short of room the tools and their choices take the line under the filter, together, and the
     button keeps its words on one line. */
  .sui-list-toolbar-filters {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-2);
    max-inline-size: 100%;
    min-inline-size: 0;
  }

  /* The chosen options beside the button wrap under it when the line runs out, as at a large
     text size (WCAG 1.4.10), so the bar never scrolls the page sideways. */
  .sui-list-toolbar-tools {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-2);
    min-inline-size: 0;
  }

  /* It keeps its width while it fits, and wraps its words rather than leave a narrow toolbar. */
  .sui-list-toolbar-trigger {
    display: flex;
    flex: 0 1 auto;
    min-inline-size: 0;
  }

  .sui-list-toolbar-segments {
    display: flex;
    min-inline-size: 0;
  }

  /* In the bar the filter's heading stands before it on the same line; in the menu above it. */
  .sui-list-toolbar-segments .sui-list-toolbar-group {
    align-items: center;
    display: flex;
    gap: var(--sui-space-2);
  }

  .sui-list-toolbar-current {
    align-items: center;
    color: var(--sui-text-secondary);
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-1);
    min-inline-size: 0;
  }

  .sui-list-toolbar-folded,
  .sui-list-toolbar-chosen {
    block-size: var(--sui-block-snap-even);
    font: var(--sui-weight-semibold) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    min-inline-size: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sui-list-toolbar-folded,
  .sui-list-toolbar-dot {
    display: none;
  }

  /* A dot, not a written separator, between the folded filter's choice and the tools' choices. */
  .sui-list-toolbar-dot {
    background: currentColor;
    block-size: var(--sui-space-1);
    border-radius: 50%;
    flex: none;
    inline-size: var(--sui-space-1);
  }

  /* The inline room holds the spinner's corners as it turns, at the start of a wrapped line. */
  .sui-list-toolbar-pending {
    align-items: center;
    color: var(--sui-text-secondary);
    display: inline-flex;
    padding-inline: var(--sui-space-1);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-sans);
    gap: var(--sui-space-2);
  }

  .sui-list-toolbar-spinner {
    animation: sui-list-toolbar-spin var(--sui-duration-spinner) var(--sui-ease-linear) infinite;
    block-size: var(--sui-icon-sm);
    border: var(--sui-stroke-bold) solid currentColor;
    border-inline-end-color: transparent;
    border-radius: 50%;
    box-sizing: border-box;
    flex: none;
    inline-size: var(--sui-icon-sm);
  }

  @keyframes sui-list-toolbar-spin {
    to {
      rotate: 1turn;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-list-toolbar-spinner {
      animation: none;
    }
  }

  .sui-list-toolbar-action {
    display: flex;
    gap: var(--sui-space-2);
  }

  /* Too narrow to share a line: the search takes the whole first line, and the folded filter,
     its tools and the action follow on the next. */
  @container (max-width: 18rem) {
    .foldable .sui-list-toolbar-search {
      flex-basis: 100%;
    }

    .foldable .sui-list-toolbar-segments {
      display: none;
    }

    .foldable .sui-list-toolbar-folded,
    .foldable .sui-list-toolbar-dot {
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
    block-size: var(--sui-block-snap);
    color: var(--sui-text-muted);
    font: var(--sui-weight-semibold) var(--sui-font-size-micro) / var(--sui-leading-tight)
      var(--sui-sans);
    letter-spacing: 0.07em;
    margin: 0;
    text-box: trim-both cap alphabetic;
    text-transform: uppercase;
  }
</style>
