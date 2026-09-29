<script lang="ts">
  import ChartFrame from './ChartFrame.svelte';
  import { chartColor, extent, plot, position, ticks } from './geometry.js';
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
  let xDomain = $derived(extent(points.map((point) => point.x)));
  let yDomain = $derived(
    extent(
      points.map((point) => point.y),
      true
    )
  );
  let xTicks = $derived(ticks(xDomain));
  let yTicks = $derived(ticks(yDomain));

  function x(value: number): number {
    return position(value, xDomain, plot.left, plot.width - plot.right);
  }

  function y(value: number): number {
    return position(value, yDomain, plot.height - plot.bottom, plot.top);
  }

  function path(seriesPoints: ChartPoint[]): string {
    return seriesPoints
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(point.x)} ${y(point.y)}`)
      .join(' ');
  }
</script>

<ChartFrame {title} {description}>
  {#if points.length === 0}
    <p class="sui-chart-empty">No chart data yet.</p>
  {:else}
    <div class="plot-scroll">
      <svg viewBox="0 0 {plot.width} {plot.height}" role="img" aria-label="{title}. {description}">
        {#each yTicks as tick}
          <line
            x1={plot.left}
            x2={plot.width - plot.right}
            y1={y(tick)}
            y2={y(tick)}
            class="grid"
          />
          <text x={plot.left - 8} y={y(tick) + 4} class="axis" text-anchor="end"
            >{formatY(tick)}</text
          >
        {/each}
        {#each xTicks as tick}
          <text x={x(tick)} y={plot.height - 22} class="axis" text-anchor="middle"
            >{formatX(tick)}</text
          >
        {/each}
        <text
          x={(plot.left + plot.width - plot.right) / 2}
          y={plot.height - 2}
          class="label"
          text-anchor="middle">{xLabel}</text
        >
        <text
          transform="translate(14 {(plot.top + plot.height - plot.bottom) / 2}) rotate(-90)"
          class="label"
          text-anchor="middle">{yLabel}</text
        >
        {#each validSeries as item, index (item.id)}
          {#if kind === 'line' && item.points.length > 1}
            <path
              d={path(item.points)}
              fill="none"
              stroke={item.color ?? chartColor(index)}
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          {/if}
          {#each item.points as point}
            <circle
              cx={x(point.x)}
              cy={y(point.y)}
              r={kind === 'scatter' ? 5 : 3.5}
              fill={item.color ?? chartColor(index)}
            >
              <title>{item.label}: {formatX(point.x)}, {formatY(point.y)}</title>
            </circle>
          {/each}
        {/each}
      </svg>
    </div>
    <ul class="legend">
      {#each validSeries as item, index (item.id)}
        <li>
          <span class="swatch" style:background={item.color ?? chartColor(index)}
          ></span>{item.label}
        </li>
      {/each}
    </ul>
  {/if}
  {#snippet table()}
    <table>
      <thead
        ><tr
          ><th scope="col">Series</th><th scope="col">{xLabel}</th><th scope="col">{yLabel}</th></tr
        ></thead
      >
      <tbody>
        {#each validSeries as item (item.id)}
          {#each item.points as point}
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
  .plot-scroll {
    overflow-x: auto;
  }
  svg {
    display: block;
    width: 100%;
    min-width: 640px;
    height: auto;
    overflow: visible;
  }
  .grid {
    stroke: var(--sui-border, #c4cec9);
    stroke-width: 1;
  }
  .axis,
  .label {
    fill: var(--sui-muted, #4c5b57);
    font: 12px var(--sui-font, system-ui, sans-serif);
  }
  .label {
    font-weight: 600;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 0.8125rem;
  }
  .legend li {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
  }
  .swatch {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 50%;
  }
  .sui-chart-empty {
    margin: 0;
    padding: 2rem;
    background: var(--sui-subtle, #f0f3f2);
    text-align: center;
  }
</style>
