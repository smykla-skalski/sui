<script lang="ts">
  import ChartFrame from './ChartFrame.svelte';
  import { extent, position, ticks } from './geometry.js';
  import type { RangeDatum } from './types.js';

  let {
    title,
    description,
    data,
    valueLabel = 'Value',
    formatValue = (value) => String(Number(value.toFixed(2)))
  }: {
    title: string;
    description: string;
    data: RangeDatum[];
    valueLabel?: string;
    formatValue?: (value: number) => string;
  } = $props();

  const left = 140;
  const right = 20;
  const width = 700;
  const rowHeight = 42;
  const top = 32;

  let validData = $derived(
    data.filter(
      (item) =>
        Number.isFinite(item.start) &&
        Number.isFinite(item.end) &&
        (item.marker === undefined || Number.isFinite(item.marker))
    )
  );
  let domain = $derived(
    extent(
      validData.flatMap((item) => [
        item.start,
        item.end,
        ...(item.marker === undefined ? [] : [item.marker])
      ])
    )
  );
  let height = $derived(top + validData.length * rowHeight + 36);
  let axisTicks = $derived(ticks(domain));

  function x(value: number): number {
    return position(value, domain, left, width - right);
  }
</script>

<ChartFrame {title} {description}>
  {#if validData.length === 0}
    <p class="sui-chart-empty">No chart data yet.</p>
  {:else}
    <div class="plot-scroll">
      <svg viewBox="0 0 {width} {height}" role="img" aria-label="{title}. {description}">
        {#each axisTicks as tick}
          <line x1={x(tick)} x2={x(tick)} y1={top - 12} y2={height - 30} class="grid" />
          <text x={x(tick)} y={height - 13} class="axis" text-anchor="middle"
            >{formatValue(tick)}</text
          >
        {/each}
        {#each validData as item, index}
          {@const rowY = top + index * rowHeight + rowHeight / 2}
          <text x={left - 12} y={rowY + 4} class="axis" text-anchor="end"
            >{item.label.length > 18 ? `${item.label.slice(0, 17)}…` : item.label}</text
          >
          <line x1={x(item.start)} x2={x(item.end)} y1={rowY} y2={rowY} class="range" />
          <circle cx={x(item.start)} cy={rowY} r="5" class="endpoint"
            ><title>{item.label} start: {formatValue(item.start)}</title></circle
          >
          <circle cx={x(item.end)} cy={rowY} r="5" class="endpoint"
            ><title>{item.label} end: {formatValue(item.end)}</title></circle
          >
          {#if item.marker !== undefined}
            <circle cx={x(item.marker)} cy={rowY} r="5" class="marker"
              ><title>{item.label} marker: {formatValue(item.marker)}</title></circle
            >
          {/if}
        {/each}
        <text x={(left + width - right) / 2} y={height - 1} class="axis label" text-anchor="middle"
          >{valueLabel}</text
        >
      </svg>
    </div>
  {/if}
  {#snippet table()}
    <table>
      <thead
        ><tr
          ><th scope="col">Label</th><th scope="col">Start</th><th scope="col">End</th><th
            scope="col">Marker</th
          ></tr
        ></thead
      >
      <tbody>
        {#each validData as item}
          <tr
            ><th scope="row">{item.label}</th><td>{formatValue(item.start)}</td><td
              >{formatValue(item.end)}</td
            ><td>{item.marker === undefined ? '—' : formatValue(item.marker)}</td></tr
          >
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
    min-width: 700px;
    height: auto;
  }
  .grid {
    stroke: var(--sui-border, #c4cec9);
    stroke-width: 1;
  }
  .axis {
    fill: var(--sui-muted, #4c5b57);
    font: 12px var(--sui-font, system-ui, sans-serif);
  }
  .label {
    font-weight: 600;
  }
  .range {
    stroke: var(--sui-chart-1, #0f766e);
    stroke-width: 4;
    stroke-linecap: round;
  }
  .endpoint {
    fill: var(--sui-chart-1, #0f766e);
  }
  .marker {
    fill: var(--sui-chart-4, #a33a45);
    stroke: var(--sui-surface, #fff);
    stroke-width: 2;
  }
  .sui-chart-empty {
    margin: 0;
    padding: 2rem;
    background: var(--sui-subtle, #f0f3f2);
    text-align: center;
  }
</style>
