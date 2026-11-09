<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    narrow = false,
    children
  }: {
    /** The second example keeps the narrow frame, one 16rem field and its stage's pad. */
    narrow?: boolean;
    children: Snippet;
  } = $props();
</script>

<!-- Two examples that each hold one specimen share a row on the cards' 54rem, so the page does
     not step down to a narrower frame under them or end on a narrow tail beside an empty half.
     On a phone they stack and both frames fill the column, as every other frame does (L-55). -->
<div class={['pair', { narrow }]}>{@render children()}</div>

<style>
  .pair {
    /* A wide page pads every stage 24px, so the narrow frame is the field and that pad on each
       side; the narrow example sets its measure to it. */
    --narrow-frame: calc(16rem + 2 * var(--sui-space-6));
    align-items: start;
    display: grid;
    gap: var(--sui-space-6);
    grid-template-columns: repeat(2, minmax(0, 1fr));
    /* A frame's measure is its content box, inside its two strokes. */
    max-inline-size: calc(54rem + 2 * var(--sui-stroke));
  }

  .narrow {
    grid-template-columns: minmax(0, 1fr) calc(var(--narrow-frame) + 2 * var(--sui-stroke));
  }

  /* Each example takes a head row and a frame row, so the heads share the taller one and the
     frames start on one line however the notes wrap. */
  .pair :global(.example) {
    grid-row: span 2;
    grid-template-rows: subgrid;
  }

  /* A frame keeps its own height, not the taller one beside it, so its parts keep whole pixels
     (L-95). */
  .pair :global(.example) > :global(.frame) {
    align-self: start;
  }

  @media (max-width: 47.9375rem) {
    .pair {
      grid-template-columns: minmax(0, 1fr);
    }

    .pair :global(.example) {
      --example-max: none;
    }
  }
</style>
