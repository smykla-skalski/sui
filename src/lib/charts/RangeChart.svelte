<script lang="ts">
  import { mark, word } from '../words.js';
  import VisuallyHidden from '../components/VisuallyHidden.svelte';
  import ChartFrame from './ChartFrame.svelte';
  import { clip, formatNumber } from './format.js';
  import {
    along,
    axis,
    css,
    definition,
    em,
    fraction,
    markerPath,
    markerReach,
    minus,
    plus,
    px,
    rangeLayout,
    ticksOf,
    times,
    type Length,
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

  /* Row labels longer than this are cut on the axis and stay whole in the table. */
  const LABEL_MOST = 18;
  const MARKER = 10;
  const END = 5;
  /* An interval's line is 4px thick. */
  const RANGE = 4;
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

  /** The plot's box, laid out to its ink in lengths the browser resolves at any width. */
  function layout(measure: Measure): RangeLayout {
    const diamond = px(markerReach('diamond', MARKER).across);
    const at = (value: number) => fraction(value, valueAxis.domain);
    return rangeLayout({
      measure,
      labels: validData.map((item) => clip(item.label, LABEL_MOST)),
      ticks: ticksOf(valueAxis.ticks, valueAxis.domain, formatValue),
      valueLabel,
      marks: validData.flatMap((item) => [
        { at: at(item.start), past: px(END) },
        { at: at(item.end), past: px(END) },
        ...(item.marker === undefined ? [] : [{ at: at(item.marker), past: diamond }])
      ])
    });
  }

  function height(measure: Measure): Length {
    return rangeLayout({
      measure,
      labels: Array<string>(validData.length || ROWS).fill(''),
      ticks: ticksOf(valueAxis.ticks, valueAxis.domain, formatValue),
      valueLabel,
      marks: []
    }).height;
  }

  const x = (value: number, box: RangeLayout) =>
    along(box.left, box.right, fraction(value, valueAxis.domain));

  /** A place for the `translate` property. */
  const at = (across: Length, below: Length) => `${css(across)} ${css(below)}`;
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
- Responsive: the plot stands on a band of the chart ground that reaches the edges of a card holding it; the longest row label starts and the furthest tick, end or marker ends exactly at the band's inner edges, and below 320px the plot scrolls sideways with a fade on each edge that has more past it; rows and margins grow with the reader's text size, so the ticks never meet the axis title; every place is a length the browser resolves from the band's width and the text size, so the server draws the plot where it stands once the page runs.
- Accessibility: the plot is one image named by the title and description, the table has the title as its caption and names a missing marker in words, every mark holds 3:1 and every word 4.5:1.
- Localization: every word is a prop with an English default (`valueLabel`, `labelHeading`, `startLabel`, `endLabel`, `rangeLabel`, `markerLabel`, `noMarkerLabel` and the frame's words); default numbers follow the page language, labels are cut by character, the plot reads left to right in every page, and labels in a script the chart's own face does not hold are measured once the page runs.
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
  {#snippet plot(measure: Measure)}
    {@const box = layout(measure)}
    {@const rows = times(box.row, validData.length)}
    <svg
      class="plot"
      style:--sui-local-plot-start={definition(box.left)}
      style:--sui-local-plot-end={definition(box.right)}
      style:block-size={css(box.height)}
      role="img"
      aria-label="{title}{mark('stop')}{description}"
    >
      {#each valueAxis.ticks as tick (tick)}
        <rect class="grid" style:x={css(minus(x(tick, box), px(0.5)))} style:height={css(rows)} />
        <text class="axis" text-anchor="middle" style:translate={at(x(tick, box), box.tickBaseline)}
          >{formatValue(tick)}</text
        >
      {/each}
      {#each validData as item, index (index)}
        {@const rowY = times(box.row, index + 0.5)}
        <text
          class="axis"
          text-anchor="end"
          style:translate={at(box.labelEnd, plus(rowY, em(box.cap / 2)))}
          >{clip(item.label, LABEL_MOST)}</text
        >
        <!-- An interval is a line with round caps, drawn as the stadium those caps make. -->
        <rect
          class="range"
          style:x={css(minus(x(item.start, box), px(RANGE / 2)))}
          style:y={css(minus(rowY, px(RANGE / 2)))}
          style:width={css(plus(minus(x(item.end, box), x(item.start, box)), px(RANGE)))}
          height={RANGE}
          rx={RANGE / 2}
        />
        <circle class="endpoint" r={END} style:cx={css(x(item.start, box))} style:cy={css(rowY)}
          ><title
            >{item.label}{mark('comma')}{startLabel}{mark('colon')}{formatValue(item.start)}</title
          ></circle
        >
        <circle class="endpoint" r={END} style:cx={css(x(item.end, box))} style:cy={css(rowY)}
          ><title>{item.label}{mark('comma')}{endLabel}{mark('colon')}{formatValue(item.end)}</title
          ></circle
        >
        {#if item.marker !== undefined}
          <path
            d={markerPath('diamond', 0, 0, MARKER)}
            class="marker"
            style:translate={at(x(item.marker, box), rowY)}
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
          class="axis label"
          text-anchor="middle"
          style:translate={at(along(box.left, box.right, 0.5), box.titleBaseline)}
          >{valueLabel}</text
        >
      {/if}
    </svg>
  {/snippet}
  <ul class="legend" role="list">
    <li>
      <svg class="key" viewBox="0 0 24 12" aria-hidden="true">
        <rect x="3" y="4" width="18" height={RANGE} rx={RANGE / 2} class="range" />
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
  /* The plot takes its band's width in whole pixels, and scrolls below 320px at a 16px root,
     more with larger text, so its bars never squeeze. It is its own container, so its marks
     are placed in shares of its width and the server draws each one exactly where it stands. */
  .plot {
    container-type: inline-size;
    inline-size: max(round(down, 100%, 1px), round(up, 20rem, 1px));
  }
  .grid {
    fill: var(--sui-chart-grid);
    width: 1px;
  }
  .axis {
    fill: var(--sui-text-muted);
  }
  .label {
    font-weight: var(--sui-weight-semibold);
  }
  .range {
    fill: var(--sui-chart-1);
  }
  .endpoint {
    fill: var(--sui-chart-1);
  }
  /* Neutral ink and its own shape, so the marker is never read as a second series or an end.
     A ring of the ground parts it from the interval it sits on. */
  .marker {
    fill: var(--sui-text-primary);
    paint-order: stroke;
    stroke: var(--sui-chart-ring);
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
