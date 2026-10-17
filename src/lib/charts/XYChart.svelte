<script lang="ts">
  import ChartFrame from './ChartFrame.svelte';
  import {
    axis,
    chartColor,
    chartDash,
    chartMarker,
    markerPath,
    position,
    spread,
    xyPlot
  } from './geometry.js';
  import type { ChartPoint, XYChartProps } from './types.js';

  type Props = XYChartProps & { kind: 'line' | 'scatter' };

  let {
    kind,
    title,
    description,
    series,
    xLabel = 'X',
    yLabel = 'Y',
    formatX = (value) => String(Number(value.toFixed(2))),
    formatY = (value) => String(Number(value.toFixed(2)))
  }: Props = $props();

  /* At least 8px across, and a little larger where there is no line to follow. */
  const MARKER = { line: 8, scatter: 10 };
  /* Past four lines, names at the line ends crowd each other, so the legend carries them alone. */
  const MOST_LABELLED = 4;
  const LABEL_GAP = 16;
  // ponytail: an average glyph width at the compact size reserves the room for the line names;
  // measure the rendered text if a face with much wider glyphs ever replaces this one.
  const LABEL_CHAR = 7.5;

  let validSeries = $derived(
    series.map((item, index) => ({
      ...item,
      color: item.color ?? chartColor(index),
      marker: chartMarker(index),
      dash: chartDash(index),
      points: item.points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    }))
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
  let right = $derived(
    ends.length === 0
      ? xyPlot.right
      : Math.max(xyPlot.right, ...ends.map((end) => end.label.length * LABEL_CHAR + 2 * LABEL_GAP))
  );
  let points = $derived(validSeries.flatMap((item) => item.points));
  let xAxis = $derived(axis(points.map((point) => point.x)));
  let yAxis = $derived(
    axis(
      points.map((point) => point.y),
      true
    )
  );

  function x(value: number, width: number): number {
    return position(value, xAxis.domain, xyPlot.left, width - right);
  }

  function y(value: number): number {
    return position(value, yAxis.domain, xyPlot.height - xyPlot.bottom, xyPlot.top);
  }

  function path(seriesPoints: ChartPoint[], width: number): string {
    return seriesPoints
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(point.x, width)} ${y(point.y)}`)
      .join(' ');
  }
</script>

<ChartFrame {title} {description} empty={points.length === 0}>
  {#snippet plot(frameWidth: number)}
    {@const width = Math.max(xyPlot.minWidth, frameWidth)}
    <svg
      {width}
      height={xyPlot.height}
      viewBox="0 0 {width} {xyPlot.height}"
      role="img"
      aria-label="{title}. {description}"
    >
      {#each yAxis.ticks as tick (tick)}
        <line x1={xyPlot.left} x2={width - right} y1={y(tick)} y2={y(tick)} class="grid" />
        <text x={xyPlot.left - 8} y={y(tick) + 4} class="axis" text-anchor="end"
          >{formatY(tick)}</text
        >
      {/each}
      {#each xAxis.ticks as tick (tick)}
        <text x={x(tick, width)} y={xyPlot.height - 22} class="axis" text-anchor="middle"
          >{formatX(tick)}</text
        >
      {/each}
      <text
        x={(xyPlot.left + width - right) / 2}
        y={xyPlot.height - 2}
        class="label"
        text-anchor="middle">{xLabel}</text
      >
      <text
        transform="translate(14 {(xyPlot.top + xyPlot.height - xyPlot.bottom) / 2}) rotate(-90)"
        class="label"
        text-anchor="middle">{yLabel}</text
      >
      {#each validSeries as item (item.id)}
        {#if kind === 'line' && item.points.length > 1}
          <path
            d={path(item.points, width)}
            fill="none"
            stroke={item.color}
            stroke-dasharray={item.dash}
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        {/if}
        {#each item.points as point, pointIndex (pointIndex)}
          <path
            d={markerPath(item.marker, x(point.x, width), y(point.y), MARKER[kind])}
            fill={item.color}
            class="marker"
          >
            <title>{item.label}: {formatX(point.x)}, {formatY(point.y)}</title>
          </path>
        {/each}
      {/each}
      {#if ends.length > 0}
        {@const placed = spread(
          ends.map((end) => y(end.point.y)),
          LABEL_GAP,
          xyPlot.top,
          xyPlot.height - xyPlot.bottom
        )}
        {#each ends as end, index (end.id)}
          <text
            x={x(end.point.x, width) + LABEL_GAP / 2 + MARKER.line / 2}
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
      <thead
        ><tr
          ><th scope="col">Series</th><th scope="col">{xLabel}</th><th scope="col">{yLabel}</th></tr
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
    font: 400 var(--sui-font-size-compact) / var(--sui-leading-flat) var(--sui-sans);
  }
  .label {
    font-weight: 600;
  }
  .name {
    fill: var(--sui-text-secondary);
    font: 600 var(--sui-font-size-compact) / var(--sui-leading-flat) var(--sui-sans);
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
    font: 400 var(--sui-font-size-meta) / var(--sui-leading-meta) var(--sui-sans);
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
