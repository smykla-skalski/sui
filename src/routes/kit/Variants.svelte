<script lang="ts" generics="Row extends string, Column extends string">
  import { untrack, type Snippet } from 'svelte';

  let {
    rows,
    columns,
    axis,
    rowLabel = (row) => row,
    columnLabel = (column) => column,
    fill = false,
    cell
  }: {
    rows: readonly Row[];
    columns: readonly Column[];
    /** The prop the rows vary, such as `tone`, named in the corner. */
    axis?: string;
    /** The row's value as code, such as `"signal"`. */
    rowLabel?: (row: Row) => string;
    /** The column's state in words, such as "Disabled". */
    columnLabel?: (column: Column) => string;
    /**
     * Shares the width between the columns, for surfaces such as callouts that fill what
     * they are given. Without it each column is as wide as its widest cell.
     */
    fill?: boolean;
    cell: Snippet<[Row, Column]>;
  } = $props();

  // A shared-width matrix folds below 34rem. One sized by its cells folds when it is wider
  // than its stage, measured unfolded, so a wide row of states never scrolls the page.
  const FILL_FOLD_REM = 34;

  let box = $state<HTMLElement | null>(null);
  let grid = $state<HTMLElement | null>(null);
  let folded = $state(false);

  $effect(() => {
    if (!box || !grid) return;
    const frame = box;
    const matrix = grid;
    let natural = 0;
    let next = 0;
    const check = (now = false) => {
      if (!folded) natural = matrix.scrollWidth;
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const fits = fill
        ? frame.clientWidth >= FILL_FOLD_REM * rem
        : natural <= frame.clientWidth + 0.5;
      cancelAnimationFrame(next);
      if (folded !== fits) return;
      // A fold changes the frame's height, so one the watcher asks for waits for the next
      // frame instead of resizing what it watches while it reports.
      if (now) folded = !fits;
      else next = requestAnimationFrame(() => (folded = !fits));
    };
    const observer = new ResizeObserver(() => check());
    observer.observe(frame);
    // The first check reads `folded`; tracking it would rebuild the watcher on every fold.
    untrack(() => check(true));
    return () => {
      cancelAnimationFrame(next);
      observer.disconnect();
    };
  });
</script>

<!--
A matrix of one component: one prop down the side, one state or option across the top, so
every pair is seen at once and a missing pair stands out. When the matrix does not fit its
stage, each row folds into a block whose cells carry their own column names.
-->

<div class="variants" class:folded bind:this={box}>
  <div class="grid" class:fill bind:this={grid} style:--columns={columns.length}>
    <div class="corner">
      {#if axis}<code>{axis}</code>{/if}
    </div>
    {#each columns as column (column)}
      <div class="column">{columnLabel(column)}</div>
    {/each}
    {#each rows as row (row)}
      <div class="row">
        <code class="row-label">{rowLabel(row)}</code>
        {#each columns as column (column)}
          <div class="cell">
            <span class="cell-label">{columnLabel(column)}</span>
            {@render cell(row, column)}
          </div>
        {/each}
      </div>
    {/each}
  </div>
</div>

<style>
  .variants {
    inline-size: 100%;
    min-inline-size: 0;
  }

  .grid {
    align-items: center;
    display: grid;
    gap: var(--sui-space-4) var(--sui-space-6);
    grid-template-columns: max-content repeat(var(--columns), max-content);
  }

  .grid.fill {
    grid-template-columns: max-content repeat(var(--columns), minmax(0, 1fr));
  }

  .row {
    display: contents;
  }

  .corner,
  .column,
  .cell-label {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-muted);
    font: var(--sui-weight-semibold) var(--sui-font-size-micro) / var(--sui-leading-micro)
      var(--sui-sans);
    letter-spacing: 0.06em;
    text-box: trim-both cap alphabetic;
    text-transform: uppercase;
  }

  .corner code {
    font: var(--sui-weight-regular) var(--sui-font-size-micro) / var(--sui-leading-micro)
      var(--sui-mono);
    letter-spacing: 0;
    text-transform: none;
  }

  .row-label {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-micro) / var(--sui-leading-micro)
      var(--sui-mono);
    font-variant-numeric: tabular-nums;
    text-box: trim-both cap alphabetic;
  }

  .cell {
    display: flex;
    min-inline-size: 0;
  }

  /* A grid cell stretches its child to the column, so a surface fills its share. */
  .fill .cell {
    display: grid;
  }

  .cell-label {
    display: none;
  }

  /* Folded: each row is a block, its value on top and its cells wrapping under it. */
  .folded .grid,
  .folded .grid.fill {
    gap: var(--sui-space-6);
    grid-template-columns: minmax(0, 1fr);
  }

  /* A surface that fills what it is given takes the whole folded line. */
  .folded .fill .cell {
    flex: 1 1 100%;
    justify-items: stretch;
  }

  .folded .corner,
  .folded .column {
    display: none;
  }

  .folded .row {
    align-items: flex-start;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-4) var(--sui-space-5);
  }

  .folded .row-label {
    flex-basis: 100%;
  }

  .folded .cell {
    display: grid;
    gap: var(--sui-space-2);
    justify-items: start;
  }

  .folded .cell-label {
    display: block;
  }
</style>
