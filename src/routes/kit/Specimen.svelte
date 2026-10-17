<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    label,
    children
  }: {
    /** The prop value this specimen shows, such as `tone="signal"`. */
    label: string;
    children: Snippet;
  } = $props();
</script>

<figure class="specimen">
  <div class="body">{@render children()}</div>
  <figcaption>{label}</figcaption>
</figure>

<style>
  .specimen {
    display: grid;
    gap: var(--sui-space-2);
    justify-items: start;
    margin: 0;
    min-inline-size: 0;
  }

  .body {
    display: flex;
    max-inline-size: 100%;
  }

  figcaption {
    color: var(--sui-text-muted);
    font: 400 var(--sui-font-size-micro) / var(--sui-leading-micro) var(--sui-mono);
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }
</style>
