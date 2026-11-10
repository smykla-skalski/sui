<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    label,
    children
  }: {
    /** The state or variant in words, such as "Disabled". */
    label?: string | Snippet;
    children: Snippet;
  } = $props();
</script>

<figure class="specimen">
  {#if label}
    <figcaption>
      {#if typeof label === 'function'}{@render label()}{:else}{label}{/if}
    </figcaption>
  {/if}
  <div class="body">{@render children()}</div>
</figure>

<style>
  /* The name stands 16px over what it shows, a step past a field's label over its control, and
     a type step quieter than a label, so it reads as the specimen's head and not as a line of the
     label, with its own specimen however tall the specimens beside it run. The body is a
     grid as wide as the specimen: a block surface or a field fills it, while a mark keeps its
     own fit-content width (L-43). In a grid of specimens it takes two of the grid's rows, so every name on a line
     shares the tallest name's track and every body the tallest body's: their bodies start on
     one line even when a name wraps. In a row or a stack there is no parent grid, and the
     subgrid falls back to two rows of its own at the specimen's top. */
  .specimen {
    align-content: start;
    display: grid;
    gap: var(--sui-space-4);
    grid-row: span 2;
    grid-template-rows: subgrid;
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

  /* A chart, a state panel or a section fills its body, so those on one line share their foot as
     well as their top. */
  .body:has(> :global(:is(.sui-chart, .sui-section, .sui-empty-state, .sui-error-state))) {
    align-content: stretch;
  }

  /* What the specimen shows takes the inset a stacked stage lends, as a card lends its own. */
  .body > :global(*) {
    --sui-local-bleed: var(--sui-local-stage-pad, 0px);
  }

  figcaption {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-caption) / var(--sui-leading-compact)
      var(--sui-sans);
    padding-block: var(--sui-block-snap-room);
    text-box: trim-both cap alphabetic;
  }
</style>
