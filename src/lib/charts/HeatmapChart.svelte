<script lang="ts">
  import ChartFrame from './ChartFrame.svelte';
  import { extent } from './geometry.js';
  import type { HeatmapCell } from './types.js';

  let {
    title,
    description,
    rows,
    columns,
    cells,
    formatValue = (value) => String(Number(value.toFixed(2)))
  }: {
    title: string;
    description: string;
    rows: string[];
    columns: string[];
    cells: HeatmapCell[];
    formatValue?: (value: number) => string;
  } = $props();

  const cellSize = 52;
  const left = 140;
  const top = 54;

  let lookup = $derived(
    new Map(cells.map((cell) => [`${cell.row}\u0000${cell.column}`, cell.value]))
  );
  let domain = $derived(
    extent(rows.flatMap((row) => columns.map((column) => value(row, column) ?? NaN)))
  );
  let width = $derived(left + columns.length * cellSize + 12);
  let height = $derived(top + rows.length * cellSize + 12);

  function value(row: string, column: string): number | null {
    const cellValue = lookup.get(`${row}\u0000${column}`);
    return cellValue !== null && cellValue !== undefined && Number.isFinite(cellValue)
      ? cellValue
      : null;
  }

  function color(value: number | null): string {
    if (value === null || !Number.isFinite(value)) return 'var(--sui-subtle, #f0f3f2)';
    const fraction = (value - domain[0]) / (domain[1] - domain[0]);
    return `color-mix(in srgb, var(--sui-chart-1, #0f766e) ${Math.round(20 + fraction * 80)}%, var(--sui-surface, #fff))`;
  }
</script>

<ChartFrame {title} {description}>
  {#if rows.length === 0 || columns.length === 0}
    <p class="sui-chart-empty">No chart data yet.</p>
  {:else}
    <div class="plot-scroll">
      <svg
        viewBox="0 0 {width} {height}"
        role="img"
        aria-label="{title}. {description}"
        style:min-width={`${Math.max(width, 400)}px`}
      >
        {#each columns as column, columnIndex}
          <text
            x={left + columnIndex * cellSize + cellSize / 2}
            y={top - 12}
            class="axis"
            text-anchor="middle">{column.length > 7 ? `${column.slice(0, 6)}…` : column}</text
          >
        {/each}
        {#each rows as row, rowIndex}
          <text
            x={left - 10}
            y={top + rowIndex * cellSize + cellSize / 2 + 4}
            class="axis"
            text-anchor="end">{row.length > 18 ? `${row.slice(0, 17)}…` : row}</text
          >
          {#each columns as column, columnIndex}
            {@const cellValue = value(row, column)}
            <rect
              x={left + columnIndex * cellSize + 2}
              y={top + rowIndex * cellSize + 2}
              width={cellSize - 4}
              height={cellSize - 4}
              rx="5"
              fill={color(cellValue)}
            >
              <title
                >{row}, {column}: {cellValue === null ? 'No data' : formatValue(cellValue)}</title
              >
            </rect>
          {/each}
        {/each}
      </svg>
    </div>
    <p class="scale">Stronger color shows higher values. Missing values are neutral.</p>
  {/if}
  {#snippet table()}
    <table>
      <thead
        ><tr
          ><th scope="col">Row</th>{#each columns as column}<th scope="col">{column}</th>{/each}</tr
        ></thead
      >
      <tbody>
        {#each rows as row}
          <tr
            ><th scope="row">{row}</th>{#each columns as column}{@const cellValue = value(
                row,
                column
              )}<td>{cellValue === null ? '—' : formatValue(cellValue)}</td>{/each}</tr
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
    height: auto;
  }
  .axis {
    fill: var(--sui-muted, #4c5b57);
    font: 12px var(--sui-font, system-ui, sans-serif);
  }
  .scale {
    margin: 0;
    color: var(--sui-muted, #4c5b57);
    font-size: 0.75rem;
  }
  .sui-chart-empty {
    margin: 0;
    padding: 2rem;
    background: var(--sui-subtle, #f0f3f2);
    text-align: center;
  }
</style>
