<script lang="ts">
  import ChartFrame from './ChartFrame.svelte';
  import { axis, chartColor, position, xyPlot } from './geometry.js';
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

  let validSeries = $derived(
    series.map((item) => ({
      ...item,
      points: item.points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    }))
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
    return position(value, xAxis.domain, xyPlot.left, width - xyPlot.right);
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
        <line x1={xyPlot.left} x2={width - xyPlot.right} y1={y(tick)} y2={y(tick)} class="grid" />
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
        x={(xyPlot.left + width - xyPlot.right) / 2}
        y={xyPlot.height - 2}
        class="label"
        text-anchor="middle">{xLabel}</text
      >
      <text
        transform="translate(14 {(xyPlot.top + xyPlot.height - xyPlot.bottom) / 2}) rotate(-90)"
        class="label"
        text-anchor="middle">{yLabel}</text
      >
      {#each validSeries as item, index (item.id)}
        {#if kind === 'line' && item.points.length > 1}
          <path
            d={path(item.points, width)}
            fill="none"
            stroke={item.color ?? chartColor(index)}
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        {/if}
        {#each item.points as point, pointIndex (pointIndex)}
          <circle
            cx={x(point.x, width)}
            cy={y(point.y)}
            r={kind === 'scatter' ? 5 : 3.5}
            fill={item.color ?? chartColor(index)}
          >
            <title>{item.label}: {formatX(point.x)}, {formatY(point.y)}</title>
          </circle>
        {/each}
      {/each}
    </svg>
  {/snippet}
  <ul class="legend">
    {#each validSeries as item, index (item.id)}
      <li>
        <span class="swatch" style:background={item.color ?? chartColor(index)}></span>{item.label}
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
  .swatch {
    width: var(--sui-icon-xs);
    height: var(--sui-icon-xs);
    border-radius: 50%;
  }
</style>
