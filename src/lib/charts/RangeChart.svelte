<script lang="ts">
  import VisuallyHidden from '../components/VisuallyHidden.svelte';
  import ChartFrame from './ChartFrame.svelte';
  import { clip, formatNumber } from './format.js';
  import { axis, markerPath, position } from './geometry.js';
  import type { ChartFrameProps, RangeDatum } from './types.js';

  let {
    title,
    description,
    data,
    valueLabel = 'Value',
    labelHeading = 'Label',
    startLabel = 'Start',
    endLabel = 'End',
    rangeLabel = 'Range',
    markerLabel = 'Marker',
    noMarkerLabel = 'None',
    formatValue = formatNumber,
    ...frame
  }: ChartFrameProps & {
    data: RangeDatum[];
    /** The axis title, such as "Hours". */
    valueLabel?: string;
    /** The table's heading over the row labels. */
    labelHeading?: string;
    startLabel?: string;
    endLabel?: string;
    /** The legend's name for an interval. */
    rangeLabel?: string;
    /** The legend's and the table's name for the point inside an interval. */
    markerLabel?: string;
    /** What the table says, to a screen reader, for a row with no marker. */
    noMarkerLabel?: string;
    formatValue?: (value: number) => string;
  } = $props();

  const RIGHT = 20;
  const MIN_WIDTH = 320;
  const ROWS = 3;
  /* Row labels longer than this are cut on the axis and stay whole in the table. */
  const LABEL_MOST = 18;
  const MARKER = 10;

  type Frame = {
    width: number;
    height: number;
    left: number;
    top: number;
    row: number;
    rows: number;
  };

  let validData = $derived(
    data.filter(
      (item) =>
        Number.isFinite(item.start) &&
        Number.isFinite(item.end) &&
        (item.marker === undefined || Number.isFinite(item.marker))
    )
  );
  let valueAxis = $derived(
    axis(
      validData.flatMap((item) => [
        item.start,
        item.end,
        ...(item.marker === undefined ? [] : [item.marker])
      ])
    )
  );

  /** The plot's box, with every margin and row that holds text grown by the reader's text scale. */
  function layout(frameWidth: number, scale: number): Frame {
    const top = 32 * scale;
    const row = 42 * scale;
    const rows = top + validData.length * row;
    return {
      width: Math.max(MIN_WIDTH, frameWidth),
      height: Math.round(rows + 46 * scale),
      left: 140 * scale,
      top,
      row,
      rows
    };
  }

  function x(value: number, box: Frame): number {
    return position(value, valueAxis.domain, box.left, box.width - RIGHT);
  }
</script>

<!--
@component
Labelled intervals on one numeric axis, each with an optional marker inside it, such as a
planned window and the moment work actually started. An interval is a line between two
round ends in the first chart colour, and the marker is a diamond in text ink, so the two
differ by shape as well as colour, and the legend under the plot names both. Long labels are
cut on the axis without splitting a character and stay whole in the table under the chart.

