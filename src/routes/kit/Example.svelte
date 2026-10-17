<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    title,
    note,
    layout = 'row',
    children
  }: {
    title: string;
    /** One period-free sentence saying what this example proves. */
    note?: string;
    /** `row` wraps specimens side by side, `stack` puts each on its own line. */
    layout?: 'row' | 'stack';
    children: Snippet;
  } = $props();
</script>

<div class="example">
  <div class="head">
    <h3>{title}</h3>
    {#if note}<p>{note}</p>{/if}
  </div>
  <div class="specimens" data-layout={layout}>{@render children()}</div>
</div>

<style>
  .example {
    display: grid;
    gap: var(--sui-space-4);
    min-inline-size: 0;
  }

  .head {
    display: grid;
    gap: var(--sui-row-copy-gap);
  }

  h3 {
    color: var(--sui-text-primary);
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

  .specimens {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-3);
    min-inline-size: 0;
  }

  /* A wrapping column sizes each line to its widest item, so a stack must not wrap. */
  .specimens[data-layout='stack'] {
    align-items: stretch;
    flex-direction: column;
    flex-wrap: nowrap;
  }
</style>
