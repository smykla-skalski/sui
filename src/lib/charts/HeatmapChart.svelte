<script lang="ts">
  import { mark, word } from '../words.js';
  import VisuallyHidden from '../components/VisuallyHidden.svelte';
  import ChartFrame from './ChartFrame.svelte';
  import { clip, formatNumber } from './format.js';
  import { extent } from './geometry.js';
  import type { ChartFrameProps, HeatmapCell } from './types.js';

  let {
    title,
    description,
    rows,
    columns,
    cells,
    rowHeading = word('HeatmapChart.rowHeading', 'Row'),
    noDataLabel = word('HeatmapChart.noDataLabel', 'No data'),
    formatValue = formatNumber,
    rangeLabel = word('HeatmapChart.rangeLabel', (from: string, to: string) => `${from}–${to}`),
    ...frame
  }: ChartFrameProps & {
    rows: string[];
    columns: string[];
    cells: HeatmapCell[];
    /** The table's heading over the row names. */
    rowHeading?: string;
    /** The legend's and the table's words for a cell with no value. */
    noDataLabel?: string;
    formatValue?: (value: number) => string;
    /** A legend step's range from its two ends. */
    rangeLabel?: (from: string, to: string) => string;
  } = $props();

  /* Five steps of the first chart colour. The strongest stops where text ink still holds 4.5:1
     on it in both themes, because every cell prints its value. */
  const STEPS = 5;
  const COLUMN_MOST = 7;
  const ROW_MOST = 18;

  let lookup = $derived(
    new Map(cells.map((cell) => [`${cell.row}\u0000${cell.column}`, cell.value]))
  );
  let domain = $derived(
    extent(rows.flatMap((row) => columns.map((column) => value(row, column) ?? NaN)))
  );
  let empty = $derived(!rows.some((row) => columns.some((column) => value(row, column) !== null)));
  let missing = $derived(
    rows.reduce(
      (sum, row) => sum + columns.filter((column) => value(row, column) === null).length,
      0
    )
  );
  let legend = $derived(
    Array.from({ length: STEPS }, (_, step) => {
      const size = (domain[1] - domain[0]) / STEPS;
      return rangeLabel(
        formatValue(domain[0] + step * size),
        formatValue(domain[0] + (step + 1) * size)
      );
    })
  );

  function value(row: string, column: string): number | null {
    const cellValue = lookup.get(`${row}\u0000${column}`);
    return cellValue !== null && cellValue !== undefined && Number.isFinite(cellValue)
      ? cellValue
      : null;
  }

  function step(cellValue: number): number {
    const fraction = (cellValue - domain[0]) / (domain[1] - domain[0]);
    return Math.min(STEPS - 1, Math.max(0, Math.floor(fraction * STEPS)));
  }
</script>

<!--
@component
A matrix of numbers, where a stronger colour means a higher value. Colour is never the only
carrier: every cell prints its value, a legend under the matrix names the range each of the
five colour steps covers, and a cell with no value is drawn with a dashed edge and a dash,
named in the legend and the table. Cells keep their size, so the matrix is as wide as its
columns and scrolls sideways in a narrower container.

- Semantics: a `figure` named by its title, a heading at `level` (3 by default), with the matrix as one `role="img"`, a legend list and a disclosure holding a table of every cell.
- Content: row and column names, cells with a number or `null`, and a formatter; a title and a one-sentence description are required.
- States: shown, empty, loading, refreshing, stale, failed and partial (cells with no value); the data control draws hover, pressed and focus.
- Keyboard: Tab reaches the matrix when it scrolls, then "View chart data", where Enter or Space opens the table, and the table itself when it scrolls.
- Pointer and touch: "View chart data" is 24px tall on a desktop pointer and 44px on a phone or a coarse pointer; nothing needs hover, since each cell prints its value.
- Focus: opening the table keeps focus on its control; retrying a failed chart is the error state's button.
- Responsive: cells keep their size and the matrix scrolls sideways; cells and margins grow with the reader's text size, and long names are cut without splitting a character and stay whole in the table.
- Accessibility: the printed value carries each cell's number, with ink at 4.5:1 on every step, so a cell needs no edge; a cell with no value has a dashed edge at 3:1, forced colors outline every cell, and the table has the title as its caption and names an empty cell in words.
- Localization: `rowHeading`, `noDataLabel` and the frame's words are props with English defaults; default numbers follow the page language, and the matrix reads left to right in every page.
- Performance: one rect and one text a cell, which suits a few hundred cells; the table renders only while it is open. Nothing animates.
- Analytics: `ontableopenchange(open)` reports the table and `onretry` a retry.
- Failure: `status` draws loading, refreshing, stale and failed as every chart does; no values draw an empty state with `emptyAction`, and a cell with no value keeps its place with a dashed edge, named in the legend.
-->

