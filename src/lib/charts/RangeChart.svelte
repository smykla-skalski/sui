<script lang="ts">
  import { mark, word } from '../words.js';
  import VisuallyHidden from '../components/VisuallyHidden.svelte';
  import ChartFrame from './ChartFrame.svelte';
  import { clip, formatNumber } from './format.js';
  import {
    axis,
    markerPath,
    markerReach,
    position,
    rangeLayout,
    ticksOf,
    type Measure,
    type RangeLayout
  } from './geometry.js';
  import type { ChartFrameProps, RangeDatum } from './types.js';

  let {
    title,
    description,
    data,
    valueLabel = word('RangeChart.valueLabel', 'Value'),
    labelHeading = word('RangeChart.labelHeading', 'Label'),
    startLabel = word('RangeChart.startLabel', 'Start'),
    endLabel = word('RangeChart.endLabel', 'End'),
    rangeLabel = word('RangeChart.rangeLabel', 'Range'),
    markerLabel = word('RangeChart.markerLabel', 'Marker'),
    noMarkerLabel = word('RangeChart.noMarkerLabel', 'None'),
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

  const MIN_WIDTH = 320;
  /* Row labels longer than this are cut on the axis and stay whole in the table. */
  const LABEL_MOST = 18;
  const MARKER = 10;
  const END = 5;
  /* A placeholder keeps the room of three rows until the rows arrive. */
  const ROWS = 3;

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

  const along = (value: number) =>
    (value - valueAxis.domain[0]) / (valueAxis.domain[1] - valueAxis.domain[0]);

  /** The plot's box for the band's width, laid out to its ink. */
  function layout(frameWidth: number, scale: number, measure: Measure): RangeLayout {
    const diamond = markerReach('diamond', MARKER).across;
    return rangeLayout({
      // The least width grows with the text, as the names do, so the bars never squeeze.
      width: Math.max(Math.ceil(MIN_WIDTH * scale), frameWidth),
      scale,
      measure,
      labels: validData.map((item) => clip(item.label, LABEL_MOST)),
      ticks: ticksOf(valueAxis.ticks, valueAxis.domain, formatValue),
      valueLabel,
      marks: validData.flatMap((item) => [
        { at: along(item.start), past: END },
        { at: along(item.end), past: END },
        ...(item.marker === undefined ? [] : [{ at: along(item.marker), past: diamond }])
      ])
    });
  }

  function height(scale: number, measure: Measure): number {
    return rangeLayout({
      width: MIN_WIDTH,
      scale,
      measure,
      labels: Array<string>(validData.length || ROWS).fill(''),
      ticks: ticksOf(valueAxis.ticks, valueAxis.domain, formatValue),
      valueLabel,
      marks: []
    }).height;
  }

  function x(value: number, box: RangeLayout): number {
    return position(value, valueAxis.domain, box.left, box.right);
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
- Responsive: the plot stands on a band of the chart ground that reaches the edges of a card holding it; the longest row label starts and the furthest tick, end or marker ends exactly at the band's inner edges, and below 320px the plot scrolls sideways with a fade on each edge that has more past it; rows and margins grow with the reader's text size, so the ticks never meet the axis title.
- Accessibility: the plot is one image named by the title and description, the table has the title as its caption and names a missing marker in words, every mark holds 3:1 and every word 4.5:1.
- Localization: every word is a prop with an English default (`valueLabel`, `labelHeading`, `startLabel`, `endLabel`, `rangeLabel`, `markerLabel`, `noMarkerLabel` and the frame's words); default numbers follow the page language, labels are cut by character, and the plot reads left to right in every page.
- Performance: two circles, a line and a marker a row, which suits tens of rows; the table renders only while it is open. Nothing animates; an edge fade switches on the plot's own scroll timeline.
- Analytics: `ontableopenchange(open)` reports the table and `onretry` a retry.
- Failure: `status` draws loading, refreshing, stale and failed as every chart does; no rows draw an empty state with `emptyAction`, and rows whose values are not numbers are left out and counted in words.
-->

<ChartFrame
  {...frame}
  {title}
  {description}
  empty={validData.length === 0}
  missing={data.length - validData.length}
  plotSize={height}
>
  {#snippet plot(frameWidth: number, scale: number, measure: Measure)}
    {@const box = layout(frameWidth, scale, measure)}
    <svg
      width={box.width}
      height={box.height}
      viewBox="0 0 {box.width} {box.height}"
      role="img"
      aria-label="{title}{mark('stop')}{description}"
    >
      {#each valueAxis.ticks as tick (tick)}
        <line
          x1={x(tick, box)}
          x2={x(tick, box)}
          y1="0"
          y2={validData.length * box.row}
          class="grid"
        />
        <text x={x(tick, box)} y={box.tickBaseline} class="axis" text-anchor="middle"
          >{formatValue(tick)}</text
        >
      {/each}
      {#each validData as item, index (index)}
        {@const rowY = index * box.row + box.row / 2}
        <text x={box.labelEnd} y={rowY + box.cap / 2} class="axis" text-anchor="end"
          >{clip(item.label, LABEL_MOST)}</text
        >
        <line x1={x(item.start, box)} x2={x(item.end, box)} y1={rowY} y2={rowY} class="range" />
        <circle cx={x(item.start, box)} cy={rowY} r={END} class="endpoint"
          ><title
            >{item.label}{mark('comma')}{startLabel}{mark('colon')}{formatValue(item.start)}</title
          ></circle
        >
        <circle cx={x(item.end, box)} cy={rowY} r={END} class="endpoint"
          ><title>{item.label}{mark('comma')}{endLabel}{mark('colon')}{formatValue(item.end)}</title
          ></circle
        >
        {#if item.marker !== undefined}
          <path d={markerPath('diamond', x(item.marker, box), rowY, MARKER)} class="marker"
            ><title
              >{item.label}{mark('comma')}{markerLabel}{mark('colon')}{formatValue(
                item.marker
              )}</title
            ></path
          >
        {/if}
      {/each}
      {#if valueLabel}
        <text
          x={(box.left + box.right) / 2}
          y={box.titleBaseline}
          class="axis label"
          text-anchor="middle">{valueLabel}</text
        >
      {/if}
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
  /* Neutral ink and its own shape, so the marker is never read as a second series or an end.
     A ring of the ground parts it from the interval it sits on. */
  .marker {
    fill: var(--sui-text-primary);
    paint-order: stroke;
    stroke: var(--sui-chart-ground);
    stroke-width: 2;
  }

  .key .marker {
    stroke: var(--sui-surface-base);
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
