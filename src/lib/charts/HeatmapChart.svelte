<script lang="ts">
  import { mark, word } from '../words.js';
  import VisuallyHidden from '../components/VisuallyHidden.svelte';
  import ChartFrame from './ChartFrame.svelte';
  import { clip, formatNumber } from './format.js';
  import {
    centred,
    css,
    em,
    extent,
    heatmapLayout,
    minus,
    plus,
    px,
    times,
    type HeatmapLayout,
    type Length,
    type Measure
  } from './geometry.js';
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
  /* A placeholder keeps the room of two rows until the rows arrive. */
  const ROWS = 2;

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

  function layout(measure: Measure, names: string[]): HeatmapLayout {
    return heatmapLayout({
      measure,
      rows: names.map((row) => clip(row, ROW_MOST)),
      columns: columns.map((column) => clip(column, COLUMN_MOST))
    });
  }

  /** A place for the `translate` property. */
  const at = (across: Length, below: Length) => `${css(across)} ${css(below)}`;

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
- Responsive: the matrix stands on a band of the chart ground that reaches the edges of a card holding it, and starts exactly at the band's inner edge; cells keep their size and the matrix scrolls sideways with a fade on each edge that has more past it; cells and margins grow with the reader's text size, and long names are cut without splitting a character and stay whole in the table; the server draws the matrix where it stands once the page runs.
- Accessibility: the printed value carries each cell's number, with ink at 4.5:1 on every step, so a cell needs no edge; a cell with no value has a dashed edge at 3:1, forced colors outline every cell, and the table has the title as its caption and names an empty cell in words.
- Localization: `rowHeading`, `noDataLabel` and the frame's words are props with English defaults; default numbers follow the page language, the matrix reads left to right in every page, and names in a script the chart's own face does not hold are measured once the page runs.
- Performance: one rect and one text a cell, which suits a few hundred cells; the table renders only while it is open. Nothing animates; an edge fade switches on the matrix's own scroll timeline.
- Analytics: `ontableopenchange(open)` reports the table and `onretry` a retry.
- Failure: `status` draws loading, refreshing, stale and failed as every chart does; no values draw an empty state with `emptyAction`, and a cell with no value keeps its place with a dashed edge, named in the legend.
-->

<ChartFrame
  {...frame}
  {title}
  {description}
  {empty}
  plotSize={(measure) =>
    layout(measure, rows.length > 0 ? rows : Array<string>(ROWS).fill('')).height}
>
  {#snippet plot(measure: Measure)}
    {@const box = layout(measure, rows)}
    {@const cell = minus(box.size, px(2 * box.inset))}
    <svg
      style:inline-size={css(box.width)}
      style:block-size={css(box.height)}
      role="img"
      aria-label="{title}{mark('stop')}{description}"
    >
      {#each columns as column, columnIndex (columnIndex)}
        <text
          class="axis"
          text-anchor="middle"
          style:translate={at(
            plus(box.left, times(box.size, columnIndex + 0.5)),
            box.columnBaseline
          )}>{clip(column, COLUMN_MOST)}</text
        >
      {/each}
      {#each rows as row, rowIndex (rowIndex)}
        {@const cy = plus(box.top, times(box.size, rowIndex + 0.5))}
        <text
          class="axis"
          text-anchor="end"
          style:translate={at(box.labelEnd, plus(cy, em(box.cap / 2)))}>{clip(row, ROW_MOST)}</text
        >
        {#each columns as column, columnIndex (columnIndex)}
          {@const cellValue = value(row, column)}
          {@const cx = plus(box.left, times(box.size, columnIndex + 0.5))}
          {@const cellX = minus(cx, times(cell, 0.5))}
          {@const cellY = minus(cy, times(cell, 0.5))}
          {#if cellValue === null}
            <!-- The dashed edge is drawn inside the cell's box, so an empty cell is no larger than a filled one. -->
            <rect
              style:x={css(plus(cellX, px(0.5)))}
              style:y={css(plus(cellY, px(0.5)))}
              style:width={css(minus(cell, px(1)))}
              style:height={css(minus(cell, px(1)))}
              rx="4.5"
              class="missing"
              ><title>{row}{mark('comma')}{column}{mark('colon')}{noDataLabel}</title></rect
            >
            <text
              class="value none"
              text-anchor="middle"
              style:translate={at(cx, centred(measure('—'), cy))}>—</text
            >
          {:else}
            {@const words = formatValue(cellValue)}
            <rect
              style:x={css(cellX)}
              style:y={css(cellY)}
              style:width={css(cell)}
              style:height={css(cell)}
              rx="5"
              class="cell step-{step(cellValue)}"
              data-labelled><title>{row}{mark('comma')}{column}{mark('colon')}{words}</title></rect
            >
            <text
              class="value"
              text-anchor="middle"
              style:translate={at(cx, centred(measure(words), cy))}>{words}</text
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
  .axis {
    fill: var(--sui-text-muted);
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
    --sui-local-heat: color-mix(in srgb, var(--sui-chart-1) 12%, transparent);
  }
  .step-1 {
    --sui-local-heat: color-mix(in srgb, var(--sui-chart-1) 26%, transparent);
  }
  .step-2 {
    --sui-local-heat: color-mix(in srgb, var(--sui-chart-1) 40%, transparent);
  }
  .step-3 {
    --sui-local-heat: color-mix(in srgb, var(--sui-chart-1) 54%, transparent);
  }
  .step-4 {
    --sui-local-heat: color-mix(in srgb, var(--sui-chart-1) 68%, transparent);
  }
  /* Every cell prints its value, so its step is never the only carrier and it needs no edge
     (WCAG 1.4.11): the cells stand as plain fills parted by the surface, and the steps keep
     their range from near the surface to the strongest. */
  .cell {
    fill: var(--sui-local-heat);
  }
  /* No value is not the lowest value: a dashed edge that holds 3:1 sets it apart from every step,
     on the band's own ground. */
  rect.missing {
    fill: transparent;
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
    background: var(--sui-chart-ground);
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
