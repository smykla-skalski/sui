<script lang="ts">
  import { word } from '../words.js';
  import ChartFrame from './ChartFrame.svelte';
  import { formatNumber } from './format.js';
  import {
    axis,
    chartColor,
    chartDash,
    chartMarker,
    markerPath,
    position,
    spread,
    sieve,
    thin,
    xyPlot
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
  const LABEL_GAP = 16;
  // ponytail: an average glyph width at the compact size reserves the room for the line names;
  // measure the rendered text if a face with much wider glyphs ever replaces this one.
  const LABEL_CHAR = 7.5;

  type Frame = {
    width: number;
    height: number;
    left: number;
    right: number;
    top: number;
    bottom: number;
  };

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

  /** The plot's box for a frame width, with the margins that hold text grown by the reader's text scale. */
  function layout(frameWidth: number, scale: number): Frame {
    const names = ends.map((end) => (end.label.length * LABEL_CHAR + 2 * LABEL_GAP) * scale);
    const top = xyPlot.top * scale;
    const bottom = xyPlot.bottom * scale;
    const left = xyPlot.left * scale;
    const right = Math.max(xyPlot.right, ...names);
    // The least width grows with the text, as the margins do, so larger text scrolls the chart
    // sideways rather than squeezing its points and ticks together.
    return {
      width: Math.max(xyPlot.minWidth * scale, frameWidth),
      height: Math.round(top + bottom + xyPlot.height - xyPlot.top - xyPlot.bottom),
      left,
      right,
      top,
      bottom
    };
  }

  function x(value: number, box: Frame): number {
    return position(value, xAxis.domain, box.left, box.width - box.right);
  }

  function y(value: number, box: Frame): number {
    return position(value, yAxis.domain, box.height - box.bottom, box.top);
  }

  function path(seriesPoints: ChartPoint[], box: Frame): string {
    return thin(seriesPoints, Math.round(box.width - box.right - box.left), xAxis.domain)
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(point.x, box)} ${y(point.y, box)}`)
      .join(' ');
  }

  /* A marker needs room to read as a shape, so a line denser than that is drawn as a line alone,
     and its dash still tells it apart. A scatter's markers are its data, so they always draw. */
  function marked(count: number, box: Frame): boolean {
    return kind === 'scatter' || count * MARKER.line * 2 <= box.width - box.right - box.left;
  }

  /* A scatter keeps one mark per half-marker square: the ones it drops would lie under it, and
     every value stays in the table. */
  function drawn(seriesPoints: ChartPoint[], box: Frame): ChartPoint[] {
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
  plotHeight={xyPlot.height}
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
      {#each yAxis.ticks as tick (tick)}
        <line
          x1={box.left}
          x2={box.width - box.right}
          y1={y(tick, box)}
          y2={y(tick, box)}
          class="grid"
        />
        <text x={box.left - 8 * scale} y={y(tick, box) + 4 * scale} class="axis" text-anchor="end"
          >{formatY(tick)}</text
        >
      {/each}
      {#each xAxis.ticks as tick (tick)}
        <text x={x(tick, box)} y={box.height - 22 * scale} class="axis" text-anchor="middle"
          >{formatX(tick)}</text
        >
      {/each}
      <text
        x={(box.left + box.width - box.right) / 2}
        y={box.height - 2 * scale}
        class="label"
        text-anchor="middle">{xLabel}</text
      >
      <text
        transform="translate({14 * scale} {(box.top + box.height - box.bottom) / 2}) rotate(-90)"
        class="label"
        text-anchor="middle">{yLabel}</text
      >
      {#each validSeries as item (item.id)}
        {#if kind === 'line' && item.points.length > 1}
          <path
            d={path(item.points, box)}
            fill="none"
            stroke={item.color}
            stroke-dasharray={item.dash}
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        {/if}
        {#if marked(item.points.length, box)}
          {#each drawn(item.points, box) as point, pointIndex (pointIndex)}
            <path
              d={markerPath(item.marker, x(point.x, box), y(point.y, box), MARKER[kind])}
              fill={item.color}
              class="marker"
            >
              <title>{item.label}: {formatX(point.x)}, {formatY(point.y)}</title>
            </path>
          {/each}
        {/if}
      {/each}
      {#if ends.length > 0}
        {@const placed = spread(
          ends.map((end) => y(end.point.y, box)),
          LABEL_GAP * scale,
          box.top,
          box.height - box.bottom
        )}
        {#each ends as end, index (end.id)}
          <text
            x={x(end.point.x, box) + (LABEL_GAP / 2 + MARKER.line / 2) * scale}
            y={placed[index]}
            class="name"
            dominant-baseline="central">{end.label}</text
          >
        {/each}
      {/if}
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
              stroke-width="2.5"
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
    font: var(--sui-weight-regular) var(--sui-font-size-compact) / var(--sui-leading-flat)
      var(--sui-sans);
  }
  .label {
    font-weight: var(--sui-weight-semibold);
  }
  .name {
    fill: var(--sui-text-secondary);
    font: var(--sui-weight-semibold) var(--sui-font-size-compact) / var(--sui-leading-flat)
      var(--sui-sans);
  }
  /* A ring of the surface keeps a marker whole where it crosses another series' line. */
  .marker {
    stroke: var(--sui-surface-base);
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
</style>
