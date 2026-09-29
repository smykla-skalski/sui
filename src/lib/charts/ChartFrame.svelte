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
    display: grid;
    gap: 1rem;
    margin: 0;
    min-width: 0;
    color: var(--sui-foreground, #18211f);
    font-family: var(--sui-font, system-ui, sans-serif);
  }
  h3 {
    margin: 0;
    font-size: 1rem;
    line-height: 1.5;
  }
  p {
    margin: 0.25rem 0 0;
    color: var(--sui-muted, #4c5b57);
    font-size: 0.875rem;
    line-height: 1.5;
  }
  summary {
    width: fit-content;
    color: var(--sui-primary, #0f766e);
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
  }
  summary:focus-visible {
    outline: 2px solid var(--sui-focus, #0f766e);
    outline-offset: 2px;
  }
  .sui-chart-table {
    max-width: 100%;
    overflow-x: auto;
    margin-top: 0.75rem;
  }
  .sui-chart-table :global(table) {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8125rem;
    text-align: left;
  }
  .sui-chart-table :global(th),
  .sui-chart-table :global(td) {
    padding: 0.5rem;
    border-bottom: 1px solid var(--sui-border, #c4cec9);
  }
</style>
