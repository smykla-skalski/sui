<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    label,
    code,
    children
  }: {
    /** The state or variant in words, such as "Disabled". */
    label?: string;
    /** The props that draw it, such as `tone="signal"`. */
    code?: string;
    children: Snippet;
  } = $props();
</script>

<figure class="specimen">
  <div class="body">{@render children()}</div>
  {#if label || code}
    <figcaption>
      {#if label}<span class="label">{label}</span>{/if}
      {#if code}<code>{code}</code>{/if}
    </figcaption>
  {/if}
</figure>

<style>
  /* The body is a grid as wide as the specimen: a block surface or a field fills it, while
     a mark keeps its own fit-content width (L-43). */
  .specimen {
    display: grid;
    gap: var(--sui-space-3);
    margin: 0;
    min-inline-size: 0;
  }

  /* One shrinkable column: a surface capped at 100% stays inside a narrow stage. */
  .body {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    min-inline-size: 0;
  }

  figcaption {
    display: grid;
    gap: var(--sui-row-copy-gap);
    justify-self: start;
  }

  .label {
    color: var(--sui-text-secondary);
    font: 500 var(--sui-font-size-compact) / var(--sui-leading-compact) var(--sui-sans);
    text-box: trim-both cap alphabetic;
  }

  code {
    color: var(--sui-text-muted);
    font: 400 var(--sui-font-size-micro) / var(--sui-leading-micro) var(--sui-mono);
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }
</style>
