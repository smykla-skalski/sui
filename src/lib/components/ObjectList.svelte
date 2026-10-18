<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    class: className = '',
    children,
    ...rest
  }: {
    class?: HTMLAttributes<HTMLUListElement>['class'];
    /** `ObjectRow`s, one per item. */
    children: Snippet;
  } & Omit<HTMLAttributes<HTMLUListElement>, 'children'> = $props();
</script>

<!--
@component
A list of things a page is about, as a real `ul` of `ObjectRow`s. Rows grow when their content
wraps; there are no fixed heights, no zebra stripes and no column headings, and the page keeps
its one scroll.

Rows reach 12px past the list on both sides so their ink lines up with the card around them,
and the list hands back the last row's bottom padding so the last line closes on the card's own
frame. When it opens a card it hands back the first row's top padding too, so its first line
stands the card's inset below the keyline. Give it a container with at least that much inset.
A `LoadMore` right after it is its last row instead, so the list keeps that padding and draws
the hairline above the `LoadMore`.

- Semantics: a `ul` with `role="list"`, so Safari keeps the list once its bullets are gone.
- Content: `ObjectRow`s only, one per item.
- States: none of its own; each row draws its hover, press and focus.
- Keyboard: Tab walks the rows' links and controls in order.
- Pointer and touch: each row is its own target, at least 44px tall.
- Focus: none moves; after a row is removed, move focus to the next row's link, or to the list's heading when none is left.
- Responsive: rows take the full width and drop their side under the main content on a phone.
- Accessibility: a screen reader hears it as a list with its count; name it with `aria-label` or `aria-labelledby` when the page has more than one.
- Localization: everything it says is the caller's; the rows follow the reading direction.
- Performance: every row renders; past a few hundred, page the list with `LoadMore` rather than drawing everything.
- Analytics: none of its own; rows and `LoadMore` report what the reader opens and asks for.
- Failure: draw an `EmptyState` in its place when there are no rows, a `Skeleton` while the first page loads, and an `ErrorState` when it failed, never an empty `ul`.
-->

<ul role="list" {...rest} class={['sui-object-list', className]}>{@render children()}</ul>

<style>
  .sui-object-list {
    display: grid;
    list-style: none;
    margin: 0;
    min-inline-size: 0;
    padding: 0;
  }

  .sui-object-list:has(> :global(li)) {
    /* The last row's padding and its hairline band give the card's inset back (L-33). */
    margin-block-end: calc(-1 * (var(--sui-row-pad-default) + var(--sui-row-hairline)));
  }

  .sui-object-list:first-child:has(> :global(li)) {
    margin-block-start: var(--sui-local-row-lead, 0px);
  }

  /* A LoadMore after the list is its last row, so the list keeps the padding and the band of
     the row above it and draws the hairline that row would draw over a next one. */
  .sui-object-list:has(+ :global(.sui-load-more)) {
    margin-block-end: 0;
    position: relative;
  }

  .sui-object-list:has(+ :global(.sui-load-more))::after {
    background: var(--sui-border-divider);
    block-size: var(--sui-row-hairline);
    content: '';
    inset-block-end: 0;
    inset-inline: 0;
    position: absolute;
  }

  @media (hover: hover) {
    .sui-object-list:has(> :global(li:last-child > a[href]:hover))::after {
      background: transparent;
    }
  }
</style>
