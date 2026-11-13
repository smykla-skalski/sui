<script lang="ts">
  import { formatCount } from './locale.js';

  let { value }: { value: number | string | null } = $props();
</script>

<!--
The one count beside a label, as tabs, segments and sidebar rows carry: a pill of tabular
figures on a veil. The place it stands in sets its inks through `--sui-local-count-ink` and
`--sui-local-count-ground`, and an edge through `--sui-local-count-edge` where the ground alone
stands too close to what is around it, so a current tab or a selected segment recolours the count without
reshaping it. A number is grouped in the reader's format, so 1284 reads "1,284" in English
and "1 284" in French; a string is drawn as given. The pill rounds to an even height, so it
centres on its line at whole pixels (L-95). `null` waits: a placeholder of a two-digit count's
box with no digits, so the count's seat holds still until its number arrives.
-->

<span class={['sui-count', { waiting: value === null }]}
  ><span>{typeof value === 'number' ? formatCount(value) : (value ?? '00')}</span></span
>

<style>
  .sui-count {
    background-color: var(--sui-local-count-ground, var(--sui-interactive-hover-layer));
    border-radius: var(--sui-radius-pill);
    box-shadow: var(--sui-local-count-edge, none);
    box-sizing: border-box;
    color: var(--sui-local-count-ink, var(--sui-text-secondary));
    display: inline-grid;
    flex: none;
    font: var(--sui-weight-semibold) var(--sui-font-size-caption) / var(--sui-leading-flat)
      var(--sui-sans);
    font-variant-numeric: tabular-nums;
    inline-size: var(--sui-inline-snap);
    min-inline-size: var(--sui-space-4);
    padding: var(--sui-space-1);
    place-items: center;
  }

  .waiting {
    background-color: var(--sui-placeholder);
  }

  .waiting > span {
    visibility: hidden;
  }

  /* The digits centre in their snapped box, so the spare pixels split above and under them
     (L-102). */
  .sui-count > span {
    align-content: center;
    block-size: var(--sui-block-snap-even);
    padding-block: var(--sui-block-snap-room-even);
    text-box: trim-both cap alphabetic;
  }
</style>
