<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    title,
    description,
    children,
    table
  }: {
    title: string;
    description: string;
    children: Snippet;
    table: Snippet;
  } = $props();
</script>

<figure class="sui-chart">
  <figcaption>
    <h3>{title}</h3>
    <p>{description}</p>
  </figcaption>
  {@render children()}
  <details>
    <summary>View chart data</summary>
    <div class="sui-chart-table">{@render table()}</div>
  </details>
</figure>

<style>
  .sui-chart {
    color: var(--sui-text-primary);
    display: grid;
    gap: var(--sui-space-4);
    margin: 0;
    min-inline-size: 0;
  }

  figcaption {
    display: grid;
    gap: var(--sui-row-copy-gap);
  }

  h3 {
    font: 600 var(--sui-font-size-title) / var(--sui-leading-title) var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
  }

  p {
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
  }

  summary {
    align-items: center;
    border-radius: var(--sui-radius-control);
    color: var(--sui-brand-action-text);
    cursor: pointer;
    display: inline-flex;
    font: 600 var(--sui-font-size-control) / var(--sui-leading-compact) var(--sui-sans);
    inline-size: fit-content;
    min-block-size: var(--sui-control-height-chip);
  }

  summary:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-offset);
  }

  .sui-chart-table {
    margin-block-start: var(--sui-space-3);
    max-inline-size: 100%;
    overflow-x: auto;
  }

  .sui-chart-table:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-inset);
  }

  .sui-chart-table :global(table) {
    border-collapse: collapse;
    font: 400 var(--sui-font-size-meta) / var(--sui-leading-meta) var(--sui-sans);
    inline-size: 100%;
    text-align: start;
  }

  .sui-chart-table :global(:is(th, td)) {
    border-block-end: 1px solid var(--sui-chart-grid);
    padding: var(--sui-space-2);
  }

  .sui-chart-table :global(td) {
    font-variant-numeric: tabular-nums;
  }
</style>
