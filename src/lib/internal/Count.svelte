<script lang="ts">
  import { formatCount } from './locale.js';

  let { value }: { value: number | string } = $props();
</script>

<!--
The one count beside a label, as tabs, segments and sidebar rows carry: a pill of tabular
figures on a veil. The place it stands in sets its inks through `--sui-local-count-ink` and
`--sui-local-count-ground`, so a current tab or a selected segment recolours the count without
reshaping it. A number is grouped in the page's language, so 1284 reads "1,284" in English
and "1 284" in French; a string is drawn as given. The pill rounds to an even height, so it
centres on its line at whole pixels (L-95).
-->

<span class="sui-count"><span>{typeof value === 'number' ? formatCount(value) : value}</span></span>

<style>
  .sui-count {
    background-color: var(--sui-local-count-ground, var(--sui-interactive-hover-layer));
    border-radius: var(--sui-radius-pill);
    box-sizing: border-box;
    color: var(--sui-local-count-ink, var(--sui-text-secondary));
    display: inline-grid;
    flex: none;
    font: var(--sui-weight-semibold) var(--sui-font-size-micro) / var(--sui-leading-flat)
      var(--sui-sans);
    font-variant-numeric: tabular-nums;
    min-inline-size: var(--sui-space-4);
    padding: var(--sui-space-1);
    place-items: center;
  }

  /* The digits centre in their snapped box, so the spare pixels split above and under them
     (L-102). */
  .sui-count > span {
    align-content: center;
    block-size: var(--sui-block-snap-even);
    text-box: trim-both cap alphabetic;
  }
</style>
