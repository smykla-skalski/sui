<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    narrow = false,
    lead,
    trail,
    even = false,
    children
  }: {
    /** The second example keeps the narrow frame, one 16rem field and its stage's pad. */
    narrow?: boolean;
    /** The first example's frame measure, such as a dialog's, and the second takes the rest. */
    lead?: string;
    /** The second example's frame measure, such as one narrow specimen's, and the first takes
     the rest. */
    trail?: string;
    /** Both frames end on one line, as a lead pair's do, for two examples whose Code rows would
     otherwise stand apart. */
    even?: boolean;
    children: Snippet;
  } = $props();
</script>

<!-- Two examples that each hold one specimen share a row on the cards' 54rem, so the page does
     not step down to a narrower frame under them or end on a narrow tail beside an empty half.
     On a phone they stack and both frames fill the column, as every other frame does (L-55). -->
<div class={['pair', { narrow, lead, trail, even }]} style:--lead={lead} style:--trail={trail}>
  {@render children()}
</div>

<style>
  .pair {
    /* A wide page pads every stage 24px, so the narrow frame is the field and that pad on each
       side; the narrow example sets its measure to it. */
    --narrow-frame: calc(16rem + 2 * var(--sui-space-6));
    align-items: start;
    display: grid;
    gap: var(--sui-space-6);
    grid-template-columns: repeat(2, minmax(0, 1fr));
    /* A frame's measure is its content box, inside its two strokes. A page whose frame above
       keeps a narrower measure sets `--pair-max` to it, so the row ends on that frame's edge. */
    max-inline-size: calc(var(--pair-max, 54rem) + 2 * var(--sui-stroke));
  }

  .narrow {
    grid-template-columns: minmax(0, 1fr) calc(var(--narrow-frame) + 2 * var(--sui-stroke));
  }

  /* A lead frame keeps its measure whole, such as a dialog's, so the two stack until the page
     holds a 33rem lead, the gap, a second frame of about 31rem and the gutters, and then the
     second example takes what the pane leaves of two such frames. */
  .lead {
    grid-template-columns: minmax(0, 1fr);
    max-inline-size: calc(2 * (var(--lead) + 2 * var(--sui-stroke)) + var(--sui-space-6));
  }

  /* A trail frame keeps its measure whole beside a first example that takes the rest, at the
     width a lead pair parts at, so the first never narrows below what a long specimen needs. */
  .trail {
    grid-template-columns: minmax(0, 1fr);
    max-inline-size: none;
  }

  @container (min-width: 70rem) {
    .lead {
      grid-template-columns: calc(var(--lead) + 2 * var(--sui-stroke)) minmax(0, 1fr);
    }

    .trail {
      grid-template-columns: minmax(0, 1fr) calc(var(--trail) + 2 * var(--sui-stroke));
    }
  }

  /* Each example takes a head row and a frame row, so the heads share the taller one and the
     frames start on one line however the notes wrap. */
  .pair :global(.example) {
    grid-row: span 2;
    grid-template-rows: subgrid;
  }

  /* A frame keeps its own height, not the taller one beside it, so its parts keep whole pixels
     (L-95). A lead pair's frames end on one line, the shorter one's stage taking what the
     taller one, whole pixels itself, leaves, so two dialogs side by side read as one row; an
     even pair's do the same. */
  .pair :global(.example) > :global(.frame) {
    align-self: start;
  }

  :is(.lead, .even) :global(.example) > :global(.frame) {
    align-self: stretch;
    grid-template-rows: 1fr;
  }

  :is(.lead, .even) :global(.example) > :global(.frame:has(> .tools)) {
    grid-template-rows: 1fr auto;
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
