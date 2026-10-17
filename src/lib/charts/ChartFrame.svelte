<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    title,
    description,
    empty,
    plot,
    children,
    table
  }: {
    title: string;
    description: string;
    /** With no values to show, an empty state takes the place of the plot and its table. */
    empty: boolean;
    /** Draws the plot for the frame's width in CSS pixels, one user unit to a pixel. */
    plot: Snippet<[width: number]>;
    /** Notes under the plot, such as a legend. */
    children?: Snippet;
    table: Snippet;
  } = $props();

  let frame = $state<DOMRectReadOnly | null>(null);
  // A server render has nothing to measure, so it lays the plot out at a desktop width.
  let width = $derived(Math.floor(frame?.width ?? 640));
</script>

<figure class="sui-chart">
  <figcaption>
    <h3>{title}</h3>
    <p>{description}</p>
  </figcaption>
  {#if empty}
    <p class="sui-chart-empty">No chart data yet</p>
  {:else}
    <div class="plot-scroll" bind:contentRect={frame}>{@render plot(width)}</div>
    {@render children?.()}
    <details>
      <summary>View chart data</summary>
      <div class="sui-chart-table">{@render table()}</div>
    </details>
  {/if}
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

  figcaption p {
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
  }

  /* Inline-size containment keeps the drawn width out of the frame's own sizing, so a measured
     plot never holds its container open. */
  .plot-scroll {
    border-radius: var(--sui-radius-control);
    contain: inline-size;
    overflow-x: auto;
  }

  .plot-scroll:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-inset);
  }

  .sui-chart-empty {
    margin: 0;
    padding: var(--sui-space-8);
    border-radius: var(--sui-radius-control);
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-meta) / var(--sui-leading-meta) var(--sui-sans);
    background: var(--sui-surface-inset);
    text-align: center;
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

  /* A finger needs a 44px target, so the hit area grows past the drawn box (L-38). */
  @media (pointer: coarse), (max-width: 47.9375rem) {
    summary {
      position: relative;
    }

    summary::after {
      content: '';
      inset: calc((100% - var(--sui-touch-target)) / 2);
      position: absolute;
    }
  }
</style>