- Semantics: a `figure` named by its title, a heading at `level` (3 by default), with the plot as one `role="img"`, a legend list and a disclosure holding a table of every interval.
- Content: rows with a label, a start, an end and an optional marker; a title and a one-sentence description are required.
- States: shown, empty, loading, refreshing, stale, failed and partial (rows left out); the data control draws hover, pressed and focus.
- Keyboard: Tab reaches the plot when it scrolls, then "View chart data", where Enter or Space opens the table, and the table itself when it scrolls.
- Pointer and touch: "View chart data" is 24px tall on a desktop pointer and 44px on a phone or a coarse pointer; nothing needs hover, since every value is in the table.
- Focus: opening the table keeps focus on its control; retrying a failed chart is the error state's button.
- Responsive: the plot fills its container's width and scrolls sideways below 320px; its rows and margins grow with the reader's text size, so the ticks never meet the axis title.
- Accessibility: the plot is one image named by the title and description, the table has the title as its caption and names a missing marker in words, every mark holds 3:1 and every word 4.5:1.
- Localization: every word is a prop with an English default (`valueLabel`, `labelHeading`, `startLabel`, `endLabel`, `rangeLabel`, `markerLabel`, `noMarkerLabel` and the frame's words); default numbers follow the page language, labels are cut by character, and the plot reads left to right in every page.
- Performance: two circles, a line and a marker a row, which suits tens of rows; the table renders only while it is open. Nothing animates.
- Analytics: `ontableopenchange(open)` reports the table and `onretry` a retry.
- Failure: `status` draws loading, refreshing, stale and failed as every chart does; no rows draw an empty state with `emptyAction`, and rows whose values are not numbers are left out and counted in words.
-->

<ChartFrame
  {...frame}
  {title}
  {description}
  empty={validData.length === 0}
  missing={data.length - validData.length}
  plotHeight={32 + ROWS * 42 + 46}
>
  {#snippet plot(frameWidth: number, scale: number)}
    {@const box = layout(frameWidth, scale)}
    <svg
      width={box.width}
      height={box.height}
      viewBox="0 0 {box.width} {box.height}"
      role="img"
      aria-label="{title}. {description}"
    >
      {#each valueAxis.ticks as tick (tick)}
        <line
          x1={x(tick, box)}
          x2={x(tick, box)}
          y1={box.top - 12 * scale}
          y2={box.rows + 4 * scale}
          class="grid"
        />
        <text x={x(tick, box)} y={box.rows + 18 * scale} class="axis" text-anchor="middle"
          >{formatValue(tick)}</text
        >
      {/each}
      {#each validData as item, index (index)}
        {@const rowY = box.top + index * box.row + box.row / 2}
        <text x={box.left - 12 * scale} y={rowY + 4 * scale} class="axis" text-anchor="end"
          >{clip(item.label, LABEL_MOST)}</text
        >
        <line x1={x(item.start, box)} x2={x(item.end, box)} y1={rowY} y2={rowY} class="range" />
        <circle cx={x(item.start, box)} cy={rowY} r="5" class="endpoint"
          ><title>{item.label}, {startLabel}: {formatValue(item.start)}</title></circle
        >
        <circle cx={x(item.end, box)} cy={rowY} r="5" class="endpoint"
          ><title>{item.label}, {endLabel}: {formatValue(item.end)}</title></circle
        >
        {#if item.marker !== undefined}
          <path d={markerPath('diamond', x(item.marker, box), rowY, MARKER)} class="marker"
            ><title>{item.label}, {markerLabel}: {formatValue(item.marker)}</title></path
          >
        {/if}
      {/each}
      <text
        x={(box.left + box.width - RIGHT) / 2}
        y={box.rows + 40 * scale}
        class="axis label"
        text-anchor="middle">{valueLabel}</text
      >
    </svg>
  {/snippet}
  <ul class="legend" role="list">
    <li>
      <svg class="key" viewBox="0 0 24 12" aria-hidden="true">
        <line x1="5" x2="19" y1="6" y2="6" class="range" />
        <circle cx="5" cy="6" r="4" class="endpoint" />
        <circle cx="19" cy="6" r="4" class="endpoint" />
      </svg>{rangeLabel}
    </li>
    {#if validData.some((item) => item.marker !== undefined)}
      <li>
        <svg class="key" viewBox="0 0 24 12" aria-hidden="true">
          <path d={markerPath('diamond', 12, 6, MARKER)} class="marker" />
        </svg>{markerLabel}
      </li>
    {/if}
  </ul>
  {#snippet table()}
    <table>
      <caption>{title}</caption>
      <thead
        ><tr
          ><th scope="col">{labelHeading}</th><th scope="col">{startLabel}</th><th scope="col"
            >{endLabel}</th
          ><th scope="col">{markerLabel}</th></tr
        ></thead
      >
      <tbody>
        {#each validData as item, index (index)}
          <tr
            ><th scope="row">{item.label}</th><td>{formatValue(item.start)}</td><td
              >{formatValue(item.end)}</td
            ><td
              >{#if item.marker === undefined}<span aria-hidden="true">—</span><VisuallyHidden
                  >{noMarkerLabel}</VisuallyHidden
                >{:else}{formatValue(item.marker)}{/if}</td
            ></tr
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
  .grid {
    stroke: var(--sui-chart-grid);
    stroke-width: 1;
  }
  .axis {
    fill: var(--sui-text-muted);
    font: var(--sui-weight-regular) var(--sui-font-size-compact) / var(--sui-leading-flat)
      var(--sui-sans);
  }
  .label {
    font-weight: var(--sui-weight-semibold);
  }
  .range {
    stroke: var(--sui-chart-1);
    stroke-width: 4;
    stroke-linecap: round;
  }
  .endpoint {
    fill: var(--sui-chart-1);
  }
  /* Neutral ink and its own shape, so the marker is never read as a second series or an end. */
  .marker {
    fill: var(--sui-text-primary);
    paint-order: stroke;
    stroke: var(--sui-surface-base);
    stroke-width: 2;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-sans);
    gap: var(--sui-space-2) var(--sui-space-4);
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .legend li {
    align-items: center;
    display: inline-flex;
    gap: var(--sui-space-2);
  }
  .key {
    block-size: var(--sui-icon-sm);
    flex: none;
    inline-size: calc(2 * var(--sui-icon-sm));
    overflow: visible;
  }
</style>
