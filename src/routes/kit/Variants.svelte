<script lang="ts" generics="Row extends string, Column extends string">
  import type { Snippet } from 'svelte';
  import '#lib/internal/scroll-edge.css';

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

  // A matrix that scrolls is a tab stop, so a keyboard can reach the cells past the edge.
  let scrolls = $state(false);

  /* A matrix sized by its cells keeps its columns and scrolls inside the stage once it is wider,
     with the row values held at the start; the start fade begins past them. Their width only
     places that fade, which shows once the reader scrolls, so measuring it changes nothing in
     the first paint. */
  function holdLabels(box: HTMLElement) {
    const corner = box.querySelector<HTMLElement>('.corner');
    const grid = corner?.parentElement;
    if (!corner || !grid) return;
    const observer = new ResizeObserver(() => {
      const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
      box.style.setProperty(
        '--sui-local-edge-hold',
        `${corner.getBoundingClientRect().width + gap}px`
      );
      scrolls = box.scrollWidth > box.clientWidth;
    });
    observer.observe(box);
    observer.observe(grid);
    observer.observe(corner);
    return () => observer.disconnect();
  }
</script>

<!--
A matrix of one component: one prop down the side, one state or option across the top, so
every pair is seen at once and a missing pair stands out. A matrix of surfaces that share the
width folds each row into a block whose cells carry their own column names once its stage is
narrower than 34rem, by a container query, so the server's render already has the right form.
A matrix sized by its cells never folds: wider than its stage, it scrolls inside it with the
row values held, as a data table does.
-->

{#if fill}
  <div class="variants">
    <div class="grid fill" style:--columns={columns.length}>
      {@render matrix()}
    </div>
  </div>
{:else}
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div
    class="variants sui-scroll-edge scrolls"
    role={scrolls ? 'region' : undefined}
    tabindex={scrolls ? 0 : undefined}
    aria-label={scrolls ? `${axis ?? 'Variants'} by state` : undefined}
    {@attach holdLabels}
  >
    <div class="grid" style:--columns={columns.length}>
      {@render matrix()}
    </div>
  </div>
{/if}

{#snippet matrix()}
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
{/snippet}

<style>
  .variants {
    container: variants / inline-size;
    inline-size: 100%;
    min-inline-size: 0;
  }

  /* The frame scrolls, so it clips on every side: it reaches a focus ring's room past the cells,
     and hands that room back, so a ring at the matrix's edge stays whole. It holds the cells'
     out-of-flow parts too, such as a visually hidden name, which would otherwise reach past it
     and widen the page. */
  .scrolls {
    margin: calc(-1 * var(--sui-space-1));
    overflow-x: auto;
    overscroll-behavior-x: contain;
    padding: var(--sui-space-1);
    position: relative;
    scrollbar-width: thin;
  }

  /* The row values and the corner stay at the start while the cells scroll under them. Each
     takes its row's height and paints the stage's own ground past its box, over half of each
     row gap, the gap after the values and the frame's padding, without taking that room, so
     the held column is one solid strip and the start fade begins at its edge. */
  .scrolls :is(.corner, .row-label) {
    align-self: stretch;
    block-size: auto;
    border-image: linear-gradient(
        var(--sui-local-stage-ground, var(--sui-surface-base)),
        var(--sui-local-stage-ground, var(--sui-surface-base))
      )
      fill 0 / 0 / calc(var(--sui-space-4) / 2) var(--sui-space-6) calc(var(--sui-space-4) / 2)
      var(--sui-space-1);
    inset-inline-start: 0;
    position: sticky;
    z-index: var(--sui-layer-inner-plate);
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

  /* Folded, below 34rem: each row is a block, its value on top and its cells wrapping under
     it. */
  @container variants (width < 34rem) {
    .grid.fill {
      gap: var(--sui-space-6);
      grid-template-columns: minmax(0, 1fr);
    }

    .fill .corner,
    .fill .column {
      display: none;
    }

    .fill .row {
      align-items: flex-start;
      display: flex;
      flex-wrap: wrap;
      gap: var(--sui-space-4) var(--sui-space-5);
    }

    .fill .row-label {
      flex-basis: 100%;
    }

    /* A surface that fills what it is given takes the whole folded line. */
    .fill .cell {
      display: grid;
      flex: 1 1 100%;
      gap: var(--sui-space-2);
      justify-items: stretch;
    }

    .fill .cell-label {
      display: block;
    }
  }
</style>
