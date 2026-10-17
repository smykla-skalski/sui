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
  let empty = $derived(!rows.some((row) => columns.some((column) => value(row, column) !== null)));
  let width = $derived(left + columns.length * cellSize + 12);
  let height = $derived(top + rows.length * cellSize + 12);

  function value(row: string, column: string): number | null {
    const cellValue = lookup.get(`${row}\u0000${column}`);
    return cellValue !== null && cellValue !== undefined && Number.isFinite(cellValue)
      ? cellValue
      : null;
  }

  function color(value: number | null): string {
    if (value === null || !Number.isFinite(value)) return 'var(--sui-surface-inset)';
    const fraction = (value - domain[0]) / (domain[1] - domain[0]);
    return `color-mix(in srgb, var(--sui-chart-1) ${Math.round(20 + fraction * 80)}%, var(--sui-surface-base))`;
  }
</script>

<!--
@component
A matrix of numbers, where a stronger color means a higher value and a missing value
stays neutral. Color is never the only carrier: every cell has its value in its tooltip and in
the table under the chart. Cells keep their size, so the matrix is as wide as its columns and
scrolls sideways in a narrower container.
-->

<ChartFrame {title} {description} {empty}>
  {#snippet plot()}
    <svg
      {width}
      {height}
      viewBox="0 0 {width} {height}"
      role="img"
      aria-label="{title}. {description}"
    >
      {#each columns as column, columnIndex (columnIndex)}
        <text
          x={left + columnIndex * cellSize + cellSize / 2}
          y={top - 12}
          class="axis"
          text-anchor="middle">{column.length > 7 ? `${column.slice(0, 6)}…` : column}</text
        >
      {/each}
      {#each rows as row, rowIndex (rowIndex)}
        <text
          x={left - 10}
          y={top + rowIndex * cellSize + cellSize / 2 + 4}
          class="axis"
          text-anchor="end">{row.length > 18 ? `${row.slice(0, 17)}…` : row}</text
        >
        {#each columns as column, columnIndex (columnIndex)}
          {@const cellValue = value(row, column)}
          <rect
            x={left + columnIndex * cellSize + 2}
            y={top + rowIndex * cellSize + 2}
            width={cellSize - 4}
            height={cellSize - 4}
            rx="5"
            fill={color(cellValue)}
          >
            <title>{row}, {column}: {cellValue === null ? 'No data' : formatValue(cellValue)}</title
            >
          </rect>
        {/each}
      {/each}
    </svg>
  {/snippet}
  <p class="scale">Stronger color shows higher values. Missing values are neutral.</p>
  {#snippet table()}
    <table>
      <thead
        ><tr
          ><th scope="col">Row</th>{#each columns as column, columnIndex (columnIndex)}<th
              scope="col">{column}</th
            >{/each}</tr
        ></thead
      >
      <tbody>
        {#each rows as row, rowIndex (rowIndex)}
          <tr
            ><th scope="row">{row}</th
            >{#each columns as column, columnIndex (columnIndex)}{@const cellValue = value(
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
  svg {
    display: block;
  }
  .axis {
    fill: var(--sui-text-muted);
    font: 400 var(--sui-font-size-compact) / var(--sui-leading-flat) var(--sui-sans);
  }
  .scale {
    margin: 0;
    color: var(--sui-text-muted);
    font: 400 var(--sui-font-size-compact) / var(--sui-leading-compact) var(--sui-sans);
  }
</style>
