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
A list of things a page is about, as a real `ul` of `ObjectRow`s. Rows grow when their
content wraps; there are no fixed heights, no zebra stripes and no column headings, and the
page keeps its one scroll. Long collections load more with `LoadMore` after the last row.

Rows reach 12px past the list on both sides so their ink lines up with the card around
them, and the list hands back the last row's bottom padding so the last line closes on the
card's own frame. When it opens a card it hands back the first row's top padding too, so its
first line stands the card's inset below the keyline. Give it a container with at least that
much inset.
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
    margin-block-end: calc(-1 * var(--sui-row-pad-default));
  }

  .sui-object-list:first-child:has(> :global(li)) {
    margin-block-start: var(--sui-local-row-lead, 0px);
  }
</style>
