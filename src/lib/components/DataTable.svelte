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
  };
</script>

<script lang="ts" generics="Row extends Record<string, unknown>">
  import type { Snippet } from 'svelte';
  import type { HTMLTableAttributes } from 'svelte/elements';

  const captionId = $props.id();

  let {
    columns,
    rows,
    caption,
    rowHeader = false,
    striped = false,
    cell,
    class: className = '',
    ...rest
  }: {
    columns: readonly DataTableColumn<Row>[];
    rows: readonly Row[];
    /** One line above the table that names it. Without one, give the table `aria-label`. */
    caption?: string;
    /** The first column names its row, so screen readers announce it with every cell. */
    rowHeader?: boolean;
    /** Tints every other row, so the eye keeps its row across a wide table. */
    striped?: boolean;
    /** Draws a cell instead of its plain value. */
    cell?: Snippet<[row: Row, column: DataTableColumn<Row>]>;
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
</script>

<!--
@component
A table of numbers and facts that a reader compares across rows. For a list of things a
reader opens or acts on, reach for `ObjectList` instead; a table has no row actions.

Numeric columns sit at the end with tabular figures and never wrap. Columns grow to hold
their widest value, so no cell draws outside its column; when they outgrow the room, the
table scrolls inside its own frame, and only then is the frame a focusable region, so a
keyboard can scroll it too.

The caption is drawn above the frame rather than inside the table, so it wraps to the room
on screen while the table scrolls under it; it still names the table.

`striped` tints every other row in place of the hairlines. Reach for it on a table wide
enough that the eye can lose its row between the first column and the last.
-->

<div class={['sui-data-table', className, { striped }]}>
  {#if caption}<p id={captionId} class="caption">{caption}</p>{/if}
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
    <table aria-labelledby={caption ? captionId : undefined} {...rest}>
      <thead>
        <tr>
          {#each columns as column (column.key)}
            <th
              scope="col"
              data-align={alignOf(column)}
              class={{ nowrap: column.nowrap || column.numeric }}>{column.label}</th
            >
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each rows as row, index (index)}
          <tr>
            {#each columns as column, at (column.key)}
              {#if rowHeader && at === 0}
                <th
                  scope="row"
                  data-align={alignOf(column)}
                  class={{ numeric: column.numeric, nowrap: column.nowrap || column.numeric }}
                  >{#if cell}{@render cell(row, column)}{:else}{row[column.key]}{/if}</th
                >
              {:else}
                <td
                  data-align={alignOf(column)}
                  class={{ numeric: column.numeric, nowrap: column.nowrap || column.numeric }}
                  >{#if cell}{@render cell(row, column)}{:else}{row[column.key]}{/if}</td
                >
              {/if}
            {/each}
          </tr>
        {/each}
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
    block-size: var(--sui-block-snap);
    color: var(--sui-text-muted);
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    margin: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .frame {
    min-inline-size: 0;
    overflow-x: auto;
  }

  .frame:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-offset);
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
    block-size: var(--sui-block-snap);
    padding: var(--sui-space-3) var(--sui-space-4);
    text-align: start;
    vertical-align: baseline;
  }

  :is(th, td):first-child {
    padding-inline-start: 0;
  }

  :is(th, td):last-child {
    padding-inline-end: 0;
  }

  thead th {
    border-block-end: 1px solid var(--sui-border-control);
    color: var(--sui-text-muted);
    font: 600 var(--sui-font-size-micro) / var(--sui-leading-micro) var(--sui-sans);
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }

  tbody tr + tr > :is(th, td) {
    border-block-start: 1px solid var(--sui-border-divider);
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
    font: 400 var(--sui-font-size-body) / var(--sui-leading-body) var(--sui-sans);
  }

  tbody th {
    color: var(--sui-text-primary);
    font: 600 var(--sui-font-size-body) / var(--sui-leading-body) var(--sui-sans);
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
</style>
