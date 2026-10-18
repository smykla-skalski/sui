<script lang="ts">
  import { mark, word } from '../words.js';
  import ChartFrame from './ChartFrame.svelte';
  import { formatNumber } from './format.js';
  import {
    along,
    axis,
    centred,
    chartColor,
    chartDash,
    chartMarker,
    css,
    definition,
    fraction,
    markerPath,
    markerReach,
    minus,
    plus,
    px,
    sieve,
    thin,
    thinWidth,
    ticksOf,
    xyGrid,
    xyLayout,
    type Length,
    type MarkReach,
    type Measure,
    type XYLayout
  } from './geometry.js';
  import type { ChartPoint, XYChartProps } from './types.js';

  type Props = XYChartProps & { kind: 'line' | 'scatter' };

  let {
    kind,
    title,
    description,
    series,
    xLabel = word('XYChart.xLabel', 'X'),
    yLabel = word('XYChart.yLabel', 'Y'),
    seriesHeading = word('XYChart.seriesHeading', 'Series'),
    formatX = formatNumber,
    formatY = formatNumber,
    ...frame
  }: Props = $props();

  /* At least 8px across, and a little larger where there is no line to follow. */
  const MARKER = { line: 8, scatter: 10 };
  /* Past four lines, names at the line ends crowd each other, so the legend carries them alone. */
  const MOST_LABELLED = 4;
  /* A marker needs room to read as a shape: a line keeps its markers while they stand twice
     their size apart on its narrowest plot, the 280px band less its margins, and a denser line
     is drawn alone at every width, its dash still telling it apart, so the marks it draws never
     change with the room it has. Plotly draws markers by a trace's point count the same way. */
  const MOST_MARKED = 12;
  const LINE_WIDTH = 2.5;
  /* A round cap and join reach half the line's width past each point. */
  const CAP = { across: LINE_WIDTH / 2, above: LINE_WIDTH / 2, below: LINE_WIDTH / 2 };

  const finite = (point: ChartPoint) => Number.isFinite(point.x) && Number.isFinite(point.y);

  let validSeries = $derived(
    series.map((item, index) => {
      const points = item.points.filter(finite);
      return {
        ...item,
        color: chartColor(index),
        marker: chartMarker(index),
        dash: chartDash(index),
        points,
        marked: kind === 'scatter' || points.length <= MOST_MARKED
      };
    })
  );
  let missing = $derived(
    series.reduce((sum, item) => sum + item.points.length - item.points.filter(finite).length, 0)
  );
  let ends = $derived(
    kind === 'line' && validSeries.length <= MOST_LABELLED
      ? validSeries.flatMap((item) => {
          const last = item.points.reduce<ChartPoint | null>(
            (latest, point) => (latest === null || point.x >= latest.x ? point : latest),
            null
          );
          return last ? [{ id: item.id, label: item.label, point: last }] : [];
        })
      : []
  );
  let points = $derived(validSeries.flatMap((item) => item.points));
  let xAxis = $derived(axis(points.map((point) => point.x)));
  let yAxis = $derived(
    axis(
      points.map((point) => point.y),
      true
    )
  );

  /** Each series' outermost points, with the reach of its marker or of its line's cap. */
  function outermost(): MarkReach[] {
    return validSeries.flatMap((item) => {
      if (item.points.length === 0) return [];
      const reach = item.marked ? markerReach(item.marker, MARKER[kind]) : CAP;
      const pick = (first: (a: ChartPoint, b: ChartPoint) => boolean) =>
        item.points.reduce((best, point) => (first(point, best) ? point : best));
      return [
        pick((a, b) => a.x < b.x),
        pick((a, b) => a.x > b.x),
        pick((a, b) => a.y < b.y),
        pick((a, b) => a.y > b.y)
      ].map((point) => ({
        x: fraction(point.x, xAxis.domain),
        y: fraction(point.y, yAxis.domain),
        ...reach
      }));
    });
  }

  /** The plot's box, laid out to its ink in lengths the browser resolves at any width. */
  function layout(measure: Measure): XYLayout {
    return xyLayout({
      measure,
      xTicks: ticksOf(xAxis.ticks, xAxis.domain, formatX),
      yTicks: ticksOf(yAxis.ticks, yAxis.domain, formatY),
      xLabel,
      yLabel,
      marks: outermost(),
      names: ends.map((end) => ({
        x: fraction(end.point.x, xAxis.domain),
        y: fraction(end.point.y, yAxis.domain),
        text: end.label
      }))
    });
  }

  /** How far down the grid a value stands, in its own pixels. */
  const down = (value: number) => xyGrid - fraction(value, yAxis.domain) * xyGrid;

  const x = (value: number, box: XYLayout) =>
    along(box.left, box.right, fraction(value, xAxis.domain));

  const y = (value: number, box: XYLayout) => plus(box.top, px(down(value)));

  /** A place for the `translate` property. */
  const at = (across: Length, below: Length) => `${css(across)} ${css(below)}`;

  /* The line is drawn in shares of the plot's width, which its style stretches across the
     plot however wide it is. */
  function path(seriesPoints: ChartPoint[]): string {
    return thin(seriesPoints, thinWidth, xAxis.domain)
      .map(
        (point, index) =>
          `${index === 0 ? 'M' : 'L'} ${fraction(point.x, xAxis.domain)} ${down(point.y)}`
      )
      .join(' ');
  }

  /* A scatter keeps one mark per half-marker square of the widest plot: the ones it drops would
     lie under it, and every value stays in the table. */
  // ponytail: the box is laid out to every point, so a dropped outermost point leaves its edge
  // up to half a marker short; lay out to the kept marks if that ever shows.
  function drawn(seriesPoints: ChartPoint[]): ChartPoint[] {
    if (kind !== 'scatter') return seriesPoints;
    return sieve(
      seriesPoints,
      (point) => [fraction(point.x, xAxis.domain) * thinWidth, down(point.y)],
      MARKER.scatter / 2
    );
  }
