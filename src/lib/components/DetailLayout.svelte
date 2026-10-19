<script lang="ts">
  import { word } from '../words.js';
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    main,
    aside,
    asideLabel = word('DetailLayout.asideLabel', 'Details'),
    class: className = '',
    ...rest
  }: {
    /** The primary sections, by importance: the outcome, the main collection, the timeline. */
    main: Snippet;
    /** The thing's properties, as `Section`s of label-value rows. */
    aside?: Snippet;
    /** The aside's landmark name. */
    asideLabel?: string;
    /** Layout for the call site only, never the layout's own paint. */
    class?: HTMLAttributes<HTMLDivElement>['class'];
  } & Omit<HTMLAttributes<HTMLDivElement>, 'children'> = $props();
</script>

<!--
@component
The body of a detail pane, under its header band: a main column of sections and an aside of
the thing's properties. Once the layout itself is 56rem wide or wider, the aside stands
beside the main column, 16 to 20rem wide and `--sui-rhythm-section-gap` from it; narrower, it
follows the main column below, the same gap under it. It answers to its own width rather than
the page's, so a pane beside a list folds as early as a phone does.

The aside comes after the main column in the DOM at every width, so a screen reader, the Tab
order and a narrow screen all meet the primary content first. Nothing here draws a frame,
ground or line; the sections inside carry the hierarchy.

- Semantics: a plain box; the aside is an `aside` named by `asideLabel`, a complementary landmark.
- Content: `main`, the primary sections, and an optional `aside` of properties.
- States: none of its own.
- Keyboard: none of its own; Tab walks the main column, then the aside.
- Pointer and touch: none of its own; the controls inside keep their own targets.
- Focus: nothing here moves focus.
- Responsive: a container query on the layout's own width puts the aside beside the main column at 56rem and wider, and under it below that.
- Accessibility: the reading and Tab order match the order drawn at every width, and the aside is a named landmark a reader can jump to.
- Localization: `asideLabel` is a prop with an English default; the aside stands at the inline end, which mirrors in a right-to-left page.
- Performance: static layout with no script; the layout is one size container.
- Analytics: none of its own; the content reports its own outcomes.
- Failure: without `aside` the main column takes the whole width; a pane whose thing is missing draws an `ErrorState` in place of this layout.
-->

<div {...rest} class={['sui-detail-layout', className]}>
  <div class="sui-detail-layout-columns">
    <div class="sui-detail-layout-main">{@render main()}</div>
    {#if aside}
      <aside class="sui-detail-layout-aside" aria-label={asideLabel}>{@render aside()}</aside>
    {/if}
  </div>
</div>

<style>
  .sui-detail-layout {
    container-type: inline-size;
    min-inline-size: 0;
  }

  .sui-detail-layout-columns {
    display: grid;
    gap: var(--sui-rhythm-section-gap);
    grid-template-columns: minmax(0, 1fr);
  }

  .sui-detail-layout-main,
  .sui-detail-layout-aside {
    min-inline-size: 0;
  }

  /* Each column stacks its zones, the alert, the sections and a closing disclosure, the
     section gap apart, so a caller needs no wrapper; sections that follow each other ask for
     the same gap, which collapses into this one. */
  .sui-detail-layout-main > :global(* + *),
  .sui-detail-layout-aside > :global(* + *) {
    margin-block-start: var(--sui-rhythm-section-gap);
  }

  @container (min-width: 56rem) {
    .sui-detail-layout-columns:has(> .sui-detail-layout-aside) {
      align-items: start;
      grid-template-columns: minmax(0, 1fr) clamp(16rem, 30%, 20rem);
    }
  }
</style>