<ChartFrame {...frame} {title} {description} {empty} plotHeight={54 + 2 * 52 + 12}>
  {#snippet plot(_width: number, scale: number)}
    {@const size = 52 * scale}
    {@const left = 140 * scale}
    {@const top = 54 * scale}
    {@const width = Math.round(left + columns.length * size + 12)}
    {@const height = Math.round(top + rows.length * size + 12)}
    <svg
      {width}
      {height}
      viewBox="0 0 {width} {height}"
      role="img"
      aria-label="{title}{mark('stop')}{description}"
    >
      {#each columns as column, columnIndex (columnIndex)}
        <text
          x={left + columnIndex * size + size / 2}
          y={top - 12 * scale}
          class="axis"
          text-anchor="middle">{clip(column, COLUMN_MOST)}</text
        >
      {/each}
      {#each rows as row, rowIndex (rowIndex)}
        <text
          x={left - 10 * scale}
          y={top + rowIndex * size + size / 2 + 4 * scale}
          class="axis"
          text-anchor="end">{clip(row, ROW_MOST)}</text
        >
        {#each columns as column, columnIndex (columnIndex)}
          {@const cellValue = value(row, column)}
          {@const cx = left + columnIndex * size + size / 2}
          {@const cy = top + rowIndex * size + size / 2}
          {#if cellValue === null}
            <rect
              x={cx - size / 2 + 2}
              y={cy - size / 2 + 2}
              width={size - 4}
              height={size - 4}
              rx="5"
              class="missing"
              ><title>{row}{mark('comma')}{column}{mark('colon')}{noDataLabel}</title></rect
            >
            <text x={cx} y={cy} class="value none" text-anchor="middle" dominant-baseline="central"
              >—</text
            >
          {:else}
            <rect
              x={cx - size / 2 + 2}
              y={cy - size / 2 + 2}
              width={size - 4}
              height={size - 4}
              rx="5"
              class="cell step-{step(cellValue)}"
              data-labelled
              ><title>{row}{mark('comma')}{column}{mark('colon')}{formatValue(cellValue)}</title
              ></rect
            >
            <text x={cx} y={cy} class="value" text-anchor="middle" dominant-baseline="central"
              >{formatValue(cellValue)}</text
            >
          {/if}
        {/each}
      {/each}
    </svg>
  {/snippet}
  <ul class="legend" role="list">
    {#each legend as range, index (index)}
      <li><span class="swatch step-{index}" aria-hidden="true"></span>{range}</li>
    {/each}
    {#if missing > 0}
      <li><span class="swatch missing" aria-hidden="true"></span>{noDataLabel}</li>
    {/if}
  </ul>
  {#snippet table()}
    <table>
      <caption>{title}</caption>
      <thead
        ><tr
          ><th scope="col">{rowHeading}</th>{#each columns as column, columnIndex (columnIndex)}<th
              scope="col">{column}</th
            >{/each}</tr
        ></thead
      >
      <tbody>
        {#each rows as row, rowIndex (rowIndex)}
          <tr
            ><th scope="row">{row}</th
            >{#each columns as column, columnIndex (columnIndex)}{@const cellValue = value(
                row,
                column
              )}<td
                >{#if cellValue === null}<span aria-hidden="true">—</span><VisuallyHidden
                    >{noDataLabel}</VisuallyHidden
                  >{:else}{formatValue(cellValue)}{/if}</td
              >{/each}</tr
          >
        {/each}
      </tbody>
    </table>
  {/snippet}
</ChartFrame>

<style>
  svg {
    display: block;
  }
  .axis,
  .value {
    fill: var(--sui-text-muted);
    font: var(--sui-weight-regular) var(--sui-font-size-compact) / var(--sui-leading-flat)
      var(--sui-sans);
  }
  .value {
    fill: var(--sui-text-primary);
    font-variant-numeric: tabular-nums;
    font-weight: var(--sui-weight-medium);
  }
  .value.none {
    fill: var(--sui-text-muted);
  }
  .step-0 {
    --sui-local-heat: color-mix(in srgb, var(--sui-chart-1) 12%, var(--sui-surface-base));
  }
  .step-1 {
    --sui-local-heat: color-mix(in srgb, var(--sui-chart-1) 26%, var(--sui-surface-base));
  }
  .step-2 {
    --sui-local-heat: color-mix(in srgb, var(--sui-chart-1) 40%, var(--sui-surface-base));
  }
  .step-3 {
    --sui-local-heat: color-mix(in srgb, var(--sui-chart-1) 54%, var(--sui-surface-base));
  }
  .step-4 {
    --sui-local-heat: color-mix(in srgb, var(--sui-chart-1) 68%, var(--sui-surface-base));
  }
  /* Every cell prints its value, so its step is never the only carrier and it needs no edge
     (WCAG 1.4.11): the cells stand as plain fills parted by the surface, and the steps keep
     their range from near the surface to the strongest. */
  .cell {
    fill: var(--sui-local-heat);
  }
  /* No value is not the lowest value: a dashed edge that holds 3:1 sets it apart from every step. */
  rect.missing {
    fill: var(--sui-surface-base);
    stroke: var(--sui-border-strong);
    stroke-dasharray: 4 3;
    stroke-width: var(--sui-stroke);
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    font: var(--sui-weight-regular) var(--sui-font-size-compact) / var(--sui-leading-compact)
      var(--sui-sans);
    gap: var(--sui-space-2) var(--sui-space-4);
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .legend li {
    align-items: center;
    display: inline-flex;
    font-variant-numeric: tabular-nums;
    gap: var(--sui-space-2);
  }
  .swatch {
    background: var(--sui-local-heat);
    block-size: var(--sui-icon-base);
    border-radius: var(--sui-radius-check);
    box-sizing: border-box;
    flex: none;
    inline-size: var(--sui-space-6);
  }
  .swatch.missing {
    background: var(--sui-surface-base);
    border: var(--sui-stroke) dashed var(--sui-border-strong);
  }
  /* Forced colors drop the fills, so every cell and swatch keeps its place by an outline. */
  @media (forced-colors: active) {
    .cell {
      stroke: CanvasText;
      stroke-width: var(--sui-stroke);
    }

    .swatch:not(.missing) {
      border: var(--sui-stroke) solid CanvasText;
    }
  }
</style>