</script>

<ChartFrame
  {...frame}
  {title}
  {description}
  empty={points.length === 0}
  {missing}
  plotSize={(measure) => layout(measure).height}
>
  {#snippet plot(measure: Measure)}
    {@const box = layout(measure)}
    <svg
      class="plot"
      style:--sui-local-plot-start={definition(box.left)}
      style:--sui-local-plot-end={definition(box.right)}
      style:--sui-local-plot-top={definition(box.top)}
      style:block-size={css(box.height)}
      role="img"
      aria-label="{title}{mark('stop')}{description}"
    >
      {#each yAxis.ticks as tick (tick)}
        {@const words = formatY(tick)}
        <rect class="grid" style:y={css(minus(y(tick, box), px(0.5)))} />
        <text
          class="axis"
          text-anchor="end"
          style:translate={at(box.tickEnd, centred(measure(words), y(tick, box)))}>{words}</text
        >
      {/each}
      {#each xAxis.ticks as tick (tick)}
        <text
          class="axis"
          text-anchor="middle"
          style:translate={at(x(tick, box), box.xTickBaseline)}>{formatX(tick)}</text
        >
      {/each}
      {#if xLabel}
        <text
          class="label"
          text-anchor="middle"
          style:translate={at(along(box.left, box.right, 0.5), box.xTitleBaseline)}>{xLabel}</text
        >
      {/if}
      {#if yLabel}
        <text
          class="label y-title"
          text-anchor="middle"
          style:translate={at(box.yTitle.x, box.yTitle.y)}>{yLabel}</text
        >
      {/if}
      {#each validSeries as item (item.id)}
        {#if kind === 'line' && item.points.length > 1}
          <path
            class="line"
            d={path(item.points)}
            fill="none"
            stroke={item.color}
            stroke-dasharray={item.dash}
            stroke-width={LINE_WIDTH}
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        {/if}
        {#if item.marked}
          {#each drawn(item.points) as point, pointIndex (pointIndex)}
            <path
              d={markerPath(item.marker, 0, 0, MARKER[kind])}
              fill={item.color}
              class="marker"
              style:translate={at(x(point.x, box), y(point.y, box))}
            >
              <title
                >{item.label}{mark('colon')}{formatX(point.x)}{mark('comma')}{formatY(
                  point.y
                )}</title
              >
            </path>
          {/each}
        {/if}
      {/each}
      {#each ends as end, index (end.id)}
        <text
          class="name"
          style:translate={at(plus(x(end.point.x, box), box.nameGap), box.names[index])}
          >{end.label}</text
        >
      {/each}
    </svg>
  {/snippet}
  <ul class="legend" role="list">
    {#each validSeries as item (item.id)}
      <li>
        <svg class="key" viewBox="0 0 24 12" aria-hidden="true">
          {#if kind === 'line'}
            <line
              x1="1"
              x2="23"
              y1="6"
              y2="6"
              stroke={item.color}
              stroke-dasharray={item.dash}
              stroke-width={LINE_WIDTH}
              stroke-linecap="round"
            />
          {/if}
          <path d={markerPath(item.marker, 12, 6, MARKER.line)} fill={item.color} class="marker" />
        </svg>{item.label}
      </li>
    {/each}
  </ul>
  {#snippet table()}
    <table>
      <caption>{title}</caption>
      <thead
        ><tr
          ><th scope="col">{seriesHeading}</th><th scope="col">{xLabel}</th><th scope="col"
            >{yLabel}</th
          ></tr
        ></thead
      >
      <tbody>
        {#each validSeries as item (item.id)}
          {#each item.points as point, pointIndex (pointIndex)}
            <tr
              ><th scope="row">{item.label}</th><td>{formatX(point.x)}</td><td
                >{formatY(point.y)}</td
              ></tr
            >
          {/each}
        {/each}
      </tbody>
    </table>
  {/snippet}
</ChartFrame>

<style>
  svg {
    display: block;
    overflow: visible;
  }
  /* The plot takes its band's width in whole pixels, and scrolls below 280px at a 16px root,
     more with larger text, rather than squeezing its points and ticks together. It is its own
     container, so its marks are placed in shares of its width and the server draws each one
     exactly where it stands. */
  .plot {
    container-type: inline-size;
    inline-size: max(round(down, 100%, 1px), round(up, 17.5rem, 1px));
  }
  .grid {
    fill: var(--sui-chart-grid);
    height: 1px;
    width: calc(var(--sui-local-plot-end) - var(--sui-local-plot-start));
    x: var(--sui-local-plot-start);
  }
  .y-title {
    rotate: -90deg;
  }
  /* A line is drawn in shares of the plot's width and stretched across it, while its stroke,
     dashes and caps keep their size. The stretch is the plot's width in pixels as a number,
     which only typed arithmetic divides out; elsewhere the tangent of the angle the width makes
     with a known length gives the same quotient. */
  .line {
    scale: calc(tan(atan2(var(--sui-local-plot-end) - var(--sui-local-plot-start), 1000px)) * 1000)
      1;
    translate: var(--sui-local-plot-start) var(--sui-local-plot-top);
    vector-effect: non-scaling-stroke;
  }
  @supports (scale: calc(1px / 1px)) {
    .line {
      scale: calc((var(--sui-local-plot-end) - var(--sui-local-plot-start)) / 1px) 1;
    }
  }
  .axis,
  .label {
    fill: var(--sui-text-muted);
  }
  .label,
  .name {
    font-weight: var(--sui-weight-semibold);
  }
  .name {
    fill: var(--sui-text-secondary);
  }
  /* A ring of the band's ground keeps a marker whole where it crosses another series' line. */
  .marker {
    stroke: var(--sui-chart-ring);
    stroke-width: 1.5;
    paint-order: stroke;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-2) var(--sui-space-4);
    margin: 0;
    padding: 0;
    list-style: none;
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-sans);
  }
  .legend li {
    display: inline-flex;
    align-items: center;
    gap: var(--sui-space-2);
  }
  .key {
    block-size: var(--sui-icon-sm);
    flex: none;
    inline-size: calc(2 * var(--sui-icon-sm));
    overflow: visible;
  }
  .key .marker {
    stroke: var(--sui-surface-base);
  }
</style>
