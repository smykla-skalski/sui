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
    <!-- Both lines always take their room, so captions side by side start on one line. -->
    <figcaption>
      {#if label}<span class="label">{label}</span>{:else}<span class="label" aria-hidden="true"
          >&nbsp;</span
        >{/if}
      {#if code}<code>{code}</code>{:else}<code aria-hidden="true">&nbsp;</code>{/if}
    </figcaption>
  {/if}
</figure>

<style>
  /* The body is a grid as wide as the specimen: a block surface or a field fills it, while
     a mark keeps its own fit-content width (L-43). Specimens on one line share the tallest
     one's height, and the body takes the spare room, so their captions line up at the bottom. */
  .specimen {
    display: grid;
    gap: var(--sui-space-3);
    grid-template-rows: 1fr auto;
    margin: 0;
    min-inline-size: 0;
  }

  /* One shrinkable column: a surface capped at 100% stays inside a narrow stage. */
  .body {
    align-content: start;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    min-inline-size: 0;
  }

  /* A dashed rule parts what is shown from what names it. */
  figcaption {
    border-block-start: var(--sui-stroke) dashed var(--sui-border-control);
    display: grid;
    gap: var(--sui-row-copy-gap);
    justify-items: start;
    padding-block-start: var(--sui-space-3);
  }

  .label {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-medium) var(--sui-font-size-compact) / var(--sui-leading-compact)
      var(--sui-sans);
    text-box: trim-both cap alphabetic;
  }

  code {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-muted);
    font: var(--sui-weight-regular) var(--sui-font-size-micro) / var(--sui-leading-micro)
      var(--sui-mono);
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }
</style>
