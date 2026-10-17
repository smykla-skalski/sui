<script lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import Button from './Button.svelte';
  import VisuallyHidden from './VisuallyHidden.svelte';

  let {
    more,
    shown,
    total,
    loading = false,
    problem = null,
    onmore
  }: {
    /** Another page exists. Without one the button gives way to an end-of-list note. */
    more: boolean;
    /** How many rows the list shows now. The status counts the rows that arrive against it. */
    shown: number;
    /** How many rows exist, when the server knows. */
    total?: number;
    /** A page is on its way, so the button stays focused and ignores presses. */
    loading?: boolean;
    /** Why the last page failed. The button becomes a retry until the caller clears it. */
    problem?: string | null;
    /** Ask for the next page. */
    onmore: () => void;
  } = $props();

  let root = $state<HTMLElement>();
  /* The row count when the reader last asked, so the status can say how many came back. */
  let asked = $state<number | null>(null);
  let refocus = false;

  const counted = $derived(total === undefined ? `${shown}` : `${shown} of ${total}`);
  const arrived = $derived(
    asked !== null && shown > asked ? `${shown - asked} more loaded, ${counted} shown` : ''
  );

  /* A pre-effect runs before the button leaves the page, while it can still hold focus. */
  $effect.pre(() => {
    if (!more) refocus = root?.contains(document.activeElement) ?? false;
  });

  const takeFocus: Attachment<HTMLElement> = (node) => {
    if (refocus) node.focus();
    refocus = false;
  };

  function press() {
    asked = shown;
    onmore();
  }
</script>

<!--
@component
What a long list has instead of infinite scroll: a "Load more" button after the last row. The
reader decides when the next page comes, so keyboard focus keeps its place and the footer
stays in reach. Numbered pages belong to a data table, never to a list of rows.

While a page loads the button reads "Loading…", keeps focus and ignores presses. When rows
arrive, a polite status says how many came and how many show. If the last page lands while
the button has focus, focus moves to the end-of-list note instead of falling to the page.

A failure does not try again on its own, which could hammer a server that is already
struggling. The reason shows beside the button, which reads "Try again" until the caller
clears `problem`. Clear it when the retry starts.
-->

<div class="sui-load-more" bind:this={root}>
  {#if more}
    {#if problem}
      <p class="sui-load-more-copy" role="alert">{problem}</p>
    {/if}
    <Button {loading} onclick={press}>
      {loading ? 'Loading…' : problem ? 'Try again' : 'Load more'}
    </Button>
  {:else if asked !== null}
    <p class="sui-load-more-copy sui-load-more-end" tabindex="-1" {@attach takeFocus}>
      All {shown} shown
    </p>
  {/if}
  <VisuallyHidden role="status">{arrived}</VisuallyHidden>
</div>

<style>
  .sui-load-more {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-2) var(--sui-space-3);
    justify-content: center;
    padding-block: var(--sui-space-3);
  }

  .sui-load-more-copy {
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    margin: 0;
    min-inline-size: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sui-load-more-end:focus-visible {
    border-radius: var(--sui-radius-control);
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-offset);
  }
</style>
