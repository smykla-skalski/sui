<script lang="ts">
  import { mark, word } from '../words.js';
  import ChartFrame from './ChartFrame.svelte';
  import { formatNumber } from './format.js';
  import {
    axis,
    centred,
    chartColor,
    chartDash,
    chartMarker,
    markerPath,
    markerReach,
    position,
    sieve,
    thin,
    ticksOf,
    xyLayout,
    xyMinWidth,
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
  const LINE_WIDTH = 2.5;
  /* A round cap and join reach half the line's width past each point. */
  const CAP = { across: LINE_WIDTH / 2, above: LINE_WIDTH / 2, below: LINE_WIDTH / 2 };

  type Box = XYLayout & { marked: boolean[] };

  const finite = (point: ChartPoint) => Number.isFinite(point.x) && Number.isFinite(point.y);

  let validSeries = $derived(
    series.map((item, index) => ({
      ...item,
      color: chartColor(index),
      marker: chartMarker(index),
      dash: chartDash(index),
      points: item.points.filter(finite)
    }))
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

  const along = (value: number, domain: [number, number]) =>
    (value - domain[0]) / (domain[1] - domain[0]);

  /* A marker needs room to read as a shape, so a line denser than that is drawn as a line alone,
     and its dash still tells it apart. A scatter's markers are its data, so they always draw. */
  function marked(count: number, plotWidth: number): boolean {
    return kind === 'scatter' || count * MARKER.line * 2 <= plotWidth;
  }

  /** Each series' outermost points, with the reach of its marker or of its line's cap. */
  function outermost(markers: (index: number) => boolean): MarkReach[] {
    return validSeries.flatMap((item, index) => {
      if (item.points.length === 0) return [];
      const reach = markers(index) ? markerReach(item.marker, MARKER[kind]) : CAP;
      const pick = (first: (a: ChartPoint, b: ChartPoint) => boolean) =>
        item.points.reduce((best, point) => (first(point, best) ? point : best));
      return [
        pick((a, b) => a.x < b.x),
        pick((a, b) => a.x > b.x),
        pick((a, b) => a.y < b.y),
        pick((a, b) => a.y > b.y)
      ].map((point) => ({
        x: along(point.x, xAxis.domain),
        y: along(point.y, yAxis.domain),
        ...reach
      }));
    });
  }

  /**
   * The plot's box for the band's width, laid out to its ink. Whether a line keeps its markers
   * depends on the plot's width, and the markers reach further than the line, so the box is
   * laid out once with every marker and again if a line drops them.
   */
  function layout(frameWidth: number, scale: number, measure: Measure): Box {
    const input = {
      // The least width grows with the text, so larger text scrolls the chart sideways rather
      // than squeezing its points and ticks together.
      width: Math.max(Math.ceil(xyMinWidth * scale), frameWidth),
      scale,
      measure,
      xTicks: ticksOf(xAxis.ticks, xAxis.domain, formatX),
      yTicks: ticksOf(yAxis.ticks, yAxis.domain, formatY),
      xLabel,
      yLabel,
      names: ends.map((end) => ({
        x: along(end.point.x, xAxis.domain),
        y: along(end.point.y, yAxis.domain),
        text: end.label
      }))
    };
    const first = xyLayout({ ...input, marks: outermost(() => true) });
    const keeps = validSeries.map((item) => marked(item.points.length, first.right - first.left));
    if (keeps.every(Boolean)) return { ...first, marked: keeps };
    return { ...xyLayout({ ...input, marks: outermost((index) => keeps[index]) }), marked: keeps };
  }

  function x(value: number, box: Box): number {
    return position(value, xAxis.domain, box.left, box.right);
  }

  function y(value: number, box: Box): number {
    return position(value, yAxis.domain, box.bottom, box.top);
  }

  function path(seriesPoints: ChartPoint[], box: Box): string {
    return thin(seriesPoints, Math.round(box.right - box.left), xAxis.domain)
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(point.x, box)} ${y(point.y, box)}`)
      .join(' ');
  }

  /* A scatter keeps one mark per half-marker square: the ones it drops would lie under it, and
     every value stays in the table. */
  // ponytail: the box is laid out to every point, so a dropped outermost point leaves its edge
  // up to half a marker short; lay out to the kept marks if that ever shows.
  function drawn(seriesPoints: ChartPoint[], box: Box): ChartPoint[] {
    if (kind !== 'scatter') return seriesPoints;
    return sieve(seriesPoints, (point) => [x(point.x, box), y(point.y, box)], MARKER.scatter / 2);
  }
</script>

<ChartFrame
  {...frame}
  {title}
  {description}
  empty={points.length === 0}
  {missing}
  plotSize={(scale, measure) => layout(xyMinWidth, scale, measure).height}
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
      {#each yAxis.ticks as tick (tick)}
        {@const words = formatY(tick)}
        <line x1={box.left} x2={box.right} y1={y(tick, box)} y2={y(tick, box)} class="grid" />
        <text
          x={box.tickEnd}
          y={centred(measure(words), y(tick, box))}
          class="axis"
          text-anchor="end">{words}</text
        >
      {/each}
      {#each xAxis.ticks as tick (tick)}
        <text x={x(tick, box)} y={box.xTickBaseline} class="axis" text-anchor="middle"
          >{formatX(tick)}</text
        >
      {/each}
      {#if xLabel}
        <text
          x={(box.left + box.right) / 2}
          y={box.xTitleBaseline}
          class="label"
          text-anchor="middle">{xLabel}</text
        >
      {/if}
      {#if yLabel}
        <text
          transform="translate({box.yTitle.x} {box.yTitle.y}) rotate(-90)"
          class="label"
          text-anchor="middle">{yLabel}</text
        >
      {/if}
      {#each validSeries as item, index (item.id)}
        {#if kind === 'line' && item.points.length > 1}
          <path
            d={path(item.points, box)}
            fill="none"
            stroke={item.color}
            stroke-dasharray={item.dash}
            stroke-width={LINE_WIDTH}
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        {/if}
        {#if box.marked[index]}
          {#each drawn(item.points, box) as point, pointIndex (pointIndex)}
            <path
              d={markerPath(item.marker, x(point.x, box), y(point.y, box), MARKER[kind])}
              fill={item.color}
              class="marker"
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
        <text x={x(end.point.x, box) + box.nameGap} y={box.names[index]} class="name"
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
  .grid {
    stroke: var(--sui-chart-grid);
    stroke-width: 1;
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
