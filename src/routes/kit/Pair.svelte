<script lang="ts">
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();
</script>

<!-- Two examples that each hold one specimen share a row on the cards' 54rem, so the page does
     not step down to a narrower frame under them; on a phone they stack (L-55). -->
<div class="pair">{@render children()}</div>

<style>
  .pair {
    align-items: start;
    display: grid;
    gap: var(--sui-space-6);
    grid-template-columns: repeat(2, minmax(0, 1fr));
    /* A frame's measure is its content box, inside its two strokes. */
    max-inline-size: calc(54rem + 2 * var(--sui-stroke));
  }

  /* Each example takes a head row and a frame row, so the heads share the taller one and the
     frames start on one line however the notes wrap. */
  .pair > :global(.example) {
    grid-row: span 2;
    grid-template-rows: subgrid;
  }

  .pair > :global(.example) > :global(.frame) {
    align-self: start;
  }

  @media (max-width: 47.9375rem) {
    .pair {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
