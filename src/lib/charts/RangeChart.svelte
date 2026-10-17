<script lang="ts">
  import ChartFrame from './ChartFrame.svelte';
  import { axis, position } from './geometry.js';
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
  const minWidth = 320;
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
  let valueAxis = $derived(
    axis(
      validData.flatMap((item) => [
        item.start,
        item.end,
        ...(item.marker === undefined ? [] : [item.marker])
      ])
    )
  );
  let height = $derived(top + validData.length * rowHeight + 36);

  function x(value: number, width: number): number {
    return position(value, valueAxis.domain, left, width - right);
  }
</script>

<!--
@component
Labelled intervals on one numeric axis, each with an optional marker inside it, such as a
planned window and the moment work actually started. Long labels are cut with an ellipsis on
the axis and stay whole in the table under the chart. The plot fills the width of its container
with text at its token size, and scrolls sideways below 320px.
-->

<ChartFrame {title} {description} empty={validData.length === 0}>
  {#snippet plot(frameWidth: number)}
    {@const width = Math.max(minWidth, frameWidth)}
    <svg
      {width}
      {height}
      viewBox="0 0 {width} {height}"
      role="img"
      aria-label="{title}. {description}"
    >
      {#each valueAxis.ticks as tick (tick)}
        <line x1={x(tick, width)} x2={x(tick, width)} y1={top - 12} y2={height - 30} class="grid" />
        <text x={x(tick, width)} y={height - 13} class="axis" text-anchor="middle"
          >{formatValue(tick)}</text
        >
      {/each}
      {#each validData as item, index (index)}
        {@const rowY = top + index * rowHeight + rowHeight / 2}
        <text x={left - 12} y={rowY + 4} class="axis" text-anchor="end"
          >{item.label.length > 18 ? `${item.label.slice(0, 17)}…` : item.label}</text
        >
        <line x1={x(item.start, width)} x2={x(item.end, width)} y1={rowY} y2={rowY} class="range" />
        <circle cx={x(item.start, width)} cy={rowY} r="5" class="endpoint"
          ><title>{item.label} start: {formatValue(item.start)}</title></circle
        >
        <circle cx={x(item.end, width)} cy={rowY} r="5" class="endpoint"
          ><title>{item.label} end: {formatValue(item.end)}</title></circle
        >
        {#if item.marker !== undefined}
          <circle cx={x(item.marker, width)} cy={rowY} r="5" class="marker"
            ><title>{item.label} marker: {formatValue(item.marker)}</title></circle
          >
        {/if}
      {/each}
      <text x={(left + width - right) / 2} y={height - 1} class="axis label" text-anchor="middle"
        >{valueLabel}</text
      >
    </svg>
  {/snippet}
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
        {#each validData as item, index (index)}
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
  svg {
    display: block;
  }
  .grid {
    stroke: var(--sui-chart-grid);
    stroke-width: 1;
  }
  .axis {
    fill: var(--sui-text-muted);
    font: 400 var(--sui-font-size-compact) / var(--sui-leading-flat) var(--sui-sans);
  }
  .label {
    font-weight: 600;
  }
  .range {
    stroke: var(--sui-chart-1);
    stroke-width: 4;
    stroke-linecap: round;
  }
  .endpoint {
    fill: var(--sui-chart-1);
  }
  /* Neutral ink, so the marker is never read as a second series. */
  .marker {
    fill: var(--sui-text-primary);
    stroke: var(--sui-surface-base);
    stroke-width: 2;
  }
</style>
