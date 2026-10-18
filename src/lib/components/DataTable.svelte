<script module lang="ts">
  export type DataTableColumn<Row = Record<string, unknown>> = {
    key: keyof Row & string;
    label: string;
    /** Defaults to `end` for numeric columns and `start` for the rest. */
    align?: 'start' | 'end';
    /** Sets tabular figures and keeps each value on one line. */
    numeric?: boolean;
    /** Keeps the column's values on one line; the frame scrolls instead. */
    nowrap?: boolean;
    /** Makes the heading a button that sorts the rows by this column. */
    sortable?: boolean;
  };

  export type DataTableSort = { key: string; direction: 'ascending' | 'descending' };
</script>

<script lang="ts" generics="Row extends Record<string, unknown>">
  import { word } from '../words.js';
  import type { Snippet } from 'svelte';
  import type { HTMLTableAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import { formatCount, pageLocale } from '../internal/locale.js';
  import Button from './Button.svelte';
  import VisuallyHidden from './VisuallyHidden.svelte';

  const captionId = $props.id();

  let {
    columns,
    rows,
    caption,
    rowHeader = false,
    striped = false,
    cell,
    rowKey,
    sort = $bindable(null),
    onsort,
    loading = false,
    refreshing = false,
    error = null,
    onretry,
    empty,
    emptyLabel = word('DataTable.emptyLabel', 'Nothing to show yet'),
    loadingLabel = word('DataTable.loadingLabel', 'Loading…'),
    refreshingLabel = word('DataTable.refreshingLabel', 'Refreshing…'),
    retryLabel = word('DataTable.retryLabel', 'Try again'),
    scrollHint = word('DataTable.scrollHint', 'Scroll sideways to see every column'),
    class: className = '',
    ...rest
  }: {
    columns: readonly DataTableColumn<Row>[];
    rows: readonly Row[];
    /** One line above the table that names it. Without one, give the table `aria-label`. */
    caption?: string;
    /** The first column names its row, so screen readers announce it with every cell, and it stays in view while the table scrolls. */
    rowHeader?: boolean;
    /** Tints every other row, so the eye keeps its row across a wide table. */
    striped?: boolean;
    /** Draws a cell instead of its plain value. */
    cell?: Snippet<[row: Row, column: DataTableColumn<Row>]>;
    /** A stable key per row, so a sorted or refreshed table keeps each row's own DOM. */
    rowKey?: (row: Row, index: number) => string | number;
    /** The column the rows are sorted by, or null for the order they came in. */
    sort?: DataTableSort | null;
    /** Hears each sort the reader asks for. */
    onsort?: (sort: DataTableSort) => void;
    /** The first rows are on their way: placeholders hold the table's place. */
    loading?: boolean;
    /** Newer rows are on their way: the rows already here stay. */
    refreshing?: boolean;
    /** Why the rows could not load. With rows already here they stay, marked as not current. */
    error?: string | null;
    /** Draws a retry beside `error`. */
    onretry?: () => void;
    /** Drawn in the body when there are no rows, in place of `emptyLabel`, such as a next step. */
    empty?: Snippet;
    emptyLabel?: string;
    loadingLabel?: string;
    refreshingLabel?: string;
    retryLabel?: string;
    /** Said under the caption while the columns outgrow the room. */
    scrollHint?: string;
    /** Layout for the call site only, never the table's own paint. */
    class?: HTMLTableAttributes['class'];
  } & Omit<HTMLTableAttributes, 'children'> = $props();

  let scrolls = $state(false);

  function watchOverflow(frame: HTMLDivElement) {
    const observer = new ResizeObserver(() => (scrolls = frame.scrollWidth > frame.clientWidth));
    observer.observe(frame);
    if (frame.firstElementChild) observer.observe(frame.firstElementChild);
    return () => observer.disconnect();
  }

  const alignOf = (column: DataTableColumn<Row>) =>
    column.align ?? (column.numeric ? 'end' : 'start');

  const shown = $derived.by(() => {
    if (!sort) return rows;
    const { key, direction } = sort;
    const words = new Intl.Collator(pageLocale(), { numeric: true });
    const order = direction === 'ascending' ? 1 : -1;
    return rows.toSorted((a, b) => {
      const [x, y] = [a[key], b[key]];
      const by =
        typeof x === 'number' && typeof y === 'number'
          ? x - y
          : words.compare(String(x ?? ''), String(y ?? ''));
      return by * order;
    });
  });

  function sortBy(column: DataTableColumn<Row>): void {
    const next: DataTableSort = {
      key: column.key,
      direction:
        sort?.key === column.key && sort.direction === 'ascending' ? 'descending' : 'ascending'
    };
    sort = next;
    onsort?.(next);
  }

  const plain = (value: unknown) => (typeof value === 'number' ? formatCount(value) : value);
  const status = $derived(loading ? loadingLabel : refreshing ? refreshingLabel : '');
</script>

<!--
@component
A table of numbers and facts that a reader compares across rows. For a list of things a reader
opens or acts on, reach for `ObjectList` instead; a table has no row actions.

The caption is drawn above the frame rather than inside the table, so it wraps to the room on
screen while the table scrolls under it; it still names the table. `striped` tints every other
row in place of the hairlines, for a table wide enough that the eye can lose its row.

- Semantics: a native `table` named by its caption or `aria-label`, with column headings, row headings under `rowHeader`, and `aria-sort` on the sorted column.
- Content: `columns` and `rows` of plain values, or any markup through `cell`; numbers print in the page's number format, and other values should come formatted.
- States: loaded, sorted, empty (`emptyLabel` or `empty`), loading (three placeholder rows built from the table's own cells, so they match the loaded rows, each bar where its column's words start and crossed by the light every placeholder shares), refreshing (rows kept, busy), and failed (`error`, with a retry); a failure over rows already here keeps them, marked as not current.
- Keyboard: a sortable heading is a button, and Enter or Space sorts by it, then reverses; a frame that scrolls is a tab stop, so the arrow keys scroll it.
- Pointer and touch: a sortable heading's target is at least 24px tall, and 44px on a phone or a coarse pointer.
- Focus: sorting keeps focus on the heading; the frame is a stop only while it scrolls.
- Responsive: columns grow to their widest value and the table scrolls inside its own frame, with a line that says so and the row headings held in view; numeric and `nowrap` columns never wrap, other text wraps inside its column.
- Accessibility: loading and refreshing mark the table `aria-busy` and are said through a polite status; a failure is an alert in words beside an icon; sorted order is `aria-sort` and an up or down chevron.
- Localization: every built-in word is a prop with an English default; numbers group and text sorts by the page's language; columns, alignment and the held row headings follow the reading direction.
- Performance: every row renders; key rows with `rowKey`, and page a long table with numbered pages or `LoadMore` rather than drawing thousands.
- Analytics: `onsort` hears each sort, and `onretry` each retry.
- Failure: no rows says `emptyLabel` or draws `empty` in the body under the headings; a failure says `error` with a retry; a missing value prints blank and sorts first.
-->

{#snippet retry()}
  {#if onretry}<Button tone="ghost" onclick={onretry}>{retryLabel}</Button>{/if}
{/snippet}

<div class={['sui-data-table', className, { striped, scrolls, held: rowHeader }]}>
  {#if caption}<p id={captionId} class="caption">{caption}</p>{/if}
  {#if scrolls}<p class="caption hint" aria-hidden="true">{scrollHint}</p>{/if}
  {#if error && rows.length > 0}
    <div class="problem" role="alert">
      <Icon name="alert" size="sm" />
      <span class="problem-words">{error}</span>
      {@render retry()}
    </div>
  {/if}
  <VisuallyHidden role="status">{status}</VisuallyHidden>
  <!-- The frame is a tab stop only while it scrolls, so a keyboard can reach what is past the edge. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div
    {@attach watchOverflow}
    class="frame"
    role={scrolls ? 'region' : undefined}
    tabindex={scrolls ? 0 : undefined}
    aria-labelledby={scrolls && caption ? captionId : undefined}
    aria-label={scrolls && !caption ? rest['aria-label'] : undefined}
  >
    <table
      aria-labelledby={caption ? captionId : undefined}
      aria-busy={loading || refreshing || undefined}
      {...rest}
    >
      <thead>
        <tr>
          {#each columns as column (column.key)}
            <th
              scope="col"
              data-align={alignOf(column)}
              class={{ nowrap: column.nowrap || column.numeric }}
              aria-sort={sort?.key === column.key ? sort.direction : undefined}
            >
              {#if column.sortable}
                <button type="button" class="sort" onclick={() => sortBy(column)}>
                  <span>{column.label}</span>
                  <Icon
                    name={sort?.key !== column.key
                      ? 'chevrons-up-down'
                      : sort.direction === 'ascending'
                        ? 'chevron-up'
                        : 'chevron-down'}
                    size="xs"
                  />
                </button>
              {:else}
                <span class="value">{column.label}</span>
              {/if}
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#if rows.length === 0 && loading}
          <!-- Placeholder rows are rows of this table, with its cells, padding and hairlines,
               so they stand where the loaded rows will and the table never moves on arrival. -->
          {#each { length: 3 } as _, index (index)}
            <tr class="placeholder" aria-hidden="true">
              {#each columns as column (column.key)}
                <td data-align={alignOf(column)} class={{ numeric: column.numeric }}
                  ><span class="value"><span class="bar"></span></span></td
                >
              {/each}
            </tr>
          {/each}
        {:else if rows.length === 0}
          <tr>
            <td class="state" colspan={columns.length}>
              {#if error}
                <span class="problem" role="alert">
                  <Icon name="alert" size="sm" />
                  <span class="problem-words">{error}</span>
                  {@render retry()}
                </span>
              {:else if empty}
                {@render empty()}
              {:else}
                {emptyLabel}
              {/if}
            </td>
          </tr>
        {:else}
          {#each shown as row, index (rowKey ? rowKey(row, index) : index)}
            <tr class={{ stale: Boolean(error) }}>
              {#each columns as column, at (column.key)}
                {#if rowHeader && at === 0}
                  <th
                    scope="row"
                    data-align={alignOf(column)}
                    class={{ numeric: column.numeric, nowrap: column.nowrap || column.numeric }}
                    ><span class="value"
                      >{#if cell}{@render cell(row, column)}{:else}{plain(
                          row[column.key]
                        )}{/if}</span
                    ></th
                  >
                {:else}
                  <td
                    data-align={alignOf(column)}
                    class={{ numeric: column.numeric, nowrap: column.nowrap || column.numeric }}
                    ><span class="value"
                      >{#if cell}{@render cell(row, column)}{:else}{plain(
                          row[column.key]
                        )}{/if}</span
                    ></td
                  >
                {/if}
              {/each}
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</div>

<style>
  .sui-data-table {
    display: grid;
    gap: var(--sui-row-copy-gap);
    min-inline-size: 0;
  }

  .caption {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-muted);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    margin: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .problem {
    align-items: center;
    color: var(--sui-danger);
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-2);
  }

  .problem-words {
    align-content: center;
    block-size: var(--sui-block-snap);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    min-inline-size: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .frame {
    min-inline-size: 0;
    overflow-x: auto;
  }

  .frame:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-inset);
  }

  /* Separate borders: a collapsed border is split between its two cells, which puts every
     row half a pixel off the grid (L-95). The row lines live on the cells instead. */
  table {
    border-collapse: separate;
    border-spacing: 0;
    inline-size: 100%;
  }

  /* Baseline alignment of mono figures beside sans words can leave a row a fraction tall, so
     each cell rounds its height up to the pixel (L-95). */
  th,
  td {
    align-content: center;
    block-size: var(--sui-block-snap);
    padding: var(--sui-space-3) var(--sui-space-4);
    text-align: start;
    vertical-align: baseline;
  }

  /* A cell's words run cap line to baseline in a box rounded to the pixel, so a row's room
     above and under them match (L-102) and every row stays on the grid (L-95). */
  .value {
    align-content: center;
    block-size: var(--sui-block-snap);
    display: block;
    text-box: trim-both cap alphabetic;
  }

  :is(th, td):first-child {
    padding-inline-start: 0;
  }

  :is(th, td):last-child {
    padding-inline-end: 0;
  }

  /* A heading row holds a sort control as tall as a finger on touch, so every heading centres
     in the row instead of sitting on that control's baseline (L-102). */
  thead th {
    border-block-end: var(--sui-stroke) solid var(--sui-border-control);
    vertical-align: middle;
    color: var(--sui-text-muted);
    font: var(--sui-weight-semibold) var(--sui-font-size-micro) / var(--sui-leading-micro)
      var(--sui-sans);
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }

  /* A sort heading is a chip-tier control (L-37) whose ground reaches a space past its words.
     The negative margins hand that back, so it lines up with the plain headings and the heading
     row keeps its line. */
  .sort {
    align-items: center;
    appearance: none;
    background-color: transparent;
    block-size: var(--sui-control-height-chip);
    border: 0;
    box-sizing: border-box;
    border-radius: var(--sui-radius-control);
    color: inherit;
    cursor: pointer;
    /* A block of its own, so no line's strut stands under it and stretches the row (L-102). */
    display: flex;
    font: inherit;
    gap: var(--sui-space-1);
    inline-size: fit-content;
    letter-spacing: inherit;
    margin: calc(-1 * var(--sui-space-1));
    padding: 0 var(--sui-space-1);
    position: relative;
    text-transform: inherit;
    user-select: none;
    /* Off the baseline, so the glyph beside the words never moves the heading row's line. */
    vertical-align: top;
    -webkit-user-select: none;
  }

  /* The heading's words run cap line to baseline, so the control centres them (L-102). */
  .sort > span {
    align-content: center;
    block-size: var(--sui-block-snap-even);
    text-box: trim-both cap alphabetic;
  }

  [data-align='end'] .sort {
    flex-direction: row-reverse;
    margin-inline-start: auto;
  }

  /* An outer heading meets the scroller's edge, which would cut a ground or ring reaching past
     it (L-96), so there the button starts or ends with its words. */
  .sui-data-table:not(.striped) th:first-child > .sort {
    margin-inline-start: 0;
    padding-inline-start: 0;
  }

  .sui-data-table:not(.striped) th:last-child > .sort {
    margin-inline-end: 0;
    padding-inline-end: 0;
  }

  .sort::before {
    content: '';
    inset: calc((100% - max(100%, var(--sui-control-height-chip))) / 2);
    position: absolute;
  }

  @media (hover: hover) {
    .sort:hover:not(:active) {
      background-color: var(--sui-interactive-hover-layer);
      color: var(--sui-text-primary);
    }
  }

  .sort:active {
    background-color: var(--sui-interactive-pressed);
    box-shadow: var(--sui-pressed-inset);
  }

  .sort:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-inset);
  }

  [aria-sort] .sort {
    color: var(--sui-text-primary);
  }

  tbody tr + tr > :is(th, td) {
    border-block-start: var(--sui-stroke) solid var(--sui-border-divider);
  }

  /* A tinted row needs room inside its tint, so the outer cells take back their inset. */
  .striped tbody tr + tr > :is(th, td) {
    border-block-start: 0;
  }

  .striped tbody tr:nth-child(even) {
    background: var(--sui-surface-inset);
  }

  .striped :is(th, td):first-child {
    padding-inline-start: var(--sui-space-3);
  }

  .striped :is(th, td):last-child {
    padding-inline-end: var(--sui-space-3);
  }

  td {
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-body) / var(--sui-leading-body)
      var(--sui-sans);
  }

  tbody th {
    color: var(--sui-text-primary);
    font: var(--sui-weight-semibold) var(--sui-font-size-body) / var(--sui-leading-body)
      var(--sui-sans);
  }

  /* Rows a failed refresh could not replace still read, a step quieter than current ones. */
  .stale > :is(th, td) {
    color: var(--sui-text-muted);
  }

  .state {
    color: var(--sui-text-muted);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-sans);
  }

  /* While the columns scroll, the row headings stay at the start on the table's own ground,
     and a hairline shows where the scrolled columns slide under them. */
  .held.scrolls :is(th, td):first-child {
    background: var(--sui-surface-base);
    inset-inline-start: 0;
    position: sticky;
  }

  .held.scrolls.striped tbody tr:nth-child(even) > :first-child {
    background: var(--sui-surface-inset);
  }

  .held.scrolls :is(th, td):first-child::after {
    background: var(--sui-border-divider);
    content: '';
    inline-size: var(--sui-stroke);
    inset-block: 0;
    inset-inline-end: 0;
    position: absolute;
  }

  [data-align='end'] {
    text-align: end;
  }

  .numeric {
    font-variant-numeric: tabular-nums;
  }

  .nowrap {
    white-space: nowrap;
  }

  @media (max-width: 47.9375rem), (pointer: coarse) {
    /* The frame scrolls, so it clips on every side: the heading row is tall enough that a sort
       heading's grown hit area, past its handed-back margin, stays inside it. */
    thead tr:has(> th > .sort) > th {
      padding-block: calc(
        (var(--sui-touch-target) - var(--sui-control-height-chip)) / 2 + var(--sui-space-1)
      );
    }

    .sort::before {
      inset: calc((100% - max(100%, var(--sui-touch-target))) / 2);
    }
  }
  /* The placeholder rows are the frame the light crosses: every bar shows the part of it that
     falls on the bar, so it reads as one light over the rows, and the table clips it so it
     never widens the frame's scroll. */
  tbody:has(> .placeholder) {
    position: relative;
  }

  table:has(> tbody > .placeholder) {
    overflow: clip;
  }

  /* A held cell would frame its bar's light alone, and a placeholder has no name to hold. */
  .held.scrolls .placeholder > :first-child {
    position: static;
  }

  .held.scrolls .placeholder > :first-child::after {
    content: none;
  }

  /* A placeholder bar is one line of the cell's words, cap line to baseline, so a placeholder
     row is exactly as tall as a loaded one. It starts where the column's words start and runs
     a little short of its heading, a little more or less on each row, as words do; a number's
     bar is short and sits at the end. The light is laid out on the rows, so only the bar's
     clip path, not its overflow, keeps it inside the bar. */
  .placeholder .bar {
    background: var(--sui-placeholder);
    block-size: round(up, 1cap, 1px);
    border-radius: var(--sui-radius-pill);
    clip-path: inset(0 round var(--sui-radius-pill));
    display: block;
    inline-size: 90%;
  }

  .placeholder:nth-child(3n + 2) .bar {
    inline-size: 65%;
  }

  .placeholder:nth-child(3n) .bar {
    inline-size: 78%;
  }

  .placeholder .numeric .bar {
    inline-size: min(3rem, 100%);
  }

  .placeholder:nth-child(3n + 2) .numeric .bar {
    inline-size: min(2.25rem, 100%);
  }

  .placeholder:nth-child(3n) .numeric .bar {
    inline-size: min(2.75rem, 100%);
  }

  .placeholder [data-align='end'] .bar {
    margin-inline-start: auto;
  }

  .placeholder .bar::after {
    animation: sui-data-table-sheen var(--sui-duration-shimmer) var(--sui-ease-linear) infinite;
    background: var(--sui-placeholder-sheen);
    content: '';
    inset-block: 0;
    inset-inline: calc(-1 * var(--sui-placeholder-reach));
    position: absolute;
  }

  .placeholder .bar:dir(rtl)::after {
    scale: -1 1;
  }

  @keyframes sui-data-table-sheen {
    from {
      transform: translateX(-50%);
    }

    to {
      transform: translateX(50%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .placeholder .bar::after {
      animation: none;
      content: none;
    }
  }

  /* Forced colors drop the bar's ground, so it keeps its shape by an outline. */
  @media (forced-colors: active) {
    .placeholder .bar {
      outline: var(--sui-stroke) solid GrayText;
      outline-offset: calc(-1 * var(--sui-stroke));
    }
  }
</style>
